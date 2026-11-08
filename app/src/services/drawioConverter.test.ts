import { describe, it, expect } from 'vitest';
import pako from 'pako';
import { generateDrawioXml, encodeDrawioXml } from './drawioConverter';
import type { Shape, ShapeRelationship, TextShape } from './shapeModels';

// The converter scales the image onto an 850x1100 page and offsets everything by a 50px margin.
// An 850x1100 source image therefore maps 1:1, so expected coordinates are simply input + 50.
const PAGE = { width: 850, height: 1100 };
const MARGIN = 50;

/** Extracts the <mxCell .../> element with the given id. */
function cell(xml: string, id: string): string {
  const match = xml.match(new RegExp(`<mxCell id="${id}"[\\s\\S]*?</mxCell>`));
  if (!match) throw new Error(`cell ${id} not found`);
  return match[0];
}

const vertexCount = (xml: string) => (xml.match(/vertex="1"/g) ?? []).length;
const edgeCount = (xml: string) => (xml.match(/edge="1"/g) ?? []).length;

describe('generateDrawioXml', () => {
  it('emits a vertex per shape, scaled onto the page and offset by the margin', () => {
    const shapes: Shape[] = [{ id: 's1', type: 'rectangle', boundingBox: { x: 10, y: 20, width: 100, height: 50 } }];
    const xml = generateDrawioXml(shapes, [], PAGE);

    const rect = cell(xml, 'el-s1');
    expect(rect).toContain('vertex="1"');
    expect(rect).toContain('shape=rectangle');
    expect(rect).toContain(`<mxGeometry x="${10 + MARGIN}" y="${20 + MARGIN}" width="100" height="50"`);
  });

  it('scales coordinates to fit the page while keeping the aspect ratio', () => {
    const shapes: Shape[] = [{ id: 's1', type: 'rectangle', boundingBox: { x: 100, y: 100, width: 200, height: 100 } }];
    // 1700x2200 is exactly twice the page size -> scale 0.5
    const xml = generateDrawioXml(shapes, [], { width: 1700, height: 2200 });
    expect(cell(xml, 'el-s1')).toContain(`<mxGeometry x="${50 + MARGIN}" y="${50 + MARGIN}" width="100" height="50"`);
  });

  it('prefixes cell ids so numeric VLM ids cannot collide with drawio root cells 0 and 1', () => {
    const shapes: Shape[] = [
      { id: '0', type: 'rectangle', boundingBox: { x: 0, y: 0, width: 10, height: 10 } },
      { id: '1', type: 'circle', boundingBox: { x: 20, y: 0, width: 10, height: 10 } },
    ];
    const xml = generateDrawioXml(shapes, [], PAGE);
    expect(xml.match(/<mxCell id="0"/g)).toHaveLength(1);
    expect(xml.match(/<mxCell id="1"/g)).toHaveLength(1);
    expect(cell(xml, 'el-0')).toContain('shape=rectangle');
    expect(cell(xml, 'el-1')).toContain('shape=ellipse');
  });

  it('produces only the root cells for empty input', () => {
    const xml = generateDrawioXml([], [], PAGE);
    expect(xml).toContain('<root>');
    expect(xml).toContain('<mxCell id="0" />');
    expect(xml).toContain('<mxCell id="1" parent="0" />');
    expect(vertexCount(xml)).toBe(0);
    expect(edgeCount(xml)).toBe(0);
  });

  it('returns a minimal valid document when image dimensions are missing', () => {
    const shapes: Shape[] = [{ id: 's1', type: 'rectangle', boundingBox: { x: 0, y: 0, width: 10, height: 10 } }];
    const xml = generateDrawioXml(shapes, [], { width: 0, height: 0 });
    expect(xml).toContain('<mxGraphModel>');
    expect(vertexCount(xml)).toBe(0);
  });

  it('labels text elements and escapes XML special characters', () => {
    const shapes: Shape[] = [
      { id: 't1', type: 'text', boundingBox: { x: 0, y: 0, width: 100, height: 30 }, text: 'A <B> & "C"' } as TextShape,
    ];
    const text = cell(generateDrawioXml(shapes, [], PAGE), 'el-t1');
    expect(text).toContain('value="A &lt;B&gt; &amp; &quot;C&quot;"');
    expect(text).toContain('fillColor=none');
    expect(text).toContain('strokeColor=none');
  });

  it('leaves non-text shapes unlabelled (labels arrive as separate text elements)', () => {
    const shapes: Shape[] = [{ id: 's1', type: 'rectangle', boundingBox: { x: 0, y: 0, width: 10, height: 10 }, text: 'ignored' }];
    expect(cell(generateDrawioXml(shapes, [], PAGE), 'el-s1')).toContain('value=""');
  });

  it('maps shape style attributes to the drawio style string', () => {
    const shapes: Shape[] = [{
      id: 's3', type: 'rectangle', boundingBox: { x: 5, y: 5, width: 50, height: 20 },
      style: { color: '#ff0000', fill: '#00ff00', lineStyle: 'dashed', fontWeight: 'bold', opacity: 0.5 },
    }];
    const style = cell(generateDrawioXml(shapes, [], PAGE), 'el-s3');
    expect(style).toContain('strokeColor=#ff0000');
    expect(style).toContain('fillColor=#00ff00');
    expect(style).toContain('dashed=1');
    expect(style).not.toContain('dashPattern');
    expect(style).toContain('fontStyle=1');
    expect(style).toContain('opacity=50');
  });

  it('renders dotted lines as dashed with a dot pattern (drawio ignores dashPattern unless dashed=1)', () => {
    const shapes: Shape[] = [
      { id: 'r', type: 'rectangle', boundingBox: { x: 0, y: 0, width: 10, height: 10 }, style: { lineStyle: 'dotted' } },
      { id: 't', type: 'triangle', boundingBox: { x: 20, y: 0, width: 10, height: 10 }, style: { lineStyle: 'dotted' } },
    ];
    const xml = generateDrawioXml(shapes, [], PAGE);
    expect(cell(xml, 'el-r')).toContain('dashed=1;dashPattern=1 4');
    expect(cell(xml, 'el-t')).toContain('dashed=1;dashPattern=1 4');
  });

  it('renders arrows and lines as edges between their bounding-box corners', () => {
    const shapes: Shape[] = [
      { id: 'a', type: 'arrow', boundingBox: { x: 0, y: 0, width: 100, height: 10 }, style: { color: '#0000ff' } },
      { id: 'l', type: 'line', boundingBox: { x: 0, y: 50, width: 100, height: 4 } },
    ];
    const xml = generateDrawioXml(shapes, [], PAGE);
    const arrow = cell(xml, 'el-a');
    expect(arrow).toContain('edge="1"');
    expect(arrow).toContain('endArrow=classic');
    expect(arrow).toContain('strokeColor=#0000ff');
    expect(arrow).toContain(`<mxPoint x="${MARGIN}" y="${MARGIN}" as="sourcePoint"/>`);
    expect(arrow).toContain(`<mxPoint x="${100 + MARGIN}" y="${10 + MARGIN}" as="targetPoint"/>`);
    expect(cell(xml, 'el-l')).toContain('endArrow=none');
    expect(vertexCount(xml)).toBe(0);
  });

  it('does not draw spatial relationships (they describe layout, not connectors)', () => {
    const shapes: Shape[] = [
      { id: 's4', type: 'rectangle', boundingBox: { x: 0, y: 0, width: 10, height: 10 } },
      { id: 's5', type: 'rectangle', boundingBox: { x: 20, y: 0, width: 10, height: 10 } },
    ];
    const relationships: ShapeRelationship[] = [
      { id: 'r1', type: 'left-of', sourceId: 's4', targetId: 's5' },
      { id: 'r2', type: 'connects', sourceId: 's4', targetId: 's5' },
    ];
    const xml = generateDrawioXml(shapes, relationships, PAGE);
    expect(vertexCount(xml)).toBe(2);
    expect(edgeCount(xml)).toBe(0);
    expect(xml).not.toContain('r1');
  });

  it('places triangles after other shapes so they render on top', () => {
    const shapes: Shape[] = [
      { id: 'tri', type: 'triangle', boundingBox: { x: 0, y: 0, width: 10, height: 10 } },
      { id: 'box', type: 'rectangle', boundingBox: { x: 0, y: 0, width: 10, height: 10 } },
    ];
    const xml = generateDrawioXml(shapes, [], PAGE);
    expect(xml.indexOf('id="el-box"')).toBeLessThan(xml.indexOf('id="el-tri"'));
    expect(cell(xml, 'el-tri')).toContain('rotation=-90'); // default: apex points up
  });
});

describe('generateDrawioXml z-order and fill', () => {
  it('draws larger shapes first so smaller ones stay on top', () => {
    const shapes: Shape[] = [
      { id: 'door', type: 'rectangle', boundingBox: { x: 40, y: 50, width: 20, height: 50 } },
      { id: 'body', type: 'rectangle', boundingBox: { x: 0, y: 0, width: 100, height: 100 } },
      { id: 'window', type: 'circle', boundingBox: { x: 10, y: 10, width: 10, height: 10 } },
    ];
    const xml = generateDrawioXml(shapes, [], PAGE);
    const order = ['body', 'door', 'window'].map(id => xml.indexOf(`id="el-${id}"`));
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });

  it('leaves unfilled shapes transparent and keeps a reported fill', () => {
    const shapes: Shape[] = [
      { id: 'plain', type: 'rectangle', boundingBox: { x: 0, y: 0, width: 10, height: 10 } },
      { id: 'red', type: 'rectangle', boundingBox: { x: 20, y: 0, width: 10, height: 10 }, style: { fill: '#ff0000' } },
      { id: 'tri', type: 'triangle', boundingBox: { x: 40, y: 0, width: 10, height: 10 } },
    ];
    const xml = generateDrawioXml(shapes, [], PAGE);
    expect(cell(xml, 'el-plain')).toContain('fillColor=none');
    expect(cell(xml, 'el-red')).toContain('fillColor=#ff0000');
    expect(cell(xml, 'el-tri')).toContain('fillColor=none');
  });
});

describe('encodeDrawioXml', () => {
  it('deflates and base64-encodes the mxGraphModel so it round-trips', () => {
    const shapes: Shape[] = [{ id: 's1', type: 'rectangle', boundingBox: { x: 0, y: 0, width: 10, height: 10 } }];
    const xml = generateDrawioXml(shapes, [], PAGE);
    const encoded = encodeDrawioXml(xml);

    const bytes = Uint8Array.from(atob(encoded), c => c.charCodeAt(0));
    const decoded = pako.inflateRaw(bytes, { to: 'string' });
    expect(decoded.startsWith('<mxGraphModel')).toBe(true);
    expect(decoded.endsWith('</mxGraphModel>')).toBe(true);
    expect(decoded).toContain('id="el-s1"');
  });

  it('throws when there is no mxGraphModel', () => {
    expect(() => encodeDrawioXml('<mxfile/>')).toThrow('No <mxGraphModel> found in XML');
  });
});
