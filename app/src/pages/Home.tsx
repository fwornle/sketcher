import React, { useState, useEffect } from 'react';
import ImageUpload from '../components/ImageUpload';
import { VLMServiceResponse, VLMService, getVlmAdapter } from '../services/vlmService';
import { DrawioViewer } from '../components/DrawioViewer';
import { generateDrawioXml, encodeDrawioXml } from '../services/drawioConverter';
import { Shape, ShapeRelationship } from '../services/shapeModels';
import { parseShapesFromVLMResponse } from '../services/shapeParser';
import Modal from 'react-bootstrap/Modal';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';

interface ImageDimensions {
  width: number;
  height: number;
}

interface ParsedDiagram {
  shapes: Shape[];
  relationships: ShapeRelationship[];
}

const VLM_LIST = [
  { key: 'gpt4o', label: 'OpenAI GPT-4o / GPT-4V(ision)' },
  { key: 'gemini', label: 'Google Gemini Pro Vision' },
  { key: 'claude', label: 'Anthropic Claude 3.5/Opus' },
  { key: 'qwen', label: 'Qwen2.5-VL' },
  { key: 'florence', label: 'Florence-2' },
  { key: 'cogvlm', label: 'CogVLM (Ollama)' },
  { key: 'llava', label: 'LLaVA' },
];

const getStoredVLM = () => localStorage.getItem('selectedVLM') || 'gemini';
const getStoredApiKeys = () => {
  try {
    return JSON.parse(localStorage.getItem('vlmApiKeys') || '{}');
  } catch {
    return {};
  }
};

const Home: React.FC = () => {
  // Get a *factory* or *instance selector* instead of a single instance
  // const vlmServiceFactory = useVLMServiceFactory(); // Assuming a factory hook
  // For now, we will manually select the adapter
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [diagramData, setDiagramData] = useState<ParsedDiagram | null>(null);
  const [showRawJson, setShowRawJson] = useState(false);
  const [imageDimensions, setImageDimensions] = useState<ImageDimensions | null>(null);
  const [compositionDescription, setCompositionDescription] = useState<string | null>(null);
  const [rawVlmResponse, setRawVlmResponse] = useState<VLMServiceResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const [selectedVLM, setSelectedVLM] = useState<string>(getStoredVLM());
  const [apiKeys, setApiKeys] = useState<{ [key: string]: string }>(getStoredApiKeys());
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('selectedVLM', selectedVLM);
  }, [selectedVLM]);
  useEffect(() => {
    localStorage.setItem('vlmApiKeys', JSON.stringify(apiKeys));
  }, [apiKeys]);

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
        // Manually select adapter based on state (replace with factory/hook later)
        const currentApiKey = apiKeys[selectedVLM];
        const activeVlmService: VLMService = getVlmAdapter(selectedVLM); // Use the placeholder factory

        const vlmResponse = await activeVlmService.analyzeImage(dataUrl, selectedVLM, currentApiKey);
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

  const renderSettingsModal = () => {
    const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      console.log('Saving API Keys:', apiKeys);
      setSettingsOpen(false); // Close modal on save
    };

    return (
      <Modal show={settingsOpen} onHide={() => setSettingsOpen(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>VLM API Keys</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form id="api-key-form" onSubmit={handleSave}>
            {VLM_LIST.map(vlm => (
              <Form.Group className="mb-3" controlId={`apiKey-${vlm.key}`} key={vlm.key}>
                <Form.Label>{vlm.label}</Form.Label>
                <Form.Control
                  type="text"
                  value={apiKeys[vlm.key] || ''}
                  onChange={e => setApiKeys(keys => ({ ...keys, [vlm.key]: e.target.value }))}
                  placeholder={`API Key for ${vlm.label}`}
                  autoComplete="off"
                />
              </Form.Group>
            ))}
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setSettingsOpen(false)}>
            Cancel
          </Button>
          {/* Trigger form submission */}
          <Button variant="primary" type="submit" form="api-key-form">
            Save
          </Button>
        </Modal.Footer>
      </Modal>
    );
  };

  return (
    <div>
      {/* VLM selection and settings */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <label className="me-2">VLM:</label>
          <select
            value={selectedVLM}
            onChange={e => setSelectedVLM(e.target.value)}
            className="form-select d-inline-block"
            style={{ width: 280, display: 'inline-block' }}
          >
            {VLM_LIST.map(vlm => (
              <option key={vlm.key} value={vlm.key}>{vlm.label}</option>
            ))}
          </select>
        </div>
        <button className="btn btn-outline-secondary btn-sm" onClick={() => {
          console.log('Settings button clicked, setting settingsOpen to true');
          setSettingsOpen(true);
        }}>
          Settings
        </button>
      </div>
      {settingsOpen && renderSettingsModal()}
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