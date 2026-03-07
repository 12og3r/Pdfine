import type { PathElement, PathCommand, Color, Rect } from '../../types/document'
import { createPathElement } from '../model/DocumentModel'
import { Logger } from '../infra/Logger'

const logger = new Logger('PathExtractor');

// pdfjs OPS constants for path operations
const OPS_constructPath = 91;
const OPS_setFillRGBColor = 31;
const OPS_setStrokeRGBColor = 35;
const OPS_setLineWidth = 15;

// Path sub-ops within constructPath
const PATH_MOVETO = 13;
const PATH_LINETO = 14;
const PATH_CURVETO = 15;
const PATH_CLOSE = 44;
const PATH_RECT = 19;

interface OperatorListLike {
  fnArray: number[];
  argsArray: unknown[][];
}

export class PathExtractor {
  extractPaths(
    operatorList: OperatorListLike,
    pageHeight: number,
  ): PathElement[] {
    const paths: PathElement[] = [];

    let currentFill: Color | undefined;
    let currentStroke: Color | undefined;
    let currentLineWidth = 1;

    for (let i = 0; i < operatorList.fnArray.length; i++) {
      const fn = operatorList.fnArray[i];
      const args = operatorList.argsArray[i];

      switch (fn) {
        case OPS_setFillRGBColor:
          currentFill = {
            r: Math.round((args[0] as number) * 255),
            g: Math.round((args[1] as number) * 255),
            b: Math.round((args[2] as number) * 255),
          };
          break;

        case OPS_setStrokeRGBColor:
          currentStroke = {
            r: Math.round((args[0] as number) * 255),
            g: Math.round((args[1] as number) * 255),
            b: Math.round((args[2] as number) * 255),
          };
          break;

        case OPS_setLineWidth:
          currentLineWidth = args[0] as number;
          break;

        case OPS_constructPath: {
          try {
            const subOps = args[0] as number[];
            const subArgs = args[1] as number[];

            if (!subOps || !subArgs) break;

            const commands = this.parsePathOps(subOps, subArgs, pageHeight);

            if (commands.length === 0) break;

            const bounds = this.computeBounds(commands);

            paths.push(
              createPathElement(
                commands,
                bounds,
                currentFill,
                currentStroke,
                currentLineWidth,
              ),
            );
          } catch (err) {
            logger.warn('Failed to extract path at operator index', i, err);
          }
          break;
        }
      }
    }

    return paths;
  }

  private parsePathOps(subOps: number[], subArgs: number[], pageHeight: number): PathCommand[] {
    const commands: PathCommand[] = [];
    let argIdx = 0;

    for (const op of subOps) {
      switch (op) {
        case PATH_MOVETO: {
          const x = subArgs[argIdx++];
          const y = pageHeight - subArgs[argIdx++];
          commands.push({ op: 'M', x, y });
          break;
        }
        case PATH_LINETO: {
          const x = subArgs[argIdx++];
          const y = pageHeight - subArgs[argIdx++];
          commands.push({ op: 'L', x, y });
          break;
        }
        case PATH_CURVETO: {
          const cp1x = subArgs[argIdx++];
          const cp1y = pageHeight - subArgs[argIdx++];
          const cp2x = subArgs[argIdx++];
          const cp2y = pageHeight - subArgs[argIdx++];
          const x = subArgs[argIdx++];
          const y = pageHeight - subArgs[argIdx++];
          commands.push({ op: 'C', cp1x, cp1y, cp2x, cp2y, x, y });
          break;
        }
        case PATH_RECT: {
          const rx = subArgs[argIdx++];
          const ry = pageHeight - subArgs[argIdx++];
          const rw = subArgs[argIdx++];
          const rh = subArgs[argIdx++];
          commands.push({ op: 'M', x: rx, y: ry });
          commands.push({ op: 'L', x: rx + rw, y: ry });
          commands.push({ op: 'L', x: rx + rw, y: ry - rh });
          commands.push({ op: 'L', x: rx, y: ry - rh });
          commands.push({ op: 'Z' });
          break;
        }
        case PATH_CLOSE:
          commands.push({ op: 'Z' });
          break;
      }
    }

    return commands;
  }

  private computeBounds(commands: PathCommand[]): Rect {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    for (const cmd of commands) {
      if (cmd.op === 'Z') continue;
      minX = Math.min(minX, cmd.x);
      minY = Math.min(minY, cmd.y);
      maxX = Math.max(maxX, cmd.x);
      maxY = Math.max(maxY, cmd.y);

      if (cmd.op === 'C') {
        minX = Math.min(minX, cmd.cp1x, cmd.cp2x);
        minY = Math.min(minY, cmd.cp1y, cmd.cp2y);
        maxX = Math.max(maxX, cmd.cp1x, cmd.cp2x);
        maxY = Math.max(maxY, cmd.cp1y, cmd.cp2y);
      }
    }

    if (!isFinite(minX)) {
      return { x: 0, y: 0, width: 0, height: 0 };
    }

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }
}
