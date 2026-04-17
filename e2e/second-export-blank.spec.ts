/**
 * Regression: editing a block, exporting, editing the same block again and
 * exporting a second time renders the paragraph blank on the second export.
 *
 * Root-cause hypothesis: FontEmbedder caches PDFFont objects across export
 * calls but each export creates a fresh PDFDocument via PDFDocument.load(),
 * so the cached PDFFont is bound to the PREVIOUS document's object graph.
 * Reusing it against the new document leaves the font reference unresolvable
 * and the text operators effectively unusable.
 */
import { test, expect } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'
import * as fs from 'fs'

const EXAMPLE_PDF = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../example/example_en.pdf')

async function uploadAndWaitForRender(page: import('@playwright/test').Page) {
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await page.locator('input[type="file"]').setInputFiles(EXAMPLE_PDF)
  await page.waitForFunction(() => {
    const c = document.querySelector('canvas')
    if (!c) return false
    const d = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data
    let dark = 0
    for (let i = 0; i < d.length; i += 16) if (d[i] < 100 && d[i+1] < 100 && d[i+2] < 100) dark++
    return dark > 50
  }, { timeout: 20000 })
}

async function exposeEditorCore(page: import('@playwright/test').Page) {
  await page.evaluate(() => {
    const canvas = document.querySelector('canvas')!
    const fk = Object.keys(canvas).find(k => k.startsWith('__reactFiber'))!
    let fiber = (canvas as any)[fk]
    for (let i = 0; i < 30 && fiber; i++) {
      if (fiber.memoizedProps?.editorCore) { (window as any).__CORE__ = fiber.memoizedProps.editorCore; return }
      let h = fiber.memoizedState
      while (h) {
        const v = h.memoizedState
        if (v && typeof v === 'object' && 'current' in v && v.current?.getDocument) {
          (window as any).__CORE__ = v.current; return
        }
        h = h.next
      }
      fiber = fiber.return
    }
  })
}

async function enterEditAt(page: import('@playwright/test').Page, needle: string, cursorOffsetWithinMatch: number) {
  const info = await page.evaluate(({ needle }) => {
    const core = (window as any).__CORE__
    const pageModel = core.getPageModel(core.getCurrentPage())
    const scale = core.getZoom()
    const pageOffset = core.getRenderEngine().getPageOffset()
    const canvas = document.querySelector('canvas')!
    const rect = canvas.getBoundingClientRect()
    for (const el of pageModel.elements) {
      if (el.type !== 'text') continue
      let flat = ''
      for (const p of el.paragraphs) { for (const r of p.runs) flat += r.text; flat += '\n' }
      flat = flat.slice(0, -1)
      const pos = flat.indexOf(needle)
      if (pos === -1) continue
      let target = pos
      let glyph: any = null
      let globalIdx = 0
      for (let pi = 0; pi < el.paragraphs.length; pi++) {
        if (pi > 0) globalIdx++
        const para = el.paragraphs[pi]
        if (!para.lines) continue
        for (const line of para.lines) {
          for (const g of line.glyphs) {
            if (globalIdx === target) { glyph = g; break }
            globalIdx++
          }
          if (glyph) break
        }
        if (glyph) break
      }
      if (!glyph) continue
      return {
        blockId: el.id,
        matchPos: pos,
        clickClientX: rect.left + pageOffset.x + (el.bounds.x + glyph.x + glyph.width / 2) * scale,
        clickClientY: rect.top + pageOffset.y + (el.bounds.y + glyph.y + glyph.height / 2) * scale,
      }
    }
    return null
  }, { needle })

  expect(info).not.toBeNull()
  const i = info!
  await page.mouse.dblclick(i.clickClientX, i.clickClientY)
  await page.waitForTimeout(200)
  await expect(page.locator('textarea')).toBeAttached({ timeout: 3000 })
  await page.evaluate(({ blockId, offset }) => {
    const core = (window as any).__CORE__
    core.getEditEngine().getCursorManager().setCursor(core.getCurrentPage(), blockId, offset)
  }, { blockId: i.blockId, offset: i.matchPos + cursorOffsetWithinMatch })
  await page.waitForTimeout(80)
  await page.locator('textarea').focus()
  return i
}

async function exportAndMeasureParagraph(
  page: import('@playwright/test').Page,
  screenshotName: string,
  blockId: string,
): Promise<number> {
  const region = await page.evaluate(({ blockId }) => {
    const core = (window as any).__CORE__
    const pg = core.getPageModel(core.getCurrentPage())
    const el = pg.elements.find((e: any) => e.id === blockId)
    return { x: el.bounds.x, y: el.bounds.y, w: el.bounds.width, h: el.bounds.height, pageHeight: pg.height }
  }, { blockId })

  const base64 = await page.evaluate(async () => {
    const core = (window as any).__CORE__
    if (core.isEditing()) core.getEditEngine().exitEditMode()
    const bytes = await core.exportPdf()
    let binary = ''
    for (let j = 0; j < bytes.length; j++) binary += String.fromCharCode(bytes[j])
    return btoa(binary)
  })
  const fileBytes = Buffer.from(base64, 'base64')
  fs.writeFileSync(`e2e/screenshots/${screenshotName}.pdf`, fileBytes)
  // Stash base64 on window for later font-dict inspection
  await page.evaluate((b64) => { (window as any).__lastPdfBase64__ = b64 }, base64)

  const result = await page.evaluate(async ({ base64, region }) => {
    const bin = atob(base64)
    const bytes = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
    const pdfjsLib: any = (window as any).pdfjsLib
      || (await import(/* @vite-ignore */ 'pdfjs-dist/build/pdf.min.mjs'))
    const doc = await pdfjsLib.getDocument({ data: bytes, useSystemFonts: true }).promise
    const p = await doc.getPage(1)
    const viewport = p.getViewport({ scale: 2 })
    const c = document.createElement('canvas')
    c.width = viewport.width; c.height = viewport.height
    const ctx = c.getContext('2d')!
    ctx.fillStyle = 'white'; ctx.fillRect(0, 0, c.width, c.height)
    await p.render({ canvasContext: ctx, viewport, canvas: c } as any).promise
    const sx = Math.round(region.x * 2)
    const sy = Math.round(region.y * 2)
    const sw = Math.round(region.w * 2)
    const sh = Math.round(region.h * 2)
    const data = ctx.getImageData(sx, sy, sw, sh).data
    let dark = 0
    for (let i = 0; i < data.length; i += 4) {
      const lum = (data[i] + data[i+1] + data[i+2]) / 3
      if (lum < 180) dark++
    }
    // Dump a PNG of the page for visual inspection
    ;(globalThis as any).__pageDataUrl__ = c.toDataURL('image/png')
    return { dark }
  }, { base64, region })

  const pngDataUrl = await page.evaluate(() => (globalThis as any).__pageDataUrl__)
  fs.writeFileSync(`e2e/screenshots/${screenshotName}.png`, Buffer.from(pngDataUrl.split(',')[1], 'base64'))
  return result.dark
}

test('second export after a follow-up edit must not blank the paragraph', async ({ page }) => {
  await uploadAndWaitForRender(page)
  await page.waitForTimeout(500)
  await exposeEditorCore(page)

  // Step 1: edit "Three" (capital T) → "There", confirm with Enter
  const i1 = await enterEditAt(page, 'Three long', 0)
  // Select the 5 chars of "Three" and retype "There"
  await page.evaluate(({ blockId, start }) => {
    const core = (window as any).__CORE__
    const pageIdx = core.getCurrentPage()
    core.getEditEngine().getSelectionManager().setSelection(pageIdx, blockId, start, start + 5)
    core.getEditEngine().getCursorManager().setCursor(pageIdx, blockId, start + 5)
  }, { blockId: i1.blockId, start: i1.matchPos })
  await page.keyboard.type('There')
  await page.waitForTimeout(200)
  // Export WITHOUT pressing Enter first — exportPdf internally calls exitEditMode
  // (mimics a user hitting the EXPORT button while still in edit mode)

  // Step 2: first export
  const paraInk1 = await exportAndMeasureParagraph(page, 'second-export-01-first', i1.blockId)
  console.log('After 1st edit, 1st export paragraph ink:', paraInk1)

  // Step 3: re-enter edit mode, insert 'A' after "There"
  const i2 = await enterEditAt(page, 'There long', 5)
  await page.keyboard.type('A')
  await page.waitForTimeout(200)

  // Step 4: second export
  const paraInk2 = await exportAndMeasureParagraph(page, 'second-export-02-second', i2.blockId)
  console.log('After 2nd edit, 2nd export paragraph ink:', paraInk2)

  expect(paraInk2, `paragraph went blank on second export (ink=${paraInk2})`).toBeGreaterThan(1000)

  // Strict-viewer check: the second exported PDF must not contain any /Font
  // entries whose BaseFont is undefined. pdfjs is lenient and falls back, so
  // the above pixel check can pass even when the font references are broken;
  // Preview.app and Acrobat cannot, so they render the paragraph blank.
  const { PDFDocument: PDFDoc } = await import('pdf-lib')
  const doc = await PDFDoc.load(fs.readFileSync('e2e/screenshots/second-export-02-second.pdf'))
  const pdfPage = doc.getPages()[0]
  const resources = (pdfPage.node as any).Resources()
  const broken: string[] = []
  const seen: string[] = []
  if (resources) {
    const fontDict = resources.lookup(resources.context.obj('Font'))
    if (fontDict) {
      for (const [k, ref] of fontDict.entries()) {
        const fontObj = doc.context.lookup(ref) as any
        const baseFont = fontObj?.lookup?.(fontObj.context.obj('BaseFont'))
        seen.push(`${k.toString()}=${baseFont?.toString() ?? 'UNDEF'}`)
        if (!baseFont) broken.push(k.toString())
      }
    }
  }
  console.log('Second PDF font dict entries:', seen)
  expect(
    broken,
    `broken (BaseFont=undefined) font entries in 2nd export: ${broken.join(', ')} — strict viewers render blank`,
  ).toEqual([])
})
