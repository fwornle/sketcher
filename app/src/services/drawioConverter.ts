/**
 * Drawio Converter
 * Task 8: Implement Drawio Format Conversion
 *
 * Converts internal shape/relationship data to Drawio XML format.
 */
import type { Shape, ShapeRelationship, TextShape } from './shapeModels';
import pako from 'pako';

/**
 * Represents the dimensions of the original image.
 */
interface OriginalImageDimensions {
  width: number;
  height: number;
}

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
 * Generates the Drawio XML document, scaling coordinates based on original image dimensions.
 * @param shapes Array of shapes
 * @param relationships Array of relationships
 * @param originalDimensions Dimensions of the original image used for VLM analysis
 * @returns Drawio XML string
 */
export function generateDrawioXml(
  shapes: Shape[],
  relationships: ShapeRelationship[],
  originalDimensions: OriginalImageDimensions
): string {
  const TARGET_DRAWIO_WIDTH = 850; // Corresponds to page width in template
  const TARGET_DRAWIO_HEIGHT = 1100; // Corresponds to page height in template
  const CANVAS_MARGIN = 50; // Add some visual padding within the Drawio canvas

  if (!originalDimensions || originalDimensions.width === 0 || originalDimensions.height === 0) {
    console.error('Invalid original image dimensions provided to generateDrawioXml');
    // Return a minimal valid XML to avoid breaking DrawioViewer
    return `<?xml version="1.0" encoding="UTF-8"?><mxfile><diagram><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/></root></mxGraphModel></diagram></mxfile>`;
  }

  // Calculate scaling factors
  const scaleX = TARGET_DRAWIO_WIDTH / originalDimensions.width;
  const scaleY = TARGET_DRAWIO_HEIGHT / originalDimensions.height;
  // Use the smaller scale factor to maintain aspect ratio and fit within target bounds
  const scale = Math.min(scaleX, scaleY);

  // Effective canvas height for Y-flipping after scaling - REMOVED
  // const scaledContentHeight = originalDimensions.height * scale;

  const elementsXml = shapes.map(element => {
    // Scale coordinates and dimensions
    const scaledX = element.boundingBox.x * scale + CANVAS_MARGIN;
    const scaledY = element.boundingBox.y * scale; // Scale Y without margin first
    const scaledWidth = element.boundingBox.width * scale;
    const scaledHeight = element.boundingBox.height * scale;

    // Coordinate transformation (Y-flip) - REMOVED as v2 prompt provides y-down coords
    const drawioX = scaledX;
    // Flip based on scaled content height, then add margin - OLD
    // const drawioY = (scaledContentHeight - (scaledY + scaledHeight)) + CANVAS_MARGIN;
    // NEW: Use scaled Y directly and add margin
    const drawioY = scaledY + CANVAS_MARGIN;

    const drawioId = `el-${element.id}`; // Prefix element IDs

    let styleString = '';
    // Base shape style
    switch (element.type) {
        case 'rectangle': styleString += 'shape=rectangle;'; break;
        case 'ellipse':
        case 'circle': styleString += 'shape=ellipse;'; break;
        case 'triangle': styleString += 'shape=triangle;'; break;
        case 'parallelogram': styleString += 'shape=parallelogram;'; break;
        case 'rhombus': styleString += 'shape=rhombus;'; break;
        case 'text': styleString += 'text;html=1;resizable=0;points=[];align=center;verticalAlign=middle;labelBackgroundColor=#ffffff;'; break;
        case 'line': styleString += 'shape=line;endArrow=none;'; break;
        case 'arrow': styleString += 'shape=flexArrow;'; break; // Using flexArrow for better arrow control
        default: styleString += 'shape=rectangle;'; break;
    }

    // Additional styles
    if (element.style?.color) styleString += `strokeColor=${element.style.color};`;
    if (element.style?.fill) styleString += `fillColor=${element.style.fill};`;
    if (element.style?.lineStyle && element.style.lineStyle !== 'solid') {
      styleString += `dashed=${element.style.lineStyle === 'dashed' ? 1 : 0};`;
      if (element.style.lineStyle === 'dotted') styleString += 'dashPattern=1 4;';
    }
    if (element.style?.fontWeight === 'bold') styleString += 'fontStyle=1;';
    if (typeof element.style?.opacity === 'number') styleString += `opacity=${Math.round(element.style.opacity * 100)};`;

    // Orientation - Use rotation based on orientation_angle
    // Remove old direction logic
    /*
    if (element.type === 'triangle' || element.type === 'arrow') {
      switch (element.orientation) {
        case 'north': styleString += 'direction=south;'; break;
        case 'south': styleString += 'direction=north;'; break;
        case 'west': styleString += 'direction=west;'; break;
        case 'east':
        default: styleString += 'direction=east;'; break;
      }
    }
    */
    // Apply rotation if angle is significant (Drawio rotation is clockwise, angle is counter-clockwise)
    if (typeof element.orientation_angle === 'number' && Math.abs(element.orientation_angle) > 1) { // Threshold to avoid tiny rotations
      styleString += `rotation=${-element.orientation_angle};`;
    } else if (element.type === 'triangle' && (element.orientation_angle === undefined || Math.abs(element.orientation_angle) <= 1)) {
      // Default triangle rotation to point upwards if angle is 0 or not provided
      styleString += `rotation=-90;`;
    }

    const label = escapeXml(element.type === 'text' ? (element as TextShape).text || '' : '');
    const geometry = `<mxGeometry x="${drawioX}" y="${drawioY}" width="${scaledWidth}" height="${scaledHeight}" as="geometry" />`;

    return `<mxCell id="${drawioId}" value="${label}" style="${styleString.replace(/;$/, '')}" vertex="1" parent="1">
      ${geometry}
    </mxCell>`;
  }).join('\n');

  const relationshipsXml = relationships.map(rel => {
    const drawioRelId = `rel-${rel.id}`;
    const sourceIdPrefixed = `el-${rel.sourceId}`;
    const targetIdPrefixed = `el-${rel.targetId}`;

    // Transform waypoints: scale and flip Y
    const waypointsXml = rel.waypoints
      ? `<mxGeometry relative="1" as="geometry">
          <Array as="points">
            ${rel.waypoints.map(wp => {
              const scaledWpX = wp.x * scale + CANVAS_MARGIN;
              const scaledWpY = wp.y * scale; // Scale Y without margin first
              // Flip based on scaled content height, then add margin - OLD
              // const drawioWpY = (scaledContentHeight - scaledWpY) + CANVAS_MARGIN;
              // NEW: Use scaled Y directly and add margin
              const drawioWpY = scaledWpY + CANVAS_MARGIN;
              return `<mxPoint x="${scaledWpX}" y="${drawioWpY}" />`;
            }).join('\n')}
          </Array>
        </mxGeometry>`
      : '<mxGeometry relative="1" as="geometry" />';

    // Add endArrow=none and startArrow=none to hide default arrows
    const relStyle = 'edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;endArrow=none;startArrow=none;';

    return `<mxCell id="${drawioRelId}" style="${relStyle}" edge="1" parent="1" source="${sourceIdPrefixed}" target="${targetIdPrefixed}">
      ${waypointsXml}
    </mxCell>`;
  }).join('\n');

  // Construct the full Drawio XML
  // Use fixed page size but the content will be scaled within it
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<mxfile host="embed.diagrams.net" modified="2024-03-21T12:00:00.000Z" agent="Sketcher v1.0" version="20.8.4">
  <diagram name="Diagram 1" id="diagram-1">
    <mxGraphModel dx="${TARGET_DRAWIO_WIDTH + CANVAS_MARGIN*2}" dy="${TARGET_DRAWIO_HEIGHT + CANVAS_MARGIN*2}" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="${TARGET_DRAWIO_WIDTH}" pageHeight="${TARGET_DRAWIO_HEIGHT}">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />
        ${elementsXml}
        {/* ${relationshipsXml} // Commented out to hide relationship lines */}
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
  // URL encode the result - REMOVED as DrawioViewer likely expects raw base64
  // return encodeURIComponent(base64Encoded);
  return base64Encoded; // Return raw base64
}

// TODO: Add tests for Drawio XML generation 