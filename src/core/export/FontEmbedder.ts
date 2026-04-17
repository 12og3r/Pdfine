import { StandardFonts } from 'pdf-lib'
import type { PDFDocument, PDFFont } from 'pdf-lib'
import type { DocumentModel, TextBlock } from '../../types/document'
import type { IFontManager } from '../interfaces/IFontManager'

export class FontEmbedder {
  // Cache is scoped to a single PDFDocument instance. Each `export()` call
  // loads a fresh PDFDocument, and PDFFont objects are bound to the document
  // that embedded them — reusing a PDFFont across documents leaves pdf-lib
  // emitting a /Font entry whose indirect ref points at the previous
  // document's object graph (BaseFont undefined). pdfjs is lenient and falls
  // back, but strict PDF viewers (Preview.app, Acrobat, iOS) can't resolve
  // the font and render the whole overlay text as blank. Reset on each export.
  private cache = new Map<string, PDFFont>();
  private cacheDoc: PDFDocument | null = null;

  async embedFont(
    pdfDoc: PDFDocument,
    fontId: string,
    fontManager: IFontManager
  ): Promise<PDFFont> {
    this.resetCacheIfDocChanged(pdfDoc);
    const cached = this.cache.get(fontId);
    if (cached) return cached;

    let font: PDFFont;
    try {
      const fontData = fontManager.getFontData(fontId);
      if (fontData) {
        font = await pdfDoc.embedFont(fontData, { subset: false });
      } else {
        font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      }
    } catch {
      font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    }

    this.cache.set(fontId, font);
    return font;
  }

  async embedAllUsedFonts(
    pdfDoc: PDFDocument,
    model: DocumentModel,
    fontManager: IFontManager,
    modifiedBlockIds?: Set<string>
  ): Promise<Map<string, PDFFont>> {
    this.resetCacheIfDocChanged(pdfDoc);
    const fontIds = new Set<string>();

    for (const page of model.pages) {
      for (const element of page.elements) {
        if (element.type !== 'text') continue;
        const block = element as TextBlock;
        // Only collect fonts from modified blocks
        if (modifiedBlockIds && modifiedBlockIds.size > 0 && !modifiedBlockIds.has(block.id)) continue;
        for (const para of block.paragraphs) {
          for (const run of para.runs) {
            fontIds.add(run.style.fontId);
          }
        }
      }
    }

    for (const fontId of fontIds) {
      await this.embedFont(pdfDoc, fontId, fontManager);
    }

    return this.cache;
  }

  private resetCacheIfDocChanged(pdfDoc: PDFDocument): void {
    if (this.cacheDoc !== pdfDoc) {
      this.cache.clear();
      this.cacheDoc = pdfDoc;
    }
  }
}
