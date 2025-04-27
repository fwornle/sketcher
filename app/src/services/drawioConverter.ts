/**
 * Drawio Converter
 * Task 8: Implement Drawio Format Conversion
 *
 * Converts internal shape/relationship data to Drawio XML format.
 */
import type { Shape, ShapeRelationship, TextShape } from './shapeModels';
import pako from 'pako';

/**
 * Escapes XML special characters
 */
function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, c => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

/**
 * Generates the skeleton of a Drawio XML document
 * @param shapes Array of shapes
 * @param relationships Array of relationships
 * @returns Drawio XML string
 */
export function generateDrawioXml(shapes: Shape[], relationships: ShapeRelationship[]): string {
  const CANVAS_MARGIN = 50; // Add some padding
  const canvasHeight = shapes.reduce((max, shape) => {
    return Math.max(max, shape.boundingBox.y + shape.boundingBox.height);
  }, 0) + CANVAS_MARGIN;

  const elementsXml = shapes.map(element => {
    // Coordinate transformation
    const drawioX = element.boundingBox.x;
    const drawioY = canvasHeight - (element.boundingBox.y + element.boundingBox.height); // Flip Y
    const drawioId = `el-${element.id}`; // Prefix element IDs

    let styleString = '';
    if (element.style?.color) styleString += `strokeColor=${element.style.color};`;
    if (element.style?.fill) styleString += `fillColor=${element.style.fill};`;
    if (element.style?.lineStyle && element.style.lineStyle !== 'solid') {
      styleString += `dashed=${element.style.lineStyle === 'dashed' ? 1 : 0};`;
      // Add other line styles (dotted, etc.) if needed
    }

    // Add orientation for relevant shapes
    if (element.type === 'triangle' || element.type === 'arrow') {
      switch (element.orientation) {
        case 'north': styleString += 'direction=north;'; break;
        case 'south': styleString += 'direction=south;'; break;
        case 'west': styleString += 'direction=west;'; break;
        case 'east': // Default for Drawio triangle/arrow
        default: styleString += 'direction=east;'; break;
      }
    }

    // Check if it's a TextShape before accessing text property
    const label = escapeXml(element.type === 'text' ? (element as TextShape).text || '' : '');
    const geometry = `<mxGeometry x="${drawioX}" y="${drawioY}" width="${element.boundingBox.width}" height="${element.boundingBox.height}" as="geometry" />`;
    const cellType = element.type === 'text' ? 'text;html=1;resizable=0;points=[];align=center;verticalAlign=middle;labelBackgroundColor=#ffffff;' : `shape=${element.type};`; // Use Drawio shape names

    return `<mxCell id="${drawioId}" value="${label}" style="${cellType}${styleString}" vertex="1" parent="1">
      ${geometry}
    </mxCell>`;
  }).join('\n');

  const relationshipsXml = relationships.map(rel => {
    // Transform waypoints if they exist
    const waypointsXml = rel.waypoints
      ? `<mxGeometry relative="1" as="geometry">
          <Array as="points">
            ${rel.waypoints.map(wp => `<mxPoint x="${wp.x}" y="${canvasHeight - wp.y}" />`).join('\n')}
          </Array>
        </mxGeometry>`
      : '<mxGeometry relative="1" as="geometry" />';

    // Add style based on type if needed
    const relStyle = 'edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;';
    const drawioRelId = `rel-${rel.id}`; // Prefix relationship IDs
    const sourceIdPrefixed = `el-${rel.sourceId}`; // Prefix source ID
    const targetIdPrefixed = `el-${rel.targetId}`; // Prefix target ID

    return `<mxCell id="${drawioRelId}" style="${relStyle}" edge="1" parent="1" source="${sourceIdPrefixed}" target="${targetIdPrefixed}">
      ${waypointsXml}
    </mxCell>`;
  }).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<mxfile host="embed.diagrams.net" modified="2024-03-21T12:00:00.000Z" agent="Sketcher v1.0" version="20.8.4">
  <diagram name="Diagram 1" id="diagram-1">
    <mxGraphModel dx="1000" dy="600" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="850" pageHeight="1100">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />
        ${elementsXml}
        ${relationshipsXml}
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