export interface Point {
  x: number;
  y: number;
}

/**
 * A committed stroke on the canvas.
 */
export interface StrokeObject {
  id: string;
  type: 'stroke';
  tool: 'brush' | 'eraser';
  color: string;
  size: number;
  points: Point[];
}

/**
 * A pasted image placed on the canvas.
 * The binary bytes are stored separately (IndexedDB + server asset map).
 */
export interface ImageObject {
  id: string;
  type: 'image';
  assetId: string;
  mime: string;
  x: number;
  y: number;
  width: number;
  height: number;
  createdAt: number;
}

export type CanvasObject = StrokeObject | ImageObject;

// Backwards-compatible alias (many files use Stroke today)
export type Stroke = StrokeObject;

export type Tool = 'brush' | 'eraser';

export interface CanvasSettings {
  activeTool: Tool;
  brushSize: number;
  brushColor: string;
}

export type CanvasId = string;

export interface CanvasStateMessage {
  canvasId: string;
  objects: CanvasObject[];
}

export interface ObjectAddedMessage {
  canvasId: string;
  object: CanvasObject;
  timestamp?: number;
}

export interface ObjectRemovedMessage {
  canvasId: string;
  objectIds: string[];
  timestamp?: number;
}

export interface CanvasClearedMessage {
  canvasId: string;
  timestamp?: number;
}

export interface UserPresence {
  nodeId: string;
  userName: string;
  position: { x: number; y: number };
  isDrawing: boolean;
  activeTool?: Tool;
  timestamp: number;
}

export interface CursorUpdateMessage {
  canvasId: string;
  user: UserPresence;
}

export interface StrokeProgressMessage {
  canvasId: string;
  nodeId: string; // Socket ID of the user drawing
  nodeIdStrokeId: string; // Temporary ID for this in-progress stroke
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
  objectIds: string[];
  timestamp: number;
}

// Binary asset transfer (chunked)
export interface AssetUploadStartMessage {
  canvasId: string;
  assetId: string;
  mime: string;
  totalBytes: number;
  chunkSize: number;
  timestamp?: number;
}

export interface AssetUploadChunkMessage {
  canvasId: string;
  assetId: string;
  seq: number;
  bytes: ArrayBuffer;
}

export interface AssetUploadCompleteMessage {
  canvasId: string;
  assetId: string;
  timestamp?: number;
}

export interface AssetAvailableMessage {
  canvasId: string;
  assetId: string;
}

export interface AssetRequestMessage {
  canvasId: string;
  assetId: string;
}

export interface AssetChunkMessage {
  canvasId: string;
  assetId: string;
  seq: number;
  bytes: ArrayBuffer;
}

export interface AssetCompleteMessage {
  canvasId: string;
  assetId: string;
  totalBytes: number;
}
