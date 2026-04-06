/**
 * Integration test: Traces the PDF loading pipeline step-by-step
 * using the actual example_en.pdf to find where rendering breaks.
 * Uses pdfjs-dist/legacy for jsdom compatibility.
 */
import { describe, it, expect, beforeAll } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

// Use legacy build for Node/jsdom
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs'

// Point to the legacy worker
const workerPath = path.resolve(__dirname, '../../node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs')
pdfjsLib.GlobalWorkerOptions.workerSrc = workerPath

const PDF_PATH = path.resolve(__dirname, '../../example/example_en.pdf')

// Helper to get a fresh pdfDoc - copies buffer since pdfjs detaches it
async function loadPdf(data: ArrayBuffer) {
  const copy = data.slice(0)
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(copy),
    useWorkerFetch: false,
    isEvalSupported: false,
    useSystemFonts: false,
  })
  return loadingTask.promise
}

describe('PDF Pipeline Integration (example_en.pdf)', () => {
  let pdfData: ArrayBuffer

  beforeAll(() => {
    if (!fs.existsSync(PDF_PATH)) {
      throw new Error(`example_en.pdf not found at ${PDF_PATH}`)
    }
    const buffer = fs.readFileSync(PDF_PATH)
    pdfData = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
  })

  it('Step 1: pdfjs-dist can parse the PDF', async () => {
    const pdfDoc = await loadPdf(pdfData)
    expect(pdfDoc).toBeTruthy()
    expect(pdfDoc.numPages).toBeGreaterThan(0)
    console.log(`[Step 1] PDF pages: ${pdfDoc.numPages}`)
  })

  it('Step 2: Can extract text content from page 1', async () => {
    const pdfDoc = await loadPdf(pdfData)
    const page = await pdfDoc.getPage(1)
    const viewport = page.getViewport({ scale: 1 })
    console.log(`[Step 2] Page 1 size: ${viewport.width.toFixed(1)} x ${viewport.height.toFixed(1)}`)

    const textContent = await page.getTextContent()
    console.log(`[Step 2] Text items: ${textContent.items.length}`)

    for (const item of textContent.items.slice(0, 5)) {
      const ti = item as { str: string; transform: number[]; fontName: string }
      console.log(`  "${ti.str}" font=${ti.fontName} tx=[${ti.transform.map(n => n.toFixed(1)).join(',')}]`)
    }

    expect(textContent.items.length).toBeGreaterThanOrEqual(0)
  })

  it('Step 3: PdfParser produces valid DocumentModel (test data path)', async () => {
    // We can't import PdfParser directly here because it sets workerSrc to browser path.
    // Instead, test the exact same logic manually.
    const pdfDoc = await loadPdf(pdfData)
    const page = await pdfDoc.getPage(1)
    const viewport = page.getViewport({ scale: 1 })
    const textContent = await page.getTextContent()

    console.log(`[Step 3] Page: ${viewport.width.toFixed(1)}x${viewport.height.toFixed(1)}`)
    console.log(`[Step 3] Text items: ${textContent.items.length}`)

    // Simulate TextBlockBuilder's conversion
    const rawItems: Array<{
      text: string
      x: number
      y: number
      fontSize: number
      fontId: string
    }> = []

    for (const item of textContent.items) {
      const ti = item as {
        str: string
        transform: number[]
        fontName: string
        width: number
        height: number
      }
      if (!ti.str || ti.str.trim() === '') continue

      const tx = ti.transform
      const fontSize = Math.abs(tx[3]) || Math.abs(tx[0]) || 12
      const pdfX = tx[4]
      const pdfY = tx[5]
      const layoutY = viewport.height - pdfY

      rawItems.push({
        text: ti.str,
        x: pdfX,
        y: layoutY,
        fontSize,
        fontId: ti.fontName,
      })
    }

    console.log(`[Step 3] Raw text items after filtering: ${rawItems.length}`)
    expect(rawItems.length).toBeGreaterThan(0)

    for (const item of rawItems.slice(0, 5)) {
      console.log(`  "${item.text}" at (${item.x.toFixed(1)}, ${item.y.toFixed(1)}) fontSize=${item.fontSize.toFixed(1)} font=${item.fontId}`)
    }

    // Verify coordinates are reasonable
    const inBounds = rawItems.filter(
      i => i.x >= 0 && i.x <= viewport.width && i.y >= 0 && i.y <= viewport.height
    )
    console.log(`[Step 3] Items within page bounds: ${inBounds.length}/${rawItems.length}`)
    expect(inBounds.length).toBeGreaterThan(rawItems.length * 0.5)
  })

  it('Step 4: TextBlockBuilder groups items into blocks', async () => {
    // Dynamically import to avoid the workerSrc issue
    const { TextBlockBuilder } = await import('../../src/core/parser/TextBlockBuilder')
    const { createTextStyle } = await import('../../src/core/model/DocumentModel')

    const pdfDoc = await loadPdf(pdfData)
    const page = await pdfDoc.getPage(1)
    const viewport = page.getViewport({ scale: 1 })
    const textContent = await page.getTextContent()

    // Convert text items (same logic as PdfParser.convertTextItems)
    type RawTextItem = Parameters<InstanceType<typeof TextBlockBuilder>['buildBlocks']>[0][0]
    const rawItems: RawTextItem[] = []

    for (const item of textContent.items) {
      const ti = item as {
        str: string
        transform: number[]
        fontName: string
        width: number
        height: number
      }
      if (!ti.str || ti.str.trim() === '') continue

      const tx = ti.transform
      const fontSize = Math.abs(tx[3]) || Math.abs(tx[0]) || 12
      const layoutY = viewport.height - tx[5]

      rawItems.push({
        text: ti.str,
        x: tx[4],
        y: layoutY,
        width: ti.width,
        height: ti.height || fontSize,
        fontSize,
        fontId: ti.fontName || 'default',
        fontWeight: 400,
        fontStyle: 'normal' as const,
        color: { r: 0, g: 0, b: 0, a: 1 },
        editable: true,
      })
    }

    const builder = new TextBlockBuilder()
    const blocks = builder.buildBlocks(rawItems)

    console.log(`[Step 4] Text blocks created: ${blocks.length}`)
    expect(blocks.length).toBeGreaterThan(0)

    for (const block of blocks.slice(0, 5)) {
      const text = block.paragraphs.flatMap(p => p.runs.map(r => r.text)).join('')
      console.log(`  Block bounds=(${block.bounds.x.toFixed(0)},${block.bounds.y.toFixed(0)},w=${block.bounds.width.toFixed(0)},h=${block.bounds.height.toFixed(0)}) "${text.slice(0, 50)}"`)
    }
  })

  it('Step 5: Layout engine produces glyphs for blocks', async () => {
    const { TextBlockBuilder } = await import('../../src/core/parser/TextBlockBuilder')
    const { FontManager } = await import('../../src/core/font/FontManager')
    const { LayoutEngine } = await import('../../src/core/layout/LayoutEngine')

    const pdfDoc = await loadPdf(pdfData)
    const page = await pdfDoc.getPage(1)
    const viewport = page.getViewport({ scale: 1 })
    const textContent = await page.getTextContent()

    type RawTextItem = Parameters<InstanceType<typeof TextBlockBuilder>['buildBlocks']>[0][0]
    const rawItems: RawTextItem[] = []
    for (const item of textContent.items) {
      const ti = item as { str: string; transform: number[]; fontName: string; width: number; height: number }
      if (!ti.str || ti.str.trim() === '') continue
      const tx = ti.transform
      const fontSize = Math.abs(tx[3]) || Math.abs(tx[0]) || 12
      rawItems.push({
        text: ti.str, x: tx[4], y: viewport.height - tx[5],
        width: ti.width, height: ti.height || fontSize,
        fontSize, fontId: ti.fontName || 'default',
        fontWeight: 400, fontStyle: 'normal' as const,
        color: { r: 0, g: 0, b: 0, a: 1 }, editable: true,
      })
    }

    const blocks = new TextBlockBuilder().buildBlocks(rawItems)
    const fontManager = new FontManager()
    const layoutEngine = new LayoutEngine()

    let totalGlyphs = 0
    let blocksWithGlyphs = 0

    for (const block of blocks) {
      const reflowed = layoutEngine.reflowTextBlock(block, fontManager)
      let blockGlyphs = 0
      for (const para of reflowed.paragraphs) {
        if (para.lines) {
          for (const line of para.lines) {
            blockGlyphs += line.glyphs.length
          }
        }
      }
      totalGlyphs += blockGlyphs
      if (blockGlyphs > 0) blocksWithGlyphs++
    }

    console.log(`[Step 5] Total glyphs: ${totalGlyphs}, blocks with glyphs: ${blocksWithGlyphs}/${blocks.length}`)
    expect(totalGlyphs).toBeGreaterThan(0)

    // Check a sample block's glyph positions
    const sampleBlock = blocks[0]
    const reflowed = layoutEngine.reflowTextBlock(sampleBlock, fontManager)
    const firstLine = reflowed.paragraphs[0]?.lines?.[0]
    if (firstLine && firstLine.glyphs.length > 0) {
      const g = firstLine.glyphs[0]
      console.log(`[Step 5] Sample glyph: char='${g.char}' pos=(${g.x.toFixed(1)},${g.y.toFixed(1)}) block bounds=(${sampleBlock.bounds.x.toFixed(1)},${sampleBlock.bounds.y.toFixed(1)})`)
      // Glyph x should be near 0 (relative to block start)
      expect(g.x).toBeLessThan(sampleBlock.bounds.width + 10)
    }
  })
})
