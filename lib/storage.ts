import { Stroke } from '@/types';

const STORAGE_KEYS = {
  STROKES: 'canvas-app:strokes',
  SETTINGS: 'canvas-app:settings',
} as const;

export const storage = {
  saveStrokes(strokes: Stroke[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.STROKES, JSON.stringify(strokes));
    } catch (error) {
      console.error('Failed to save strokes to localStorage:', error);
    }
  },

  loadStrokes(): Stroke[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.STROKES);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Failed to load strokes from localStorage:', error);
      return [];
    }
  },

  clearStrokes(): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.STROKES);
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
