import { test, expect } from '@playwright/test'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const EXAMPLE_PDF = path.resolve(__dirname, '../example/example_en.pdf')

test('dump canvas native bitmap after ipsum→Apsum edit', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 1200 })
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await page.locator('input[type="file"]').setInputFiles(EXAMPLE_PDF)
  await page.waitForFunction(() => {
    const c = document.querySelector('canvas')
    if (!c) return false
    const ctx = c.getContext('2d')!
    const data = ctx.getImageData(0, 0, c.width, c.height).data
    let dark = 0
    for (let i = 0; i < data.length; i += 16) if (data[i] < 100) dark++
    return dark > 50
  }, { timeout: 15000 })
  await page.waitForTimeout(400)

  const beforePng = await page.evaluate(() => {
    const c = document.querySelector('canvas')!
    return c.toDataURL('image/png')
  })
  fs.writeFileSync(
    path.resolve(__dirname, 'screenshots/apsum-canvas-before.png'),
    Buffer.from(beforePng.split(',')[1], 'base64'),
  )

  await page.evaluate(() => {
    const core = (window as unknown as { __EDITOR_CORE__: unknown }).__EDITOR_CORE__ as unknown as {
      getDocument: () => { pages: Array<{ elements: unknown[] }> }
      getCurrentPage: () => number
      getEditEngine: () => {
        enterEditMode: (blockId: string) => void
        getCursorManager: () => { setCursor(pi: number, bid: string, off: number): void }
        getSelectionManager: () => { setSelection(pi: number, bid: string, s: number, e: number): void }
        insertText(t: string): void
        exitEditMode(): void
      }
    }
    const doc = core.getDocument()
    const pg = doc.pages[core.getCurrentPage()]
    for (const el of pg.elements as Array<Record<string, unknown>>) {
      if (el.type !== 'text') continue
      const tb = el as unknown as { id: string; paragraphs: Array<{ runs: Array<{ text: string }> }> }
      const text = tb.paragraphs.map(p => p.runs.map(r => r.text).join('')).join('')
      if (!text.includes('Lorem ipsum')) continue
      const paraText = tb.paragraphs[0].runs.map(r => r.text).join('')
      const ipsumIdx = paraText.indexOf('ipsum')
      const ee = core.getEditEngine()
      ee.enterEditMode(tb.id)
      ee.getSelectionManager().setSelection(0, tb.id, ipsumIdx, ipsumIdx + 5)
      ee.getCursorManager().setCursor(0, tb.id, ipsumIdx + 5)
      ee.insertText('Apsum')
      ee.exitEditMode()
      break
    }
  })
  await page.waitForTimeout(600)

  const afterPng = await page.evaluate(() => {
    const c = document.querySelector('canvas')!
    return c.toDataURL('image/png')
  })
  fs.writeFileSync(
    path.resolve(__dirname, 'screenshots/apsum-canvas-after.png'),
    Buffer.from(afterPng.split(',')[1], 'base64'),
  )

  const canvasSize = await page.evaluate(() => {
    const c = document.querySelector('canvas')!
    return { w: c.width, h: c.height }
  })
  console.log('Canvas native size:', canvasSize)
  expect(canvasSize.w).toBeGreaterThan(0)
})
