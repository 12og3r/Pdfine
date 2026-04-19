import { StandardFonts as PdfLibStandardFonts } from '@cantoo/pdf-lib'
import type { RegisteredFont } from '../../types/document'

/**
 * Curated "common" font choices offered in the inspector's Font dropdown.
 *
 * Two tiers:
 *   - `pdf-standard`: maps 1-to-1 onto pdf-lib's 14 base PDF fonts. Canvas
 *     uses the matching system font stack; export embeds the corresponding
 *     StandardFonts variant. Canvas widths and export widths are in sync.
 *   - `fallback`: system or web fonts that render with their real glyphs on
 *     Canvas (so the user sees Inter / Open Sans / Georgia on-screen) but
 *     export still goes through the closest StandardFont (Helvetica for
 *     sans-serifs, Times Roman for Georgia). Widths may drift a bit in the
 *     exported PDF, but the basic weight/italic axis is preserved — bold
 *     Inter exports as Helvetica-Bold, etc. No binary shipping required.
 *
 * Picking a font of either tier produces a valid exported PDF that renders
 * in every viewer without requiring the system to have that font installed.
 */
export interface StandardFontSpec {
  /** Stable fontId used in TextStyle. */
  id: string
  /** Display label for the font dropdown. */
  name: string
  /** CSS font-family shorthand to feed into `ctx.font` for Canvas rendering. */
  cssFamily: string
  /** Resolves the pdf-lib StandardFonts variant for a given weight / italic. */
  pdfLibVariant(bold: boolean, italic: boolean): PdfLibStandardFonts
  /** `pdf-standard` = exact match with pdf-lib StandardFonts; `fallback` =
   *  system/web font with closest-StandardFonts proxy for export. */
  kind: 'pdf-standard' | 'fallback'
}

function sansVariant(bold: boolean, italic: boolean): PdfLibStandardFonts {
  if (bold && italic) return PdfLibStandardFonts.HelveticaBoldOblique
  if (bold) return PdfLibStandardFonts.HelveticaBold
  if (italic) return PdfLibStandardFonts.HelveticaOblique
  return PdfLibStandardFonts.Helvetica
}

function serifVariant(bold: boolean, italic: boolean): PdfLibStandardFonts {
  if (bold && italic) return PdfLibStandardFonts.TimesRomanBoldItalic
  if (bold) return PdfLibStandardFonts.TimesRomanBold
  if (italic) return PdfLibStandardFonts.TimesRomanItalic
  return PdfLibStandardFonts.TimesRoman
}

function monoVariant(bold: boolean, italic: boolean): PdfLibStandardFonts {
  if (bold && italic) return PdfLibStandardFonts.CourierBoldOblique
  if (bold) return PdfLibStandardFonts.CourierBold
  if (italic) return PdfLibStandardFonts.CourierOblique
  return PdfLibStandardFonts.Courier
}

export const STANDARD_FONTS: StandardFontSpec[] = [
  // --- Tier 1: PDF base fonts — canvas and export widths match ---
  {
    id: 'std-helvetica',
    name: 'Helvetica',
    cssFamily: 'Helvetica, Arial, "Nimbus Sans", sans-serif',
    pdfLibVariant: sansVariant,
    kind: 'pdf-standard',
  },
  {
    id: 'std-times-roman',
    name: 'Times Roman',
    cssFamily: '"Times New Roman", Times, "Nimbus Roman", serif',
    pdfLibVariant: serifVariant,
    kind: 'pdf-standard',
  },
  {
    id: 'std-courier',
    name: 'Courier',
    cssFamily: '"Courier New", Courier, monospace',
    pdfLibVariant: monoVariant,
    kind: 'pdf-standard',
  },

  // --- Tier 2: system / web fonts — canvas shows the real glyphs, export
  // goes through the closest pdf-lib StandardFonts variant. ---
  {
    id: 'ui-arial',
    name: 'Arial',
    cssFamily: 'Arial, "Helvetica Neue", Helvetica, sans-serif',
    pdfLibVariant: sansVariant,
    kind: 'fallback',
  },
  {
    id: 'ui-georgia',
    name: 'Georgia',
    cssFamily: 'Georgia, "Times New Roman", Times, serif',
    pdfLibVariant: serifVariant,
    kind: 'fallback',
  },
  {
    id: 'ui-comic-sans',
    name: 'Comic Sans MS',
    cssFamily: '"Comic Sans MS", "Comic Sans", "Chalkboard SE", cursive',
    pdfLibVariant: sansVariant,
    kind: 'fallback',
  },
  {
    id: 'ui-inter',
    name: 'Inter',
    cssFamily: '"Inter", "Helvetica Neue", Arial, sans-serif',
    pdfLibVariant: sansVariant,
    kind: 'fallback',
  },
  {
    id: 'ui-open-sans',
    name: 'Open Sans',
    cssFamily: '"Open Sans", "Helvetica Neue", Arial, sans-serif',
    pdfLibVariant: sansVariant,
    kind: 'fallback',
  },
]

const BY_ID = new Map(STANDARD_FONTS.map((spec) => [spec.id, spec]))

export function getStandardFontSpec(fontId: string): StandardFontSpec | undefined {
  return BY_ID.get(fontId)
}

export function isStandardFontId(fontId: string): boolean {
  return BY_ID.has(fontId)
}

/** Build the RegisteredFont entries that seed FontManager.fonts at startup. */
export function buildStandardRegisteredFonts(): RegisteredFont[] {
  return STANDARD_FONTS.map((spec) => ({
    id: spec.id,
    name: spec.name,
    family: spec.name,
    weight: 400,
    style: 'normal' as const,
    isEmbedded: false,
    supportedFormat: 'truetype' as const,
    editable: true,
  }))
}

/** Composite embed-key helper so the embedder and the redraw strategy agree
 *  on how to look a font up. For non-curated fonts we stay keyed by fontId
 *  alone (one PDFFont per fontId — whatever we embedded from raw data, or
 *  the Helvetica fallback). For curated fonts the key includes the weight /
 *  italic axis so the correct StandardFonts variant is used. */
export function fontEmbedKey(fontId: string, bold: boolean, italic: boolean): string {
  if (isStandardFontId(fontId)) return `${fontId}#${bold ? 'b' : 'r'}${italic ? 'i' : 'u'}`
  return fontId
}
