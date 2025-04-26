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

// Helper to generate the prompt for Gemini
function buildGeminiPrompt(): string {
  return `You are an expert diagram analysis assistant. Analyze the provided whiteboard sketch image and output a structured JSON object describing all detected elements and their relationships.\n\nOutput format:\n{\n  elements: [\n    { id, type, boundingBox: {x, y, width, height}, text, style }, ...\n  ],\n  relationships: [\n    { id, type, sourceId, targetId }, ...\n  ]\n}\n\n- type: rectangle, circle, ellipse, triangle, arrow, line, text\n- boundingBox: coordinates relative to the image\n- style: color, lineStyle, fill, fontWeight\n- Only output the JSON, no extra text.`;
}

class GeminiAdapter implements VLMService {
  private apiKey: string;
  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }
  async analyzeImage(imageDataUrl: string): Promise<StructuredDiagram> {
    // Gemini Vision API endpoint (v1.5 Flash, July 2024+)
    // To use Pro, change to 'models/gemini-1.5-pro:generateContent'
    const endpoint = 'https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=' + this.apiKey;
    // Extract base64 from data URL
    const base64 = imageDataUrl.split(',')[1];
    // Build the request body
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
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Gemini API error: ${res.status} ${res.statusText} - ${errText}`);
      }
      const data = await res.json();
      // Gemini returns candidates[0].content.parts[0].text
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error('No response from Gemini.');
      // Try to extract JSON from the response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found in Gemini response.');
      const parsed = JSON.parse(jsonMatch[0]);
      // Basic validation
      if (!parsed.elements || !parsed.relationships) throw new Error('Malformed Gemini output.');
      return parsed as StructuredDiagram;
    } catch (err: unknown) {
      let message = 'Failed to analyze image with Gemini.';
      if (err instanceof Error) {
        message = err.message;
      } else if (typeof err === 'string') {
        message = err;
      }
      console.error('Gemini analyzeImage error:', err);
      throw new Error(message);
    }
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

// --- Service Factory ---
// This function would select the adapter based on user preferences/config
// For now, it's a placeholder
function getVLMService(prefs: Preferences): VLMService {
   // TODO: Add logic to choose based on prefs.selectedVLM or similar
   if (prefs.geminiApiKey) {
       return new GeminiAdapter(prefs.geminiApiKey);
   }
    // Add Claude/GPT-4V etc. logic here
    // if (prefs.claudeApiKey) {
    //   return new ClaudeAdapter(prefs.claudeApiKey);
    // }
   console.warn("No suitable VLM API key found in preferences. Using dummy service.");
   return { analyzeImage: async () => ({ elements: [], relationships: [] }) } // Dummy fallback
}

export function useVLMService(): VLMService {
    const { preferences } = usePreferences();
    // In a real app, you might memoize this based on preferences
    return getVLMService(preferences);
} 