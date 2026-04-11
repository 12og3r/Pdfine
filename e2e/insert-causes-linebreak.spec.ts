import { test, expect } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'
const VISA_PDF = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../example/example_en.pdf')

async function uploadAndWaitForRender(page: import('@playwright/test').Page) {
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await page.locator('input[type="file"]').setInputFiles(VISA_PDF)
  await page.waitForFunction(() => {
    const c = document.querySelector('canvas')
    if (!c) return false
    const d = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data
    let n = 0
    for (let i = 0; i < d.length; i += 16) if (d[i] < 100 && d[i + 1] < 100 && d[i + 2] < 100) n++
    return n > 50
  }, { timeout: 15000 })
}

async function exposeEditorCore(page: import('@playwright/test').Page) {
  await page.evaluate(() => {
    const canvas = document.querySelector('canvas')!
    const fk = Object.keys(canvas).find(k => k.startsWith('__reactFiber'))!
    let f = (canvas as any)[fk]
    for (let i = 0; i < 30 && f; i++) {
      let h = f.memoizedState
      while (h) {
        const v = h.memoizedState
        if (v?.current && typeof v.current.getDocument === 'function') {
          (window as any).__EC__ = v.current; return
        }
        h = h.next
      }
      f = f.return
    }
  })
}

/**
 * Get block info: lines, bounds, glyph positions, click coords for a char.
 */
async function getBlockInfo(page: import('@playwright/test').Page, search: string, charIdx: number) {
  return page.evaluate(({ search, idx }) => {
    const core = (window as any).__EC__
    if (!core) return null
    const pg = core.getPageModel(core.getCurrentPage())
    if (!pg) return null
    const scale = core.getZoom()
    const re = core.getRenderEngine()
    const po = re.getPageOffset()
    const canvas = document.querySelector('canvas')!
    const rect = canvas.getBoundingClientRect()

    for (const el of pg.elements) {
      if (el.type !== 'text') continue
      let ft = ''
      for (const p of el.paragraphs) for (const r of p.runs) ft += r.text
      const mp = ft.indexOf(search)
      if (mp === -1) continue

      const lines: any[] = []
      const glyphs: any[] = []
      for (const p of el.paragraphs) {
        if (!p.lines) continue
        for (const l of p.lines) {
          lines.push({ text: l.glyphs.map((g: any) => g.char).join(''), y: l.y, width: l.width, count: l.glyphs.length })
          for (const g of l.glyphs) glyphs.push(g)
        }
      }

      const ti = mp + idx
      const g = glyphs[ti] || glyphs[0]
      return {
        blockId: el.id,
        fullText: ft,
        boundsWidth: el.bounds.width,
        boundsHeight: el.bounds.height,
        lineCount: lines.length,
        lines,
        clickX: rect.left + po.x + (el.bounds.x + g.x + g.width / 2) * scale,
        clickY: rect.top + po.y + (el.bounds.y + g.y + g.height / 2) * scale,
      }
    }
    return null
  }, { search, idx: charIdx })
}

async function getBlockLines(page: import('@playwright/test').Page, blockId: string) {
  return page.evaluate(({ bid }) => {
    const core = (window as any).__EC__
    if (!core) return null
    const pg = core.getPageModel(core.getCurrentPage())
    const el = pg?.elements.find((e: any) => e.id === bid)
    if (!el || el.type !== 'text') return null
    const lines: any[] = []
    for (const p of el.paragraphs) {
      if (!p.lines) continue
      for (const l of p.lines) {
        lines.push({ text: l.glyphs.map((g: any) => g.char).join(''), y: l.y, width: l.width, count: l.glyphs.length })
      }
    }
    return lines
  }, { bid: blockId })
}

// ──────────────────────────────────────────────────────────────────────

test.describe('Bug: inserting one character causes unexpected line break', () => {

  test.beforeEach(async ({ page }) => {
    await uploadAndWaitForRender(page)
    await page.waitForTimeout(500)
    await exposeEditorCore(page)
  })

  /**
   * "Lorem ipsum" is a single-line block with bounds.width exactly
   * matching the text width. Inserting one character should NOT cause the
   * remaining text to wrap to a second line — the block should grow
   * horizontally to accommodate the extra character.
   *
   * SKIPPED on the shared example_en.pdf fixture: "Lorem ipsum" in
   * example_en.pdf lives inside a multi-line paragraph (not a dedicated
   * single-line block like the original Visa fixture), so auto-grow can't
   * avoid wrapping the last word when a character is inserted.
   */
  test.skip('inserting one char in "Lorem ipsum" should not cause line wrap', async ({ page }) => {
    const info = await getBlockInfo(page, 'Lorem ipsum', 3) // click on 'i' in 'Visitor'
    expect(info).not.toBeNull()

    console.log(`Block: "${info!.fullText}"`)
    console.log(`Bounds: ${info!.boundsWidth.toFixed(1)} x ${info!.boundsHeight.toFixed(1)}`)
    console.log(`Lines BEFORE: ${info!.lineCount}`)
    info!.lines.forEach((l: any, i: number) =>
      console.log(`  Line ${i}: "${l.text}" w=${l.width.toFixed(1)} (${l.count} glyphs)`)
    )

    const lineCountBefore = info!.lineCount

    // Double-click to enter edit, then type one char
    await page.mouse.dblclick(info!.clickX, info!.clickY)
    await page.waitForTimeout(300)
    const ta = page.locator('textarea')
    await expect(ta).toBeAttached({ timeout: 3000 })
    await ta.focus()
    await page.keyboard.type('X')
    await page.waitForTimeout(500)

    const linesAfter = await getBlockLines(page, info!.blockId)
    expect(linesAfter).not.toBeNull()

    console.log(`\nLines AFTER inserting 'X': ${linesAfter!.length}`)
    linesAfter!.forEach((l: any, i: number) =>
      console.log(`  Line ${i}: "${l.text}" w=${l.width.toFixed(1)} (${l.count} glyphs)`)
    )

    await page.screenshot({ path: 'e2e/screenshots/insert-linebreak-01.png' })

    // ASSERTION: A single character insertion in a one-line block should NOT
    // cause text to wrap. During editing (autoGrow mode), the block should
    // expand to fit the extra character, keeping everything on one line.
    expect(
      linesAfter!.length,
      `Inserting 1 char caused line count to increase from ${lineCountBefore} to ${linesAfter!.length}. ` +
      `Text "${linesAfter![1]?.text ?? ''}" was pushed to line 2. ` +
      `Block should grow horizontally during editing instead of wrapping.`
    ).toBe(lineCountBefore)
  })

  /**
   * "This PDF is three than the other..."
   * is a multi-line block. Inserting one character at the beginning
   * should not cause more than 1 additional line (just the overflow
   * from the inserted char at most).
   */
  test('inserting one char in multi-line block should not cause excessive reflow', async ({ page }) => {
    const info = await getBlockInfo(page, 'This PDF is three', 3)
    expect(info).not.toBeNull()

    console.log(`Block: "${info!.fullText.slice(0, 80)}..."`)
    console.log(`Bounds: ${info!.boundsWidth.toFixed(1)} x ${info!.boundsHeight.toFixed(1)}`)
    console.log(`Lines BEFORE: ${info!.lineCount}`)
    info!.lines.forEach((l: any, i: number) =>
      console.log(`  Line ${i}: "${l.text.slice(0, 60)}${l.text.length > 60 ? '...' : ''}" w=${l.width.toFixed(1)} (${l.count} glyphs)`)
    )

    const lineCountBefore = info!.lineCount
    const firstLineCountBefore = info!.lines[0]?.count ?? 0

    // Enter edit mode and type
    await page.mouse.dblclick(info!.clickX, info!.clickY)
    await page.waitForTimeout(300)
    const ta = page.locator('textarea')
    await expect(ta).toBeAttached({ timeout: 3000 })
    await ta.focus()
    await page.keyboard.type('X')
    await page.waitForTimeout(500)

    const linesAfter = await getBlockLines(page, info!.blockId)
    expect(linesAfter).not.toBeNull()

    console.log(`\nLines AFTER inserting 'X': ${linesAfter!.length}`)
    linesAfter!.forEach((l: any, i: number) =>
      console.log(`  Line ${i}: "${l.text.slice(0, 60)}${l.text.length > 60 ? '...' : ''}" w=${l.width.toFixed(1)} (${l.count} glyphs)`)
    )

    await page.screenshot({ path: 'e2e/screenshots/insert-linebreak-02.png' })

    // ASSERTION: Adding one char may cause one additional line at most
    // (the last word on the current line wraps to the next)
    expect(
      linesAfter!.length,
      `Line count jumped from ${lineCountBefore} to ${linesAfter!.length} after inserting 1 char. ` +
      `Expected at most ${lineCountBefore + 1} lines.`
    ).toBeLessThanOrEqual(lineCountBefore + 1)

    // ASSERTION: First line should not lose too many characters
    // (at most one word should wrap to the next line)
    const firstLineCountAfter = linesAfter![0]?.count ?? 0
    const charLoss = firstLineCountBefore - firstLineCountAfter + 1 // +1 because we inserted a char
    console.log(`First line char loss: ${charLoss} (before=${firstLineCountBefore}, after=${firstLineCountAfter})`)

    // A word wrap typically moves 5-15 chars. More than 20 indicates excessive reflow.
    expect(
      charLoss,
      `First line lost ${charLoss} characters after inserting 1 char. ` +
      `This indicates excessive reflow — too many characters pushed to the next line.`
    ).toBeLessThan(20)
  })
})
