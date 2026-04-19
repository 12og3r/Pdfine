import { StandardFonts } from '@cantoo/pdf-lib'
import type { PDFDocument, PDFFont } from '@cantoo/pdf-lib'
import type { DocumentModel, TextBlock, TextStyle } from '../../types/document'
import type { IFontManager } from '../interfaces/IFontManager'
import {
  fontEmbedKey,
  getStandardFontSpec,
  isStandardFontId,
} from '../font/StandardFonts'

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

  /** Build the composite key the exporter uses to look up the PDFFont for a
   *  given run style — pairs with `fontEmbedKey` so embedder and strategy
   *  agree on weight / italic axes for curated standard fonts. */
  keyForStyle(style: TextStyle): string {
    return fontEmbedKey(style.fontId, style.fontWeight >= 600, style.fontStyle === 'italic')
  }

  /** Embed the font corresponding to the given style, returning the PDFFont
   *  that `drawText` should use. For curated std fonts this selects the right
   *  StandardFonts variant (Helvetica-Bold vs Helvetica-Oblique etc.). For
   *  other fonts we fall back to the raw font data or Helvetica as before. */
  async embedForStyle(
    pdfDoc: PDFDocument,
    style: TextStyle,
    fontManager: IFontManager,
  ): Promise<PDFFont> {
    this.resetCacheIfDocChanged(pdfDoc);
    const key = this.keyForStyle(style);
    const cached = this.cache.get(key);
    if (cached) return cached;

    let font: PDFFont;
    const std = getStandardFontSpec(style.fontId);
    if (std) {
      const variant = std.pdfLibVariant(
        style.fontWeight >= 600,
        style.fontStyle === 'italic',
      );
      font = await pdfDoc.embedFont(variant);
    } else {
      try {
        const fontData = fontManager.getFontData(style.fontId);
        if (fontData) {
          font = await pdfDoc.embedFont(fontData, { subset: false });
        } else {
          font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        }
      } catch {
        font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      }
    }

    this.cache.set(key, font);
    return font;
  }

  /** @deprecated — kept for older callers that resolve fonts by id alone.
   *  Prefer `embedForStyle` so curated standard fonts pick the correct
   *  weight/italic variant. */
  async embedFont(
    pdfDoc: PDFDocument,
    fontId: string,
    fontManager: IFontManager,
  ): Promise<PDFFont> {
    return this.embedForStyle(
      pdfDoc,
      { fontId, fontSize: 12, fontWeight: 400, fontStyle: 'normal', color: { r: 0, g: 0, b: 0 } },
      fontManager,
    );
  }

  async embedAllUsedFonts(
    pdfDoc: PDFDocument,
    model: DocumentModel,
    fontManager: IFontManager,
    modifiedBlockIds?: Set<string>,
  ): Promise<Map<string, PDFFont>> {
    this.resetCacheIfDocChanged(pdfDoc);
    // Collect one (fontId, bold, italic) combination per style we'll draw.
    // Non-standard fonts ignore the bold/italic axis (their composite key
    // degenerates to fontId), so we end up embedding each raw font once.
    const combos = new Map<string, TextStyle>();

    for (const page of model.pages) {
      for (const element of page.elements) {
        if (element.type !== 'text') continue;
        const block = element as TextBlock;
        if (modifiedBlockIds && modifiedBlockIds.size > 0 && !modifiedBlockIds.has(block.id)) continue;
        for (const para of block.paragraphs) {
          for (const run of para.runs) {
            const key = this.keyForStyle(run.style);
            if (!combos.has(key)) combos.set(key, run.style);
          }
        }
      }
    }

    for (const style of combos.values()) {
      await this.embedForStyle(pdfDoc, style, fontManager);
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

// Re-export the helper so OverlayRedrawStrategy can look up by the same key
// the embedder indexed under, without duplicating the std-font detection.
export { fontEmbedKey, isStandardFontId }
