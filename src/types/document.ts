// ============== Basic Types ==============
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Color {
  r: number;
  g: number;
  b: number;
  a?: number;
}

export interface Point {
  x: number;
  y: number;
}

export type PathCommand =
  | { op: 'M'; x: number; y: number }
  | { op: 'L'; x: number; y: number }
  | { op: 'C'; cp1x: number; cp1y: number; cp2x: number; cp2y: number; x: number; y: number }
  | { op: 'Z' };

// ============== Top-level Document ==============
export interface DocumentModel {
  metadata: PDFMetadata;
  pages: PageModel[];
  fonts: Map<string, RegisteredFont>;
}

export interface PDFMetadata {
  title?: string;
  author?: string;
  pageCount: number;
  encrypted: boolean;
  fileName?: string;
  fileSize?: number;
}

// ============== Registered Font ==============
export interface RegisteredFont {
  id: string;
  name: string;
  family: string;
  weight: number;
  style: 'normal' | 'italic';
  data?: ArrayBuffer;
  fontFace?: FontFace;
  isEmbedded: boolean;
  supportedFormat: 'truetype' | 'opentype' | 'type1' | 'cidfont' | 'unknown';
  editable: boolean;
}

// ============== Page ==============
export interface PageModel {
  index: number;
  width: number;
  height: number;
  elements: PageElement[];
  dirty: boolean;
}

export type PageElement = TextBlock | ImageElement | PathElement | OverlayElement;

// ============== Text Block ==============
export interface TextBlock {
  type: 'text';
  id: string;
  bounds: Rect;
  originalBounds: Rect;
  paragraphs: Paragraph[];
  editable: boolean;
  overflowState: OverflowState;
}

export type OverflowState =
  | { status: 'normal' }
  | { status: 'within_tolerance'; overflowPercent: number }
  | { status: 'auto_shrunk'; adjustments: ShrinkAdjustment[] }
  | { status: 'overflowing'; overflowPercent: number };

export interface ShrinkAdjustment {
  type: 'lineSpacing' | 'letterSpacing' | 'fontSize';
  originalValue: number;
  adjustedValue: number;
}

export interface Paragraph {
  runs: TextRun[];
  alignment: 'left' | 'center' | 'right' | 'justify';
  lineSpacing: number;
  pdfLineHeight?: number;  // actual baseline-to-baseline distance from PDF coordinates
  lines?: LayoutLine[];
}

export interface TextRun {
  text: string;
  style: TextStyle;
  pdfCharWidths?: number[];  // per-character advance widths from PDF (parallel to text chars)
  pdfRunWidth?: number;      // total PDF width for the run; used at layout time for proportional scaling
  pdfLineWidths?: number[];  // per-line-segment PDF widths (parallel to \n-delimited segments of text)
}

export interface TextStyle {
  fontId: string;
  fontSize: number;
  fontWeight: number;
  fontStyle: 'normal' | 'italic';
  color: Color;
  letterSpacing?: number;
  isFallbackFont?: boolean;
}

// ============== Layout Results ==============
export interface LayoutLine {
  glyphs: PositionedGlyph[];
  baseline: number;
  width: number;
  height: number;
  y: number;
}

export interface PositionedGlyph {
  char: string;
  x: number;
  y: number;
  width: number;
  height: number;
  style: TextStyle;
}

// ============== Image ==============
export interface ImageElement {
  type: 'image';
  id: string;
  bounds: Rect;
  imageData: Uint8Array;
  mimeType: 'image/png' | 'image/jpeg';
  rotation?: number;
}

// ============== Vector Path ==============
export interface PathElement {
  type: 'path';
  id: string;
  commands: PathCommand[];
  fillColor?: Color;
  strokeColor?: Color;
  strokeWidth?: number;
  bounds: Rect;
}

// ============== Overlay ==============
export interface OverlayElement {
  type: 'overlay';
  id: string;
  kind: 'drawing' | 'shape' | 'stamp' | 'annotation' | 'textbox';
  bounds: Rect;
  data: OverlayData;
}

export type OverlayData =
  | DrawingData
  | ShapeData
  | TextBoxData;

export interface DrawingData {
  type: 'drawing';
  points: Point[];
  color: Color;
  lineWidth: number;
}

export interface ShapeData {
  type: 'shape';
  shapeType: 'rectangle' | 'circle' | 'arrow' | 'line';
  fillColor?: Color;
  strokeColor: Color;
  strokeWidth: number;
}

export interface TextBoxData {
  type: 'textbox';
  paragraphs: Paragraph[];
}

// ============== Edit Commands ==============
export type EditCommand =
  | { type: 'INSERT_TEXT'; pageIdx: number; blockId: string; offset: number; text: string }
  | { type: 'DELETE_TEXT'; pageIdx: number; blockId: string; offset: number; length: number; deletedText: string }
  | { type: 'REPLACE_TEXT'; pageIdx: number; blockId: string; offset: number; length: number; text: string; originalText: string }
  | { type: 'CHANGE_STYLE'; pageIdx: number; blockId: string; offset: number; length: number; style: Partial<TextStyle>; originalStyle: Partial<TextStyle> }
  | { type: 'INSERT_IMAGE'; pageIdx: number; image: ImageElement }
  | { type: 'DELETE_ELEMENT'; pageIdx: number; elementId: string; element: PageElement }
  | { type: 'MOVE_ELEMENT'; pageIdx: number; elementId: string; newPosition: Point; originalPosition: Point }
  | { type: 'ADD_TEXTBLOCK'; pageIdx: number; block: TextBlock }
  | { type: 'ADD_OVERLAY'; pageIdx: number; overlay: OverlayElement }
  | { type: 'BATCH'; commands: EditCommand[] };

// ============== Export ==============
export interface ExportValidation {
  overflowBlocks: string[];
  missingGlyphs: Array<{
    blockId: string;
    char: string;
    fallbackFont: string;
  }>;
  warnings: string[];
  canExport: boolean;
}
