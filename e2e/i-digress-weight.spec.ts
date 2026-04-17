/**
 * Regression guard: double-clicking a text line must not visibly change the
 * rendered font weight.
 *
 * Bug history: the Inkworld pixel-art theme applied
 *   -webkit-font-smoothing: none;
 *   font-smooth: never;
 *   image-rendering: pixelated;
 * on `html, body, #root`, which cascaded into the editor <canvas>. Canvas
 * fillText then rendered WITHOUT anti-aliasing — hard, thick glyph edges —
 * while pdfjs drew the page background to an offscreen canvas that didn't
 * inherit any of that CSS, so its raster kept normal grayscale AA.
 * Double-clicking flipped the render path (pdfjs raster → white overlay +
 * TextRenderer), and users saw the body text suddenly get noticeably
 * heavier/bolder on the "I digress" paragraph of example_en.pdf.
 *
 * Fix: <canvas> in EditorCanvas.tsx explicitly resets font-smoothing and
 * image-rendering so Canvas text matches pdfjs.
 */
import { test, expect } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

const EXAMPLE_PDF = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../example/example_en.pdf')

async function uploadAndWaitForRender(page: import('@playwright/test').Page) {
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  const fileInput = page.locator('input[type="file"]')
  await fileInput.setInputFiles(EXAMPLE_PDF)
  await page.waitForFunction(() => {
    const canvas = document.querySelector('canvas')
    if (!canvas) return false
    const ctx = canvas.getContext('2d')
    if (!ctx) return false
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data
    let dark = 0
    for (let i = 0; i < data.length; i += 16) {
      if (data[i] < 100 && data[i + 1] < 100 && data[i + 2] < 100) dark++
    }
    return dark > 50
  }, { timeout: 20000 })
}

async function exposeEditorCore(page: import('@playwright/test').Page) {
  await page.evaluate(() => {
    const canvas = document.querySelector('canvas')
    if (!canvas) return
    const fiberKey = Object.keys(canvas).find(k => k.startsWith('__reactFiber'))
    if (!fiberKey) return
    let fiber = (canvas as any)[fiberKey]
    for (let i = 0; i < 30 && fiber; i++) {
      if (fiber.memoizedProps?.editorCore) {
        (window as any).__PDFINE_EDITOR_CORE__ = fiber.memoizedProps.editorCore
        return
      }
      let hook = fiber.memoizedState
      while (hook) {
        const val = hook.memoizedState
        if (val && typeof val === 'object' && 'current' in val && val.current) {
          const ref = val.current
          if (typeof ref.getDocument === 'function' && typeof ref.getPageModel === 'function') {
            (window as any).__PDFINE_EDITOR_CORE__ = ref
            return
          }
        }
        hook = hook.next
      }
      fiber = fiber.return
    }
  })
}

test('double-click "I digress" does not visibly change font weight', async ({ page }) => {
  await uploadAndWaitForRender(page)
  await page.waitForTimeout(500)
  await exposeEditorCore(page)

  const info = await page.evaluate(() => {
    const core = (window as any).__PDFINE_EDITOR_CORE__
    const pageIdx = core.getCurrentPage()
    const pageModel = core.getPageModel(pageIdx)
    const scale = core.getZoom()
    const renderEngine = core.getRenderEngine()
    const pageOffset = renderEngine.getPageOffset()
    const canvas = document.querySelector('canvas')!
    const rect = canvas.getBoundingClientRect()

    for (const el of pageModel.elements) {
      if (el.type !== 'text') continue
      let fullText = ''
      for (const para of el.paragraphs) {
        for (const run of para.runs) fullText += run.text
        fullText += '\n'
      }
      fullText = fullText.slice(0, -1)
      const matchPos = fullText.indexOf('I digress')
      if (matchPos === -1) continue

      let globalIdx = 0
      let lineContainingMatch: any = null
      for (const para of el.paragraphs) {
        if (!para.lines) continue
        for (const line of para.lines) {
          const start = globalIdx
          const end = globalIdx + line.glyphs.length
          if (matchPos >= start && matchPos < end) lineContainingMatch = line
          globalIdx = end
        }
      }
      if (!lineContainingMatch) continue

      const firstGlyph = lineContainingMatch.glyphs[0]
      const lastGlyph = lineContainingMatch.glyphs[lineContainingMatch.glyphs.length - 1]
      const bx = el.bounds.x
      const by = el.bounds.y
      const lineX = bx + firstGlyph.x
      const lineY = by + firstGlyph.y
      const lineW = (lastGlyph.x + lastGlyph.width) - firstGlyph.x
      const lineH = firstGlyph.height

      return {
        blockId: el.id,
        clickClientX: rect.left + pageOffset.x + (bx + firstGlyph.x + firstGlyph.width * 1.5) * scale,
        clickClientY: rect.top + pageOffset.y + (by + firstGlyph.y + firstGlyph.height / 2) * scale,
        canvasX: pageOffset.x + lineX * scale,
        canvasY: pageOffset.y + lineY * scale,
        canvasW: lineW * scale,
        canvasH: lineH * scale,
      }
    }
    return null
  })

  expect(info, '"I digress" not found in any block').not.toBeNull()
  const i = info!

  const sampleInk = async () => page.evaluate((r) => {
    const canvas = document.querySelector('canvas')!
    const ctx = canvas.getContext('2d')!
    const dpr = window.devicePixelRatio || 1
    const px = Math.max(0, Math.round(r.x * dpr))
    const py = Math.max(0, Math.round((r.y - 4) * dpr))
    const pw = Math.min(Math.round(r.w * dpr), canvas.width - px)
    const ph = Math.min(Math.round((r.h + 8) * dpr), canvas.height - py)
    const data = ctx.getImageData(px, py, pw, ph).data
    let dark = 0, ink = 0
    for (let j = 0; j < data.length; j += 4) {
      const lum = (data[j] + data[j + 1] + data[j + 2]) / 3
      if (lum < 120) { dark++; ink += (120 - lum) }
    }
    return { dark, ink }
  }, { x: i.canvasX, y: i.canvasY, w: i.canvasW, h: i.canvasH })

  const before = await sampleInk()

  await page.mouse.dblclick(i.clickClientX, i.clickClientY)
  await page.waitForTimeout(400)
  await expect(page.locator('textarea')).toBeAttached({ timeout: 3000 })

  const after = await sampleInk()

  // Allow a small delta from the faint editing-highlight tint + cursor, but
  // reject the 100%+ ink increase that indicates the Inkworld CSS is leaking
  // onto the canvas and disabling Canvas text anti-aliasing.
  const inkChangePct = Math.abs(after.ink - before.ink) / Math.max(1, before.ink) * 100
  console.log(`Ink intensity change: ${inkChangePct.toFixed(1)}%  (before=${before.ink}, after=${after.ink})`)
  expect(
    inkChangePct,
    `Ink changed ${inkChangePct.toFixed(1)}% — canvas text rendering diverged from pdfjs raster (AA or weight mismatch)`
  ).toBeLessThan(15)
})
