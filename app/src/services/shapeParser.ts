import {
  Shape,
  ShapeRelationship,
  ShapeType,
  RelationshipType,
  Rectangle,
  Circle,
  Ellipse,
  Triangle,
  Arrow,
  Line,
  TextShape,
} from './shapeModels';

/**
 * Parses shapes and relationships from a VLM/LLM response object.
 * Handles variations in response format and collects errors.
 * @param response The VLM/LLM response (StructuredDiagram-like)
 * @returns { shapes, relationships, errors }
 */
export function parseShapesFromVLMResponse(response: unknown): {
  shapes: Shape[];
  relationships: ShapeRelationship[];
  errors: string[];
} {
  const shapes: Shape[] = [];
  const relationships: ShapeRelationship[] = [];
  const errors: string[] = [];

  if (!response || typeof response !== 'object') {
    errors.push('Response is not an object');
    return { shapes, relationships, errors };
  }
  const o = response as Record<string, unknown>;
  const elements = Array.isArray(o.elements) ? o.elements : [];
  const rels = Array.isArray(o.relationships) ? o.relationships : [];

  // Parse elements
  elements.forEach((el, i) => {
    if (!el || typeof el !== 'object') {
      errors.push(`Element at index ${i} is not an object`);
      return;
    }
    const e = el as Record<string, unknown>;
    const id = typeof e.id === 'string' ? e.id : undefined;
    const type = typeof e.type === 'string' ? e.type as ShapeType : undefined;
    const bb = e.boundingBox as Record<string, unknown>;
    const boundingBox = bb && typeof bb.x === 'number' && typeof bb.y === 'number' && typeof bb.width === 'number' && typeof bb.height === 'number'
      ? { x: bb.x, y: bb.y, width: bb.width, height: bb.height }
      : undefined;
    const style = typeof e.style === 'object' && e.style !== null ? e.style : undefined;
    // Text property (optional)
    const text = typeof e.text === 'string' ? e.text : undefined;
    // Orientation property (optional)
    const orientation = typeof e.orientation === 'string' && ['north', 'south', 'east', 'west'].includes(e.orientation) ? e.orientation as ('north' | 'south' | 'east' | 'west') : undefined;
    if (!id || !type || !boundingBox) {
      errors.push(`Element at index ${i} missing required fields`);
      return;
    }
    // Map to specific shape type
    let shape: Shape;
    switch (type) {
      case 'rectangle':
        shape = { id, type, boundingBox, style, text, orientation } as Rectangle;
        break;
      case 'circle':
        shape = { id, type, boundingBox, style, text, orientation } as Circle;
        break;
      case 'ellipse':
        shape = { id, type, boundingBox, style, text, orientation } as Ellipse;
        break;
      case 'triangle':
        shape = { id, type, boundingBox, style, text, orientation } as Triangle;
        break;
      case 'arrow':
        shape = { id, type, boundingBox, style, orientation } as Arrow;
        break;
      case 'line':
        shape = { id, type, boundingBox, style, orientation } as Line;
        break;
      case 'text':
        if (text) {
          shape = { id, type, boundingBox, style, text, orientation } as TextShape;
        } else {
          errors.push(`Text element at index ${i} missing text property`);
          return;
        }
        break;
      default:
        errors.push(`Unknown shape type '${type}' at index ${i}`);
        return;
    }
    shapes.push(shape);
  });

  // Parse relationships
  rels.forEach((rel, i) => {
    if (!rel || typeof rel !== 'object') {
      errors.push(`Relationship at index ${i} is not an object`);
      return;
    }
    const r = rel as Record<string, unknown>;
    const id = typeof r.id === 'string' ? r.id : undefined;
    const type = typeof r.type === 'string' ? r.type as RelationshipType : undefined;
    const sourceId = typeof r.sourceId === 'string' ? r.sourceId : undefined;
    const targetId = typeof r.targetId === 'string' ? r.targetId : undefined;
    // Add waypoint parsing (optional)
    const waypoints = Array.isArray(r.waypoints) ? r.waypoints.filter((wp): wp is { x: number; y: number } => 
      typeof wp === 'object' && wp !== null && typeof (wp as Record<string, unknown>).x === 'number' && typeof (wp as Record<string, unknown>).y === 'number'
    ).map(wp => ({ x: wp.x, y: wp.y })) : undefined;

    if (!id || !type || !sourceId || !targetId) {
      errors.push(`Relationship at index ${i} missing required fields`);
      return;
    }
    relationships.push({ id, type, sourceId, targetId, waypoints });
  });

  return { shapes, relationships, errors };
}

/**
 * Validates shape data for completeness and consistency.
 * @param shapes Array of shapes
 * @param relationships Array of relationships
 * @returns { valid, errors }
 */
export function validateShapeData(
  shapes: Shape[],
  relationships: ShapeRelationship[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const shapeIds = new Set(shapes.map(s => s.id));
  // Check for duplicate IDs
  if (shapeIds.size !== shapes.length) {
    errors.push('Duplicate shape IDs found');
  }
  // Check that all relationship source/target IDs exist
  relationships.forEach((rel, i) => {
    if (!shapeIds.has(rel.sourceId)) {
      errors.push(`Relationship at index ${i} has unknown sourceId '${rel.sourceId}'`);
    }
    if (!shapeIds.has(rel.targetId)) {
      errors.push(`Relationship at index ${i} has unknown targetId '${rel.targetId}'`);
    }
  });
  // TODO: Add more validation (e.g., bounding box consistency, style checks)
  return { valid: errors.length === 0, errors };
}

// TODO: In the future, add NLP/text extraction for free-form VLM/LLM responses 