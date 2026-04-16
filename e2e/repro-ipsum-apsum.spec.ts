import { test, expect } from '@playwright/test'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

/**
 * Repro for user-reported bug:
 *   "When I edit the second paragraph, changing 'ipsum' to 'Apsum', the
 *    on-screen layout goes wrong. And if I export at that point, the result
 *    is also messed up."
 *
 * The second paragraph in example_en.pdf starts with "I digress. Here's some
 * Latin. Lorem ipsum dolor sit amet, ...". We perform the exact edit and then
 * collect diagnostic evidence:
 *
 *   1. Extract on-screen layout glyph positions BEFORE and AFTER the edit.
 *   2. Inspect the run state that the layout engine saw (pdfCharWidths /
 *      pdfRunWidth / pdfLineWidths) so we can see whether edit-time width
 *      accounting is the root cause.
 *   3. Save a rendered screenshot of the edited page for visual inspection.
 *   4. Export and extract text from the exported PDF.
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

type RunDiag = {
  text: string
  fontSize: number
  fontId: string
  pdfRunWidth?: number
  pdfLineWidths?: number[]
  pdfCharWidths?: number[]
  pdfCharWidthsLen?: number
  pdfCharWidthsNaNCount?: number
}

type BlockDiag = {
  blockIdx: number
  text: string
  bounds: { x: number; y: number; width: number; height: number }
  paragraphs: Array<{
    runs: RunDiag[]
    lineCount: number
    lines: Array<{ glyphCount: number; firstX: number; lastX: number; baseline: number; text: string }>
  }>
}

async function dumpBlock(page: import('@playwright/test').Page, blockIdx: number): Promise<BlockDiag> {
  return await page.evaluate((idx) => {
    const core = (window as unknown as { __EDITOR_CORE__: unknown }).__EDITOR_CORE__ as unknown as {
      getDocument: () => { pages: Array<{ elements: unknown[] }> }
      getCurrentPage: () => number
    }
    const doc = core.getDocument()
    const pg = doc.pages[core.getCurrentPage()]
    const textBlocks = (pg.elements as Array<Record<string, unknown>>).filter(e => e.type === 'text')
    const el = textBlocks[idx] as unknown as {
      bounds: { x: number; y: number; width: number; height: number }
      paragraphs: Array<{
        runs: Array<{
          text: string
          style: { fontId: string; fontSize: number }
          pdfRunWidth?: number
          pdfLineWidths?: number[]
          pdfCharWidths?: number[]
        }>
        lines?: Array<{
          glyphs: Array<{ x: number; char: string }>
          baseline: number
        }>
      }>
    }
    return {
      blockIdx: idx,
      text: el.paragraphs.map(p => p.runs.map(r => r.text).join('')).join('|'),
      bounds: el.bounds,
      paragraphs: el.paragraphs.map(p => ({
        runs: p.runs.map(r => {
          const cw = r.pdfCharWidths
          return {
            text: r.text,
            fontSize: r.style.fontSize,
            fontId: r.style.fontId,
            pdfRunWidth: r.pdfRunWidth,
            pdfLineWidths: r.pdfLineWidths,
            pdfCharWidthsLen: cw?.length,
            pdfCharWidthsNaNCount: cw ? cw.filter(v => Number.isNaN(v)).length : undefined,
            pdfCharWidths: cw ? cw.map(v => Number.isNaN(v) ? -1 : Math.round(v * 100) / 100) : undefined,
          }
        }),
        lineCount: p.lines?.length ?? 0,
        lines: (p.lines ?? []).map(l => ({
          glyphCount: l.glyphs.length,
          firstX: l.glyphs[0]?.x ?? -1,
          lastX: l.glyphs[l.glyphs.length - 1]?.x ?? -1,
          baseline: l.baseline,
          text: l.glyphs.map(g => g.char).join(''),
        })),
      })),
    }
  }, blockIdx)
}

test('edit "ipsum"→"Apsum" in the 2nd paragraph block: dump layout + export state', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', e => errors.push(`[pageerror] ${e.message}\n${e.stack}`))
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(`[console.error] ${msg.text()}`)
  })

  await page.setViewportSize({ width: 1600, height: 1200 })
  await uploadAndWaitForRender(page)

  // Find the block containing "Lorem ipsum" on page 1.
  const blockIdx = await page.evaluate(() => {
    const core = (window as unknown as { __EDITOR_CORE__: unknown }).__EDITOR_CORE__ as unknown as {
      getDocument: () => { pages: Array<{ elements: unknown[] }> }
      getCurrentPage: () => number
    }
    const doc = core.getDocument()
    const pg = doc.pages[core.getCurrentPage()]
    const textBlocks = (pg.elements as Array<Record<string, unknown>>).filter(e => e.type === 'text')
    for (let i = 0; i < textBlocks.length; i++) {
      const el = textBlocks[i] as unknown as {
        paragraphs: Array<{ runs: Array<{ text: string }> }>
      }
      const txt = el.paragraphs.map(p => p.runs.map(r => r.text).join('')).join('')
      if (txt.includes('Lorem ipsum')) return i
    }
    return -1
  })
  expect(blockIdx).toBeGreaterThanOrEqual(0)
  console.log('Block index containing "Lorem ipsum":', blockIdx)

  const beforeDiag = await dumpBlock(page, blockIdx)
  console.log('--- BEFORE EDIT ---')
  console.log(JSON.stringify(beforeDiag, null, 2))

  // Before-edit screenshot
  await page.screenshot({
    path: path.resolve(__dirname, 'screenshots/repro-apsum-01-before.png'),
    fullPage: true,
  })

  // Locate the absolute char offset of "ipsum" within the block's global text.
  const ipsumInfo = await page.evaluate((idx) => {
    const core = (window as unknown as { __EDITOR_CORE__: unknown }).__EDITOR_CORE__ as unknown as {
      getDocument: () => { pages: Array<{ elements: unknown[] }> }
      getCurrentPage: () => number
    }
    const doc = core.getDocument()
    const pg = doc.pages[core.getCurrentPage()]
    const textBlocks = (pg.elements as Array<Record<string, unknown>>).filter(e => e.type === 'text')
    const el = textBlocks[idx] as unknown as {
      id: string
      paragraphs: Array<{ runs: Array<{ text: string }> }>
    }
    // Walk paragraphs; ipsum is within the first paragraph after "Lorem ".
    let globalOffset = 0
    for (let pi = 0; pi < el.paragraphs.length; pi++) {
      if (pi > 0) globalOffset++ // paragraph boundary \n
      const paraText = el.paragraphs[pi].runs.map(r => r.text).join('')
      const ipsumIdx = paraText.indexOf('ipsum')
      if (ipsumIdx >= 0) {
        return {
          blockId: el.id,
          paraIdx: pi,
          start: globalOffset + ipsumIdx,
          end: globalOffset + ipsumIdx + 5,
          blockText: el.paragraphs.map(p => p.runs.map(r => r.text).join('')).join('\n'),
        }
      }
      globalOffset += paraText.length
    }
    return null
  }, blockIdx)
  expect(ipsumInfo).not.toBeNull()
  console.log('ipsum offset in block:', ipsumInfo)

  // Enter edit mode on the block, select "ipsum", replace with "Apsum".
  await page.evaluate((info) => {
    const core = (window as unknown as { __EDITOR_CORE__: unknown }).__EDITOR_CORE__ as unknown as {
      getEditEngine: () => {
        enterEditMode: (blockId: string) => void
        getCursorManager: () => { setCursor(pi: number, bid: string, off: number): void }
        getSelectionManager: () => { setSelection(pi: number, bid: string, s: number, e: number): void }
        insertText(t: string): void
        exitEditMode(): void
      }
    }
    const ee = core.getEditEngine()
    ee.enterEditMode(info!.blockId)
    ee.getSelectionManager().setSelection(info!.paraIdx, info!.blockId, info!.start, info!.end)
    ee.getCursorManager().setCursor(info!.paraIdx, info!.blockId, info!.end)
    ee.insertText('Apsum')
    ee.exitEditMode()
  }, ipsumInfo)
  await page.waitForTimeout(500)

  const afterDiag = await dumpBlock(page, blockIdx)
  console.log('--- AFTER EDIT ---')
  console.log(JSON.stringify(afterDiag, null, 2))

  await page.screenshot({
    path: path.resolve(__dirname, 'screenshots/repro-apsum-02-after.png'),
    fullPage: true,
  })

  // Sanity: the block text must now contain "Apsum" and not the old "ipsum"
  expect(afterDiag.text).toContain('Apsum')
  expect(afterDiag.text).not.toContain('Lorem ipsum')

  // Export and extract from the exported PDF.
  const exportBtn = page.getByRole('button', { name: /export/i })
  await expect(exportBtn).toBeVisible()
  const downloadPromise = page.waitForEvent('download', { timeout: 15000 })
  await exportBtn.click()
  const download = await downloadPromise
  const downloadPath = await download.path()
  expect(downloadPath).toBeTruthy()

  const artifactPath = path.resolve(__dirname, 'screenshots/repro-apsum-exported.pdf')
  fs.mkdirSync(path.dirname(artifactPath), { recursive: true })
  fs.copyFileSync(downloadPath!, artifactPath)
  console.log('Saved exported PDF to:', artifactPath)

  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
  const data = new Uint8Array(fs.readFileSync(downloadPath!))
  const doc = await pdfjs.getDocument({ data, isEvalSupported: false, useSystemFonts: false }).promise
  const pdfPage = await doc.getPage(1)
  const content = await pdfPage.getTextContent()
  const items = (content.items as Array<{ str: string }>).map(i => i.str)
  const extracted = items.join('|')
  console.log('Exported page-1 text:', extracted)

  expect(errors, `errors: ${errors.join(' | ')}`).toEqual([])
})
