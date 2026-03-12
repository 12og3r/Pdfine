import type { FontInfo, FontMetrics } from '../../types/font'
import type { RegisteredFont } from '../../types/document'

export interface IFontManager {
  extractAndRegister(pdfDoc: unknown): Promise<void>;
  getFont(fontId: string): RegisteredFont | undefined;
  getMetrics(fontId: string): FontMetrics | null;
  measureText(text: string, fontId: string, fontSize: number): { width: number; height: number };
  measureChar(char: string, fontId: string, fontSize: number): number;
  getAvailableFonts(): FontInfo[];
  getFontFace(fontId: string): FontFace | null;
  hasGlyph(fontId: string, char: string): boolean;
  getFallbackFont(fontId: string, char: string): string;
  getFontData(fontId: string): ArrayBuffer | undefined;
  getAscent(fontId: string, fontSize: number): number;
  destroy(): void;
}
