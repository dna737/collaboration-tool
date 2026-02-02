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

export type CanvasId = string;

export interface CollaborationMessage {
  type: 'stroke-added' | 'stroke-removed' | 'canvas-cleared';
  canvasId: string;
  stroke?: Stroke;
  strokeIds?: string[];
  timestamp?: number;
}

export interface CanvasStateMessage {
  canvasId: string;
  strokes: Stroke[];
}

export interface UserPresence {
  nodeId: string;
  userName: string;
  position: { x: number; y: number };
  isDrawing: boolean;
  timestamp: number;
}

export interface CursorUpdateMessage {
  canvasId: string;
  user: UserPresence;
}

export interface StrokeProgressMessage {
  canvasId: string;
  nodeId: string;              // Socket ID of the user drawing
  nodeIdStrokeId: string;      // Temporary ID for this in-progress stroke
  stroke: {
    tool: 'brush' | 'eraser';
    color: string;
    size: number;
    points: Point[];
  };
  timestamp: number;
}

export interface InProgressStroke {
  nodeId: string;
  nodeIdStrokeId: string;
  tool: 'brush' | 'eraser';
  color: string;
  size: number;
  points: Point[];
  timestamp: number;
}

export interface EraserPreviewMessage {
  canvasId: string;
  nodeId: string;
  strokeIds: string[];
  timestamp: number;
}
