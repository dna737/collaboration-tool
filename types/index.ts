export interface Point {
  x: number;
  y: number;
}

export interface Stroke {
  id: string;
  tool: 'brush' | 'eraser';
  color: string;
  size: number;
  points: Point[];
}

export type Tool = 'brush' | 'eraser';

export interface CanvasSettings {
  activeTool: Tool;
  brushSize: number;
  brushColor: string;
}
