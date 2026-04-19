import type { DocumentModel, ExportValidation } from '../../types/document'
import type { IFontManager } from './IFontManager'

export interface ExportOptions {
  /** Optional — if present the saved PDF is password-protected with this
   *  user-password (owner-password defaults to the same value). Leaving it
   *  undefined produces an unencrypted PDF. */
  password?: string;
  /** The password the user supplied to unlock the source PDF, if any. pdf-lib
   *  needs this to load an encrypted source document even though pdfjs has
   *  already accepted it in the editor. Kept separate from `password` because
   *  one is about decrypting the input, the other about encrypting the output. */
  sourcePassword?: string;
}

export interface IExportModule {
  validate(model: DocumentModel, fontManager: IFontManager, modifiedBlockIds?: Set<string>): ExportValidation;
  export(
    originalPdf: ArrayBuffer,
    model: DocumentModel,
    fontManager: IFontManager,
    onProgress?: (progress: number) => void,
    modifiedBlockIds?: Set<string>,
    options?: ExportOptions,
  ): Promise<Uint8Array>;
}
