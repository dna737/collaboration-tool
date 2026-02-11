'use client';

import { CanvasTheme } from '@/types/theme';

interface ShortcutsDialogProps {
  open: boolean;
  onClose: () => void;
  theme: CanvasTheme;
}

const SHORTCUTS: Array<{ keys: string; action: string }> = [
  { keys: 'S', action: 'Select tool' },
  { keys: 'B', action: 'Brush tool' },
  { keys: 'E', action: 'Eraser tool' },
  { keys: 'Delete / Backspace', action: 'Delete selected object(s)' },
  { keys: 'Shift + Alt + Delete', action: 'Clear canvas (with confirmation)' },
  { keys: 'Ctrl/Cmd + Z', action: 'Undo last local action' },
  { keys: 'Ctrl + /', action: 'Toggle shortcuts panel' },
  { keys: 'Ctrl + Shift + Y', action: 'Toggle light/dark chrome' },
  { keys: 'Ctrl + Shift + P', action: 'Toggle command palette' },
  { keys: 'Hold Space + Drag', action: 'Temporarily pan canvas' },
];

export default function ShortcutsDialog({ open, onClose, theme }: ShortcutsDialogProps) {
  if (!open) return null;

  const keyBackground = theme.isDark ? '#1f2937' : '#f3f4f6';

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: theme.overlayBackdrop,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1100,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(640px, 92vw)',
          maxHeight: '80vh',
          overflowY: 'auto',
          backgroundColor: theme.panelBackground,
          border: `1px solid ${theme.panelBorder}`,
          borderRadius: '12px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.25)',
          padding: '20px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h2 style={{ margin: 0, color: theme.textPrimary, fontSize: '20px' }}>Keyboard shortcuts</h2>
          <button
            onClick={onClose}
            style={{
              border: `1px solid ${theme.panelBorder}`,
              backgroundColor: 'transparent',
              color: theme.textMuted,
              borderRadius: '6px',
              padding: '6px 10px',
              cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>

        <div style={{ display: 'grid', gap: '10px' }}>
          {SHORTCUTS.map((item) => (
            <div
              key={item.keys}
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(160px, 220px) 1fr',
                gap: '10px',
                alignItems: 'center',
              }}
            >
              <code
                style={{
                  backgroundColor: keyBackground,
                  color: theme.textPrimary,
                  border: `1px solid ${theme.panelBorder}`,
                  borderRadius: '6px',
                  padding: '6px 8px',
                  fontSize: '13px',
                }}
              >
                {item.keys}
              </code>
              <span style={{ color: theme.textMuted, fontSize: '14px' }}>{item.action}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
