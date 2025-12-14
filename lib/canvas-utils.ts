import { Stroke, Point } from '@/types';

export function drawStroke(
  ctx: CanvasRenderingContext2D,
  stroke: Stroke
): void {
  if (stroke.points.length < 2) return;

  ctx.strokeStyle = stroke.color;
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

export function clearCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): void {
  ctx.clearRect(0, 0, width, height);
}

export function renderAllStrokes(
  ctx: CanvasRenderingContext2D,
  strokes: Stroke[],
  width: number,
  height: number
): void {
  clearCanvas(ctx, width, height);
  strokes.forEach((stroke) => drawStroke(ctx, stroke));
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

/**
 * Checks if a point belongs to (intersects with) a canvas object.
 * Returns true if the point is within threshold distance of any point in the object.
 */
export function objectContainsPoint(
  object: Stroke,
  point: Point,
  threshold: number
): boolean {
  return object.points.some((p) => {
    const distance = Math.sqrt(
      Math.pow(p.x - point.x, 2) + Math.pow(p.y - point.y, 2)
    );
    return distance <= threshold;
  });
}

/**
 * Finds which objects intersect with the eraser path.
 * Returns an array of object IDs that should be erased.
 */
export function findObjectsToErase(
  objects: Stroke[],
  eraserPath: Point[],
  threshold: number
): string[] {
  const objectsToErase = new Set<string>();
  
  // For each point in the eraser path, find which objects it belongs to
  eraserPath.forEach((eraserPoint) => {
    objects.forEach((object) => {
      if (objectContainsPoint(object, eraserPoint, threshold)) {
        objectsToErase.add(object.id);
      }
    });
  });
  
  return Array.from(objectsToErase);
}
