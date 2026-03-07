import type { TextStyle, Color } from '../types/document'

export const DEFAULT_TEXT_COLOR: Color = { r: 0, g: 0, b: 0, a: 1 };

export const DEFAULT_TEXT_STYLE: TextStyle = {
  fontId: 'default-sans',
  fontSize: 12,
  fontWeight: 400,
  fontStyle: 'normal',
  color: DEFAULT_TEXT_COLOR,
  letterSpacing: 0,
};

export const DEFAULT_LINE_SPACING = 1.2;
export const DEFAULT_ALIGNMENT = 'left' as const;

export const FALLBACK_FONTS = [
  'Arial',
  'Helvetica',
  'Times New Roman',
  'Georgia',
  'Courier New',
  'sans-serif',
  'serif',
  'monospace',
];

export const DEFAULT_NEW_TEXTBLOCK_WIDTH = 200;
export const DEFAULT_NEW_TEXTBLOCK_HEIGHT = 50;
