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

// In-memory storage: Map<canvasId, Stroke[]>
const canvasStates = new Map<string, any[]>();

// Helper to get or create canvas state
function getCanvasState(canvasId: string): any[] {
  if (!canvasStates.has(canvasId)) {
    canvasStates.set(canvasId, []);
  }
  return canvasStates.get(canvasId)!;
}

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Join canvas room
  socket.on('join-canvas', (canvasId: string) => {
    if (!canvasId || typeof canvasId !== 'string') {
      socket.emit('error', { message: 'Invalid canvas ID' });
      return;
    }

    socket.join(canvasId);
    console.log(`Client ${socket.id} joined canvas ${canvasId}`);

    // Send current canvas state to the new client
    const strokes = getCanvasState(canvasId);
    socket.emit('canvas-state', { canvasId, strokes });
  });

  // Handle stroke added
  socket.on('stroke-added', (data: { canvasId: string; stroke: any }) => {
    const { canvasId, stroke } = data;

    if (!canvasId || !stroke || !stroke.id) {
      socket.emit('error', { message: 'Invalid stroke data' });
      return;
    }

    const strokes = getCanvasState(canvasId);
    
    // Check if stroke already exists (prevent duplicates)
    if (!strokes.find((s) => s.id === stroke.id)) {
      strokes.push(stroke);
      // Broadcast to all other clients in the room (excluding sender)
      socket.to(canvasId).emit('stroke-added', { canvasId, stroke });
    }
  });

  // Handle stroke removed (eraser)
  socket.on('stroke-removed', (data: { canvasId: string; strokeIds: string[] }) => {
    const { canvasId, strokeIds } = data;

    if (!canvasId || !Array.isArray(strokeIds)) {
      socket.emit('error', { message: 'Invalid stroke removal data' });
      return;
    }

    const strokes = getCanvasState(canvasId);
    const initialLength = strokes.length;
    
    // Remove strokes by ID
    strokeIds.forEach((id) => {
      const index = strokes.findIndex((s) => s.id === id);
      if (index !== -1) {
        strokes.splice(index, 1);
      }
    });

    // Only broadcast if something was actually removed
    if (strokes.length !== initialLength) {
      socket.to(canvasId).emit('stroke-removed', { canvasId, strokeIds });
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

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`WebSocket server running on port ${PORT}`);
});

