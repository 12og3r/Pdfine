import { test, expect } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

const EXAMPLE_PDF = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../example/example_en.pdf')

test('editor view should not render the bottom Toolbar', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await page.locator('input[type="file"]').setInputFiles(EXAMPLE_PDF)
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

  // None of the Toolbar's tool buttons should be present
  for (const label of ['Select (V)', 'Edit Text (E)', 'Add Text (T)']) {
    const btn = page.getByRole('button', { name: label })
    expect(await btn.count(), `button "${label}" should not exist`).toBe(0)
  }

  // Page navigator chevrons should still be present
  expect(await page.locator('svg.lucide-chevron-right').count()).toBeGreaterThan(0)

  await page.screenshot({ path: 'e2e/screenshots/editor-no-toolbar.png' })
})
