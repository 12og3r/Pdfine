import { describe, it, expect } from 'vitest'
import { CoordinateTransformer } from '../../../src/core/infra/CoordinateTransformer'

describe('CoordinateTransformer', () => {
  const pageWidth = 612
  const pageHeight = 792

  it('should convert layout to PDF coordinates (Y flip)', () => {
    const ct = new CoordinateTransformer(pageWidth, pageHeight, 1, 1)

    // Top-left in layout = bottom-left in PDF (but top of page)
    const { px, py } = ct.layoutToPdf(0, 0)
    expect(px).toBe(0)
    expect(py).toBe(792)

    // Bottom-left in layout = bottom-left in PDF (but bottom of page)
    const { py: py2 } = ct.layoutToPdf(0, 792)
    expect(py2).toBe(0)
  })

  it('should convert PDF to layout coordinates (Y flip)', () => {
    const ct = new CoordinateTransformer(pageWidth, pageHeight, 1, 1)

    const { x, y } = ct.pdfToLayout(100, 692)
    expect(x).toBe(100)
    expect(y).toBe(100) // 792 - 692
  })

  it('should roundtrip layout → PDF → layout', () => {
    const ct = new CoordinateTransformer(pageWidth, pageHeight, 1, 1)

    const origX = 150
    const origY = 300
    const { px, py } = ct.layoutToPdf(origX, origY)
    const { x, y } = ct.pdfToLayout(px, py)

    expect(x).toBe(origX)
    expect(y).toBe(origY)
  })

  it('should apply scale to layout → canvas conversion', () => {
    const ct = new CoordinateTransformer(pageWidth, pageHeight, 2, 1)

    const { cx, cy } = ct.layoutToCanvas(100, 200)
    expect(cx).toBe(200) // 100 * 2
    expect(cy).toBe(400) // 200 * 2
  })

  it('should reverse scale in canvas → layout conversion', () => {
    const ct = new CoordinateTransformer(pageWidth, pageHeight, 2, 1)

    const { x, y } = ct.canvasToLayout(200, 400)
    expect(x).toBe(100)
    expect(y).toBe(200)
  })

  it('should handle screen to layout with scroll', () => {
    const ct = new CoordinateTransformer(pageWidth, pageHeight, 1.5, 1)

    const { x, y } = ct.screenToLayout(150, 300, 0, 0)
    expect(x).toBeCloseTo(100, 5) // 150 / 1.5
    expect(y).toBeCloseTo(200, 5) // 300 / 1.5

    const { x: x2, y: y2 } = ct.screenToLayout(150, 300, 75, 150)
    expect(x2).toBeCloseTo(150, 5) // (150 + 75) / 1.5
    expect(y2).toBeCloseTo(300, 5) // (300 + 150) / 1.5
  })

  it('should update viewport parameters', () => {
    const ct = new CoordinateTransformer()
    ct.updateViewport(2, 2, 800, 600)

    expect(ct.getScale()).toBe(2)
    expect(ct.getDpr()).toBe(2)
    expect(ct.getPageWidth()).toBe(800)
    expect(ct.getPageHeight()).toBe(600)
  })
})
