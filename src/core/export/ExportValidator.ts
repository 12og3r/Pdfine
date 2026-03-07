import type { DocumentModel, ExportValidation, TextBlock } from '../../types/document'
import type { IFontManager } from '../interfaces/IFontManager'

export class ExportValidator {
  validate(model: DocumentModel, fontManager: IFontManager, modifiedBlockIds?: Set<string>): ExportValidation {
    const overflowBlocks: string[] = [];
    const missingGlyphs: Array<{ blockId: string; char: string; fallbackFont: string }> = [];
    const warnings: string[] = [];

    for (const page of model.pages) {
      for (const element of page.elements) {
        if (element.type !== 'text') continue;
        const block = element as TextBlock;
        // Only validate modified blocks
        if (modifiedBlockIds && !modifiedBlockIds.has(block.id)) continue;

        if (block.overflowState.status === 'overflowing') {
          overflowBlocks.push(block.id);
        }

        for (const para of block.paragraphs) {
          for (const run of para.runs) {
            for (const char of run.text) {
              if (!fontManager.hasGlyph(run.style.fontId, char)) {
                const fallbackFont = fontManager.getFallbackFont(run.style.fontId, char);
                missingGlyphs.push({
                  blockId: block.id,
                  char,
                  fallbackFont,
                });
              }
            }
          }
        }
      }
    }

    if (overflowBlocks.length > 0) {
      warnings.push(
        `${overflowBlocks.length} text block(s) have overflowing content that may be clipped: ${overflowBlocks.join(', ')}`
      );
    }

    if (missingGlyphs.length > 0) {
      const uniqueChars = [...new Set(missingGlyphs.map((g) => g.char))];
      warnings.push(
        `${missingGlyphs.length} character(s) missing from their assigned font and will use fallback: ${uniqueChars.join(', ')}`
      );
    }

    return {
      overflowBlocks,
      missingGlyphs,
      warnings,
      canExport: true,
    };
  }
}
