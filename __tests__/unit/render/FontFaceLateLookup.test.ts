/**
 * Regression test for "double-click 'TikTok Pte. Ltd.' shifts the text upward
 * and the entire font / weight changes" reported against a private employment
 * certificate.
 *
 * Root cause: pdfjs v5 auto-registers embedded TrueType/OpenType fonts with
 * the browser's FontFace API under the loadedName (e.g. "g_d0_f1"), but the
 * registration completes asynchronously — `document.fonts.add(face)` may fire
 * after `page.getOperatorList()` resolves, so when `FontExtractor` scans
 * `document.fonts` synchronously the face is either absent or still in
 * `status: 'loading'`. `FontExtractor`'s filter (`status === 'loaded'`) drops
 * it, `FontManager` stores the font entry with `fontFace: undefined`, and
 * `TextRenderer.resolveFontFamily` falls through to the
 * internal-name heuristic in `mapFontFamily` — which returns `sans-serif`
 * for anything matching `/^g_\d/`. Canvas then paints the edit-mode glyphs
 * in the system sans-serif, not the PDF's original font, so:
 *
 *   • the text renders in a completely different face (user-visible as
 *     "the font changed"),
 *   • sans-serif's ascent at this fontSize is smaller than the original
 *     font's, so Canvas paints the baseline higher than pdfjs's raster —
 *     the block appears to jump *upward* on double-click,
 *   • stroke thickness at the same weight differs between fonts, so users
 *     also perceive a weight change.
 *
 * Fix: `FontManager.getFont()` performs a lazy `document.fonts` re-scan for
 * any font whose `fontFace` is still undefined. Any pdfjs-registered face
 * that finished loading after extraction gets picked up here and cached, so
 * `TextRenderer.resolveFontFamily` sees `font.fontFace` truthy and emits
 * the real family name into `ctx.font`.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { FontManager } from '../../../src/core/font/FontManager'
import { TextRenderer } from '../../../src/core/render/TextRenderer'
import type { TextBlock } from '../../../src/types/document'
import {
  createTextBlock,
  createParagraph,
  createTextRun,
  createTextStyle,
} from '../../../src/core/model/DocumentModel'

/** Augment jsdom's minimal `document.fonts` mock with iteration + a
 *  mutable face list. Each `addFace()` call makes the face visible to
 *  `forEach` / `for...of` — mirroring the state pdfjs leaves after
 *  `document.fonts.add(face)` + load. We mutate the existing mock
 *  (setup.ts defines `document.fonts` non-configurable). */
function installIterableFontsMock(): { addFace(family: string): void; reset(): void } {
  const faces: Array<{ family: string; status: string; weight: string; style: string }> = []
  const mock = document.fonts as unknown as {
    forEach?: (cb: (ff: unknown) => void) => void
    [Symbol.iterator]?: () => Iterator<unknown>
  }
  mock.forEach = (cb) => { for (const ff of faces) cb(ff) }
  mock[Symbol.iterator] = function () {
    let i = 0
    return {
      next() {
        return i < faces.length
          ? { value: faces[i++], done: false as const }
          : { value: undefined, done: true as const }
      },
    }
  }
  return {
    addFace(family: string) {
      faces.push({ family, status: 'loaded', weight: 'normal', style: 'normal' })
    },
    reset() {
      faces.length = 0
      delete mock.forEach
      delete mock[Symbol.iterator]
    },
  }
}

function makeBlockWithLayout(fontId: string): TextBlock {
  const style = createTextStyle({ fontId, fontSize: 12 })
  const block = createTextBlock(
    [createParagraph([createTextRun('TikTok Pte. Ltd.', style)])],
    { x: 10, y: 10, width: 200, height: 20 },
    true,
  )
  // Minimal layout data so TextRenderer has something to render.
  block.paragraphs[0].lines = [{
    y: 0,
    height: 12,
    baseline: 10,
    glyphs: 'TikTok'.split('').map((char, i) => ({
      char,
      x: i * 7,
      y: 0,
      width: 7,
      height: 12,
      style: { ...style },
    })),
  }]
  return block
}

describe('FontManager late FontFace lookup', () => {
  let fontsMock: ReturnType<typeof installIterableFontsMock>

  beforeEach(() => {
    fontsMock = installIterableFontsMock()
  })

  afterEach(() => {
    fontsMock.reset()
  })

  it('picks up a FontFace that pdfjs added to document.fonts after extraction', () => {
    const fm = new FontManager()

    // Simulate the state right after extractAndRegister snapshot-missed the
    // pdfjs face: the font is in FontManager.fonts but fontFace is undefined.
    const fontId = 'g_d0_f1'
    const privateFonts = (fm as unknown as {
      fonts: Map<string, import('../../../src/types/document').RegisteredFont>
    }).fonts
    privateFonts.set(fontId, {
      id: fontId,
      name: 'TikTokFont',
      family: 'TikTokFont',
      weight: 400,
      style: 'normal',
      isEmbedded: true,
      supportedFormat: 'truetype',
      editable: true,
      // fontFace deliberately missing — this is the race-condition state
    })

    // Now pdfjs finishes loading the face and adds it to document.fonts.
    fontsMock.addFace(fontId)

    // getFont should detect the newly-loaded FontFace and populate it.
    const resolved = fm.getFont(fontId)
    expect(resolved).toBeDefined()
    expect(
      resolved?.fontFace,
      'FontManager should lazily pick up pdfjs-registered FontFaces added ' +
      'to document.fonts after extractAndRegister — without this, the font ' +
      'is treated as unregistered and Canvas fillText falls back to ' +
      'sans-serif, causing the visible font/weight change users see when ' +
      'double-clicking text like "TikTok Pte. Ltd.".',
    ).toBeTruthy()
  })

  it('keeps weight + family when pdfjs never registers a FontFace (compiled-glyphs path)', () => {
    // Scenario from the "TikTok Pte. Ltd." report: pdfjs renders the font
    // via its internal compiledGlyphs pipeline and never exposes binary
    // data OR a browser FontFace for it. `FontExtractor` still picks up
    // the real font name from `fontData.name` so we know it's Roboto-Bold,
    // but Canvas will have to fall back to a system font. Without this
    // fix the render path emitted `"400 9px sans-serif"` (un-bold, wrong
    // family) on edit-mode entry; after the fix it emits the registered
    // weight (700) and leads the family stack with the cleaned family
    // name so the system can pick an installed Roboto or close sans.
    const fm = new FontManager()
    const fontId = 'g_d0_f3'
    const privateFonts = (fm as unknown as {
      fonts: Map<string, import('../../../src/types/document').RegisteredFont>
    }).fonts
    privateFonts.set(fontId, {
      id: fontId,
      name: 'BAAAAA+Roboto-Bold',
      family: 'Roboto',
      weight: 700,
      style: 'normal',
      isEmbedded: true,
      supportedFormat: 'unknown',
      editable: false,
      // No fontFace, no data — matches the pdfjs compiled-glyphs case.
    })
    // document.fonts has nothing — pdfjs never added it.

    const fontAssignments: string[] = []
    const ctx = {
      save: () => {},
      restore: () => {},
      fillText: () => {},
      set textBaseline(_v: string) {},
      set fillStyle(_v: string) {},
      set font(v: string) { fontAssignments.push(v) },
    } as unknown as CanvasRenderingContext2D

    const renderer = new TextRenderer(fm)
    const block = makeBlockWithLayout(fontId)
    renderer.renderTextBlock(ctx, block, 1, 1)

    expect(fontAssignments.length).toBeGreaterThan(0)
    for (const spec of fontAssignments) {
      expect(
        spec,
        `Expected ctx.font to carry weight 700 and "Roboto" as the family ` +
        `hint — got "${spec}". Without it, pdfjs-rasterized bold runs ` +
        `visibly lose their weight on edit-mode entry.`,
      ).toContain('700')
      expect(spec).toContain('Roboto')
    }
  })

  it('TextRenderer emits the real family name (not sans-serif) for late-registered fonts', () => {
    const fm = new FontManager()
    const fontId = 'g_d0_f2'
    const privateFonts = (fm as unknown as {
      fonts: Map<string, import('../../../src/types/document').RegisteredFont>
    }).fonts
    privateFonts.set(fontId, {
      id: fontId,
      name: 'TikTokFont',
      family: 'TikTokFont',
      weight: 400,
      style: 'normal',
      isEmbedded: true,
      supportedFormat: 'truetype',
      editable: true,
    })
    fontsMock.addFace(fontId)

    const fontAssignments: string[] = []
    const ctx = {
      save: () => {},
      restore: () => {},
      fillText: () => {},
      set textBaseline(_v: string) {},
      set fillStyle(_v: string) {},
      set font(v: string) { fontAssignments.push(v) },
    } as unknown as CanvasRenderingContext2D

    const renderer = new TextRenderer(fm)
    const block = makeBlockWithLayout(fontId)
    renderer.renderTextBlock(ctx, block, 1, 1)

    expect(fontAssignments.length).toBeGreaterThan(0)
    for (const spec of fontAssignments) {
      expect(
        spec,
        `ctx.font was set to "${spec}" — if it contains only "sans-serif" ` +
        `Canvas is rendering with the system fallback, not the original PDF font.`,
      ).toContain(`"${fontId}"`)
    }
  })
})
