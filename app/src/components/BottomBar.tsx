import React from 'react';
import { Button, Dropdown, Container, Row, Col } from 'react-bootstrap';

const BottomBar: React.FC = () => {
  return (
    <div className="bg-light border-top fixed-bottom py-2">
      <Container fluid>
        <Row className="align-items-center">
          {/* Status Message Area (left) */}
          <Col xs={12} md={4} className="text-md-start text-center mb-2 mb-md-0">
            <span className="text-muted">Status: Ready</span>
          </Col>
          {/* Export/Share Controls (center) */}
          <Col xs={12} md={4} className="text-center mb-2 mb-md-0">
            <Dropdown>
              <Dropdown.Toggle variant="outline-secondary" size="sm" id="dropdown-export">
                <i className="bi bi-box-arrow-up" /> Export/Share
              </Dropdown.Toggle>
              <Dropdown.Menu>
                <Dropdown.Item href="#">Download .drawio</Dropdown.Item>
                <Dropdown.Item href="#">Share via Email</Dropdown.Item>
                <Dropdown.Item href="#">Copy Link</Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
          </Col>
          {/* Help Button (right) */}
          <Col xs={12} md={4} className="text-md-end text-center">
            <Button variant="outline-primary" size="sm" title="Help" aria-label="Help">
              <i className="bi bi-question-circle" /> Help
            </Button>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default BottomBar; 