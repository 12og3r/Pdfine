import type { DocumentModel } from '../../types/document'

export interface IPdfParser {
  parse(data: ArrayBuffer, password?: string): Promise<DocumentModel>;
}
