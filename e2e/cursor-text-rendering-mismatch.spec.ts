import { test, expect } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const VISA_PDF = path.resolve(__dirname, '../example/Visa.pdf')

async function uploadAndWaitForRender(page: import('@playwright/test').Page) {
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  const fileInput = page.locator('input[type="file"]')
  await fileInput.setInputFiles(VISA_PDF)
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

/**
 * Find a text block containing searchText and return click coordinates
 * plus the block's canvas-space bounding box for pixel capture.
 */
async function findTextBlock(
  page: import('@playwright/test').Page,
  searchText: string,
  charIndex: number,
) {
  return page.evaluate(({ search, idx }) => {
    const core = (window as any).__PDFINE_EDITOR_CORE__
    if (!core) return null

    const pageIdx = core.getCurrentPage()
    const pageModel = core.getPageModel(pageIdx)
    if (!pageModel) return null

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
      }

      const matchPos = fullText.indexOf(search)
      if (matchPos === -1) continue

      // Collect glyphs
      const glyphs: any[] = []
      for (const para of el.paragraphs) {
        if (!para.lines) continue
        for (const line of para.lines) {
          for (const glyph of line.glyphs) glyphs.push(glyph)
        }
      }

      const targetIdx = matchPos + idx
      const glyph = glyphs[targetIdx] || glyphs[glyphs.length - 1]

      const clickX = rect.left + pageOffset.x + (el.bounds.x + glyph.x + glyph.width / 2) * scale
      const clickY = rect.top + pageOffset.y + (el.bounds.y + glyph.y + glyph.height / 2) * scale

      return {
        blockId: el.id,
        fullText,
        clickX,
        clickY,
        bounds: el.bounds,
        canvasBox: {
          x: pageOffset.x + el.bounds.x * scale,
          y: pageOffset.y + el.bounds.y * scale,
          w: el.bounds.width * scale,
          h: el.bounds.height * scale,
        },
        scale,
        dpr: window.devicePixelRatio || 1,
      }
    }
    return null
  }, { search: searchText, idx: charIndex })
}

/**
 * Capture the pixel data of a canvas region and return a hash-like
 * fingerprint (array of dark pixel positions) for comparison.
 */
async function captureBlockPixels(
  page: import('@playwright/test').Page,
  canvasX: number,
  canvasY: number,
  cssW: number,
  cssH: number,
) {
  return page.evaluate(({ x, y, w, h }) => {
    const canvas = document.querySelector('canvas')!
    const ctx = canvas.getContext('2d')!
    const dpr = window.devicePixelRatio || 1

    const px = Math.max(0, Math.round(x * dpr))
    const py = Math.max(0, Math.round(y * dpr))
    const pw = Math.min(Math.round(w * dpr), canvas.width - px)
    const ph = Math.min(Math.round(h * dpr), canvas.height - py)
    if (pw <= 0 || ph <= 0) return { totalDark: 0, rawData: [] as number[] }

    const data = ctx.getImageData(px, py, pw, ph).data

    // Collect all pixel RGBA values for exact comparison
    const rawData: number[] = []
    let totalDark = 0
    for (let i = 0; i < data.length; i += 4) {
      rawData.push(data[i], data[i + 1], data[i + 2], data[i + 3])
      if (data[i] < 100 && data[i + 1] < 100 && data[i + 2] < 100) {
        totalDark++
      }
    }

    return { totalDark, rawData }
  }, { x: canvasX, y: canvasY, w: cssW, h: cssH })
}

/**
 * Compare two pixel arrays and return the number of pixels that differ
 * (beyond a small tolerance to account for anti-aliasing).
 */
function comparePixels(
  before: number[],
  after: number[],
  tolerance: number = 5,
): { diffCount: number; totalPixels: number; diffPercent: number } {
  const totalPixels = Math.min(before.length, after.length) / 4
  let diffCount = 0

  for (let i = 0; i < before.length && i < after.length; i += 4) {
    const dr = Math.abs(before[i] - after[i])
    const dg = Math.abs(before[i + 1] - after[i + 1])
    const db = Math.abs(before[i + 2] - after[i + 2])
    if (dr > tolerance || dg > tolerance || db > tolerance) {
      diffCount++
    }
  }

  return {
    diffCount,
    totalPixels,
    diffPercent: (diffCount / Math.max(1, totalPixels)) * 100,
  }
}

// ──────────────────────────────────────────────────────────────────────

test.describe('Bug: Rendering mismatch between PDF raster and canvas fillText', () => {

  test.beforeEach(async ({ page }) => {
    await uploadAndWaitForRender(page)
    await page.waitForTimeout(500)
    await exposeEditorCore(page)
  })

  /**
   * Core rendering mismatch test:
   *
   * 1. Load PDF — text is rendered by pdfjs rasterizer
   * 2. Double-click to enter edit mode — text area appears (pdfjs raster still visible)
   * 3. Take screenshot of the text block region (BEFORE typing)
   * 4. Type a character then immediately delete it (Backspace) — this triggers
   *    reflowTextBlock() which redraws text via Canvas fillText on a white overlay
   * 5. Take screenshot of the same region (AFTER type+delete cycle)
   * 6. Compare: if the two rendering paths produce identical output, screenshots match.
   *    The bug is that they differ — canvas fillText renders text differently than pdfjs.
   *
   * This causes cursor positions to not align with the visible text, because the cursor
   * position is calculated from the canvas fillText layout, but the user sees the pdfjs
   * raster until they start typing.
   */
  test('text rendering should be identical before and after type+delete cycle', async ({ page }) => {
    // Find "Visitor visa detail" text block
    const target = await findTextBlock(page, 'Visitor visa detail', 5)
    expect(target, '"Visitor visa detail" not found — is EditorCore exposed?').not.toBeNull()

    console.log(`Found block: "${target!.fullText}"`)
    console.log(`Block bounds: ${JSON.stringify(target!.bounds)}`)

    const pad = 5
    const box = target!.canvasBox

    // Double-click to enter edit mode
    await page.mouse.dblclick(target!.clickX, target!.clickY)
    await page.waitForTimeout(500)

    const textarea = page.locator('textarea')
    await expect(textarea).toBeAttached({ timeout: 3000 })

    // Wait for cursor blink to be in a consistent state
    await page.waitForTimeout(200)

    // Capture text block pixels BEFORE typing (pdfjs raster + cursor overlay)
    // We capture the full block region
    const beforePixels = await captureBlockPixels(
      page,
      box.x - pad,
      box.y - pad,
      box.w + pad * 2,
      box.h + pad * 2,
    )
    expect(beforePixels.totalDark, 'No dark pixels found before typing').toBeGreaterThan(10)

    await page.screenshot({ path: 'e2e/screenshots/rendering-mismatch-01-before-typing.png' })

    // Type a character — this triggers white overlay + Canvas fillText redraw
    await textarea.focus()
    await page.keyboard.type('X')
    await page.waitForTimeout(600)

    // Immediately delete it — text content returns to original
    await page.keyboard.press('Backspace')
    await page.waitForTimeout(600)

    // Capture text block pixels AFTER type+delete (Canvas fillText rendering)
    const afterPixels = await captureBlockPixels(
      page,
      box.x - pad,
      box.y - pad,
      box.w + pad * 2,
      box.h + pad * 2,
    )
    expect(afterPixels.totalDark, 'No dark pixels found after type+delete').toBeGreaterThan(10)

    await page.screenshot({ path: 'e2e/screenshots/rendering-mismatch-02-after-type-delete.png' })

    // Compare the two captures
    const comparison = comparePixels(beforePixels.rawData, afterPixels.rawData)

    console.log(`\nPixel comparison results:`)
    console.log(`  Total pixels compared: ${comparison.totalPixels}`)
    console.log(`  Pixels that differ: ${comparison.diffCount}`)
    console.log(`  Difference percentage: ${comparison.diffPercent.toFixed(2)}%`)
    console.log(`  Dark pixels before: ${beforePixels.totalDark}`)
    console.log(`  Dark pixels after: ${afterPixels.totalDark}`)
    console.log(`  Dark pixel change: ${afterPixels.totalDark - beforePixels.totalDark}`)

    // BUG ASSERTION: The two renderings should produce identical output.
    // If the text content is the same, the visual result should match.
    // A difference > 1% indicates the rendering mismatch bug.
    //
    // Note: We use a 3% tolerance to account for cursor blink state
    // differences (the cursor is a thin vertical line that may be visible
    // in one capture but not the other). The actual bug typically shows
    // 30-40%+ pixel differences because canvas fillText uses different
    // glyph shapes/metrics than pdfjs.
    expect(
      comparison.diffPercent,
      `Rendering mismatch detected: ${comparison.diffPercent.toFixed(2)}% of pixels differ ` +
      `between pdfjs raster and Canvas fillText rendering. ` +
      `This means the two rendering paths produce visually different text, ` +
      `causing cursor misalignment. ` +
      `(${comparison.diffCount} of ${comparison.totalPixels} pixels differ)`
    ).toBeLessThan(3)
  })

  /**
   * Additional check: compare dark pixel count as a simpler metric.
   * If the same text is rendered by two different engines, the total
   * number of dark (ink) pixels should be very similar.
   */
  test('dark pixel count should remain stable after type+delete cycle', async ({ page }) => {
    const target = await findTextBlock(page, 'February', 3)
    expect(target, '"February" not found').not.toBeNull()

    const pad = 5
    const box = target!.canvasBox

    // Enter edit mode
    await page.mouse.dblclick(target!.clickX, target!.clickY)
    await page.waitForTimeout(500)
    const textarea = page.locator('textarea')
    await expect(textarea).toBeAttached({ timeout: 3000 })

    // Capture before typing
    const beforePixels = await captureBlockPixels(
      page, box.x - pad, box.y - pad, box.w + pad * 2, box.h + pad * 2,
    )

    await page.screenshot({ path: 'e2e/screenshots/rendering-mismatch-03-feb-before.png' })

    // Type and delete
    await textarea.focus()
    await page.keyboard.type('A')
    await page.waitForTimeout(500)
    await page.keyboard.press('Backspace')
    await page.waitForTimeout(500)

    // Capture after type+delete
    const afterPixels = await captureBlockPixels(
      page, box.x - pad, box.y - pad, box.w + pad * 2, box.h + pad * 2,
    )

    await page.screenshot({ path: 'e2e/screenshots/rendering-mismatch-04-feb-after.png' })

    const darkDiff = Math.abs(afterPixels.totalDark - beforePixels.totalDark)
    const darkChangePercent = (darkDiff / Math.max(1, beforePixels.totalDark)) * 100

    console.log(`\nDark pixel comparison for "February" block:`)
    console.log(`  Before: ${beforePixels.totalDark} dark pixels`)
    console.log(`  After:  ${afterPixels.totalDark} dark pixels`)
    console.log(`  Change: ${darkDiff} pixels (${darkChangePercent.toFixed(1)}%)`)

    // Full pixel comparison
    const comparison = comparePixels(beforePixels.rawData, afterPixels.rawData)
    console.log(`  Pixel-level diff: ${comparison.diffCount} pixels (${comparison.diffPercent.toFixed(2)}%)`)

    // The dark pixel count should not change significantly if the same text
    // is rendered. A change > 10% strongly suggests different rendering.
    expect(
      darkChangePercent,
      `Dark pixel count changed by ${darkChangePercent.toFixed(1)}% after type+delete on "February". ` +
      `Before: ${beforePixels.totalDark}, After: ${afterPixels.totalDark}. ` +
      `This indicates pdfjs and Canvas fillText produce visually different text.`
    ).toBeLessThan(10)

    // Pixel-level comparison should also be tight
    expect(
      comparison.diffPercent,
      `${comparison.diffPercent.toFixed(2)}% of pixels changed after type+delete — rendering mismatch`
    ).toBeLessThan(2)
  })

  /**
   * Double-click entry test: measure text position shift by comparing the
   * centroid (center of mass) of dark ink pixels BEFORE double-click (pdfjs)
   * vs AFTER double-click (Canvas fillText on white overlay).
   *
   * We use a strict darkness threshold (<50) to only capture text ink pixels,
   * ignoring the editing highlight background and cursor.
   */
  test('text should not visually jump when entering edit mode via double-click', async ({ page }) => {
    const target = await findTextBlock(page, 'Visitor visa detail', 5)
    expect(target, '"Visitor visa details" not found').not.toBeNull()

    const pad = 15
    const box = target!.canvasBox

    // Helper: find the first and last row containing ink pixels,
    // and the first/last column — gives the ink bounding box.
    async function getInkBounds() {
      return page.evaluate(({ x, y, w, h }) => {
        const canvas = document.querySelector('canvas')!
        const ctx = canvas.getContext('2d')!
        const dpr = window.devicePixelRatio || 1
        const px = Math.max(0, Math.round(x * dpr))
        const py = Math.max(0, Math.round(y * dpr))
        const pw = Math.min(Math.round(w * dpr), canvas.width - px)
        const ph = Math.min(Math.round(h * dpr), canvas.height - py)
        if (pw <= 0 || ph <= 0) return null

        const data = ctx.getImageData(px, py, pw, ph).data
        let topRow = -1, bottomRow = -1, leftCol = pw, rightCol = 0, count = 0
        for (let row = 0; row < ph; row++) {
          for (let col = 0; col < pw; col++) {
            const i = (row * pw + col) * 4
            if (data[i] < 80 && data[i+1] < 80 && data[i+2] < 80) {
              if (topRow === -1) topRow = row
              bottomRow = row
              leftCol = Math.min(leftCol, col)
              rightCol = Math.max(rightCol, col)
              count++
            }
          }
        }
        return { topRow, bottomRow, leftCol, rightCol, count, width: pw, height: ph }
      }, { x: box.x - pad, y: box.y - pad, w: box.w + pad * 2, h: box.h + pad * 2 })
    }

    // Ink bounds BEFORE double-click (pdfjs)
    const before = await getInkBounds()
    expect(before, 'No capture before').not.toBeNull()
    expect(before!.count, 'No ink pixels before double-click').toBeGreaterThan(10)

    await page.screenshot({ path: 'e2e/screenshots/rendering-jump-01-before-dblclick.png' })

    // Double-click to enter edit mode
    await page.mouse.dblclick(target!.clickX, target!.clickY)
    await page.waitForTimeout(800)
    const textarea = page.locator('textarea')
    await expect(textarea).toBeAttached({ timeout: 3000 })

    // Ink bounds AFTER double-click (Canvas fillText)
    const after = await getInkBounds()
    expect(after, 'No capture after').not.toBeNull()
    expect(after!.count, 'No ink pixels after double-click').toBeGreaterThan(10)

    await page.screenshot({ path: 'e2e/screenshots/rendering-jump-02-after-dblclick.png' })

    const shiftTop = Math.abs(after!.topRow - before!.topRow)
    const shiftBottom = Math.abs(after!.bottomRow - before!.bottomRow)
    const shiftLeft = Math.abs(after!.leftCol - before!.leftCol)

    console.log(`\nDouble-click ink position shift for "Visitor visa details":`)
    console.log(`  Before: top=${before!.topRow}, bottom=${before!.bottomRow}, left=${before!.leftCol}, right=${before!.rightCol} (${before!.count} ink px)`)
    console.log(`  After:  top=${after!.topRow}, bottom=${after!.bottomRow}, left=${after!.leftCol}, right=${after!.rightCol} (${after!.count} ink px)`)
    console.log(`  Shift:  top=${shiftTop}px, bottom=${shiftBottom}px, left=${shiftLeft}px`)
    console.log(`  Capture size: ${before!.width}x${before!.height}`)

    // The top edge of ink should not shift more than 3 pixels.
    // This measures the actual text position shift, unaffected by nearby elements.
    expect(
      shiftTop,
      `Text top shifted by ${shiftTop}px on double-click`
    ).toBeLessThan(3)

    expect(
      shiftLeft,
      `Text left shifted by ${shiftLeft}px on double-click`
    ).toBeLessThan(3)
  })
})
