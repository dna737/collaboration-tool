import { useRef, useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Stroke, Point, Tool } from '@/types';
import { renderAllStrokes, getCanvasPoint, findObjectsToErase } from '@/lib/canvas-utils';
import { storage } from '@/lib/storage';

interface UseCanvasProps {
  activeTool: Tool;
  brushSize: number;
  brushColor: string;
}

export function useCanvas({ activeTool, brushSize, brushColor }: UseCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);

  useEffect(() => {
    const loadedStrokes = storage.loadStrokes();
    setStrokes(loadedStrokes);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    renderAllStrokes(ctx, strokes, canvas.width, canvas.height);
  }, [strokes]);

  useEffect(() => {
    const timer = setTimeout(() => {
      storage.saveStrokes(strokes);
    }, 500);

    return () => clearTimeout(timer);
  }, [strokes]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const point = getCanvasPoint(canvas, e.clientX, e.clientY);
    setIsDrawing(true);
    setCurrentPoints([point]);
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
    }
  };

  const handleMouseUp = () => {
    if (!isDrawing || currentPoints.length === 0) {
      setIsDrawing(false);
      setCurrentPoints([]);
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
    } else if (activeTool === 'eraser') {
      // Find which objects the eraser path intersects with
      setStrokes((prev) => {
        const objectIdsToErase = findObjectsToErase(prev, currentPoints);
        // Remove all objects that were intersected by the eraser
        return prev.filter((object) => !objectIdsToErase.includes(object.id));
      });
    }

    setIsDrawing(false);
    setCurrentPoints([]);
  };

  const handleMouseLeave = () => {
    if (isDrawing) {
      handleMouseUp();
    }
  };

  const clearCanvas = () => {
    setStrokes([]);
    storage.clearStrokes();
  };

  return {
    canvasRef,
    strokes,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleMouseLeave,
    clearCanvas,
  };
}
