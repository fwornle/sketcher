import { Logger } from '@/utils/logging';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

// Renamed original BoundingBox to avoid conflict
export interface BoundingBoxXYWH {
  x: number; // top-left x (percentage or pixels)
  y: number; // top-left y
  width: number;
  height: number;
}

// New BoundingBox format from v2 prompt
export interface BoundingBoxX1Y1X2Y2 {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

// Renamed original Style to avoid conflict
export interface StyleSimple {
  color?: string;
  lineStyle?: 'solid' | 'dashed' | 'dotted';
  fill?: string;
  fontWeight?: 'normal' | 'bold';
  // ... other relevant styles
}

// New Style format from v2 prompt
export interface StyleInfo {
  line_thickness?: 'thin' | 'medium' | 'thick' | string; // Allow string for flexibility
  line_style?: 'solid' | 'dashed' | 'dotted' | string; // Allow string
  color?: string;
  fill?: string | 'none';
}

// Relationship nested within elements (v2 prompt)
export interface NestedRelationship {
  related_element_id: number;
  relation_type: string; // e.g., "left_of", "above", "overlaps_with", etc.
}

// Define specific dimension types for the union
interface WidthHeight { width: number; height: number; }
interface Radius { radius: number; }
interface Length { length: number; }
interface BaseHeight { base: number; height: number; }

// Union type for dimensions
// Replace `any` with `unknown` for better type safety, keep fallback for flexibility
type ElementDimensions = WidthHeight | Radius | Length | BaseHeight | { [key: string]: unknown } | null;

// Updated DiagramElement to include 'trapezoid' as a valid type
export interface DiagramElement {
  id: string;
  type: 'rectangle' | 'circle' | 'ellipse' | 'triangle' | 'arrow' | 'line' | 'text' | 'parallelogram' | 'rhombus' | 'diamond' | 'hexagon' | 'octagon' | 'trapezoid';
  bounding_box: BoundingBoxX1Y1X2Y2;
  center_coordinates?: { cx: number; cy: number }; // Optional as it's approximate
  dimensions?: ElementDimensions; // Use the specific union type
  orientation_angle?: number;
  style_info?: StyleInfo | null;
  text_content?: string | null;
  relationships?: NestedRelationship[]; // Relationships are now nested here
  // Removed old fields like `style`, `orientation`, `role` if covered by new structure
}

// Renamed original Relationship
export interface RelationshipTopLevel {
  id: string;
  type: 'connects' | 'contains' | 'above' | 'below' | 'left-of' | 'right-of' | 'overlaps';
  sourceId: string;
  targetId: string;
}

// Summary object from v2 prompt
export interface AnalysisSummary {
  total_distinct_elements: number;
  composition_interpretation: string;
}

// Updated VLMServiceResponse for v2 prompt schema
export interface VLMServiceResponse {
  analysis_summary?: AnalysisSummary;
  elements: DiagramElement[];
  plausibility_check_notes?: string; // Optional as it's a note
  vlmProvider?: string; // Added to identify the VLM used
  // Removed top-level `relationships` and `compositionDescription`
}

export interface VLMService {
  analyzeImage(dataUrl: string, apiKey?: string): Promise<VLMServiceResponse>;
}

/**
 * Prompt management utility for Gemini prompt engineering.
 * Supports versioning, easy updates, and A/B testing.
 */

/**
 * Map of prompt versions. Add new versions here for A/B testing or improvements.
 * Each version should include rationale and example usage in comments.
 */
const GEMINI_PROMPTS: Record<string, string> = {
  v1: `You are an expert visual analysis assistant specializing in interpreting whiteboard sketches containing geometric shapes and text. Your task is to meticulously analyze the provided image of a whiteboard sketch and extract comprehensive information about all its elements, their properties, and their relationships, outputting the result ONLY as a valid JSON object. It is absolutely critical that you achieve precise detection of ALL geometric shapes, accurately determine their exact size, and pinpoint their correct position, with a paramount focus on the **relative positioning and sizes of all detected shapes to one another**.

  **JSON Output Requirements:**
  
  The JSON object must have the following top-level keys:
  1.  \`analysis_summary\`: An object containing:
      * \`total_distinct_elements\`: (Integer) The total number of distinct geometric shapes and text blocks identified.
      * \`composition_interpretation\`: (String) A brief description of what the overall sketch might represent.
  2.  \`elements\`: An array of objects, where each object represents a single detected element (shape or text). Each element object must have the following keys:
      * \`id\`: (Integer) A unique sequential identifier for each element (starting from 1).
      * \`type\`: (String) The type of the element. Must be one of: "rectangle", "square", "parallelogram", "rhombus", "triangle", "circle", "ellipse", "arrow", "line_segment", "text", **"trapezoid"**, "other_shape". (Explicitly include "trapezoid").
      * \`bounding_box\`: An object with \`x1\`, \`y1\`, \`x2\`, \`y2\` keys (Integers), representing the top-left and bottom-right pixel coordinates of the element's bounding box. Assume origin (0,0) is the top-left corner of the image. **Ensure these coordinates are as precise as possible.**
      * \`center_coordinates\`: An object with \`cx\`, \`cy\` keys (Floats or Integers), representing the approximate center coordinates.
      * \`dimensions\`: An object containing size information appropriate for the shape type:
          * For rectangles/squares/parallelograms/rhombus/ellipses/trapezoids: \`width\` (Integer), \`height\` (Integer). (Include trapezoids here).
          * For circles: \`radius\` (Float or Integer).
          * For triangles: \`base\` (Integer), \`height\` (Integer) (if easily determinable) or side lengths if possible.
          * For line_segments/arrows: \`length\` (Float or Integer).
          **Prioritize calculating dimensions accurately based on detected outlines and bounding boxes.**
      * \`orientation_angle\`: (Float) Estimated angle of rotation in degrees (0 for horizontal/vertical alignment, positive for counter-clockwise rotation), if applicable and significantly non-zero (e.g., > 5 degrees). Default to 0 if not applicable or axis-aligned.
      * \`style_info\`: An object with keys like:
          * \`line_thickness\`: (String) e.g., "thin", "medium", "thick".
          * \`line_style\`: (String) e.g., "solid", "dashed", "dotted".
          * \`color\`: (String) Detected color (e.g., "black", "red", "blue") if discernible, otherwise "unknown".
          * \`fill\`: (String) Fill color if applicable, otherwise "none".
      * \`text_content\`: (String) The recognized text within the element. Null if not a text element.
      * \`relationships\`: An array of objects describing spatial relationships to *other* elements. Each relationship object should have:
          * \`related_element_id\`: (Integer) The \`id\` of the other element.
          * \`relation_type\`: (String) The type of relationship (e.g., "left_of", "right_of", "above", "below", "overlaps_with", "partially_overlaps_with", "inside", "contains", "connected_to_start", "connected_to_end", "points_to"). **Be extremely precise** (e.g., specify which edge is aligned with or next to which other edge, describe overlaps accurately).
          **Quantify relationships where possible:** Instead of just "above", consider "bottom edge is slightly above top edge of X", or if possible, include relative distances or overlaps as a percentage of either element's size or the total image size.
  
  3.  \`plausibility_check_notes\`: (String) Describe potential inconsistencies or confirmations regarding the extracted coordinates and dimensions. **Critically evaluate the consistency of detected shapes, sizes, and relative positions.** For example, "The bottom edge of the triangle is aligned with the top edge of the rectangle below it, as expected from bounding box analysis", "The chimney's right edge is vertically aligned with the right vertex of the roof trapezoid", or "Detected dimensions for the roof trapezoid align with visual proportions".
  
  **Instructions:**
  
  1.  Carefully and meticulously examine the entire whiteboard sketch image.
  2.  **Identify *every single* distinct geometric shape** (rectangles, squares, circles, ellipses, triangles, **TRAPEZOIDS**, parallelograms, rhombus, arrows, lines) and block of text. Do not miss any element.
      Pay close attention to potentially unusual or approximate shapes, e.g. slightly crooked and not fully closed rectangles, symmetric and asymetric triangles pointing up/left/down/..., trapezoids with differently angled sides - say, 45° left side and -20° right side, black bold arrow pointing to the right at 30°, etc. **Explicitly look for and identify the trapezoidal shape of the roof.**
  3.  Pay close attention to the total number of geometric forms in the sketch image and **ensure that you have mapped every single discernable element to a detected shape** in the \`elements\` array.
  4.  For each element, determine its type, the **most precise possible** bounding box, approximate center, dimensions, orientation, style, and any text content.
  5.  **Critically analyze and verify** the spatial relationships between *all* pairs of elements (position, overlap, connection). Focus on immediate and clear relationships, but also consider broader alignments.
      **Perform internal verification:** Cross-reference the bounding box coordinates, dimensions, and relative positions. For example, if element A is reported as "above" element B, confirm that A's y2 coordinate is less than B's y1 coordinate (allowing for slight margins due to line thickness). If possible, calculate relative distances or overlaps between key points or edges of related shapes (e.g., percentage distance between the bottom of the triangle and the top of the roof). Use these internal checks to refine your reported coordinates and relationships for maximum accuracy. **Ensure the reported relative positions and sizes precisely reflect the visual appearance.**
  6.  Count the total number of distinct elements identified and report it accurately.
  7.  Provide a concise interpretation of the sketch's likely purpose or subject.
  8.  Generate **ONLY** the JSON object conforming strictly to the structure specified above. Do not include any explanatory text before or after the JSON object.
  9.  Use the \`plausibility_check_notes\` to explicitly comment on the accuracy and consistency of your geometric and relational findings, noting where your analysis confirms the visual sketch and where any minor ambiguities might exist (though strive for high accuracy).
  
  Analyze the provided image now and generate the JSON output.`
};

/**
 * JSON schema of the answer the analysis prompt asks for. Every provider enforces it:
 * Claude structured outputs, Gemini responseFormat, OpenAI strict json_schema. Every object sets additionalProperties: false and lists all
 * its properties as required, as structured outputs demand; absent values are null.
 */
const nullableNumber = { anyOf: [{ type: 'number' }, { type: 'null' }] };
export const DIAGRAM_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['analysis_summary', 'elements', 'plausibility_check_notes'],
  properties: {
    analysis_summary: {
      type: 'object',
      additionalProperties: false,
      required: ['total_distinct_elements', 'composition_interpretation'],
      properties: {
        total_distinct_elements: { type: 'integer' },
        composition_interpretation: { type: 'string' },
      },
    },
    elements: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'type', 'bounding_box', 'center_coordinates', 'dimensions', 'orientation_angle', 'style_info', 'text_content', 'relationships'],
        properties: {
          id: { type: 'integer' },
          type: {
            type: 'string',
            enum: ['rectangle', 'square', 'parallelogram', 'rhombus', 'triangle', 'circle', 'ellipse', 'arrow', 'line_segment', 'text', 'trapezoid', 'other_shape'],
          },
          bounding_box: {
            type: 'object',
            additionalProperties: false,
            required: ['x1', 'y1', 'x2', 'y2'],
            properties: { x1: { type: 'integer' }, y1: { type: 'integer' }, x2: { type: 'integer' }, y2: { type: 'integer' } },
          },
          center_coordinates: {
            type: 'object',
            additionalProperties: false,
            required: ['cx', 'cy'],
            properties: { cx: { type: 'number' }, cy: { type: 'number' } },
          },
          dimensions: {
            type: 'object',
            additionalProperties: false,
            required: ['width', 'height', 'radius', 'length', 'base'],
            properties: { width: nullableNumber, height: nullableNumber, radius: nullableNumber, length: nullableNumber, base: nullableNumber },
          },
          orientation_angle: { type: 'number' },
          style_info: {
            type: 'object',
            additionalProperties: false,
            required: ['line_thickness', 'line_style', 'color', 'fill'],
            properties: {
              line_thickness: { type: 'string', enum: ['thin', 'medium', 'thick'] },
              line_style: { type: 'string', enum: ['solid', 'dashed', 'dotted'] },
              color: { type: 'string' },
              fill: { type: 'string' },
            },
          },
          text_content: { anyOf: [{ type: 'string' }, { type: 'null' }] },
          relationships: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['related_element_id', 'relation_type'],
              properties: { related_element_id: { type: 'integer' }, relation_type: { type: 'string' } },
            },
          },
        },
      },
    },
    plausibility_check_notes: { type: 'string' },
  },
};

/**
 * Returns the Gemini prompt for the given version.
 * @param version Prompt version key (default: 'v1')
 */
export function getGeminiPrompt(version: string = 'v1'): string {
  return GEMINI_PROMPTS[version] || GEMINI_PROMPTS['v1'];
}

// Update buildGeminiPrompt to use the prompt management utility
/**
 * Generates the prompt for Gemini, using the selected version.
 * @param version Prompt version key (default: 'v1')
 */
function buildGeminiPrompt(version: string = 'v1'): string {
  return getGeminiPrompt(version);
}

/**
 * Error thrown when authentication with the VLM API fails.
 */
export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

/**
 * Error thrown when the API rate limit is exceeded.
 */
export class RateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RateLimitError';
  }
}

/**
 * Error thrown when the API quota is exceeded.
 */
export class QuotaExceededError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'QuotaExceededError';
  }
}

/**
 * General error for other API failures.
 */
export class GeneralAPIError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GeneralAPIError';
  }
}

/**
 * JSON schema for StructuredDiagram (expected Gemini output)
 *
 * {
 *   elements: [
 *     {
 *       id: string,
 *       type: 'rectangle' | 'circle' | 'ellipse' | 'triangle' | 'arrow' | 'line' | 'text',
 *       boundingBox: { x: number, y: number, width: number, height: number },
 *       text?: string,
 *       style?: { color?: string, lineStyle?: string, fill?: string, fontWeight?: string }
 *     }, ...
 *   ],
 *   relationships: [
 *     {
 *       id: string,
 *       type: string,
 *       sourceId: string,
 *       targetId: string
 *     }, ...
 *   ]
 * }
 */

/**
 * Validates a parsed object against the VLMServiceResponse schema (v2).
 * @param obj The parsed object to validate
 * @returns { valid: boolean, errors: string[], partial?: Partial<VLMServiceResponse> }
 */
export function validateStructuredDiagram(obj: unknown): { valid: boolean, errors: string[], partial?: Partial<VLMServiceResponse> } {
  const errors: string[] = [];
  if (!obj || typeof obj !== 'object') {
    errors.push('Root is not an object.');
    return { valid: false, errors };
  }
  const o = obj as Record<string, unknown>;
  if (!Array.isArray(o.elements)) {
    errors.push('Missing or invalid elements array.');
    return { valid: false, errors };
  }

  // Type guards - even more lenient now
  function isDiagramElement(el: unknown): el is DiagramElement {
    return el !== null && typeof el === 'object';
  }

  // Validate elements
  let idCounter = 1;
  const validElements = o.elements.map((el, i) => {
    if (!el || typeof el !== 'object') {
      errors.push(`Element at index ${i} is not an object.`);
      return null;
    }

    const e = el as Record<string, unknown>;
    
    // Generate ID if missing or convert number to string
    if (typeof e.id !== 'string' && typeof e.id !== 'number') {
      e.id = `auto_${idCounter++}`;
    } else if (typeof e.id === 'number') {
      e.id = String(e.id);
    }

    // Set default type if missing
    if (typeof e.type !== 'string') {
      errors.push(`Element at index ${i} (${e.id}) missing type, defaulting to 'rectangle'.`);
      e.type = 'rectangle';
    }

    // Handle missing or invalid bounding box - create default if missing
    if (!e.bounding_box || typeof e.bounding_box !== 'object') {
      errors.push(`Element at index ${i} (${e.id}) missing bounding_box, creating default.`);
      e.bounding_box = {
        x1: 0,
        y1: 0,
        x2: 100,
        y2: 100
      };
    } else {
      const bb = e.bounding_box as Record<string, unknown>;
      // Convert any existing x,y,width,height format to x1,y1,x2,y2
      if ('x' in bb && 'y' in bb && 'width' in bb && 'height' in bb) {
        const x = Number(bb.x) || 0;
        const y = Number(bb.y) || 0;
        const width = Number(bb.width) || 100;
        const height = Number(bb.height) || 100;
        e.bounding_box = {
          x1: x,
          y1: y,
          x2: x + width,
          y2: y + height
        };
      } else if (typeof bb.x1 !== 'number' || typeof bb.y1 !== 'number' || 
                 typeof bb.x2 !== 'number' || typeof bb.y2 !== 'number') {
        errors.push(`Element at index ${i} (${e.id}) has invalid bounding_box coordinates, using defaults.`);
        e.bounding_box = {
          x1: 0,
          y1: 0,
          x2: 100,
          y2: 100
        };
      }
    }

    // At this point, we have an element with required fields (even if some are defaults)
    return isDiagramElement(el) ? el as DiagramElement : null;
  }).filter((el): el is DiagramElement => el !== null);

  // Even if we have errors, return partial results if we have any valid elements
  const partial: Partial<VLMServiceResponse> = {
    analysis_summary: o.analysis_summary as AnalysisSummary || {
      total_distinct_elements: validElements.length,
      composition_interpretation: 'Partial parse with defaults'
    },
    elements: validElements,
    plausibility_check_notes: o.plausibility_check_notes as string || 'Validation completed with defaults applied.'
  };

  // Consider validation successful if we have at least one valid element
  const valid = validElements.length > 0;
  
  return { valid, errors, partial };
}

export type ImageMediaType = 'image/png' | 'image/jpeg';

/**
 * Splits an uploaded image's data URL into its media type and base64 payload, so each
 * adapter declares the real format instead of assuming PNG.
 */
export function parseImageDataUrl(dataUrl: string): { mediaType: ImageMediaType; data: string } {
  const match = /^data:(image\/(?:png|jpeg));base64,/.exec(dataUrl);
  if (!match) {
    throw new GeneralAPIError('Only PNG and JPEG images are supported.');
  }
  return { mediaType: match[1] as ImageMediaType, data: dataUrl.slice(match[0].length) };
}

/**
 * Utility to hash image data for cache key (SHA-256, base64).
 * Uses browser SubtleCrypto API.
 */
async function hashImageData(imageDataUrl: string): Promise<string> {
  // Only hash the base64 part for efficiency
  const [, base64 = ''] = imageDataUrl.split(',');
  const encoder = new TextEncoder();
  const data = encoder.encode(base64);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
  // Convert buffer to base64
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashString = btoa(String.fromCharCode(...hashArray));
  return hashString;
}

/**
 * Simple in-memory LRU cache for Gemini results (max 50 entries).
 * Keyed by image hash. Exposed for testing.
 */
const GEMINI_CACHE = new Map<string, VLMServiceResponse>();
const GEMINI_CACHE_MAX = 50;

/**
 * GeminiAdapter implements the VLMService interface for Google's Gemini Vision API.
 * Handles authentication, request formatting, response parsing, error handling, and logging.
 *
 * To add support for additional models, implement a new Adapter class with the VLMService interface.
 */
class GeminiAdapter implements VLMService {
  /** Gemini API key (from user preferences, not hardcoded) */
  private apiKey: string;
  /** Max number of retries for transient errors */
  private maxRetries = 3;
  /** Base delay (ms) for exponential backoff */
  private baseDelay = 500; // ms

  /**
   * @param apiKey Gemini API key (should be securely provided via preferences or environment)
   */
  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Analyze a whiteboard image and return a structured diagram.
   * Uses in-memory LRU cache to avoid redundant API calls for the same image.
   * @param imageDataUrl Image as a base64 data URL (PNG recommended)
   * @returns Promise resolving to a StructuredDiagram
   */
  async analyzeImage(imageDataUrl: string, apiKey?: string): Promise<VLMServiceResponse> {
    Logger.debug(Logger.Categories.VLM, '[Gemini] Analyzing with Gemini adapter...', { apiKeyProvided: !!apiKey });
    const imageHash = await hashImageData(imageDataUrl);
    // Check cache first
    if (GEMINI_CACHE.has(imageHash)) {
      // Move to end (LRU)
      const cached = GEMINI_CACHE.get(imageHash)!;
      GEMINI_CACHE.delete(imageHash);
      GEMINI_CACHE.set(imageHash, cached);
      Logger.info(Logger.Categories.VLM, '[Gemini] Cache hit for image');
      return cached;
    }
    const endpoint = 'https://generativelanguage.googleapis.com/v1/models/gemini-4-argon:generateContent?key=' + (apiKey || this.apiKey);
    const { mediaType, data: base64 } = parseImageDataUrl(imageDataUrl);
    const prompt = buildGeminiPrompt('v1');
    const requestBody = {
      contents: [
        {
          parts: [
            { inlineData: { mimeType: mediaType, data: base64 } },
            { text: prompt }
          ]
        }
      ],
      // Structured output: the answer is JSON that matches the diagram schema
      generationConfig: {
        responseFormat: { text: { mimeType: 'APPLICATION_JSON', schema: DIAGRAM_JSON_SCHEMA } },
      },
    };
    let lastError: unknown = null;
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        Logger.info(Logger.Categories.VLM, `[Gemini] Request (attempt ${attempt + 1}):`, endpoint, { ...requestBody, contents: '[omitted image data]' });
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        });
        const resText = await res.clone().text();
        Logger.info(Logger.Categories.VLM, `[Gemini] Response (attempt ${attempt + 1}):`, res.status, res.statusText, resText);
        if (!res.ok) {
          // Handle specific error types
          if (res.status === 401 || res.status === 403) {
            Logger.error(Logger.Categories.VLM, '[Gemini] Authentication error:', res.status, res.statusText);
            throw new AuthenticationError('Authentication failed. Please check your Gemini API key.');
          }
          if (res.status === 429) {
            Logger.warn(Logger.Categories.VLM, '[Gemini] Rate limit exceeded:', res.status, res.statusText);
            throw new RateLimitError('Gemini API rate limit exceeded. Please wait and try again later.');
          }
          if (res.status === 402 || resText.toLowerCase().includes('quota')) {
            Logger.warn(Logger.Categories.VLM, '[Gemini] Quota exceeded:', res.status, res.statusText);
            throw new QuotaExceededError('Gemini API quota exceeded. Please check your usage or billing.');
          }
          if (res.status >= 500 && res.status < 600) {
            throw new GeneralAPIError(`Transient Gemini API error: ${res.status} ${res.statusText}`);
          }
          throw new GeneralAPIError(`Gemini API error: ${res.status} ${res.statusText} - ${resText}`);
        }
        
        // --- Start: JSON Parsing and Cleaning ---
        const rawResponseData = await res.json(); // Parse the outer structure first
        // Thinking models may return thought parts before the answer; keep only the answer text
        const parts: Array<{ text?: string; thought?: boolean }> = rawResponseData?.candidates?.[0]?.content?.parts ?? [];
        const text = parts.filter(p => !p.thought && typeof p.text === 'string').map(p => p.text).join('');
        
        if (!text) {
          Logger.error(Logger.Categories.VLM, "Invalid response structure or missing text content from Gemini:", rawResponseData);
          throw new GeneralAPIError('No valid text content found in Gemini response.');
        }

        // Structured output (responseFormat below) makes the answer JSON matching the schema
        let parsed: unknown;
        try {
          parsed = JSON.parse(text);
        } catch (parseError) {
          Logger.error(Logger.Categories.VLM, 'Gemini returned invalid JSON:', parseError, text);
          throw new GeneralAPIError('Gemini returned invalid JSON.');
        }

        // Ensure parsed data is an object before proceeding
        if (typeof parsed !== 'object' || parsed === null) {
            Logger.error(Logger.Categories.VLM, "Parsed content is not a valid object:", parsed);
            throw new GeneralAPIError('Parsed Gemini response is not a valid object.');
        }

        // Validate against schema using the now-known-to-be-object parsed object
        const validation = validateStructuredDiagram(parsed);
        if (!validation.valid) {
          // Check elements safely, provide default empty array if undefined
          if (validation.partial && (validation.partial.elements?.length ?? 0) > 0) {
            Logger.warn(Logger.Categories.VLM, '[Gemini] Partial diagram parsed with errors:', validation.errors);
            // Construct the return object carefully to match VLMServiceResponse type
            return {
              analysis_summary: validation.partial.analysis_summary ?? { total_distinct_elements: 0, composition_interpretation: 'Partial parse error' }, // Provide default summary
              elements: validation.partial.elements ?? [], // Provide default empty array
              plausibility_check_notes: validation.partial.plausibility_check_notes ?? 'Partial parse error', // Provide default notes
              vlmProvider: 'gemini' // Add provider to partial response
            };
          }
          throw new GeneralAPIError('Malformed Gemini output: ' + validation.errors.join('; '));
        }
        // Cache successful result (including description)
        // Type assertion is okay here because we validated parsed is an object
        const finalResponse = { ...(parsed as object), vlmProvider: 'gemini' } as VLMServiceResponse;
        GEMINI_CACHE.set(imageHash, finalResponse);
        // Enforce LRU max size
        if (GEMINI_CACHE.size > GEMINI_CACHE_MAX) {
          const firstKey = GEMINI_CACHE.keys().next().value;
          if (typeof firstKey === 'string') {
            GEMINI_CACHE.delete(firstKey);
          }
        }
        return finalResponse;
      } catch (err: unknown) {
        lastError = err;
        // Only retry on transient errors
        if (err instanceof GeneralAPIError && err.message.includes('Transient Gemini API error')) {
          const delay = this.baseDelay * Math.pow(2, attempt);
          Logger.warn(Logger.Categories.VLM, `[Gemini] Transient error, retrying in ${delay}ms...`, err);
          await new Promise(res => setTimeout(res, delay));
          continue;
        }
        // For non-retryable errors, break immediately
        break;
      }
    }
    // After retries, throw user-friendly error
    if (lastError instanceof AuthenticationError || lastError instanceof RateLimitError || lastError instanceof QuotaExceededError) {
      throw lastError;
    }
    let message = 'Failed to analyze image with Gemini after multiple attempts.';
    if (lastError instanceof GeneralAPIError) {
      message = lastError.message;
    } else if (lastError instanceof Error) {
      message = lastError.message;
    } else if (typeof lastError === 'string') {
      message = lastError;
    }
    Logger.error(Logger.Categories.VLM, '[Gemini] Final error:', lastError);
    throw new GeneralAPIError(message);
  }
}

/* ClaudeAdapter: Implements VLMService for Anthropic Claude Vision API */
/** The Claude models Sketcher offers; each runs through the same adapter. */
const CLAUDE_MODELS = {
  // Fable 5.1's default effort is already high.
  claude: { model: 'claude-fable-5-1', effort: undefined },
  // Opus 5.5 defaults to medium effort; raise it to match Fable for precise geometry.
  'claude-opus': { model: 'claude-opus-5-5', effort: 'high' },
} as const;

type ClaudeProviderKey = keyof typeof CLAUDE_MODELS;

class ClaudeAdapter implements VLMService {
  private apiKey: string;
  private providerKey: ClaudeProviderKey;
  private maxRetries = 3;
  private baseDelay = 500; // ms

  constructor(apiKey: string, providerKey: ClaudeProviderKey = 'claude') {
    this.apiKey = apiKey;
    this.providerKey = providerKey;
  }

  async analyzeImage(imageDataUrl: string, apiKey?: string): Promise<VLMServiceResponse> {
    const { mediaType, data: imageBase64 } = parseImageDataUrl(imageDataUrl);
    const prompt = buildGeminiPrompt('v1'); // Use the same prompt for consistency
    const anthropic = new Anthropic({ apiKey: apiKey || this.apiKey, dangerouslyAllowBrowser: true });
    const { model, effort } = CLAUDE_MODELS[this.providerKey];
    let lastError: unknown = null;
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const msg = await anthropic.beta.messages.create({
          // Thinking is always on for these models (it shares max_tokens with the answer);
          // sampling parameters such as temperature are rejected with a 400.
          model,
          max_tokens: 16000,
          // If Fable's safety classifiers decline, the API re-runs the request on the
          // model Anthropic recommends for that refusal category, within the same call.
          betas: ['server-side-fallback-2026-07-01'],
          fallbacks: 'default',
          // Structured outputs: the API guarantees the answer is valid JSON matching the schema
          output_config: { format: { type: 'json_schema', schema: DIAGRAM_JSON_SCHEMA }, ...(effort && { effort }) },
          system: 'You are an expert visual analysis assistant.',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'image',
                  source: {
                    type: 'base64',
                    media_type: mediaType,
                    data: imageBase64,
                  },
                },
                { type: 'text', text: prompt },
              ],
            },
          ],
        });
        for (const block of msg.content) {
          if (block.type === 'fallback') {
            Logger.info(Logger.Categories.VLM, `[Claude] ${block.from.model} declined; ${block.to.model} continued`);
          }
        }
        // A refusal here means the fallback model declined too
        if (msg.stop_reason === 'refusal') {
          throw new GeneralAPIError('Claude declined to analyze this image.');
        }
        if (msg.stop_reason === 'max_tokens') {
          throw new GeneralAPIError('Claude response was cut off (max_tokens reached).');
        }
        // The answer follows any thinking blocks, so pick the text block rather than content[0]
        const text = msg.content
          .filter((block): block is Anthropic.Beta.BetaTextBlock => block.type === 'text')
          .map(block => block.text)
          .join('');
        const parsed = JSON.parse(text);
        // Validate against schema
        const validation = validateStructuredDiagram(parsed);
        if (!validation.valid) {
          if (validation.partial && (validation.partial.elements?.length ?? 0) > 0) {
            return {
              analysis_summary: validation.partial.analysis_summary ?? { total_distinct_elements: 0, composition_interpretation: 'Partial parse error' },
              elements: validation.partial.elements ?? [],
              plausibility_check_notes: validation.partial.plausibility_check_notes ?? 'Partial parse error',
              vlmProvider: this.providerKey,
            };
          }
          throw new GeneralAPIError('Malformed Claude output: ' + validation.errors.join('; '));
        }
        return { ...parsed, vlmProvider: this.providerKey } as VLMServiceResponse;
      } catch (err: unknown) {
        lastError = err;
        // Only retry on transient errors
        if (err instanceof GeneralAPIError && err.message.includes('Transient')) {
          const delay = this.baseDelay * Math.pow(2, attempt);
          await new Promise(res => setTimeout(res, delay));
          continue;
        }
        break;
      }
    }
    if (lastError instanceof AuthenticationError || lastError instanceof RateLimitError || lastError instanceof QuotaExceededError) {
      throw lastError;
    }
    let message = 'Failed to analyze image with Claude after multiple attempts.';
    if (lastError instanceof GeneralAPIError) {
      message = lastError.message;
    } else if (lastError instanceof Error) {
      message = lastError.message;
    } else if (typeof lastError === 'string') {
      message = lastError;
    }
    throw new GeneralAPIError(message);
  }
}

// Gpt4oAdapter: Implements VLMService for OpenAI GPT-4o Vision
class Gpt4oAdapter implements VLMService {
  private apiKey: string;
  private maxRetries = 3;
  private baseDelay = 500; // ms

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async analyzeImage(imageDataUrl: string, apiKey?: string): Promise<VLMServiceResponse> {
    const openai = new OpenAI({ apiKey: apiKey || this.apiKey, dangerouslyAllowBrowser: true });
    // Validates the format; the data URL itself is what OpenAI takes
    parseImageDataUrl(imageDataUrl);
    const prompt = buildGeminiPrompt('v1'); // Use the same prompt for consistency
    let lastError: unknown = null;
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const response = await openai.chat.completions.create({
          // Reasoning model: rejects temperature, and reasoning tokens count against
          // max_completion_tokens (max_tokens is deprecated)
          model: 'gpt-6-astra',
          max_completion_tokens: 16000,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'image_url',
                  image_url: {
                    url: imageDataUrl,
                  },
                },
                { type: 'text', text: prompt },
              ],
            },
          ],
          // Structured Outputs: strict mode makes the answer JSON that matches the schema
          response_format: {
            type: 'json_schema',
            json_schema: { name: 'diagram', strict: true, schema: DIAGRAM_JSON_SCHEMA },
          },
        });
        const message = response.choices?.[0]?.message;
        if (message?.refusal) {
          throw new GeneralAPIError(`OpenAI declined to analyze this image: ${message.refusal}`);
        }
        if (response.choices?.[0]?.finish_reason === 'length') {
          throw new GeneralAPIError('OpenAI response was cut off (max_completion_tokens reached).');
        }
        const parsed = JSON.parse(message?.content || '');
        // Validate against schema
        const validation = validateStructuredDiagram(parsed);
        if (!validation.valid) {
          if (validation.partial && (validation.partial.elements?.length ?? 0) > 0) {
            return {
              analysis_summary: validation.partial.analysis_summary ?? { total_distinct_elements: 0, composition_interpretation: 'Partial parse error' },
              elements: validation.partial.elements ?? [],
              plausibility_check_notes: validation.partial.plausibility_check_notes ?? 'Partial parse error',
              vlmProvider: 'gpt4o',
            };
          }
          throw new GeneralAPIError('Malformed GPT-4o output: ' + validation.errors.join('; '));
        }
        return { ...parsed, vlmProvider: 'gpt4o' } as VLMServiceResponse;
      } catch (err: unknown) {
        lastError = err;
        // Only retry on transient errors
        if (err instanceof GeneralAPIError && err.message.includes('Transient')) {
          const delay = this.baseDelay * Math.pow(2, attempt);
          await new Promise(res => setTimeout(res, delay));
          continue;
        }
        break;
      }
    }
    let message = 'Failed to analyze image with GPT-4o after multiple attempts.';
    if (lastError instanceof GeneralAPIError) {
      message = lastError.message;
    } else if (lastError instanceof Error) {
      message = lastError.message;
    } else if (typeof lastError === 'string') {
      message = lastError;
    }
    throw new GeneralAPIError(message);
  }
}

// Expose cache for testing/inspection
export { GEMINI_CACHE, hashImageData }; 

// Dummy Adapter for fallback/testing
class DummyVLMAdapter implements VLMService {
  public async analyzeImage(_dataUrl: string): Promise<VLMServiceResponse> {
    Logger.warn(Logger.Categories.VLM, `[DummyVLM] Using dummy adapter for type: ${_dataUrl}. Returning mock data.`);
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
    // Return mock response matching VLMServiceResponse structure
    return {
      analysis_summary: { total_distinct_elements: 0, composition_interpretation: 'Dummy response' },
      elements: [],
      plausibility_check_notes: 'Dummy response',
      vlmProvider: 'dummy'
    };
  }
}

/**
 * Factory: returns the VLMService adapter for the given provider key.
 * Unknown/unimplemented providers fall back to a dummy adapter.
 */
function getVlmAdapter(vlmType: string, apiKey: string = ''): VLMService {
  Logger.debug(Logger.Categories.VLM, `Selecting adapter for VLM type: ${vlmType}`);
  switch (vlmType) {
    case 'gemini':
      return new GeminiAdapter(apiKey);
    case 'claude':
    case 'claude-opus':
      return new ClaudeAdapter(apiKey, vlmType);
    case 'gpt4o':
      return new Gpt4oAdapter(apiKey);
    default:
      Logger.warn(Logger.Categories.VLM, `No adapter found for VLM type: ${vlmType}, using dummy adapter.`);
      return new DummyVLMAdapter();
  }
}

export { getVlmAdapter };

export { GeminiAdapter }; // Also export adapter if needed directly