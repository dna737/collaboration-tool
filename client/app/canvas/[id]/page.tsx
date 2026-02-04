'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Canvas from '@/components/Canvas';
import Toolbar from '@/components/Toolbar';
import SessionFullDialog from '@/components/SessionFullDialog';
import UsernameDialog from '@/components/UsernameDialog';
import { Tool } from '@/types';

export default function CanvasPage() {
  const params = useParams();
  const router = useRouter();
  const canvasId = params?.id as string;

  const [activeTool, setActiveTool] = useState<Tool>('brush');
  const [brushSize, setBrushSize] = useState(5);
  const [brushColor, setBrushColor] = useState('#000000');
  const [userName, setUserName] = useState<string>('');
  const [hasJoined, setHasJoined] = useState(false);

  // Track error and initialization state from Canvas component
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // Handle user joining with their name
  const handleJoin = (name: string) => {
    setUserName(name);
    setHasJoined(true);
  };

  // Check if error indicates session is full
  const isSessionFull = error && error.toLowerCase().includes('session is full');

  useEffect(() => {
    if (!canvasId) {
      // Redirect to home if no canvas ID
      router.push('/');
    }
  }, [canvasId, router]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 's' || e.key === 'S') {
        setActiveTool('select');
      } else if (e.key === 'b' || e.key === 'B') {
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

  const handleRefresh = () => {
    window.location.reload();
  };

  if (!canvasId) {
    return null;
  }

  // Show username dialog before joining
  if (!hasJoined) {
    return <UsernameDialog onJoin={handleJoin} />;
  }

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
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '5px' }}>
            <p style={{ color: '#9ca3af', margin: 0, fontSize: '14px' }}>
              Canvas ID: <code style={{ backgroundColor: '#e5e7eb', padding: '2px 6px', borderRadius: '4px' }}>{canvasId}</code>
            </p>
            <p style={{ color: '#3b82f6', margin: 0, fontSize: '14px', fontWeight: '500' }}>
              👤 {userName}
            </p>
          </div>
        </header>

        {/* Always render Canvas (hidden during init) so it can establish connection */}
        {/* Hide everything else during initialization or session full */}
        {!isInitializing && !isSessionFull && (
          <Toolbar
            activeTool={activeTool}
            brushSize={brushSize}
            brushColor={brushColor}
            onToolChange={setActiveTool}
            onBrushSizeChange={setBrushSize}
            onBrushColorChange={setBrushColor}
          />
        )}

        {/* Canvas is always rendered but hidden during init/error to establish connection */}
        <div style={{
          marginTop: '20px',
          display: isInitializing || isSessionFull ? 'none' : 'block'
        }}>
          <Canvas
            canvasId={canvasId}
            userName={userName}
            activeTool={activeTool}
            brushSize={brushSize}
            brushColor={brushColor}
            onClear={handleClear}
            onErrorChange={setError}
            onInitializingChange={setIsInitializing}
          />
        </div>

        {!isInitializing && !isSessionFull && (
          <footer style={{ marginTop: '40px', textAlign: 'center', color: '#9ca3af', fontSize: '14px' }}>
            <p>All drawings are saved automatically. Share this URL to collaborate in real-time.</p>
          </footer>
        )}
      </div>

      {/* Show session full dialog */}
      {isSessionFull && <SessionFullDialog onRefresh={handleRefresh} />}
    </main>
  );
}
