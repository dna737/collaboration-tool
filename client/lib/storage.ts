import { Stroke, CanvasId } from '@/types';

const STORAGE_KEYS = {
  STROKES: 'canvas-app:strokes',
  SETTINGS: 'canvas-app:settings',
} as const;

// Helper to get storage key for a specific canvas
function getStrokesKey(canvasId?: CanvasId): string {
  if (canvasId) {
    return `${STORAGE_KEYS.STROKES}:${canvasId}`;
  }
  // Backward compatibility: default canvas
  return STORAGE_KEYS.STROKES;
}

export const storage = {
  saveStrokes(strokes: Stroke[], canvasId?: CanvasId): void {
    try {
      const key = getStrokesKey(canvasId);
      localStorage.setItem(key, JSON.stringify(strokes));
    } catch (error) {
      console.error('Failed to save strokes to localStorage:', error);
    }
  },

  loadStrokes(canvasId?: CanvasId): Stroke[] {
    try {
      const key = getStrokesKey(canvasId);
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Failed to load strokes from localStorage:', error);
      return [];
    }
  },

  clearStrokes(canvasId?: CanvasId): void {
    try {
      const key = getStrokesKey(canvasId);
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Failed to clear strokes from localStorage:', error);
    }
  },

  getStorageSize(): number {
    let totalSize = 0;
    try {
      for (const key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          totalSize += localStorage[key].length + key.length;
        }
      }
    } catch (error) {
      console.error('Failed to calculate storage size:', error);
    }
    return totalSize;
  },
};
