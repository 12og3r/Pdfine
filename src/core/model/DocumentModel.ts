import type {
  DocumentModel,
  PDFMetadata,
  PageModel,
  TextBlock,
  Paragraph,
  TextRun,
  TextStyle,
  Rect,
  Color,
  ImageElement,
  PathElement,
  PathCommand,
} from '../../types/document'

let idCounter = 0;

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${++idCounter}`;
}

export function createDocumentModel(
  metadata: PDFMetadata,
  pages: PageModel[],
): DocumentModel {
  return {
    metadata,
    pages,
    fonts: new Map(),
  };
}

export function createPageModel(
  index: number,
  width: number,
  height: number,
): PageModel {
  return {
    index,
    width,
    height,
    elements: [],
    dirty: false,
  };
}

export function createTextBlock(
  paragraphs: Paragraph[],
  bounds: Rect,
  editable: boolean,
): TextBlock {
  return {
    type: 'text',
    id: generateId('tb'),
    bounds: { ...bounds },
    originalBounds: { ...bounds },
    paragraphs,
    editable,
    overflowState: { status: 'normal' },
  };
}

export function createParagraph(
  runs: TextRun[],
  alignment: 'left' | 'center' | 'right' | 'justify' = 'left',
  lineSpacing: number = 1.2,
): Paragraph {
  return { runs, alignment, lineSpacing };
}

export function createTextRun(text: string, style: TextStyle): TextRun {
  return { text, style };
}

export function createTextStyle(partial: Partial<TextStyle> & { fontId: string; fontSize: number }): TextStyle {
  return {
    fontWeight: 400,
    fontStyle: 'normal',
    color: { r: 0, g: 0, b: 0, a: 1 },
    ...partial,
  };
}

export function createImageElement(
  bounds: Rect,
  imageData: Uint8Array,
  mimeType: 'image/png' | 'image/jpeg',
): ImageElement {
  return {
    type: 'image',
    id: generateId('img'),
    bounds,
    imageData,
    mimeType,
  };
}

export function createPathElement(
  commands: PathCommand[],
  bounds: Rect,
  fillColor?: Color,
  strokeColor?: Color,
  strokeWidth?: number,
): PathElement {
  return {
    type: 'path',
    id: generateId('path'),
    commands,
    bounds,
    fillColor,
    strokeColor,
    strokeWidth,
  };
}
