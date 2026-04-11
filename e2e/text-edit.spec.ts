import { test, expect } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'
const VISA_PDF = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../example/example_en.pdf')

async function uploadAndWaitForRender(page: import('@playwright/test').Page) {
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  const fileInput = page.locator('input[type="file"]')
  await fileInput.setInputFiles(VISA_PDF)

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

    // Find rows with dark pixels (text)
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

    // Pick a text row (5th row of text, should be in a content area)
    const target = textRows[Math.min(5, textRows.length - 1)]
    return {
      clientX: rect.left + target.avgX / dpr,
      clientY: rect.top + target.y / dpr,
      textRowCount: textRows.length,
    }
  })
}

test.describe('Text Editing', () => {
  test('double-click text, type, and verify edit appears on canvas', async ({ page }) => {
    await uploadAndWaitForRender(page)
    await page.screenshot({ path: 'e2e/screenshots/edit-01-loaded.png', fullPage: true })

    const pos = await findTextPosition(page)
    expect(pos).not.toBeNull()
    expect(pos!.textRowCount).toBeGreaterThan(0)

    // Double-click to enter edit mode
    await page.mouse.dblclick(pos!.clientX, pos!.clientY)
    await page.waitForTimeout(300)

    // Verify textarea appeared (edit mode entered)
    const textarea = page.locator('textarea')
    await expect(textarea).toBeAttached({ timeout: 3000 })

    await page.screenshot({ path: 'e2e/screenshots/edit-02-editmode.png', fullPage: true })

    // Capture canvas state before typing
    const beforePixels = await page.evaluate(() => {
      const canvas = document.querySelector('canvas')!
      const ctx = canvas.getContext('2d')!
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data
      let dark = 0
      for (let i = 0; i < data.length; i += 4) {
        if (data[i] < 50 && data[i + 1] < 50 && data[i + 2] < 50) dark++
      }
      return dark
    })

    // Type text
    await textarea.focus()
    await page.keyboard.type('TEST123')
    await page.waitForTimeout(500)

    await page.screenshot({ path: 'e2e/screenshots/edit-03-typed.png', fullPage: true })

    // Verify canvas changed after typing
    const afterPixels = await page.evaluate(() => {
      const canvas = document.querySelector('canvas')!
      const ctx = canvas.getContext('2d')!
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data
      let dark = 0
      for (let i = 0; i < data.length; i += 4) {
        if (data[i] < 50 && data[i + 1] < 50 && data[i + 2] < 50) dark++
      }
      return dark
    })

    console.log(`Dark pixels: before=${beforePixels}, after=${afterPixels}`)
    // Typing should change the number of dark pixels (text changed)
    expect(afterPixels).not.toBe(beforePixels)

    // Press Escape to exit edit mode
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)

    // Textarea should be gone
    await expect(textarea).not.toBeAttached({ timeout: 2000 })

    await page.screenshot({ path: 'e2e/screenshots/edit-04-exited.png', fullPage: true })
  })
})
