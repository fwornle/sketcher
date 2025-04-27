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
  Parallelogram,
  Rhombus,
  Style
} from './shapeModels';
import { VLMServiceResponse } from './vlmService';

// Helper function to generate unique relationship IDs
let relIdCounter = 0;
const generateRelId = () => `flat-rel-${++relIdCounter}`;

/**
 * Parses shapes and relationships from the VLM response (v2 schema).
 * Handles variations in response format and collects errors.
 * @param response The VLMServiceResponse object from the VLM
 * @returns { compositionDescription, shapes, relationships, errors }
 */
export function parseShapesFromVLMResponse(response: VLMServiceResponse): {
  compositionDescription?: string;
  shapes: Shape[];
  relationships: ShapeRelationship[];
  errors: string[];
} {
  const shapes: Shape[] = [];
  const relationships: ShapeRelationship[] = [];
  const errors: string[] = [];
  let compositionDescription: string | undefined;

  // Reset relationship ID counter for each parse
  relIdCounter = 0;

  // Basic validation of the response structure
  if (!response || typeof response !== 'object') {
    errors.push('Response is not an object');
    return { compositionDescription, shapes, relationships, errors };
  }
  if (!response.analysis_summary || typeof response.analysis_summary.composition_interpretation !== 'string') {
    errors.push('Missing or invalid analysis_summary.composition_interpretation');
    // Proceed anyway, just won't have a description
  } else {
    compositionDescription = response.analysis_summary.composition_interpretation;
  }

  if (!Array.isArray(response.elements)) {
    errors.push('Missing or invalid elements array');
    return { compositionDescription, shapes, relationships, errors };
  }

  const elements = response.elements;
  // Remove old top-level relationship parsing
  // const rels = Array.isArray(o.relationships) ? o.relationships : [];

  // Parse elements
  elements.forEach((el, i) => {
    // Use the imported VLMServiceResponse types for better checking
    if (!el || typeof el !== 'object') {
      errors.push(`Element at index ${i} is not an object`);
      return;
    }

    const id = typeof el.id === 'number' ? String(el.id) : undefined; // Convert number ID to string for Shape model
    let type = typeof el.type === 'string' ? el.type : undefined;
    const bb = el.bounding_box;
    // Convert bounding_box (x1, y1, x2, y2) to expected format (x, y, width, height)
    const boundingBox = bb && typeof bb.x1 === 'number' && typeof bb.y1 === 'number' && typeof bb.x2 === 'number' && typeof bb.y2 === 'number'
      ? { x: bb.x1, y: bb.y1, width: bb.x2 - bb.x1, height: bb.y2 - bb.y1 }
      : undefined;

    // Map style_info to the simple Style object
    const style: Style = {}; // Initialize empty style object
    if (el.style_info) {
      if (el.style_info.color && el.style_info.color !== 'unknown') style.color = el.style_info.color;
      if (el.style_info.fill && el.style_info.fill !== 'none') style.fill = el.style_info.fill;
      // Map line style - add more mappings if needed
      if (el.style_info.line_style === 'dashed') style.lineStyle = 'dashed';
      else if (el.style_info.line_style === 'dotted') style.lineStyle = 'dotted';
      else style.lineStyle = 'solid'; // Default to solid
      // We don't have a direct mapping for line_thickness or fontWeight in the simple model
    }

    const text = el.text_content ?? undefined;
    // Extract orientation_angle (keep old orientation undefined for now)
    const orientation_angle = typeof el.orientation_angle === 'number' ? el.orientation_angle : undefined;
    const orientation = undefined;
    const role = undefined;

    if (!id || !type || !boundingBox) {
      errors.push(`Element at index ${i} (${el.type || 'unknown type'} ID: ${el.id || 'unknown'}) missing required fields (id, type, bounding_box)`);
      return;
    }

    // Map VLM types to internal ShapeType, handle aliases
    if (type === 'square') type = 'rectangle';
    if (type === 'line_segment') type = 'line';
    const internalType = type as ShapeType;

    // Map to specific shape type
    let shape: Shape;
    switch (internalType) {
      case 'rectangle':
        shape = { id, type: internalType, boundingBox, style, text, orientation, role, orientation_angle } as Rectangle;
        break;
      case 'circle':
        shape = { id, type: internalType, boundingBox, style, text, orientation, role, orientation_angle } as Circle;
        break;
      case 'ellipse':
        shape = { id, type: internalType, boundingBox, style, text, orientation, role, orientation_angle } as Ellipse;
        break;
      case 'triangle':
        shape = { id, type: internalType, boundingBox, style, text, orientation, role, orientation_angle } as Triangle;
        break;
      case 'arrow':
        shape = { id, type: internalType, boundingBox, style, orientation, role, orientation_angle } as Arrow;
        break;
      case 'line':
        shape = { id, type: internalType, boundingBox, style, orientation, role, orientation_angle } as Line;
        break;
      case 'parallelogram':
        shape = { id, type: internalType, boundingBox, style, text, orientation, role, orientation_angle } as Parallelogram;
        break;
      case 'rhombus':
        shape = { id, type: internalType, boundingBox, style, text, orientation, role, orientation_angle } as Rhombus;
        break;
      case 'text':
        if (text) {
          shape = { id, type: internalType, boundingBox, style, text, orientation, role, orientation_angle } as TextShape;
        } else {
          // Allow text shapes without text_content if bounding box is present
          // errors.push(`Text element at index ${i} missing text property`);
          shape = { id, type: internalType, boundingBox, style, text: '', orientation, role, orientation_angle } as TextShape;
          // return;
        }
        break;
      // Handle "other_shape" or unsupported types
      default:
        errors.push(`Unknown or unsupported shape type '${type}' at index ${i}`);
        // Optionally create a generic shape or skip
        // shape = { id, type: 'rectangle', boundingBox, style, text: `Unsupported: ${type}`, orientation, role };
        return; // Skip adding unknown shapes for now
    }
    shapes.push(shape);

    // --- Flatten Nested Relationships ---
    if (Array.isArray(el.relationships)) {
      el.relationships.forEach(nestedRel => {
        if (nestedRel && typeof nestedRel === 'object' && typeof nestedRel.related_element_id === 'number' && typeof nestedRel.relation_type === 'string') {
          const sourceId = id; // The current element is the source
          const targetId = String(nestedRel.related_element_id); // Convert target ID to string
          // Basic mapping of relation_type - TODO: Refine this mapping
          let relationshipType: RelationshipType;
          switch (nestedRel.relation_type) {
            case 'connected_to':
            case 'connected_to_start':
            case 'connected_to_end':
            case 'points_to':
              relationshipType = 'connects'; break;
            case 'inside':
            case 'contains':
            case 'part_of':
              relationshipType = 'contains'; break;
            case 'above': relationshipType = 'above'; break;
            case 'below': relationshipType = 'below'; break;
            case 'left_of': relationshipType = 'left-of'; break;
            case 'right_of': relationshipType = 'right-of'; break;
            case 'overlaps_with':
            case 'partially_overlaps_with':
              relationshipType = 'overlaps'; break;
            default:
              errors.push(`Unknown nested relation_type: ${nestedRel.relation_type}`);
              return; // Skip unknown relationship types
          }

          relationships.push({
            id: generateRelId(), // Generate a unique ID for the flattened relationship
            type: relationshipType,
            sourceId: sourceId,
            targetId: targetId,
            // Waypoints are not provided in the new nested structure
          });
        } else {
          errors.push(`Invalid nested relationship found for element ID ${id}`);
        }
      });
    }
  });

  // Remove the old relationship parsing loop
  /*
  rels.forEach((rel, i) => {
    // ... old code ...
  });
  */

  return { compositionDescription, shapes, relationships, errors };
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