'use client';

import { useState, FormEvent } from 'react';
import { CanvasTheme } from '@/types/theme';

interface UsernameDialogProps {
  onJoin: (username: string) => void;
  theme?: CanvasTheme;
}

export default function UsernameDialog({ onJoin, theme }: UsernameDialogProps) {
  const [name, setName] = useState('');
  const activeTheme = theme ?? {
    isDark: false,
    pageBackground: '#fafafa',
    panelBackground: '#ffffff',
    panelBorder: '#e5e7eb',
    textPrimary: '#111827',
    textMuted: '#6b7280',
    accent: '#3b82f6',
    overlayBackdrop: 'rgba(0, 0, 0, 0.45)',
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (trimmedName) {
      onJoin(trimmedName);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: activeTheme.overlayBackdrop,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        style={{
          backgroundColor: activeTheme.panelBackground,
          border: `1px solid ${activeTheme.panelBorder}`,
          borderRadius: '12px',
          padding: '32px',
          maxWidth: '400px',
          width: '90%',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        }}
      >
        {/* Icon */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: '20px',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: activeTheme.isDark ? '#1e3a8a' : '#dbeafe',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '32px',
            }}
          >
            🎨
          </div>
        </div>

        {/* Title */}
        <h2
          style={{
            fontSize: '24px',
            fontWeight: 'bold',
            textAlign: 'center',
            margin: '0 0 8px 0',
            color: activeTheme.textPrimary,
          }}
        >
          Join Canvas
        </h2>

        {/* Subtitle */}
        <p
          style={{
            fontSize: '14px',
            color: activeTheme.textMuted,
            textAlign: 'center',
            margin: '0 0 24px 0',
          }}
        >
          Enter your name so others can see who&apos;s drawing
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your name"
            autoFocus
            maxLength={20}
            style={{
              width: '100%',
              padding: '12px 16px',
              fontSize: '16px',
              border: `2px solid ${activeTheme.panelBorder}`,
              backgroundColor: activeTheme.isDark ? '#0b1220' : '#ffffff',
              color: activeTheme.textPrimary,
              borderRadius: '8px',
              outline: 'none',
              marginBottom: '16px',
              boxSizing: 'border-box',
              transition: 'border-color 0.2s',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = activeTheme.accent;
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = activeTheme.panelBorder;
            }}
          />

          <button
            type="submit"
            disabled={!name.trim()}
            style={{
              width: '100%',
              padding: '12px 24px',
              backgroundColor: name.trim() ? activeTheme.accent : '#9ca3af',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: name.trim() ? 'pointer' : 'not-allowed',
              transition: 'background-color 0.2s',
            }}
            onMouseOver={(e) => {
              if (name.trim()) {
                e.currentTarget.style.backgroundColor = activeTheme.isDark ? '#3b82f6' : '#2563eb';
              }
            }}
            onMouseOut={(e) => {
              if (name.trim()) {
                e.currentTarget.style.backgroundColor = activeTheme.accent;
              }
            }}
          >
            Join Canvas
          </button>
        </form>
      </div>
    </div>
  );
}
