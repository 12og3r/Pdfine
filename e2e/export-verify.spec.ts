import { test, expect } from '@playwright/test'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const VISA_PDF = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../example/example_en.pdf')

test('exported PDF should contain edited text', async ({ page }) => {
  const logs: string[] = []
  page.on('console', msg => logs.push(`[${msg.type()}] ${msg.text()}`))

  await page.goto('/')
  await page.waitForLoadState('networkidle')
  const fileInput = page.locator('input[type="file"]')
  await fileInput.setInputFiles(VISA_PDF)
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

  // Find text and double-click
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

  await page.mouse.dblclick(pos!.clientX, pos!.clientY)
  await page.waitForTimeout(300)

  const textarea = page.locator('textarea')
  await expect(textarea).toBeAttached({ timeout: 3000 })
  await textarea.focus()

  // Type unique marker text
  await page.keyboard.type('XYZMARKER')
  await page.waitForTimeout(300)

  // Exit edit
  await page.keyboard.press('Enter')
  await page.waitForTimeout(500)

  // Accept any validation dialogs
  page.on('dialog', async d => {
    console.log('Dialog:', d.type(), d.message().substring(0, 200))
    await d.accept()
  })

  // Click export
  const exportBtn = page.locator('button:has-text("Export")')
  const downloadPromise = page.waitForEvent('download', { timeout: 30000 })
  await exportBtn.click()
  const download = await downloadPromise

  const filePath = await download.path()
  expect(filePath).toBeTruthy()

  // Copy to known location for inspection
  const outPath = path.resolve(__dirname, 'screenshots/exported.pdf')
  fs.copyFileSync(filePath!, outPath)
  console.log('Exported to:', outPath)
  const stat = fs.statSync(outPath)
  console.log('File size:', stat.size)

  // Verify the exported PDF actually contains the edited text. Earlier this
  // test used `exportSize > originalSize` as a proxy for "content was added",
  // but that heuristic is fragile: the per-run drawText redraw produces far
  // fewer content-stream ops than the old per-glyph path, so the export can
  // be smaller than the original even when the edit was applied correctly.
  // Parse the PDF with pdfjs (Node side) and assert the marker text is there.
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
  const data = new Uint8Array(fs.readFileSync(outPath))
  const pdfDoc = await pdfjs.getDocument({ data, isEvalSupported: false, useSystemFonts: false }).promise
  const allItems: string[] = []
  for (let i = 1; i <= pdfDoc.numPages; i++) {
    const pg = await pdfDoc.getPage(i)
    const content = await pg.getTextContent()
    for (const it of content.items as Array<{ str: string }>) allItems.push(it.str)
  }
  const joined = allItems.join('|')
  console.log('Exported text (first 500 chars):', joined.slice(0, 500))
  expect(joined, 'exported PDF should contain "XYZMARKER"').toContain('XYZMARKER')
})
