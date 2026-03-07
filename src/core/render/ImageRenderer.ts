import type { ImageElement } from '../../types/document';

export class ImageRenderer {
  private cache = new Map<string, HTMLImageElement>();

  renderImage(ctx: CanvasRenderingContext2D, image: ImageElement, scale: number): void {
    const cached = this.cache.get(image.id);
    if (cached && cached.complete) {
      this.drawImage(ctx, cached, image, scale);
      return;
    }

    if (!cached) {
      this.decodeAndCache(image).then((img) => {
        this.drawImage(ctx, img, image, scale);
      });
    }
  }

  private drawImage(
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    element: ImageElement,
    scale: number
  ): void {
    const { x, y, width, height } = element.bounds;
    const sx = x * scale;
    const sy = y * scale;
    const sw = width * scale;
    const sh = height * scale;

    ctx.save();

    if (element.rotation) {
      const cx = sx + sw / 2;
      const cy = sy + sh / 2;
      ctx.translate(cx, cy);
      ctx.rotate((element.rotation * Math.PI) / 180);
      ctx.drawImage(img, -sw / 2, -sh / 2, sw, sh);
    } else {
      ctx.drawImage(img, sx, sy, sw, sh);
    }

    ctx.restore();
  }

  private async decodeAndCache(image: ImageElement): Promise<HTMLImageElement> {
    const blob = new Blob([image.imageData as BlobPart], { type: image.mimeType });
    const url = URL.createObjectURL(blob);
    const img = new Image();

    return new Promise<HTMLImageElement>((resolve, reject) => {
      img.onload = () => {
        URL.revokeObjectURL(url);
        this.cache.set(image.id, img);
        resolve(img);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error(`Failed to decode image ${image.id}`));
      };
      img.src = url;
    });
  }

  clearCache(): void {
    this.cache.clear();
  }
}
