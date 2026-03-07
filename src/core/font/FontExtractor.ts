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
          commonObjs: { _objs: Map<string, { data: unknown }> } | { [key: string]: unknown };
          getOperatorList(): Promise<unknown>;
        };

        // Force operator list to load so fonts get populated into commonObjs
        await page.getOperatorList();

        // Access fonts through commonObjs
        const commonObjs = page.commonObjs;
        const objsMap = (commonObjs as { _objs?: Map<string, { data: unknown }> })._objs;

        if (objsMap && objsMap instanceof Map) {
          for (const [key, value] of objsMap) {
            if (seenFontNames.has(key)) continue;

            const fontData = value?.data as PdfjsFontData | undefined;
            if (!fontData || !fontData.name) continue;

            seenFontNames.add(key);

            const format = detectFormat(fontData.type || '');
            const weight = fontData.bold ? 700 : 400;
            const style: 'normal' | 'italic' = fontData.italic ? 'italic' : 'normal';

            // Extract font family from the name
            const family = this.extractFamily(fontData.name);

            let dataBuffer: ArrayBuffer | undefined;
            if (fontData.data) {
              if (fontData.data instanceof ArrayBuffer) {
                dataBuffer = fontData.data;
              } else if (fontData.data instanceof Uint8Array) {
                // Copy into a new ArrayBuffer to avoid SharedArrayBuffer issues
                const copy = new Uint8Array(fontData.data.byteLength);
                copy.set(fontData.data);
                dataBuffer = copy.buffer as ArrayBuffer;
              }
            }

            const font: RegisteredFont = {
              id: fontData.loadedName || key,
              name: fontData.name,
              family,
              weight,
              style,
              data: dataBuffer,
              isEmbedded: !!dataBuffer,
              supportedFormat: format,
              editable: isEditable(format),
            };

            fonts.push(font);
          }
        }
      }
    } catch (err) {
      logger.warn('Error extracting fonts from PDF:', err);
    }

    logger.info(`Extracted ${fonts.length} fonts`);
    return fonts;
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
