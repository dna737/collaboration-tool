import { Stroke, Point, InProgressStroke } from '@/types';

export function drawStroke(
  ctx: CanvasRenderingContext2D,
  stroke: Stroke,
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
  height: number,
  objectsToErasePreview: Set<string> = new Set(),
  inProgressStrokes: Map<string, InProgressStroke> = new Map()
): void {
  clearCanvas(ctx, width, height);
  
  // Render committed strokes
  strokes.forEach((stroke) => {
    // Render with reduced opacity if it's in the preview set
    const opacity = objectsToErasePreview.has(stroke.id) ? 0.5 : 1.0;
    drawStroke(ctx, stroke, opacity);
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
  
  return (d1 * d2 < 0 && d3 * d4 < 0);
}

/**
 * Finds which objects intersect with the eraser path.
 * Returns an array of object IDs that should be erased.
 * Checks line segment intersections between eraser path and object paths.
 */
export function findObjectsToErase(
  objects: Stroke[],
  eraserPath: Point[]
): string[] {
  const objectsToErase = new Set<string>();
  
  // Need at least 2 points for line segments
  if (eraserPath.length < 2) {
    return [];
  }
  
  // Check each object's path against the eraser path
  objects.forEach((object) => {
    // Need at least 2 points for line segments
    if (object.points.length < 2) {
      return;
    }
    
    // Check if any eraser segment intersects with any object segment
    for (let i = 0; i < eraserPath.length - 1; i++) {
      const eraserStart = eraserPath[i];
      const eraserEnd = eraserPath[i + 1];
      
      for (let j = 0; j < object.points.length - 1; j++) {
        const objectStart = object.points[j];
        const objectEnd = object.points[j + 1];
        
        if (doLineSegmentsIntersect(eraserStart, eraserEnd, objectStart, objectEnd)) {
          objectsToErase.add(object.id);
          return; // Found intersection, no need to check more segments
        }
      }
    }
  });
  
  return Array.from(objectsToErase);
}
