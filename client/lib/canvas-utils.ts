import { CanvasObject, StrokeObject, ImageObject, Point, InProgressStroke } from '@/types';

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
  imageCache: Map<string, CanvasImageSource> = new Map()
): void {
  clearCanvas(ctx, width, height);

  // Render committed objects in order
  objects.forEach((obj) => {
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

export function findTopImageAtPoint(objects: CanvasObject[], point: Point): ImageObject | null {
  for (let i = objects.length - 1; i >= 0; i--) {
    const obj = objects[i];
    if (obj.type !== 'image') continue;
    if (
      point.x >= obj.x &&
      point.x <= obj.x + obj.width &&
      point.y >= obj.y &&
      point.y <= obj.y + obj.height
    ) {
      return obj;
    }
  }
  return null;
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

function pointInRect(p: Point, r: { x: number; y: number; w: number; h: number }): boolean {
  return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
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
      const rect = { x: object.x, y: object.y, w: object.width, h: object.height };
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
