import { test, expect } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

const EXAMPLE_PDF = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../example/example_en.pdf')

/**
 * Regression test for the "Sample PDF" title shifting horizontally when entering
 * edit mode.
 *
 * The example PDF's title block contains two centered lines — "Sample PDF" (36pt,
 * narrower) and "Created for testing PDFObject" (18pt, wider) — in a single text
 * block. Before the fix, TextBlockBuilder hardcoded alignment='left', so on edit
 * mode entry Canvas fillText re-rendered the narrower "Sample PDF" line at the
 * block's minX (i.e. aligned with "Created for testing PDFObject"), shifting it
 * ~11 screen pixels left of the pdfjs rasterization. The fix is to detect the
 * shared visual center and mark the paragraph as alignment='center'.
 */

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

/**
 * Bounding box of the blue "Sample PDF" title pixels on the visible canvas.
 * The title is the only wide block of saturated blue near the top of the page,
 * so filtering by color isolates it from the smaller "PDFObject" blue text.
 */
async function captureTitleBoundingBox(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const canvas = document.querySelector('canvas')!
    const ctx = canvas.getContext('2d')!
    const w = canvas.width, h = canvas.height
    const data = ctx.getImageData(0, 0, w, h).data
    const dpr = window.devicePixelRatio || 1

    let minX = w, maxX = 0, minY = h, maxY = 0
    let count = 0
    // Only scan the top third of the page — the title is always there, and
    // this filters out the smaller blue "PDFObject" text from the subtitle
    // which sits just below the title with the same color.
    const scanRows = Math.min(h, Math.round(280 * dpr))
    for (let row = 0; row < scanRows; row++) {
      for (let col = 0; col < w; col++) {
        const idx = (row * w + col) * 4
        const r = data[idx], g = data[idx + 1], b = data[idx + 2]
        // Sample PDF title blue: roughly #2e74b5.
        if (r > 20 && r < 90 && g > 90 && g < 150 && b > 140 && b < 220) {
          if (row < minY) minY = row
          if (row > maxY) maxY = row
          if (col < minX) minX = col
          if (col > maxX) maxX = col
          count++
        }
      }
    }
    if (count < 20) return null
    return {
      minX: minX / dpr, maxX: maxX / dpr,
      minY: minY / dpr, maxY: maxY / dpr,
      count,
    }
  })
}

async function findSampleBlock(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const core = (window as unknown as { __EDITOR_CORE__: unknown }).__EDITOR_CORE__ as unknown as {
      getDocument: () => { pages: Array<{ elements: unknown[] }> }
      getCurrentPage: () => number
      getRenderEngine: () => { getPageOffset(): { x: number; y: number } }
    }
    const doc = core.getDocument()
    const pageModel = doc.pages[core.getCurrentPage()]
    const canvas = document.querySelector('canvas')!
    const rect = canvas.getBoundingClientRect()
    const offset = core.getRenderEngine().getPageOffset()
    for (const el of pageModel.elements as Array<Record<string, unknown>>) {
      if (el.type !== 'text') continue
      const block = el as unknown as {
        id: string
        bounds: { x: number; y: number; width: number; height: number }
        paragraphs: Array<{
          alignment: string
          runs: Array<{ text: string }>
        }>
      }
      const text = block.paragraphs.map(p => p.runs.map(r => r.text).join('')).join('|')
      if (!text.includes('Sample')) continue
      return {
        bounds: block.bounds,
        alignment: block.paragraphs[0].alignment,
        clickX: rect.left + offset.x + block.bounds.x + block.bounds.width / 2,
        clickY: rect.top + offset.y + block.bounds.y + block.bounds.height / 2,
      }
    }
    return null
  })
}

/** Find dark-pixel rows in a Y range, grouped into text lines (by Y gap). */
async function findTextLines(page: import('@playwright/test').Page, yTop: number, yBot: number) {
  return page.evaluate(({ yTop, yBot }) => {
    const canvas = document.querySelector('canvas')!
    const ctx = canvas.getContext('2d')!
    const w = canvas.width, h = canvas.height
    const data = ctx.getImageData(0, 0, w, h).data
    const dpr = window.devicePixelRatio || 1
    const top = Math.max(0, Math.round(yTop * dpr))
    const bot = Math.min(h, Math.round(yBot * dpr))

    // For each row, count dark-ish pixels (text)
    const darkRows: { y: number; count: number }[] = []
    for (let r = top; r < bot; r++) {
      let count = 0
      for (let c = 0; c < w; c++) {
        const idx = (r * w + c) * 4
        const rr = data[idx], gg = data[idx + 1], bb = data[idx + 2]
        if (rr < 150 && gg < 150 && bb < 200) count++
      }
      if (count > 3) darkRows.push({ y: r / dpr, count })
    }

    // Group into lines: gap > 3 rows starts a new line
    const lines: { top: number; bot: number; totalDark: number }[] = []
    if (darkRows.length === 0) return lines
    let lineStart = darkRows[0].y
    let lineEnd = darkRows[0].y
    let total = darkRows[0].count
    for (let i = 1; i < darkRows.length; i++) {
      if (darkRows[i].y - lineEnd > 3) {
        lines.push({ top: lineStart, bot: lineEnd, totalDark: total })
        lineStart = darkRows[i].y
        total = 0
      }
      lineEnd = darkRows[i].y
      total += darkRows[i].count
    }
    lines.push({ top: lineStart, bot: lineEnd, totalDark: total })
    return lines
  }, { yTop, yBot })
}

test('Created for testing PDFObject subtitle and following text stay in place on edit mode entry', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 1200 })
  await uploadAndWaitForRender(page)

  const sample = await findSampleBlock(page)
  expect(sample, 'must find Sample PDF block').not.toBeNull()

  // Capture lines in the region spanning from above the title down through the
  // first paragraph of body text ("This PDF is three pages long.").
  const scanTop = 140
  const scanBot = 360
  const beforeLines = await findTextLines(page, scanTop, scanBot)
  console.log('BEFORE lines:', beforeLines)

  await page.mouse.dblclick(sample!.clickX, sample!.clickY)
  await page.waitForTimeout(400)
  await expect(page.locator('textarea')).toBeAttached({ timeout: 3000 })

  const afterLines = await findTextLines(page, scanTop, scanBot)
  console.log('AFTER lines:', afterLines)

  // Expect the same number of text lines (no lines eaten by overlay). The three
  // lines in this region are "Sample PDF", "Created for testing PDFObject", and
  // "This PDF is three pages long.".
  expect(afterLines.length, `line count changed: before=${beforeLines.length} after=${afterLines.length}`).toBe(beforeLines.length)
  for (let i = 0; i < beforeLines.length; i++) {
    const dy = afterLines[i].top - beforeLines[i].top
    expect(Math.abs(dy), `line ${i} shifted ${dy}px: "${JSON.stringify(beforeLines[i])}" -> "${JSON.stringify(afterLines[i])}"`).toBeLessThanOrEqual(2)
  }
})

test('Sample PDF title does not shift horizontally on edit mode entry', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 1200 })
  await uploadAndWaitForRender(page)

  const sample = await findSampleBlock(page)
  expect(sample, 'must find Sample PDF block').not.toBeNull()

  // The block's paragraph must be detected as centered — both lines share a
  // visual center, so 'left' alignment would force the narrower title to the
  // wider subtitle's left edge on re-render.
  expect(sample!.alignment).toBe('center')

  const beforeBBox = await captureTitleBoundingBox(page)
  expect(beforeBBox, 'must detect title pixels from pdfjs raster').not.toBeNull()

  // Enter edit mode. The edit-start handler runs a reflow and activates the
  // white overlay + Canvas re-render, so the title is now drawn by our Canvas
  // pipeline instead of the pdfjs raster.
  await page.mouse.dblclick(sample!.clickX, sample!.clickY)
  await page.waitForTimeout(400)
  await expect(page.locator('textarea')).toBeAttached({ timeout: 3000 })

  const afterBBox = await captureTitleBoundingBox(page)
  expect(afterBBox, 'must detect title pixels from Canvas render').not.toBeNull()

  const dMinX = afterBBox!.minX - beforeBBox!.minX
  const dMaxX = afterBBox!.maxX - beforeBBox!.maxX
  // Before the fix dMinX/dMaxX were ~-11 (title shifted 11 screen px left of
  // the original raster). Allow ±2 px tolerance for subpixel rendering.
  expect(Math.abs(dMinX), `title minX shifted by ${dMinX}px`).toBeLessThanOrEqual(2)
  expect(Math.abs(dMaxX), `title maxX shifted by ${dMaxX}px`).toBeLessThanOrEqual(2)
})
