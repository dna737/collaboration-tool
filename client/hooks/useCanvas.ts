import { useRef, useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { CanvasObject, StrokeObject, ImageObject, Point, Tool, CanvasId, UserPresence, InProgressStroke } from '@/types';
import {
  renderAllObjects,
  getCanvasPoint,
  findObjectsToErase,
  getSelectionBoundingBox,
  getObjectsFullyInRect,
  pointInRect,
  drawSelectionBox,
  drawMarqueeRect,
  translateStroke,
} from '@/lib/canvas-utils';
import { storage } from '@/lib/storage';
import { useCollaboration } from '@/hooks/useCollaboration';

interface UseCanvasProps {
  canvasId?: CanvasId;
  userName: string;
  activeTool: Tool;
  brushSize: number;
  brushColor: string;
  onCursorUpdate?: (user: UserPresence) => void;
  onCursorStop?: (nodeId: string) => void;
}

type LocalAction =
  | { type: 'add'; object: CanvasObject }
  | { type: 'remove'; objects: CanvasObject[] };

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function decodeImageBytes(mime: string, bytes: ArrayBuffer): Promise<CanvasImageSource> {
  const blob = new Blob([bytes], { type: mime });
  if (typeof createImageBitmap !== 'undefined') {
    return await createImageBitmap(blob);
  }

  // Fallback for environments without createImageBitmap
  return await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to decode image'));
    };
    img.src = url;
  });
}

function concatArrayBuffers(chunks: ArrayBuffer[]): ArrayBuffer {
  const total = chunks.reduce((sum, c) => sum + c.byteLength, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(new Uint8Array(chunk), offset);
    offset += chunk.byteLength;
  }
  return out.buffer;
};

async function blobToArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  return await blob.arrayBuffer();
}

async function downscaleImageBlob(params: {
  blob: Blob;
  maxWidth: number;
  maxHeight: number;
  maxPixels: number;
}): Promise<{ blob: Blob; width: number; height: number; mime: string }> {
  // Decode
  const bitmap = await createImageBitmap(params.blob);
  try {
    const origW = bitmap.width;
    const origH = bitmap.height;

    const scaleToFit = Math.min(params.maxWidth / origW, params.maxHeight / origH, 1);
    const scaleToPixels = Math.min(1, Math.sqrt(params.maxPixels / (origW * origH)));
    const scale = Math.min(scaleToFit, scaleToPixels);

    const width = Math.max(1, Math.round(origW * scale));
    const height = Math.max(1, Math.round(origH * scale));

    if (scale >= 1) {
      return { blob: params.blob, width: origW, height: origH, mime: params.blob.type || 'image/png' };
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return { blob: params.blob, width: origW, height: origH, mime: params.blob.type || 'image/png' };
    }

    ctx.drawImage(bitmap, 0, 0, width, height);

    const outBlob: Blob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        (b) => {
          if (b) resolve(b);
          else reject(new Error('Failed to downscale image'));
        },
        'image/png',
        0.92
      );
    });

    return { blob: outBlob, width, height, mime: 'image/png' };
  } finally {
    if (typeof bitmap.close === 'function') bitmap.close();
  }
}

export function useCanvas({ canvasId, userName, activeTool, brushSize, brushColor, onCursorUpdate, onCursorStop }: UseCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [objects, setObjects] = useState<CanvasObject[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const currentPointsRef = useRef<Point[]>([]); // Ref to track latest points for eraser
  const currentStrokeIdRef = useRef<string | null>(null); // Track current stroke ID for streaming
  const [inProgressStrokes, setInProgressStrokes] = useState<Map<string, InProgressStroke>>(new Map());
  const [objectsToErasePreview, setObjectsToErasePreview] = useState<Set<string>>(new Set());
  const [remoteEraserPreviews, setRemoteEraserPreviews] = useState<Map<string, Set<string>>>(new Map()); // nodeId -> objectIds
  const objectsToEraseRef = useRef<string[]>([]); // Store IDs to erase for use in mouseUp
  const isUndoingRef = useRef(false); // Flag to prevent adding to history during undo
  const hasLoadedFromStorageRef = useRef(false); // Track if initial load from IndexedDB has happened
  const objectsRef = useRef<CanvasObject[]>([]); // Ref to track latest objects for undo sync
  const localActionHistoryRef = useRef<LocalAction[]>([]); // Stack of local actions for per-user undo

  const lastPointerPositionRef = useRef<Point | null>(null);
  const lastObjectUpdateRef = useRef<number>(0);

  // Selection (Excalidraw-style): marquee select + drag from selection box
  const [selectedObjectIds, setSelectedObjectIds] = useState<string[]>([]);
  const [selectionRect, setSelectionRect] = useState<{ start: Point; end: Point } | null>(null);
  const [isDraggingSelection, setIsDraggingSelection] = useState(false);
  const dragSelectionRef = useRef<{ lastPoint: Point } | null>(null);

  // Asset cache for rendering
  const [imageCache, setImageCache] = useState<Map<string, CanvasImageSource>>(new Map());
  const requestedAssetsRef = useRef<Set<string>>(new Set());
  const incomingAssetChunksRef = useRef<Map<string, Map<number, ArrayBuffer>>>(new Map());
  const assetUploadQueueRef = useRef<Promise<void>>(Promise.resolve());

  // Collaboration hook
  const {
    isConnected,
    error,
    isInitializing,
    sendObjectAdded,
    sendObjectRemoved,
    sendObjectUpdated,
    sendCanvasCleared,
    sendCursorUpdate,
    sendCursorStop,
    sendStrokeProgress,
    sendStrokeProgressEnd,
    sendEraserPreview,
    sendEraserPreviewEnd,
    sendAssetUploadStart,
    sendAssetUploadChunk,
    sendAssetUploadComplete,
    sendAssetRequest,
  } = useCollaboration({
    canvasId: canvasId || '',
    userName,
    onCursorUpdate,
    onCursorStop,
    onObjectAdded: (object: CanvasObject) => {
      if (object.type === 'stroke') {
        // Remove an in-progress stroke from this user since it's now committed
        setInProgressStrokes((prev) => {
          const newMap = new Map(prev);
          prev.forEach((inProgress, nodeId) => {
            if (inProgress.points.length > 0 && object.points.length > 0) {
              const firstPointMatch =
                inProgress.points[0].x === object.points[0].x &&
                inProgress.points[0].y === object.points[0].y;
              if (firstPointMatch) {
                newMap.delete(nodeId);
              }
            }
          });
          return newMap;
        });
      }

      setObjects((prev) => {
        if (prev.find((o) => o.id === object.id)) return prev;
        return [...prev, object];
      });
    },
    onObjectUpdated: (object: CanvasObject) => {
      setObjects((prev) => prev.map((o) => (o.id === object.id ? object : o)));
    },
    onObjectRemoved: (objectIds: string[]) => {
      setObjects((prev) => prev.filter((o) => !objectIds.includes(o.id)));
    },
    onCanvasCleared: () => {
      setObjects([]);
      setImageCache(new Map());
      // Fire and forget - errors are logged in the storage module
      storage.clearCanvas(canvasId);
    },
    onCanvasState: (initialObjects: CanvasObject[]) => {
      hasLoadedFromStorageRef.current = true; // Server provided state, skip IndexedDB load
      setObjects(initialObjects);
    },
    onStrokeProgress: (progressData: InProgressStroke) => {
      setInProgressStrokes((prev) => {
        const newMap = new Map(prev);
        newMap.set(progressData.nodeId, progressData);
        return newMap;
      });
    },
    onStrokeProgressEnd: (nodeId: string, _nodeIdStrokeId: string) => {
      setInProgressStrokes((prev) => {
        const newMap = new Map(prev);
        newMap.delete(nodeId);
        return newMap;
      });
    },
    onEraserPreview: (nodeId: string, objectIds: string[]) => {
      setRemoteEraserPreviews((prev) => {
        const newMap = new Map(prev);
        newMap.set(nodeId, new Set(objectIds));
        return newMap;
      });
    },
    onEraserPreviewEnd: (nodeId: string) => {
      setRemoteEraserPreviews((prev) => {
        const newMap = new Map(prev);
        newMap.delete(nodeId);
        return newMap;
      });
    },
    onAssetAvailable: (assetId: string) => {
      // If we have a placeholder image object and are missing the asset, request it.
      const needed = objectsRef.current.some((o) => o.type === 'image' && o.assetId === assetId);
      const cached = imageCache.has(assetId);
      if (needed && !cached && canvasId) {
        sendAssetRequest({ canvasId, assetId });
      }
    },
    onAssetChunk: (assetId: string, seq: number, bytes: ArrayBuffer) => {
      const current = incomingAssetChunksRef.current.get(assetId) ?? new Map<number, ArrayBuffer>();
      current.set(seq, bytes);
      incomingAssetChunksRef.current.set(assetId, current);
    },
    onAssetComplete: async (assetId: string, _totalBytes: number) => {
      const chunksMap = incomingAssetChunksRef.current.get(assetId);
      if (!chunksMap) return;

      const ordered = Array.from(chunksMap.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([, buf]) => buf);

      incomingAssetChunksRef.current.delete(assetId);
      const bytes = concatArrayBuffers(ordered);

      const imageObj = objectsRef.current.find((o) => o.type === 'image' && o.assetId === assetId) as ImageObject | undefined;
      if (!imageObj) return;

      await storage.saveAsset({ canvasId, assetId, mime: imageObj.mime, bytes });
      const source = await decodeImageBytes(imageObj.mime, bytes);
      setImageCache((prev) => new Map(prev).set(assetId, source));
    },
  });

  const updateImagePosition = (imageId: string, x: number, y: number): ImageObject | null => {
    const current = objectsRef.current;
    let updated: ImageObject | null = null;
    const next = current.map((obj) => {
      if (obj.id === imageId && obj.type === 'image') {
        updated = { ...obj, x, y };
        return updated;
      }
      return obj;
    });

    if (updated) {
      objectsRef.current = next;
      setObjects(next);
    }

    return updated;
  };

  const maybeSendObjectUpdate = (object: CanvasObject, force = false) => {
    if (!canvasId) return;
    const now = Date.now();
    if (!force && now - lastObjectUpdateRef.current < 50) {
      return;
    }
    lastObjectUpdateRef.current = now;
    sendObjectUpdated(object);
  };

  useEffect(() => {
    // Only load from IndexedDB if user is connected (authorized to see the canvas)
    // This prevents unauthorized users from seeing strokes before session check completes
    if (!isConnected) return;
    
    // Only load once - skip if already loaded from server or previous IndexedDB load
    if (hasLoadedFromStorageRef.current) return;
    
    // Load from IndexedDB as fallback/cache
    const loadFromStorage = async () => {
      try {
        const loadedObjects = await storage.loadObjects(canvasId);
        if (loadedObjects.length > 0) {
          setObjects((currentObjects) => {
            if (currentObjects.length === 0) {
              hasLoadedFromStorageRef.current = true;
              return loadedObjects;
            }
            return currentObjects;
          });
        }
      } catch (error) {
        console.error('Failed to load strokes from storage:', error);
      }
    };
    
    loadFromStorage();
  }, [canvasId, isConnected]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Combine local and remote eraser previews
    const combinedEraserPreview = new Set(objectsToErasePreview);
    remoteEraserPreviews.forEach((objectIds) => {
      objectIds.forEach((id) => combinedEraserPreview.add(id));
    });

    renderAllObjects(ctx, objects, canvas.width, canvas.height, combinedEraserPreview, inProgressStrokes, imageCache);

    if (selectedObjectIds.length > 0) {
      const selectedObjects = objects.filter((o) => selectedObjectIds.includes(o.id));
      const box = getSelectionBoundingBox(selectedObjects);
      if (box) {
        drawSelectionBox(ctx, box);
      }
    }
    if (selectionRect) {
      drawMarqueeRect(ctx, selectionRect.start, selectionRect.end);
    }
  }, [objects, objectsToErasePreview, remoteEraserPreviews, inProgressStrokes, imageCache, selectedObjectIds, selectionRect]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        await storage.saveObjects(objects, canvasId);
      } catch (error) {
        console.error('Failed to save strokes to storage:', error);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [objects, canvasId]);

  // Keep objectsRef in sync with objects for undo + asset lookup
  useEffect(() => {
    objectsRef.current = objects;
  }, [objects]);

  // Ensure image assets are available locally (load from IndexedDB, otherwise request from server)
  useEffect(() => {
    let cancelled = false;

    const ensure = async () => {
      for (const obj of objects) {
        if (obj.type !== 'image') continue;
        if (imageCache.has(obj.assetId)) continue;

        const localAsset = await storage.loadAsset({ canvasId, assetId: obj.assetId });
        if (cancelled) return;

        if (localAsset) {
          const source = await decodeImageBytes(localAsset.mime, localAsset.bytes);
          if (cancelled) return;
          setImageCache((prev) => new Map(prev).set(obj.assetId, source));
          continue;
        }

        if (isConnected && canvasId && !requestedAssetsRef.current.has(obj.assetId)) {
          requestedAssetsRef.current.add(obj.assetId);
          sendAssetRequest({ canvasId, assetId: obj.assetId });
        }
      }
    };

    ensure();

    return () => {
      cancelled = true;
    };
  }, [objects, imageCache, canvasId, isConnected, sendAssetRequest]);

  // Paste handler (Ctrl/Cmd+V): image -> ImageObject + asset upload
  useEffect(() => {
    if (!isConnected || error) return;

    const onPaste = async (e: ClipboardEvent) => {
      try {
        if (!canvasId) return;
        if (!e.clipboardData) return;

        // If user is typing in an input, don't steal paste.
        const active = document.activeElement;
        if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || (active as HTMLElement).isContentEditable)) {
          return;
        }

        const items = Array.from(e.clipboardData.items);
        const imageItem = items.find((it) => it.type.startsWith('image/'));
        if (!imageItem) return;

        const file = imageItem.getAsFile();
        if (!file) return;

        e.preventDefault();

        const canvas = canvasRef.current;
        if (!canvas) return;

        const maxWidth = canvas.width;
        const maxHeight = canvas.height;

        // Downscale before storing/syncing.
        const scaled = await downscaleImageBlob({
          blob: file,
          maxWidth,
          maxHeight,
          maxPixels: 2_000_000, // ~2MP guardrail
        });

        const bytes = await blobToArrayBuffer(scaled.blob);
        // Hard cap (after downscale)
        if (bytes.byteLength > 8 * 1024 * 1024) {
          console.warn('Pasted image too large after downscale; ignoring');
          return;
        }

        const assetId = uuidv4();
        const id = assetId;

        const center = lastPointerPositionRef.current ?? { x: canvas.width / 2, y: canvas.height / 2 };
        const x = Math.round(center.x - scaled.width / 2);
        const y = Math.round(center.y - scaled.height / 2);

        const imageObject: ImageObject = {
          id,
          type: 'image',
          assetId,
          mime: scaled.mime,
          x,
          y,
          width: scaled.width,
          height: scaled.height,
          createdAt: Date.now(),
        };

        // Persist asset immediately (optimistic offline resilience)
        await storage.saveAsset({ canvasId, assetId, mime: scaled.mime, bytes });

        // Cache for immediate rendering
        const source = await decodeImageBytes(scaled.mime, bytes);
        setImageCache((prev) => new Map(prev).set(assetId, source));

        // Update local state
        localActionHistoryRef.current.push({ type: 'add', object: imageObject });
        setObjects((prev) => [...prev, imageObject]);

        // Sync metadata quickly
        sendObjectAdded(imageObject);

        // Upload asset in background (throttled via a single-flight queue)
        assetUploadQueueRef.current = assetUploadQueueRef.current
          .then(async () => {
            const chunkSize = 64 * 1024;
            sendAssetUploadStart({
              canvasId,
              assetId,
              mime: scaled.mime,
              totalBytes: bytes.byteLength,
              chunkSize,
              timestamp: Date.now(),
            });

            const view = new Uint8Array(bytes);
            let seq = 0;
            for (let offset = 0; offset < view.byteLength; offset += chunkSize) {
              const slice = view.slice(offset, Math.min(view.byteLength, offset + chunkSize));
              sendAssetUploadChunk({ canvasId, assetId, seq, bytes: slice.buffer });
              seq += 1;
              // Yield a bit to keep stroke events responsive
              if (seq % 4 === 0) await sleep(10);
              else await sleep(0);
            }

            sendAssetUploadComplete({ canvasId, assetId, timestamp: Date.now() });
          })
          .catch((err) => console.error('Asset upload failed:', err));
      } catch (err) {
        console.error('Paste handler failed:', err);
      }
    };

    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [isConnected, error, canvasId, sendObjectAdded, sendAssetUploadStart, sendAssetUploadChunk, sendAssetUploadComplete]);

  // Handle Ctrl+Z for undo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Disable undo if not connected or if there's an error
      if (!isConnected || error) return;
      
      // Check for Ctrl+Z (or Cmd+Z on Mac)
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();

        const action = localActionHistoryRef.current.pop();
        if (!action) return;

        isUndoingRef.current = true;
        const currentObjects = objectsRef.current;

        if (action.type === 'add') {
          const exists = currentObjects.some((o) => o.id === action.object.id);
          if (!exists) return;

          const updatedObjects = currentObjects.filter((o) => o.id !== action.object.id);
          if (canvasId) {
            sendObjectRemoved([action.object.id]);
          }
          setObjects(updatedObjects);
          return;
        }

        const currentIds = new Set(currentObjects.map((o) => o.id));
        const objectsToRestore = action.objects.filter((o) => !currentIds.has(o.id));
        if (objectsToRestore.length === 0) return;

        const updatedObjects = [...currentObjects, ...objectsToRestore];
        if (canvasId) {
          objectsToRestore.forEach((o) => sendObjectAdded(o));
        }
        setObjects(updatedObjects);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isConnected, error, canvasId, sendObjectRemoved, sendObjectAdded]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    // Disable drawing if not connected or if there's an error
    if (!isConnected || error) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const point = getCanvasPoint(canvas, e.clientX, e.clientY);
    lastPointerPositionRef.current = point;

    if (activeTool === 'select') {
      const selectedObjects = objectsRef.current.filter((o) => selectedObjectIds.includes(o.id));
      const selectionBox = getSelectionBoundingBox(selectedObjects);
      const insideBox = selectionBox && selectedObjectIds.length > 0 && pointInRect(point, selectionBox);
      if (insideBox) {
        dragSelectionRef.current = { lastPoint: point };
        setIsDraggingSelection(true);
        setIsDrawing(true);
        return;
      }
      setSelectedObjectIds([]);
      setSelectionRect({ start: point, end: point });
      setIsDrawing(true);
      return;
    }

    setIsDrawing(true);
    const initialPoints = [point];
    setCurrentPoints(initialPoints);
    currentPointsRef.current = initialPoints; // Keep ref in sync
    setObjectsToErasePreview(new Set()); // Clear preview on new eraser action
    
    // Generate a stroke ID for streaming (only for brush tool)
    if (activeTool === 'brush') {
      currentStrokeIdRef.current = uuidv4();
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    // Disable drawing if not connected or if there's an error
    if (!isConnected || error) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const point = getCanvasPoint(canvas, e.clientX, e.clientY);
    lastPointerPositionRef.current = point;

    if (!isDrawing) return;

    if (activeTool === 'select') {
      const drag = dragSelectionRef.current;
      if (drag) {
        const dx = point.x - drag.lastPoint.x;
        const dy = point.y - drag.lastPoint.y;
        if (dx !== 0 || dy !== 0) {
          const current = objectsRef.current;
          const selectedSet = new Set(selectedObjectIds);
          const next = current.map((obj) => {
            if (!selectedSet.has(obj.id)) return obj;
            if (obj.type === 'image') {
              return { ...obj, x: obj.x + dx, y: obj.y + dy };
            }
            return translateStroke(obj, dx, dy);
          });
          objectsRef.current = next;
          setObjects(next);
          next.forEach((o) => {
            if (selectedSet.has(o.id)) maybeSendObjectUpdate(o);
          });
        }
        drag.lastPoint = point;
        return;
      }
      if (selectionRect) {
        setSelectionRect((prev) => (prev ? { ...prev, end: point } : null));
        return;
      }
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    // Use ref to get latest points to avoid stale state issues
    const latestPoints = currentPointsRef.current.length > 0 ? currentPointsRef.current : currentPoints;
    const newPoints = [...latestPoints, point];
    setCurrentPoints(newPoints);
    currentPointsRef.current = newPoints; // Keep ref in sync

    // Send cursor update to other users while drawing
    if (canvasId) {
      sendCursorUpdate(point, true, activeTool);
    }

    if (activeTool === 'brush') {
      ctx.strokeStyle = brushColor;
      ctx.lineWidth = brushSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (latestPoints.length > 0) {
        ctx.beginPath();
        ctx.moveTo(latestPoints[latestPoints.length - 1].x, latestPoints[latestPoints.length - 1].y);
        ctx.lineTo(point.x, point.y);
        ctx.stroke();
      }
      
      // Stream stroke progress to other users (throttled in sendStrokeProgress)
      if (canvasId && currentStrokeIdRef.current) {
        sendStrokeProgress(currentStrokeIdRef.current, {
          tool: 'brush',
          color: brushColor,
          size: brushSize,
          points: newPoints,
        });
      }
    } else if (activeTool === 'eraser') {
      // Update preview: find objects that will be erased
      if (newPoints.length >= 2) {
        const objectIdsToErase = findObjectsToErase(objectsRef.current, newPoints);
        objectsToEraseRef.current = objectIdsToErase; // Store for use in mouseUp
        setObjectsToErasePreview(new Set(objectIdsToErase));
        
        // Stream eraser preview to other users (throttled in sendEraserPreview)
        if (canvasId) {
          sendEraserPreview(objectIdsToErase);
        }
      }
    }
  };

  const handleMouseUp = () => {
    // Disable drawing if not connected or if there's an error
    if (!isConnected || error) {
      setIsDrawing(false);
      setCurrentPoints([]);
      setObjectsToErasePreview(new Set()); // Clear preview
      return;
    }

    if (activeTool === 'select') {
      const drag = dragSelectionRef.current;
      if (drag) {
        const current = objectsRef.current;
        const selectedSet = new Set(selectedObjectIds);
        current.forEach((obj) => {
          if (selectedSet.has(obj.id)) maybeSendObjectUpdate(obj, true);
        });
        dragSelectionRef.current = null;
        setIsDraggingSelection(false);
        setIsDrawing(false);
        if (canvasId) sendCursorStop();
        return;
      }
      if (selectionRect) {
        const x = Math.min(selectionRect.start.x, selectionRect.end.x);
        const y = Math.min(selectionRect.start.y, selectionRect.end.y);
        const w = Math.abs(selectionRect.end.x - selectionRect.start.x);
        const h = Math.abs(selectionRect.end.y - selectionRect.start.y);
        if (w < 3 && h < 3) {
          setSelectedObjectIds([]);
        } else {
          const rect = { x, y, w, h };
          const inRect = getObjectsFullyInRect(objectsRef.current, rect);
          setSelectedObjectIds(inRect.map((o) => o.id));
        }
        setSelectionRect(null);
        setIsDrawing(false);
        if (canvasId) sendCursorStop();
        return;
      }
      setIsDrawing(false);
      return;
    }
    
    // Use ref to get latest points to ensure we have all points captured
    const pointsToUse = currentPointsRef.current.length > 0 ? currentPointsRef.current : currentPoints;
    
    if (!isDrawing || pointsToUse.length === 0) {
      setIsDrawing(false);
      setCurrentPoints([]);
      currentPointsRef.current = [];
      setObjectsToErasePreview(new Set()); // Clear preview
      return;
    }

    if (activeTool === 'brush') {
      // Create a new canvas object from all points captured during this drawing session
      // Use the same ID we've been streaming with, so other clients can match it
      const newObject: StrokeObject = {
        id: currentStrokeIdRef.current || uuidv4(),
        type: 'stroke',
        tool: 'brush',
        color: brushColor,
        size: brushSize,
        points: pointsToUse,
      };
      localActionHistoryRef.current.push({ type: 'add', object: newObject });
      setObjects((prev) => [...prev, newObject]);
      if (canvasId) {
        sendObjectAdded(newObject);
      }

      // Notify other users that this in-progress stroke is done
      if (canvasId && currentStrokeIdRef.current) {
        sendStrokeProgressEnd(currentStrokeIdRef.current);
      }
    } else if (activeTool === 'eraser') {
      // Use the stored IDs from preview instead of recalculating
      // This ensures consistency between preview and actual erase
      const objectIdsToErase = objectsToEraseRef.current;
      if (objectIdsToErase.length > 0) {
        const currentObjects = objectsRef.current;
        const objectsToRemove = currentObjects.filter((object) => objectIdsToErase.includes(object.id));
        if (objectsToRemove.length > 0) {
          localActionHistoryRef.current.push({ type: 'remove', objects: objectsToRemove });
        }
        setObjects((prev) => prev.filter((object) => !objectIdsToErase.includes(object.id)));

        if (canvasId) {
          sendObjectRemoved(objectIdsToErase);
        }
      }
      objectsToEraseRef.current = []; // Clear the ref
      
      // Notify other users that eraser preview ended
      if (canvasId) {
        sendEraserPreviewEnd();
      }
    }

    setIsDrawing(false);
    setCurrentPoints([]);
    currentPointsRef.current = [];
    setObjectsToErasePreview(new Set()); // Clear preview
    currentStrokeIdRef.current = null; // Clear the stroke ID
    
    // Notify other users that we stopped drawing
    if (canvasId) {
      sendCursorStop();
    }
  };

  const handleMouseLeave = () => {
    if (isDrawing) {
      handleMouseUp();
    } else {
      // Clear preview even if not drawing
      setObjectsToErasePreview(new Set());
      currentPointsRef.current = [];
      objectsToEraseRef.current = []; // Clear eraser IDs
      
      // Notify other users that eraser preview ended
      if (canvasId) {
        sendEraserPreviewEnd();
      }
    }
    // Always notify others when leaving canvas
    if (canvasId) {
      sendCursorStop();
    }
  };

  const clearCanvas = async () => {
    // Disable clearing if not connected or if there's an error
    if (!isConnected || error) return;

    const currentObjects = objectsRef.current;
    if (currentObjects.length > 0) {
      localActionHistoryRef.current.push({ type: 'remove', objects: currentObjects });
    }
    setObjects([]);
    setImageCache(new Map());
    // Fire and forget - errors are logged in the storage module
    storage.clearCanvas(canvasId);
    setObjectsToErasePreview(new Set()); // Clear preview
    // Send to collaboration server
    if (canvasId) {
      sendCanvasCleared();
    }
  };

  return {
    canvasRef,
    objects,
    isConnected,
    error,
    isInitializing,
    isDraggingSelection,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleMouseLeave,
    clearCanvas,
  };
}
