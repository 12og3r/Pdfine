export interface FontMetrics {
  unitsPerEm: number;
  ascender: number;
  descender: number;
  lineGap: number;
  xHeight: number;
  capHeight: number;
}

export interface FontInfo {
  id: string;
  name: string;
  family: string;
  weight: number;
  style: 'normal' | 'italic';
  isEmbedded: boolean;
  editable: boolean;
}

export interface GlyphMetrics {
  advanceWidth: number;
  leftSideBearing: number;
}
