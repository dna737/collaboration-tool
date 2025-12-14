'use client';

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

  const handleClearClick = () => {
    if (window.confirm('Are you sure you want to clear the canvas? This cannot be undone.')) {
      clearCanvas();
      onClear();
    }
  };

  return (
    <div className="canvas-container">
      <canvas
        ref={canvasRef}
        width={1200}
        height={800}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        style={{
          border: '2px solid #ddd',
          cursor: activeTool === 'brush' ? 'crosshair' : 'cell',
          backgroundColor: 'white',
        }}
      />
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
