import { test, expect } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

const EXAMPLE_PDF = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../example/example_en.pdf')

async function uploadAndWaitForRender(page: import('@playwright/test').Page) {
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  const fileInput = page.locator('input[type="file"]')
  await fileInput.setInputFiles(EXAMPLE_PDF)
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
}

test('edit Sample PDF title then export', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', e => errors.push(`[pageerror] ${e.message}\n${e.stack}`))
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(`[console.error] ${msg.text()}`)
  })

  await page.setViewportSize({ width: 1600, height: 1200 })
  await uploadAndWaitForRender(page)

  // Double-click on Sample PDF title
  const click = await page.evaluate(() => {
    const core = (window as unknown as { __EDITOR_CORE__: unknown }).__EDITOR_CORE__ as unknown as {
      getDocument: () => { pages: Array<{ elements: unknown[] }> }
      getCurrentPage: () => number
      getRenderEngine: () => { getPageOffset(): { x: number; y: number } }
    }
    const doc = core.getDocument()
    const pg = doc.pages[core.getCurrentPage()]
    const canvas = document.querySelector('canvas')!
    const rect = canvas.getBoundingClientRect()
    const offset = core.getRenderEngine().getPageOffset()
    for (const el of pg.elements as Array<Record<string, unknown>>) {
      if (el.type !== 'text') continue
      const block = el as unknown as {
        bounds: { x: number; y: number; width: number; height: number }
        paragraphs: Array<{ runs: Array<{ text: string }> }>
      }
      const text = block.paragraphs.map(p => p.runs.map(r => r.text).join('')).join('|')
      if (!text.includes('Sample')) continue
      return {
        x: rect.left + offset.x + block.bounds.x + 50,
        y: rect.top + offset.y + block.bounds.y + 20,
      }
    }
    return null
  })
  expect(click).not.toBeNull()

  await page.mouse.dblclick(click!.x, click!.y)
  await page.waitForTimeout(400)
  await expect(page.locator('textarea')).toBeAttached({ timeout: 3000 })

  // Repro: change "Sample" -> "Semple" and press Enter.
  // Use the EditEngine directly so the change is deterministic regardless of
  // how the hidden textarea routes key events in headless Chromium.
  await page.evaluate(() => {
    const core = (window as unknown as { __EDITOR_CORE__: unknown }).__EDITOR_CORE__ as unknown as {
      getDocument: () => { pages: Array<{ elements: unknown[] }> }
      getCurrentPage: () => number
      getEditEngine: () => {
        getCursorManager: () => { setCursor(pi: number, bid: string, off: number): void }
        getSelectionManager: () => { setSelection(pi: number, bid: string, s: number, e: number): void }
        insertText(t: string): void
        exitEditMode(): void
        getEditingBlockId(): string | null
      }
    }
    const ee = core.getEditEngine()
    const blockId = ee.getEditingBlockId()!
    // Sample PDF — "Sample" occupies offsets 0..6. Replace 'a' (offset 1..2) with 'e'.
    ee.getSelectionManager().setSelection(0, blockId, 1, 2)
    ee.getCursorManager().setCursor(0, blockId, 2)
    ee.insertText('e')
    ee.exitEditMode()
  })
  await page.waitForTimeout(400)

  // Verify text changed — the Sample block text now contains "Semple"
  const afterText = await page.evaluate(() => {
    const core = (window as unknown as { __EDITOR_CORE__: unknown }).__EDITOR_CORE__ as unknown as {
      getDocument: () => { pages: Array<{ elements: unknown[] }> }
      getCurrentPage: () => number
    }
    const doc = core.getDocument()
    const pg = doc.pages[core.getCurrentPage()]
    for (const el of pg.elements as Array<Record<string, unknown>>) {
      if (el.type !== 'text') continue
      const block = el as unknown as {
        paragraphs: Array<{ runs: Array<{ text: string }> }>
      }
      const text = block.paragraphs.map(p => p.runs.map(r => r.text).join('')).join('|')
      if (text.includes('emple')) return text
    }
    return null
  })
  console.log('After edit, block text:', JSON.stringify(afterText))
  expect(afterText, 'block text must contain "Semple"').toContain('Semple')

  // Click the Export button
  const exportBtn = page.getByRole('button', { name: /export/i })
  await expect(exportBtn).toBeVisible()

  // Capture download
  const downloadPromise = page.waitForEvent('download', { timeout: 5000 }).catch(() => null)
  await exportBtn.click()
  await page.waitForTimeout(800)

  const download = await downloadPromise

  console.log('Collected errors:\n' + errors.join('\n'))
  console.log('Download triggered:', !!download)
  if (download) {
    console.log('Download filename:', download.suggestedFilename())
  }

  expect(errors, `errors: ${errors.join(' | ')}`).toEqual([])
  expect(download, 'export should produce a download').not.toBeNull()
})
