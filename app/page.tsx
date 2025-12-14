'use client';

import { useState, useEffect } from 'react';
import Canvas from '@/components/Canvas';
import Toolbar from '@/components/Toolbar';
import { Tool } from '@/types';

export default function Home() {
  const [activeTool, setActiveTool] = useState<Tool>('brush');
  const [brushSize, setBrushSize] = useState(5);
  const [brushColor, setBrushColor] = useState('#000000');

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'b' || e.key === 'B') {
        setActiveTool('brush');
      } else if (e.key === 'e' || e.key === 'E') {
        setActiveTool('eraser');
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  const handleClear = () => {
    const canvas = document.querySelector('canvas');
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  };

  return (
    <main
      style={{
        minHeight: '100vh',
        padding: '20px',
        backgroundColor: '#fafafa',
      }}
    >
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <header style={{ marginBottom: '20px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: 'bold', margin: '0 0 10px 0' }}>
            Canvas Drawing App
          </h1>
          <p style={{ color: '#6b7280', margin: 0 }}>
            Draw, erase, and create. Your work is automatically saved.
          </p>
        </header>

        <Toolbar
          activeTool={activeTool}
          brushSize={brushSize}
          brushColor={brushColor}
          onToolChange={setActiveTool}
          onBrushSizeChange={setBrushSize}
          onBrushColorChange={setBrushColor}
        />

        <div style={{ marginTop: '20px' }}>
          <Canvas
            activeTool={activeTool}
            brushSize={brushSize}
            brushColor={brushColor}
            onClear={handleClear}
          />
        </div>

        <footer style={{ marginTop: '40px', textAlign: 'center', color: '#9ca3af', fontSize: '14px' }}>
          <p>All drawings are saved automatically to your browser&apos;s local storage.</p>
        </footer>
      </div>
    </main>
  );
}
