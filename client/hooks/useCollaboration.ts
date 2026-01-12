import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { Stroke, CollaborationMessage, CanvasStateMessage, UserPresence, CursorUpdateMessage } from '@/types';

interface UseCollaborationProps {
  canvasId: string;
  userName: string;
  onStrokeAdded: (stroke: Stroke) => void;
  onStrokeRemoved: (strokeIds: string[]) => void;
  onCanvasCleared: () => void;
  onCanvasState: (strokes: Stroke[]) => void;
  onCursorUpdate?: (user: UserPresence) => void;
  onCursorStop?: (odeid: string) => void;
}

export function useCollaboration({
  canvasId,
  userName,
  onStrokeAdded,
  onStrokeRemoved,
  onCanvasCleared,
  onCanvasState,
  onCursorUpdate,
  onCursorStop,
}: UseCollaborationProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const socketRef = useRef<Socket | null>(null);
  const isLocalActionRef = useRef(false); // Prevent echo loops
  const lastCursorUpdateRef = useRef<number>(0); // For throttling cursor updates
  
  // Store callbacks in refs to avoid reconnecting when they change
  const callbacksRef = useRef({
    onStrokeAdded,
    onStrokeRemoved,
    onCanvasCleared,
    onCanvasState,
    onCursorUpdate,
    onCursorStop,
  });

  // Update callbacks ref when they change
  useEffect(() => {
    callbacksRef.current = {
      onStrokeAdded,
      onStrokeRemoved,
      onCanvasCleared,
      onCanvasState,
      onCursorUpdate,
      onCursorStop,
    };
  }, [onStrokeAdded, onStrokeRemoved, onCanvasCleared, onCanvasState, onCursorUpdate, onCursorStop]);

  useEffect(() => {
    if (!canvasId) {
      setIsInitializing(false);
      return;
    }

    // Reset initialization state when canvasId changes
    setIsInitializing(true);
    setError(null);

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001';
    const socket = io(wsUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Connected to WebSocket server');
      setIsConnected(true);
      setError(null); // Clear any previous errors on reconnect
      
      // Join the canvas room with user name
      socket.emit('join-canvas', { canvasId, userName });
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from WebSocket server');
      setIsConnected(false);
    });

    socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      setIsConnected(false);
    });

    // Handle initial canvas state
    socket.on('canvas-state', (data: CanvasStateMessage) => {
      if (data.canvasId === canvasId && data.strokes) {
        console.log('Received canvas state:', data.strokes.length, 'strokes');
        setIsInitializing(false); // User successfully joined, initialization complete
        isLocalActionRef.current = true; // Prevent echo
        callbacksRef.current.onCanvasState(data.strokes);
        setTimeout(() => {
          isLocalActionRef.current = false;
        }, 100);
      }
    });

    // Handle remote stroke added
    socket.on('stroke-added', (data: CollaborationMessage) => {
      if (data.canvasId === canvasId && data.stroke && !isLocalActionRef.current) {
        console.log('Received remote stroke:', data.stroke.id);
        callbacksRef.current.onStrokeAdded(data.stroke);
      }
    });

    // Handle remote stroke removed
    socket.on('stroke-removed', (data: CollaborationMessage) => {
      if (data.canvasId === canvasId && data.strokeIds && !isLocalActionRef.current) {
        console.log('Received remote stroke removal:', data.strokeIds);
        callbacksRef.current.onStrokeRemoved(data.strokeIds);
      }
    });

    // Handle remote canvas cleared
    socket.on('canvas-cleared', (data: CollaborationMessage) => {
      if (data.canvasId === canvasId && !isLocalActionRef.current) {
        console.log('Received remote canvas clear');
        callbacksRef.current.onCanvasCleared();
      }
    });

    // Handle remote cursor updates
    socket.on('cursor-update', (data: CursorUpdateMessage) => {
      if (data.canvasId === canvasId && callbacksRef.current.onCursorUpdate) {
        callbacksRef.current.onCursorUpdate(data.user);
      }
    });

    // Handle remote cursor stop
    socket.on('cursor-stop', (data: { odeid: string }) => {
      if (callbacksRef.current.onCursorStop) {
        callbacksRef.current.onCursorStop(data.odeid);
      }
    });

    socket.on('error', (error: { message: string }) => {
      console.error('WebSocket error:', error.message);
      setError(error.message);
      setIsConnected(false);
      setIsInitializing(false); // Error occurred, initialization complete (failed)
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [canvasId]); // Only depend on canvasId, not the callbacks

  // Send stroke added to server
  const sendStrokeAdded = useCallback(
    (stroke: Stroke) => {
      if (socketRef.current && socketRef.current.connected && canvasId) {
        isLocalActionRef.current = true;
        socketRef.current.emit('stroke-added', {
          canvasId,
          stroke,
          timestamp: Date.now(),
        });
        setTimeout(() => {
          isLocalActionRef.current = false;
        }, 100);
      }
    },
    [canvasId]
  );

  // Send stroke removed to server
  const sendStrokeRemoved = useCallback(
    (strokeIds: string[]) => {
      if (socketRef.current && socketRef.current.connected && canvasId) {
        isLocalActionRef.current = true;
        socketRef.current.emit('stroke-removed', {
          canvasId,
          strokeIds,
          timestamp: Date.now(),
        });
        setTimeout(() => {
          isLocalActionRef.current = false;
        }, 100);
      }
    },
    [canvasId]
  );

  // Send canvas cleared to server
  const sendCanvasCleared = useCallback(() => {
    if (socketRef.current && socketRef.current.connected && canvasId) {
      isLocalActionRef.current = true;
      socketRef.current.emit('canvas-cleared', {
        canvasId,
        timestamp: Date.now(),
      });
      setTimeout(() => {
        isLocalActionRef.current = false;
      }, 100);
    }
  }, [canvasId]);

  // Send cursor update to server (throttled to ~50ms)
  const sendCursorUpdate = useCallback(
    (position: { x: number; y: number }, isDrawing: boolean) => {
      const now = Date.now();
      // Throttle cursor updates to avoid flooding the server
      if (now - lastCursorUpdateRef.current < 50) {
        return;
      }
      lastCursorUpdateRef.current = now;

      if (socketRef.current?.connected && canvasId) {
        socketRef.current.emit('cursor-update', {
          canvasId,
          position,
          isDrawing,
        });
      }
    },
    [canvasId]
  );

  // Send cursor stop to server
  const sendCursorStop = useCallback(() => {
    if (socketRef.current?.connected && canvasId) {
      socketRef.current.emit('cursor-stop', { canvasId });
    }
  }, [canvasId]);

  return {
    isConnected,
    error,
    isInitializing,
    sendStrokeAdded,
    sendStrokeRemoved,
    sendCanvasCleared,
    sendCursorUpdate,
    sendCursorStop,
  };
}

