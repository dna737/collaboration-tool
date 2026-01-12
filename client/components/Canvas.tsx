'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useCanvas } from '@/hooks/useCanvas';
import { Tool, UserPresence } from '@/types';

interface CanvasProps {
  canvasId?: string;
  userName: string;
  activeTool: Tool;
  brushSize: number;
  brushColor: string;
  onClear: () => void;
  onErrorChange?: (error: string | null) => void;
  onInitializingChange?: (isInitializing: boolean) => void;
}

interface TrailPoint {
  x: number;
  y: number;
  timestamp: number;
}

export default function Canvas({ canvasId, userName, activeTool, brushSize, brushColor, onClear, onErrorChange, onInitializingChange }: CanvasProps) {
  // State for remote user cursors
  const [remoteCursors, setRemoteCursors] = useState<Map<string, UserPresence>>(new Map());

  // Handle cursor update from other users
  const handleCursorUpdate = useCallback((user: UserPresence) => {
    setRemoteCursors(prev => new Map(prev).set(user.odeid, user));
  }, []);

  // Handle cursor stop from other users
  const handleCursorStop = useCallback((odeid: string) => {
    setRemoteCursors(prev => {
      const next = new Map(prev);
      next.delete(odeid);
      return next;
    });
  }, []);

  const {
    canvasRef,
    isConnected,
    error,
    isInitializing,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleMouseLeave,
    clearCanvas,
  } = useCanvas({ 
    canvasId, 
    userName,
    activeTool, 
    brushSize, 
    brushColor,
    onCursorUpdate: handleCursorUpdate,
    onCursorStop: handleCursorStop,
  });

  // Clean up stale cursors (cursors not updated in 3 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setRemoteCursors(prev => {
        const next = new Map(prev);
        let changed = false;
        prev.forEach((cursor, odeid) => {
          if (now - cursor.timestamp > 3000) {
            next.delete(odeid);
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Notify parent of error and initialization state changes
  useEffect(() => {
    if (onErrorChange) {
      onErrorChange(error);
    }
  }, [error, onErrorChange]);

  useEffect(() => {
    if (onInitializingChange) {
      onInitializingChange(isInitializing);
    }
  }, [isInitializing, onInitializingChange]);

  const [mousePosition, setMousePosition] = useState<{ x: number; y: number } | null>(null);
  const [trail, setTrail] = useState<TrailPoint[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const pendingTrailPoints = useRef<TrailPoint[]>([]);

  // Animate trail with delay - points lag behind cursor
  useEffect(() => {
    const animateTrail = () => {
      const now = Date.now();
      
      // Move points from pending to trail with delay (30ms delay per point for smoother flow)
      setTrail((prev) => {
        const newTrail = [...prev];
        const delay = 30; // 30ms delay between each trail point
        
        // Add pending points that are old enough
        pendingTrailPoints.current = pendingTrailPoints.current.filter((point) => {
          if (now - point.timestamp >= delay) {
            newTrail.push(point);
            return false;
          }
          return true;
        });
        
        // Keep last 50 points for long trail (like Excalidraw)
        return newTrail.slice(-50);
      });
      
      // Fade out old trail points gradually
      setTrail((prev) => {
        return prev.filter((point) => {
          const age = now - point.timestamp;
          return age < 800; // Keep points for 800ms for longer visibility
        });
      });
      
      if (isDragging || trail.length > 0 || pendingTrailPoints.current.length > 0) {
        animationFrameRef.current = requestAnimationFrame(animateTrail);
      }
    };

    if (activeTool === 'eraser' && isDragging) {
      animationFrameRef.current = requestAnimationFrame(animateTrail);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [activeTool, isDragging, trail.length]);

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isConnected || error) return;
    handleMouseDown(e);
    if (activeTool === 'eraser') {
      setIsDragging(true);
      setTrail([]);
      pendingTrailPoints.current = [];
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isConnected || error) return;
    handleMouseMove(e);
    
    if (activeTool === 'eraser' && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const position = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
      
      setMousePosition(position);
      
      // Only add to trail when dragging
      if (isDragging) {
        // Add to pending points (will be added to trail with delay)
        pendingTrailPoints.current.push({
          ...position,
          timestamp: Date.now(),
        });
        // Keep more pending points for longer trail
        pendingTrailPoints.current = pendingTrailPoints.current.slice(-60);
      }
    }
  };

  const handleCanvasMouseUp = () => {
    handleMouseUp();
    if (activeTool === 'eraser') {
      setIsDragging(false);
    }
  };

  const handleCanvasMouseLeave = () => {
    handleMouseLeave();
    setMousePosition(null);
    setIsDragging(false);
    setTrail([]);
    pendingTrailPoints.current = [];
  };

  const handleClearClick = () => {
    if (!isConnected || error) return;
    if (window.confirm('Are you sure you want to clear the canvas? This cannot be undone.')) {
      clearCanvas();
      onClear();
    }
  };

  const getOpacity = (timestamp: number, index: number, total: number) => {
    const age = Date.now() - timestamp;
    // Base opacity fades from 0.5 to 0 over 800ms
    const timeOpacity = Math.max(0, 0.5 * (1 - age / 800));
    
    // Distance-based opacity (further from cursor = more faded)
    const distanceOpacity = 1 - (index / total) * 0.7;
    
    return timeOpacity * distanceOpacity;
  };

  // Check if canvas is disabled (not connected or has error)
  const isDisabled = !isConnected || !!error;

  return (
    <div className="canvas-container" ref={containerRef} style={{ position: 'relative', display: 'inline-block' }}>
      {/* Connection status indicator */}
      {canvasId && (
        <div
          style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            padding: '6px 12px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: '500',
            zIndex: 100,
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          }}
        >
          <div
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: isConnected ? '#10b981' : '#ef4444',
            }}
          />
          <span style={{ color: isConnected ? '#10b981' : '#ef4444' }}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      )}
      {/* Error message */}
      {error && (
        <div
          style={{
            position: 'absolute',
            top: '50px',
            right: '10px',
            backgroundColor: '#fee2e2',
            border: '1px solid #fca5a5',
            color: '#991b1b',
            padding: '12px 16px',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '500',
            zIndex: 100,
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            maxWidth: '300px',
          }}
        >
          <div style={{ fontWeight: '600', marginBottom: '4px' }}>⚠️ Connection Error</div>
          <div>{error}</div>
        </div>
      )}
      <canvas
        ref={canvasRef}
        width={1200}
        height={800}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleCanvasMouseMove}
        onMouseUp={handleCanvasMouseUp}
        onMouseLeave={handleCanvasMouseLeave}
        style={{
          border: '2px solid #ddd',
          cursor: isDisabled ? 'not-allowed' : (activeTool === 'brush' ? 'crosshair' : 'none'),
          backgroundColor: 'white',
          opacity: isDisabled ? 0.7 : 1,
        }}
      />
      {/* Disabled overlay */}
      {isDisabled && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(255, 255, 255, 0.3)',
            pointerEvents: 'none',
            zIndex: 5,
          }}
        />
      )}
      {activeTool === 'eraser' && (
        <>
          {/* Render long trail shadows - only when dragging */}
          {isDragging && trail.map((point, index) => {
            const opacity = getOpacity(point.timestamp, index, trail.length);
            if (opacity <= 0) return null;
            
            // Calculate size - smaller circles further back
            const size = 8 + (index / trail.length) * 4; // 8px to 12px
            
            return (
              <div
                key={`${point.x}-${point.y}-${point.timestamp}`}
                style={{
                  position: 'absolute',
                  left: point.x,
                  top: point.y,
                  width: size,
                  height: size,
                  borderRadius: '100%',
                  backgroundColor: `rgba(0, 0, 0, ${opacity * 0.3})`,
                  boxShadow: `0 0 ${8 + index * 0.3}px rgba(0, 0, 0, ${opacity * 0.5})`,
                  pointerEvents: 'none',
                  transform: 'translate(-50%, -50%)',
                  zIndex: 9 - Math.floor(index / 5), // Group z-index for performance
                }}
              />
            );
          })}
          {/* Main cursor */}
          {mousePosition && (
            <div
              style={{
                position: 'absolute',
                left: mousePosition.x,
                top: mousePosition.y,
                width: 15,
                height: 15,
                borderRadius: '100%',
                border: '2px solid #666',
                backgroundColor: 'transparent',
                pointerEvents: 'none',
                transform: 'translate(-50%, -50%)',
                zIndex: 10,
              }}
            />
          )}
        </>
      )}
      {/* Remote user cursor flares */}
      {Array.from(remoteCursors.values()).map((cursor) => (
        cursor.isDrawing && (
          <div
            key={cursor.odeid}
            style={{
              position: 'absolute',
              left: cursor.position.x,
              top: cursor.position.y,
              transform: 'translate(-50%, -100%)',
              pointerEvents: 'none',
              zIndex: 50,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            {/* Flare glow effect */}
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                backgroundColor: '#3b82f6',
                boxShadow: '0 0 12px 4px rgba(59, 130, 246, 0.6)',
                animation: 'pulse 1.5s ease-in-out infinite',
              }}
            />
            {/* User name label */}
            <div
              style={{
                marginTop: 4,
                padding: '2px 8px',
                backgroundColor: '#3b82f6',
                color: 'white',
                fontSize: 11,
                fontWeight: 500,
                borderRadius: 4,
                whiteSpace: 'nowrap',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
              }}
            >
              {cursor.userName}
            </div>
          </div>
        )
      ))}
      {/* Pulse animation styles */}
      <style jsx>{`
        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.3);
            opacity: 0.7;
          }
        }
      `}</style>
      <button
        onClick={handleClearClick}
        disabled={isDisabled}
        style={{
          marginTop: '10px',
          padding: '8px 16px',
          backgroundColor: isDisabled ? '#9ca3af' : '#ef4444',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: isDisabled ? 'not-allowed' : 'pointer',
          opacity: isDisabled ? 0.6 : 1,
        }}
      >
        Clear Canvas
      </button>
    </div>
  );
}
