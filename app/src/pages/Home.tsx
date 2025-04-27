import React, { useState } from 'react';
import ImageUpload from '../components/ImageUpload';
import { useVLMService, StructuredDiagram } from '../services/vlmService';
import { DrawioViewer } from '../components/DrawioViewer';
import { generateDrawioXml } from '../services/drawioConverter';

const Home: React.FC = () => {
  const vlmService = useVLMService();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [diagram, setDiagram] = useState<StructuredDiagram | null>(null);
  const [showExtracted, setShowExtracted] = useState(false);

  const handleImageSelected = async (_file: File, dataUrl: string) => {
    setError(null);
    setDiagram(null);
    setShowExtracted(false);
    setLoading(true);
    try {
      const result = await vlmService.analyzeImage(dataUrl);
      setDiagram(result);
      setShowExtracted(false);
    } catch (err) {
      setError((err instanceof Error) ? err.message : 'Failed to analyze image.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1>Welcome to Sketcher</h1>
      <p>Turn your whiteboard sketches into beautiful drawio diagrams.</p>
      <ImageUpload onImageSelected={handleImageSelected} onReset={() => { setDiagram(null); setError(null); }} />
      {loading && <div className="alert alert-info mt-3">Analyzing image with Gemini...</div>}
      {error && <div className="alert alert-danger mt-3">{error}</div>}
      {diagram && (
        <div className="alert alert-success mt-3">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <strong>Diagram extracted!</strong>
            <button
              className="btn btn-sm btn-outline-secondary ms-2"
              onClick={() => setShowExtracted(v => !v)}
              aria-expanded={showExtracted}
              aria-controls="extracted-json-box"
            >
              {showExtracted ? 'Hide' : 'Show'}
            </button>
          </div>
          {showExtracted && (
            <pre id="extracted-json-box" style={{ maxHeight: 300, overflow: 'auto', fontSize: 12, marginTop: 8 }}>{JSON.stringify(diagram, null, 2)}</pre>
          )}
        </div>
      )}
      {diagram && (
        <>
          <h3 className="mt-4">Diagram Preview</h3>
          <DrawioViewer
            xml={generateDrawioXml(diagram.elements, diagram.relationships)}
            style={{ height: 600, marginTop: 24 }}
          />
          {/* TODO: Add export/share controls here */}
        </>
      )}
    </div>
  );
};

export default Home; 