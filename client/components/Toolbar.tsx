'use client';

import { Tool } from '@/types';

interface ToolbarProps {
  activeTool: Tool;
  brushSize: number;
  brushColor: string;
  onToolChange: (tool: Tool) => void;
  onBrushSizeChange: (size: number) => void;
  onBrushColorChange: (color: string) => void;
}

export default function Toolbar({
  activeTool,
  brushSize,
  brushColor,
  onToolChange,
  onBrushSizeChange,
  onBrushColorChange,
}: ToolbarProps) {
  return (
    <div
      style={{
        display: 'flex',
        gap: '20px',
        padding: '20px',
        backgroundColor: '#f3f4f6',
        borderRadius: '8px',
        alignItems: 'center',
        flexWrap: 'wrap',
      }}
    >
      <div style={{ display: 'flex', gap: '10px' }}>
        <button
          onClick={() => onToolChange('select')}
          style={{
            padding: '10px 20px',
            backgroundColor: activeTool === 'select' ? '#3b82f6' : '#e5e7eb',
            color: activeTool === 'select' ? 'white' : 'black',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: activeTool === 'select' ? 'bold' : 'normal',
          }}
        >
          Select
        </button>
        <button
          onClick={() => onToolChange('brush')}
          style={{
            padding: '10px 20px',
            backgroundColor: activeTool === 'brush' ? '#3b82f6' : '#e5e7eb',
            color: activeTool === 'brush' ? 'white' : 'black',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: activeTool === 'brush' ? 'bold' : 'normal',
          }}
        >
          Brush
        </button>
        <button
          onClick={() => onToolChange('eraser')}
          style={{
            padding: '10px 20px',
            backgroundColor: activeTool === 'eraser' ? '#3b82f6' : '#e5e7eb',
            color: activeTool === 'eraser' ? 'white' : 'black',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: activeTool === 'eraser' ? 'bold' : 'normal',
          }}
        >
          Eraser
        </button>
      </div>

      {activeTool === 'brush' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <label htmlFor="brush-size" style={{ fontWeight: '500' }}>
            Size:
          </label>
          <input
            id="brush-size"
            type="range"
            min="1"
            max="50"
            value={brushSize}
            onChange={(e) => onBrushSizeChange(Number(e.target.value))}
            style={{ width: '150px' }}
          />
          <span style={{ minWidth: '30px' }}>{brushSize}px</span>
        </div>
      )}

      {activeTool === 'brush' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <label htmlFor="brush-color" style={{ fontWeight: '500' }}>
            Color:
          </label>
          <input
            id="brush-color"
            type="color"
            value={brushColor}
            onChange={(e) => onBrushColorChange(e.target.value)}
            style={{
              width: '50px',
              height: '40px',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          />
        </div>
      )}

      <div style={{ marginLeft: 'auto', fontSize: '14px', color: '#6b7280' }}>
        <strong>Keyboard shortcuts:</strong> S - Select | B - Brush | E - Eraser | C - Clear
      </div>
    </div>
  );
}
