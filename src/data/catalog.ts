import everyday from './courses/everyday.json' with { type: 'json' }
import travel from './courses/travel.json' with { type: 'json' }
import social from './courses/social.json' with { type: 'json' }
import work from './courses/work.json' with { type: 'json' }
import study from './courses/study.json' with { type: 'json' }
import technology from './courses/technology.json' with { type: 'json' }
import stories from './courses/stories.json' with { type: 'json' }
import grammar from './courses/grammar.json' with { type: 'json' }
import type { AppState, Chapter, Course, PracticeItem, Sentence } from '../types'

export const builtInCourses = [everyday, travel, social, work, study, technology, stories, grammar] as Course[]
export const chapterKey = (course: Course | string, chapter: Chapter | string) =>
  `${typeof course === 'string' ? course : course.id}/${typeof chapter === 'string' ? chapter : chapter.id}`
export const sentenceKey = (course: Course, chapter: Chapter, sentence: Sentence) =>
  `${chapterKey(course, chapter)}/${sentence.id}`
export const sentenceCount = (course: Course) =>
  course.chapters.reduce((sum, chapter) => sum + chapter.sentences.length, 0)
export function flattenCourses(courses: Course[]): PracticeItem[] {
  return courses.flatMap((course) =>
    course.chapters.flatMap((chapter) =>
      chapter.sentences.map((sentence) => ({ key: sentenceKey(course, chapter, sentence), course, chapter, sentence })),
    ),
  )
}
export function completedCount(course: Course, state: AppState) {
  return course.chapters.reduce(
    (count, chapter) =>
      count +
      chapter.sentences.filter((s) => state.progress[chapterKey(course, chapter)]?.completed.includes(s.id)).length,
    0,
  )
}
export function nextChapter(course: Course, state: AppState) {
  return (
    course.chapters.find(
      (chapter) => (state.progress[chapterKey(course, chapter)]?.completed.length ?? 0) < chapter.sentences.length,
    ) ?? course.chapters[0]
  )
}
export const coursePalette: Record<string, { color: string; bg: string; icon: string; label: string }> = {
  everyday: { color: '#287557', bg: '#e8f3e9', icon: 'sun', label: 'THE EVERYDAY EDIT' },
  travel: { color: '#316a9d', bg: '#e8f1f8', icon: 'plane', label: 'OUT IN THE WORLD' },
  social: { color: '#9a6441', bg: '#f8eee2', icon: 'chat', label: 'GOOD CONVERSATIONS' },
  work: { color: '#7260a3', bg: '#eeebf8', icon: 'briefcase', label: 'WORDS THAT WORK' },
  study: { color: '#357c80', bg: '#e5f2f0', icon: 'book', label: 'A CURIOUS MIND' },
  technology: { color: '#5d6f9f', bg: '#e9edf8', icon: 'code', label: 'THINKING FORWARD' },
  stories: { color: '#a2606e', bg: '#f8eaf0', icon: 'spark', label: 'ONE SMALL STORY' },
  grammar: { color: '#897329', bg: '#f7f2dc', icon: 'letters', label: 'MAKE IT MAKE SENSE' },
}
export function palette(course: Course) {
  return coursePalette[course.id] ?? { color: '#626c7a', bg: '#edf0f5', icon: 'book', label: 'YOUR OWN WORDS' }
}
