'use client';

interface SessionFullDialogProps {
  onRefresh: () => void;
}

export default function SessionFullDialog({ onRefresh }: SessionFullDialogProps) {
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        style={{
          backgroundColor: 'white',
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
              backgroundColor: '#fef3c7',
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
            color: '#1f2937',
          }}
        >
          Session Full
        </h2>

        {/* Message */}
        <p
          style={{
            fontSize: '16px',
            color: '#6b7280',
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
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = '#2563eb';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = '#3b82f6';
            }}
          >
            Refresh Page
          </button>
          <p
            style={{
              fontSize: '14px',
              color: '#9ca3af',
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
