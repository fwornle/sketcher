/**
 * Drawio Converter
 * Task 8: Implement Drawio Format Conversion
 *
 * Converts internal shape/relationship data to Drawio XML format.
 */
import type { Shape, ShapeRelationship, Style } from './shapeModels';
import pako from 'pako';

/**
 * Escapes XML special characters
 */
function _escapeXml(str: string): string {
  return str.replace(/[<>&"']/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[c] || c));
}

/**
 * Generates a unique Drawio cell ID
 */
let cellIdCounter = 100;
function nextCellId(): string {
  return (cellIdCounter++).toString();
}

/**
 * Converts internal style attributes to Drawio style string
 * @param style Internal style object
 * @returns Drawio style string
 *
 * Mapping:
 * - color -> strokeColor
 * - fill -> fillColor
 * - lineStyle -> dashed/dotted
 * - fontWeight -> fontStyle
 * - opacity -> opacity
 * TODO: Add gradients, shadows, advanced text formatting
 */
function styleToDrawioStyle(style?: Style): string {
  if (!style) return '';
  const parts: string[] = [];
  if (style.color) parts.push(`strokeColor=${style.color}`);
  if (style.fill) parts.push(`fillColor=${style.fill}`);
  if (style.lineStyle === 'dashed') parts.push('dashed=1');
  if (style.lineStyle === 'dotted') parts.push('dashed=1;dashPattern=1 4');
  if (style.fontWeight === 'bold') parts.push('fontStyle=1');
  if (typeof style.opacity === 'number') parts.push(`opacity=${Math.round(style.opacity * 100)}`);
  // TODO: Add more style mappings (font, size, alignment, etc.)
  return parts.join(';');
}

/**
 * Converts a Shape to a Drawio <mxCell> XML string
 *
 * Spatial relationships are preserved via geometry (x, y, width, height).
 * TODO: Add z-order and parent/child support for grouping and layering.
 */
function shapeToMxCell(shape: Shape, newDrawioId: string): string {
  const id = newDrawioId;
  const parent = shape.parentId ?? '1';
  let baseStyle = '';
  switch (shape.type) {
    case 'rectangle':
      baseStyle = 'shape=rectangle';
      break;
    case 'ellipse':
    case 'circle':
      baseStyle = 'shape=ellipse';
      break;
    case 'triangle':
      baseStyle = 'shape=triangle'; // Drawio supports up/down/left/right via direction (TODO)
      break;
    // TODO: Support more shape types (arrow, line, text, etc.)
    default:
      baseStyle = 'shape=rectangle';
  }
  const { x, y, width, height } = shape.boundingBox;
  function hasText(s: Shape): s is Shape & { text: string } {
    return 'text' in s && typeof (s as { text?: unknown }).text === 'string';
  }
  const label = hasText(shape) ? _escapeXml(shape.text) : '';
  const styleStr = [baseStyle, styleToDrawioStyle(shape.style)].filter(Boolean).join(';');
  return `
        <mxCell id="${id}" value="${label}" style="${styleStr}" vertex="1" parent="${parent}">
          <mxGeometry x="${x}" y="${y}" width="${width}" height="${height}" as="geometry" />
        </mxCell>`;
}

/**
 * Converts a ShapeRelationship to a Drawio <mxCell> edge XML string
 *
 * Connections are preserved via sourceId/targetId.
 * Supports waypoints for edge routing if present.
 * TODO: Add support for connection constraints and advanced edge formatting.
 */
function relationshipToMxCell(rel: ShapeRelationship, idMapping: Map<string, string>): string {
  const id = nextCellId();
  const parent = '1';
  const source = idMapping.get(rel.sourceId);
  const target = idMapping.get(rel.targetId);

  if (!source || !target) {
    console.warn(`Skipping relationship ${rel.id}: Source (${rel.sourceId}) or Target (${rel.targetId}) not found in ID mapping.`);
    return '';
  }

  const styleStr = 'style' in rel ? styleToDrawioStyle((rel as { style?: Style }).style) : '';
  let pointsXml = '';
  if (rel.waypoints && rel.waypoints.length > 0) {
    pointsXml = `<Array as="points">${rel.waypoints.map(pt => `<mxPoint x="${pt.x}" y="${pt.y}" />`).join('')}</Array>`;
  }
  return `
        <mxCell id="${id}" edge="1" parent="${parent}" source="${source}" target="${target}" style="${styleStr}">
          <mxGeometry relative="1" as="geometry">${pointsXml}</mxGeometry>
        </mxCell>`;
}

/**
 * Generates the skeleton of a Drawio XML document
 * @param shapes Array of shapes
 * @param relationships Array of relationships
 * @returns Drawio XML string
 */
export function generateDrawioXml(shapes: Shape[], relationships: ShapeRelationship[]): string {
  const idMapping = new Map<string, string>();

  // Sort shapes by zIndex (ascending, undefined last)
  const sortedShapes = [...shapes].sort((a, b) => {
    if (a.zIndex === undefined && b.zIndex === undefined) return 0;
    if (a.zIndex === undefined) return 1;
    if (b.zIndex === undefined) return -1;
    return a.zIndex - b.zIndex;
  });

  // Generate shape cells, assigning new IDs and populating the mapping
  const shapeCells = sortedShapes.map(shape => {
    const newId = nextCellId();
    idMapping.set(shape.id, newId);
    return shapeToMxCell(shape, newId);
  }).join('\n');

  // Generate relationship cells using the mapping
  const relCells = relationships.map(rel => relationshipToMxCell(rel, idMapping))
                                .filter(cell => cell !== '')
                                .join('\n');

  const diagramId = nextCellId();
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<mxfile host="app.diagrams.net">
  <diagram id="${diagramId}" name="Page-1">
    <mxGraphModel dx="0" dy="0" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />
${shapeCells}
${relCells}
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>`;
  return xml;
}

/**
 * Compresses and base64-encodes the <mxGraphModel> XML for Drawio Embed API
 *
 * Usage:
 *   const xml = generateDrawioXml(shapes, relationships);
 *   const encoded = encodeDrawioXml(xml);
 *   // Pass 'encoded' as the 'xml' property to the Drawio Embed API
 *
 * @param xml Full Drawio XML string (should include <mxGraphModel>...)</mxGraphModel>
 * @returns Base64-encoded, compressed XML string for Drawio Embed API
 */
export function encodeDrawioXml(xml: string): string {
  // Extract <mxGraphModel>...</mxGraphModel> content
  const match = xml.match(/<mxGraphModel[\s\S]*?<\/mxGraphModel>/);
  if (!match) {
    throw new Error('No <mxGraphModel> found in XML');
  }
  const mxGraphModelXml = match[0];
  // Compress using raw DEFLATE (no zlib header)
  const compressedUint8Array = pako.deflateRaw(mxGraphModelXml);
  // Convert Uint8Array to binary string for btoa
  let binaryString = '';
  for (let i = 0; i < compressedUint8Array.length; i++) {
    binaryString += String.fromCharCode(compressedUint8Array[i]);
  }
  // Base64 encode
  const base64Encoded = btoa(binaryString);
  // URL encode the result
  return encodeURIComponent(base64Encoded);
}

// TODO: Add tests for Drawio XML generation 