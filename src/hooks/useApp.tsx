import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { AppState, AnswerRecord, Course, PracticeItem, Settings } from '../types'
import { builtInCourses, chapterKey, flattenCourses } from '../data/catalog'
import { emptyState, loadState, parseBackup, STORAGE_KEY } from '../lib/storage'

export type AnswerMetrics = Pick<
  AnswerRecord,
  'durationMs' | 'characters' | 'typedCharacters' | 'errors' | 'attempts' | 'assisted' | 'review'
>
interface AppContextValue {
  state: AppState
  courses: Course[]
  items: PracticeItem[]
  storageError: string
  updateSettings: (settings: Partial<Settings>) => void
  setLastPractice: (courseId: string, chapterId: string) => void
  commitAnswer: (item: PracticeItem, metrics: AnswerMetrics) => void
  markMistake: (item: PracticeItem) => void
  saveCursor: (item: PracticeItem, nextIndex: number) => void
  toggleFavorite: (key: string) => void
  addCourse: (course: Course) => void
  restore: (contents: string) => void
  reset: () => void
}
const AppContext = createContext<AppContextValue | null>(null)
export function AppProvider({ children }: { children: ReactNode }) {
  const [initial] = useState(loadState)
  const [state, setState] = useState(initial.state),
    [storageError, setStorageError] = useState(initial.error)
  const corrupt = useRef(initial.corrupt)
  useEffect(() => {
    if (corrupt.current) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
      setStorageError('')
    } catch {
      setStorageError('Your browser could not save progress. Keep this tab open and export a backup in Settings.')
    }
  }, [state])
  useEffect(() => {
    const changed = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY && event.newValue) {
        try {
          const incoming = parseBackup(event.newValue)
          corrupt.current = false
          setState(incoming)
        } catch {
          setStorageError(
            'Another tab changed saved data to an unreadable format. Export your current progress before reloading.',
          )
        }
      }
    }
    window.addEventListener('storage', changed)
    return () => window.removeEventListener('storage', changed)
  }, [])
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () =>
      document.documentElement.classList.toggle(
        'dark',
        state.settings.theme === 'dark' || (state.settings.theme === 'system' && media.matches),
      )
    apply()
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [state.settings.theme])
  const courses = useMemo(() => [...builtInCourses, ...state.customCourses], [state.customCourses])
  const items = useMemo(() => flattenCourses(courses), [courses])
  const value: AppContextValue = {
    state,
    courses,
    items,
    storageError,
    updateSettings: (settings) =>
      setState((previous) => ({ ...previous, settings: { ...previous.settings, ...settings } })),
    setLastPractice: (courseId, chapterId) =>
      setState((previous) =>
        previous.lastPractice?.courseId === courseId && previous.lastPractice.chapterId === chapterId
          ? previous
          : { ...previous, lastPractice: { courseId, chapterId } },
      ),
    markMistake: (item) =>
      setState((previous) => ({
        ...previous,
        mistakes: {
          ...previous.mistakes,
          [item.key]: {
            key: item.key,
            courseId: item.course.id,
            chapterId: item.chapter.id,
            sentenceId: item.sentence.id,
            count: (previous.mistakes[item.key]?.count ?? 0) + 1,
            updatedAt: new Date().toISOString(),
          },
        },
      })),
    saveCursor: (item, cursor) =>
      setState((previous) => {
        const key = chapterKey(item.course, item.chapter),
          progress = previous.progress[key] ?? { completed: [], cursor: 0, updatedAt: '' }
        return {
          ...previous,
          progress: { ...previous.progress, [key]: { ...progress, cursor, updatedAt: new Date().toISOString() } },
        }
      }),
    commitAnswer: (item, metrics) =>
      setState((previous) => {
        const key = chapterKey(item.course, item.chapter),
          old = previous.progress[key] ?? { completed: [], cursor: 0, updatedAt: '' }
        const completed = [...new Set([...old.completed, item.sentence.id])],
          now = new Date().toISOString()
        const mistakes = { ...previous.mistakes }
        if (metrics.review && metrics.errors === 0 && !metrics.assisted) delete mistakes[item.key]
        else if (metrics.errors > 0 && !mistakes[item.key])
          mistakes[item.key] = {
            key: item.key,
            courseId: item.course.id,
            chapterId: item.chapter.id,
            sentenceId: item.sentence.id,
            count: 1,
            updatedAt: now,
          }
        const record: AnswerRecord = {
          ...metrics,
          id: crypto.randomUUID(),
          key: item.key,
          courseId: item.course.id,
          chapterId: item.chapter.id,
          at: now,
        }
        return {
          ...previous,
          progress: {
            ...previous.progress,
            [key]: {
              completed,
              cursor:
                (item.chapter.sentences.findIndex((s) => s.id === item.sentence.id) + 1) %
                item.chapter.sentences.length,
              updatedAt: now,
              ...(completed.length === item.chapter.sentences.length ? { completedAt: old.completedAt ?? now } : {}),
            },
          },
          records: [...previous.records, record].slice(-5000),
          mistakes,
        }
      }),
    toggleFavorite: (key) =>
      setState((previous) => ({
        ...previous,
        favorites: previous.favorites.includes(key)
          ? previous.favorites.filter((k) => k !== key)
          : [...previous.favorites, key],
      })),
    addCourse: (course) =>
      setState((previous) => {
        if (previous.customCourses.length >= 30) throw new Error('You can keep up to 30 custom courses.')
        return { ...previous, customCourses: [...previous.customCourses, course] }
      }),
    restore: (contents) => {
      const restored = parseBackup(contents)
      corrupt.current = false
      setStorageError('')
      setState(restored)
    },
    reset: () => {
      corrupt.current = false
      setStorageError('')
      setState(emptyState())
    },
  }
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
export function useApp() {
  const value = useContext(AppContext)
  if (!value) throw new Error('Sentence requires AppProvider.')
  return value
}
