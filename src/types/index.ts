export type Level = 'A1' | 'A2' | 'B1' | 'B2'
export type PracticeMode = 'read' | 'hints' | 'dictation'
export interface Sentence {
  id: string
  text: string
  hint?: string
}
export interface Chapter {
  id: string
  title: string
  description: string
  sentences: Sentence[]
}
export interface Course {
  id: string
  title: string
  tagline: string
  description: string
  level: Level
  category: string
  chapters: Chapter[]
  custom?: boolean
}
export interface Settings {
  mode: PracticeMode
  rate: number
  voice: string
  repeats: number
  autoPlay: boolean
  strictCase: boolean
  strictPunctuation: boolean
  theme: 'light' | 'dark' | 'system'
  dailyGoal: number
}
export interface ChapterProgress {
  completed: string[]
  cursor: number
  updatedAt: string
  completedAt?: string
}
export interface AnswerRecord {
  id: string
  key: string
  courseId: string
  chapterId: string
  at: string
  durationMs: number
  characters: number
  typedCharacters: number
  errors: number
  attempts: number
  assisted: boolean
  review: boolean
}
export interface Mistake {
  key: string
  courseId: string
  chapterId: string
  sentenceId: string
  count: number
  updatedAt: string
}
export interface LastPractice {
  courseId: string
  chapterId: string
}
export interface AppState {
  version: 1
  settings: Settings
  progress: Record<string, ChapterProgress>
  records: AnswerRecord[]
  mistakes: Record<string, Mistake>
  favorites: string[]
  customCourses: Course[]
  lastPractice: LastPractice | null
}
export interface PracticeItem {
  key: string
  course: Course
  chapter: Chapter
  sentence: Sentence
}
