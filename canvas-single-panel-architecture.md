Canvas Drawing App

Single-Panel Next.js Architecture

Table of Contents

Executive Summary

A minimal drawing application inspired by Excalidraw, built entirely
with Next.js and browser localStorage. This single-panel application
focuses on core drawing functionality with automatic local persistence.

Core Features

-   1\. Single canvas - One drawing surface that persists across
    sessions

-   2\. Drawing tools - Brush and eraser with room for expansion

-   3\. Auto-save - Continuous persistence to browser localStorage

-   4\. Session restoration - Resume exactly where you left off

Technology Stack

Frontend Framework: Next.js 14+

Next.js Client Components provide the interactive canvas and drawing
tools. No server-side rendering needed since all data is local.

Why Next.js for a client-only app:

-   Fast development setup and hot reload

-   TypeScript support out of the box

-   Simple routing if you add features later

-   Easy path to add server features later if needed

Canvas Rendering: HTML5 Canvas API

Native browser canvas element provides high-performance 2D drawing
capabilities without additional libraries.

Canvas advantages:

-   Direct pixel manipulation for smooth drawing

-   Built-in support for paths, strokes, and fills

-   No dependencies - works in all modern browsers

-   Export to PNG/JPEG for sharing

State Management: React useState + useEffect

Simple React hooks handle all application state. No need for Redux,
Zustand, or other state libraries for this scope.

State structure:

-   activeTool - Current tool selection (brush, eraser)

-   brushSize - Current brush/eraser size

-   brushColor - Selected color

-   strokes - Array of drawing strokes

Data Persistence: localStorage

Browser localStorage provides simple, synchronous key-value storage that
persists across sessions.

Storage strategy:

-   Store all strokes as JSON array under single key

-   Auto-save on every change with debouncing (wait 500ms after user
    stops drawing)

-   Load strokes on component mount

-   Re-render canvas when strokes load

Architecture Overview

Application Flow

Initial Load

-   1\. User opens app (localhost:3000)

-   2\. Canvas component loads strokes from localStorage

-   3\. Canvas renders all saved strokes

-   4\. User sees their previous drawing immediately

Drawing Flow

-   1\. User selects tool (brush or eraser) from toolbar

-   2\. User clicks and drags on canvas

-   3\. onMouseDown captures start point

-   4\. onMouseMove draws line segments as user drags

-   5\. onMouseUp finalizes stroke and adds to strokes array

-   6\. useEffect with debounce waits 500ms, then saves to localStorage

-   7\. Canvas re-renders with new stroke

Eraser Tool

Eraser works by removing intersecting strokes from the strokes array,
providing cleaner results than drawing with background color.

Eraser implementation:

-   User draws with eraser tool

-   Check each existing stroke for intersection with eraser path

-   Remove intersecting strokes from strokes array

-   Re-render canvas without removed strokes

-   Save updated strokes array to localStorage

Data Model

Stroke Object

interface Stroke {

id: string; // UUID for identification

tool: \'brush\' \| \'eraser\';

color: string; // Hex color code (e.g., \'#000000\')

size: number; // Brush/eraser size in pixels

points: Point\[\]; // Array of {x, y} coordinates

}

Point Object

interface Point {

x: number; // X coordinate on canvas

y: number; // Y coordinate on canvas

}

localStorage Keys

-   canvas-app:strokes - JSON array of all Stroke objects

-   canvas-app:settings - App preferences (future: theme, default brush
    size)

Implementation Details

Project Structure

app/

page.tsx // Main canvas page

components/

Canvas.tsx // Main canvas component

Toolbar.tsx // Tool selection UI

lib/

storage.ts // localStorage helpers

canvas-utils.ts // Drawing utilities

hooks/

useCanvas.ts // Canvas drawing logic

useLocalStorage.ts // Sync state with localStorage

types/

index.ts // TypeScript interfaces

Core Components

Canvas Component

Manages the HTML canvas element and handles all drawing interactions.

Responsibilities:

-   Set up canvas ref and 2D rendering context

-   Handle mouse events (down, move, up, leave)

-   Load strokes from localStorage on mount

-   Render all strokes whenever strokes array changes

-   Apply current tool settings to drawing operations

Toolbar Component

Provides tool selection and configuration interface.

Features:

-   Tool buttons (brush, eraser)

-   Color picker for brush

-   Size slider for brush/eraser

-   Visual indicator of active tool

-   Clear canvas button (with confirmation)

Auto-Save Strategy

Debounced Saving

Saving after every single point would be inefficient. Instead, use a
debounce strategy that saves after drawing activity pauses.

How debouncing works:

-   User draws a stroke (adding many points quickly)

-   useEffect detects strokes array changed

-   Start a 500ms timer to save

-   If strokes change again before 500ms, cancel old timer and start new
    one

-   When user pauses for 500ms, timer expires and saves to localStorage

-   Result: Save once per drawing action, not hundreds of times

Implementation pattern:

useEffect(() =\> {

const timer = setTimeout(() =\> {

localStorage.setItem(\'canvas-app:strokes\', JSON.stringify(strokes));

}, 500);

return () =\> clearTimeout(timer);

}, \[strokes\]);

Storage Limits

localStorage typically has a 5-10MB limit per origin. For complex
drawings, this can fill up.

Mitigation strategies:

-   Monitor storage usage and warn user when approaching limit

-   Compress stroke data (simplify points, reduce precision)

-   Limit total number of strokes

-   Offer export to save drawing as PNG and clear canvas

-   Future: Migrate to IndexedDB for larger storage capacity

Future Enhancements

Additional Tools

-   Shape tools - Rectangle, circle, line, arrow

-   Text tool - Add text labels to canvas

-   Selection tool - Move, resize, delete individual elements

-   Fill tool - Flood fill enclosed areas

-   Image import - Place images on canvas

Canvas Features

-   Undo/Redo - Stroke history with keyboard shortcuts (Ctrl+Z, Ctrl+Y)

-   Zoom and pan - Navigate large canvases

-   Layers - Organize drawing elements

-   Grid and guides - Alignment helpers

-   Export - Save as PNG, JPEG, SVG

Multiple Panels

Once single-panel version works well, add panel management:

-   Create/delete panels with unique IDs

-   Panel list/grid view

-   Panel thumbnails for quick preview

-   Rename panels

-   Store each panel\'s strokes separately in localStorage

Collaboration (Phase 3)

After single-user version is solid, add real-time collaboration:

-   WebSocket connection for live updates

-   User cursors and presence indicators

-   Backend storage (move from localStorage to database)

-   CRDT or operational transforms for conflict resolution

-   Shareable canvas links

Development Plan

Phase 1: Core Drawing (Week 1)

-   Set up Next.js project with TypeScript

-   Implement Canvas component with mouse event handling

-   Add brush tool with color and size selection

-   Implement basic eraser functionality

-   Create Toolbar component

Phase 2: Persistence (Week 2)

-   Implement localStorage save/load logic

-   Add debounced auto-save

-   Test save/load across page refreshes

-   Add clear canvas functionality with confirmation

Phase 3: Polish (Week 3)

-   Add keyboard shortcuts (B for brush, E for eraser, C for clear)

-   Improve eraser algorithm (stroke intersection detection)

-   Add undo/redo functionality

-   Create responsive UI for different screen sizes

-   Add basic error handling and user feedback

-   Write README and basic documentation

Testing Strategy

Unit Tests

-   Storage utilities - Test save/load/delete operations

-   Canvas utilities - Test stroke rendering logic

-   Custom hooks - Test useCanvas and useLocalStorage

Component Tests

-   Toolbar - Verify tool selection and settings work

-   Canvas - Mock mouse events and verify drawing

-   Test that strokes render correctly after load

Integration Tests

-   Full drawing flow - Draw, save, reload, verify strokes persist

-   Tool switching - Switch between brush and eraser, verify behavior

-   localStorage persistence - Verify data survives page refresh

Deployment

Since this is a client-only app with no backend, deployment is simple:

Vercel (Recommended)

-   1\. Push code to GitHub

-   2\. Connect repository to Vercel

-   3\. Vercel auto-detects Next.js and deploys

-   4\. Get production URL (yourapp.vercel.app)

-   5\. Every git push triggers new deployment

Alternative: Static Export

Since there\'s no server-side logic, you can export to static
HTML/CSS/JS:

-   1\. Add \'output: export\' to next.config.js

-   2\. Run \'npm run build\'

-   3\. Deploy \'out\' directory to any static host

-   4\. Options: GitHub Pages, Netlify, Cloudflare Pages

Conclusion

This architecture provides the simplest possible foundation for a
drawing application. By focusing on a single canvas with just brush and
eraser tools, you can ship a working MVP in 2-3 weeks and iterate based
on usage.

Key advantages:

-   Zero backend complexity - everything runs in the browser

-   Instant auto-save with no server roundtrips

-   Works offline once loaded

-   Easy to understand and extend

-   Clear path to add panels and collaboration later

Start with this minimal version, get the core drawing experience right,
then expand with additional tools, panels, and eventually collaboration.
This gives you a deployable project quickly while learning Canvas API
and React state management.
