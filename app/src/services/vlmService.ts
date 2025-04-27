import { usePreferences } from '../context/PreferencesContext';
import { Preferences } from './storage';

export interface BoundingBox {
  x: number; // top-left x (percentage or pixels)
  y: number; // top-left y
  width: number;
  height: number;
}

export interface Style {
  color?: string;
  lineStyle?: 'solid' | 'dashed' | 'dotted';
  fill?: string;
  fontWeight?: 'normal' | 'bold';
  // ... other relevant styles
}

export interface DiagramElement {
  id: string;
  type: 'rectangle' | 'circle' | 'ellipse' | 'triangle' | 'arrow' | 'line' | 'text';
  boundingBox: BoundingBox;
  text?: string;
  style?: Style;
}

export interface Relationship {
  id: string;
  type: 'connects' | 'contains' | 'above' | 'below' | 'left-of' | 'right-of' | 'overlaps';
  sourceId: string;
  targetId: string;
}

export interface StructuredDiagram {
  elements: DiagramElement[];
  relationships: Relationship[];
}

export interface VLMService {
  analyzeImage(imageDataUrl: string): Promise<StructuredDiagram>;
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
  /**
   * v1: Baseline prompt with few-shot example and explicit output instructions.
   * - Instructs model to output only valid JSON, no extra text.
   * - Includes a few-shot example for better structure.
   * - Rationale: Empirically yields the most reliable structured output for whiteboard diagrams.
   */
  v1: `You are an expert diagram analysis assistant. Analyze the provided whiteboard sketch image and output a structured JSON object describing all detected elements and their relationships.\n\n- Only output a valid JSON object, no extra text.\n- Use the following format:\n{\n  elements: [\n    { id, type, boundingBox: {x, y, width, height}, text, style }, ...\n  ],\n  relationships: [\n    { id, type, sourceId, targetId }, ...\n  ]\n}\n- type: rectangle, circle, ellipse, triangle, arrow, line, text\n- boundingBox: coordinates relative to the image\n- style: color, lineStyle, fill, fontWeight\n- If a property is unknown, omit it.\n- Do not include any explanations or comments.\n\nExample input: Whiteboard sketch with a rectangle labeled 'Start' and an arrow pointing to a circle labeled 'End'.\n\nExample output:\n{\n  "elements": [\n    { "id": "1", "type": "rectangle", "boundingBox": {"x": 10, "y": 20, "width": 100, "height": 50}, "text": "Start", "style": {"color": "black", "lineStyle": "solid"} },\n    { "id": "2", "type": "circle", "boundingBox": {"x": 150, "y": 30, "width": 50, "height": 50}, "text": "End", "style": {"color": "black", "lineStyle": "solid"} },\n    { "id": "3", "type": "arrow", "boundingBox": {"x": 110, "y": 45, "width": 40, "height": 10}, "style": {"color": "black", "lineStyle": "solid"} }\n  ],\n  "relationships": [\n    { "id": "r1", "type": "connects", "sourceId": "1", "targetId": "2" }\n  ]\n}`
  // Add more versions as needed, e.g., v2, v3...
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
 * Validates a parsed object against the StructuredDiagram schema.
 * @param obj The parsed object to validate
 * @returns { valid: boolean, errors: string[], partial?: StructuredDiagram }
 */
export function validateStructuredDiagram(obj: unknown): { valid: boolean, errors: string[], partial?: StructuredDiagram } {
  const errors: string[] = [];
  if (!obj || typeof obj !== 'object') {
    errors.push('Root is not an object.');
    return { valid: false, errors };
  }
  const o = obj as Record<string, unknown>;
  if (!Array.isArray(o.elements)) {
    errors.push('Missing or invalid elements array.');
  }
  if (!Array.isArray(o.relationships)) {
    errors.push('Missing or invalid relationships array.');
  }
  // Type guards
  function isDiagramElement(el: unknown): el is DiagramElement {
    if (!el || typeof el !== 'object') return false;
    const e = el as Record<string, unknown>;
    const bb = e.boundingBox as Record<string, unknown>;
    return (
      typeof e.id === 'string' &&
      typeof e.type === 'string' &&
      bb && typeof bb.x === 'number'
    );
  }
  function isRelationship(rel: unknown): rel is Relationship {
    if (!rel || typeof rel !== 'object') return false;
    const r = rel as Record<string, unknown>;
    return (
      typeof r.id === 'string' &&
      typeof r.type === 'string' &&
      typeof r.sourceId === 'string' &&
      typeof r.targetId === 'string'
    );
  }
  // Validate elements
  const validElements = Array.isArray(o.elements)
    ? o.elements.filter((el, i) => {
        if (!el || typeof el !== 'object') {
          errors.push(`Element at index ${i} is not an object.`);
          return false;
        }
        const e = el as Record<string, unknown>;
        if (typeof e.id !== 'string') errors.push(`Element at index ${i} missing id.`);
        if (typeof e.type !== 'string') errors.push(`Element at index ${i} missing type.`);
        if (!e.boundingBox || typeof e.boundingBox !== 'object') errors.push(`Element at index ${i} missing boundingBox.`);
        else {
          const bb = e.boundingBox as Record<string, unknown>;
          if (typeof bb.x !== 'number' || typeof bb.y !== 'number' || typeof bb.width !== 'number' || typeof bb.height !== 'number') {
            errors.push(`Element at index ${i} has invalid boundingBox.`);
          }
        }
        return isDiagramElement(el);
      }) as DiagramElement[]
    : [];
  // Validate relationships
  const validRelationships = Array.isArray(o.relationships)
    ? o.relationships.filter((rel, i) => {
        if (!rel || typeof rel !== 'object') {
          errors.push(`Relationship at index ${i} is not an object.`);
          return false;
        }
        const r = rel as Record<string, unknown>;
        if (typeof r.id !== 'string') errors.push(`Relationship at index ${i} missing id.`);
        if (typeof r.type !== 'string') errors.push(`Relationship at index ${i} missing type.`);
        if (typeof r.sourceId !== 'string') errors.push(`Relationship at index ${i} missing sourceId.`);
        if (typeof r.targetId !== 'string') errors.push(`Relationship at index ${i} missing targetId.`);
        return isRelationship(rel);
      }) as Relationship[]
    : [];
  const valid = errors.length === 0;
  const partial: StructuredDiagram = { elements: validElements, relationships: validRelationships };
  return { valid, errors, partial };
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
const GEMINI_CACHE = new Map<string, StructuredDiagram>();
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
  async analyzeImage(imageDataUrl: string): Promise<StructuredDiagram> {
    const imageHash = await hashImageData(imageDataUrl);
    // Check cache first
    if (GEMINI_CACHE.has(imageHash)) {
      // Move to end (LRU)
      const cached = GEMINI_CACHE.get(imageHash)!;
      GEMINI_CACHE.delete(imageHash);
      GEMINI_CACHE.set(imageHash, cached);
      console.info('[Gemini] Cache hit for image');
      return cached;
    }
    const endpoint = 'https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=' + this.apiKey;
    const base64 = imageDataUrl.split(',')[1];
    const prompt = buildGeminiPrompt();
    const requestBody = {
      contents: [
        {
          parts: [
            { inlineData: { mimeType: 'image/png', data: base64 } },
            { text: prompt }
          ]
        }
      ]
    };
    let lastError: unknown = null;
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        console.info(`[Gemini] Request (attempt ${attempt + 1}):`, endpoint, { ...requestBody, contents: '[omitted image data]' });
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        });
        const resText = await res.clone().text();
        console.info(`[Gemini] Response (attempt ${attempt + 1}):`, res.status, res.statusText, resText);
        if (!res.ok) {
          // Handle specific error types
          if (res.status === 401 || res.status === 403) {
            console.error('[Gemini] Authentication error:', res.status, res.statusText);
            throw new AuthenticationError('Authentication failed. Please check your Gemini API key.');
          }
          if (res.status === 429) {
            console.warn('[Gemini] Rate limit exceeded:', res.status, res.statusText);
            throw new RateLimitError('Gemini API rate limit exceeded. Please wait and try again later.');
          }
          if (res.status === 402 || resText.toLowerCase().includes('quota')) {
            console.warn('[Gemini] Quota exceeded:', res.status, res.statusText);
            throw new QuotaExceededError('Gemini API quota exceeded. Please check your usage or billing.');
          }
          if (res.status >= 500 && res.status < 600) {
            throw new GeneralAPIError(`Transient Gemini API error: ${res.status} ${res.statusText}`);
          }
          throw new GeneralAPIError(`Gemini API error: ${res.status} ${res.statusText} - ${resText}`);
        }
        const data = JSON.parse(resText);
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) throw new GeneralAPIError('No response from Gemini.');
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new GeneralAPIError('No JSON found in Gemini response.');
        const parsed = JSON.parse(jsonMatch[0]);
        // Validate against schema
        const validation = validateStructuredDiagram(parsed);
        if (!validation.valid) {
          if (validation.partial && (validation.partial.elements.length > 0 || validation.partial.relationships.length > 0)) {
            console.warn('[Gemini] Partial diagram parsed with errors:', validation.errors);
            return validation.partial;
          }
          throw new GeneralAPIError('Malformed Gemini output: ' + validation.errors.join('; '));
        }
        // Cache successful result
        GEMINI_CACHE.set(imageHash, parsed as StructuredDiagram);
        // Enforce LRU max size
        if (GEMINI_CACHE.size > GEMINI_CACHE_MAX) {
          const firstKey = GEMINI_CACHE.keys().next().value;
          if (typeof firstKey === 'string') {
            GEMINI_CACHE.delete(firstKey);
          }
        }
        return parsed as StructuredDiagram;
      } catch (err: unknown) {
        lastError = err;
        // Only retry on transient errors
        if (err instanceof GeneralAPIError && err.message.includes('Transient Gemini API error')) {
          const delay = this.baseDelay * Math.pow(2, attempt);
          console.warn(`[Gemini] Transient error, retrying in ${delay}ms...`, err);
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
    console.error('[Gemini] Final error:', lastError);
    throw new GeneralAPIError(message);
  }
}

/* // Comment out unused ClaudeAdapter for now
class ClaudeAdapter implements VLMService {
   // Similar implementation for Claude
   private apiKey: string; // Likely needed
   constructor(apiKey: string) { this.apiKey = apiKey }
   async analyzeImage(imageDataUrl: string): Promise<StructuredDiagram> {
      console.log('Calling Claude...', imageDataUrl.substring(0, 50) + '...'); // Use imageDataUrl
      await new Promise(resolve => setTimeout(resolve, 1000));
      return { elements: [], relationships: [] };
   }
}
*/

/**
 * Factory function to select the appropriate VLMService implementation based on user preferences.
 *
 * To add support for new models, extend this function to check for additional API keys or settings.
 *
 * @param prefs User preferences (should include API keys for supported models)
 * @returns VLMService instance (GeminiAdapter, ClaudeAdapter, etc.)
 */
function getVLMService(prefs: Preferences): VLMService {
   // Example: Add logic for additional models here
   if (prefs.geminiApiKey) {
       return new GeminiAdapter(prefs.geminiApiKey);
   }
    // if (prefs.claudeApiKey) {
    //   return new ClaudeAdapter(prefs.claudeApiKey);
    // }
   console.warn("No suitable VLM API key found in preferences. Using dummy service.");
   return { analyzeImage: async () => ({ elements: [], relationships: [] }) } // Dummy fallback
}

/**
 * React hook to access the current VLMService based on user preferences.
 *
 * Usage: const vlmService = useVLMService();
 *
 * @returns VLMService instance
 */
export function useVLMService(): VLMService {
    const { preferences } = usePreferences();
    // In a real app, you might memoize this based on preferences
    return getVLMService(preferences);
}

// Expose cache for testing/inspection
export { GEMINI_CACHE, hashImageData }; 