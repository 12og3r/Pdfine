import { useEffect, useState, type CSSProperties } from 'react';

/**
 * Inky — the Inkworld mascot.
 *
 * A printmaker apprentice rendered as a pixel-art SVG sprite (14×20 grid).
 * Actions drive CSS keyframe animations defined in src/index.css (.inky-*).
 *
 * Props:
 *   action    — what Inky is doing right now
 *   size      — pixel-size multiplier. 1 = 14x20px, 2 = 28x40px, 4 = 56x80px, etc.
 *   direction — 'right' (default) or 'left' (horizontally flipped)
 *   autoFidget — if true, Inky occasionally plays a fidget animation while idle
 */

export type InkyAction = 'idle' | 'walk' | 'jump' | 'celebrate' | 'confused' | 'sleep';
export type InkyDirection = 'left' | 'right';

interface InkyProps {
  action?: InkyAction;
  size?: number;
  direction?: InkyDirection;
  autoFidget?: boolean;
  className?: string;
  style?: CSSProperties;
  onClick?: () => void;
  ariaLabel?: string;
}

/* Pixel palette (single source of truth for the sprite) */
const COLORS: Record<string, string> = {
  K: '#2B2B54', // ink-black outline
  R: '#D6331F', // red beret
  S: '#FFD4A0', // skin
  B: '#3A4A7A', // overalls blue
  L: '#F1F5FC', // shirt highlight
  Y: '#FFE045', // overall button
  O: '#5C3310', // boot
};

/* 14 columns × 20 rows. '.' = transparent. */
const SPRITE: string[] = [
  '.....KKKK.....',
  '...KRRRRRRRK..',
  '..KRRRRRRRRRK.',
  '.KRRRRRRRRRRRK',
  'KKKKKKKKKKKKKK',
  '..KSSSSSSSSK..',
  '..KSKSSSSKSK..',
  '..KSSSSSSSSK..',
  '..KSSSKKKSSK..',
  '...KSSSSSSK...',
  '.KKKKKKKKKKKK.',
  '.KBBBLLLLBBBK.',
  '.KBYBLLLLBYBK.',
  '.KBBBLLLLBBBK.',
  '.KBBBBBBBBBBK.',
  '.KBBBBBBBBBBK.',
  '.KBBBK..KBBBK.',
  '.KBBBK..KBBBK.',
  '.KOOOK..KOOOK.',
  '.KKKKK..KKKKK.',
];

const SPRITE_WIDTH = 14;
const SPRITE_HEIGHT = 20;

type FidgetName = 'sneeze' | 'celebrate' | 'jump';
const FIDGETS: FidgetName[] = ['sneeze', 'celebrate', 'jump'];

function Sprite({ pixelSize }: { pixelSize: number }) {
  const rects: React.ReactNode[] = [];
  for (let y = 0; y < SPRITE.length; y++) {
    const row = SPRITE[y];
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch === '.') continue;
      const color = COLORS[ch];
      if (!color) continue;
      rects.push(
        <rect
          key={`${x}-${y}`}
          x={x * pixelSize}
          y={y * pixelSize}
          width={pixelSize}
          height={pixelSize}
          fill={color}
          shapeRendering="crispEdges"
        />
      );
    }
  }
  return <>{rects}</>;
}

export function Inky({
  action = 'idle',
  size = 2,
  direction = 'right',
  autoFidget = false,
  className = '',
  style,
  onClick,
  ariaLabel = 'Inky the mascot',
}: InkyProps) {
  const [fidget, setFidget] = useState<FidgetName | null>(null);

  /* Occasionally pick a random fidget animation while idle */
  useEffect(() => {
    if (!autoFidget || action !== 'idle') {
      setFidget(null);
      return;
    }
    let cancelled = false;
    const scheduleNext = () => {
      const delay = 8000 + Math.random() * 6000; // 8–14s
      return window.setTimeout(() => {
        if (cancelled) return;
        const next = FIDGETS[Math.floor(Math.random() * FIDGETS.length)];
        setFidget(next);
        // Reset after animation finishes (~900ms max)
        window.setTimeout(() => {
          if (!cancelled) {
            setFidget(null);
            timeoutId = scheduleNext();
          }
        }, 1000);
      }, delay);
    };
    let timeoutId = scheduleNext();
    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [autoFidget, action]);

  /* Effective action: fidget overrides idle */
  const effectiveAction: InkyAction | FidgetName = fidget ?? action;

  const animationClass = (() => {
    switch (effectiveAction) {
      case 'idle':
        return 'inky-idle';
      case 'walk':
        return 'inky-walk';
      case 'jump':
        return 'inky-jump';
      case 'celebrate':
        return 'inky-celebrate';
      case 'sneeze':
        return 'inky-sneeze';
      case 'confused':
        return 'inky-idle';
      case 'sleep':
        return '';
      default:
        return '';
    }
  })();

  const pixelSize = 1; // we render at 1x then scale via transform for pixel-perfect crispness
  const w = SPRITE_WIDTH * pixelSize;
  const h = SPRITE_HEIGHT * pixelSize;

  const wrapperStyle: CSSProperties = {
    display: 'inline-block',
    width: SPRITE_WIDTH * size,
    height: SPRITE_HEIGHT * size,
    imageRendering: 'pixelated',
    cursor: onClick ? 'pointer' : 'default',
    ...style,
  };

  const svgStyle: CSSProperties = {
    transform: `scale(${size})${direction === 'left' ? ' scaleX(-1)' : ''}`,
    transformOrigin: 'top left',
    display: 'block',
  };

  return (
    <div
      className={`inky-mascot ${animationClass} ${className}`}
      style={wrapperStyle}
      onClick={onClick}
      role={onClick ? 'button' : 'img'}
      aria-label={ariaLabel}
    >
      <svg
        width={w}
        height={h}
        viewBox={`0 0 ${w} ${h}`}
        style={svgStyle}
        shapeRendering="crispEdges"
        xmlns="http://www.w3.org/2000/svg"
      >
        {effectiveAction === 'confused' && (
          <g>
            <rect x={1} y={-4} width={2} height={2} fill="#FFE045" shapeRendering="crispEdges" />
            <rect x={1} y={-2} width={2} height={1} fill="#2B2B54" shapeRendering="crispEdges" />
          </g>
        )}
        {effectiveAction === 'sleep' && (
          <g>
            <rect x={15} y={2} width={2} height={1} fill="#2B2B54" shapeRendering="crispEdges" />
            <rect x={16} y={3} width={2} height={1} fill="#2B2B54" shapeRendering="crispEdges" />
            <rect x={15} y={4} width={2} height={1} fill="#2B2B54" shapeRendering="crispEdges" />
          </g>
        )}
        <Sprite pixelSize={pixelSize} />
      </svg>
    </div>
  );
}

export default Inky;
