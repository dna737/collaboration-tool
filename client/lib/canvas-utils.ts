import { CanvasObject, StrokeObject, ImageObject, Point, InProgressStroke } from '@/types';

/** Bounding box in canvas coordinates: x, y, width, height. */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

const RESIZE_HANDLE_SIZE = 8;

export function drawStroke(
  ctx: CanvasRenderingContext2D,
  stroke: StrokeObject,
  opacity: number = 1.0
): void {
  if (stroke.points.length < 2) return;

  // Convert color to rgba for opacity support
  const color = stroke.color;
  let rgbaColor = color;

  if (opacity < 1.0) {
    // If color is hex, convert to rgba
    if (color.startsWith('#')) {
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);
      rgbaColor = `rgba(${r}, ${g}, ${b}, ${opacity})`;
    } else if (color.startsWith('rgb')) {
      // If already rgb/rgba, extract rgb and apply opacity
      const rgbMatch = color.match(/\d+/g);
      if (rgbMatch && rgbMatch.length >= 3) {
        rgbaColor = `rgba(${rgbMatch[0]}, ${rgbMatch[1]}, ${rgbMatch[2]}, ${opacity})`;
      }
    }
  }

  ctx.strokeStyle = rgbaColor;
  ctx.lineWidth = stroke.size;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.beginPath();
  ctx.moveTo(stroke.points[0].x, stroke.points[0].y);

  for (let i = 1; i < stroke.points.length; i++) {
    ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
  }

  ctx.stroke();
}

function drawImageObject(
  ctx: CanvasRenderingContext2D,
  image: ImageObject,
  source: CanvasImageSource | undefined,
  opacity: number
): void {
  ctx.save();
  ctx.globalAlpha = opacity;

  if (source) {
    ctx.drawImage(source, image.x, image.y, image.width, image.height);
  } else {
    // Placeholder
    ctx.fillStyle = 'rgba(156, 163, 175, 0.25)';
    ctx.strokeStyle = 'rgba(107, 114, 128, 0.6)';
    ctx.lineWidth = 2;
    ctx.fillRect(image.x, image.y, image.width, image.height);
    ctx.strokeRect(image.x, image.y, image.width, image.height);

    ctx.fillStyle = 'rgba(107, 114, 128, 0.9)';
    ctx.font = '12px system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
    ctx.fillText('Loading image…', image.x + 8, image.y + 20);
  }

  ctx.restore();
}

export function clearCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): void {
  ctx.clearRect(0, 0, width, height);
}

export function renderAllObjects(
  ctx: CanvasRenderingContext2D,
  objects: CanvasObject[],
  width: number,
  height: number,
  objectsToErasePreview: Set<string> = new Set(),
  inProgressStrokes: Map<string, InProgressStroke> = new Map(),
  imageCache: Map<string, CanvasImageSource> = new Map(),
  remoteMovePreviews: Map<string, CanvasObject[]> = new Map()
): void {
  clearCanvas(ctx, width, height);

  const previewIds = new Set<string>();
  if (remoteMovePreviews.size > 0) {
    remoteMovePreviews.forEach((previewObjects) => {
      previewObjects.forEach((obj) => previewIds.add(obj.id));
    });
  }

  // Render committed objects in order
  objects.forEach((obj) => {
    if (previewIds.has(obj.id)) {
      return;
    }

    const opacity = objectsToErasePreview.has(obj.id) ? 0.5 : 1.0;

    if (obj.type === 'stroke') {
      drawStroke(ctx, obj, opacity);
      return;
    }

    const source = imageCache.get(obj.assetId);
    drawImageObject(ctx, obj, source, opacity);
  });

  // Render in-progress strokes from remote users (slightly transparent)
  inProgressStrokes.forEach((inProgressStroke) => {
    drawInProgressStroke(ctx, inProgressStroke);
  });

  // Render remote move previews (slightly transparent)
  if (remoteMovePreviews.size > 0) {
    const opacity = 0.85;
    remoteMovePreviews.forEach((previewObjects) => {
      previewObjects.forEach((obj) => {
        if (obj.type === 'stroke') {
          drawStroke(ctx, obj, opacity);
          return;
        }

        const source = imageCache.get(obj.assetId);
        drawImageObject(ctx, obj, source, opacity);
      });
    });
  }
}

/**
 * Draws an in-progress stroke from a remote user.
 * Rendered with slight transparency to indicate it's not yet committed.
 */
export function drawInProgressStroke(
  ctx: CanvasRenderingContext2D,
  stroke: InProgressStroke
): void {
  if (stroke.points.length < 2) return;

  // Use 70% opacity for in-progress strokes
  const opacity = 0.7;
  const color = stroke.color;
  let rgbaColor = color;

  // Convert color to rgba for opacity support
  if (color.startsWith('#')) {
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    rgbaColor = `rgba(${r}, ${g}, ${b}, ${opacity})`;
  } else if (color.startsWith('rgb')) {
    const rgbMatch = color.match(/\d+/g);
    if (rgbMatch && rgbMatch.length >= 3) {
      rgbaColor = `rgba(${rgbMatch[0]}, ${rgbMatch[1]}, ${rgbMatch[2]}, ${opacity})`;
    }
  }

  ctx.strokeStyle = rgbaColor;
  ctx.lineWidth = stroke.size;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.beginPath();
  ctx.moveTo(stroke.points[0].x, stroke.points[0].y);

  for (let i = 1; i < stroke.points.length; i++) {
    ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
  }

  ctx.stroke();
}

export function getCanvasPoint(
  canvas: HTMLCanvasElement,
  clientX: number,
  clientY: number
): Point {
  const rect = canvas.getBoundingClientRect();
  return {
    x: clientX - rect.left,
    y: clientY - rect.top,
  };
}

function normalizeRect(rect: Rect): Rect {
  const x = rect.w >= 0 ? rect.x : rect.x + rect.w;
  const y = rect.h >= 0 ? rect.y : rect.y + rect.h;
  return { x, y, w: Math.abs(rect.w), h: Math.abs(rect.h) };
}

export function getImageRect(image: ImageObject): Rect {
  return normalizeRect({ x: image.x, y: image.y, w: image.width, h: image.height });
}

export function findTopImageAtPoint(objects: CanvasObject[], point: Point): ImageObject | null {
  for (let i = objects.length - 1; i >= 0; i--) {
    const obj = objects[i];
    if (obj.type !== 'image') continue;
    const rect = getImageRect(obj);
    if (point.x >= rect.x && point.x <= rect.x + rect.w && point.y >= rect.y && point.y <= rect.y + rect.h) {
      return obj;
    }
  }
  return null;
}

/**
 * Returns all objects hit by a click point.
 * Images: point-in-rect (normalized for negative sizes).
 * Strokes: point within full stroke size of any segment.
 */
function distanceSquaredToSegment(point: Point, a: Point, b: Point): number {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const apx = point.x - a.x;
  const apy = point.y - a.y;
  const denom = abx * abx + aby * aby;

  if (denom === 0) {
    return apx * apx + apy * apy;
  }

  let t = (apx * abx + apy * aby) / denom;
  if (t < 0) t = 0;
  if (t > 1) t = 1;

  const closestX = a.x + t * abx;
  const closestY = a.y + t * aby;
  const dx = point.x - closestX;
  const dy = point.y - closestY;
  return dx * dx + dy * dy;
}

export function findObjectsAtPoint(objects: CanvasObject[], point: Point): CanvasObject[] {
  return objects.filter((obj) => {
    if (obj.type === 'image') {
      const rect = getImageRect(obj);
      return point.x >= rect.x && point.x <= rect.x + rect.w && point.y >= rect.y && point.y <= rect.y + rect.h;
    }

    if (obj.points.length === 0) return false;
    const radius = obj.size;
    const radiusSq = radius * radius;
    if (obj.points.length === 1) {
      const dx = point.x - obj.points[0].x;
      const dy = point.y - obj.points[0].y;
      return dx * dx + dy * dy <= radiusSq;
    }

    for (let i = 0; i < obj.points.length - 1; i++) {
      const p1 = obj.points[i];
      const p2 = obj.points[i + 1];
      if (distanceSquaredToSegment(point, p1, p2) <= radiusSq) {
        return true;
      }
    }
    return false;
  });
}

/**
 * Returns the bounding box of a single canvas object in canvas coordinates.
 * For images: x, y, width, height. For strokes: min/max of points expanded by half stroke size.
 */
export function getObjectBoundingBox(obj: CanvasObject): Rect {
  if (obj.type === 'image') {
    return getImageRect(obj);
  }
  // Stroke: bounding box of points, expanded by half line width
  if (obj.points.length === 0) {
    return { x: 0, y: 0, w: 0, h: 0 };
  }
  const half = obj.size / 2;
  let minX = obj.points[0].x;
  let minY = obj.points[0].y;
  let maxX = obj.points[0].x;
  let maxY = obj.points[0].y;
  for (let i = 1; i < obj.points.length; i++) {
    const p = obj.points[i];
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  return {
    x: minX - half,
    y: minY - half,
    w: maxX - minX + obj.size,
    h: maxY - minY + obj.size,
  };
}

/**
 * Returns the union bounding box of the given objects, or null if empty.
 */
export function getSelectionBoundingBox(objects: CanvasObject[]): Rect | null {
  if (objects.length === 0) return null;
  const first = getObjectBoundingBox(objects[0]);
  let minX = first.x;
  let minY = first.y;
  let maxX = first.x + first.w;
  let maxY = first.y + first.h;
  for (let i = 1; i < objects.length; i++) {
    const r = getObjectBoundingBox(objects[i]);
    minX = Math.min(minX, r.x);
    minY = Math.min(minY, r.y);
    maxX = Math.max(maxX, r.x + r.w);
    maxY = Math.max(maxY, r.y + r.h);
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

/**
 * Returns true iff inner is fully contained in outer (edges inclusive).
 */
export function isRectContained(inner: Rect, outer: Rect): boolean {
  return (
    inner.x >= outer.x &&
    inner.y >= outer.y &&
    inner.x + inner.w <= outer.x + outer.w &&
    inner.y + inner.h <= outer.y + outer.h
  );
}

/**
 * Returns objects whose entire bounding box is inside the given rect.
 * rect should have positive w and h (use normalized marquee rect).
 */
export function getObjectsFullyInRect(objects: CanvasObject[], rect: Rect): CanvasObject[] {
  return objects.filter((obj) => {
    const box = getObjectBoundingBox(obj);
    return isRectContained(box, rect);
  });
}

/**
 * Returns true if point p is inside rectangle r (edges inclusive).
 */
export function pointInRect(p: Point, r: Rect): boolean {
  return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
}

export function getResizeHandles(rect: Rect): { id: ResizeHandle; rect: Rect }[] {
  const normalized = normalizeRect(rect);
  const half = RESIZE_HANDLE_SIZE / 2;
  const left = normalized.x;
  const right = normalized.x + normalized.w;
  const top = normalized.y;
  const bottom = normalized.y + normalized.h;
  const midX = normalized.x + normalized.w / 2;
  const midY = normalized.y + normalized.h / 2;

  const handleRect = (cx: number, cy: number): Rect => ({
    x: cx - half,
    y: cy - half,
    w: RESIZE_HANDLE_SIZE,
    h: RESIZE_HANDLE_SIZE,
  });

  return [
    { id: 'nw', rect: handleRect(left, top) },
    { id: 'n', rect: handleRect(midX, top) },
    { id: 'ne', rect: handleRect(right, top) },
    { id: 'e', rect: handleRect(right, midY) },
    { id: 'se', rect: handleRect(right, bottom) },
    { id: 's', rect: handleRect(midX, bottom) },
    { id: 'sw', rect: handleRect(left, bottom) },
    { id: 'w', rect: handleRect(left, midY) },
  ];
}

export function drawResizeHandles(ctx: CanvasRenderingContext2D, rect: Rect): void {
  const handles = getResizeHandles(rect);
  ctx.save();
  ctx.fillStyle = 'white';
  ctx.strokeStyle = 'rgba(59, 130, 246, 0.9)';
  ctx.lineWidth = 1;
  handles.forEach((handle) => {
    ctx.fillRect(handle.rect.x, handle.rect.y, handle.rect.w, handle.rect.h);
    ctx.strokeRect(handle.rect.x, handle.rect.y, handle.rect.w, handle.rect.h);
  });
  ctx.restore();
}

export function hitTestResizeHandle(point: Point, rect: Rect): ResizeHandle | null {
  const handles = getResizeHandles(rect);
  for (const handle of handles) {
    if (pointInRect(point, handle.rect)) {
      return handle.id;
    }
  }
  return null;
}

/**
 * Translates a stroke by (dx, dy). Returns a new stroke.
 */
export function translateStroke(stroke: StrokeObject, dx: number, dy: number): StrokeObject {
  return {
    ...stroke,
    points: stroke.points.map((p) => ({ x: p.x + dx, y: p.y + dy })),
  };
}

/**
 * Draws the selection box (dashed rectangle) around selected objects.
 */
export function drawSelectionBox(ctx: CanvasRenderingContext2D, box: Rect): void {
  ctx.save();
  ctx.strokeStyle = 'rgba(59, 130, 246, 0.9)';
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 4]);
  ctx.strokeRect(box.x, box.y, box.w, box.h);
  ctx.restore();
}

/**
 * Draws the marquee rectangle while the user is dragging to select.
 */
export function drawMarqueeRect(
  ctx: CanvasRenderingContext2D,
  start: Point,
  end: Point
): void {
  const x = Math.min(start.x, end.x);
  const y = Math.min(start.y, end.y);
  const w = Math.abs(end.x - start.x);
  const h = Math.abs(end.y - start.y);
  ctx.save();
  ctx.strokeStyle = 'rgba(59, 130, 246, 0.7)';
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 4]);
  ctx.strokeRect(x, y, w, h);
  ctx.restore();
}

/**
 * Checks if two line segments intersect.
 */
function doLineSegmentsIntersect(
  p1: Point,
  p2: Point,
  p3: Point,
  p4: Point
): boolean {
  const d1 = (p4.x - p3.x) * (p1.y - p3.y) - (p4.y - p3.y) * (p1.x - p3.x);
  const d2 = (p4.x - p3.x) * (p2.y - p3.y) - (p4.y - p3.y) * (p2.x - p3.x);
  const d3 = (p2.x - p1.x) * (p3.y - p1.y) - (p2.y - p1.y) * (p3.x - p1.x);
  const d4 = (p2.x - p1.x) * (p4.y - p1.y) - (p2.y - p1.y) * (p4.x - p1.x);

  return d1 * d2 < 0 && d3 * d4 < 0;
}

function segmentIntersectsRect(p1: Point, p2: Point, r: { x: number; y: number; w: number; h: number }): boolean {
  // Endpoint inside
  if (pointInRect(p1, r) || pointInRect(p2, r)) return true;

  const tl: Point = { x: r.x, y: r.y };
  const tr: Point = { x: r.x + r.w, y: r.y };
  const br: Point = { x: r.x + r.w, y: r.y + r.h };
  const bl: Point = { x: r.x, y: r.y + r.h };

  return (
    doLineSegmentsIntersect(p1, p2, tl, tr) ||
    doLineSegmentsIntersect(p1, p2, tr, br) ||
    doLineSegmentsIntersect(p1, p2, br, bl) ||
    doLineSegmentsIntersect(p1, p2, bl, tl)
  );
}

/**
 * Finds which objects intersect with the eraser path.
 */
export function findObjectsToErase(objects: CanvasObject[], eraserPath: Point[]): string[] {
  const objectsToErase = new Set<string>();

  // Need at least 2 points for line segments
  if (eraserPath.length < 2) {
    return [];
  }

  objects.forEach((object) => {
    // Erase images via rect hit test
    if (object.type === 'image') {
      const rect = getImageRect(object);
      for (let i = 0; i < eraserPath.length - 1; i++) {
        if (segmentIntersectsRect(eraserPath[i], eraserPath[i + 1], rect)) {
          objectsToErase.add(object.id);
          return;
        }
      }
      return;
    }

    // Strokes: segment intersection with stroke polyline
    if (object.points.length < 2) {
      return;
    }

    for (let i = 0; i < eraserPath.length - 1; i++) {
      const eraserStart = eraserPath[i];
      const eraserEnd = eraserPath[i + 1];

      for (let j = 0; j < object.points.length - 1; j++) {
        const objectStart = object.points[j];
        const objectEnd = object.points[j + 1];

        if (doLineSegmentsIntersect(eraserStart, eraserEnd, objectStart, objectEnd)) {
          objectsToErase.add(object.id);
          return;
        }
      }
    }
  });

  return Array.from(objectsToErase);
}
