'use client';

import { Tool } from '@/types';
import { CanvasTheme } from '@/types/theme';

interface ToolbarProps {
  activeTool: Tool;
  brushSize: number;
  brushColor: string;
  onToolChange: (tool: Tool) => void;
  onBrushSizeChange: (size: number) => void;
  onBrushColorChange: (color: string) => void;
  theme?: CanvasTheme;
}

export default function Toolbar({
  activeTool,
  brushSize,
  brushColor,
  onToolChange,
  onBrushSizeChange,
  onBrushColorChange,
  theme,
}: ToolbarProps) {
  const activeTheme = theme ?? {
    isDark: false,
    pageBackground: '#fafafa',
    panelBackground: '#f3f4f6',
    panelBorder: '#e5e7eb',
    textPrimary: '#111827',
    textMuted: '#6b7280',
    accent: '#3b82f6',
    overlayBackdrop: 'rgba(0, 0, 0, 0.45)',
  };
  const inactiveButtonBg = activeTheme.isDark ? '#1f2937' : '#e5e7eb';

  return (
    <div
      style={{
        display: 'flex',
        gap: '20px',
        padding: '20px',
        backgroundColor: activeTheme.panelBackground,
        border: `1px solid ${activeTheme.panelBorder}`,
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
            backgroundColor: activeTool === 'select' ? activeTheme.accent : inactiveButtonBg,
            color: activeTool === 'select' ? 'white' : activeTheme.textPrimary,
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
            backgroundColor: activeTool === 'brush' ? activeTheme.accent : inactiveButtonBg,
            color: activeTool === 'brush' ? 'white' : activeTheme.textPrimary,
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
            backgroundColor: activeTool === 'eraser' ? activeTheme.accent : inactiveButtonBg,
            color: activeTool === 'eraser' ? 'white' : activeTheme.textPrimary,
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
          <label htmlFor="brush-size" style={{ fontWeight: '500', color: activeTheme.textPrimary }}>
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
          <span style={{ minWidth: '30px', color: activeTheme.textPrimary }}>{brushSize}px</span>
        </div>
      )}

      {activeTool === 'brush' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <label htmlFor="brush-color" style={{ fontWeight: '500', color: activeTheme.textPrimary }}>
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

      <div style={{ marginLeft: 'auto', fontSize: '14px', color: activeTheme.textMuted }}>
        <strong>Keyboard shortcuts:</strong> S/B/E | Shift+Alt+Delete | Ctrl+/ | Ctrl+Shift+Y | Ctrl+Shift+P | Hold Space to pan
      </div>
    </div>
  );
}
