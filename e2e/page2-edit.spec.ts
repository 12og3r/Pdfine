import { test, expect } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

const EXAMPLE_PDF = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../example/example_en.pdf')

/**
 * Regression test: switching pages while edit mode is active must exit edit
 * mode, otherwise the hidden textarea never re-focuses on the next
 * double-click and keystrokes go to whatever element still holds focus
 * (typically the PageNavigator chevron button).
 *
 * Repro steps:
 *   1. Double-click a block on page 1 → edit mode starts, textarea is focused
 *   2. Click the "next page" chevron
 *   3. Double-click a block on page 2 → textarea should re-focus
 *   4. Type characters → they should land in the page 2 block
 *
 * Before the fix: step 3 didn't fire the textarea's useEffect (because
 * `isEditing` was already true from step 1), so focus stayed on the chevron
 * button and typing was lost.
 *
 * Fix: EditorCore.setCurrentPage() now calls editEngine.exitEditMode() before
 * switching, so the next enterEditMode produces a real false→true transition
 * that re-focuses the textarea.
 */

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

interface ClickTarget {
  id: string
  textBefore: string
  x: number
  y: number
}

async function findFirstEditableBlock(page: import('@playwright/test').Page, pageIdx: number, minLen = 5): Promise<ClickTarget | null> {
  return page.evaluate(({ pageIdx, minLen }) => {
    const core = (window as unknown as { __EDITOR_CORE__: unknown }).__EDITOR_CORE__ as unknown as {
      getDocument: () => { pages: Array<{ elements: unknown[] }> }
      getRenderEngine: () => { getPageOffset(): { x: number; y: number } }
    }
    const pg = core.getDocument().pages[pageIdx]
    const canvas = document.querySelector('canvas')!
    const rect = canvas.getBoundingClientRect()
    const offset = core.getRenderEngine().getPageOffset()
    for (const el of pg.elements as Array<Record<string, unknown>>) {
      if (el.type !== 'text') continue
      const b = el as unknown as {
        id: string
        bounds: { x: number; y: number }
        paragraphs: Array<{
          runs: Array<{ text: string }>
          lines?: Array<{ glyphs: Array<{ x: number; y: number; width: number; height: number }> }>
        }>
      }
      const text = b.paragraphs.map(p => p.runs.map(r => r.text).join('')).join('')
      if (text.length < minLen) continue
      const g = b.paragraphs[0].lines?.[0]?.glyphs[0]
      if (!g) continue
      return {
        id: b.id,
        textBefore: text.slice(0, 40),
        x: rect.left + offset.x + b.bounds.x + g.x + g.width / 2,
        y: rect.top + offset.y + b.bounds.y + g.y + g.height / 2,
      }
    }
    return null
  }, { pageIdx, minLen })
}

test('editing on page 2 works after double-clicking on page 1 first', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', e => errors.push(`[pageerror] ${e.message}`))
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(`[console.error] ${msg.text()}`)
  })

  await page.setViewportSize({ width: 1600, height: 1200 })
  await uploadAndWaitForRender(page)

  // Step 1: enter edit mode on a page 1 block and DO NOT exit.
  const p1 = await findFirstEditableBlock(page, 0, 5)
  expect(p1, 'must find a block on page 1').not.toBeNull()
  await page.mouse.dblclick(p1!.x, p1!.y)
  await page.waitForTimeout(300)

  const afterP1 = await page.evaluate(() => {
    const core = (window as unknown as { __EDITOR_CORE__: unknown }).__EDITOR_CORE__ as unknown as {
      isEditing(): boolean
      getEditEngine(): { getEditingBlockId(): string | null }
    }
    return { isEditing: core.isEditing(), editingId: core.getEditEngine().getEditingBlockId() }
  })
  expect(afterP1.isEditing, 'page 1 double-click should enter edit mode').toBe(true)

  // Step 2: click the PageNavigator chevron to go to page 2 — focus moves to
  // the chevron button.
  await page.locator('svg.lucide-chevron-right').first().click()
  await page.waitForTimeout(600)

  // The fix: setCurrentPage must have exited edit mode.
  const afterNav = await page.evaluate(() => {
    const core = (window as unknown as { __EDITOR_CORE__: unknown }).__EDITOR_CORE__ as unknown as {
      isEditing(): boolean
      getCurrentPage(): number
    }
    return { isEditing: core.isEditing(), currentPage: core.getCurrentPage() }
  })
  expect(afterNav.currentPage, 'should be on page 2').toBe(1)
  expect(afterNav.isEditing, 'edit mode should have been exited on page change').toBe(false)

  // Step 3: double-click a block on page 2.
  const p2 = await findFirstEditableBlock(page, 1, 20)
  expect(p2, 'must find a block on page 2').not.toBeNull()
  await page.mouse.dblclick(p2!.x, p2!.y)
  await page.waitForTimeout(400)

  // Step 4: type without an explicit .focus() — rely on the app's own
  // textarea focus management.
  await page.keyboard.type('HELLO')
  await page.waitForTimeout(300)

  const result = await page.evaluate(() => {
    const core = (window as unknown as { __EDITOR_CORE__: unknown }).__EDITOR_CORE__ as unknown as {
      isEditing(): boolean
      getEditEngine(): { getEditingBlockId(): string | null; getCursorManager(): { getPageIdx(): number } }
      getDocument: () => { pages: Array<{ elements: unknown[] }> }
      getCurrentPage(): number
    }
    const id = core.getEditEngine().getEditingBlockId()
    const pg = core.getDocument().pages[core.getCurrentPage()]
    let text = ''
    for (const el of pg.elements as Array<Record<string, unknown>>) {
      const b = el as unknown as { id: string; paragraphs: Array<{ runs: Array<{ text: string }> }> }
      if (b.id === id) {
        text = b.paragraphs.map(p => p.runs.map(r => r.text).join('')).join('')
      }
    }
    return {
      isEditing: core.isEditing(),
      editingId: id,
      cursorPageIdx: core.getEditEngine().getCursorManager().getPageIdx(),
      activeTag: document.activeElement?.tagName,
      text: text.slice(0, 80),
    }
  })

  expect(errors, `console errors: ${errors.join(' | ')}`).toEqual([])
  expect(result.isEditing, 'should be in edit mode after page 2 double-click').toBe(true)
  expect(result.cursorPageIdx, 'cursor should be on page 2').toBe(1)
  expect(result.activeTag, 'textarea should hold focus for keystrokes').toBe('TEXTAREA')
  expect(result.text, 'HELLO should be inserted into page 2 block').toContain('HELLO')
})
