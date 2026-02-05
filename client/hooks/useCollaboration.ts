import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  CanvasObject,
  CanvasStateMessage,
  ObjectAddedMessage,
  ObjectRemovedMessage,
  ObjectUpdatedMessage,
  UserPresence,
  CursorUpdateMessage,
  StrokeProgressMessage,
  InProgressStroke,
  EraserPreviewMessage,
  ObjectMovePreviewMessage,
  ObjectMovePreviewEndMessage,
  AssetUploadStartMessage,
  AssetUploadChunkMessage,
  AssetUploadCompleteMessage,
  AssetAvailableMessage,
  AssetRequestMessage,
  AssetChunkMessage,
  AssetCompleteMessage,
} from '@/types';

interface UseCollaborationProps {
  canvasId: string;
  userName: string;
  onObjectAdded: (object: CanvasObject) => void;
  onObjectRemoved: (objectIds: string[]) => void;
  onObjectUpdated?: (object: CanvasObject) => void;
  onCanvasCleared: () => void;
  onCanvasState: (objects: CanvasObject[]) => void;
  onCursorUpdate?: (user: UserPresence) => void;
  onCursorStop?: (nodeId: string) => void;
  onStrokeProgress?: (progressData: InProgressStroke) => void;
  onStrokeProgressEnd?: (nodeId: string, nodeIdStrokeId: string) => void;
  onObjectMovePreview?: (nodeId: string, objects: CanvasObject[]) => void;
  onObjectMovePreviewEnd?: (nodeId: string) => void;
  onEraserPreview?: (nodeId: string, objectIds: string[]) => void;
  onEraserPreviewEnd?: (nodeId: string) => void;
  onAssetAvailable?: (assetId: string) => void;
  onAssetChunk?: (assetId: string, seq: number, bytes: ArrayBuffer) => void;
  onAssetComplete?: (assetId: string, totalBytes: number) => void;
}

export function useCollaboration({
  canvasId,
  userName,
  onObjectAdded,
  onObjectRemoved,
  onObjectUpdated,
  onCanvasCleared,
  onCanvasState,
  onCursorUpdate,
  onCursorStop,
  onStrokeProgress,
  onStrokeProgressEnd,
  onObjectMovePreview,
  onObjectMovePreviewEnd,
  onEraserPreview,
  onEraserPreviewEnd,
  onAssetAvailable,
  onAssetChunk,
  onAssetComplete,
}: UseCollaborationProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const socketRef = useRef<Socket | null>(null);
  const isLocalActionRef = useRef(false); // Prevent echo loops for canvas objects
  const lastCursorUpdateRef = useRef<number>(0); // For throttling cursor updates
  const lastStrokeProgressRef = useRef<number>(0); // For throttling stroke progress updates
  const lastEraserPreviewRef = useRef<number>(0); // For throttling eraser preview updates
  const lastObjectMovePreviewRef = useRef<number>(0); // For throttling move preview updates
  
  // Store callbacks in refs to avoid reconnecting when they change
  const callbacksRef = useRef({
    onObjectAdded,
    onObjectRemoved,
    onObjectUpdated,
    onCanvasCleared,
    onCanvasState,
    onCursorUpdate,
    onCursorStop,
    onStrokeProgress,
    onStrokeProgressEnd,
    onObjectMovePreview,
    onObjectMovePreviewEnd,
    onEraserPreview,
    onEraserPreviewEnd,
    onAssetAvailable,
    onAssetChunk,
    onAssetComplete,
  });

  // Update callbacks ref when they change
  useEffect(() => {
    callbacksRef.current = {
      onObjectAdded,
      onObjectRemoved,
      onObjectUpdated,
      onCanvasCleared,
      onCanvasState,
      onCursorUpdate,
      onCursorStop,
      onStrokeProgress,
      onStrokeProgressEnd,
      onObjectMovePreview,
      onObjectMovePreviewEnd,
      onEraserPreview,
      onEraserPreviewEnd,
      onAssetAvailable,
      onAssetChunk,
      onAssetComplete,
    };
  }, [onObjectAdded, onObjectRemoved, onObjectUpdated, onCanvasCleared, onCanvasState, onCursorUpdate, onCursorStop, onStrokeProgress, onStrokeProgressEnd, onObjectMovePreview, onObjectMovePreviewEnd, onEraserPreview, onEraserPreviewEnd, onAssetAvailable, onAssetChunk, onAssetComplete]);

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
      setError(error?.message || 'Unable to connect to collaboration server');
      setIsInitializing(false);
    });

    // Handle initial canvas state
    socket.on('canvas-state', (data: CanvasStateMessage) => {
      if (data.canvasId === canvasId && Array.isArray(data.objects)) {
        setIsInitializing(false); // User successfully joined, initialization complete
        isLocalActionRef.current = true; // Prevent echo
        callbacksRef.current.onCanvasState(data.objects);
        setTimeout(() => {
          isLocalActionRef.current = false;
        }, 100);
      }
    });

    // Handle remote object added
    socket.on('object-added', (data: ObjectAddedMessage) => {
      if (data.canvasId === canvasId && data.object && !isLocalActionRef.current) {
        callbacksRef.current.onObjectAdded(data.object);
      }
    });

    // Handle remote object removed
    socket.on('object-removed', (data: ObjectRemovedMessage) => {
      if (data.canvasId === canvasId && Array.isArray(data.objectIds) && !isLocalActionRef.current) {
        callbacksRef.current.onObjectRemoved(data.objectIds);
      }
    });

    // Handle remote object updated
    socket.on('object-updated', (data: ObjectUpdatedMessage) => {
      if (data.canvasId === canvasId && data.object && callbacksRef.current.onObjectUpdated) {
        callbacksRef.current.onObjectUpdated(data.object);
      }
    });

    // Handle remote canvas cleared
    socket.on('canvas-cleared', (data: { canvasId: string }) => {
      if (data.canvasId === canvasId && !isLocalActionRef.current) {
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
    socket.on('cursor-stop', (data: { nodeId: string }) => {
      if (callbacksRef.current.onCursorStop) {
        callbacksRef.current.onCursorStop(data.nodeId);
      }
    });

    // Handle remote stroke progress (real-time streaming)
    socket.on('stroke-progress', (data: StrokeProgressMessage) => {
      if (data.canvasId === canvasId && callbacksRef.current.onStrokeProgress) {
        callbacksRef.current.onStrokeProgress({
          nodeId: data.nodeId,
          nodeIdStrokeId: data.nodeIdStrokeId,
          tool: data.stroke.tool,
          color: data.stroke.color,
          size: data.stroke.size,
          points: data.stroke.points,
          timestamp: data.timestamp,
        });
      }
    });

    // Handle remote stroke progress end
    socket.on('stroke-progress-end', (data: { nodeId: string; nodeIdStrokeId: string }) => {
      if (callbacksRef.current.onStrokeProgressEnd) {
        callbacksRef.current.onStrokeProgressEnd(data.nodeId, data.nodeIdStrokeId);
      }
    });

    // Handle remote object move preview (real-time streaming while dragging)
    socket.on('object-move-preview', (data: ObjectMovePreviewMessage) => {
      if (data.canvasId === canvasId && data.nodeId && callbacksRef.current.onObjectMovePreview) {
        callbacksRef.current.onObjectMovePreview(data.nodeId, data.objects);
      }
    });

    // Handle remote object move preview end
    socket.on('object-move-preview-end', (data: ObjectMovePreviewEndMessage) => {
      if (data.canvasId === canvasId && data.nodeId && callbacksRef.current.onObjectMovePreviewEnd) {
        callbacksRef.current.onObjectMovePreviewEnd(data.nodeId);
      }
    });

    // Handle remote eraser preview (real-time streaming of objects to be erased)
    socket.on('eraser-preview', (data: EraserPreviewMessage) => {
      if (data.canvasId === canvasId && callbacksRef.current.onEraserPreview) {
        callbacksRef.current.onEraserPreview(data.nodeId, data.objectIds);
      }
    });

    // Handle remote eraser preview end
    socket.on('eraser-preview-end', (data: { nodeId: string }) => {
      if (callbacksRef.current.onEraserPreviewEnd) {
        callbacksRef.current.onEraserPreviewEnd(data.nodeId);
      }
    });

    // Assets: server indicates an asset is available in memory (after upload)
    socket.on('asset-available', (data: AssetAvailableMessage) => {
      if (data.canvasId === canvasId && callbacksRef.current.onAssetAvailable) {
        callbacksRef.current.onAssetAvailable(data.assetId);
      }
    });

    // Assets: incoming chunk for an asset request
    socket.on('asset-chunk', (data: AssetChunkMessage) => {
      if (data.canvasId === canvasId && callbacksRef.current.onAssetChunk) {
        callbacksRef.current.onAssetChunk(data.assetId, data.seq, data.bytes);
      }
    });

    // Assets: completed asset transfer
    socket.on('asset-complete', (data: AssetCompleteMessage) => {
      if (data.canvasId === canvasId && callbacksRef.current.onAssetComplete) {
        callbacksRef.current.onAssetComplete(data.assetId, data.totalBytes);
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

  // Send object added to server
  const sendObjectAdded = useCallback(
    (object: CanvasObject) => {
      if (socketRef.current && socketRef.current.connected && canvasId) {
        isLocalActionRef.current = true;
        socketRef.current.emit('object-added', {
          canvasId,
          object,
          timestamp: Date.now(),
        } satisfies ObjectAddedMessage);
        setTimeout(() => {
          isLocalActionRef.current = false;
        }, 100);
      }
    },
    [canvasId]
  );

  // Send object removed to server
  const sendObjectRemoved = useCallback(
    (objectIds: string[]) => {
      if (socketRef.current && socketRef.current.connected && canvasId) {
        isLocalActionRef.current = true;
        socketRef.current.emit('object-removed', {
          canvasId,
          objectIds,
          timestamp: Date.now(),
        } satisfies ObjectRemovedMessage);
        setTimeout(() => {
          isLocalActionRef.current = false;
        }, 100);
      }
    },
    [canvasId]
  );

  // Send object updated to server
  const sendObjectUpdated = useCallback(
    (object: CanvasObject) => {
      if (socketRef.current && socketRef.current.connected && canvasId) {
        socketRef.current.emit('object-updated', {
          canvasId,
          object,
          timestamp: Date.now(),
        } satisfies ObjectUpdatedMessage);
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

  // Assets: upload start
  const sendAssetUploadStart = useCallback(
    (payload: AssetUploadStartMessage) => {
      if (socketRef.current?.connected && canvasId) {
        socketRef.current.emit('asset-upload-start', payload);
      }
    },
    [canvasId]
  );

  // Assets: upload chunk
  const sendAssetUploadChunk = useCallback(
    (payload: AssetUploadChunkMessage) => {
      if (socketRef.current?.connected && canvasId) {
        socketRef.current.emit('asset-upload-chunk', payload);
      }
    },
    [canvasId]
  );

  // Assets: upload complete
  const sendAssetUploadComplete = useCallback(
    (payload: AssetUploadCompleteMessage) => {
      if (socketRef.current?.connected && canvasId) {
        socketRef.current.emit('asset-upload-complete', payload);
      }
    },
    [canvasId]
  );

  // Assets: request
  const sendAssetRequest = useCallback(
    (payload: AssetRequestMessage) => {
      if (socketRef.current?.connected && canvasId) {
        socketRef.current.emit('asset-request', payload);
      }
    },
    [canvasId]
  );

  // Send cursor update to server (throttled to ~50ms)
  const sendCursorUpdate = useCallback(
    (position: { x: number; y: number }, isDrawing: boolean, activeTool?: 'brush' | 'eraser' | 'select') => {
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
          activeTool,
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

  // Send stroke progress to server (throttled to ~50ms)
  const sendStrokeProgress = useCallback(
    (nodeIdStrokeId: string, stroke: { tool: 'brush' | 'eraser'; color: string; size: number; points: { x: number; y: number }[] }) => {
      const now = Date.now();
      // Throttle stroke progress updates to avoid flooding the server
      if (now - lastStrokeProgressRef.current < 50) {
        return;
      }
      lastStrokeProgressRef.current = now;

      if (socketRef.current?.connected && canvasId) {
        socketRef.current.emit('stroke-progress', {
          canvasId,
          nodeIdStrokeId,
          stroke,
        });
      }
    },
    [canvasId]
  );

  // Send stroke progress end to server
  const sendStrokeProgressEnd = useCallback(
    (nodeIdStrokeId: string) => {
      if (socketRef.current?.connected && canvasId) {
        socketRef.current.emit('stroke-progress-end', {
          canvasId,
          nodeIdStrokeId,
        });
      }
    },
    [canvasId]
  );

  // Send object move preview to server (throttled to ~50ms)
  const sendObjectMovePreview = useCallback(
    (objects: CanvasObject[]) => {
      const now = Date.now();
      if (now - lastObjectMovePreviewRef.current < 50) {
        return;
      }
      lastObjectMovePreviewRef.current = now;

      if (socketRef.current?.connected && canvasId) {
        socketRef.current.emit('object-move-preview', {
          canvasId,
          objects,
        } satisfies ObjectMovePreviewMessage);
      }
    },
    [canvasId]
  );

  // Send object move preview end to server
  const sendObjectMovePreviewEnd = useCallback(() => {
    if (socketRef.current?.connected && canvasId) {
      socketRef.current.emit('object-move-preview-end', {
        canvasId,
      } satisfies ObjectMovePreviewEndMessage);
    }
  }, [canvasId]);

  // Send eraser preview to server (throttled to ~50ms)
  const sendEraserPreview = useCallback(
    (objectIds: string[]) => {
      const now = Date.now();
      // Throttle eraser preview updates to avoid flooding the server
      if (now - lastEraserPreviewRef.current < 50) {
        return;
      }
      lastEraserPreviewRef.current = now;

      if (socketRef.current?.connected && canvasId) {
        socketRef.current.emit('eraser-preview', {
          canvasId,
          objectIds,
        });
      }
    },
    [canvasId]
  );

  // Send eraser preview end to server
  const sendEraserPreviewEnd = useCallback(() => {
    if (socketRef.current?.connected && canvasId) {
      socketRef.current.emit('eraser-preview-end', {
        canvasId,
      });
    }
  }, [canvasId]);

  return {
    isConnected,
    error,
    isInitializing,
    sendObjectAdded,
    sendObjectRemoved,
    sendObjectUpdated,
    sendCanvasCleared,
    sendCursorUpdate,
    sendCursorStop,
    sendStrokeProgress,
    sendStrokeProgressEnd,
    sendObjectMovePreview,
    sendObjectMovePreviewEnd,
    sendEraserPreview,
    sendEraserPreviewEnd,
    sendAssetUploadStart,
    sendAssetUploadChunk,
    sendAssetUploadComplete,
    sendAssetRequest,
  };
}

