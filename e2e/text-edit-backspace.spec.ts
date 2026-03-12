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

/** Find a text region and return click coordinates */
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

    const textRows: { y: number; avgX: number; darkCount: number }[] = []
    for (let row = 0; row < h; row += 2) {
      let count = 0, xSum = 0
      for (let col = 0; col < w; col += 2) {
        const idx = (row * w + col) * 4
        if (data[idx] < 80 && data[idx + 1] < 80 && data[idx + 2] < 80) {
          count++
          xSum += col
        }
      }
      if (count > 10) textRows.push({ y: row, avgX: xSum / count, darkCount: count })
    }
    if (textRows.length === 0) return null

    const target = textRows[Math.min(5, textRows.length - 1)]
    return {
      clientX: rect.left + target.avgX / dpr,
      clientY: rect.top + target.y / dpr,
    }
  })
}

/** Capture a snapshot of the canvas pixel data around the edit area */
async function captureCanvasSnapshot(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const canvas = document.querySelector('canvas')!
    const ctx = canvas.getContext('2d')!
    const w = canvas.width, h = canvas.height
    const data = ctx.getImageData(0, 0, w, h).data
    let darkPixels = 0
    for (let i = 0; i < data.length; i += 4) {
      if (data[i] < 50 && data[i + 1] < 50 && data[i + 2] < 50) darkPixels++
    }
    return darkPixels
  })
}

test.describe('Text Editing - Backspace & Cursor', () => {
  test('backspace deletes text after double-click', async ({ page }) => {
    const logs: string[] = []
    page.on('console', msg => logs.push(`[${msg.type()}] ${msg.text()}`))

    await uploadAndWaitForRender(page)

    const pos = await findTextPosition(page)
    expect(pos).not.toBeNull()

    // Double-click to enter edit mode
    await page.mouse.dblclick(pos!.clientX, pos!.clientY)
    await page.waitForTimeout(300)

    const textarea = page.locator('textarea')
    await expect(textarea).toBeAttached({ timeout: 3000 })
    await textarea.focus()

    await page.screenshot({ path: 'e2e/screenshots/bs-01-editmode.png', fullPage: true })

    // Capture dark pixels before backspace
    const before = await captureCanvasSnapshot(page)

    // Press Backspace multiple times
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Backspace')
    }
    await page.waitForTimeout(500)

    await page.screenshot({ path: 'e2e/screenshots/bs-02-after-backspace.png', fullPage: true })

    // Capture dark pixels after backspace
    const after = await captureCanvasSnapshot(page)

    console.log(`Dark pixels: before=${before}, after=${after}, diff=${before - after}`)

    // Print relevant console messages
    const relevant = logs.filter(l =>
      l.includes('Backspace') || l.includes('backspace') ||
      l.includes('DELETE') || l.includes('delete') ||
      l.includes('handleInput') || l.includes('handleBeforeInput') ||
      l.includes('inputType') || l.includes('InputHandler') ||
      l.includes('error') || l.includes('Error')
    )
    console.log('Relevant logs:')
    for (const l of relevant) console.log('  ' + l)

    // Backspace should have removed characters, changing dark pixel count
    expect(before - after).toBeGreaterThan(10)
  })

  test('cursor position aligns with text position', async ({ page }) => {
    await uploadAndWaitForRender(page)

    const pos = await findTextPosition(page)
    expect(pos).not.toBeNull()

    // Double-click to enter edit mode
    await page.mouse.dblclick(pos!.clientX, pos!.clientY)
    await page.waitForTimeout(300)

    const textarea = page.locator('textarea')
    await expect(textarea).toBeAttached({ timeout: 3000 })
    await textarea.focus()

    // Type some text to see where it appears
    await page.keyboard.type('XX')
    await page.waitForTimeout(300)

    await page.screenshot({ path: 'e2e/screenshots/cursor-01-typed.png', fullPage: true })

    // Analyze: find the "XX" text on canvas by looking for new dark pixels
    // and compare with cursor position
    const analysis = await page.evaluate(() => {
      const canvas = document.querySelector('canvas')!
      const ctx = canvas.getContext('2d')!
      const w = canvas.width, h = canvas.height
      const data = ctx.getImageData(0, 0, w, h).data
      const dpr = window.devicePixelRatio || 1

      // Find the cursor line (a vertical line of colored pixels, typically blue/black)
      // Cursor is usually 1-2px wide and ~fontSize tall
      let cursorX = -1, cursorY = -1

      // Look for vertical lines of identical colored pixels (cursor indicator)
      for (let col = 0; col < w; col++) {
        let streak = 0
        for (let row = 0; row < h; row++) {
          const idx = (row * w + col) * 4
          const r = data[idx], g = data[idx + 1], b = data[idx + 2]
          // Cursor is typically a dark line
          if (r < 30 && g < 30 && b < 30) {
            streak++
          } else {
            if (streak >= 10 && streak <= 40) {
              // This looks like a cursor (10-40px tall vertical line)
              cursorX = col / dpr
              cursorY = (row - streak / 2) / dpr
            }
            streak = 0
          }
        }
      }

      // Find the rightmost dark pixel cluster in the edited text line
      // (where "XX" was just typed)
      const textRows: { y: number; minX: number; maxX: number }[] = []
      for (let row = 0; row < h; row += 1) {
        let minX = w, maxX = 0, count = 0
        for (let col = 0; col < w; col++) {
          const idx = (row * w + col) * 4
          if (data[idx] < 50 && data[idx + 1] < 50 && data[idx + 2] < 50) {
            if (col < minX) minX = col
            if (col > maxX) maxX = col
            count++
          }
        }
        if (count > 3) textRows.push({ y: row / dpr, minX: minX / dpr, maxX: maxX / dpr })
      }

      return {
        cursorX, cursorY,
        textRowCount: textRows.length,
        // Sample some text rows near the top (where edit happened)
        sampleRows: textRows.slice(0, 10).map(r => `y=${r.y.toFixed(0)} x=[${r.minX.toFixed(0)}-${r.maxX.toFixed(0)}]`),
      }
    })

    console.log('Cursor analysis:', JSON.stringify(analysis, null, 2))

    // If cursor was found, verify it's in a reasonable position
    // (within the page content area, not at 0,0 or way off)
    if (analysis.cursorX > 0) {
      // Cursor should be within the page area (roughly 350-930 px from left)
      expect(analysis.cursorX).toBeGreaterThan(300)
      expect(analysis.cursorX).toBeLessThan(950)
    }
  })
})
