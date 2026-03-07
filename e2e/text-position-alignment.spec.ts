import { test, expect } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const VISA_PDF = path.resolve(__dirname, '../Visa.pdf')

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

/** Find a text region on the canvas by scanning for dark pixel clusters */
async function findTextPosition(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const canvas = document.querySelector('canvas')
    if (!canvas) return null
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    const rect = canvas.getBoundingClientRect()
    const w = canvas.width, h = canvas.height
    const data = ctx.getImageData(0, 0, w, h).data
    const dpr = window.devicePixelRatio || 1

    const textRows: { y: number; avgX: number }[] = []
    for (let row = 0; row < h; row += 2) {
      let count = 0, xSum = 0
      for (let col = 0; col < w; col += 2) {
        const idx = (row * w + col) * 4
        if (data[idx] < 80 && data[idx + 1] < 80 && data[idx + 2] < 80) {
          count++
          xSum += col
        }
      }
      if (count > 10) textRows.push({ y: row, avgX: xSum / count })
    }
    if (textRows.length === 0) return null
    const target = textRows[Math.min(5, textRows.length - 1)]
    return {
      clientX: rect.left + target.avgX / dpr,
      clientY: rect.top + target.y / dpr,
    }
  })
}

/**
 * Capture a snapshot of pixel rows in a region, returning per-row dark pixel info.
 * Used to compare text position before and after entering edit mode.
 */
async function captureBlockPixels(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const canvas = document.querySelector('canvas')!
    const ctx = canvas.getContext('2d')!
    const w = canvas.width, h = canvas.height
    const data = ctx.getImageData(0, 0, w, h).data
    const dpr = window.devicePixelRatio || 1

    // Collect rows with dark pixels (text)
    const rows: { y: number; darkCount: number; minX: number; maxX: number }[] = []
    const scanH = Math.min(h, 500 * dpr)
    for (let row = 0; row < scanH; row++) {
      let count = 0, minX = w, maxX = 0
      for (let col = 0; col < w; col++) {
        const idx = (row * w + col) * 4
        if (data[idx] < 80 && data[idx + 1] < 80 && data[idx + 2] < 80) {
          count++
          if (col < minX) minX = col
          if (col > maxX) maxX = col
        }
      }
      if (count > 5) rows.push({ y: row / dpr, darkCount: count, minX: minX / dpr, maxX: maxX / dpr })
    }
    return rows
  })
}

/** Group pixel rows into text lines */
function groupIntoLines(rows: { y: number; darkCount: number; minX: number; maxX: number }[]) {
  if (rows.length === 0) return []
  const lines: { y: number; h: number; minX: number; maxX: number; totalDark: number }[] = []
  let lineStart = rows[0].y
  let lineMinX = rows[0].minX
  let lineMaxX = rows[0].maxX
  let totalDark = rows[0].darkCount
  let prevY = rows[0].y

  for (let i = 1; i < rows.length; i++) {
    if (rows[i].y - prevY > 3) {
      lines.push({ y: lineStart, h: prevY - lineStart + 1, minX: lineMinX, maxX: lineMaxX, totalDark })
      lineStart = rows[i].y
      lineMinX = rows[i].minX
      lineMaxX = rows[i].maxX
      totalDark = rows[i].darkCount
    } else {
      lineMinX = Math.min(lineMinX, rows[i].minX)
      lineMaxX = Math.max(lineMaxX, rows[i].maxX)
      totalDark += rows[i].darkCount
    }
    prevY = rows[i].y
  }
  lines.push({ y: lineStart, h: prevY - lineStart + 1, minX: lineMinX, maxX: lineMaxX, totalDark })
  return lines
}

test.describe('Text Position Alignment', () => {

  test('edited text should align with original PDF text (no old text visible)', async ({ page }) => {
    await uploadAndWaitForRender(page)

    // Capture text line positions BEFORE editing
    await page.screenshot({ path: 'e2e/screenshots/pos-align-01-before.png', fullPage: true })
    const beforeRows = await captureBlockPixels(page)
    const beforeLines = groupIntoLines(beforeRows)

    console.log(`Before edit: ${beforeLines.length} text lines`)
    for (const line of beforeLines.slice(0, 8)) {
      console.log(`  y=${line.y.toFixed(1)} h=${line.h.toFixed(1)} x=[${line.minX.toFixed(0)}-${line.maxX.toFixed(0)}]`)
    }

    // Double-click to enter edit mode on text
    const pos = await findTextPosition(page)
    expect(pos).not.toBeNull()
    await page.mouse.dblclick(pos!.clientX, pos!.clientY)
    await page.waitForTimeout(500)

    // Verify textarea appeared (edit mode entered)
    const textarea = page.locator('textarea')
    await expect(textarea).toBeAttached({ timeout: 3000 })

    // Capture text line positions AFTER entering edit mode
    await page.screenshot({ path: 'e2e/screenshots/pos-align-02-after-edit.png', fullPage: true })
    const afterRows = await captureBlockPixels(page)
    const afterLines = groupIntoLines(afterRows)

    console.log(`After edit: ${afterLines.length} text lines`)
    for (const line of afterLines.slice(0, 8)) {
      console.log(`  y=${line.y.toFixed(1)} h=${line.h.toFixed(1)} x=[${line.minX.toFixed(0)}-${line.maxX.toFixed(0)}]`)
    }

    // Compare text lines — edited text should closely match original position
    const linesToCompare = Math.min(5, beforeLines.length, afterLines.length)
    let maxShift = 0
    for (let i = 0; i < linesToCompare; i++) {
      const dy = Math.abs(beforeLines[i].y - afterLines[i].y)
      console.log(`Line ${i}: before y=${beforeLines[i].y.toFixed(1)}, after y=${afterLines[i].y.toFixed(1)}, dy=${dy.toFixed(1)}`)
      maxShift = Math.max(maxShift, dy)
      // Text should not shift more than 3px vertically (stricter than the 5px in existing test)
      expect(dy, `Line ${i} Y shift too large`).toBeLessThan(3)
    }
    console.log(`Max Y shift: ${maxShift.toFixed(1)}px`)
  })

  test('white overlay should fully cover original text (no residual pixels)', async ({ page }) => {
    await uploadAndWaitForRender(page)
    await page.waitForTimeout(500)

    // Get the editing block's bounding area from before edit
    const pos = await findTextPosition(page)
    expect(pos).not.toBeNull()

    // Find the approximate block region in the PDF (before editing)
    const beforeBlockInfo = await page.evaluate((clickPos) => {
      const canvas = document.querySelector('canvas')!
      const ctx = canvas.getContext('2d')!
      const rect = canvas.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      const w = canvas.width

      // Find the text block area around the click point
      const clickRow = Math.round((clickPos.clientY - rect.top) * dpr)
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data

      // Scan rows around the click to find the text block extent
      let blockTop = clickRow, blockBottom = clickRow
      for (let row = clickRow; row >= 0; row--) {
        let hasDark = false
        for (let col = 0; col < w; col += 2) {
          const idx = (row * w + col) * 4
          if (data[idx] < 80 && data[idx + 1] < 80 && data[idx + 2] < 80) {
            hasDark = true
            break
          }
        }
        if (!hasDark) { blockTop = row + 1; break }
      }
      for (let row = clickRow; row < canvas.height; row++) {
        let hasDark = false
        for (let col = 0; col < w; col += 2) {
          const idx = (row * w + col) * 4
          if (data[idx] < 80 && data[idx + 1] < 80 && data[idx + 2] < 80) {
            hasDark = true
            break
          }
        }
        if (!hasDark) { blockBottom = row - 1; break }
      }

      return {
        top: blockTop / dpr,
        bottom: blockBottom / dpr,
        height: (blockBottom - blockTop) / dpr,
      }
    }, pos)

    console.log('Block before edit:', beforeBlockInfo)

    // Double-click to enter edit mode
    await page.mouse.dblclick(pos!.clientX, pos!.clientY)
    await page.waitForTimeout(500)

    const textarea = page.locator('textarea')
    await expect(textarea).toBeAttached({ timeout: 3000 })

    // Type a character to trigger the white overlay + re-render
    // (overlay only activates after content is actually modified)
    await textarea.focus()
    await page.keyboard.type('X')
    await page.waitForTimeout(500)

    await page.screenshot({ path: 'e2e/screenshots/pos-align-03-overlay.png', fullPage: true })

    // Check for residual dark pixels in the overlay area that shouldn't be there.
    // The white overlay should fully hide original text. Any dark pixels in the
    // original text region that are NOT part of the re-rendered text indicate
    // incomplete coverage.
    const residualCheck = await page.evaluate((blockInfo) => {
      const canvas = document.querySelector('canvas')!
      const ctx = canvas.getContext('2d')!
      const w = canvas.width
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data
      const dpr = window.devicePixelRatio || 1

      // Check a band above the block (where original ascenders might peek)
      const checkAboveStart = Math.max(0, Math.round((blockInfo.top - 5) * dpr))
      const checkAboveEnd = Math.round(blockInfo.top * dpr)
      let residualAbove = 0
      for (let row = checkAboveStart; row < checkAboveEnd; row++) {
        for (let col = 0; col < w; col++) {
          const idx = (row * w + col) * 4
          if (data[idx] < 80 && data[idx + 1] < 80 && data[idx + 2] < 80) {
            residualAbove++
          }
        }
      }

      // Check a band below the block (where original descenders might peek)
      const checkBelowStart = Math.round(blockInfo.bottom * dpr)
      const checkBelowEnd = Math.min(canvas.height, Math.round((blockInfo.bottom + 5) * dpr))
      let residualBelow = 0
      for (let row = checkBelowStart; row < checkBelowEnd; row++) {
        for (let col = 0; col < w; col++) {
          const idx = (row * w + col) * 4
          if (data[idx] < 80 && data[idx + 1] < 80 && data[idx + 2] < 80) {
            residualBelow++
          }
        }
      }

      return { residualAbove, residualBelow }
    }, beforeBlockInfo)

    console.log('Residual pixels above block:', residualCheck.residualAbove)
    console.log('Residual pixels below block:', residualCheck.residualBelow)

    // There should be very few residual dark pixels from old text peeking through.
    // Allow tolerance for anti-aliased edges and adjacent (non-edited) text blocks
    // that happen to be within the 5px scan band.
    expect(residualCheck.residualAbove, 'Original text visible above overlay').toBeLessThan(100)
    expect(residualCheck.residualBelow, 'Original text visible below overlay').toBeLessThan(100)
  })
})
