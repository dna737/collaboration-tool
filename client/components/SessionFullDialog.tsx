'use client';

import { CanvasTheme } from '@/types/theme';

interface SessionFullDialogProps {
  onRefresh: () => void;
  theme?: CanvasTheme;
}

export default function SessionFullDialog({ onRefresh, theme }: SessionFullDialogProps) {
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
          maxWidth: '480px',
          width: '90%',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        }}
      >
        {/* Warning Icon */}
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
              backgroundColor: activeTheme.isDark ? '#78350f' : '#fef3c7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '32px',
            }}
          >
            ⚠️
          </div>
        </div>

        {/* Title */}
        <h2
          style={{
            fontSize: '24px',
            fontWeight: 'bold',
            textAlign: 'center',
            margin: '0 0 12px 0',
            color: activeTheme.textPrimary,
          }}
        >
          Session Full
        </h2>

        {/* Message */}
        <p
          style={{
            fontSize: '16px',
            color: activeTheme.textMuted,
            textAlign: 'center',
            margin: '0 0 24px 0',
            lineHeight: '1.5',
          }}
        >
          This session has reached the maximum capacity of 10 users. You can join back when there are fewer people, or refresh the page to check if a spot has become available.
        </p>

        {/* Actions */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <button
            onClick={onRefresh}
            style={{
              padding: '12px 24px',
              backgroundColor: activeTheme.accent,
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = activeTheme.isDark ? '#3b82f6' : '#2563eb';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = activeTheme.accent;
            }}
          >
            Refresh Page
          </button>
          <p
            style={{
              fontSize: '14px',
              color: activeTheme.textMuted,
              textAlign: 'center',
              margin: 0,
            }}
          >
            Or try again later when there are fewer participants
          </p>
        </div>
      </div>
    </div>
  );
}
