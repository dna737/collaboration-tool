# Canvas Drawing App

A minimal drawing application inspired by Excalidraw, built with Next.js and browser localStorage.

## Features

- **Single Canvas**: One drawing surface that persists across sessions
- **Drawing Tools**: Brush and eraser with customizable size and color
- **Auto-save**: Continuous persistence to browser localStorage (500ms debounce)
- **Session Restoration**: Resume exactly where you left off
- **Keyboard Shortcuts**: Quick tool switching with B (Brush), E (Eraser), C (Clear)

## Getting Started

### Prerequisites

- Node.js 18+ installed
- npm or yarn package manager

### Installation

1. Install dependencies:

```bash
npm install
```

2. Run the development server:

```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

```
app/
  layout.tsx          # Root layout
  page.tsx            # Main canvas page
components/
  Canvas.tsx          # Main canvas component
  Toolbar.tsx         # Tool selection UI
lib/
  storage.ts          # localStorage helpers
  canvas-utils.ts     # Drawing utilities
hooks/
  useCanvas.ts        # Canvas drawing logic
  useLocalStorage.ts  # Sync state with localStorage
types/
  index.ts            # TypeScript interfaces
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

```bash
npm run build
npm start
```

## Deployment

This is a client-only app with no backend requirements. You can deploy it to:

- **Vercel** (recommended): Connect your GitHub repo
- **Static hosting**: Export with `output: 'export'` in next.config.js and deploy the `out/` directory to GitHub Pages, Netlify, or Cloudflare Pages

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
