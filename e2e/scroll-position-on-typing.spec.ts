/**
 * E2E test: Verify that typing in edit mode does NOT reset the scroll position.
 *
 * Bug: When the user scrolls down, enters edit mode on a text block, and types,
 * the whole page jumps to the top. This happens because the hidden textarea
 * (at top:0 inside the scroll container) triggers browser scroll-into-view
 * behavior when receiving input.
 */
import { test, expect } from '@playwright/test'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const EXAMPLE_PDF = path.resolve(__dirname, '../example/example_en.pdf')

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
  await page.waitForTimeout(1000)
}

test.describe('Scroll position stability on typing', () => {
  // Use a small viewport so the PDF page overflows and requires scrolling
  test.use({ viewport: { width: 800, height: 400 } })

  test('typing in edit mode should not reset scroll position', async ({ page }) => {
    await uploadAndWaitForRender(page)

    const scrollContainer = page.locator('.editor-canvas-bg')

    // Force scroll down to a meaningful position
    await scrollContainer.evaluate(el => { el.scrollTop = 200 })
    await page.waitForTimeout(300)

    const scrollAfterManual = await scrollContainer.evaluate(el => el.scrollTop)
    console.log(`Scroll after manual scroll: ${scrollAfterManual}`)
    // Verify we actually scrolled (page is tall enough)
    expect(scrollAfterManual, 'Could not scroll — page may not overflow viewport').toBeGreaterThan(50)

    // Find a text block that's visible after scrolling and double-click it
    const clickTarget = await page.evaluate(() => {
      const core = (window as any).__EDITOR_CORE__
      if (!core) return null
      const doc = core.getDocument()
      if (!doc) return null
      const pageModel = doc.pages[core.getCurrentPage()]
      if (!pageModel) return null

      const renderEngine = core.getRenderEngine()
      const pageOffset = renderEngine.getPageOffset()
      const scale = core.getViewport().scale

      // Find a text block visible in the current viewport
      const textBlocks = pageModel.elements.filter((el: any) => el.type === 'text' && el.editable)
      for (const block of textBlocks) {
        const screenY = pageOffset.y + block.bounds.y * scale
        if (screenY > 50 && screenY < 350) {
          return {
            clientX: pageOffset.x + (block.bounds.x + block.bounds.width / 2) * scale,
            clientY: screenY + (block.bounds.height / 2) * scale,
          }
        }
      }
      // Fallback: pick the 4th block (should be visible after scrolling)
      const b = textBlocks[3] || textBlocks[textBlocks.length - 1]
      return {
        clientX: pageOffset.x + (b.bounds.x + b.bounds.width / 2) * scale,
        clientY: pageOffset.y + (b.bounds.y + b.bounds.height / 2) * scale,
      }
    })
    expect(clickTarget).not.toBeNull()

    // Double-click to enter edit mode
    await page.mouse.dblclick(clickTarget!.clientX, clickTarget!.clientY)
    await page.waitForTimeout(500)

    const textarea = page.locator('textarea')
    await expect(textarea).toBeAttached({ timeout: 3000 })

    // Record scroll position BEFORE typing
    const scrollBefore = await scrollContainer.evaluate(el => el.scrollTop)
    console.log(`Scroll position before typing: ${scrollBefore}`)
    expect(scrollBefore, 'Scroll should be non-zero before typing').toBeGreaterThan(50)

    // Type a character
    await page.keyboard.type('X')
    await page.waitForTimeout(300)

    // Record scroll position AFTER typing
    const scrollAfter = await scrollContainer.evaluate(el => el.scrollTop)
    console.log(`Scroll position after typing: ${scrollAfter}`)

    // CORE ASSERTION: scroll position should not jump
    const scrollDelta = Math.abs(scrollAfter - scrollBefore)
    console.log(`Scroll delta: ${scrollDelta}px`)
    expect(scrollDelta, `Scroll jumped by ${scrollDelta}px after typing`).toBeLessThan(5)
  })
})
