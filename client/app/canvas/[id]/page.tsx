'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Canvas from '@/components/Canvas';
import Toolbar from '@/components/Toolbar';
import SessionFullDialog from '@/components/SessionFullDialog';
import UsernameDialog from '@/components/UsernameDialog';
import ShortcutsDialog from '@/components/ShortcutsDialog';
import CommandPalette, { CommandPaletteCommand } from '@/components/CommandPalette';
import { Tool } from '@/types';
import { lightTheme, darkTheme } from '@/types/theme';

const THEME_STORAGE_KEY = 'canvas-ui-theme';

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
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const theme = isDarkMode ? darkTheme : lightTheme;

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
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    setIsDarkMode(savedTheme === 'dark');
  }, []);

  useEffect(() => {
    localStorage.setItem(THEME_STORAGE_KEY, isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const key = e.key.toLowerCase();
      const isCtrlOrMeta = e.ctrlKey || e.metaKey;

      if (isCtrlOrMeta && (e.key === '/' || e.key === '?')) {
        e.preventDefault();
        setIsShortcutsOpen((prev) => !prev);
        return;
      }

      if (isCtrlOrMeta && e.shiftKey && key === 'y') {
        e.preventDefault();
        setIsDarkMode((prev) => !prev);
        return;
      }

      if (isCtrlOrMeta && e.shiftKey && key === 'p') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
        return;
      }

      if (key === 'escape') {
        setIsShortcutsOpen(false);
        setIsCommandPaletteOpen(false);
        return;
      }

      if (key === 's') {
        e.preventDefault();
        setActiveTool('select');
      } else if (key === 'b') {
        e.preventDefault();
        setActiveTool('brush');
      } else if (key === 'e') {
        e.preventDefault();
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

  const commandPaletteCommands = useMemo<CommandPaletteCommand[]>(
    () => [
      {
        id: 'tool-select',
        label: 'Switch to Select tool',
        keywords: ['tool', 'select', 'pointer'],
        execute: () => setActiveTool('select'),
      },
      {
        id: 'tool-brush',
        label: 'Switch to Brush tool',
        keywords: ['tool', 'brush', 'draw'],
        execute: () => setActiveTool('brush'),
      },
      {
        id: 'tool-eraser',
        label: 'Switch to Eraser tool',
        keywords: ['tool', 'eraser', 'erase'],
        execute: () => setActiveTool('eraser'),
      },
      {
        id: 'toggle-theme',
        label: isDarkMode ? 'Switch to Light mode' : 'Switch to Dark mode',
        keywords: ['theme', 'dark', 'light', 'mode'],
        execute: () => setIsDarkMode((prev) => !prev),
      },
      {
        id: 'toggle-shortcuts',
        label: isShortcutsOpen ? 'Close Shortcuts dialog' : 'Open Shortcuts dialog',
        keywords: ['shortcuts', 'hotkeys', 'help'],
        execute: () => setIsShortcutsOpen((prev) => !prev),
      },
    ],
    [isDarkMode, isShortcutsOpen]
  );

  if (!canvasId) {
    return null;
  }

  // Show username dialog before joining
  if (!hasJoined) {
    return <UsernameDialog onJoin={handleJoin} theme={theme} />;
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        padding: '20px',
        backgroundColor: theme.pageBackground,
      }}
    >
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <header style={{ marginBottom: '20px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: 'bold', margin: '0 0 10px 0', color: theme.textPrimary }}>
            Canvas Drawing App
          </h1>
          <p style={{ color: theme.textMuted, margin: 0 }}>
            Draw, erase, and create. Your work is automatically saved.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '5px' }}>
            <p style={{ color: theme.textMuted, margin: 0, fontSize: '14px' }}>
              Canvas ID:{' '}
              <code
                style={{
                  backgroundColor: theme.isDark ? '#1f2937' : '#e5e7eb',
                  color: theme.textPrimary,
                  padding: '2px 6px',
                  borderRadius: '4px',
                }}
              >
                {canvasId}
              </code>
            </p>
            <p style={{ color: theme.accent, margin: 0, fontSize: '14px', fontWeight: '500' }}>
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
            theme={theme}
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
          <footer style={{ marginTop: '40px', textAlign: 'center', color: theme.textMuted, fontSize: '14px' }}>
            <p>All drawings are saved automatically. Share this URL to collaborate in real-time.</p>
          </footer>
        )}
      </div>

      {/* Show session full dialog */}
      {isSessionFull && <SessionFullDialog onRefresh={handleRefresh} theme={theme} />}
      <ShortcutsDialog open={isShortcutsOpen} onClose={() => setIsShortcutsOpen(false)} theme={theme} />
      <CommandPalette
        open={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        theme={theme}
        commands={commandPaletteCommands}
      />
    </main>
  );
}
