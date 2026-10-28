import type { AppState, AnswerRecord, ChapterProgress, Course, Mistake, Settings } from '../types'
import { builtInCourses, chapterKey, flattenCourses } from '../data/catalog'
import { validateCourse } from './imports'
import clamp from '../upstream/clamp'

export const STORAGE_KEY = 'sentence-learner:v1'
export const defaultSettings: Settings = {
  mode: 'read',
  rate: 0.9,
  voice: '',
  repeats: 1,
  autoPlay: false,
  strictCase: false,
  strictPunctuation: false,
  theme: 'system',
  dailyGoal: 10,
}
export function emptyState(): AppState {
  return {
    version: 1,
    settings: { ...defaultSettings },
    progress: {},
    records: [],
    mistakes: {},
    favorites: [],
    customCourses: [],
    lastPractice: null,
  }
}
const obj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)
const finite = (v: unknown, fallback = 0, max = 1e9) =>
  typeof v === 'number' && Number.isFinite(v) ? clamp(v, 0, max) : fallback
const validDate = (v: unknown): v is string => typeof v === 'string' && v.length < 40 && !Number.isNaN(Date.parse(v))

export function decodeState(value: unknown): AppState {
  if (
    !obj(value) ||
    value.version !== 1 ||
    !obj(value.settings) ||
    !obj(value.progress) ||
    !Array.isArray(value.records) ||
    !obj(value.mistakes) ||
    !Array.isArray(value.favorites) ||
    !Array.isArray(value.customCourses)
  )
    throw new Error('This is not a compatible Sentence progress backup (version 1).')
  if (value.customCourses.length > 30 || value.records.length > 5000 || Object.keys(value.progress).length > 6000)
    throw new Error('This backup is too large to restore safely.')
  const seen = new Set(builtInCourses.map((c) => c.id))
  const customCourses: Course[] = value.customCourses.map((raw) => {
    const course = validateCourse(raw)
    if (seen.has(course.id)) throw new Error('Backup contains conflicting course IDs.')
    seen.add(course.id)
    return { ...course, custom: true }
  })
  const courses = [...builtInCourses, ...customCourses],
    items = flattenCourses(courses)
  const validKeys = new Set(items.map((i) => i.key))
  const chapterMap = new Map(courses.flatMap((c) => c.chapters.map((ch) => [chapterKey(c, ch), ch] as const)))
  const settings = value.settings
  const progress: Record<string, ChapterProgress> = {}
  for (const [key, raw] of Object.entries(value.progress)) {
    const chapter = chapterMap.get(key)
    if (!chapter || !obj(raw) || !Array.isArray(raw.completed)) continue
    const validIds = new Set(chapter.sentences.map((s) => s.id))
    progress[key] = {
      completed: [...new Set(raw.completed.filter((id): id is string => typeof id === 'string' && validIds.has(id)))],
      cursor: Math.floor(finite(raw.cursor, 0, chapter.sentences.length - 1)),
      updatedAt: validDate(raw.updatedAt) ? raw.updatedAt : new Date().toISOString(),
      ...(validDate(raw.completedAt) ? { completedAt: raw.completedAt } : {}),
    }
  }
  const records: AnswerRecord[] = value.records
    .filter(obj)
    .filter(
      (r) =>
        validKeys.has(String(r.key)) &&
        validDate(r.at) &&
        typeof r.courseId === 'string' &&
        typeof r.chapterId === 'string',
    )
    .map((r) => ({
      id: String(r.id).slice(0, 100),
      key: String(r.key),
      courseId: String(r.courseId),
      chapterId: String(r.chapterId),
      at: String(r.at),
      durationMs: finite(r.durationMs, 0, 3600000),
      characters: finite(r.characters, 0, 1000),
      typedCharacters: finite(r.typedCharacters, 0, 10000),
      errors: finite(r.errors, 0, 10000),
      attempts: finite(r.attempts, 1, 10000),
      assisted: r.assisted === true,
      review: r.review === true,
    }))
  const mistakes: Record<string, Mistake> = {}
  for (const item of items) {
    const raw = value.mistakes[item.key]
    if (obj(raw))
      mistakes[item.key] = {
        key: item.key,
        courseId: item.course.id,
        chapterId: item.chapter.id,
        sentenceId: item.sentence.id,
        count: Math.max(1, Math.floor(finite(raw.count, 1, 100000))),
        updatedAt: validDate(raw.updatedAt) ? raw.updatedAt : new Date().toISOString(),
      }
  }
  let lastPractice = null
  if (obj(value.lastPractice) && chapterMap.has(`${value.lastPractice.courseId}/${value.lastPractice.chapterId}`))
    lastPractice = { courseId: String(value.lastPractice.courseId), chapterId: String(value.lastPractice.chapterId) }
  return {
    version: 1,
    settings: {
      mode: ['read', 'hints', 'dictation'].includes(String(settings.mode))
        ? (settings.mode as Settings['mode'])
        : 'read',
      rate: clamp(finite(settings.rate, 0.9), 0.5, 2),
      voice: typeof settings.voice === 'string' ? settings.voice.slice(0, 500) : '',
      repeats: Math.floor(clamp(finite(settings.repeats, 1), 1, 5)),
      autoPlay: settings.autoPlay === true,
      strictCase: settings.strictCase === true,
      strictPunctuation: settings.strictPunctuation === true,
      theme: ['system', 'light', 'dark'].includes(String(settings.theme))
        ? (settings.theme as Settings['theme'])
        : 'system',
      dailyGoal: Math.floor(clamp(finite(settings.dailyGoal, 10), 5, 100)),
    },
    progress,
    records,
    mistakes,
    favorites: [
      ...new Set(value.favorites.filter((key): key is string => typeof key === 'string' && validKeys.has(key))),
    ],
    customCourses,
    lastPractice,
  }
}
export function parseBackup(raw: string): AppState {
  if (raw.length > 5 * 1024 * 1024) throw new Error('Backups must be smaller than 5 MB.')
  let value: unknown
  try {
    value = JSON.parse(raw)
  } catch {
    throw new Error('This backup is not valid JSON.')
  }
  return decodeState(value)
}
export function loadState(): { state: AppState; corrupt: boolean; error: string } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return { state: raw ? parseBackup(raw) : emptyState(), corrupt: false, error: '' }
  } catch {
    return {
      state: emptyState(),
      corrupt: true,
      error:
        'Saved data could not be read. Your old data has not been overwritten. Restore a backup or reset local data in Settings.',
    }
  }
}
