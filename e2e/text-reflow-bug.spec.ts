import { test, expect } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const VISA_PDF = path.resolve(__dirname, '../example/Visa.pdf')

async function uploadAndWaitForRender(page: import('@playwright/test').Page) {
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  const fileInput = page.locator('input[type="file"]')
  await fileInput.setInputFiles(VISA_PDF)
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
}

async function exposeEditorCore(page: import('@playwright/test').Page) {
  await page.evaluate(() => {
    const canvas = document.querySelector('canvas')
    if (!canvas) return
    const fiberKey = Object.keys(canvas).find(k => k.startsWith('__reactFiber'))
    if (!fiberKey) return
    let fiber = (canvas as any)[fiberKey]
    for (let i = 0; i < 30 && fiber; i++) {
      if (fiber.memoizedProps?.editorCore) {
        (window as any).__PDFINE_EDITOR_CORE__ = fiber.memoizedProps.editorCore
        return
      }
      let hook = fiber.memoizedState
      while (hook) {
        const val = hook.memoizedState
        if (val && typeof val === 'object' && 'current' in val && val.current) {
          const ref = val.current
          if (typeof ref.getDocument === 'function' && typeof ref.getPageModel === 'function') {
            (window as any).__PDFINE_EDITOR_CORE__ = ref
            return
          }
        }
        hook = hook.next
      }
      fiber = fiber.return
    }
  })
}

interface LineInfo {
  text: string
  y: number
  width: number
  glyphCount: number
}

interface BlockInfo {
  blockId: string
  fullText: string
  boundsWidth: number
  boundsHeight: number
  lineCount: number
  lines: LineInfo[]
  runs: { text: string; fontId: string; fontSize: number; hasPdfRunWidth: boolean; hasPdfCharWidths: boolean }[]
  clickX: number
  clickY: number
}

/**
 * Find a text block containing searchText and return its layout info + click coords.
 */
async function getBlockInfo(
  page: import('@playwright/test').Page,
  searchText: string,
  charIndex: number,
): Promise<BlockInfo | null> {
  return page.evaluate(({ search, idx }) => {
    const core = (window as any).__PDFINE_EDITOR_CORE__
    if (!core) return null
    const pg = core.getPageModel(core.getCurrentPage())
    if (!pg) return null

    const scale = core.getZoom()
    const renderEngine = core.getRenderEngine()
    const pageOffset = renderEngine.getPageOffset()
    const canvas = document.querySelector('canvas')!
    const rect = canvas.getBoundingClientRect()

    for (const el of pg.elements) {
      if (el.type !== 'text') continue

      let fullText = ''
      for (const para of el.paragraphs) {
        for (const run of para.runs) fullText += run.text
      }

      const matchPos = fullText.indexOf(search)
      if (matchPos === -1) continue

      // Collect lines
      const lines: any[] = []
      const allGlyphs: any[] = []
      for (const para of el.paragraphs) {
        if (!para.lines) continue
        for (const line of para.lines) {
          const lineText = line.glyphs.map((g: any) => g.char).join('')
          lines.push({ text: lineText, y: line.y, width: line.width, glyphCount: line.glyphs.length })
          for (const g of line.glyphs) allGlyphs.push(g)
        }
      }

      // Collect runs info
      const runs = el.paragraphs.flatMap((p: any) => p.runs.map((r: any) => ({
        text: r.text,
        fontId: r.style.fontId,
        fontSize: r.style.fontSize,
        hasPdfRunWidth: r.pdfRunWidth !== undefined,
        hasPdfCharWidths: Array.isArray(r.pdfCharWidths),
      })))

      // Click position for the target character
      const targetIdx = matchPos + idx
      const glyph = allGlyphs[targetIdx] || allGlyphs[0]
      const clickX = rect.left + pageOffset.x + (el.bounds.x + glyph.x + glyph.width / 2) * scale
      const clickY = rect.top + pageOffset.y + (el.bounds.y + glyph.y + glyph.height / 2) * scale

      return {
        blockId: el.id,
        fullText,
        boundsWidth: el.bounds.width,
        boundsHeight: el.bounds.height,
        lineCount: lines.length,
        lines,
        runs,
        clickX,
        clickY,
      }
    }
    return null
  }, { search: searchText, idx: charIndex })
}

/**
 * Get current line layout for a block by ID.
 */
async function getBlockLines(
  page: import('@playwright/test').Page,
  blockId: string,
): Promise<LineInfo[] | null> {
  return page.evaluate(({ bid }) => {
    const core = (window as any).__PDFINE_EDITOR_CORE__
    if (!core) return null
    const pg = core.getPageModel(core.getCurrentPage())
    const el = pg?.elements.find((e: any) => e.id === bid)
    if (!el || el.type !== 'text') return null

    const lines: any[] = []
    for (const para of el.paragraphs) {
      if (!para.lines) continue
      for (const line of para.lines) {
        const lineText = line.glyphs.map((g: any) => g.char).join('')
        lines.push({ text: lineText, y: line.y, width: line.width, glyphCount: line.glyphs.length })
      }
    }
    return lines
  }, { bid: blockId })
}

// ──────────────────────────────────────────────────────────────────────

test.describe('Bug: Text reflow after insertion causes wrong line breaks', () => {

  test.beforeEach(async ({ page }) => {
    await uploadAndWaitForRender(page)
    await page.waitForTimeout(500)
    await exposeEditorCore(page)
  })

  /**
   * Bug: In the block "Visitor visa application approved We have approved...",
   * the original PDF has "Visitor visa application approved" on line 1 and
   * "We have approved..." starting on line 2. But after the layout engine
   * measures with Canvas (which gives narrower widths for some runs missing
   * PDF width data), "We have approved..." gets pulled onto line 1.
   *
   * After inserting a single character, the text should reflow only minimally.
   * The line structure should NOT change drastically (e.g., entire phrases
   * jumping between lines).
   */
  test('"We have approved..." should not jump to line 1 after inserting a character', async ({ page }) => {
    // Find the block containing the multi-line text
    const blockInfo = await getBlockInfo(page, 'Visitor visa application approved', 3)
    expect(blockInfo, '"Visitor visa application approved" block not found').not.toBeNull()

    console.log(`Block: "${blockInfo!.fullText}"`)
    console.log(`Bounds: ${blockInfo!.boundsWidth.toFixed(1)} x ${blockInfo!.boundsHeight.toFixed(1)}`)
    console.log(`Lines BEFORE edit: ${blockInfo!.lineCount}`)
    blockInfo!.lines.forEach((l, i) =>
      console.log(`  Line ${i}: "${l.text}" (y=${l.y.toFixed(1)}, w=${l.width.toFixed(1)}, ${l.glyphCount} glyphs)`)
    )
    console.log('Runs:')
    blockInfo!.runs.forEach(r =>
      console.log(`  "${r.text.slice(0, 40)}${r.text.length > 40 ? '...' : ''}" font=${r.fontId}@${r.fontSize} pdfRunWidth=${r.hasPdfRunWidth} pdfCharWidths=${r.hasPdfCharWidths}`)
    )

    // Record which line "We have" starts on
    const weHaveLineBefore = blockInfo!.lines.findIndex(l => l.text.includes('We have'))
    console.log(`"We have" is on line index ${weHaveLineBefore} BEFORE edit`)

    // Also record line count and first-line text length
    const lineCountBefore = blockInfo!.lineCount
    const firstLineTextBefore = blockInfo!.lines[0]?.text ?? ''
    const firstLineGlyphCountBefore = blockInfo!.lines[0]?.glyphCount ?? 0

    // Take screenshot before
    await page.screenshot({ path: 'e2e/screenshots/reflow-bug-01-before.png' })

    // Double-click to enter edit mode
    await page.mouse.dblclick(blockInfo!.clickX, blockInfo!.clickY)
    await page.waitForTimeout(300)
    const textarea = page.locator('textarea')
    await expect(textarea).toBeAttached({ timeout: 3000 })

    // Check lines immediately after entering edit mode (before typing)
    const linesAfterEntry = await getBlockLines(page, blockInfo!.blockId)
    expect(linesAfterEntry).not.toBeNull()

    console.log(`\nLines AFTER entering edit mode (no typing):`)
    linesAfterEntry!.forEach((l, i) =>
      console.log(`  Line ${i}: "${l.text}" (y=${l.y.toFixed(1)}, w=${l.width.toFixed(1)}, ${l.glyphCount} glyphs)`)
    )

    const weHaveLineAfterEntry = linesAfterEntry!.findIndex(l => l.text.includes('We have'))
    console.log(`"We have" is on line index ${weHaveLineAfterEntry} AFTER edit entry`)

    // ASSERTION: Just entering edit mode should not cause "We have" to jump lines
    // If the original PDF had "We have" on a certain line, edit mode entry
    // should preserve that (the initial layout should match the PDF layout)
    expect(
      linesAfterEntry!.length,
      `Line count changed from ${lineCountBefore} to ${linesAfterEntry!.length} just by entering edit mode. ` +
      `This indicates the layout engine measures widths differently than the PDF.`
    ).toBe(lineCountBefore)

    // Type a single character
    await textarea.focus()
    await page.keyboard.type('X')
    await page.waitForTimeout(500)

    // Take screenshot after typing
    await page.screenshot({ path: 'e2e/screenshots/reflow-bug-02-after.png' })

    // Check lines after typing
    const linesAfterType = await getBlockLines(page, blockInfo!.blockId)
    expect(linesAfterType).not.toBeNull()

    console.log(`\nLines AFTER typing 'X':`)
    linesAfterType!.forEach((l, i) =>
      console.log(`  Line ${i}: "${l.text}" (y=${l.y.toFixed(1)}, w=${l.width.toFixed(1)}, ${l.glyphCount} glyphs)`)
    )

    const weHaveLineAfterType = linesAfterType!.findIndex(l => l.text.includes('We have'))
    console.log(`"We have" is on line index ${weHaveLineAfterType} AFTER typing`)

    // ASSERTION: Adding one character should not cause dramatic reflow
    // The line count may increase by 1 (the extra char pushes text to a new line)
    // but should NEVER decrease (text jumping up to an earlier line)
    expect(
      linesAfterType!.length,
      `Line count DECREASED from ${lineCountBefore} to ${linesAfterType!.length} after inserting a character. ` +
      `Text is being measured narrower than the PDF original, causing wrong line breaks.`
    ).toBeGreaterThanOrEqual(lineCountBefore)

    // ASSERTION: "We have" should not move to an earlier line
    if (weHaveLineBefore >= 0) {
      expect(
        weHaveLineAfterType,
        `"We have approved..." jumped from line ${weHaveLineBefore} to line ${weHaveLineAfterType} after insertion. ` +
        `Expected it to stay on the same line or move to a later line.`
      ).toBeGreaterThanOrEqual(weHaveLineBefore)
    }

    // ASSERTION: First line should not gain significantly more characters
    // (allowing +1 for the inserted char if it was on line 1)
    const firstLineGlyphCountAfter = linesAfterType![0]?.glyphCount ?? 0
    const maxExpectedGlyphs = firstLineGlyphCountBefore + 2 // +1 for inserted char, +1 tolerance
    expect(
      firstLineGlyphCountAfter,
      `First line grew from ${firstLineGlyphCountBefore} to ${firstLineGlyphCountAfter} glyphs. ` +
      `Text from later lines is being pulled up due to narrower width measurement.`
    ).toBeLessThanOrEqual(maxExpectedGlyphs)
  })

  /**
   * Verify that runs missing pdfRunWidth/pdfCharWidths still get
   * reasonable layout (not dramatically different from PDF original).
   */
  test('all runs in multi-font block should have PDF width data', async ({ page }) => {
    const blockInfo = await getBlockInfo(page, 'Visitor visa application approved', 0)
    expect(blockInfo).not.toBeNull()

    console.log('Runs in block:')
    const runsWithoutPdfWidth: string[] = []
    for (const r of blockInfo!.runs) {
      const hasPdfData = r.hasPdfRunWidth || r.hasPdfCharWidths
      console.log(`  "${r.text.slice(0, 50)}${r.text.length > 50 ? '...' : ''}" font=${r.fontId}@${r.fontSize} hasPdfWidth=${hasPdfData}`)
      if (!hasPdfData) {
        runsWithoutPdfWidth.push(r.text)
      }
    }

    // ASSERTION: All runs should have PDF width data for accurate layout
    expect(
      runsWithoutPdfWidth.length,
      `${runsWithoutPdfWidth.length} run(s) missing PDF width data: ${runsWithoutPdfWidth.map(t => `"${t.slice(0, 30)}"`).join(', ')}. ` +
      `These runs will use Canvas measureText which produces different widths than the PDF.`
    ).toBe(0)
  })
})
