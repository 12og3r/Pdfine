/**
 * Smoke test for password-protected export. Asks `@cantoo/pdf-lib` to encrypt
 * a freshly-created doc and verifies the output bytes carry the standard PDF
 * `/Encrypt` marker. Does NOT attempt to round-trip through pdfjs (that lives
 * in the playwright suite) — the goal here is to catch regressions if the
 * fork's `encrypt()` API changes.
 */
import { describe, it, expect } from 'vitest'
import { PDFDocument } from '@cantoo/pdf-lib'

describe('export encryption (@cantoo/pdf-lib)', () => {
  it('produces an encrypted PDF when pdfDoc.encrypt + save are invoked', async () => {
    const pdfDoc = await PDFDocument.create()
    pdfDoc.addPage([300, 300]).drawText('hello', { x: 40, y: 150, size: 24 })

    pdfDoc.encrypt({ userPassword: 'secret', ownerPassword: 'secret' })
    const encrypted = await pdfDoc.save()

    // Smoke check: encrypted PDF contains an `/Encrypt` entry in its trailer
    // dictionary. An unencrypted save never does.
    const text = new TextDecoder('latin1').decode(encrypted)
    expect(text).toContain('/Encrypt')
  })

  it('produces a normal PDF (no /Encrypt) when encrypt() is not called', async () => {
    const pdfDoc = await PDFDocument.create()
    pdfDoc.addPage([300, 300]).drawText('hello', { x: 40, y: 150, size: 24 })

    const bytes = await pdfDoc.save()
    const text = new TextDecoder('latin1').decode(bytes)
    expect(text).not.toContain('/Encrypt')
  })
})
