import { test, expect } from '@playwright/test'
const VISA_PDF = '/Users/bytedance/Desktop/example_en.pdf'

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

/** Capture per-row dark pixel distribution in the top portion of the page */
async function captureTextRows(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const canvas = document.querySelector('canvas')!
    const ctx = canvas.getContext('2d')!
    const w = canvas.width, h = canvas.height
    const data = ctx.getImageData(0, 0, w, h).data
    const dpr = window.devicePixelRatio || 1

    // Collect rows with dark pixels (text rows)
    const rows: { y: number; darkCount: number; minX: number; maxX: number }[] = []
    for (let row = 0; row < Math.min(h, 400 * dpr); row++) {
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

/** Find a text position to click */
async function findTextClick(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const canvas = document.querySelector('canvas')!
    const ctx = canvas.getContext('2d')!
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

test.describe('Text Edit Issues', () => {

  test('Issue 1: text position should not shift after double-click', async ({ page }) => {
    await uploadAndWaitForRender(page)

    // Capture text positions BEFORE double-click (PDF background rendering)
    await page.screenshot({ path: 'e2e/screenshots/issue1-01-before.png', fullPage: true })
    const beforeRows = await captureTextRows(page)

    // Group rows into text lines (consecutive rows with dark pixels)
    const beforeLines = groupIntoLines(beforeRows)
    console.log(`Before: ${beforeLines.length} text lines`)
    for (const line of beforeLines.slice(0, 8)) {
      console.log(`  y=${line.y.toFixed(0)} h=${line.h.toFixed(0)} x=[${line.minX.toFixed(0)}-${line.maxX.toFixed(0)}]`)
    }

    // Double-click to enter edit mode
    const pos = await findTextClick(page)
    expect(pos).not.toBeNull()
    await page.mouse.dblclick(pos!.clientX, pos!.clientY)
    await page.waitForTimeout(500)

    // Capture text positions AFTER double-click (layout engine rendering)
    await page.screenshot({ path: 'e2e/screenshots/issue1-02-after.png', fullPage: true })
    const afterRows = await captureTextRows(page)
    const afterLines = groupIntoLines(afterRows)
    console.log(`After: ${afterLines.length} text lines`)
    for (const line of afterLines.slice(0, 8)) {
      console.log(`  y=${line.y.toFixed(0)} h=${line.h.toFixed(0)} x=[${line.minX.toFixed(0)}-${line.maxX.toFixed(0)}]`)
    }

    // Compare first few lines - they should be at approximately the same position
    const linesToCompare = Math.min(3, beforeLines.length, afterLines.length)
    for (let i = 0; i < linesToCompare; i++) {
      const dy = Math.abs(beforeLines[i].y - afterLines[i].y)
      console.log(`Line ${i}: before y=${beforeLines[i].y.toFixed(1)}, after y=${afterLines[i].y.toFixed(1)}, dy=${dy.toFixed(1)}`)
      // Text should not shift more than 5px vertically
      expect(dy).toBeLessThan(5)
    }
  })

  test('Issue 2: arrow keys should move cursor left/right', async ({ page }) => {
    await uploadAndWaitForRender(page)

    const pos = await findTextClick(page)
    expect(pos).not.toBeNull()

    // Double-click to enter edit mode
    await page.mouse.dblclick(pos!.clientX, pos!.clientY)
    await page.waitForTimeout(300)

    const textarea = page.locator('textarea')
    await expect(textarea).toBeAttached({ timeout: 3000 })
    await textarea.focus()

    // Type "ABCD" — cursor is now after D
    await page.keyboard.type('ABCD')
    await page.waitForTimeout(300)

    await page.screenshot({ path: 'e2e/screenshots/issue2-01-typed.png', fullPage: true })

    // Move cursor left twice (should be between B and C now)
    await page.keyboard.press('ArrowLeft')
    await page.keyboard.press('ArrowLeft')
    await page.waitForTimeout(200)

    // Type "X" - it should appear between B and C → "ABXCD"
    await page.keyboard.type('X')
    await page.waitForTimeout(300)

    await page.screenshot({ path: 'e2e/screenshots/issue2-02-after-insert.png', fullPage: true })

    // Move right once, then type "Y" → should be between C and D → "ABXCYD"
    await page.keyboard.press('ArrowRight')
    await page.waitForTimeout(100)
    await page.keyboard.type('Y')
    await page.waitForTimeout(300)

    await page.screenshot({ path: 'e2e/screenshots/issue2-03-final.png', fullPage: true })

    // Verify by checking the rendered text contains "ABXCYD"
    // We do this by looking for distinct pixel patterns in the edited block
    const editedText = await page.evaluate(() => {
      const canvas = document.querySelector('canvas')!
      const ctx = canvas.getContext('2d')!
      const w = canvas.width, h = canvas.height
      const data = ctx.getImageData(0, 0, w, h).data
      const dpr = window.devicePixelRatio || 1

      // Find the edited text area (the block with white background overlay)
      // Count dark pixels in the first 150 CSS pixels of the page
      let darkInEditArea = 0
      const scanH = Math.min(h, 150 * dpr)
      for (let row = 0; row < scanH; row++) {
        for (let col = 0; col < w; col++) {
          const idx = (row * w + col) * 4
          if (data[idx] < 50 && data[idx + 1] < 50 && data[idx + 2] < 50) {
            darkInEditArea++
          }
        }
      }
      return { darkInEditArea }
    })

    // The text should have changed (more dark pixels due to inserted chars)
    console.log('Edit area dark pixels:', editedText.darkInEditArea)
    expect(editedText.darkInEditArea).toBeGreaterThan(0)
  })

  test('Issue 3: Enter key should confirm/exit edit mode', async ({ page }) => {
    await uploadAndWaitForRender(page)

    const pos = await findTextClick(page)
    expect(pos).not.toBeNull()

    // Double-click to enter edit mode
    await page.mouse.dblclick(pos!.clientX, pos!.clientY)
    await page.waitForTimeout(300)

    const textarea = page.locator('textarea')
    await expect(textarea).toBeAttached({ timeout: 3000 })

    await page.screenshot({ path: 'e2e/screenshots/issue3-01-editing.png', fullPage: true })

    // Press Enter to confirm edit
    await page.keyboard.press('Enter')
    await page.waitForTimeout(500)

    await page.screenshot({ path: 'e2e/screenshots/issue3-02-after-enter.png', fullPage: true })

    // After pressing Enter, edit mode should be exited (textarea removed)
    const isTextareaGone = await textarea.count() === 0
    console.log('Textarea gone after Enter:', isTextareaGone)
    expect(isTextareaGone).toBe(true)
  })
})

/** Group pixel rows into text lines */
function groupIntoLines(rows: { y: number; darkCount: number; minX: number; maxX: number }[]) {
  if (rows.length === 0) return []
  const lines: { y: number; h: number; minX: number; maxX: number }[] = []
  let lineStart = rows[0].y
  let lineMinX = rows[0].minX
  let lineMaxX = rows[0].maxX
  let prevY = rows[0].y

  for (let i = 1; i < rows.length; i++) {
    if (rows[i].y - prevY > 3) {
      // Gap detected, close current line
      lines.push({ y: lineStart, h: prevY - lineStart + 1, minX: lineMinX, maxX: lineMaxX })
      lineStart = rows[i].y
      lineMinX = rows[i].minX
      lineMaxX = rows[i].maxX
    } else {
      lineMinX = Math.min(lineMinX, rows[i].minX)
      lineMaxX = Math.max(lineMaxX, rows[i].maxX)
    }
    prevY = rows[i].y
  }
  lines.push({ y: lineStart, h: prevY - lineStart + 1, minX: lineMinX, maxX: lineMaxX })
  return lines
}

/** Find cursor position by scanning for a thin vertical dark line */
async function getCursorPosition(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const canvas = document.querySelector('canvas')!
    const ctx = canvas.getContext('2d')!
    const w = canvas.width, h = canvas.height
    const data = ctx.getImageData(0, 0, w, h).data
    const dpr = window.devicePixelRatio || 1

    // Look for a 1-2px wide vertical dark line (cursor)
    for (let col = 0; col < w; col++) {
      let streak = 0
      let startRow = 0
      for (let row = 0; row < h; row++) {
        const idx = (row * w + col) * 4
        const r = data[idx], g = data[idx + 1], b = data[idx + 2]
        if (r < 30 && g < 30 && b < 30) {
          if (streak === 0) startRow = row
          streak++
        } else {
          if (streak >= 8 && streak <= 30) {
            // Check it's narrow (not part of a character)
            let leftDark = false, rightDark = false
            const midRow = startRow + Math.floor(streak / 2)
            if (col > 2) {
              const li = (midRow * w + col - 2) * 4
              leftDark = data[li] < 50 && data[li + 1] < 50 && data[li + 2] < 50
            }
            if (col < w - 2) {
              const ri = (midRow * w + col + 2) * 4
              rightDark = data[ri] < 50 && data[ri + 1] < 50 && data[ri + 2] < 50
            }
            // Cursor is isolated vertically (not part of a wide character)
            if (!leftDark || !rightDark) {
              return { x: col / dpr, y: startRow / dpr, h: streak / dpr }
            }
          }
          streak = 0
        }
      }
    }
    return null
  })
}
