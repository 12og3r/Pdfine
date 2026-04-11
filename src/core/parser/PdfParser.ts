import * as pdfjsLib from 'pdfjs-dist'
import type { IPdfParser } from '../interfaces/IPdfParser'
import type { DocumentModel, PageModel, Color } from '../../types/document'
import { createDocumentModel, createPageModel } from '../model/DocumentModel'
import { TextBlockBuilder } from './TextBlockBuilder'
import type { RawTextItem } from './TextBlockBuilder'
import { ImageExtractor } from './ImageExtractor'
import { PathExtractor } from './PathExtractor'
import {
  extractTextColorEvents,
  splitTextItemsByColor,
  type ColoredSegment,
  type OperatorListLike,
  type OpsConstants,
} from './TextColorExtractor'
import { Logger } from '../infra/Logger'

pdfjsLib.GlobalWorkerOptions.workerSrc = `${import.meta.env.BASE_URL}pdf.worker.min.mjs`;

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

    // Fetch the operator list once and reuse it for both text-color extraction
    // and image/path extraction below.
    let operatorList: OperatorListLike | null = null;
    try {
      operatorList = (await page.getOperatorList()) as unknown as OperatorListLike;
    } catch (err) {
      logger.warn('Failed to load operator list for page', index, err);
    }

    // Extract text
    try {
      const textContent = await page.getTextContent();
      const colorSegments = operatorList
        ? splitTextItemsByColor(
            textContent.items as Array<{ str: string }>,
            extractTextColorEvents(operatorList, pdfjsLib.OPS as unknown as OpsConstants),
          )
        : [];
      const rawItems = this.convertTextItems(textContent, viewport.height, colorSegments);
      const textBlocks = this.textBlockBuilder.buildBlocks(rawItems);
      pageModel.elements.push(...textBlocks);
    } catch (err) {
      logger.warn('Failed to extract text from page', index, err);
    }

    // Extract images and paths from operator list
    if (operatorList) {
      try {
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
    }

    return pageModel;
  }

  private convertTextItems(
    textContent: { items: unknown[] },
    pageHeight: number,
    colorSegments: ColoredSegment[],
  ): RawTextItem[] {
    const rawItems: RawTextItem[] = [];

    // Group color segments by their source itemIndex for fast lookup.
    const segmentsByItem = new Map<number, ColoredSegment[]>();
    for (const seg of colorSegments) {
      const list = segmentsByItem.get(seg.itemIndex);
      if (list) list.push(seg);
      else segmentsByItem.set(seg.itemIndex, [seg]);
    }

    for (let idx = 0; idx < textContent.items.length; idx++) {
      const item = textContent.items[idx];
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

      // Determine font properties from fontName.  The fontName from
      // getTextContent is usually pdfjs's internal loadedName (e.g. "g_d0_f1"),
      // not the embedded font's real name, so this heuristic only catches the
      // rare cases where pdfjs surfaces a meaningful name.  EditorCore re-syncs
      // weight/style from the registered FontFace after font extraction.
      const fontId = textItem.fontName || 'default';
      const fontWeight = fontId.toLowerCase().includes('bold') ? 700 : 400;
      const fontStyle: 'normal' | 'italic' = fontId.toLowerCase().includes('italic') || fontId.toLowerCase().includes('oblique')
        ? 'italic'
        : 'normal';

      const editable = true;

      // Resolve colored sub-segments for this item.  If the operator list told
      // us this item spans multiple fill colors, emit one RawTextItem per
      // segment with proportionally split x / width so downstream layout sees
      // each colored run separately.
      const segments = segmentsByItem.get(idx);
      const totalLen = textItem.str.length;
      const itemWidth = textItem.width;

      if (!segments || segments.length === 0) {
        const color: Color = { r: 0, g: 0, b: 0, a: 1 };
        rawItems.push({
          text: textItem.str,
          x: pdfX,
          y: layoutY,
          width: itemWidth,
          height: textItem.height || fontSize,
          fontSize,
          fontId,
          fontWeight,
          fontStyle,
          color,
          editable,
          pdfItemWidth: itemWidth > 0 ? itemWidth : undefined,
        });
        continue;
      }

      for (const seg of segments) {
        if (!seg.text) continue;
        const fraction = totalLen > 0 ? seg.text.length / totalLen : 1;
        const offsetFraction = totalLen > 0 ? seg.startOffset / totalLen : 0;
        const segWidth = itemWidth * fraction;
        const segX = pdfX + itemWidth * offsetFraction;
        rawItems.push({
          text: seg.text,
          x: segX,
          y: layoutY,
          width: segWidth,
          height: textItem.height || fontSize,
          fontSize,
          fontId,
          fontWeight,
          fontStyle,
          color: { ...seg.color },
          editable,
          pdfItemWidth: segWidth > 0 ? segWidth : undefined,
        });
      }
    }

    return rawItems;
  }
}
