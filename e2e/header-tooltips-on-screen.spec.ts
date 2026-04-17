import { test, expect } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

const EXAMPLE_PDF = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../example/example_en.pdf')

// Header tooltip triggers (aria-label on the button) and the tooltip text that should appear.
// Tooltip text is rendered UPPERCASE by the Tooltip component itself.
const TRIGGERS: Array<{ buttonLabel: string; tooltipText: string }> = [
  { buttonLabel: 'Back to home', tooltipText: 'BACK TO HOME' },
  { buttonLabel: 'Zoom out', tooltipText: 'ZOOM OUT' },
  { buttonLabel: 'Zoom in', tooltipText: 'ZOOM IN' },
  { buttonLabel: 'Mute SFX', tooltipText: 'MUTE SFX' },
]

test('header button tooltips render inside the viewport', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await page.locator('input[type="file"]').setInputFiles(EXAMPLE_PDF)

  // Wait for editor view to be ready (canvas has rendered content).
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
  await page.waitForTimeout(300)

  const viewport = page.viewportSize()!

  for (const { buttonLabel, tooltipText } of TRIGGERS) {
    const btn = page.getByRole('button', { name: buttonLabel })
    await btn.hover()
    // The tooltip renders via portal directly under <body> with fixed positioning.
    const tip = page.locator('body > div', { hasText: new RegExp(`^${tooltipText}$`) }).first()
    await expect(tip).toBeVisible({ timeout: 1000 })
    const box = await tip.boundingBox()
    expect(box, `tooltip box for "${tooltipText}"`).not.toBeNull()
    expect(box!.x, `tooltip "${tooltipText}" x`).toBeGreaterThanOrEqual(0)
    expect(box!.y, `tooltip "${tooltipText}" y`).toBeGreaterThanOrEqual(0)
    expect(box!.x + box!.width, `tooltip "${tooltipText}" right edge`).toBeLessThanOrEqual(viewport.width)
    expect(box!.y + box!.height, `tooltip "${tooltipText}" bottom edge`).toBeLessThanOrEqual(viewport.height)
    // Move mouse away so next hover triggers a fresh tooltip.
    await page.mouse.move(viewport.width / 2, viewport.height - 10)
    await expect(tip).toBeHidden({ timeout: 1000 })
  }
})
