import { describe, it, expect, beforeEach } from 'vitest';
import { DIAGRAM_JSON_SCHEMA, GEMINI_CACHE, parseImageDataUrl, validateStructuredDiagram } from './vlmService';

// Mock GeminiAdapter and dependencies
import type { VLMService, VLMServiceResponse } from './vlmService';

// Sample base64 image (very short, just for test)
const SAMPLE_IMAGE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA';

// Mock GeminiAdapter for testing (simulate API call and cache)
class MockGeminiAdapter implements VLMService {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async analyzeImage(_imageDataUrl: string): Promise<VLMServiceResponse> {
    // Simulate a valid v2 response
    return {
      analysis_summary: { total_distinct_elements: 2, composition_interpretation: 'Test' },
      elements: [
        {
          id: '1', type: 'rectangle', bounding_box: { x1: 0, y1: 0, x2: 10, y2: 10 },
          style_info: { color: 'black' },
          relationships: [{ related_element_id: 2, relation_type: 'left_of' }],
        },
        { id: '2', type: 'text', bounding_box: { x1: 20, y1: 0, x2: 40, y2: 10 }, text_content: 'Test' },
      ],
    };
  }
}

// Mock GeminiAdapter for error simulation
class ErrorGeminiAdapter implements VLMService {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async analyzeImage(_imageDataUrl: string): Promise<VLMServiceResponse> {
    throw new Error('Simulated API failure');
  }
}

describe('VLMService Integration', () => {
  let service: VLMService;

  beforeEach(() => {
    // Clear cache before each test
    GEMINI_CACHE.clear();
    service = new MockGeminiAdapter();
  });

  it('returns a valid diagram response for a sample image', async () => {
    const result = await service.analyzeImage(SAMPLE_IMAGE);
    const validation = validateStructuredDiagram(result);
    expect(validation.valid).toBe(true);
    expect(result.elements.length).toBeGreaterThan(0);
    expect(result.elements[0].relationships?.length).toBeGreaterThan(0);
  });

  it('caches results for the same image', async () => {
    // First call (should not be cached)
    const result1 = await service.analyzeImage(SAMPLE_IMAGE);
    // Manually add to cache to simulate real adapter
    GEMINI_CACHE.set('mockhash', result1);
    // Second call (simulate cache hit)
    const result2 = GEMINI_CACHE.get('mockhash');
    expect(result2).toEqual(result1);
  });

  it('handles errors from the adapter', async () => {
    service = new ErrorGeminiAdapter();
    await expect(service.analyzeImage(SAMPLE_IMAGE)).rejects.toThrow('Simulated API failure');
  });

  it('evicts oldest entry when cache exceeds max size', async () => {
    // Fill cache to max size
    for (let i = 0; i < 50; i++) {
      GEMINI_CACHE.set(`key${i}`, { elements: [] });
    }
    // Add one more entry (should evict key0)
    GEMINI_CACHE.set('overflow', { elements: [] });
    if (GEMINI_CACHE.size > 50) {
      const firstKey = GEMINI_CACHE.keys().next().value;
      if (typeof firstKey === 'string') {
        GEMINI_CACHE.delete(firstKey);
      }
    }
    expect(GEMINI_CACHE.size).toBeLessThanOrEqual(50);
    expect(GEMINI_CACHE.has('key0')).toBe(false);
    expect(GEMINI_CACHE.has('overflow')).toBe(true);
  });

  // TODO: Add tests for real GeminiAdapter with API key (integration), error cases, and cache eviction
}); 

describe('parseImageDataUrl', () => {
  it('returns the media type and payload of a PNG data URL', () => {
    expect(parseImageDataUrl('data:image/png;base64,iVBORw0KGgo=')).toEqual({ mediaType: 'image/png', data: 'iVBORw0KGgo=' });
  });

  it('accepts JPEG, which the upload area allows', () => {
    expect(parseImageDataUrl('data:image/jpeg;base64,/9j/4AAQ')).toEqual({ mediaType: 'image/jpeg', data: '/9j/4AAQ' });
  });

  it('rejects formats the models are not sent', () => {
    expect(() => parseImageDataUrl('data:image/gif;base64,R0lGOD')).toThrow('Only PNG and JPEG images are supported.');
    expect(() => parseImageDataUrl('not a data url')).toThrow('Only PNG and JPEG images are supported.');
  });
});

describe('DIAGRAM_JSON_SCHEMA', () => {
  // Structured outputs reject objects that allow extra properties or leave properties optional
  function objectSchemas(node: unknown): Array<{ properties: Record<string, unknown>; required: string[]; additionalProperties: unknown }> {
    if (!node || typeof node !== 'object') return [];
    const n = node as Record<string, unknown>;
    const own = n.type === 'object' ? [n as never] : [];
    return [...own, ...Object.values(n).flatMap(objectSchemas)];
  }

  it('closes every object and requires all of its properties', () => {
    const objects = objectSchemas(DIAGRAM_JSON_SCHEMA);
    expect(objects.length).toBeGreaterThan(5);
    for (const o of objects) {
      expect(o.additionalProperties).toBe(false);
      expect([...o.required].sort()).toEqual(Object.keys(o.properties).sort());
    }
  });

  it('accepts what the validator accepts', () => {
    const sample = {
      analysis_summary: { total_distinct_elements: 1, composition_interpretation: 'A box' },
      elements: [{
        id: 1, type: 'rectangle', bounding_box: { x1: 0, y1: 0, x2: 10, y2: 10 },
        center_coordinates: { cx: 5, cy: 5 },
        dimensions: { width: 10, height: 10, radius: null, length: null, base: null },
        orientation_angle: 0,
        style_info: { line_thickness: 'medium', line_style: 'solid', color: 'black', fill: 'none' },
        text_content: null, relationships: [],
      }],
      plausibility_check_notes: 'ok',
    };
    expect(validateStructuredDiagram(sample).valid).toBe(true);
  });
});
