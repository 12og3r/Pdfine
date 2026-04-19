import { useState, useEffect } from 'react'
import type { IEditorCore } from '../../core/interfaces/IEditorCore'
import { PaperTopBar } from './PaperTopBar'
import { PaperHero } from './PaperHero'
import { PaperBento } from './PaperBento'
import { PaperPrivacyTeaser } from './PaperPrivacyTeaser'
import { PaperPrivacy } from './PaperPrivacy'
import { UploadWidget } from './UploadWidget'

interface LandingPageProps {
  editorCore: IEditorCore
}

export function LandingPage({ editorCore }: LandingPageProps) {
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState<'landing' | 'privacy'>('landing')

  useEffect(() => {
    const prevent = (e: DragEvent) => e.preventDefault()
    document.addEventListener('dragover', prevent)
    document.addEventListener('drop', prevent)
    return () => {
      document.removeEventListener('dragover', prevent)
      document.removeEventListener('drop', prevent)
    }
  }, [])

  useEffect(() => {
    if (page === 'privacy') window.scrollTo({ top: 0, behavior: 'auto' })
  }, [page])

  return (
    <div className="paper-theme w-full min-h-full overflow-y-auto">
      <PaperTopBar onBrandClick={() => setPage('landing')} />

      {page === 'landing' ? (
        <>
          <PaperHero
            onReadMore={() => setPage('privacy')}
            uploadSlot={
              <UploadWidget
                editorCore={editorCore}
                onLoadStart={() => setError(null)}
                onError={setError}
                errorMessage={error}
              />
            }
          />
          <PaperBento />
          <PaperPrivacyTeaser onReadMore={() => setPage('privacy')} />
        </>
      ) : (
        <PaperPrivacy onBack={() => setPage('landing')} />
      )}
    </div>
  )
}
