import { PDFDocument } from '@cantoo/pdf-lib'
import type { DocumentModel, ExportValidation, TextBlock } from '../../types/document'
import type { ExportOptions, IExportModule } from '../interfaces/IExportModule'
import type { IFontManager } from '../interfaces/IFontManager'
import { ExportValidator } from './ExportValidator'
import { FontEmbedder } from './FontEmbedder'
import { OverlayRedrawStrategy } from './OverlayRedrawStrategy'

export class ExportModule implements IExportModule {
  private validator = new ExportValidator();
  private fontEmbedder = new FontEmbedder();
  private strategy = new OverlayRedrawStrategy();

  validate(model: DocumentModel, fontManager: IFontManager, modifiedBlockIds?: Set<string>): ExportValidation {
    return this.validator.validate(model, fontManager, modifiedBlockIds);
  }

  async export(
    originalPdf: ArrayBuffer,
    model: DocumentModel,
    fontManager: IFontManager,
    onProgress?: (progress: number) => void,
    modifiedBlockIds?: Set<string>,
    options?: ExportOptions,
  ): Promise<Uint8Array> {
    // If the source PDF was encrypted, pdfjs already accepted the password
    // in the editor — pdf-lib needs the same password here or `load()` will
    // throw "Input document to PDFDocument.load is encrypted".
    const pdfDoc = await PDFDocument.load(
      originalPdf,
      options?.sourcePassword ? { password: options.sourcePassword } : undefined,
    );
    const pages = pdfDoc.getPages();

    const embeddedFonts = await this.fontEmbedder.embedAllUsedFonts(
      pdfDoc,
      model,
      fontManager,
      modifiedBlockIds
    );

    // Find pages that contain modified blocks (don't rely on page.dirty which may be cleared by reflow)
    const pagesToExport = modifiedBlockIds && modifiedBlockIds.size > 0
      ? model.pages.filter((p) =>
          p.elements.some((el) => el.type === 'text' && modifiedBlockIds.has(el.id))
        )
      : model.pages.filter((p) => p.dirty);

    const totalSteps = pagesToExport.length;
    let completed = 0;

    for (const pageModel of pagesToExport) {
      const page = pages[pageModel.index];
      if (!page) continue;

      const pageHeight = pageModel.height;

      for (const element of pageModel.elements) {
        if (element.type !== 'text') continue;
        const block = element as TextBlock;
        // Only redraw blocks that were actually modified
        if (modifiedBlockIds && modifiedBlockIds.size > 0 && !modifiedBlockIds.has(block.id)) continue;
        this.strategy.applyBlock(page, block, pageHeight, embeddedFonts);
      }

      completed++;
      onProgress?.(completed / totalSteps);
    }

    // Optional password-protection. `@cantoo/pdf-lib` wires in
    // `pdfDoc.encrypt(options)` which installs a PDF V4/V5 `/Encrypt`
    // dictionary; subsequent `save()` emits the strings/streams encrypted.
    // The user-password and owner-password are intentionally the same — the
    // recipient only needs one secret to open the document. Per-permission
    // control (printing / copying / annotation) can be layered on later.
    if (options?.password && options.password.length > 0) {
      pdfDoc.encrypt({
        userPassword: options.password,
        ownerPassword: options.password,
      });
    }

    return (await pdfDoc.save()) as Uint8Array;
  }
}
