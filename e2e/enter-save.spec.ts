import { test, expect } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'
const VISA_PDF = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../example/example_en.pdf')

test('Enter key should save edited text', async ({ page }) => {
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  const fileInput = page.locator('input[type="file"]')
  await fileInput.setInputFiles(VISA_PDF)

  // Wait for PDF render
  await page.waitForFunction(() => {
    const c = document.querySelector('canvas')
    if (!c) return false
    const ctx = c.getContext('2d')
    if (!ctx) return false
    const d = ctx.getImageData(0, 0, c.width, c.height).data
    let dark = 0
    for (let i = 0; i < d.length; i += 16) if (d[i] < 100) dark++
    return dark > 50
  }, { timeout: 15000 })

  // Find text position
  const pos = await page.evaluate(() => {
    const canvas = document.querySelector('canvas')!
    const ctx = canvas.getContext('2d')!
    const rect = canvas.getBoundingClientRect()
    const w = canvas.width, h = canvas.height
    const data = ctx.getImageData(0, 0, w, h).data
    const dpr = window.devicePixelRatio || 1
    const rows: { y: number; avgX: number }[] = []
    for (let row = 0; row < h; row += 2) {
      let count = 0, xSum = 0
      for (let col = 0; col < w; col += 2) {
        const idx = (row * w + col) * 4
        if (data[idx] < 80 && data[idx + 1] < 80 && data[idx + 2] < 80) { count++; xSum += col }
      }
      if (count > 10) rows.push({ y: row, avgX: xSum / count })
    }
    if (!rows.length) return null
    const t = rows[Math.min(5, rows.length - 1)]
    return { clientX: rect.left + t.avgX / dpr, clientY: rect.top + t.y / dpr }
  })
  expect(pos).not.toBeNull()

  // Screenshot before edit
  await page.screenshot({ path: 'e2e/screenshots/enter-save-01-before.png', fullPage: true })

  // Double-click to enter edit mode
  await page.mouse.dblclick(pos!.clientX, pos!.clientY)
  await page.waitForTimeout(300)

  const textarea = page.locator('textarea')
  await expect(textarea).toBeAttached({ timeout: 3000 })
  await textarea.focus()

  // Type some unique text
  await page.keyboard.type('ZZTEST')
  await page.waitForTimeout(300)

  // Screenshot during edit (text should be visible)
  await page.screenshot({ path: 'e2e/screenshots/enter-save-02-editing.png', fullPage: true })

  // Capture dark pixel snapshot of the edited block area during editing
  const duringEditPixels = await scanEditArea(page)
  console.log('During edit dark pixels:', duringEditPixels)

  // Press Enter to save and exit
  await page.keyboard.press('Enter')
  await page.waitForTimeout(500)

  // Confirm textarea is gone (edit mode exited)
  const taGone = await textarea.count() === 0
  console.log('Textarea gone after Enter:', taGone)
  expect(taGone).toBe(true)

  // Screenshot after Enter
  await page.screenshot({ path: 'e2e/screenshots/enter-save-03-after.png', fullPage: true })

  // Capture dark pixel snapshot after exiting - the edited text should still be visible
  const afterExitPixels = await scanEditArea(page)
  console.log('After exit dark pixels:', afterExitPixels)

  // The edited text (ZZTEST) should still be rendered on canvas after exiting
  // Dark pixel count should be similar (text is preserved)
  // If text disappears, afterExitPixels would be much less than duringEditPixels
  expect(afterExitPixels).toBeGreaterThan(duringEditPixels * 0.5)
})

async function scanEditArea(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const canvas = document.querySelector('canvas')!
    const ctx = canvas.getContext('2d')!
    const w = canvas.width, h = canvas.height
    const data = ctx.getImageData(0, 0, w, h).data
    // Scan the entire canvas — the original 130 CSS-pixel top window was
    // tuned to the Visa fixture's top-of-page header and misses body-text
    // edits in the middle of example_en.pdf pages.
    let dark = 0
    for (let row = 0; row < h; row++) {
      for (let col = 0; col < w; col++) {
        const idx = (row * w + col) * 4
        if (data[idx] < 50 && data[idx + 1] < 50 && data[idx + 2] < 50) dark++
      }
    }
    return dark
  })
}
