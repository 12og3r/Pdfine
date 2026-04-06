/**
 * E2E test: Verify that entering edit mode (double-click) does NOT change
 * the paragraph's line height / vertical spacing.
 *
 * Bug: Line heights jump when switching from pdfjs raster to canvas rendering
 * because the layout engine used a hardcoded lineSpacing=1.2 multiplier
 * instead of the PDF's actual baseline-to-baseline distance.
 */
import { test, expect } from '@playwright/test'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const EXAMPLE_PDF = path.resolve(__dirname, '../example/example_en.pdf')

async function uploadAndWaitForRender(page: import('@playwright/test').Page) {
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  const fileInput = page.locator('input[type="file"]')
  await fileInput.setInputFiles(EXAMPLE_PDF)

  // Wait for PDF content to render (non-white pixels appear)
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

  // Wait for fonts + rendering to settle
  await page.waitForTimeout(1500)
}

/**
 * Get document model info about all text blocks on the current page.
 */
async function getTextBlocksInfo(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const core = (window as any).__EDITOR_CORE__
    if (!core) return null
    const doc = core.getDocument()
    if (!doc) return null
    const pageIdx = core.getCurrentPage()
    const pageModel = doc.pages[pageIdx]
    if (!pageModel) return null

    return pageModel.elements
      .filter((el: any) => el.type === 'text')
      .map((el: any) => ({
        id: el.id,
        bounds: el.bounds,
        originalBounds: el.originalBounds,
        editable: el.editable,
        paragraphCount: el.paragraphs.length,
        paragraphs: el.paragraphs.map((p: any) => ({
          lineCount: p.lines?.length ?? 0,
          lineSpacing: p.lineSpacing,
          pdfLineHeight: p.pdfLineHeight,
          textPreview: p.runs.map((r: any) => r.text).join('').substring(0, 80),
          lineHeights: p.lines?.map((l: any) => l.height) ?? [],
          lineYPositions: p.lines?.map((l: any) => l.y) ?? [],
        })),
      }))
  })
}

/**
 * Capture text line Y positions in a given vertical region of the canvas.
 */
async function captureTextLinePositions(
  page: import('@playwright/test').Page,
  regionTop: number,
  regionBottom: number,
) {
  return page.evaluate(({ top, bottom }) => {
    const canvas = document.querySelector('canvas')!
    const ctx = canvas.getContext('2d')!
    const w = canvas.width
    const data = ctx.getImageData(0, 0, w, canvas.height).data
    const dpr = window.devicePixelRatio || 1

    const scanTop = Math.max(0, Math.round(top * dpr))
    const scanBottom = Math.min(canvas.height, Math.round(bottom * dpr))

    // Find rows with dark pixels
    const textRows: number[] = []
    for (let row = scanTop; row < scanBottom; row++) {
      let count = 0
      for (let col = 0; col < w; col += 2) {
        const idx = (row * w + col) * 4
        if (data[idx] < 80 && data[idx + 1] < 80 && data[idx + 2] < 80) {
          count++
        }
      }
      if (count > 5) textRows.push(row)
    }

    // Group into lines
    const lines: { startY: number; endY: number; midY: number }[] = []
    if (textRows.length === 0) return lines

    let lineStart = textRows[0]
    let prevY = textRows[0]
    for (let i = 1; i < textRows.length; i++) {
      if (textRows[i] - prevY > 3) {
        lines.push({
          startY: lineStart / dpr,
          endY: prevY / dpr,
          midY: (lineStart + prevY) / 2 / dpr,
        })
        lineStart = textRows[i]
      }
      prevY = textRows[i]
    }
    lines.push({
      startY: lineStart / dpr,
      endY: prevY / dpr,
      midY: (lineStart + prevY) / 2 / dpr,
    })

    return lines
  }, { top: regionTop, bottom: regionBottom })
}

/**
 * Find the second text block (body paragraph) and double-click it.
 * Returns the block info.
 */
async function findAndClickSecondBlock(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const core = (window as any).__EDITOR_CORE__
    if (!core) return null
    const doc = core.getDocument()
    if (!doc) return null
    const pageIdx = core.getCurrentPage()
    const pageModel = doc.pages[pageIdx]
    if (!pageModel) return null

    // Find editable text blocks with multiple lines
    const textBlocks = pageModel.elements.filter(
      (el: any) => el.type === 'text' && el.editable
    )
    // Find the second block (first is usually a title/header)
    const target = textBlocks.length > 1 ? textBlocks[1] : textBlocks[0]
    if (!target) return null

    return {
      id: target.id,
      bounds: target.bounds,
      paragraphs: target.paragraphs.map((p: any) => ({
        lineCount: p.lines?.length ?? 0,
        pdfLineHeight: p.pdfLineHeight,
        lineSpacing: p.lineSpacing,
        textPreview: p.runs.map((r: any) => r.text).join('').substring(0, 100),
        lineHeights: p.lines?.map((l: any) => l.height) ?? [],
        lineYPositions: p.lines?.map((l: any) => l.y) ?? [],
        newlineCount: (p.runs.map((r: any) => r.text).join('').match(/\n/g) || []).length,
      })),
    }
  })
}

test.describe('Line height stability on edit mode entry', () => {

  test('paragraph line positions should not shift when entering edit mode', async ({ page }) => {
    await uploadAndWaitForRender(page)

    // Dump document model info
    const blocks = await getTextBlocksInfo(page)
    console.log('=== Text blocks on page ===')
    for (const block of blocks ?? []) {
      console.log(`Block ${block.id}: bounds=(${block.bounds.x.toFixed(1)}, ${block.bounds.y.toFixed(1)}, ${block.bounds.width.toFixed(1)}, ${block.bounds.height.toFixed(1)}) editable=${block.editable}`)
      for (const p of block.paragraphs) {
        console.log(`  Paragraph: ${p.lineCount} lines, lineSpacing=${p.lineSpacing}, pdfLineHeight=${p.pdfLineHeight?.toFixed(2) ?? 'undefined'}`)
        console.log(`  Text: "${p.textPreview}"`)
        console.log(`  Line heights: [${p.lineHeights.map((h: number) => h.toFixed(2)).join(', ')}]`)
        console.log(`  Line Ys: [${p.lineYPositions.map((y: number) => y.toFixed(2)).join(', ')}]`)
      }
    }

    // Find the second text block
    const targetBlock = await findAndClickSecondBlock(page)
    expect(targetBlock, 'Could not find target text block').not.toBeNull()
    console.log('\n=== Target block ===')
    console.log(`Block ${targetBlock!.id}: bounds=(${targetBlock!.bounds.x.toFixed(1)}, ${targetBlock!.bounds.y.toFixed(1)}, w=${targetBlock!.bounds.width.toFixed(1)}, h=${targetBlock!.bounds.height.toFixed(1)})`)
    for (const p of targetBlock!.paragraphs) {
      console.log(`  Lines: ${p.lineCount}, newlines: ${p.newlineCount}, pdfLineHeight: ${p.pdfLineHeight?.toFixed(2) ?? 'undefined'}`)
      console.log(`  Text: "${p.textPreview}"`)
      console.log(`  Line heights: [${p.lineHeights.map((h: number) => h.toFixed(2)).join(', ')}]`)
      console.log(`  Line Ys: [${p.lineYPositions.map((y: number) => y.toFixed(2)).join(', ')}]`)
    }

    // Get viewport info to compute click coordinates
    const clickInfo = await page.evaluate(() => {
      const core = (window as any).__EDITOR_CORE__
      if (!core) return null
      const doc = core.getDocument()
      if (!doc) return null
      const pageIdx = core.getCurrentPage()
      const pageModel = doc.pages[pageIdx]
      if (!pageModel) return null

      const textBlocks = pageModel.elements.filter((el: any) => el.type === 'text' && el.editable)
      const target = textBlocks.length > 1 ? textBlocks[1] : textBlocks[0]
      if (!target) return null

      const renderEngine = core.getRenderEngine()
      const pageOffset = renderEngine.getPageOffset()
      const viewport = core.getViewport()
      const scale = viewport.scale

      // Click in the middle of the block
      const cx = pageOffset.x + (target.bounds.x + target.bounds.width / 2) * scale
      const cy = pageOffset.y + (target.bounds.y + target.bounds.height / 2) * scale

      return { clientX: cx, clientY: cy, scale, pageOffset }
    })
    expect(clickInfo).not.toBeNull()

    // Scan region: block bounds in screen coordinates + padding
    const scale = clickInfo!.scale
    const offsetY = clickInfo!.pageOffset.y
    const regionTop = offsetY + (targetBlock!.bounds.y - 5) * scale
    const regionBottom = offsetY + (targetBlock!.bounds.y + targetBlock!.bounds.height + 5) * scale

    // Screenshot BEFORE edit mode
    await page.screenshot({ path: 'e2e/screenshots/line-height-01-before.png', fullPage: true })

    // Capture pixel-level line positions before editing
    const beforeLines = await captureTextLinePositions(page, regionTop, regionBottom)
    console.log('\n=== Pixel scan BEFORE edit ===')
    console.log(`Region: ${regionTop.toFixed(1)} - ${regionBottom.toFixed(1)}`)
    console.log(`Lines: ${beforeLines.length}`)
    for (let i = 0; i < beforeLines.length; i++) {
      console.log(`  Line ${i}: midY=${beforeLines[i].midY.toFixed(1)}, h=${(beforeLines[i].endY - beforeLines[i].startY).toFixed(1)}`)
    }

    // Double-click to enter edit mode
    await page.mouse.dblclick(clickInfo!.clientX, clickInfo!.clientY)
    await page.waitForTimeout(500)

    // Verify edit mode was entered
    const textarea = page.locator('textarea')
    await expect(textarea).toBeAttached({ timeout: 3000 })

    // Screenshot AFTER entering edit mode
    await page.screenshot({ path: 'e2e/screenshots/line-height-02-after-edit.png', fullPage: true })

    // Get updated block info after edit mode entry
    const afterBlock = await findAndClickSecondBlock(page)
    console.log('\n=== Target block AFTER edit ===')
    if (afterBlock) {
      console.log(`Block ${afterBlock.id}: bounds=(${afterBlock.bounds.x.toFixed(1)}, ${afterBlock.bounds.y.toFixed(1)}, w=${afterBlock.bounds.width.toFixed(1)}, h=${afterBlock.bounds.height.toFixed(1)})`)
      for (const p of afterBlock.paragraphs) {
        console.log(`  Lines: ${p.lineCount}, pdfLineHeight: ${p.pdfLineHeight?.toFixed(2) ?? 'undefined'}`)
        console.log(`  Line heights: [${p.lineHeights.map((h: number) => h.toFixed(2)).join(', ')}]`)
        console.log(`  Line Ys: [${p.lineYPositions.map((y: number) => y.toFixed(2)).join(', ')}]`)
      }
    }

    // Capture pixel-level line positions after editing
    const afterLines = await captureTextLinePositions(page, regionTop, regionBottom)
    console.log('\n=== Pixel scan AFTER edit ===')
    console.log(`Lines: ${afterLines.length}`)
    for (let i = 0; i < afterLines.length; i++) {
      console.log(`  Line ${i}: midY=${afterLines[i].midY.toFixed(1)}, h=${(afterLines[i].endY - afterLines[i].startY).toFixed(1)}`)
    }

    // CORE ASSERTIONS
    expect(afterLines.length, 'Line count changed after entering edit mode').toBe(beforeLines.length)

    const MAX_SHIFT_PX = 3
    for (let i = 0; i < Math.min(beforeLines.length, afterLines.length); i++) {
      const shift = Math.abs(afterLines[i].midY - beforeLines[i].midY)
      console.log(`Line ${i}: shift=${shift.toFixed(1)}px`)
      expect(shift, `Line ${i} shifted ${shift.toFixed(1)}px`).toBeLessThan(MAX_SHIFT_PX)
    }
  })
})
