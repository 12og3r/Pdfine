import { test, expect } from '@playwright/test'
const VISA_PDF = '/Users/bytedance/Desktop/example_en.pdf'

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

/**
 * Find a text block containing `searchText` and return click coordinates
 * for the character at `charIndex` within the match.
 */
async function findTextBlockByContent(
  page: import('@playwright/test').Page,
  searchText: string,
  charIndex: number,
) {
  return page.evaluate(({ search, idx }) => {
    const canvas = document.querySelector('canvas')!
    const rect = canvas.getBoundingClientRect()
    const editorCore = (window as any).__PDFINE_EDITOR_CORE__
    if (!editorCore) return null

    const pageIdx = editorCore.getCurrentPage()
    const pageModel = editorCore.getPageModel(pageIdx)
    if (!pageModel) return null

    const scale = editorCore.getZoom()
    const renderEngine = editorCore.getRenderEngine()
    const pageOffset = renderEngine.getPageOffset()

    for (const el of pageModel.elements) {
      if (el.type !== 'text') continue
      let fullText = ''
      for (const para of el.paragraphs) {
        for (const run of para.runs) {
          fullText += run.text
        }
        fullText += '\n'
      }
      fullText = fullText.slice(0, -1)

      const matchPos = fullText.indexOf(search)
      if (matchPos === -1) continue

      const targetGlobalOffset = matchPos + idx
      let globalIdx = 0
      let targetGlyph: any = null
      let prevGlyph: any = null

      for (const para of el.paragraphs) {
        if (!para.lines) continue
        for (const line of para.lines) {
          for (const glyph of line.glyphs) {
            if (globalIdx === targetGlobalOffset) targetGlyph = glyph
            if (globalIdx === targetGlobalOffset - 1) prevGlyph = glyph
            globalIdx++
          }
        }
      }

      const bx = el.bounds.x
      const by = el.bounds.y
      let clickPageX: number, clickPageY: number, glyphHeight: number

      if (targetGlyph) {
        clickPageX = bx + targetGlyph.x
        clickPageY = by + targetGlyph.y + targetGlyph.height / 2
        glyphHeight = targetGlyph.height
      } else if (prevGlyph) {
        clickPageX = bx + prevGlyph.x + prevGlyph.width
        clickPageY = by + prevGlyph.y + prevGlyph.height / 2
        glyphHeight = prevGlyph.height
      } else {
        clickPageX = bx
        clickPageY = by
        glyphHeight = 12
      }

      const clientX = rect.left + pageOffset.x + clickPageX * scale
      const clientY = rect.top + pageOffset.y + clickPageY * scale

      return {
        clientX,
        clientY,
        blockId: el.id,
        fullText,
        matchPos,
        targetGlobalOffset,
        glyphHeight: glyphHeight * scale,
        canvasX: pageOffset.x + clickPageX * scale,
        canvasY: pageOffset.y + clickPageY * scale,
        blockScreen: {
          x: rect.left + pageOffset.x + bx * scale,
          y: rect.top + pageOffset.y + by * scale,
          w: el.bounds.width * scale,
          h: el.bounds.height * scale,
        },
      }
    }
    return null
  }, { search: searchText, idx: charIndex })
}

// ──────────────────────────────────────────────────────────────────────

test.describe('Bug verification: Cursor visibility and font consistency', () => {

  test.beforeEach(async ({ page }) => {
    await uploadAndWaitForRender(page)
    await page.waitForTimeout(500)
    await exposeEditorCore(page)
  })

  /**
   * BUG 1: After double-clicking text to enter edit mode, the cursor should
   * be visible between characters. Verify via both:
   * (a) The internal cursor position is valid (not null, has reasonable coordinates)
   * (b) A thin vertical dark line (cursor) exists on the canvas near the click point
   */
  test('cursor should be visible after double-click to enter edit mode', async ({ page }) => {
    const target = await findTextBlockByContent(page, 'February', 3)
    expect(target, '"February" not found in document model').not.toBeNull()

    // Take screenshot before edit mode
    await page.screenshot({ path: 'e2e/screenshots/cursor-bug-01-before.png' })

    // Double-click to enter edit mode
    await page.mouse.dblclick(target!.clientX, target!.clientY)
    await page.waitForTimeout(300)

    // Verify textarea (hidden input) is attached — confirms edit mode is active
    const textarea = page.locator('textarea')
    await expect(textarea).toBeAttached({ timeout: 3000 })

    // Take screenshot after entering edit mode
    await page.screenshot({ path: 'e2e/screenshots/cursor-bug-02-editmode.png' })

    // ASSERTION 1: Internal cursor position must not be null
    const cursorInfo = await page.evaluate(() => {
      const core = (window as any).__PDFINE_EDITOR_CORE__
      if (!core) return { error: 'no editor core' }
      const editEngine = core.getEditEngine()
      if (!editEngine) return { error: 'no edit engine' }
      if (!editEngine.isEditing()) return { error: 'not in edit mode' }

      const pos = editEngine.getCursorPosition()
      if (!pos) return { error: 'cursor position is null' }

      const renderEngine = core.getRenderEngine()
      const pageOffset = renderEngine.getPageOffset()
      const scale = core.getZoom()

      return {
        x: pos.x,
        y: pos.y,
        height: pos.height,
        charOffset: pos.charOffset,
        canvasX: pageOffset.x + pos.x * scale,
        canvasY: pageOffset.y + pos.y * scale,
        canvasHeight: pos.height * scale,
      }
    })

    console.log('Cursor info after double-click:', JSON.stringify(cursorInfo))

    expect(cursorInfo, 'Cursor position should be obtainable').not.toHaveProperty('error')
    expect((cursorInfo as any).height, 'Cursor height should be positive').toBeGreaterThan(0)

    // ASSERTION 2: Scan the canvas for cursor pixels (thin vertical dark line)
    // near the expected click position. The cursor is 2px wide.
    const cursorPixelCheck = await page.evaluate(({ cx, cy, ch }) => {
      const canvas = document.querySelector('canvas')!
      const ctx = canvas.getContext('2d')!
      const dpr = window.devicePixelRatio || 1

      // Search in a region around the expected cursor position
      const searchW = 40 // ±20px around cursor X
      const searchH = ch + 20

      const px = Math.max(0, Math.round((cx - 20) * dpr))
      const py = Math.max(0, Math.round((cy - 10) * dpr))
      const pw = Math.min(Math.round(searchW * dpr), canvas.width - px)
      const ph = Math.min(Math.round(searchH * dpr), canvas.height - py)
      if (pw <= 0 || ph <= 0) return { found: false, reason: 'search region out of bounds' }

      const data = ctx.getImageData(px, py, pw, ph).data

      // Look for vertical dark streaks (cursor is 2px wide, ~height of glyph)
      const candidates: { col: number; streakLen: number }[] = []
      for (let col = 0; col < pw; col++) {
        let maxStreak = 0, streak = 0
        for (let row = 0; row < ph; row++) {
          const idx = (row * pw + col) * 4
          // Cursor is drawn with CURSOR_COLOR (typically black or very dark)
          if (data[idx] < 60 && data[idx + 1] < 60 && data[idx + 2] < 60) {
            streak++
            maxStreak = Math.max(maxStreak, streak)
          } else {
            streak = 0
          }
        }
        if (maxStreak >= 6 * dpr) {
          candidates.push({ col, streakLen: maxStreak })
        }
      }

      return {
        found: candidates.length > 0,
        candidateCount: candidates.length,
        bestStreak: candidates.length > 0 ? Math.max(...candidates.map(c => c.streakLen)) / dpr : 0,
        reason: candidates.length === 0 ? 'no vertical dark streak found near expected cursor position' : 'cursor-like pixels found',
      }
    }, {
      cx: (cursorInfo as any).canvasX,
      cy: (cursorInfo as any).canvasY,
      ch: (cursorInfo as any).canvasHeight,
    })

    console.log('Cursor pixel check:', JSON.stringify(cursorPixelCheck))

    // This assertion verifies the bug: cursor should be visible on canvas
    expect(
      cursorPixelCheck.found,
      `Cursor not visible on canvas after entering edit mode. ${cursorPixelCheck.reason}`
    ).toBe(true)
  })

  /**
   * BUG 2: After inserting a single character, the text font should remain
   * consistent with the original PDF font. Verify by comparing:
   * (a) The font style (fontId, fontSize, fontWeight) of the run before and after insertion
   * (b) Canvas pixel comparison — the surrounding unmodified characters should look the same
   */
  test('font should remain consistent after inserting a character', async ({ page }) => {
    const target = await findTextBlockByContent(page, 'February', 3)
    expect(target, '"February" not found').not.toBeNull()

    // Read the original font style of the run containing "February"
    const styleBefore = await page.evaluate(({ blockId }) => {
      const core = (window as any).__PDFINE_EDITOR_CORE__
      if (!core) return null
      const pg = core.getPageModel(core.getCurrentPage())
      const el = pg?.elements.find((e: any) => e.id === blockId)
      if (!el || el.type !== 'text') return null

      // Collect all run styles
      const runStyles: { text: string; fontId: string; fontSize: number; fontWeight: number; fontStyle: string }[] = []
      for (const para of el.paragraphs) {
        for (const run of para.runs) {
          runStyles.push({
            text: run.text,
            fontId: run.style.fontId,
            fontSize: run.style.fontSize,
            fontWeight: run.style.fontWeight,
            fontStyle: run.style.fontStyle,
          })
        }
      }
      return runStyles
    }, { blockId: target!.blockId })

    console.log('Run styles BEFORE edit:', JSON.stringify(styleBefore))
    expect(styleBefore, 'Could not read run styles before edit').not.toBeNull()
    expect(styleBefore!.length, 'Block should have at least one run').toBeGreaterThan(0)

    // Capture canvas pixels in the block region before editing
    const blockCanvasRegion = await page.evaluate(({ blockId }) => {
      const core = (window as any).__PDFINE_EDITOR_CORE__
      if (!core) return null
      const pg = core.getPageModel(core.getCurrentPage())
      const el = pg?.elements.find((e: any) => e.id === blockId)
      if (!el || el.type !== 'text') return null

      const scale = core.getZoom()
      const renderEngine = core.getRenderEngine()
      const pageOffset = renderEngine.getPageOffset()

      return {
        x: pageOffset.x + el.bounds.x * scale,
        y: pageOffset.y + el.bounds.y * scale,
        w: el.bounds.width * scale,
        h: el.bounds.height * scale,
      }
    }, { blockId: target!.blockId })

    // Capture per-column dark pixel counts in the block region (font weight/size indicator)
    const pixelsBefore = await page.evaluate(({ region }) => {
      if (!region) return null
      const canvas = document.querySelector('canvas')!
      const ctx = canvas.getContext('2d')!
      const dpr = window.devicePixelRatio || 1

      const px = Math.max(0, Math.round(region.x * dpr))
      const py = Math.max(0, Math.round(region.y * dpr))
      const pw = Math.min(Math.round(region.w * dpr), canvas.width - px)
      const ph = Math.min(Math.round(region.h * dpr), canvas.height - py)
      if (pw <= 0 || ph <= 0) return null

      const data = ctx.getImageData(px, py, pw, ph).data
      let totalDark = 0
      for (let i = 0; i < data.length; i += 4) {
        if (data[i] < 80 && data[i + 1] < 80 && data[i + 2] < 80) totalDark++
      }
      return { totalDark, pw, ph }
    }, { region: blockCanvasRegion })

    await page.screenshot({ path: 'e2e/screenshots/font-bug-01-before.png' })

    // Enter edit mode
    await page.mouse.dblclick(target!.clientX, target!.clientY)
    await page.waitForTimeout(300)
    const textarea = page.locator('textarea')
    await expect(textarea).toBeAttached({ timeout: 3000 })

    // Type a single character
    await textarea.focus()
    await page.keyboard.type('X')
    await page.waitForTimeout(500)

    await page.screenshot({ path: 'e2e/screenshots/font-bug-02-after-type.png' })

    // Read run styles AFTER typing
    const styleAfter = await page.evaluate(({ blockId }) => {
      const core = (window as any).__PDFINE_EDITOR_CORE__
      if (!core) return null
      const pg = core.getPageModel(core.getCurrentPage())
      const el = pg?.elements.find((e: any) => e.id === blockId)
      if (!el || el.type !== 'text') return null

      const runStyles: { text: string; fontId: string; fontSize: number; fontWeight: number; fontStyle: string }[] = []
      for (const para of el.paragraphs) {
        for (const run of para.runs) {
          runStyles.push({
            text: run.text,
            fontId: run.style.fontId,
            fontSize: run.style.fontSize,
            fontWeight: run.style.fontWeight,
            fontStyle: run.style.fontStyle,
          })
        }
      }
      return runStyles
    }, { blockId: target!.blockId })

    console.log('Run styles AFTER edit:', JSON.stringify(styleAfter))
    expect(styleAfter, 'Could not read run styles after edit').not.toBeNull()

    // ASSERTION: The fontId of the run containing 'X' must match the original fontId
    // Find the run that now contains "X" (it was inserted at offset 3, so "FebXruary")
    const originalFontId = styleBefore![0].fontId
    const originalFontSize = styleBefore![0].fontSize
    const originalFontWeight = styleBefore![0].fontWeight

    // Find the run containing the inserted character
    let insertedRunFontId: string | null = null
    let insertedRunFontSize: number | null = null
    let insertedRunFontWeight: number | null = null
    for (const run of styleAfter!) {
      if (run.text.includes('X')) {
        insertedRunFontId = run.fontId
        insertedRunFontSize = run.fontSize
        insertedRunFontWeight = run.fontWeight
        break
      }
    }

    console.log(`Original font: id=${originalFontId}, size=${originalFontSize}, weight=${originalFontWeight}`)
    console.log(`Inserted char font: id=${insertedRunFontId}, size=${insertedRunFontSize}, weight=${insertedRunFontWeight}`)

    // Find the original run that contained the text at the insertion point
    // "February" is in the 4th run (index 3): "87083279 20-February-2026" with fontId g_d0_f1
    // The inserted 'X' should be in the same run with the same fontId
    let originalRunForInsertion: typeof styleBefore extends (infer T)[] | null ? T : never = styleBefore![0]
    let charsSoFar = 0
    for (const run of styleBefore!) {
      if (charsSoFar + run.text.length > target!.matchPos + 3) {
        originalRunForInsertion = run
        break
      }
      charsSoFar += run.text.length
    }
    const expectedFontId = originalRunForInsertion.fontId
    const expectedFontSize = originalRunForInsertion.fontSize
    const expectedFontWeight = originalRunForInsertion.fontWeight

    console.log(`Expected font from insertion run: id=${expectedFontId}, size=${expectedFontSize}, weight=${expectedFontWeight}`)

    // Font ID must match — this is the core of Bug 2
    expect(
      insertedRunFontId,
      `Inserted character has fontId="${insertedRunFontId}" but original text had fontId="${expectedFontId}". Font changed after insertion!`
    ).toBe(expectedFontId)

    expect(
      insertedRunFontSize,
      `Inserted character has fontSize=${insertedRunFontSize} but original was ${expectedFontSize}`
    ).toBe(expectedFontSize)

    expect(
      insertedRunFontWeight,
      `Inserted character has fontWeight=${insertedRunFontWeight} but original was ${expectedFontWeight}`
    ).toBe(expectedFontWeight)

    // VISUAL CHECK: Verify that TextRenderer uses the registered font ID,
    // not a generic fallback like sans-serif. We intercept ctx.font assignments
    // during the re-render triggered by text insertion.
    const fontStringCheck = await page.evaluate(({ blockId }) => {
      const core = (window as any).__PDFINE_EDITOR_CORE__
      if (!core) return { error: 'no core' }

      const canvas = document.querySelector('canvas')!
      const ctx = canvas.getContext('2d')!

      // Monkey-patch ctx.font to capture assignments during next render
      const assigned: string[] = []
      const origDesc = Object.getOwnPropertyDescriptor(CanvasRenderingContext2D.prototype, 'font')!
      Object.defineProperty(ctx, 'font', {
        set(v: string) { assigned.push(v); origDesc.set!.call(this, v) },
        get() { return origDesc.get!.call(this) },
        configurable: true,
      })

      // Trigger a render
      core.render()

      // Clean up monkey-patch
      delete (ctx as any).font

      // Analyze font assignments
      const sansSerifOnly = assigned.filter(f => f.endsWith('sans-serif') && !f.includes('"g_d0_'))
      const withRegistered = assigned.filter(f => f.includes('"g_d0_'))

      return {
        totalFontAssignments: assigned.length,
        registeredFontCount: withRegistered.length,
        sansSerifOnlyCount: sansSerifOnly.length,
        samples: withRegistered.slice(0, 5),
      }
    }, { blockId: target!.blockId })

    console.log('Font string check:', JSON.stringify(fontStringCheck))

    // The key assertion: TextRenderer must use registered font IDs, not bare sans-serif
    expect(
      fontStringCheck,
      'Could not check font strings'
    ).not.toHaveProperty('error')
    expect(
      (fontStringCheck as any).registeredFontCount,
      'TextRenderer should use registered font IDs (e.g., "g_d0_f1") instead of generic sans-serif'
    ).toBeGreaterThan(0)
    expect(
      (fontStringCheck as any).sansSerifOnlyCount,
      `TextRenderer still uses bare sans-serif for ${(fontStringCheck as any).sansSerifOnlyCount} glyphs`
    ).toBe(0)
  })

  /**
   * Combined test: Verify that after double-click (no typing), the cursor is
   * between characters AND the text rendering hasn't changed at all.
   * Then type one character and verify the font rendering is consistent.
   */
  test('edit mode entry should show cursor without changing text rendering', async ({ page }) => {
    const target = await findTextBlockByContent(page, 'February', 4)
    expect(target, '"February" not found').not.toBeNull()

    const bs = target!.blockScreen
    const pad = 15

    // Capture dark pixel positions BEFORE edit mode
    const beforePixels = await page.evaluate(({ x, y, w, h }) => {
      const canvas = document.querySelector('canvas')!
      const ctx = canvas.getContext('2d')!
      const dpr = window.devicePixelRatio || 1
      const px = Math.max(0, Math.round(x * dpr))
      const py = Math.max(0, Math.round(y * dpr))
      const pw = Math.min(Math.round(w * dpr), canvas.width - px)
      const ph = Math.min(Math.round(h * dpr), canvas.height - py)
      if (pw <= 0 || ph <= 0) return { totalDark: 0, centroidX: 0, centroidY: 0 }

      const data = ctx.getImageData(px, py, pw, ph).data
      let totalDark = 0, sumX = 0, sumY = 0
      for (let row = 0; row < ph; row++) {
        for (let col = 0; col < pw; col++) {
          const idx = (row * pw + col) * 4
          if (data[idx] < 80 && data[idx + 1] < 80 && data[idx + 2] < 80) {
            totalDark++
            sumX += col
            sumY += row
          }
        }
      }
      return {
        totalDark,
        centroidX: totalDark > 0 ? sumX / totalDark : 0,
        centroidY: totalDark > 0 ? sumY / totalDark : 0,
      }
    }, { x: bs.x - pad, y: bs.y - pad, w: bs.w + pad * 2, h: bs.h + pad * 2 })

    // Enter edit mode
    await page.mouse.dblclick(target!.clientX, target!.clientY)
    await page.waitForTimeout(300)
    await expect(page.locator('textarea')).toBeAttached({ timeout: 3000 })

    // Capture dark pixel positions AFTER entering edit mode (no typing)
    const afterPixels = await page.evaluate(({ x, y, w, h }) => {
      const canvas = document.querySelector('canvas')!
      const ctx = canvas.getContext('2d')!
      const dpr = window.devicePixelRatio || 1
      const px = Math.max(0, Math.round(x * dpr))
      const py = Math.max(0, Math.round(y * dpr))
      const pw = Math.min(Math.round(w * dpr), canvas.width - px)
      const ph = Math.min(Math.round(h * dpr), canvas.height - py)
      if (pw <= 0 || ph <= 0) return { totalDark: 0, centroidX: 0, centroidY: 0 }

      const data = ctx.getImageData(px, py, pw, ph).data
      let totalDark = 0, sumX = 0, sumY = 0
      for (let row = 0; row < ph; row++) {
        for (let col = 0; col < pw; col++) {
          const idx = (row * pw + col) * 4
          if (data[idx] < 80 && data[idx + 1] < 80 && data[idx + 2] < 80) {
            totalDark++
            sumX += col
            sumY += row
          }
        }
      }
      return {
        totalDark,
        centroidX: totalDark > 0 ? sumX / totalDark : 0,
        centroidY: totalDark > 0 ? sumY / totalDark : 0,
      }
    }, { x: bs.x - pad, y: bs.y - pad, w: bs.w + pad * 2, h: bs.h + pad * 2 })

    // Text rendering should be mostly unchanged (cursor adds only ~2px line)
    const darkDiff = Math.abs(afterPixels.totalDark - beforePixels.totalDark)
    const darkRatio = darkDiff / Math.max(1, beforePixels.totalDark)
    console.log(`Dark pixels — before: ${beforePixels.totalDark}, after: ${afterPixels.totalDark}, change: ${(darkRatio * 100).toFixed(1)}%`)

    // After entering edit mode with no content changes, editingBlockDirty is false,
    // so the text is NOT re-rendered via TextRenderer — it stays as PDF background.
    // The editing highlight (semi-transparent bg) is drawn over the text, which may
    // reduce dark pixel count. For small blocks, even the cursor adds measurable change.
    // Allow up to 35% for the editing highlight effect + cursor on small text blocks.
    expect(darkRatio, 'Text pixels changed too much on edit entry — possible re-render or font change').toBeLessThan(0.35)

    // Centroid should not shift significantly
    const centroidDx = Math.abs(afterPixels.centroidX - beforePixels.centroidX)
    const centroidDy = Math.abs(afterPixels.centroidY - beforePixels.centroidY)
    console.log(`Centroid shift — dx: ${centroidDx.toFixed(2)}px, dy: ${centroidDy.toFixed(2)}px`)
    // Note: editing highlight background may shift centroid on small blocks.
    // Allow more tolerance for small blocks (< 200 dark pixels).
    const centroidThreshold = beforePixels.totalDark < 200 ? 10 : 3
    expect(centroidDx, 'Text shifted horizontally').toBeLessThan(centroidThreshold)
    expect(centroidDy, 'Text shifted vertically').toBeLessThan(centroidThreshold)

    // Now verify that cursor IS visible (internal position check)
    const cursorPos = await page.evaluate(() => {
      const core = (window as any).__PDFINE_EDITOR_CORE__
      if (!core) return null
      const editEngine = core.getEditEngine()
      if (!editEngine?.isEditing()) return null
      return editEngine.getCursorPosition()
    })
    expect(cursorPos, 'Cursor position must not be null in edit mode').not.toBeNull()
    console.log(`Cursor position: x=${cursorPos!.x.toFixed(2)}, y=${cursorPos!.y.toFixed(2)}, h=${cursorPos!.height.toFixed(2)}`)

    // Verify cursor is within the block bounds
    const blockBounds = await page.evaluate(({ blockId }) => {
      const core = (window as any).__PDFINE_EDITOR_CORE__
      if (!core) return null
      const pg = core.getPageModel(core.getCurrentPage())
      const el = pg?.elements.find((e: any) => e.id === blockId)
      return el ? el.bounds : null
    }, { blockId: target!.blockId })

    if (blockBounds) {
      expect(cursorPos!.x, 'Cursor X should be within block bounds').toBeGreaterThanOrEqual(blockBounds.x - 2)
      expect(cursorPos!.x, 'Cursor X should be within block bounds').toBeLessThanOrEqual(blockBounds.x + blockBounds.width + 2)
      expect(cursorPos!.y, 'Cursor Y should be within block bounds').toBeGreaterThanOrEqual(blockBounds.y - 2)
      expect(cursorPos!.y, 'Cursor Y should be within block bounds').toBeLessThanOrEqual(blockBounds.y + blockBounds.height + 2)
    }
  })
})
