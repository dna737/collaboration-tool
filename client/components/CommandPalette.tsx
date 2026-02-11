'use client';

import { CanvasTheme } from '@/types/theme';

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  theme: CanvasTheme;
}

export default function CommandPalette({ open, onClose, theme }: CommandPaletteProps) {
  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: theme.overlayBackdrop,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '10vh',
        zIndex: 1110,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(560px, 92vw)',
          minHeight: '220px',
          backgroundColor: theme.panelBackground,
          border: `1px solid ${theme.panelBorder}`,
          borderRadius: '12px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.25)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            padding: '14px 16px',
            borderBottom: `1px solid ${theme.panelBorder}`,
            color: theme.textMuted,
            fontSize: '14px',
          }}
        >
          Command Palette (empty for now)
        </div>
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: theme.textMuted,
            fontSize: '14px',
          }}
        >
          No commands yet
        </div>
      </div>
    </div>
  );
}
