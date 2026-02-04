import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { CanvasObject, Stroke } from '@/types';

const DB_NAME = 'canvas-app-db';
const DB_VERSION = 2;
const DEFAULT_CANVAS_KEY = '__default__';

export interface CanvasRecord {
  canvasId: string;
  objects: CanvasObject[];
  updatedAt: number;
}

export interface AssetRecord {
  id: string; // `${canvasId}:${assetId}`
  canvasId: string;
  assetId: string;
  mime: string;
  bytes: ArrayBuffer;
  updatedAt: number;
}

/**
 * IndexedDB schema for the canvas application.
 */
export interface CanvasAppDB extends DBSchema {
  // Legacy store (DB v1)
  strokes: {
    key: string; // canvasId
    value: {
      canvasId: string;
      strokes: Stroke[];
      updatedAt: number;
    };
  };
  // New store (DB v2)
  canvases: {
    key: string; // canvasId
    value: CanvasRecord;
  };
  assets: {
    key: string; // `${canvasId}:${assetId}`
    value: AssetRecord;
  };
}

let dbPromise: Promise<IDBPDatabase<CanvasAppDB>> | null = null;

/**
 * Initialize and return the IndexedDB database instance.
 * Uses a singleton pattern to avoid multiple connections.
 */
export function getDB(): Promise<IDBPDatabase<CanvasAppDB>> {
  if (!dbPromise) {
    dbPromise = openDB<CanvasAppDB>(DB_NAME, DB_VERSION, {
      async upgrade(db, oldVersion, _newVersion, transaction) {
        // Legacy store (for existing users)
        if (!db.objectStoreNames.contains('strokes')) {
          db.createObjectStore('strokes', { keyPath: 'canvasId' });
        }

        // New stores
        if (!db.objectStoreNames.contains('canvases')) {
          db.createObjectStore('canvases', { keyPath: 'canvasId' });
        }
        if (!db.objectStoreNames.contains('assets')) {
          const assetsStore = db.createObjectStore('assets', { keyPath: 'id' });
          assetsStore.createIndex('byCanvasId', 'canvasId');
        } else {
          // Ensure the index exists (in case of partial upgrades)
          const assetsStore = transaction.objectStore('assets');
          if (!assetsStore.indexNames.contains('byCanvasId')) {
            assetsStore.createIndex('byCanvasId', 'canvasId');
          }
        }

        // Migrate legacy strokes -> canvases.objects (only once)
        if (oldVersion < 2) {
          try {
            const legacyStore = transaction.objectStore('strokes');
            const legacyRecords = await legacyStore.getAll();
            const canvasesStore = transaction.objectStore('canvases');

            for (const record of legacyRecords) {
              const objects: CanvasObject[] = (record.strokes || []).map((s) => ({
                ...s,
                type: 'stroke' as const,
              }));

              await canvasesStore.put({
                canvasId: record.canvasId,
                objects,
                updatedAt: record.updatedAt || Date.now(),
              });
            }
          } catch (e) {
            console.warn('IndexedDB migration (strokes -> canvases) failed:', e);
          }
        }
      },
      blocked() {
        console.warn('IndexedDB blocked: another connection is open');
      },
      blocking() {
        console.warn('IndexedDB blocking: this connection is blocking another');
      },
      terminated() {
        console.error('IndexedDB connection terminated unexpectedly');
        dbPromise = null; // Reset so next call will reconnect
      },
    });
  }
  return dbPromise;
}

/**
 * Get the storage key for a canvas.
 * Uses a default key for the main/unnamed canvas.
 */
export function getCanvasKey(canvasId?: string): string {
  return canvasId || DEFAULT_CANVAS_KEY;
}

/**
 * Check if IndexedDB is available in the current environment.
 */
export function isIndexedDBAvailable(): boolean {
  try {
    return typeof indexedDB !== 'undefined' && indexedDB !== null;
  } catch {
    return false;
  }
}
