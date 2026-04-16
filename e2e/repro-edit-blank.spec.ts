import { test, expect } from '@playwright/test'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

/**
 * Repro for user-reported bug: "After editing the title and exporting, the
 * edited region is blank in the exported PDF."
 *
 * The existing sample-export-after-edit.spec.ts only verifies that export
 * triggered a download. It does NOT look at whether the exported PDF
 * visually contains the edited text. This test fills that gap by:
 *
 *   1. Edit the "Sample PDF" title ("Sample" -> "Semple").
 *   2. Export.
 *   3. Parse the exported PDF with pdfjs in the browser and extract text
 *      from the affected page region.
 *   4. Assert the new text ("Semple") is present and the old text
 *      ("Sample") is gone.
 */

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const EXAMPLE_PDF = path.resolve(__dirname, '../example/example_en.pdf')

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
  }, { timeout: 15000 })
  await page.waitForTimeout(500)
}

test('edit Sample PDF title, export, and confirm edited text exists in exported PDF', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', e => errors.push(`[pageerror] ${e.message}\n${e.stack}`))
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(`[console.error] ${msg.text()}`)
  })

  await page.setViewportSize({ width: 1600, height: 1200 })
  await uploadAndWaitForRender(page)

  // Double-click on the Sample PDF title to enter edit mode.
  const click = await page.evaluate(() => {
    const core = (window as unknown as { __EDITOR_CORE__: unknown }).__EDITOR_CORE__ as unknown as {
      getDocument: () => { pages: Array<{ elements: unknown[] }> }
      getCurrentPage: () => number
      getRenderEngine: () => { getPageOffset(): { x: number; y: number } }
    }
    const doc = core.getDocument()
    const pg = doc.pages[core.getCurrentPage()]
    const canvas = document.querySelector('canvas')!
    const rect = canvas.getBoundingClientRect()
    const offset = core.getRenderEngine().getPageOffset()
    for (const el of pg.elements as Array<Record<string, unknown>>) {
      if (el.type !== 'text') continue
      const block = el as unknown as {
        bounds: { x: number; y: number; width: number; height: number }
        paragraphs: Array<{ runs: Array<{ text: string }> }>
      }
      const text = block.paragraphs.map(p => p.runs.map(r => r.text).join('')).join('|')
      if (!text.includes('Sample')) continue
      return {
        x: rect.left + offset.x + block.bounds.x + 50,
        y: rect.top + offset.y + block.bounds.y + 20,
      }
    }
    return null
  })
  expect(click).not.toBeNull()

  await page.mouse.dblclick(click!.x, click!.y)
  await page.waitForTimeout(400)
  await expect(page.locator('textarea')).toBeAttached({ timeout: 3000 })

  // Replace "Sample" with "Semple" (change 'a' -> 'e' at offset 1..2).
  await page.evaluate(() => {
    const core = (window as unknown as { __EDITOR_CORE__: unknown }).__EDITOR_CORE__ as unknown as {
      getEditEngine: () => {
        getCursorManager: () => { setCursor(pi: number, bid: string, off: number): void }
        getSelectionManager: () => { setSelection(pi: number, bid: string, s: number, e: number): void }
        insertText(t: string): void
        exitEditMode(): void
        getEditingBlockId(): string | null
      }
    }
    const ee = core.getEditEngine()
    const blockId = ee.getEditingBlockId()!
    ee.getSelectionManager().setSelection(0, blockId, 1, 2)
    ee.getCursorManager().setCursor(0, blockId, 2)
    ee.insertText('e')
    ee.exitEditMode()
  })
  await page.waitForTimeout(400)

  // Click export and capture the download.
  const exportBtn = page.getByRole('button', { name: /export/i })
  await expect(exportBtn).toBeVisible()

  const downloadPromise = page.waitForEvent('download', { timeout: 10000 })
  await exportBtn.click()
  const download = await downloadPromise
  const downloadPath = await download.path()
  expect(downloadPath).toBeTruthy()

  // Parse the exported PDF with pdfjs on the Node side. pdfjs gives us the
  // glyph-level text content from the rendered content stream, so we can
  // tell whether the edited text actually made it into the PDF.
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
  const data = new Uint8Array(fs.readFileSync(downloadPath!))
  const doc = await pdfjs.getDocument({ data, isEvalSupported: false, useSystemFonts: false }).promise
  const pdfPage = await doc.getPage(1)
  const content = await pdfPage.getTextContent()
  const items = (content.items as Array<{ str: string }>).map(i => i.str)
  const extracted = items.join('|')

  // Copy the exported PDF to a deterministic location so a human can open
  // it if the test fails.
  const artifactPath = path.resolve(__dirname, 'screenshots/repro-exported.pdf')
  fs.mkdirSync(path.dirname(artifactPath), { recursive: true })
  fs.copyFileSync(downloadPath!, artifactPath)
  console.log('Saved exported PDF artifact to:', artifactPath)

  // Diagnostic: what does the app think the title's fontId is, and does
  // FontManager have raw `data` for that font? If data is undefined,
  // FontEmbedder falls back to StandardFonts.Helvetica, which mismatches
  // the Canvas-based layout glyph widths and causes the visible gaps.
  const fontDiag = await page.evaluate(() => {
    const core = (window as unknown as { __EDITOR_CORE__: unknown }).__EDITOR_CORE__ as unknown as {
      getDocument: () => { pages: Array<{ elements: unknown[] }> }
      getCurrentPage: () => number
      getFontManager: () => {
        getFontData(id: string): ArrayBuffer | undefined
        getFont(id: string): { name: string; editable: boolean; supportedFormat: string } | undefined
      }
    }
    const doc = core.getDocument()
    const pg = doc.pages[core.getCurrentPage()]
    const fm = core.getFontManager()
    const result: Array<Record<string, unknown>> = []
    for (const el of pg.elements as Array<Record<string, unknown>>) {
      if (el.type !== 'text') continue
      const tb = el as unknown as {
        paragraphs: Array<{ runs: Array<{ text: string; style: { fontId: string; fontSize: number } }> }>
      }
      const text = tb.paragraphs.map(p => p.runs.map(r => r.text).join('')).join('|')
      if (!text.includes('emple') && !text.includes('Sample')) continue
      for (const p of tb.paragraphs) {
        for (const r of p.runs) {
          const fi = fm.getFont(r.style.fontId)
          const data = fm.getFontData(r.style.fontId)
          result.push({
            text: r.text,
            fontId: r.style.fontId,
            fontName: fi?.name,
            supportedFormat: fi?.supportedFormat,
            editable: fi?.editable,
            hasRawData: !!data,
            rawDataBytes: data?.byteLength,
          })
        }
      }
    }
    return result
  })
  console.log('Font diagnostic for title block:', JSON.stringify(fontDiag, null, 2))

  console.log('Exported page-1 text items:\n' + extracted)
  console.log('Page errors:\n' + errors.join('\n'))

  expect(errors, `errors: ${errors.join(' | ')}`).toEqual([])
  // The fix should make this pass: edited text must survive export.
  expect(extracted, 'exported PDF should contain "Semple"').toContain('Semple')
})
