import { Stroke, CanvasId } from '@/types';
import { getDB, getCanvasKey, isIndexedDBAvailable } from './db';

/**
 * Storage utility for persisting canvas strokes using IndexedDB.
 * All methods are async due to IndexedDB's asynchronous nature.
 */
export const storage = {
  /**
   * Save strokes to IndexedDB for a specific canvas.
   */
  async saveStrokes(strokes: Stroke[], canvasId?: CanvasId): Promise<void> {
    if (!isIndexedDBAvailable()) {
      console.warn('IndexedDB not available, strokes will not be persisted');
      return;
    }

    try {
      const db = await getDB();
      const key = getCanvasKey(canvasId);
      
      await db.put('strokes', {
        canvasId: key,
        strokes,
        updatedAt: Date.now(),
      });
    } catch (error) {
      console.error('Failed to save strokes to IndexedDB:', error);
    }
  },

  /**
   * Load strokes from IndexedDB for a specific canvas.
   */
  async loadStrokes(canvasId?: CanvasId): Promise<Stroke[]> {
    if (!isIndexedDBAvailable()) {
      console.warn('IndexedDB not available, returning empty strokes');
      return [];
    }

    try {
      const db = await getDB();
      const key = getCanvasKey(canvasId);
      
      const record = await db.get('strokes', key);
      return record?.strokes ?? [];
    } catch (error) {
      console.error('Failed to load strokes from IndexedDB:', error);
      return [];
    }
  },

  /**
   * Clear strokes from IndexedDB for a specific canvas.
   */
  async clearStrokes(canvasId?: CanvasId): Promise<void> {
    if (!isIndexedDBAvailable()) {
      console.warn('IndexedDB not available, nothing to clear');
      return;
    }

    try {
      const db = await getDB();
      const key = getCanvasKey(canvasId);
      
      await db.delete('strokes', key);
    } catch (error) {
      console.error('Failed to clear strokes from IndexedDB:', error);
    }
  },

  /**
   * Get an estimate of storage usage.
   * Note: This uses the Storage API estimate which may not be exact.
   */
  async getStorageEstimate(): Promise<{ usage: number; quota: number } | null> {
    try {
      if (navigator.storage && navigator.storage.estimate) {
        const estimate = await navigator.storage.estimate();
        return {
          usage: estimate.usage ?? 0,
          quota: estimate.quota ?? 0,
        };
      }
      return null;
    } catch (error) {
      console.error('Failed to get storage estimate:', error);
      return null;
    }
  },
};
