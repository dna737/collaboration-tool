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

export function strokeIntersectsPoint(
  stroke: Stroke,
  point: Point,
  threshold: number
): boolean {
  console.log("stroke points:", stroke.points);
  return stroke.points.some((p) => {
    const distance = Math.sqrt(
      Math.pow(p.x - point.x, 2) + Math.pow(p.y - point.y, 2)
    );
    return distance <= threshold;
  });
}

export function strokeIntersectsPath(
  stroke: Stroke,
  path: Point[],
  threshold: number
): boolean {
  return path.some((point) => strokeIntersectsPoint(stroke, point, threshold));
}
