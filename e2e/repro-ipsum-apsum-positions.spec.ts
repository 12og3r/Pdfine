import { test, expect } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const EXAMPLE_PDF = path.resolve(__dirname, '../example/example_en.pdf')

test('inspect glyph x positions before & after ipsum→Apsum edit', async ({ page }) => {
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

  async function snapshot() {
    return await page.evaluate(() => {
      const core = (window as unknown as { __EDITOR_CORE__: unknown }).__EDITOR_CORE__ as unknown as {
        getDocument: () => { pages: Array<{ elements: unknown[] }> }
        getCurrentPage: () => number
      }
      const doc = core.getDocument()
      const pg = doc.pages[core.getCurrentPage()]
      for (const el of pg.elements as Array<Record<string, unknown>>) {
        if (el.type !== 'text') continue
        const tb = el as unknown as {
          id: string
          bounds: { x: number; y: number; width: number; height: number }
          paragraphs: Array<{
            alignment: string
            runs: Array<{ text: string }>
            lines?: Array<{ glyphs: Array<{ x: number; char: string; width: number }> }>
          }>
        }
        const text = tb.paragraphs.map(p => p.runs.map(r => r.text).join('')).join('')
        if (!text.includes('Lorem ipsum') && !text.includes('Lorem Apsum')) continue
        const line0 = tb.paragraphs[0].lines?.[0]
        if (!line0) return null
        return {
          blockId: tb.id,
          alignment: tb.paragraphs[0].alignment,
          boundsWidth: tb.bounds.width,
          glyphs: line0.glyphs.map(g => ({
            char: g.char,
            x: Math.round(g.x * 100) / 100,
            width: Math.round(g.width * 100) / 100,
          })),
        }
      }
      return null
    })
  }

  const before = await snapshot()
  console.log('BEFORE alignment:', before?.alignment, 'boundsWidth:', before?.boundsWidth)
  console.log('BEFORE glyph positions (first 30):')
  before?.glyphs.slice(0, 30).forEach((g, i) => console.log(`  ${i}: '${g.char}' x=${g.x} w=${g.width}`))

  // Trigger the edit
  await page.evaluate((blockId) => {
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
    const el = (pg.elements as Array<Record<string, unknown>>).find(e => (e as { id: string }).id === blockId) as unknown as {
      paragraphs: Array<{ runs: Array<{ text: string }> }>
    }
    const paraText = el.paragraphs[0].runs.map(r => r.text).join('')
    const ipsumIdx = paraText.indexOf('ipsum')
    const ee = core.getEditEngine()
    ee.enterEditMode(blockId)
    ee.getSelectionManager().setSelection(0, blockId, ipsumIdx, ipsumIdx + 5)
    ee.getCursorManager().setCursor(0, blockId, ipsumIdx + 5)
    ee.insertText('Apsum')
    ee.exitEditMode()
  }, before!.blockId)
  await page.waitForTimeout(400)

  const after = await snapshot()
  console.log('AFTER alignment:', after?.alignment, 'boundsWidth:', after?.boundsWidth)
  console.log('AFTER glyph positions (first 50):')
  after?.glyphs.slice(0, 50).forEach((g, i) => console.log(`  ${i}: '${g.char}' x=${g.x} w=${g.width}`))

  // Diff adjacent-glyph x deltas (how much each successive glyph advances).
  // A justify-induced gap will show up as a wider-than-expected delta on spaces.
  console.log('\nAFTER deltas (x[i+1] - x[i]) when char is space:')
  for (let i = 0; i < (after?.glyphs.length ?? 0) - 1; i++) {
    const g = after!.glyphs[i]
    const next = after!.glyphs[i + 1]
    const delta = Math.round((next.x - g.x) * 100) / 100
    if (g.char === ' ') {
      console.log(`  after '${g.char}' (after '${after!.glyphs[i - 1]?.char ?? '^'}${g.char}'): delta=${delta}, g.width=${g.width}`)
    }
  }

  expect(before).not.toBeNull()
  expect(after).not.toBeNull()
})
