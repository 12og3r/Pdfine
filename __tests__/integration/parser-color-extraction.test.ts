/**
 * Integration test: verifies that PDF text fill colors are correctly extracted
 * from the operator list and assigned to RawTextItems.
 *
 * Bug background: PdfParser used to hardcode color = (0,0,0) for every text
 * item, ignoring the actual fill colors from the PDF content stream. This made
 * edit-mode text rendering disagree with the pdfjs-rastered original whenever
 * the PDF used colored text (e.g. titles in #2e74b5).
 */
import { describe, it, expect, beforeAll } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs'

const workerPath = path.resolve(__dirname, '../../node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs')
pdfjsLib.GlobalWorkerOptions.workerSrc = workerPath

const PDF_PATH = path.resolve(__dirname, '../../example/example_en.pdf')

async function loadPdf(data: ArrayBuffer) {
  const copy = data.slice(0)
  return pdfjsLib.getDocument({
    data: new Uint8Array(copy),
    useWorkerFetch: false,
    isEvalSupported: false,
    useSystemFonts: false,
  }).promise
}

describe('Parser color extraction (example_en.pdf)', () => {
  let pdfData: ArrayBuffer

  beforeAll(() => {
    if (!fs.existsSync(PDF_PATH)) {
      throw new Error(`example_en.pdf not found at ${PDF_PATH}`)
    }
    const buffer = fs.readFileSync(PDF_PATH)
    pdfData = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
  })

  it('extracts the title color (#2e74b5) for "Sample PDF"', async () => {
    const { extractTextColorEvents, splitTextItemsByColor } = await import('../../src/core/parser/TextColorExtractor')

    const pdfDoc = await loadPdf(pdfData)
    const page = await pdfDoc.getPage(1)
    const opList = await page.getOperatorList()
    const tc = await page.getTextContent()

    const events = extractTextColorEvents(opList, pdfjsLib.OPS)
    expect(events.length).toBeGreaterThan(0)

    const split = splitTextItemsByColor(tc.items as Array<{ str: string }>, events)

    // Find the segment containing "Sample PDF"
    const sample = split.find((s) => s.text === 'Sample PDF')
    expect(sample, 'expected a segment with text "Sample PDF"').toBeDefined()
    expect(sample!.color).toEqual({ r: 46, g: 116, b: 181, a: 1 })
  })

  it('extracts the inline accent color (#5b9bd5) for "PDFObject"', async () => {
    const { extractTextColorEvents, splitTextItemsByColor } = await import('../../src/core/parser/TextColorExtractor')

    const pdfDoc = await loadPdf(pdfData)
    const page = await pdfDoc.getPage(1)
    const opList = await page.getOperatorList()
    const tc = await page.getTextContent()

    const events = extractTextColorEvents(opList, pdfjsLib.OPS)
    const split = splitTextItemsByColor(tc.items as Array<{ str: string }>, events)

    // The PDF merges "Created for testing PDFObject" into one textContent item;
    // splitTextItemsByColor must split this back into a black segment and a
    // colored segment using the operator list color events.
    const pdfObject = split.find((s) => s.text === 'PDFObject')
    expect(pdfObject, 'expected a "PDFObject" colored segment').toBeDefined()
    expect(pdfObject!.color).toEqual({ r: 91, g: 155, b: 213, a: 1 })
  })

  it('default color stays black for body text', async () => {
    const { extractTextColorEvents, splitTextItemsByColor } = await import('../../src/core/parser/TextColorExtractor')

    const pdfDoc = await loadPdf(pdfData)
    const page = await pdfDoc.getPage(1)
    const opList = await page.getOperatorList()
    const tc = await page.getTextContent()

    const events = extractTextColorEvents(opList, pdfjsLib.OPS)
    const split = splitTextItemsByColor(tc.items as Array<{ str: string }>, events)

    // Body text "Created for testing " should remain black
    const created = split.find((s) => s.text.startsWith('Created for testing'))
    expect(created, 'expected a "Created for testing" segment').toBeDefined()
    expect(created!.color).toEqual({ r: 0, g: 0, b: 0, a: 1 })
  })
})
