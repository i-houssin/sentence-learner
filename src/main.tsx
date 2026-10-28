import { Component, StrictMode, useEffect } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom'
import { AppProvider } from './hooks/useApp'
import Shell from './components/Shell'
import {
  AboutPage,
  CollectionPage,
  CoursePage,
  LearningPage,
  LibraryPage,
  NotFoundPage,
  SettingsPage,
} from './components/Pages'
import PracticePage from './components/Practice'
import { downloadFile } from './lib/imports'
import { STORAGE_KEY } from './lib/storage'
import './styles.css'

class AppErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Sentence interface error', error, info.componentStack)
  }
  render() {
    if (!this.state.failed) return this.props.children
    return (
      <main className="error-page">
        <h1>Let’s take a breath.</h1>
        <p>Something in the interface went wrong. Your saved progress has not been cleared.</p>
        <button className="button primary" onClick={() => window.location.reload()}>
          Reload Sentence
        </button>
        <button
          className="button secondary"
          onClick={() => {
            try {
              downloadFile('sentence-recovery.txt', localStorage.getItem(STORAGE_KEY) ?? '', 'text/plain')
            } catch {
              /* Storage can be disabled by the browser. */
            }
          }}
        >
          Download saved data
        </button>
      </main>
    )
  }
}
function PracticeRoute({ collection }: { collection?: 'review' | 'saved' }) {
  const location = useLocation()
  return <PracticePage key={location.key} collection={collection} />
}
function RouteEffects() {
  const location = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
    document.title = location.pathname.startsWith('/practice')
      ? 'Practice — Sentence'
      : 'Sentence — Hear it. Type it. Learn it.'
  }, [location.key, location.pathname])
  return null
}
function App() {
  return (
    <BrowserRouter>
      <RouteEffects />
      <Routes>
        <Route path="/" element={<Shell />}>
          <Route index element={<LibraryPage />} />
          <Route path="course/:courseId" element={<CoursePage />} />
          <Route path="learning" element={<LearningPage />} />
          <Route path="review" element={<CollectionPage key="review" kind="review" />} />
          <Route path="saved" element={<CollectionPage key="saved" kind="saved" />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="about" element={<AboutPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
        <Route path="practice/review" element={<PracticeRoute collection="review" />} />
        <Route path="practice/saved" element={<PracticeRoute collection="saved" />} />
        <Route path="practice/:courseId/:chapterId" element={<PracticeRoute />} />
      </Routes>
    </BrowserRouter>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary>
      <AppProvider>
        <App />
      </AppProvider>
    </AppErrorBoundary>
  </StrictMode>,
)
