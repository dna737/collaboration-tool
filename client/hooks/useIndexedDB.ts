import { useState, useEffect, useCallback, useRef } from 'react';
import { openDB, IDBPDatabase, DBSchema } from 'idb';

const DB_NAME = 'canvas-app-settings-db';
const DB_VERSION = 1;
const STORE_NAME = 'keyvalue';

/**
 * Schema for the generic key-value store used by useIndexedDB hook.
 */
interface KeyValueDB extends DBSchema {
  keyvalue: {
    key: string;
    value: {
      key: string;
      data: unknown;
      updatedAt: number;
    };
  };
}

let dbPromise: Promise<IDBPDatabase<KeyValueDB>> | null = null;

function getSettingsDB(): Promise<IDBPDatabase<KeyValueDB>> {
  if (!dbPromise) {
    dbPromise = openDB<KeyValueDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'key' });
        }
      },
      terminated() {
        dbPromise = null;
      },
    });
  }
  return dbPromise;
}

/**
 * A React hook for persisting state in IndexedDB.
 * Similar to useState but with async persistence.
 * 
 * @param key - The unique key to store the value under
 * @param initialValue - The initial value to use if no stored value exists
 * @returns A tuple of [value, setValue, isLoading, error]
 */
export function useIndexedDB<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((val: T) => T)) => void, boolean, Error | null] {
  const [storedValue, setStoredValue] = useState<T>(initialValue);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const currentValueRef = useRef<T>(initialValue);

  // Load value from IndexedDB on mount
  useEffect(() => {
    let isMounted = true;

    const loadValue = async () => {
      try {
        const db = await getSettingsDB();
        const record = await db.get(STORE_NAME, key);
        
        if (isMounted) {
          if (record) {
            const loadedValue = record.data as T;
            setStoredValue(loadedValue);
            currentValueRef.current = loadedValue;
          }
          setIsLoading(false);
        }
      } catch (err) {
        console.error(`Error loading ${key} from IndexedDB:`, err);
        if (isMounted) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setIsLoading(false);
        }
      }
    };

    loadValue();

    return () => {
      isMounted = false;
    };
  }, [key]);

  // Memoized setter that persists to IndexedDB
  const setValue = useCallback(
    (value: T | ((val: T) => T)) => {
      try {
        // Get the new value (handle function updates)
        const valueToStore = value instanceof Function 
          ? value(currentValueRef.current) 
          : value;
        
        // Update state immediately for responsive UI
        setStoredValue(valueToStore);
        currentValueRef.current = valueToStore;

        // Persist to IndexedDB asynchronously
        (async () => {
          try {
            const db = await getSettingsDB();
            await db.put(STORE_NAME, {
              key,
              data: valueToStore,
              updatedAt: Date.now(),
            });
          } catch (err) {
            console.error(`Error saving ${key} to IndexedDB:`, err);
            setError(err instanceof Error ? err : new Error(String(err)));
          }
        })();
      } catch (err) {
        console.error(`Error setting value for ${key}:`, err);
        setError(err instanceof Error ? err : new Error(String(err)));
      }
    },
    [key]
  );

  return [storedValue, setValue, isLoading, error];
}
