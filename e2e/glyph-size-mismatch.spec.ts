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

interface GlyphInfo {
  char: string
  x: number
  y: number
  width: number
  height: number
  fontId: string
  fontSize: number
}

// Helper: get glyphs for a specific block by ID
async function getGlyphsForBlock(
  page: import('@playwright/test').Page,
  blockId: string,
): Promise<GlyphInfo[] | null> {
  return page.evaluate(({ bid }) => {
    const core = (window as any).__PDFINE_EDITOR_CORE__
    if (!core) return null
    const pg = core.getPageModel(core.getCurrentPage())
    const el = pg?.elements.find((e: any) => e.id === bid)
    if (!el || el.type !== 'text') return null

    const glyphs: any[] = []
    for (const para of el.paragraphs) {
      if (!para.lines) continue
      for (const line of para.lines) {
        for (const glyph of line.glyphs) {
          glyphs.push({
            char: glyph.char,
            x: glyph.x,
            y: glyph.y,
            width: glyph.width,
            height: glyph.height,
            fontId: glyph.style.fontId,
            fontSize: glyph.style.fontSize,
          })
        }
      }
    }
    return glyphs
  }, { bid: blockId })
}

/**
 * Find a text block and return block info + click coordinates for a given char index.
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
        matchPos,
        clickX,
        clickY,
        bounds: el.bounds,
        // Canvas-space bounding box for the text block
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
 * Capture per-character visual bounding boxes from canvas pixels.
 * For each glyph in the model, scan its expected canvas region and measure
 * the actual ink extent (leftmost/rightmost/top/bottom dark pixels).
 */
async function measureVisualCharExtents(
  page: import('@playwright/test').Page,
  blockId: string,
) {
  return page.evaluate(({ bid }) => {
    const core = (window as any).__PDFINE_EDITOR_CORE__
    if (!core) return null
    const pg = core.getPageModel(core.getCurrentPage())
    const el = pg?.elements.find((e: any) => e.id === bid)
    if (!el || el.type !== 'text') return null

    const scale = core.getZoom()
    const renderEngine = core.getRenderEngine()
    const pageOffset = renderEngine.getPageOffset()
    const canvas = document.querySelector('canvas')!
    const ctx = canvas.getContext('2d')!
    const dpr = window.devicePixelRatio || 1

    const results: {
      char: string
      modelWidth: number
      modelHeight: number
      visualWidth: number
      visualHeight: number
      inkPixels: number
    }[] = []

    for (const para of el.paragraphs) {
      if (!para.lines) continue
      for (const line of para.lines) {
        for (const glyph of line.glyphs) {
          // Calculate canvas pixel region for this glyph (with a bit of padding)
          const pad = 2
          const gx = (pageOffset.x + (el.bounds.x + glyph.x) * scale) * dpr
          const gy = (pageOffset.y + (el.bounds.y + glyph.y) * scale) * dpr
          const gw = glyph.width * scale * dpr
          const gh = glyph.height * scale * dpr

          const px = Math.max(0, Math.floor(gx - pad))
          const py = Math.max(0, Math.floor(gy - pad))
          const pw = Math.min(Math.ceil(gw + pad * 2), canvas.width - px)
          const ph = Math.min(Math.ceil(gh + pad * 2), canvas.height - py)
          if (pw <= 0 || ph <= 0) continue

          const data = ctx.getImageData(px, py, pw, ph).data

          // Find ink extent
          let minCol = pw, maxCol = 0, minRow = ph, maxRow = 0, inkCount = 0
          for (let row = 0; row < ph; row++) {
            for (let col = 0; col < pw; col++) {
              const i = (row * pw + col) * 4
              if (data[i] < 100 && data[i + 1] < 100 && data[i + 2] < 100) {
                inkCount++
                if (col < minCol) minCol = col
                if (col > maxCol) maxCol = col
                if (row < minRow) minRow = row
                if (row > maxRow) maxRow = row
              }
            }
          }

          const visualWidth = inkCount > 0 ? (maxCol - minCol + 1) / dpr : 0
          const visualHeight = inkCount > 0 ? (maxRow - minRow + 1) / dpr : 0

          results.push({
            char: glyph.char,
            modelWidth: glyph.width,
            modelHeight: glyph.height,
            visualWidth,
            visualHeight,
            inkPixels: inkCount,
          })
        }
      }
    }

    return results
  }, { bid: blockId })
}

// ──────────────────────────────────────────────────────────────────────

test.describe('Bug: Visual glyph size mismatch after text insertion', () => {

  test.beforeEach(async ({ page }) => {
    await uploadAndWaitForRender(page)
    await page.waitForTimeout(500)
    await exposeEditorCore(page)
  })

  /**
   * Core bug test: After inserting a character in "Visitor visa details",
   * the re-rendered text (via Canvas fillText) should visually match
   * the original pdfjs-rasterized text in character width/height.
   *
   * We compare:
   * 1. Model-level glyph widths (LayoutEngine measureText vs original PDF)
   * 2. Visual ink extent on canvas (pdfjs raster vs Canvas fillText)
   *
   * Bug: Even though the same registered font is used, the Canvas
   * rendering produces different character shapes/sizes than pdfjs,
   * because pdfjs uses its own glyph rendering pipeline while
   * TextRenderer uses browser Canvas fillText.
   */
  test('visual text size should be consistent before/after editing "Visitor visa details"', async ({ page }) => {
    const target = await findTextBlock(page, 'Visitor visa detail', 5)
    expect(target, '"Visitor visa detail" not found').not.toBeNull()

    console.log(`Block text: "${target!.fullText}"`)
    console.log(`Block bounds: ${target!.bounds.width.toFixed(2)} x ${target!.bounds.height.toFixed(2)}`)

    // Capture visual extents of each character BEFORE edit (pdfjs rendering)
    const visualBefore = await measureVisualCharExtents(page, target!.blockId)
    expect(visualBefore).not.toBeNull()

    console.log('Visual char extents BEFORE edit (pdfjs):')
    visualBefore!.slice(0, 20).forEach(c =>
      console.log(`  '${c.char}': model w=${c.modelWidth.toFixed(2)} h=${c.modelHeight.toFixed(2)}, visual w=${c.visualWidth.toFixed(1)} h=${c.visualHeight.toFixed(1)}, ink=${c.inkPixels}`)
    )

    // Take screenshot before edit
    await page.screenshot({ path: 'e2e/screenshots/glyph-visual-01-before.png' })

    // Double-click to enter edit mode
    await page.mouse.dblclick(target!.clickX, target!.clickY)
    await page.waitForTimeout(300)
    const textarea = page.locator('textarea')
    await expect(textarea).toBeAttached({ timeout: 3000 })

    // Type a character to trigger TextRenderer re-render
    await textarea.focus()
    await page.keyboard.type('X')
    await page.waitForTimeout(600)

    // Take screenshot after edit
    await page.screenshot({ path: 'e2e/screenshots/glyph-visual-02-after.png' })

    // Capture visual extents AFTER edit (Canvas fillText rendering)
    const visualAfter = await measureVisualCharExtents(page, target!.blockId)
    expect(visualAfter).not.toBeNull()

    console.log('Visual char extents AFTER edit (Canvas fillText):')
    visualAfter!.slice(0, 20).forEach(c =>
      console.log(`  '${c.char}': model w=${c.modelWidth.toFixed(2)} h=${c.modelHeight.toFixed(2)}, visual w=${c.visualWidth.toFixed(1)} h=${c.visualHeight.toFixed(1)}, ink=${c.inkPixels}`)
    )

    // Find the inserted 'X' index in the after array
    const xIdx = visualAfter!.findIndex(c => c.char === 'X')

    // Compare visual extents of characters that existed before and after
    // Characters before insertion point: same index
    // Characters after insertion point: index shifted by +1 in after
    const comparisons: {
      char: string
      beforeVisualW: number
      afterVisualW: number
      beforeVisualH: number
      afterVisualH: number
      widthDiffPx: number
      heightDiffPx: number
    }[] = []

    for (let i = 0; i < visualBefore!.length; i++) {
      const before = visualBefore![i]
      // Determine the corresponding index in after (shifted if past insertion)
      const afterIdx = i < xIdx ? i : i + 1
      if (afterIdx >= visualAfter!.length) break

      const after = visualAfter![afterIdx]
      if (before.char !== after.char) continue
      if (before.char === ' ') continue // Skip spaces (no ink)

      comparisons.push({
        char: before.char,
        beforeVisualW: before.visualWidth,
        afterVisualW: after.visualWidth,
        beforeVisualH: before.visualHeight,
        afterVisualH: after.visualHeight,
        widthDiffPx: Math.abs(after.visualWidth - before.visualWidth),
        heightDiffPx: Math.abs(after.visualHeight - before.visualHeight),
      })
    }

    console.log('\nPer-character visual comparison (pdfjs vs Canvas fillText):')
    comparisons.forEach(c =>
      console.log(`  '${c.char}': width ${c.beforeVisualW.toFixed(1)}→${c.afterVisualW.toFixed(1)} (Δ${c.widthDiffPx.toFixed(1)}px), height ${c.beforeVisualH.toFixed(1)}→${c.afterVisualH.toFixed(1)} (Δ${c.heightDiffPx.toFixed(1)}px)`)
    )

    // Calculate average width and height differences
    const avgWidthDiff = comparisons.reduce((s, c) => s + c.widthDiffPx, 0) / Math.max(1, comparisons.length)
    const avgHeightDiff = comparisons.reduce((s, c) => s + c.heightDiffPx, 0) / Math.max(1, comparisons.length)
    const maxWidthDiff = Math.max(...comparisons.map(c => c.widthDiffPx))
    const maxHeightDiff = Math.max(...comparisons.map(c => c.heightDiffPx))

    // Count characters with significant visual difference (>1px)
    const significantWidthDiffs = comparisons.filter(c => c.widthDiffPx > 1)
    const significantHeightDiffs = comparisons.filter(c => c.heightDiffPx > 1)

    console.log(`\nAvg width diff: ${avgWidthDiff.toFixed(2)}px, max: ${maxWidthDiff.toFixed(1)}px`)
    console.log(`Avg height diff: ${avgHeightDiff.toFixed(2)}px, max: ${maxHeightDiff.toFixed(1)}px`)
    console.log(`Characters with >1px width diff: ${significantWidthDiffs.length}/${comparisons.length}`)
    console.log(`Characters with >1px height diff: ${significantHeightDiffs.length}/${comparisons.length}`)

    // Calculate total visual text width before and after (excluding spaces)
    const nonSpaceBefore = visualBefore!.filter(c => c.char !== ' ')
    const totalVisualWidthBefore = nonSpaceBefore.reduce((s, c) => s + c.visualWidth, 0)

    // For after: exclude 'X' and spaces
    const nonSpaceAfterNoX = visualAfter!.filter(c => c.char !== ' ' && c.char !== 'X')
    const totalVisualWidthAfter = nonSpaceAfterNoX.reduce((s, c) => s + c.visualWidth, 0)

    const totalWidthDiff = Math.abs(totalVisualWidthAfter - totalVisualWidthBefore)
    const totalWidthDiffPercent = (totalWidthDiff / Math.max(1, totalVisualWidthBefore)) * 100

    console.log(`\nTotal visual text width (no spaces): before=${totalVisualWidthBefore.toFixed(1)}px, after=${totalVisualWidthAfter.toFixed(1)}px`)
    console.log(`Total width diff: ${totalWidthDiff.toFixed(1)}px (${totalWidthDiffPercent.toFixed(1)}%)`)

    // ASSERTIONS:
    // The visual text width should not change significantly after editing
    // A >5% change indicates the rendering engines produce notably different character sizes
    expect(
      totalWidthDiffPercent,
      `Total visual text width changed by ${totalWidthDiffPercent.toFixed(1)}% between pdfjs and Canvas rendering. ` +
      `Before: ${totalVisualWidthBefore.toFixed(1)}px, After: ${totalVisualWidthAfter.toFixed(1)}px. ` +
      `This causes visible text size changes after editing.`
    ).toBeLessThan(5)

    // Average per-character width difference should be <1px
    expect(
      avgWidthDiff,
      `Average character width differs by ${avgWidthDiff.toFixed(2)}px between pdfjs and Canvas rendering`
    ).toBeLessThan(1)

    // No character should differ by more than 3px in width
    // (narrow chars like 'i' have higher relative error at pixel level)
    expect(
      maxWidthDiff,
      `Worst-case character width differs by ${maxWidthDiff.toFixed(1)}px (char: '${comparisons.find(c => c.widthDiffPx === maxWidthDiff)?.char}')`
    ).toBeLessThan(3)
  })

  /**
   * Model-level consistency check: glyph widths in the data model should
   * remain identical for unchanged characters before and after insertion.
   * This verifies that the LayoutEngine's measureText is deterministic.
   */
  test('model glyph widths should not change for unmodified characters after insertion', async ({ page }) => {
    const target = await findTextBlock(page, 'Visitor visa detail', 5)
    expect(target).not.toBeNull()

    // Get model glyphs before editing
    const glyphsBefore = await getGlyphsForBlock(page, target!.blockId)
    expect(glyphsBefore).not.toBeNull()

    console.log(`Model glyphs BEFORE: ${glyphsBefore!.length}`)
    glyphsBefore!.slice(0, 20).forEach(g =>
      console.log(`  '${g.char}' w=${g.width.toFixed(3)} h=${g.height.toFixed(3)} font=${g.fontId}@${g.fontSize}`)
    )

    // Sum of first-line widths
    const firstLineY = glyphsBefore![0]?.y
    const firstLineGlyphs = glyphsBefore!.filter(g => Math.abs(g.y - firstLineY) < 1)
    const totalWidthBefore = firstLineGlyphs.reduce((s, g) => s + g.width, 0)

    // Enter edit mode and insert
    await page.mouse.dblclick(target!.clickX, target!.clickY)
    await page.waitForTimeout(300)
    const textarea = page.locator('textarea')
    await expect(textarea).toBeAttached({ timeout: 3000 })
    await textarea.focus()
    await page.keyboard.type('Z')
    await page.waitForTimeout(500)

    // Get model glyphs after editing
    const glyphsAfter = await getGlyphsForBlock(page, target!.blockId)
    expect(glyphsAfter).not.toBeNull()

    console.log(`Model glyphs AFTER: ${glyphsAfter!.length}`)
    glyphsAfter!.slice(0, 20).forEach(g =>
      console.log(`  '${g.char}' w=${g.width.toFixed(3)} h=${g.height.toFixed(3)} font=${g.fontId}@${g.fontSize}`)
    )

    // Find Z and compare surrounding chars
    const zIdx = glyphsAfter!.findIndex(g => g.char === 'Z')
    expect(zIdx).toBeGreaterThanOrEqual(0)

    // Compare each original character with its post-insert counterpart
    const mismatches: string[] = []
    for (let i = 0; i < glyphsBefore!.length; i++) {
      const before = glyphsBefore![i]
      const afterIdx = i < zIdx ? i : i + 1
      if (afterIdx >= glyphsAfter!.length) break
      const after = glyphsAfter![afterIdx]
      if (before.char !== after.char) continue

      const wDiff = Math.abs(before.width - after.width)
      const hDiff = Math.abs(before.height - after.height)
      if (wDiff > 0.01 || hDiff > 0.01) {
        mismatches.push(
          `'${before.char}': w ${before.width.toFixed(3)}→${after.width.toFixed(3)} (Δ${wDiff.toFixed(3)}), h ${before.height.toFixed(3)}→${after.height.toFixed(3)} (Δ${hDiff.toFixed(3)})`
        )
      }
    }

    if (mismatches.length > 0) {
      console.log(`Model dimension mismatches: ${mismatches.length}`)
      mismatches.forEach(m => console.log(`  ${m}`))
    }

    // Total width consistency (sum ALL non-space glyphs, excluding inserted 'Z')
    // Note: spaces may be trimmed at line breaks during reflow, so exclude them
    const totalWidthAfter = glyphsAfter!
      .filter(g => g.char !== 'Z' && g.char !== ' ')
      .reduce((s, g) => s + g.width, 0)
    const totalWidthBeforeAll = glyphsBefore!
      .filter(g => g.char !== ' ')
      .reduce((s, g) => s + g.width, 0)
    const widthDeltaPercent = (Math.abs(totalWidthAfter - totalWidthBeforeAll) / Math.max(1, totalWidthBeforeAll)) * 100

    console.log(`Total model width (no spaces): before=${totalWidthBeforeAll.toFixed(3)}, after(excl Z)=${totalWidthAfter.toFixed(3)}, delta=${widthDeltaPercent.toFixed(2)}%`)

    // Model widths should be identical (same font, same measureText)
    expect(mismatches.length, `${mismatches.length} characters changed model width after insertion`).toBe(0)
    expect(widthDeltaPercent, `Total width changed by ${widthDeltaPercent.toFixed(2)}%`).toBeLessThan(0.1)
  })
})
