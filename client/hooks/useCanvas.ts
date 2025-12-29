import { useRef, useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Stroke, Point, Tool, CanvasId } from '@/types';
import { renderAllStrokes, getCanvasPoint, findObjectsToErase } from '@/lib/canvas-utils';
import { storage } from '@/lib/storage';
import { useCollaboration } from '@/hooks/useCollaboration';

interface UseCanvasProps {
  canvasId?: CanvasId;
  activeTool: Tool;
  brushSize: number;
  brushColor: string;
}

export function useCanvas({ canvasId, activeTool, brushSize, brushColor }: UseCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const [objectsToErasePreview, setObjectsToErasePreview] = useState<Set<string>>(new Set());
  const historyRef = useRef<Stroke[][]>([]); // History stack for undo
  const historyIndexRef = useRef(0); // Current position in history
  const isUndoingRef = useRef(false); // Flag to prevent adding to history during undo

  // Collaboration hook
  const {
    isConnected,
    sendStrokeAdded,
    sendStrokeRemoved,
    sendCanvasCleared,
  } = useCollaboration({
    canvasId: canvasId || '',
    onStrokeAdded: (stroke: Stroke) => {
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
  });

  useEffect(() => {
    // Load from localStorage as fallback/cache
    const loadedStrokes = storage.loadStrokes(canvasId);
    if (loadedStrokes.length > 0 && strokes.length === 0) {
      setStrokes(loadedStrokes);
      // Initialize history with the loaded strokes
      historyRef.current = [JSON.parse(JSON.stringify(loadedStrokes))];
      historyIndexRef.current = 0;
    }
  }, [canvasId]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    renderAllStrokes(ctx, strokes, canvas.width, canvas.height, objectsToErasePreview);
  }, [strokes, objectsToErasePreview]);

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
  }, []);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const point = getCanvasPoint(canvas, e.clientX, e.clientY);
    setIsDrawing(true);
    setCurrentPoints([point]);
    setObjectsToErasePreview(new Set()); // Clear preview on new eraser action
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const point = getCanvasPoint(canvas, e.clientX, e.clientY);
    const newPoints = [...currentPoints, point];
    setCurrentPoints(newPoints);

    if (activeTool === 'brush') {
      ctx.strokeStyle = brushColor;
      ctx.lineWidth = brushSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (currentPoints.length > 0) {
        ctx.beginPath();
        ctx.moveTo(currentPoints[currentPoints.length - 1].x, currentPoints[currentPoints.length - 1].y);
        ctx.lineTo(point.x, point.y);
        ctx.stroke();
      }
    } else if (activeTool === 'eraser') {
      // Update preview: find objects that will be erased
      if (newPoints.length >= 2) {
        const objectIdsToErase = findObjectsToErase(strokes, newPoints);
        setObjectsToErasePreview(new Set(objectIdsToErase));
      }
    }
  };

  const handleMouseUp = () => {
    if (!isDrawing || currentPoints.length === 0) {
      setIsDrawing(false);
      setCurrentPoints([]);
      setObjectsToErasePreview(new Set()); // Clear preview
      return;
    }

    if (activeTool === 'brush') {
      // Create a new canvas object from all points captured during this drawing session
      const newObject: Stroke = {
        id: uuidv4(),
        tool: 'brush',
        color: brushColor,
        size: brushSize,
        points: currentPoints, // Collection of all points from mouseDown to mouseUp
      };
      setStrokes((prev) => [...prev, newObject]);
      // Send to collaboration server
      if (canvasId) {
        sendStrokeAdded(newObject);
      }
    } else if (activeTool === 'eraser') {
      // Find which objects the eraser path intersects with
      setStrokes((prev) => {
        const objectIdsToErase = findObjectsToErase(prev, currentPoints);
        // Remove all objects that were intersected by the eraser
        const newStrokes = prev.filter((object) => !objectIdsToErase.includes(object.id));
        // Send to collaboration server
        if (canvasId && objectIdsToErase.length > 0) {
          sendStrokeRemoved(objectIdsToErase);
        }
        return newStrokes;
      });
    }

    setIsDrawing(false);
    setCurrentPoints([]);
    setObjectsToErasePreview(new Set()); // Clear preview
  };

  const handleMouseLeave = () => {
    if (isDrawing) {
      handleMouseUp();
    } else {
      // Clear preview even if not drawing
      setObjectsToErasePreview(new Set());
    }
  };

  const clearCanvas = () => {
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
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleMouseLeave,
    clearCanvas,
  };
}
