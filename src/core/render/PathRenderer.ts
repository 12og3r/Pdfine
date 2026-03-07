import type { PathElement, Color } from '../../types/document';

function colorToCSS(color: Color): string {
  const a = color.a ?? 1;
  return `rgba(${color.r}, ${color.g}, ${color.b}, ${a})`;
}

export class PathRenderer {
  renderPath(ctx: CanvasRenderingContext2D, path: PathElement, scale: number): void {
    ctx.save();
    ctx.beginPath();

    for (const cmd of path.commands) {
      switch (cmd.op) {
        case 'M':
          ctx.moveTo(cmd.x * scale, cmd.y * scale);
          break;
        case 'L':
          ctx.lineTo(cmd.x * scale, cmd.y * scale);
          break;
        case 'C':
          ctx.bezierCurveTo(
            cmd.cp1x * scale,
            cmd.cp1y * scale,
            cmd.cp2x * scale,
            cmd.cp2y * scale,
            cmd.x * scale,
            cmd.y * scale
          );
          break;
        case 'Z':
          ctx.closePath();
          break;
      }
    }

    if (path.fillColor) {
      ctx.fillStyle = colorToCSS(path.fillColor);
      ctx.fill();
    }

    if (path.strokeColor) {
      ctx.strokeStyle = colorToCSS(path.strokeColor);
      ctx.lineWidth = (path.strokeWidth ?? 1) * scale;
      ctx.stroke();
    }

    ctx.restore();
  }
}
