import type { ImageElement, Rect } from '../../types/document'
import { createImageElement } from '../model/DocumentModel'
import { Logger } from '../infra/Logger'

const logger = new Logger('ImageExtractor');

// pdfjs OPS constants for image operations
const OPS_paintImageXObject = 85;
const OPS_paintJpegXObject = 82;

interface OperatorListLike {
  fnArray: number[];
  argsArray: unknown[][];
}

interface CommonObjsLike {
  get(name: string): unknown;
}

export class ImageExtractor {
  extractImages(
    operatorList: OperatorListLike,
    commonObjs: CommonObjsLike,
    objs: CommonObjsLike,
    _pageHeight: number,
  ): ImageElement[] {
    const images: ImageElement[] = [];

    for (let i = 0; i < operatorList.fnArray.length; i++) {
      const fn = operatorList.fnArray[i];

      if (fn === OPS_paintImageXObject || fn === OPS_paintJpegXObject) {
        try {
          const args = operatorList.argsArray[i];
          const objId = args[0] as string;

          let imgData: Record<string, unknown> | null = null;
          try {
            imgData = objs.get(objId) as Record<string, unknown>;
          } catch {
            try {
              imgData = commonObjs.get(objId) as Record<string, unknown>;
            } catch {
              // skip
            }
          }

          if (!imgData) continue;

          const width = (imgData.width as number) || 0;
          const height = (imgData.height as number) || 0;

          if (width === 0 || height === 0) continue;

          let imageBytes: Uint8Array;
          let mimeType: 'image/png' | 'image/jpeg' = 'image/png';

          if (fn === OPS_paintJpegXObject && imgData.data instanceof Uint8Array) {
            imageBytes = imgData.data;
            mimeType = 'image/jpeg';
          } else if (imgData.data instanceof Uint8Array) {
            imageBytes = imgData.data;
          } else {
            continue;
          }

          // Use placeholder bounds; actual transform would require tracking the CTM
          const bounds: Rect = {
            x: 0,
            y: 0,
            width,
            height,
          };

          images.push(createImageElement(bounds, imageBytes, mimeType));
        } catch (err) {
          logger.warn('Failed to extract image at operator index', i, err);
        }
      }
    }

    return images;
  }
}
