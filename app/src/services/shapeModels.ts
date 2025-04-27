/**
 * Shape data models for diagram extraction
 * Task 7.1: Define Shape Data Models
 */

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Style {
  color?: string;
  lineStyle?: 'solid' | 'dashed' | 'dotted';
  fill?: string;
  fontWeight?: 'normal' | 'bold';
  opacity?: number;
  // ... other style attributes
}

/**
 * Base interface for all shapes
 */
export interface Shape {
  id: string;
  type: ShapeType;
  boundingBox: BoundingBox;
  style?: Style;
  parentId?: string; // Optional parent for grouping
  zIndex?: number;   // Optional z-order
  orientation?: 'north' | 'south' | 'east' | 'west'; // Optional orientation
}

export type ShapeType =
  | 'rectangle'
  | 'circle'
  | 'ellipse'
  | 'triangle'
  | 'arrow'
  | 'line'
  | 'text';

export interface Rectangle extends Shape {
  type: 'rectangle';
  text?: string;
}

export interface Circle extends Shape {
  type: 'circle';
  text?: string;
}

export interface Ellipse extends Shape {
  type: 'ellipse';
  text?: string;
}

export interface Triangle extends Shape {
  type: 'triangle';
  text?: string;
}

export interface Arrow extends Shape {
  type: 'arrow';
  // Optionally, add direction or points
}

export interface Line extends Shape {
  type: 'line';
}

export interface TextShape extends Shape {
  type: 'text';
  text: string;
}

/**
 * Relationship between shapes (spatial or logical)
 */
export type RelationshipType =
  | 'connects'
  | 'contains'
  | 'above'
  | 'below'
  | 'left-of'
  | 'right-of'
  | 'overlaps';

export interface ShapeRelationship {
  id: string;
  type: RelationshipType;
  sourceId: string;
  targetId: string;
  waypoints?: { x: number; y: number }[]; // Optional edge routing
  // TODO: Add support for connection constraints (e.g., connect to specific side)
  // TODO: Add style for advanced edge formatting
}

// TODO: Extend Style for gradients, shadows, advanced text formatting 