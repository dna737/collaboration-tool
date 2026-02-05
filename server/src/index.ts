import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
app.use(cors());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

// Maximum number of users per session
const MAX_USERS_PER_SESSION = 10;

// In-memory storage: Map<canvasId, CanvasObject[]>
const canvasStates = new Map<string, any[]>();

// Track users per canvas room: Map<canvasId, Map<socketId, UserInfo>>
const canvasUsers = new Map<string, Map<string, { nodeId: string; userName: string }>>();

// Helper to get or create canvas state
function getCanvasState(canvasId: string): any[] {
  if (!canvasStates.has(canvasId)) {
    canvasStates.set(canvasId, []);
  }
  return canvasStates.get(canvasId)!;
}

function normalizeObject(object: any): any | null {
  if (!object || !object.id) {
    return null;
  }
  if (!object.type) {
    return { ...object, type: 'stroke' };
  }
  return object;
}

function addObjectToCanvas(canvasId: string, object: any): any | null {
  const normalized = normalizeObject(object);
  if (!normalized) {
    return null;
  }

  const objects = getCanvasState(canvasId);
  if (!objects.find((o) => o.id === normalized.id)) {
    objects.push(normalized);
    return normalized;
  }
  return null;
}

function updateObjectInCanvas(canvasId: string, object: any): any | null {
  const normalized = normalizeObject(object);
  if (!normalized) {
    return null;
  }

  const objects = getCanvasState(canvasId);
  const index = objects.findIndex((o) => o.id === normalized.id);
  if (index !== -1) {
    objects[index] = normalized;
    return normalized;
  }

  objects.push(normalized);
  return normalized;
}

function removeObjectsFromCanvas(canvasId: string, objectIds: string[]): boolean {
  const objects = getCanvasState(canvasId);
  const initialLength = objects.length;

  objectIds.forEach((id) => {
    const index = objects.findIndex((o) => o.id === id);
    if (index !== -1) {
      objects.splice(index, 1);
    }
  });

  return objects.length !== initialLength;
}

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Join canvas room
  socket.on('join-canvas', (data: string | { canvasId: string; userName: string }) => {
    // Support both old format (string) and new format (object with userName)
    const canvasId = typeof data === 'string' ? data : data.canvasId;
    const userName = typeof data === 'string' ? `User ${socket.id.slice(0, 4)}` : data.userName;

    if (!canvasId || typeof canvasId !== 'string') {
      socket.emit('error', { message: 'Invalid canvas ID' });
      return;
    }

    // Check current room size before allowing join
    const room = io.sockets.adapter.rooms.get(canvasId);
    const currentUsers = room ? room.size : 0;

    console.log(`[DEBUG] Canvas ${canvasId}: Current users = ${currentUsers}, Max = ${MAX_USERS_PER_SESSION}`);

    if (currentUsers >= MAX_USERS_PER_SESSION) {
      socket.emit('error', { 
        message: `Session is full. Maximum ${MAX_USERS_PER_SESSION} users allowed per session.` 
      });
      console.log(`Client ${socket.id} rejected from canvas ${canvasId} - session full (${currentUsers}/${MAX_USERS_PER_SESSION})`);
      return;
    }

    socket.join(canvasId);
    
    // Track user in room
    if (!canvasUsers.has(canvasId)) {
      canvasUsers.set(canvasId, new Map());
    }
    canvasUsers.get(canvasId)!.set(socket.id, { nodeId: socket.id, userName });

    const newRoomSize = io.sockets.adapter.rooms.get(canvasId)?.size || 0;
    console.log(`Client ${socket.id} (${userName}) joined canvas ${canvasId} (${newRoomSize}/${MAX_USERS_PER_SESSION})`);

    // Send current canvas state to the new client
    const objects = getCanvasState(canvasId).map(normalizeObject).filter(Boolean);
    socket.emit('canvas-state', { canvasId, objects, strokes: objects });
  });

  // Handle object added (new)
  socket.on('object-added', (data: { canvasId: string; object: any }) => {
    const { canvasId, object } = data;

    if (!canvasId) {
      socket.emit('error', { message: 'Invalid canvas ID' });
      return;
    }

    const added = addObjectToCanvas(canvasId, object);
    if (!added) {
      socket.emit('error', { message: 'Invalid object data' });
      return;
    }

    // Broadcast to all other clients in the room (excluding sender)
    socket.to(canvasId).emit('object-added', { canvasId, object: added });
    if (added.type === 'stroke') {
      socket.to(canvasId).emit('stroke-added', { canvasId, stroke: added });
    }
  });

  // Handle object updated (new)
  socket.on('object-updated', (data: { canvasId: string; object: any }) => {
    const { canvasId, object } = data;

    if (!canvasId) {
      socket.emit('error', { message: 'Invalid canvas ID' });
      return;
    }

    const updated = updateObjectInCanvas(canvasId, object);
    if (!updated) {
      socket.emit('error', { message: 'Invalid object data' });
      return;
    }

    socket.to(canvasId).emit('object-updated', { canvasId, object: updated });
  });

  // Handle stroke added (legacy)
  socket.on('stroke-added', (data: { canvasId: string; stroke: any }) => {
    const { canvasId, stroke } = data;

    if (!canvasId) {
      socket.emit('error', { message: 'Invalid canvas ID' });
      return;
    }

    const added = addObjectToCanvas(canvasId, stroke);
    if (!added) {
      socket.emit('error', { message: 'Invalid stroke data' });
      return;
    }

    // Broadcast to all other clients in the room (excluding sender)
    socket.to(canvasId).emit('stroke-added', { canvasId, stroke: added });
    socket.to(canvasId).emit('object-added', { canvasId, object: added });
  });

  // Handle object removed (new)
  socket.on('object-removed', (data: { canvasId: string; objectIds: string[] }) => {
    const { canvasId, objectIds } = data;

    if (!canvasId || !Array.isArray(objectIds)) {
      socket.emit('error', { message: 'Invalid object removal data' });
      return;
    }

    const removed = removeObjectsFromCanvas(canvasId, objectIds);
    if (removed) {
      socket.to(canvasId).emit('object-removed', { canvasId, objectIds });
      socket.to(canvasId).emit('stroke-removed', { canvasId, strokeIds: objectIds });
    }
  });

  // Handle stroke removed (legacy)
  socket.on('stroke-removed', (data: { canvasId: string; strokeIds: string[] }) => {
    const { canvasId, strokeIds } = data;

    if (!canvasId || !Array.isArray(strokeIds)) {
      socket.emit('error', { message: 'Invalid stroke removal data' });
      return;
    }

    const removed = removeObjectsFromCanvas(canvasId, strokeIds);
    if (removed) {
      socket.to(canvasId).emit('stroke-removed', { canvasId, strokeIds });
      socket.to(canvasId).emit('object-removed', { canvasId, objectIds: strokeIds });
    }
  });

  // Handle canvas cleared
  socket.on('canvas-cleared', (data: { canvasId: string }) => {
    const { canvasId } = data;

    if (!canvasId) {
      socket.emit('error', { message: 'Invalid canvas ID' });
      return;
    }

    canvasStates.set(canvasId, []);
    socket.to(canvasId).emit('canvas-cleared', { canvasId });
  });

  // Handle cursor/drawing updates
  socket.on('cursor-update', (data: { canvasId: string; position: { x: number; y: number }; isDrawing: boolean; activeTool?: 'brush' | 'eraser' | 'select' }) => {
    const { canvasId, position, isDrawing, activeTool } = data;
    
    if (!canvasId || !position) {
      return; // Silently ignore invalid cursor updates
    }

    const userInfo = canvasUsers.get(canvasId)?.get(socket.id);
    
    if (userInfo) {
      // Broadcast to all OTHER users in the room
      socket.to(canvasId).emit('cursor-update', {
        canvasId,
        user: {
          nodeId: socket.id,
          userName: userInfo.userName,
          position,
          isDrawing,
          activeTool,
          timestamp: Date.now(),
        },
      });
    }
  });

  // Handle cursor stop (when user stops drawing or leaves canvas)
  socket.on('cursor-stop', (data: { canvasId: string }) => {
    if (data.canvasId) {
      socket.to(data.canvasId).emit('cursor-stop', { nodeId: socket.id });
    }
  });

  // Handle stroke progress (real-time streaming while drawing)
  socket.on('stroke-progress', (data: { 
    canvasId: string; 
    nodeIdStrokeId: string;
    stroke: { tool: string; color: string; size: number; points: { x: number; y: number }[] };
  }) => {
    const { canvasId, nodeIdStrokeId, stroke } = data;
    
    if (!canvasId || !nodeIdStrokeId || !stroke) {
      return; // Silently ignore invalid progress updates
    }

    const userInfo = canvasUsers.get(canvasId)?.get(socket.id);
    
    if (userInfo) {
      // Broadcast to all OTHER users in the room (no storage needed - ephemeral)
      socket.to(canvasId).emit('stroke-progress', {
        canvasId,
        nodeId: socket.id,
        nodeIdStrokeId,
        stroke,
        timestamp: Date.now(),
      });
    }
  });

  // Handle stroke progress end (when user stops drawing without completing)
  socket.on('stroke-progress-end', (data: { canvasId: string; nodeIdStrokeId: string }) => {
    const { canvasId, nodeIdStrokeId } = data;
    
    if (canvasId && nodeIdStrokeId) {
      socket.to(canvasId).emit('stroke-progress-end', {
        nodeId: socket.id,
        nodeIdStrokeId,
      });
    }
  });

  // Handle object move preview (real-time streaming while dragging selection)
  socket.on('object-move-preview', (data: { canvasId: string; objects: any[] }) => {
    const { canvasId, objects } = data;

    if (!canvasId || !Array.isArray(objects)) {
      return; // Silently ignore invalid preview updates
    }

    socket.to(canvasId).emit('object-move-preview', {
      canvasId,
      nodeId: socket.id,
      objects,
      timestamp: Date.now(),
    });
  });

  // Handle object move preview end (when user releases selection)
  socket.on('object-move-preview-end', (data: { canvasId: string }) => {
    const { canvasId } = data;

    if (canvasId) {
      socket.to(canvasId).emit('object-move-preview-end', {
        canvasId,
        nodeId: socket.id,
        timestamp: Date.now(),
      });
    }
  });

  // Handle eraser preview (real-time streaming of objects that will be erased)
  socket.on('eraser-preview', (data: { canvasId: string; strokeIds?: string[]; objectIds?: string[] }) => {
    const { canvasId } = data;
    const objectIds = data.objectIds ?? data.strokeIds;
    
    if (!canvasId || !Array.isArray(objectIds)) {
      return; // Silently ignore invalid eraser preview updates
    }

    // Broadcast to all OTHER users in the room (no storage needed - ephemeral)
    socket.to(canvasId).emit('eraser-preview', {
      canvasId,
      nodeId: socket.id,
      objectIds,
      strokeIds: objectIds,
      timestamp: Date.now(),
    });
  });

  // Handle eraser preview end (when user releases eraser or leaves canvas)
  socket.on('eraser-preview-end', (data: { canvasId: string }) => {
    const { canvasId } = data;
    
    if (canvasId) {
      socket.to(canvasId).emit('eraser-preview-end', {
        nodeId: socket.id,
      });
    }
  });

  // Handle disconnect - clean up user presence
  socket.on('disconnect', () => {
    // Remove user from all canvas rooms and notify others
    canvasUsers.forEach((users, canvasId) => {
      if (users.has(socket.id)) {
        users.delete(socket.id);
        io.to(canvasId).emit('cursor-stop', { nodeId: socket.id });
        io.to(canvasId).emit('eraser-preview-end', { nodeId: socket.id });
      }
    });
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`WebSocket server running on port ${PORT}`);
});


