import { createAsyncThunk, createSelector, createSlice } from '@reduxjs/toolkit';
import type { RootState } from '@/store';
import type { Shape, ShapeRelationship } from '@/services/shapeModels';
import { getVlmAdapter, type VLMServiceResponse } from '@/services/vlmService';
import { parseShapesFromVLMResponse } from '@/services/shapeParser';
import { encodeDrawioXml, generateDrawioXml } from '@/services/drawioConverter';
import { Logger } from '@/utils/logging';
import { getVlmProvider } from './vlmProviders';

// ---------------------------------------------------------------------------
// Model - State shape
// ---------------------------------------------------------------------------

export type SketchStatus = 'idle' | 'analyzing' | 'succeeded' | 'failed';

export interface SketchImage {
  dataUrl: string;
  fileName: string;
  width: number;
  height: number;
}

interface SketchState {
  status: SketchStatus;
  image: SketchImage | null;
  rawResponse: VLMServiceResponse | null;
  shapes: Shape[];
  relationships: ShapeRelationship[];
  compositionDescription: string | null;
  /** Non-fatal problems reported by the shape parser. */
  parseWarnings: string[];
  error: string | null;
}

const initialState: SketchState = {
  status: 'idle',
  image: null,
  rawResponse: null,
  shapes: [],
  relationships: [],
  compositionDescription: null,
  parseWarnings: [],
  error: null,
};

// ---------------------------------------------------------------------------
// Intents - Async user intentions
// ---------------------------------------------------------------------------

function readImageDimensions(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error('Failed to load image to get dimensions.'));
    img.src = dataUrl;
  });
}

interface AnalyzeResult {
  image: SketchImage;
  rawResponse: VLMServiceResponse;
  shapes: Shape[];
  relationships: ShapeRelationship[];
  compositionDescription: string;
  parseWarnings: string[];
}

/** Intent: analyze an uploaded whiteboard photo with the currently selected VLM. */
export const analyzeSketch = createAsyncThunk<
  AnalyzeResult,
  { dataUrl: string; fileName: string },
  { state: RootState; rejectValue: string }
>('sketch/analyze', async ({ dataUrl, fileName }, { getState, rejectWithValue }) => {
  try {
    const { width, height } = await readImageDimensions(dataUrl);
    const prefs = getState().preferences;
    const provider = getVlmProvider(prefs.selectedVlm);
    const apiKey = prefs[provider.apiKeyField] ?? '';

    Logger.info(Logger.Categories.VLM, `Analyzing "${fileName}" (${width}x${height}) with ${provider.label}`);
    const adapter = getVlmAdapter(provider.key, apiKey);
    const rawResponse = await adapter.analyzeImage(dataUrl, apiKey);

    const { shapes, relationships, errors, compositionDescription } = parseShapesFromVLMResponse(rawResponse);
    if (errors.length > 0) {
      Logger.warn(Logger.Categories.PARSER, 'Parsing errors:', errors);
    }
    Logger.info(Logger.Categories.PARSER, `Extracted ${shapes.length} shapes, ${relationships.length} relationships`);

    return {
      image: { dataUrl, fileName, width, height },
      rawResponse,
      shapes,
      relationships,
      compositionDescription: compositionDescription || 'No description provided.',
      parseWarnings: errors,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to analyze image.';
    Logger.error(Logger.Categories.VLM, 'Analysis failed:', err);
    return rejectWithValue(message);
  }
});

// ---------------------------------------------------------------------------
// Intent handlers - Reducers
// ---------------------------------------------------------------------------

export const sketchSlice = createSlice({
  name: 'sketch',
  initialState,
  reducers: {
    resetSketch: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(analyzeSketch.pending, (state, action) => {
        Object.assign(state, initialState);
        state.status = 'analyzing';
        // Show the preview immediately; dimensions are filled in on success.
        state.image = { dataUrl: action.meta.arg.dataUrl, fileName: action.meta.arg.fileName, width: 0, height: 0 };
      })
      .addCase(analyzeSketch.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.image = action.payload.image;
        state.rawResponse = action.payload.rawResponse;
        state.shapes = action.payload.shapes;
        state.relationships = action.payload.relationships;
        state.compositionDescription = action.payload.compositionDescription;
        state.parseWarnings = action.payload.parseWarnings;
      })
      .addCase(analyzeSketch.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload ?? action.error.message ?? 'Failed to analyze image.';
      });
  },
});

export const { resetSketch } = sketchSlice.actions;

// ---------------------------------------------------------------------------
// Selectors - Derived data
// ---------------------------------------------------------------------------

export const selectSketch = (state: RootState) => state.sketch;
export const selectSketchStatus = (state: RootState) => state.sketch.status;
export const selectSketchError = (state: RootState) => state.sketch.error;

export const selectHasDiagram = (state: RootState) =>
  state.sketch.status === 'succeeded' && !!state.sketch.image?.width;

/** Plain drawio XML (for download). */
export const selectDrawioXml = createSelector(
  [
    (state: RootState) => state.sketch.shapes,
    (state: RootState) => state.sketch.relationships,
    (state: RootState) => state.sketch.image,
    selectHasDiagram,
  ],
  (shapes, relationships, image, hasDiagram) => {
    if (!hasDiagram || !image) return null;
    return generateDrawioXml(shapes, relationships, { width: image.width, height: image.height });
  },
);

/** Encoded drawio XML (for the embed viewer). */
export const selectEncodedDrawioXml = createSelector([selectDrawioXml], (xml) =>
  xml ? encodeDrawioXml(xml) : null,
);

export default sketchSlice.reducer;
