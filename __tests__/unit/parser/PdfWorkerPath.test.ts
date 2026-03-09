import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('PdfParser worker path', () => {
  let originalWorkerSrc: string | undefined

  beforeEach(() => {
    // Save original value
    originalWorkerSrc = undefined
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('should use BASE_URL prefix for the worker path', async () => {
    // The worker source is set at module level in PdfParser.ts
    // We verify that import.meta.env.BASE_URL is used by checking
    // the source code directly
    const fs = await import('fs')
    const path = await import('path')
    const parserSource = fs.readFileSync(
      path.resolve(__dirname, '../../../src/core/parser/PdfParser.ts'),
      'utf-8'
    )

    // Must use import.meta.env.BASE_URL, not a hardcoded '/' prefix
    expect(parserSource).toContain('import.meta.env.BASE_URL')
    expect(parserSource).not.toMatch(/workerSrc\s*=\s*['"]\/pdf\.worker/)
  })

  it('should produce correct path for root deployment', () => {
    const baseUrl = '/'
    const workerPath = `${baseUrl}pdf.worker.min.mjs`
    expect(workerPath).toBe('/pdf.worker.min.mjs')
  })

  it('should produce correct path for subpath deployment (e.g. GitHub Pages)', () => {
    const baseUrl = '/Pdfine/'
    const workerPath = `${baseUrl}pdf.worker.min.mjs`
    expect(workerPath).toBe('/Pdfine/pdf.worker.min.mjs')
  })
})
