import { describe, it, expect } from 'vitest';
import { parseShapesFromVLMResponse, validateShapeData } from './shapeParser';
import type { TextShape, Shape, ShapeRelationship } from './shapeModels';
import type { VLMServiceResponse, DiagramElement } from './vlmService';

/** Builds a v2-schema element; ids are strings because validateStructuredDiagram stringifies them. */
function el(partial: Partial<DiagramElement> & Pick<DiagramElement, 'id' | 'type'>): DiagramElement {
  return { bounding_box: { x1: 0, y1: 0, x2: 10, y2: 10 }, ...partial };
}

const summary = { total_distinct_elements: 4, composition_interpretation: 'A box next to a circle' };

describe('parseShapesFromVLMResponse', () => {
  it('parses v2 elements into shapes and flattens nested relationships', () => {
    const response: VLMServiceResponse = {
      analysis_summary: summary,
      elements: [
        el({
          id: '1', type: 'rectangle',
          bounding_box: { x1: 0, y1: 0, x2: 100, y2: 50 },
          style_info: { color: 'red', fill: 'none', line_style: 'dashed' },
          relationships: [
            { related_element_id: 2, relation_type: 'left_of' },
            { related_element_id: 3, relation_type: 'contains' },
          ],
        }),
        el({ id: '2', type: 'circle', bounding_box: { x1: 200, y1: 0, x2: 260, y2: 60 } }),
        el({ id: '3', type: 'text', bounding_box: { x1: 10, y1: 10, x2: 90, y2: 40 }, text_content: 'Label' }),
        el({
          id: '4', type: 'arrow',
          bounding_box: { x1: 100, y1: 25, x2: 200, y2: 25 },
          relationships: [{ related_element_id: 2, relation_type: 'points_to' }],
        }),
      ],
    };

    const { shapes, relationships, errors, compositionDescription } = parseShapesFromVLMResponse(response);

    expect(errors).toEqual([]);
    expect(compositionDescription).toBe('A box next to a circle');
    expect(shapes.map(s => s.type)).toEqual(['rectangle', 'circle', 'text', 'arrow']);
    expect(shapes[0].boundingBox).toEqual({ x: 0, y: 0, width: 100, height: 50 });
    expect(shapes[0].style).toEqual({ color: 'red', lineStyle: 'dashed' }); // fill 'none' is dropped
    expect((shapes[2] as TextShape).text).toBe('Label');

    expect(relationships).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'left-of', sourceId: '1', targetId: '2' }),
      expect.objectContaining({ type: 'contains', sourceId: '1', targetId: '3' }),
      expect.objectContaining({ type: 'connects', sourceId: '4', targetId: '2' }),
    ]));
    // No shape lies fully above another here, so no geometric 'above' relationships are derived
    expect(relationships.filter(r => r.type === 'above')).toEqual([]);
  });

  it('maps type aliases (square, line_segment) to internal shape types', () => {
    const { shapes, errors } = parseShapesFromVLMResponse({
      analysis_summary: summary,
      elements: [
        el({ id: '1', type: 'square' as DiagramElement['type'] }),
        el({ id: '2', type: 'line_segment' as DiagramElement['type'], bounding_box: { x1: 0, y1: 50, x2: 100, y2: 50 } }),
      ],
    });
    expect(errors).toEqual([]);
    expect(shapes.map(s => s.type)).toEqual(['rectangle', 'line']);
  });

  it('replaces VLM-reported "above" relationships with ones derived from geometry', () => {
    const { relationships } = parseShapesFromVLMResponse({
      analysis_summary: summary,
      elements: [
        // The VLM wrongly claims the lower box is above the upper one
        el({ id: 'low', type: 'rectangle', bounding_box: { x1: 0, y1: 200, x2: 100, y2: 250 },
          relationships: [{ related_element_id: 99, relation_type: 'above' }] }),
        el({ id: 'high', type: 'rectangle', bounding_box: { x1: 0, y1: 0, x2: 100, y2: 50 } }),
      ],
    });
    const above = relationships.filter(r => r.type === 'above');
    expect(above).toHaveLength(1);
    expect(above[0]).toMatchObject({ sourceId: 'high', targetId: 'low' });
  });

  it('enforces a visible minimum size for lines, arrows and text', () => {
    const { shapes } = parseShapesFromVLMResponse({
      analysis_summary: summary,
      elements: [
        el({ id: 'a', type: 'arrow', bounding_box: { x1: 0, y1: 100, x2: 20, y2: 100 } }),
        el({ id: 't', type: 'text', bounding_box: { x1: 0, y1: 0, x2: 5, y2: 5 }, text_content: 'Hi' }),
      ],
    });
    const [arrow, text] = shapes;
    expect(arrow.boundingBox.width).toBeGreaterThanOrEqual(50);  // MIN_ARROW_LENGTH
    expect(arrow.boundingBox.height).toBe(10);                   // MIN_ARROW_HEAD
    expect(text.boundingBox.width).toBeGreaterThanOrEqual(60);   // MIN_TEXT_WIDTH
    expect(text.boundingBox.height).toBeGreaterThanOrEqual(30);  // MIN_TEXT_HEIGHT
  });

  it('tolerates incomplete elements and reports what it cannot use', () => {
    const response = {
      // analysis_summary missing
      elements: [
        { id: '1', type: 'rectangle' },                                                  // missing bounding_box -> default box
        el({ id: '2', type: 'text' }),                                                   // missing text_content -> empty label
        el({ id: '3', type: 'other_shape' as DiagramElement['type'] }),                  // unsupported type -> skipped
        el({ id: '4', type: 'circle', relationships: [
          { related_element_id: 1, relation_type: 'telepathically_linked' },              // unknown relation -> silently ignored
          { related_element_id: 'x', relation_type: 'contains' } as unknown as { related_element_id: number; relation_type: string }, // invalid -> error
        ] }),
      ],
    } as unknown as VLMServiceResponse;

    const { shapes, relationships, errors, compositionDescription } = parseShapesFromVLMResponse(response);

    expect(compositionDescription).toBeUndefined();
    expect(shapes.map(s => s.id)).toEqual(['1', '2', '4']);
    expect(shapes[0].boundingBox).toEqual({ x: 0, y: 0, width: 100, height: 100 });
    expect((shapes[1] as TextShape).text).toBe('');
    expect(relationships.filter(r => r.type !== 'above')).toEqual([]);

    expect(errors).toEqual(expect.arrayContaining([
      expect.stringContaining('analysis_summary'),
      expect.stringContaining("unhandled type 'other_shape'"),
      expect.stringContaining('Invalid nested relationship found for element ID 4'),
    ]));
    expect(errors).toHaveLength(3);
  });

  it('returns an error and no shapes when elements are missing', () => {
    const { shapes, errors } = parseShapesFromVLMResponse({ analysis_summary: summary } as VLMServiceResponse);
    expect(shapes).toEqual([]);
    expect(errors).toContain('Missing or invalid elements array');
  });
});

describe('validateShapeData', () => {
  const box = { x: 0, y: 0, width: 1, height: 1 };

  it('accepts consistent shapes and relationships', () => {
    const shapes: Shape[] = [
      { id: '1', type: 'rectangle', boundingBox: box },
      { id: '2', type: 'circle', boundingBox: box },
    ];
    const relationships: ShapeRelationship[] = [{ id: 'r1', type: 'connects', sourceId: '1', targetId: '2' }];
    expect(validateShapeData(shapes, relationships)).toEqual({ valid: true, errors: [] });
  });

  it('reports duplicate IDs and relationships pointing at unknown shapes', () => {
    const shapes: Shape[] = [
      { id: '1', type: 'rectangle', boundingBox: box },
      { id: '1', type: 'circle', boundingBox: box },
    ];
    const relationships: ShapeRelationship[] = [
      { id: 'r1', type: 'connects', sourceId: '1', targetId: '2' },
      { id: 'r2', type: 'connects', sourceId: '3', targetId: '1' },
    ];
    const { valid, errors } = validateShapeData(shapes, relationships);
    expect(valid).toBe(false);
    expect(errors).toEqual([
      'Duplicate shape IDs found: 1',
      "Relationship (ID: r1) target ID '2' does not match any shape ID.",
      "Relationship (ID: r2) source ID '3' does not match any shape ID.",
    ]);
  });
});
