import { describe, expect, it } from 'vitest'
import { builtInCourses, flattenCourses, sentenceCount } from '../src/data/catalog'
import { checkAnswer, distance, hintMask, insertionStats, localDay, normalize, streak, wpm } from '../src/lib/matching'
import { exampleCourse, importCourse, parseCSV, validateCourse } from '../src/lib/imports'
import { decodeState, emptyState, parseBackup } from '../src/lib/storage'
import clamp from '../src/upstream/clamp'
import shuffle from '../src/upstream/shuffle'

const relaxed = { strictCase: false, strictPunctuation: false }
describe('original course curriculum', () => {
  it('contains exactly eight valid courses, 80 chapters and 800 sentences', () => {
    expect(builtInCourses).toHaveLength(8)
    expect(new Set(builtInCourses.map((c) => c.id)).size).toBe(8)
    for (const course of builtInCourses) {
      expect(validateCourse(course).title).toBe(course.title)
      expect(course.chapters).toHaveLength(10)
      expect(sentenceCount(course)).toBe(100)
      for (const chapter of course.chapters) {
        expect(chapter.sentences).toHaveLength(10)
        for (const sentence of chapter.sentences) {
          expect(sentence.text.trim().length).toBeGreaterThan(8)
          expect(sentence.hint?.trim().length).toBeGreaterThan(3)
        }
      }
    }
    const items = flattenCourses(builtInCourses)
    expect(items).toHaveLength(800)
    expect(new Set(items.map((i) => i.key)).size).toBe(800)
    expect(new Set(items.map((i) => normalize(i.sentence.text, relaxed))).size).toBe(800)
  })
})
describe('whole-sentence matching', () => {
  it('accepts relaxed capitalization, punctuation and whitespace', () => {
    expect(checkAnswer('  HELLO  there\nfriend ', 'Hello there, friend!', relaxed).correct).toBe(true)
  })
  it('tolerates typographic quotes and composed Unicode', () => {
    expect(normalize('I’m “ready”.', { strictCase: true, strictPunctuation: true })).toBe('I\'m "ready".')
    expect(normalize('cafe\u0301', relaxed)).toBe('café')
  })
  it('enforces case and punctuation when requested', () => {
    expect(checkAnswer('hello.', 'Hello.', { strictCase: true, strictPunctuation: true }).correct).toBe(false)
    expect(checkAnswer('Hello', 'Hello.', { strictCase: false, strictPunctuation: true }).correct).toBe(false)
  })
  it('rejects an empty answer and reports insertion, deletion and substitution errors', () => {
    expect(checkAnswer('', 'Hello!', relaxed).correct).toBe(false)
    expect(distance('cat', 'cut')).toBe(1)
    expect(distance('cat', 'cart')).toBe(1)
    expect(distance('cats', 'cat')).toBe(1)
    expect(distance('', 'abc')).toBe(3)
  })
  it('does not count optional punctuation omissions as typing errors', () => {
    expect(insertionStats('', 'Hello friend', 'Hello, friend!', relaxed).errors).toBe(0)
    expect(insertionStats('Hel', 'Hell', 'Hello!', relaxed)).toEqual({ characters: 1, errors: 0 })
    expect(insertionStats('Hell', 'Hel', 'Hello!', relaxed)).toEqual({ characters: 0, errors: 0 })
    expect(insertionStats('c', 'cx', 'cat', relaxed).errors).toBe(1)
  })
  it('creates first-letter hints and measures WPM by five-character words', () => {
    expect(hintMask('Hello, friend!')).toBe('H····, f·····!')
    expect(wpm(250, 60000)).toBe(50)
    expect(wpm(250, 0)).toBe(0)
  })
})
describe('personal course import', () => {
  it('handles quoted commas, escaped quotes, BOM and embedded newlines in CSV', () => {
    expect(
      parseCSV('\uFEFFchapter,text,hint\r\nOne,"Hello, friend!","Say ""hello""."\r\nTwo,"Line one\nline two",A hint'),
    ).toEqual([
      ['chapter', 'text', 'hint'],
      ['One', 'Hello, friend!', 'Say "hello".'],
      ['Two', 'Line one\nline two', 'A hint'],
    ])
  })
  it('rejects unclosed CSV and missing text columns', () => {
    expect(() => parseCSV('text\n"Unclosed')).toThrow()
    expect(() => importCourse('sentence\nHello there.', 'test.csv')).toThrow('text column')
  })
  it('imports JSON and CSV as new, non-overwriting custom courses', () => {
    const one = importCourse(JSON.stringify(exampleCourse), 'course.json'),
      two = importCourse(JSON.stringify(exampleCourse), 'course.json')
    expect(one.custom).toBe(true)
    expect(one.id).not.toBe(two.id)
    expect(one.id).toMatch(/^custom-/)
    expect(
      importCourse('chapter,text\nFirst,Hello there.\nSecond,Good morning.', 'my-course.csv').chapters,
    ).toHaveLength(2)
  })
  it('rejects malformed structures, duplicate IDs, huge text and unsafe identifiers', () => {
    expect(() => validateCourse({ id: '__proto__', title: 'Unsafe', chapters: [] })).toThrow()
    expect(() =>
      validateCourse({
        ...exampleCourse,
        chapters: [
          {
            id: 'one',
            title: 'One',
            sentences: [
              { id: 'dup', text: 'A sentence.' },
              { id: 'dup', text: 'Another sentence.' },
            ],
          },
        ],
      }),
    ).toThrow('unique')
    expect(() =>
      validateCourse({ ...exampleCourse, chapters: [{ id: 'one', title: 'One', sentences: ['a'.repeat(601)] }] }),
    ).toThrow('600')
    expect(() => importCourse('not json', 'bad.json')).toThrow('valid JSON')
  })
})
describe('local backups and genuine statistics', () => {
  it('round-trips state and custom courses', () => {
    const state = emptyState()
    state.customCourses = [importCourse(JSON.stringify(exampleCourse), 'course.json')]
    expect(parseBackup(JSON.stringify(state))).toEqual(state)
  })
  it('rejects invalid and oversized backups without applying them', () => {
    expect(() => parseBackup('{broken')).toThrow()
    expect(() => decodeState({ version: 99 })).toThrow()
    expect(() => parseBackup(' '.repeat(5 * 1024 * 1024 + 1))).toThrow('5 MB')
  })
  it('filters unknown progress and restores safe defaults', () => {
    const state = emptyState()
    state.progress = { '__unknown/chapter': { completed: ['x'], cursor: 20, updatedAt: 'bad' } }
    expect(decodeState(state).progress).toEqual({})
    expect(decodeState({ ...state, settings: { rate: 99, dailyGoal: -1 } }).settings.rate).toBe(2)
  })
  it('uses local study dates and permits a streak continuing from yesterday', () => {
    const now = new Date(2026, 9, 28, 12)
    expect(streak(['2026-10-26', '2026-10-27'], now)).toBe(2)
    expect(streak(['2026-10-26', '2026-10-28'], now)).toBe(1)
    expect(streak([], now)).toBe(0)
    expect(localDay(now)).toBe('2026-10-28')
  })
  it('reuses upstream bounded values and a non-mutating shuffle', () => {
    expect(clamp(8, 0.5, 2)).toBe(2)
    const original = [1, 2, 3]
    expect(shuffle(original).sort()).toEqual(original)
    expect(original).toEqual([1, 2, 3])
  })
})
