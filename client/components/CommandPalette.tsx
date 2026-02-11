'use client';

import Fuse from 'fuse.js';
import { useEffect, useMemo, useState } from 'react';
import { CanvasTheme } from '@/types/theme';

export interface CommandPaletteCommand {
  id: string;
  label: string;
  keywords?: string[];
  execute: () => void;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  theme: CanvasTheme;
  commands: CommandPaletteCommand[];
}

export default function CommandPalette({ open, onClose, theme, commands }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const fuse = useMemo(
    () =>
      new Fuse(commands, {
        keys: ['label', 'keywords'],
        threshold: 0.35,
        ignoreLocation: true,
      }),
    [commands]
  );

  const filteredCommands = useMemo(() => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      return commands;
    }

    return fuse.search(trimmedQuery).map((result) => result.item);
  }, [commands, fuse, query]);

  const handleCommandSelect = (command: CommandPaletteCommand) => {
    command.execute();
    onClose();
  };

  useEffect(() => {
    if (!open) {
      setQuery('');
    }
  }, [open]);

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
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.stopPropagation();
            onClose();
          }
        }}
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
        <div style={{ padding: '14px 16px', borderBottom: `1px solid ${theme.panelBorder}` }}>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command..."
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter' && filteredCommands.length > 0) {
                e.preventDefault();
                handleCommandSelect(filteredCommands[0]);
              }
            }}
            style={{
              width: '100%',
              padding: '10px 12px',
              fontSize: '14px',
              border: `1px solid ${theme.panelBorder}`,
              backgroundColor: theme.isDark ? '#0b1220' : '#ffffff',
              color: theme.textPrimary,
              borderRadius: '8px',
              outline: 'none',
              boxSizing: 'border-box',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = theme.accent;
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = theme.panelBorder;
            }}
          />
        </div>
        {filteredCommands.length === 0 ? (
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
            No matching commands
          </div>
        ) : (
          <div style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {filteredCommands.map((command) => (
              <button
                key={command.id}
                type="button"
                onClick={() => handleCommandSelect(command)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: `1px solid transparent`,
                  backgroundColor: 'transparent',
                  color: theme.textPrimary,
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = theme.isDark ? '#1f2937' : '#f3f4f6';
                  e.currentTarget.style.borderColor = theme.panelBorder;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.borderColor = 'transparent';
                }}
              >
                {command.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
