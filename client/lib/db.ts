import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Stroke } from '@/types';

const DB_NAME = 'canvas-app-db';
const DB_VERSION = 1;
const DEFAULT_CANVAS_KEY = '__default__';

/**
 * IndexedDB schema for the canvas application.
 * Stores strokes grouped by canvas ID.
 */
export interface CanvasAppDB extends DBSchema {
  strokes: {
    key: string; // canvasId
    value: {
      canvasId: string;
      strokes: Stroke[];
      updatedAt: number;
    };
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
      upgrade(db) {
        // Create the strokes object store if it doesn't exist
        if (!db.objectStoreNames.contains('strokes')) {
          db.createObjectStore('strokes', { keyPath: 'canvasId' });
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
