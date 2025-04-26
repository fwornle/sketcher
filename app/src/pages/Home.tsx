import React from 'react';
import ImageUpload from '../components/ImageUpload';

const Home: React.FC = () => (
  <div>
    <h1>Welcome to Sketcher</h1>
    <p>Turn your whiteboard sketches into beautiful drawio diagrams.</p>
    <ImageUpload />
  </div>
);

export default Home; 