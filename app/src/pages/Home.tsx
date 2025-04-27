import React, { useState } from 'react';
import ImageUpload from '../components/ImageUpload';
import { useVLMService, VLMServiceResponse } from '../services/vlmService';
import { DrawioViewer } from '../components/DrawioViewer';
import { generateDrawioXml, encodeDrawioXml } from '../services/drawioConverter';
import { Shape, ShapeRelationship } from '../services/shapeModels';
import { parseShapesFromVLMResponse } from '../services/shapeParser';

interface ImageDimensions {
  width: number;
  height: number;
}

interface ParsedDiagram {
  shapes: Shape[];
  relationships: ShapeRelationship[];
}

const Home: React.FC = () => {
  const vlmService = useVLMService();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [diagramData, setDiagramData] = useState<ParsedDiagram | null>(null);
  const [showRawJson, setShowRawJson] = useState(false);
  const [imageDimensions, setImageDimensions] = useState<ImageDimensions | null>(null);
  const [compositionDescription, setCompositionDescription] = useState<string | null>(null);
  const [rawVlmResponse, setRawVlmResponse] = useState<VLMServiceResponse | null>(null);
  const [copied, setCopied] = useState(false);

  const handleImageSelected = async (_file: File, dataUrl: string) => {
    setError(null);
    setDiagramData(null);
    setShowRawJson(false);
    setImageDimensions(null);
    setCompositionDescription(null);
    setRawVlmResponse(null);
    setCopied(false);
    setLoading(true);

    const img = new Image();
    img.onload = async () => {
      const dimensions = { width: img.naturalWidth, height: img.naturalHeight };
      setImageDimensions(dimensions);
      try {
        const vlmResponse = await vlmService.analyzeImage(dataUrl);
        setRawVlmResponse(vlmResponse);

        const { shapes, relationships, errors: parsingErrors, compositionDescription: desc } = parseShapesFromVLMResponse(vlmResponse);

        if (parsingErrors.length > 0) {
          setError(`Analysis successful, but parsing failed: ${parsingErrors.join('; ')}`);
          console.error("Parsing errors:", parsingErrors);
        }

        setDiagramData({ shapes, relationships });
        setCompositionDescription(desc || 'No description provided.');

        setShowRawJson(false);
      } catch (err) {
        setError((err instanceof Error) ? err.message : 'Failed to analyze image.');
      } finally {
        setLoading(false);
        setCopied(false);
      }
    };
    img.onerror = () => {
      setError('Failed to load image to get dimensions.');
      setLoading(false);
      setCopied(false);
    };
    img.src = dataUrl;
  };

  const handleReset = () => {
    setDiagramData(null);
    setError(null);
    setShowRawJson(false);
    setImageDimensions(null);
    setCompositionDescription(null);
    setRawVlmResponse(null);
    setLoading(false);
    setCopied(false);
  };

  const copyJsonToClipboard = () => {
    if (rawVlmResponse) {
      navigator.clipboard.writeText(JSON.stringify(rawVlmResponse, null, 2))
        .then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        })
        .catch(err => {
          console.error('Failed to copy JSON: ', err);
        });
    }
  };

  return (
    <div>
      <h1>Welcome to Sketcher</h1>
      <p>Turn your whiteboard sketches into beautiful drawio diagrams.</p>
      <ImageUpload onImageSelected={handleImageSelected} onReset={handleReset} />
      {loading && <div className="alert alert-info mt-3">Analyzing image...</div>}
      {error && <div className="alert alert-danger mt-3">{error}</div>}
      {compositionDescription && !loading && (
        <div className="alert alert-secondary mt-3">
          <strong>Composition:</strong> {compositionDescription}
          {rawVlmResponse?.vlmProvider && <small className="text-muted ms-2">(Provider: {rawVlmResponse.vlmProvider})</small>}
        </div>
      )}
      {diagramData && (
        <div className="alert alert-success mt-3">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <strong>Diagram extracted!</strong>
            <div>
              <button
                className="btn btn-sm btn-outline-secondary ms-2"
                onClick={() => setShowRawJson(v => !v)}
                aria-expanded={showRawJson}
                aria-controls="extracted-json-box"
              >
                {showRawJson ? 'Hide' : 'Show'} Raw JSON
              </button>
              <button
                className={`btn btn-sm ${copied ? 'btn-success' : 'btn-outline-secondary'} ms-2`}
                onClick={copyJsonToClipboard}
                disabled={!rawVlmResponse}
              >
                {copied ? 'Copied!' : '📋'}
              </button>
            </div>
          </div>
          {showRawJson && rawVlmResponse && (
            <pre id="extracted-json-box" style={{ maxHeight: 300, overflow: 'auto', fontSize: 12, marginTop: 8 }}>{JSON.stringify(rawVlmResponse, null, 2)}</pre>
          )}
        </div>
      )}
      {diagramData && imageDimensions && (
        <>
          <h3 className="mt-4">Diagram Preview</h3>
          {(() => {
            console.log('Shapes sent to Drawio:', diagramData.shapes);
            const rawXml = generateDrawioXml(diagramData.shapes, diagramData.relationships, imageDimensions);
            console.log('Raw Drawio XML sent to Drawio:', rawXml);
            return (
              <DrawioViewer
                xml={encodeDrawioXml(rawXml)}
                style={{ height: 600, marginTop: 24 }}
              />
            );
          })()}
          {/* TODO: Add export/share controls here */}
        </>
      )}
    </div>
  );
};

export default Home; 