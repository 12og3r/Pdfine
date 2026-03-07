import { test, expect } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const VISA_PDF = path.resolve(__dirname, '../Visa.pdf')

test.describe('PDF Rendering', () => {
  test('upload and render Visa.pdf with console diagnostics', async ({ page }) => {
    // Capture ALL console messages
    const consoleMessages: { type: string; text: string }[] = []
    page.on('console', msg => {
      consoleMessages.push({ type: msg.type(), text: msg.text() })
    })
    page.on('pageerror', err => {
      consoleMessages.push({ type: 'pageerror', text: err.message })
    })

    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Upload the PDF
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(VISA_PDF)

    // Wait for canvas
    await page.waitForFunction(() => document.querySelector('canvas') !== null, { timeout: 15000 })

    // Wait for async rendering
    await page.waitForTimeout(5000)

    // Print console messages
    console.log('=== Browser Console Messages ===')
    for (const msg of consoleMessages) {
      console.log(`  [${msg.type}] ${msg.text}`)
    }
    console.log('=== End Console Messages ===')

    // Take screenshot
    await page.screenshot({ path: 'e2e/screenshots/pdf-debug.png', fullPage: true })

    // Analyze canvas
    const analysis = await page.evaluate(() => {
      const canvas = document.querySelector('canvas')
      if (!canvas) return { error: 'no canvas' }
      const ctx = canvas.getContext('2d')
      if (!ctx) return { error: 'no context' }

      const w = canvas.width
      const h = canvas.height
      const imageData = ctx.getImageData(0, 0, w, h)
      const data = imageData.data

      let totalPixels = w * h
      let whitePixels = 0
      let darkPixels = 0
      let colorPixels = 0

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i + 1], b = data[i + 2]
        if (r > 250 && g > 250 && b > 250) whitePixels++
        else if (r < 50 && g < 50 && b < 50) darkPixels++
        else if (!(r > 220 && g > 225 && b > 230)) colorPixels++ // skip gray bg
      }

      return {
        canvasSize: `${w}x${h}`,
        totalPixels,
        whitePercent: (whitePixels / totalPixels * 100).toFixed(1),
        darkPercent: (darkPixels / totalPixels * 100).toFixed(1),
        colorPercent: (colorPixels / totalPixels * 100).toFixed(1),
        darkPixels,
        colorPixels,
      }
    })

    console.log('Canvas analysis:', JSON.stringify(analysis, null, 2))

    // Check for errors related to PDF rendering
    const errors = consoleMessages.filter(m => m.type === 'error' || m.type === 'pageerror')
    const warnings = consoleMessages.filter(m => m.type === 'warning')
    console.log(`Errors: ${errors.length}, Warnings: ${warnings.length}`)

    // The PDF should have rendered - check for dark pixels (text)
    expect(analysis).not.toHaveProperty('error')
    if ('darkPixels' in analysis) {
      expect(analysis.darkPixels + analysis.colorPixels).toBeGreaterThan(100)
    }
  })
})
