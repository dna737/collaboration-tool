import { useRef, useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Stroke, Point, Tool, CanvasId, UserPresence, InProgressStroke } from '@/types';
import { renderAllStrokes, getCanvasPoint, findObjectsToErase } from '@/lib/canvas-utils';
import { storage } from '@/lib/storage';
import { useCollaboration } from '@/hooks/useCollaboration';

interface UseCanvasProps {
  canvasId?: CanvasId;
  userName: string;
  activeTool: Tool;
  brushSize: number;
  brushColor: string;
  onCursorUpdate?: (user: UserPresence) => void;
  onCursorStop?: (odeid: string) => void;
}

export function useCanvas({ canvasId, userName, activeTool, brushSize, brushColor, onCursorUpdate, onCursorStop }: UseCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const currentPointsRef = useRef<Point[]>([]); // Ref to track latest points for eraser
  const currentStrokeIdRef = useRef<string | null>(null); // Track current stroke ID for streaming
  const [inProgressStrokes, setInProgressStrokes] = useState<Map<string, InProgressStroke>>(new Map());
  const [objectsToErasePreview, setObjectsToErasePreview] = useState<Set<string>>(new Set());
  const [remoteEraserPreviews, setRemoteEraserPreviews] = useState<Map<string, Set<string>>>(new Map()); // odeid -> strokeIds
  const objectsToEraseRef = useRef<string[]>([]); // Store IDs to erase for use in mouseUp
  const historyRef = useRef<Stroke[][]>([]); // History stack for undo
  const historyIndexRef = useRef(0); // Current position in history
  const isUndoingRef = useRef(false); // Flag to prevent adding to history during undo

  // Collaboration hook
  const {
    isConnected,
    error,
    isInitializing,
    sendStrokeAdded,
    sendStrokeRemoved,
    sendCanvasCleared,
    sendCursorUpdate,
    sendCursorStop,
    sendStrokeProgress,
    sendStrokeProgressEnd,
    sendEraserPreview,
    sendEraserPreviewEnd,
  } = useCollaboration({
    canvasId: canvasId || '',
    userName,
    onCursorUpdate,
    onCursorStop,
    onStrokeAdded: (stroke: Stroke) => {
      // Remove the in-progress stroke from this user since it's now committed
      setInProgressStrokes((prev) => {
        const newMap = new Map(prev);
        // Find and remove the in-progress stroke from this sender
        // We iterate to find by matching - the stroke-added comes without odeid
        // but we can remove any in-progress that matches the stroke ID pattern
        prev.forEach((inProgress, odeid) => {
          // Remove if the points match (the stroke is now committed)
          if (inProgress.points.length > 0 && stroke.points.length > 0) {
            const firstPointMatch = 
              inProgress.points[0].x === stroke.points[0].x && 
              inProgress.points[0].y === stroke.points[0].y;
            if (firstPointMatch) {
              newMap.delete(odeid);
            }
          }
        });
        return newMap;
      });
      
      setStrokes((prev) => {
        // Check if stroke already exists (prevent duplicates)
        if (prev.find((s) => s.id === stroke.id)) {
          return prev;
        }
        return [...prev, stroke];
      });
    },
    onStrokeRemoved: (strokeIds: string[]) => {
      setStrokes((prev) => prev.filter((s) => !strokeIds.includes(s.id)));
    },
    onCanvasCleared: () => {
      setStrokes([]);
      storage.clearStrokes(canvasId);
    },
    onCanvasState: (initialStrokes: Stroke[]) => {
      setStrokes(initialStrokes);
      // Initialize history with the loaded strokes
      historyRef.current = [JSON.parse(JSON.stringify(initialStrokes))];
      historyIndexRef.current = 0;
    },
    onStrokeProgress: (progressData: InProgressStroke) => {
      // Update in-progress strokes from remote users
      setInProgressStrokes((prev) => {
        const newMap = new Map(prev);
        newMap.set(progressData.odeid, progressData);
        return newMap;
      });
    },
    onStrokeProgressEnd: (odeid: string, odeidStrokeId: string) => {
      // Remove in-progress stroke when user stops drawing
      setInProgressStrokes((prev) => {
        const newMap = new Map(prev);
        newMap.delete(odeid);
        return newMap;
      });
    },
    onEraserPreview: (odeid: string, strokeIds: string[]) => {
      // Update remote eraser previews
      setRemoteEraserPreviews((prev) => {
        const newMap = new Map(prev);
        newMap.set(odeid, new Set(strokeIds));
        return newMap;
      });
    },
    onEraserPreviewEnd: (odeid: string) => {
      // Clear remote eraser preview when user stops erasing
      setRemoteEraserPreviews((prev) => {
        const newMap = new Map(prev);
        newMap.delete(odeid);
        return newMap;
      });
    },
  });

  useEffect(() => {
    // Only load from localStorage if user is connected (authorized to see the canvas)
    // This prevents unauthorized users from seeing strokes before session check completes
    if (!isConnected) return;
    
    // Load from localStorage as fallback/cache
    const loadedStrokes = storage.loadStrokes(canvasId);
    if (loadedStrokes.length > 0 && strokes.length === 0) {
      setStrokes(loadedStrokes);
      // Initialize history with the loaded strokes
      historyRef.current = [JSON.parse(JSON.stringify(loadedStrokes))];
      historyIndexRef.current = 0;
    }
  }, [canvasId, isConnected, strokes.length]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Combine local and remote eraser previews
    const combinedEraserPreview = new Set(objectsToErasePreview);
    remoteEraserPreviews.forEach((strokeIds) => {
      strokeIds.forEach((id) => combinedEraserPreview.add(id));
    });

    renderAllStrokes(ctx, strokes, canvas.width, canvas.height, combinedEraserPreview, inProgressStrokes);
  }, [strokes, objectsToErasePreview, remoteEraserPreviews, inProgressStrokes]);

  useEffect(() => {
    const timer = setTimeout(() => {
      storage.saveStrokes(strokes, canvasId);
    }, 500);

    return () => clearTimeout(timer);
  }, [strokes, canvasId]);

  // Add current state to history when strokes change (but not during undo)
  useEffect(() => {
    if (!isUndoingRef.current && historyRef.current.length > 0) {
      // When making a new change, discard any "future" states we had undone
      historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);

      // Add current state to history (deep copy)
      historyRef.current.push(JSON.parse(JSON.stringify(strokes)));
      historyIndexRef.current = historyRef.current.length - 1;

      // Limit history size to prevent memory issues (keep last 50 states)
      if (historyRef.current.length > 50) {
        historyRef.current.shift();
        historyIndexRef.current--;
      }
    }
    isUndoingRef.current = false; // Reset flag after effect
  }, [strokes]);

  // Handle Ctrl+Z for undo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Disable undo if not connected or if there's an error
      if (!isConnected || error) return;
      
      // Check for Ctrl+Z (or Cmd+Z on Mac)
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();

        // Can only undo if we're not at the beginning of history
        if (historyIndexRef.current > 0) {
          isUndoingRef.current = true;
          historyIndexRef.current--;
          const previousState = historyRef.current[historyIndexRef.current];
          setStrokes(JSON.parse(JSON.stringify(previousState))); // Deep copy
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isConnected, error]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    // Disable drawing if not connected or if there's an error
    if (!isConnected || error) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const point = getCanvasPoint(canvas, e.clientX, e.clientY);
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
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const point = getCanvasPoint(canvas, e.clientX, e.clientY);
    // Use ref to get latest points to avoid stale state issues
    const latestPoints = currentPointsRef.current.length > 0 ? currentPointsRef.current : currentPoints;
    const newPoints = [...latestPoints, point];
    setCurrentPoints(newPoints);
    currentPointsRef.current = newPoints; // Keep ref in sync

    // Send cursor update to other users while drawing
    if (canvasId) {
      sendCursorUpdate(point, true);
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
        const objectIdsToErase = findObjectsToErase(strokes, newPoints);
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
      const newObject: Stroke = {
        id: currentStrokeIdRef.current || uuidv4(),
        tool: 'brush',
        color: brushColor,
        size: brushSize,
        points: pointsToUse, // Collection of all points from mouseDown to mouseUp
      };
      setStrokes((prev) => [...prev, newObject]);
      // Send to collaboration server
      if (canvasId) {
        sendStrokeAdded(newObject);
      }
    } else if (activeTool === 'eraser') {
      // Use the stored IDs from preview instead of recalculating
      // This ensures consistency between preview and actual erase
      const objectIdsToErase = objectsToEraseRef.current;
      if (objectIdsToErase.length > 0) {
        setStrokes((prev) => {
          // Remove all objects that were intersected by the eraser
          const newStrokes = prev.filter((object) => !objectIdsToErase.includes(object.id));
          return newStrokes;
        });
        // Send to collaboration server
        if (canvasId) {
          sendStrokeRemoved(objectIdsToErase);
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
    }
    // Always notify others when leaving canvas
    if (canvasId) {
      sendCursorStop();
    }
  };

  const clearCanvas = () => {
    // Disable clearing if not connected or if there's an error
    if (!isConnected || error) return;
    
    setStrokes([]);
    storage.clearStrokes(canvasId);
    setObjectsToErasePreview(new Set()); // Clear preview
    // Send to collaboration server
    if (canvasId) {
      sendCanvasCleared();
    }
  };

  return {
    canvasRef,
    strokes,
    isConnected,
    error,
    isInitializing,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleMouseLeave,
    clearCanvas,
  };
}
