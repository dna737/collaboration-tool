# Collaboration Server

WebSocket server for real-time canvas collaboration.

## Setup

1. Install dependencies:
```bash
npm install
```

## Development

Run the server in development mode (with hot reload):
```bash
npm run dev
```

The server will start on port 3001 by default.

## Production

Build the TypeScript code:
```bash
npm run build
```

Start the production server:
```bash
npm start
```

## Environment Variables

- `PORT`: Server port (default: 3001)
- `CLIENT_URL`: Allowed CORS origin (default: http://localhost:3000)

## Architecture

The server uses Socket.io for WebSocket communication and stores canvas states in memory. Each canvas is identified by a unique ID, and clients join "rooms" based on canvas ID.

### WebSocket Events

- `join-canvas`: Client joins a canvas room, receives current state
- `stroke-added`: Client adds a stroke, broadcast to others
- `stroke-removed`: Client erases strokes, broadcast removal
- `canvas-cleared`: Client clears canvas, broadcast clear
- `error`: Connection/validation errors

