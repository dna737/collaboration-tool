import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { Stroke, CollaborationMessage, CanvasStateMessage } from '@/types';

interface UseCollaborationProps {
  canvasId: string;
  onStrokeAdded: (stroke: Stroke) => void;
  onStrokeRemoved: (strokeIds: string[]) => void;
  onCanvasCleared: () => void;
  onCanvasState: (strokes: Stroke[]) => void;
}

export function useCollaboration({
  canvasId,
  onStrokeAdded,
  onStrokeRemoved,
  onCanvasCleared,
  onCanvasState,
}: UseCollaborationProps) {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const isLocalActionRef = useRef(false); // Prevent echo loops
  
  // Store callbacks in refs to avoid reconnecting when they change
  const callbacksRef = useRef({
    onStrokeAdded,
    onStrokeRemoved,
    onCanvasCleared,
    onCanvasState,
  });

  // Update callbacks ref when they change
  useEffect(() => {
    callbacksRef.current = {
      onStrokeAdded,
      onStrokeRemoved,
      onCanvasCleared,
      onCanvasState,
    };
  }, [onStrokeAdded, onStrokeRemoved, onCanvasCleared, onCanvasState]);

  useEffect(() => {
    if (!canvasId) return;

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
      
      // Join the canvas room
      socket.emit('join-canvas', canvasId);
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

    socket.on('error', (error: { message: string }) => {
      console.error('WebSocket error:', error.message);
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

  return {
    isConnected,
    sendStrokeAdded,
    sendStrokeRemoved,
    sendCanvasCleared,
  };
}

