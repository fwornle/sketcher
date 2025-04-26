import React, { useEffect, useState } from 'react';
import { Modal, Button, Tab, Nav, Form, Alert } from 'react-bootstrap';
import { Preferences } from '../services/storage';
import { usePreferences } from '../context/PreferencesContext';

interface PreferencesModalProps {
  show: boolean;
  onClose: () => void;
}

const PreferencesModal: React.FC<PreferencesModalProps> = ({ show, onClose }) => {
  const { preferences, setPreferences, refreshPreferences } = usePreferences();
  const [activeTab, setActiveTab] = useState('api');
  const [prefs, setPrefs] = useState<Preferences>({});
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState<{ [k: string]: string }>({});

  useEffect(() => {
    if (show) {
      setPrefs(preferences);
      setSuccess(false);
      setErrors({});
    }
  }, [show, preferences]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setPrefs(prev => ({ ...prev, [name]: value }));
  };

  const validate = () => {
    const errs: { [k: string]: string } = {};
    if (prefs.geminiApiKey && prefs.geminiApiKey.length < 10) {
      errs.geminiApiKey = 'Gemini API key looks too short.';
    }
    if (prefs.gemma4ApiKey && prefs.gemma4ApiKey.length < 10) {
      errs.gemma4ApiKey = 'Gemma4 API key looks too short.';
    }
    return errs;
  };

  const handleSave = () => {
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setPreferences(prefs);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 1500);
    refreshPreferences();
    onClose();
  };

  return (
    <Modal show={show} onHide={onClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>Preferences</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Tab.Container activeKey={activeTab} onSelect={k => setActiveTab(k || 'api')}>
          <Nav variant="tabs" className="mb-3">
            <Nav.Item>
              <Nav.Link eventKey="api">API Keys</Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link eventKey="prefs">Preferences</Nav.Link>
            </Nav.Item>
          </Nav>
          <Tab.Content>
            <Tab.Pane eventKey="api">
              <Form>
                <Form.Group className="mb-3">
                  <Form.Label>Gemini API Key</Form.Label>
                  <Form.Control
                    type="password"
                    placeholder="Enter Gemini API Key"
                    autoComplete="off"
                    name="geminiApiKey"
                    value={prefs.geminiApiKey || ''}
                    onChange={handleChange}
                    isInvalid={!!errors.geminiApiKey}
                  />
                  <Form.Control.Feedback type="invalid">{errors.geminiApiKey}</Form.Control.Feedback>
                  <Form.Text muted>Get your Gemini API key from the Gemini developer portal.</Form.Text>
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Gemma4 API Key</Form.Label>
                  <Form.Control
                    type="password"
                    placeholder="Enter Gemma4 API Key"
                    autoComplete="off"
                    name="gemma4ApiKey"
                    value={prefs.gemma4ApiKey || ''}
                    onChange={handleChange}
                    isInvalid={!!errors.gemma4ApiKey}
                  />
                  <Form.Control.Feedback type="invalid">{errors.gemma4ApiKey}</Form.Control.Feedback>
                  <Form.Text muted>Get your Gemma4 API key from the Gemma4 provider.</Form.Text>
                </Form.Group>
              </Form>
            </Tab.Pane>
            <Tab.Pane eventKey="prefs">
              <Form>
                <Form.Group className="mb-3">
                  <Form.Label>Theme</Form.Label>
                  <Form.Select name="theme" value={prefs.theme || 'system'} onChange={handleChange}>
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                    <option value="system">System</option>
                  </Form.Select>
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Default Export Format</Form.Label>
                  <Form.Select name="exportFormat" value={prefs.exportFormat || 'drawio'} onChange={handleChange}>
                    <option value="drawio">drawio</option>
                    <option value="svg">SVG</option>
                    <option value="png">PNG</option>
                  </Form.Select>
                </Form.Group>
              </Form>
            </Tab.Pane>
          </Tab.Content>
        </Tab.Container>
        {success && <Alert variant="success" className="mt-3">Preferences saved!</Alert>}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button variant="primary" onClick={handleSave}>Save</Button>
      </Modal.Footer>
    </Modal>
  );
};

export default PreferencesModal; 