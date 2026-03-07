import type { DocumentModel, ExportValidation } from '../../types/document'
import type { IFontManager } from './IFontManager'

export interface IExportModule {
  validate(model: DocumentModel, fontManager: IFontManager, modifiedBlockIds?: Set<string>): ExportValidation;
  export(
    originalPdf: ArrayBuffer,
    model: DocumentModel,
    fontManager: IFontManager,
    onProgress?: (progress: number) => void,
    modifiedBlockIds?: Set<string>
  ): Promise<Uint8Array>;
}
