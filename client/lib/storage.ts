import { CanvasObject, CanvasId, StrokeObject } from '@/types';
import { getDB, getCanvasKey, isIndexedDBAvailable } from './db';

function makeAssetKey(canvasKey: string, assetId: string): string {
  return `${canvasKey}:${assetId}`;
}

/**
 * Storage utility for persisting canvas objects + binary assets using IndexedDB.
 */
export const storage = {
  async saveObjects(objects: CanvasObject[], canvasId?: CanvasId): Promise<void> {
    if (!isIndexedDBAvailable()) {
      console.warn('IndexedDB not available, canvas will not be persisted');
      return;
    }

    try {
      const db = await getDB();
      const key = getCanvasKey(canvasId);

      await db.put('canvases', {
        canvasId: key,
        objects,
        updatedAt: Date.now(),
      });
    } catch (error) {
      console.error('Failed to save canvas to IndexedDB:', error);
    }
  },

  async loadObjects(canvasId?: CanvasId): Promise<CanvasObject[]> {
    if (!isIndexedDBAvailable()) {
      console.warn('IndexedDB not available, returning empty canvas');
      return [];
    }

    try {
      const db = await getDB();
      const key = getCanvasKey(canvasId);

      const record = await db.get('canvases', key);
      if (record?.objects) return record.objects;

      // Fallback for any users that still only have legacy strokes record
      const legacy = await db.get('strokes', key);
      const legacyObjects: StrokeObject[] = (legacy?.strokes || []).map((s) => ({
        ...s,
        type: 'stroke' as const,
      }));
      return legacyObjects;
    } catch (error) {
      console.error('Failed to load canvas from IndexedDB:', error);
      return [];
    }
  },

  async clearCanvas(canvasId?: CanvasId): Promise<void> {
    if (!isIndexedDBAvailable()) {
      console.warn('IndexedDB not available, nothing to clear');
      return;
    }

    try {
      const db = await getDB();
      const key = getCanvasKey(canvasId);

      // Delete canvas metadata
      await db.delete('canvases', key);

      // Delete assets for this canvas
      const tx = db.transaction('assets', 'readwrite');
      const index = tx.store.index('byCanvasId');
      let cursor = await index.openCursor(key);
      while (cursor) {
        await cursor.delete();
        cursor = await cursor.continue();
      }
      await tx.done;

      // Also clear legacy store (kept for migration/back-compat)
      await db.delete('strokes', key);
    } catch (error) {
      console.error('Failed to clear canvas from IndexedDB:', error);
    }
  },

  async saveAsset(params: { canvasId?: CanvasId; assetId: string; mime: string; bytes: ArrayBuffer }): Promise<void> {
    if (!isIndexedDBAvailable()) {
      console.warn('IndexedDB not available, assets will not be persisted');
      return;
    }

    try {
      const db = await getDB();
      const canvasKey = getCanvasKey(params.canvasId);
      const id = makeAssetKey(canvasKey, params.assetId);

      await db.put('assets', {
        id,
        canvasId: canvasKey,
        assetId: params.assetId,
        mime: params.mime,
        bytes: params.bytes,
        updatedAt: Date.now(),
      });
    } catch (error) {
      console.error('Failed to save asset to IndexedDB:', error);
    }
  },

  async loadAsset(params: { canvasId?: CanvasId; assetId: string }): Promise<{ mime: string; bytes: ArrayBuffer } | null> {
    if (!isIndexedDBAvailable()) {
      return null;
    }

    try {
      const db = await getDB();
      const canvasKey = getCanvasKey(params.canvasId);
      const id = makeAssetKey(canvasKey, params.assetId);

      const record = await db.get('assets', id);
      if (!record) return null;
      return { mime: record.mime, bytes: record.bytes };
    } catch (error) {
      console.error('Failed to load asset from IndexedDB:', error);
      return null;
    }
  },

  async deleteAsset(params: { canvasId?: CanvasId; assetId: string }): Promise<void> {
    if (!isIndexedDBAvailable()) {
      return;
    }

    try {
      const db = await getDB();
      const canvasKey = getCanvasKey(params.canvasId);
      const id = makeAssetKey(canvasKey, params.assetId);
      await db.delete('assets', id);
    } catch (error) {
      console.error('Failed to delete asset from IndexedDB:', error);
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
