export interface Point {
  x: number;
  y: number;
}

/**
 * Represents a canvas object (stroke) - a collection of points
 * captured from mouseDown to mouseUp, forming a single drawable object.
 */
export interface Stroke {
  id: string;
  tool: 'brush' | 'eraser';
  color: string;
  size: number;
  points: Point[]; // Collection of points that form this object
}

export type Tool = 'brush' | 'eraser';

export interface CanvasSettings {
  activeTool: Tool;
  brushSize: number;
  brushColor: string;
}
