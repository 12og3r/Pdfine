import type { RegisteredFont } from '../../types/document'
import { Logger } from '../infra/Logger'

const logger = new Logger('FontExtractor');

type SupportedFormat = RegisteredFont['supportedFormat'];

const FORMAT_MAP: Record<string, SupportedFormat> = {
  TrueType: 'truetype',
  OpenType: 'opentype',
  Type1: 'type1',
  CIDFontType0: 'cidfont',
  CIDFontType2: 'truetype',
  MMType1: 'type1',
};

function detectFormat(fontType: string): SupportedFormat {
  return FORMAT_MAP[fontType] || 'unknown';
}

function isEditable(format: SupportedFormat): boolean {
  return format === 'truetype' || format === 'opentype';
}

// pdfjs OPS.setFont opcode
const OPS_SET_FONT = 1;

// Types for pdfjs internal structures
interface CommonObjs {
  get?(key: string): unknown;
  has?(key: string): boolean;
  _objs?: Map<string, { data: unknown }>;
}

interface OperatorList {
  fnArray: number[];
  argsArray: unknown[][];
}

export interface PdfjsFontData {
  name: string;
  type: string;
  data?: Uint8Array | ArrayBuffer;
  loadedName?: string;
  isMonospace?: boolean;
  bold?: boolean;
  italic?: boolean;
}

export class FontExtractor {
  async extractFonts(pdfDoc: unknown): Promise<RegisteredFont[]> {
    const fonts: RegisteredFont[] = [];
    const seenFontNames = new Set<string>();

    try {
      const doc = pdfDoc as { numPages: number; getPage(n: number): Promise<unknown> };
      const numPages = doc.numPages;

      for (let i = 1; i <= numPages; i++) {
        const page = await doc.getPage(i) as {
          commonObjs: CommonObjs;
          getOperatorList(): Promise<OperatorList>;
        };

        const opList = await page.getOperatorList();
        const commonObjs = page.commonObjs;

        // Collect font names referenced by setFont operators (OPS.setFont = 1)
        const fontNames = new Set<string>();
        for (let j = 0; j < opList.fnArray.length; j++) {
          if (opList.fnArray[j] === OPS_SET_FONT) {
            const fontId = opList.argsArray[j]?.[0];
            if (typeof fontId === 'string') fontNames.add(fontId);
          }
        }

        for (const fontName of fontNames) {
          if (seenFontNames.has(fontName)) continue;

          const fontData = this.getFontData(commonObjs, fontName);
          if (!fontData || !fontData.name) continue;

          seenFontNames.add(fontName);

          const format = detectFormat(fontData.type || '');
          // pdfjs v5 may not expose bold/italic flags — detect from font name
          const isBold = fontData.bold ?? this.detectBoldFromName(fontData.name);
          const isItalic = fontData.italic ?? this.detectItalicFromName(fontData.name);
          const weight = isBold ? 700 : 400;
          const style: 'normal' | 'italic' = isItalic ? 'italic' : 'normal';
          const family = this.extractFamily(fontData.name);

          let dataBuffer: ArrayBuffer | undefined;
          if (fontData.data) {
            if (fontData.data instanceof ArrayBuffer) {
              dataBuffer = fontData.data;
            } else if (fontData.data instanceof Uint8Array) {
              const copy = new Uint8Array(fontData.data.byteLength);
              copy.set(fontData.data);
              dataBuffer = copy.buffer as ArrayBuffer;
            }
          }

          // Check if pdfjs already registered this font with the browser
          const loadedName = fontData.loadedName || fontName;
          let existingFontFace: FontFace | undefined;
          if (typeof document !== 'undefined') {
            document.fonts.forEach((ff) => {
              if (ff.family === loadedName && ff.status === 'loaded') {
                existingFontFace = ff;
              }
            });
          }

          // If pdfjs registered the font but we don't have raw data,
          // still mark it as editable since we can render with it
          const hasRegisteredFontFace = !!existingFontFace;
          const editable = isEditable(format) || hasRegisteredFontFace;

          const font: RegisteredFont = {
            id: loadedName,
            name: fontData.name,
            family,
            weight,
            style,
            data: dataBuffer,
            fontFace: existingFontFace,
            isEmbedded: !!dataBuffer || hasRegisteredFontFace,
            supportedFormat: format === 'unknown' && hasRegisteredFontFace ? 'truetype' : format,
            editable,
          };

          fonts.push(font);
        }

        // Legacy path: try _objs Map for older pdfjs versions
        if (fontNames.size === 0) {
          this.extractFromObjsMap(commonObjs, seenFontNames, fonts);
        }
      }
    } catch (err) {
      logger.warn('Error extracting fonts from PDF:', err);
    }

    logger.info(`Extracted ${fonts.length} fonts`);
    return fonts;
  }

  /** Get font data from commonObjs using get()/has() or legacy _objs Map */
  private getFontData(commonObjs: CommonObjs, fontName: string): PdfjsFontData | null {
    // pdfjs v5+: PDFObjects with get()/has() methods
    if (typeof commonObjs.has === 'function' && typeof commonObjs.get === 'function') {
      if (commonObjs.has(fontName)) {
        try {
          return commonObjs.get(fontName) as PdfjsFontData;
        } catch {
          return null;
        }
      }
    }
    return null;
  }

  /** Legacy extraction for older pdfjs versions using _objs Map */
  private extractFromObjsMap(
    commonObjs: CommonObjs,
    seenFontNames: Set<string>,
    fonts: RegisteredFont[],
  ): void {
    const objsMap = (commonObjs as { _objs?: Map<string, { data: unknown }> })._objs;
    if (!objsMap || !(objsMap instanceof Map)) return;

    for (const [key, value] of objsMap) {
      if (seenFontNames.has(key)) continue;

      const fontData = value?.data as PdfjsFontData | undefined;
      if (!fontData || !fontData.name) continue;

      seenFontNames.add(key);

      const format = detectFormat(fontData.type || '');
      const weight = fontData.bold ? 700 : 400;
      const style: 'normal' | 'italic' = fontData.italic ? 'italic' : 'normal';
      const family = this.extractFamily(fontData.name);

      let dataBuffer: ArrayBuffer | undefined;
      if (fontData.data) {
        if (fontData.data instanceof ArrayBuffer) {
          dataBuffer = fontData.data;
        } else if (fontData.data instanceof Uint8Array) {
          const copy = new Uint8Array(fontData.data.byteLength);
          copy.set(fontData.data);
          dataBuffer = copy.buffer as ArrayBuffer;
        }
      }

      fonts.push({
        id: fontData.loadedName || key,
        name: fontData.name,
        family,
        weight,
        style,
        data: dataBuffer,
        isEmbedded: !!dataBuffer,
        supportedFormat: format,
        editable: isEditable(format),
      });
    }
  }

  private detectBoldFromName(fontName: string): boolean {
    const lower = fontName.toLowerCase();
    return /[-,](bold|semibold|extrabold|black|heavy)/i.test(fontName) ||
      lower.includes('bold') || lower.includes('black') || lower.includes('heavy');
  }

  private detectItalicFromName(fontName: string): boolean {
    const lower = fontName.toLowerCase();
    return lower.includes('italic') || lower.includes('oblique');
  }

  private extractFamily(fontName: string): string {
    // Remove common suffixes like -Bold, -Italic, -BoldItalic, +subset prefix
    let family = fontName;

    // Remove subset prefix (e.g., "ABCDEF+" prefix)
    const plusIdx = family.indexOf('+');
    if (plusIdx !== -1 && plusIdx <= 6) {
      family = family.slice(plusIdx + 1);
    }

    // Remove style suffixes
    family = family
      .replace(/[-,](Bold|Italic|BoldItalic|Light|Medium|Regular|Semibold|ExtraBold|Thin|Black|Condensed|Expanded|Oblique)$/i, '')
      .replace(/[-,](Bold|Italic|BoldItalic|Light|Medium|Regular|Semibold|ExtraBold|Thin|Black|Condensed|Expanded|Oblique)$/i, ''); // run twice for compound

    return family || fontName;
  }
}
