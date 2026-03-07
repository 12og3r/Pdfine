import { StandardFonts } from 'pdf-lib'
import type { PDFDocument, PDFFont } from 'pdf-lib'
import type { DocumentModel, TextBlock } from '../../types/document'
import type { IFontManager } from '../interfaces/IFontManager'

export class FontEmbedder {
  private cache = new Map<string, PDFFont>();

  async embedFont(
    pdfDoc: PDFDocument,
    fontId: string,
    fontManager: IFontManager
  ): Promise<PDFFont> {
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
}
