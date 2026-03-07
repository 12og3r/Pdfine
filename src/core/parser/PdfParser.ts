import * as pdfjsLib from 'pdfjs-dist'
import type { IPdfParser } from '../interfaces/IPdfParser'
import type { DocumentModel, PageModel, Color } from '../../types/document'
import { createDocumentModel, createPageModel } from '../model/DocumentModel'
import { TextBlockBuilder } from './TextBlockBuilder'
import type { RawTextItem } from './TextBlockBuilder'
import { ImageExtractor } from './ImageExtractor'
import { PathExtractor } from './PathExtractor'
import { Logger } from '../infra/Logger'

pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

const logger = new Logger('PdfParser');

export class PdfParser implements IPdfParser {
  private textBlockBuilder = new TextBlockBuilder();
  private imageExtractor = new ImageExtractor();
  private pathExtractor = new PathExtractor();

  async parse(data: ArrayBuffer, password?: string): Promise<DocumentModel> {
    logger.info('Starting PDF parse, size:', data.byteLength);

    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(data),
      password: password ?? undefined,
    });

    const pdfDoc = loadingTask.promise ? await loadingTask.promise : await (loadingTask as unknown as Promise<pdfjsLib.PDFDocumentProxy>);

    const metadata = await this.extractMetadata(pdfDoc);
    const pages: PageModel[] = [];

    for (let i = 0; i < pdfDoc.numPages; i++) {
      const page = await pdfDoc.getPage(i + 1); // pdfjs pages are 1-indexed
      const pageModel = await this.parsePage(page, i);
      pages.push(pageModel);
    }

    const doc = createDocumentModel(metadata, pages);

    // Store pdfDoc reference for font extraction (accessible via the returned model)
    (doc as DocumentModel & { _pdfDoc?: unknown })._pdfDoc = pdfDoc;

    logger.info('PDF parsed successfully:', pdfDoc.numPages, 'pages');
    return doc;
  }

  private async extractMetadata(pdfDoc: pdfjsLib.PDFDocumentProxy) {
    let title: string | undefined;
    let author: string | undefined;

    try {
      const meta = await pdfDoc.getMetadata();
      const info = meta.info as Record<string, unknown> | undefined;
      if (info) {
        title = (info.Title as string) || undefined;
        author = (info.Author as string) || undefined;
      }
    } catch {
      // metadata may not be available
    }

    return {
      title,
      author,
      pageCount: pdfDoc.numPages,
      encrypted: false,
    };
  }

  private async parsePage(page: pdfjsLib.PDFPageProxy, index: number): Promise<PageModel> {
    const viewport = page.getViewport({ scale: 1 });
    const pageModel = createPageModel(index, viewport.width, viewport.height);

    // Extract text
    try {
      const textContent = await page.getTextContent();
      const rawItems = this.convertTextItems(textContent, viewport.height);
      const textBlocks = this.textBlockBuilder.buildBlocks(rawItems);
      pageModel.elements.push(...textBlocks);
    } catch (err) {
      logger.warn('Failed to extract text from page', index, err);
    }

    // Extract images and paths from operator list
    try {
      const operatorList = await page.getOperatorList();
      const commonObjs = page.commonObjs as unknown as { get(name: string): unknown };
      const objs = page.objs as unknown as { get(name: string): unknown };

      const images = this.imageExtractor.extractImages(
        operatorList,
        commonObjs,
        objs,
        viewport.height,
      );
      pageModel.elements.push(...images);

      const paths = this.pathExtractor.extractPaths(operatorList, viewport.height);
      pageModel.elements.push(...paths);
    } catch (err) {
      logger.warn('Failed to extract images/paths from page', index, err);
    }

    return pageModel;
  }

  private convertTextItems(textContent: { items: unknown[] }, pageHeight: number): RawTextItem[] {
    const rawItems: RawTextItem[] = [];

    for (const item of textContent.items) {
      const textItem = item as {
        str: string;
        dir: string;
        width: number;
        height: number;
        transform: number[];
        fontName: string;
        hasEOL?: boolean;
      };

      if (!textItem.str || textItem.str.trim() === '') continue;

      // transform: [scaleX, skewY, skewX, scaleY, translateX, translateY]
      const tx = textItem.transform;
      const fontSize = Math.abs(tx[3]) || Math.abs(tx[0]) || 12;
      const pdfX = tx[4];
      const pdfY = tx[5];

      // Convert from PDF coords (bottom-left) to layout coords (top-left)
      const layoutY = pageHeight - pdfY;

      // Determine font properties from fontName
      const fontId = textItem.fontName || 'default';
      const fontWeight = fontId.toLowerCase().includes('bold') ? 700 : 400;
      const fontStyle: 'normal' | 'italic' = fontId.toLowerCase().includes('italic') || fontId.toLowerCase().includes('oblique')
        ? 'italic'
        : 'normal';

      // Default to black text
      const color: Color = { r: 0, g: 0, b: 0, a: 1 };

      // Determine editability based on font name heuristics
      // The actual font type check happens after font extraction
      const editable = true; // Will be refined during font registration

      rawItems.push({
        text: textItem.str,
        x: pdfX,
        y: layoutY,
        width: textItem.width,
        height: textItem.height || fontSize,
        fontSize,
        fontId,
        fontWeight,
        fontStyle,
        color,
        editable,
      });
    }

    return rawItems;
  }
}
