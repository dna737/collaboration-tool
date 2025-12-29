# Canvas Drawing App

A minimal drawing application inspired by Excalidraw, built with Next.js and browser localStorage.

## Features

- **Real-time Collaboration**: Share canvas URLs to collaborate with others instantly
- **Drawing Tools**: Brush and eraser with customizable size and color
- **Auto-save**: Continuous persistence to browser localStorage (500ms debounce)
- **Session Restoration**: Resume exactly where you left off
- **Keyboard Shortcuts**: Quick tool switching with B (Brush), E (Eraser), C (Clear)
- **Connection Status**: Visual indicator showing WebSocket connection state

## Getting Started

### Prerequisites

- Node.js 18+ installed
- npm or yarn package manager

### Installation

1. Install all dependencies (root, client, and server):

```bash
npm run install:all
```

Or install them separately:

```bash
# Root dependencies (if any)
npm install

# Client dependencies
npm install --prefix client

# Server dependencies
npm install --prefix server
```

2. Run both servers:

**Terminal 1 - Frontend (Next.js):**
```bash
npm run dev
```

**Terminal 2 - Backend (WebSocket server):**
```bash
npm run server
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

The app will automatically create a new canvas with a unique ID. Share the URL to collaborate with others in real-time!

## Project Structure

```
collaboration-tool/
├── client/              # Next.js frontend application
│   ├── app/             # Next.js app router
│   │   ├── canvas/[id]/ # Dynamic canvas route
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/     # React components
│   │   ├── Canvas.tsx
│   │   └── Toolbar.tsx
│   ├── hooks/          # Custom React hooks
│   │   ├── useCanvas.ts
│   │   ├── useCollaboration.ts
│   │   └── useLocalStorage.ts
│   ├── lib/            # Utility functions
│   │   ├── storage.ts
│   │   └── canvas-utils.ts
│   ├── types/          # TypeScript types
│   │   └── index.ts
│   ├── package.json
│   ├── tsconfig.json
│   └── next.config.js
└── server/             # WebSocket server
    ├── src/
    │   └── index.ts
    ├── package.json
    └── tsconfig.json
```

## How It Works

### Drawing Flow

1. User selects a tool (brush or eraser) from the toolbar
2. User clicks and drags on the canvas
3. Mouse events capture drawing points
4. Canvas renders stroke in real-time
5. Stroke is saved to the strokes array
6. After 500ms of inactivity, strokes are auto-saved to localStorage

### Eraser Tool

The eraser removes intersecting strokes from the strokes array by detecting collision between the eraser path and existing stroke points, providing cleaner results than simply drawing with background color.

### Data Persistence

- All strokes are stored as a JSON array in localStorage under the key `canvas-app:strokes`
- Data is automatically loaded when the app opens
- Debounced auto-save prevents excessive storage operations

## Keyboard Shortcuts

- **B**: Switch to Brush tool
- **E**: Switch to Eraser tool
- **C**: Clear canvas (via Clear button)

## Building for Production

**Client:**
```bash
npm run build
npm start
```

**Server:**
```bash
npm run server:build
npm run server:start
```

## Deployment

### Client (Next.js)
Deploy the client to:
- **Vercel** (recommended): Connect your GitHub repo and set the root directory to `client/`
- **Static hosting**: Export with `output: 'export'` in `client/next.config.js` and deploy the `out/` directory

### Server (WebSocket)
Deploy the server to:
- **Railway**: Connect your GitHub repo and set the root directory to `server/`
- **Render**: Set build command to `cd server && npm install && npm run build` and start command to `cd server && npm start`
- **Heroku**: Set the root directory to `server/`

Both client and server need to be deployed separately. Update the `NEXT_PUBLIC_WS_URL` environment variable in the client to point to your deployed server URL.

## Future Enhancements

- Undo/Redo functionality
- Additional shape tools (rectangle, circle, line)
- Zoom and pan controls
- Export to PNG/JPEG
- Multiple canvas panels
- Real-time collaboration

## Technology Stack

- **Next.js 14+**: React framework with TypeScript
- **HTML5 Canvas API**: Native 2D drawing
- **localStorage**: Client-side persistence
- **React Hooks**: State management (useState, useEffect)

## License

MIT
