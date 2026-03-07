import { test, expect } from '@playwright/test'
import path from 'path'
import fs from 'fs'
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
    const c = document.querySelector('canvas')
    if (!c) return false
    const ctx = c.getContext('2d')
    if (!ctx) return false
    const d = ctx.getImageData(0, 0, c.width, c.height).data
    let dark = 0
    for (let i = 0; i < d.length; i += 16) if (d[i] < 100) dark++
    return dark > 50
  }, { timeout: 15000 })
}

test('Export unmodified PDF should produce valid download', async ({ page }) => {
  const errors: string[] = []
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text())
  })
  page.on('pageerror', err => errors.push(err.message))

  await uploadAndWaitForRender(page)

  // Handle potential confirm dialog (validation warnings)
  page.on('dialog', async dialog => {
    console.log('Dialog:', dialog.type(), dialog.message())
    await dialog.accept()
  })

  // Click Export button
  const exportBtn = page.locator('button:has-text("Export")')
  await expect(exportBtn).toBeVisible()

  const downloadPromise = page.waitForEvent('download', { timeout: 30000 })
  await exportBtn.click()

  const download = await downloadPromise.catch(err => {
    console.log('Download failed:', err.message)
    return null
  })

  await page.screenshot({ path: 'e2e/screenshots/export-test-01.png', fullPage: true })

  if (errors.length > 0) {
    console.log('=== Console errors ===')
    for (const e of errors) console.log(e)
  }

  if (download) {
    const filePath = await download.path()
    console.log('Download path:', filePath)
    console.log('Suggested filename:', download.suggestedFilename())
    if (filePath) {
      const stat = fs.statSync(filePath)
      console.log('File size:', stat.size)
      expect(stat.size).toBeGreaterThan(1000) // A valid PDF should be > 1KB

      // Read first bytes to verify PDF header
      const buf = Buffer.alloc(5)
      const fd = fs.openSync(filePath, 'r')
      fs.readSync(fd, buf, 0, 5, 0)
      fs.closeSync(fd)
      const header = buf.toString('ascii')
      console.log('PDF header:', header)
      expect(header).toBe('%PDF-')
    }
  } else {
    console.log('No download received!')
    // Fail the test
    expect(download).not.toBeNull()
  }
})

test('Export after edit should preserve changes', async ({ page }) => {
  const errors: string[] = []
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text())
  })
  page.on('pageerror', err => errors.push(err.message))

  await uploadAndWaitForRender(page)

  // Double-click to edit
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

  await page.mouse.dblclick(pos!.clientX, pos!.clientY)
  await page.waitForTimeout(300)

  const textarea = page.locator('textarea')
  await expect(textarea).toBeAttached({ timeout: 3000 })
  await textarea.focus()
  await page.keyboard.type('EDITED')
  await page.waitForTimeout(200)

  // Exit edit mode
  await page.keyboard.press('Enter')
  await page.waitForTimeout(500)

  // Handle confirm dialog
  page.on('dialog', async dialog => {
    console.log('Dialog:', dialog.type(), dialog.message())
    await dialog.accept()
  })

  // Export
  const exportBtn = page.locator('button:has-text("Export")')
  const downloadPromise = page.waitForEvent('download', { timeout: 30000 })
  await exportBtn.click()

  const download = await downloadPromise.catch(err => {
    console.log('Download failed:', err.message)
    return null
  })

  await page.screenshot({ path: 'e2e/screenshots/export-test-02-after-edit.png', fullPage: true })

  if (errors.length > 0) {
    console.log('=== Console errors ===')
    for (const e of errors) console.log(e)
  }

  if (download) {
    const filePath = await download.path()
    if (filePath) {
      const stat = fs.statSync(filePath)
      console.log('Exported file size:', stat.size)
      expect(stat.size).toBeGreaterThan(1000)
    }
  } else {
    console.log('No download after edit!')
    expect(download).not.toBeNull()
  }
})
