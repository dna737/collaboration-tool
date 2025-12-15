'use client';

import { useState, useRef, useEffect } from 'react';
import { useCanvas } from '@/hooks/useCanvas';
import { Tool } from '@/types';

interface CanvasProps {
  activeTool: Tool;
  brushSize: number;
  brushColor: string;
  onClear: () => void;
}

export default function Canvas({ activeTool, brushSize, brushColor, onClear }: CanvasProps) {
  const {
    canvasRef,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleMouseLeave,
    clearCanvas,
  } = useCanvas({ activeTool, brushSize, brushColor });

  const [mousePosition, setMousePosition] = useState<{ x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    handleMouseMove(e);
    
    if (activeTool === 'eraser' && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setMousePosition({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  };

  const handleCanvasMouseLeave = () => {
    handleMouseLeave();
    setMousePosition(null);
  };

  const handleClearClick = () => {
    if (window.confirm('Are you sure you want to clear the canvas? This cannot be undone.')) {
      clearCanvas();
      onClear();
    }
  };

  return (
    <div className="canvas-container" ref={containerRef} style={{ position: 'relative', display: 'inline-block' }}>
      <canvas
        ref={canvasRef}
        width={1200}
        height={800}
        onMouseDown={handleMouseDown}
        onMouseMove={handleCanvasMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleCanvasMouseLeave}
        style={{
          border: '2px solid #ddd',
          cursor: activeTool === 'brush' ? 'crosshair' : 'none',
          backgroundColor: 'white',
        }}
      />
      {activeTool === 'eraser' && mousePosition && (
        <div
          style={{
            position: 'absolute',
            left: mousePosition.x,
            top: mousePosition.y,
            width: 10,
            height: 10,
            borderRadius: '100%',
            border: '2px solid #666',
            backgroundColor: 'transparent',
            pointerEvents: 'none',
            transform: 'translate(-50%, -50%)',
            zIndex: 10,
          }}
        />
      )}
      <button
        onClick={handleClearClick}
        style={{
          marginTop: '10px',
          padding: '8px 16px',
          backgroundColor: '#ef4444',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
        }}
      >
        Clear Canvas
      </button>
    </div>
  );
}
