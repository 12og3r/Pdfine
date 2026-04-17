/**
 * Regression guard: editing a single character inside a PDF-imported title
 * block must not cause a silent line wrap that grows the block vertically and
 * occludes the paragraph below.
 *
 * Bug history: the title "Sample PDF / Created for testing PDFObject" in
 * example_en.pdf fits its block.bounds.width (~253 px) exactly — the width
 * was imported from the PDF's rendered line width. Existing chars had
 * pdfCharWidths = canvasWidth × (pdfRunWidth / canvasTotal), a slightly
 * compressed scale. Inserted chars (EditCommands.insertText splices NaN into
 * pdfCharWidths) fell back to raw canvas advance widths — unscaled. Swapping
 * 'O' (pdf-scaled ≈ 12.05 px) for 'A' (canvas advance ≈ 13.00 px) pushed
 * the line past maxWidth + 0.5 px tolerance and forced a wrap, adding one
 * extra line (~40 px) to the block. The white edit-overlay then spilled
 * downward and covered the first body paragraph.
 *
 * Fix: ParagraphLayout stores the PDF→canvas scale factor on the run
 * (pdfWidthScale) at first layout; flattenRuns multiplies that scale into the
 * canvas-measured width of any char that has no pdfCharWidth, so every char
 * in the run shares a single metric space.
 */
import { test, expect } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

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

test('editing "PDFObject" -> "PDFAbject" must not grow the title block vertically', async ({ page }) => {
  await uploadAndWaitForRender(page)
  await page.waitForTimeout(500)
  await exposeEditorCore(page)

  const info = await page.evaluate(() => {
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
      const pos = flat.indexOf('PDFObject')
      if (pos === -1) continue

      const target = pos + 3 // before the 'O'
      let glyphAtO: any = null
      let globalIdx = 0
      for (let pi = 0; pi < el.paragraphs.length; pi++) {
        if (pi > 0) globalIdx++
        const para = el.paragraphs[pi]
        if (!para.lines) continue
        for (const line of para.lines) {
          for (const g of line.glyphs) {
            if (globalIdx === target) { glyphAtO = g; break }
            globalIdx++
          }
          if (glyphAtO) break
        }
        if (glyphAtO) break
      }
      if (!glyphAtO) continue

      return {
        blockId: el.id,
        fullText: flat,
        heightBefore: el.bounds.height,
        lineCountBefore: el.paragraphs.reduce((s: number, p: any) => s + (p.lines?.length ?? 0), 0),
        oClientX: rect.left + pageOffset.x + (el.bounds.x + glyphAtO.x + glyphAtO.width / 2) * scale,
        oClientY: rect.top + pageOffset.y + (el.bounds.y + glyphAtO.y + glyphAtO.height / 2) * scale,
      }
    }
    return null
  })
  expect(info, '"PDFObject" not found').not.toBeNull()
  const i = info!

  await page.mouse.dblclick(i.oClientX, i.oClientY)
  await page.waitForTimeout(300)
  await expect(page.locator('textarea')).toBeAttached({ timeout: 3000 })

  // Place cursor right after 'O' via the programmatic API (more deterministic
  // than clicking at the exact pixel)
  await page.evaluate(({ blockId, fullText }) => {
    const core = (window as any).__CORE__
    const pos = fullText.indexOf('PDFObject')
    core.getEditEngine().getCursorManager().setCursor(
      core.getCurrentPage(), blockId, pos + 4
    )
  }, { blockId: i.blockId, fullText: i.fullText })
  await page.waitForTimeout(100)
  await page.locator('textarea').focus()

  // Swap 'O' -> 'A'
  await page.keyboard.press('Backspace')
  await page.waitForTimeout(100)
  await page.keyboard.type('A')
  await page.waitForTimeout(400)

  const after = await page.evaluate(({ blockId }) => {
    const core = (window as any).__CORE__
    const pageModel = core.getPageModel(core.getCurrentPage())
    const el = pageModel.elements.find((e: any) => e.id === blockId)
    let flat = ''
    for (const p of el.paragraphs) { for (const r of p.runs) flat += r.text; flat += '\n' }
    flat = flat.slice(0, -1)
    return {
      height: el.bounds.height,
      text: flat,
      lineCount: el.paragraphs.reduce((s: number, p: any) => s + (p.lines?.length ?? 0), 0),
    }
  }, { blockId: i.blockId })

  expect(after.text).toContain('PDFAbject')
  expect(after.lineCount, 'title block should not gain a new line after a same-length swap').toBe(i.lineCountBefore)
  const growth = after.height - i.heightBefore
  console.log(`Height before=${i.heightBefore}, after=${after.height}, growth=${growth.toFixed(2)}px, lines=${after.lineCount}`)
  expect(growth, `title block grew ${growth.toFixed(2)}px after a same-length char swap — line must not wrap`).toBeLessThan(5)
})
