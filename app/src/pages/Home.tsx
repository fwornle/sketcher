import React, { useState } from 'react';
import ImageUpload from '../components/ImageUpload';
import { useVLMService, StructuredDiagram } from '../services/vlmService';

const Home: React.FC = () => {
  const vlmService = useVLMService();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [diagram, setDiagram] = useState<StructuredDiagram | null>(null);

  const handleImageSelected = async (_file: File, dataUrl: string) => {
    setError(null);
    setDiagram(null);
    setLoading(true);
    try {
      const result = await vlmService.analyzeImage(dataUrl);
      setDiagram(result);
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
      <ImageUpload onImageSelected={handleImageSelected} />
      {loading && <div className="alert alert-info mt-3">Analyzing image with Gemini...</div>}
      {error && <div className="alert alert-danger mt-3">{error}</div>}
      {diagram && (
        <div className="alert alert-success mt-3">
          <strong>Diagram extracted!</strong>
          <pre style={{ maxHeight: 300, overflow: 'auto', fontSize: 12 }}>{JSON.stringify(diagram, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};

export default Home; 