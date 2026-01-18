import type { Point, ShapeData } from '@/types';

export function drawShape(
  ctx: CanvasRenderingContext2D,
  shape: ShapeData,
  preview = false
): void {
  const { type, start, end, color, lineWidth } = shape;
  
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  
  if (preview) {
    ctx.setLineDash([5, 5]);
  }
  
  ctx.beginPath();
  
  switch (type) {
    case 'rectangle':
      drawRectangle(ctx, start, end);
      break;
    case 'circle':
      drawCircle(ctx, start, end);
      break;
    case 'line':
      drawLine(ctx, start, end);
      break;
    case 'arrow':
      drawArrow(ctx, start, end);
      break;
  }
  
  ctx.stroke();
  ctx.restore();
}

export function drawPath(
  ctx: CanvasRenderingContext2D,
  pathData: string,
  color: string,
  lineWidth: number,
  fill?: string
): void {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  
  const path = new Path2D(pathData);
  
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill(path);
  }
  
  ctx.stroke(path);
  ctx.restore();
}

function drawRectangle(ctx: CanvasRenderingContext2D, start: Point, end: Point): void {
  const width = end.x - start.x;
  const height = end.y - start.y;
  ctx.rect(start.x, start.y, width, height);
}

function drawCircle(ctx: CanvasRenderingContext2D, start: Point, end: Point): void {
  const radiusX = Math.abs(end.x - start.x) / 2;
  const radiusY = Math.abs(end.y - start.y) / 2;
  const centerX = start.x + (end.x - start.x) / 2;
  const centerY = start.y + (end.y - start.y) / 2;
  
  ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
}

function drawLine(ctx: CanvasRenderingContext2D, start: Point, end: Point): void {
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(end.x, end.y);
}

function drawArrow(ctx: CanvasRenderingContext2D, start: Point, end: Point): void {
  const headLength = 15;
  const angle = Math.atan2(end.y - start.y, end.x - start.x);
  
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(end.x, end.y);
  
  ctx.moveTo(end.x, end.y);
  ctx.lineTo(
    end.x - headLength * Math.cos(angle - Math.PI / 6),
    end.y - headLength * Math.sin(angle - Math.PI / 6)
  );
  
  ctx.moveTo(end.x, end.y);
  ctx.lineTo(
    end.x - headLength * Math.cos(angle + Math.PI / 6),
    end.y - headLength * Math.sin(angle + Math.PI / 6)
  );
}

export function shapeToPoints(shape: ShapeData): Point[] {
  const { start, end } = shape;
  
  // For all shapes, we only need to store the start and end points
  // The drawOperation function in WhiteboardCanvas.tsx uses points[0] as start
  // and points[points.length - 1] as end to reconstruct the shape.
  // Storing intermediate points (like for a rectangle or circle path) causes issues
  // because points[last] might be the same as points[0] for closed paths,
  // leading to zero-size shapes.
  return [start, end];
}

export function isPointInShape(point: Point, shape: ShapeData, tolerance = 5): boolean {
  const { type, start, end } = shape;
  
  switch (type) {
    case 'rectangle': {
      const minX = Math.min(start.x, end.x) - tolerance;
      const maxX = Math.max(start.x, end.x) + tolerance;
      const minY = Math.min(start.y, end.y) - tolerance;
      const maxY = Math.max(start.y, end.y) + tolerance;
      return point.x >= minX && point.x <= maxX && point.y >= minY && point.y <= maxY;
    }
    case 'circle': {
      const radiusX = Math.abs(end.x - start.x) / 2;
      const radiusY = Math.abs(end.y - start.y) / 2;
      const centerX = start.x + (end.x - start.x) / 2;
      const centerY = start.y + (end.y - start.y) / 2;
      
      const normalizedX = (point.x - centerX) / (radiusX + tolerance);
      const normalizedY = (point.y - centerY) / (radiusY + tolerance);
      return normalizedX * normalizedX + normalizedY * normalizedY <= 1;
    }
    case 'line':
    case 'arrow': {
      return distanceToLine(point, start, end) <= tolerance;
    }
  }
  
  return false;
}

function distanceToLine(point: Point, lineStart: Point, lineEnd: Point): number {
  const A = point.x - lineStart.x;
  const B = point.y - lineStart.y;
  const C = lineEnd.x - lineStart.x;
  const D = lineEnd.y - lineStart.y;
  
  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  let param = -1;
  
  if (lenSq !== 0) param = dot / lenSq;
  
  let xx: number, yy: number;
  
  if (param < 0) {
    xx = lineStart.x;
    yy = lineStart.y;
  } else if (param > 1) {
    xx = lineEnd.x;
    yy = lineEnd.y;
  } else {
    xx = lineStart.x + param * C;
    yy = lineStart.y + param * D;
  }
  
  const dx = point.x - xx;
  const dy = point.y - yy;
  
  return Math.sqrt(dx * dx + dy * dy);
}
