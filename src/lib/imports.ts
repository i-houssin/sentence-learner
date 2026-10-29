import type { Course, Level } from '../types'

const object = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
const text = (value: unknown, label: string, max = 600) => {
  if (typeof value !== 'string' || !value.trim() || value.length > max)
    throw new Error(`${label} must be nonempty text (at most ${max} characters).`)
  return value.trim()
}
const id = (value: unknown, label: string) => {
  const valueText = text(value, label, 100)
  if (!/^[a-zA-Z0-9_-]+$/.test(valueText) || ['__proto__', 'prototype', 'constructor'].includes(valueText))
    throw new Error(`${label} contains unsupported characters.`)
  return valueText
}
export function validateCourse(value: unknown): Course {
  if (!object(value)) throw new Error('The course must be a JSON object.')
  const courseId = id(value.id, 'Course ID'),
    title = text(value.title, 'Course title', 100)
  if (!Array.isArray(value.chapters) || value.chapters.length === 0 || value.chapters.length > 200)
    throw new Error('A course needs between 1 and 200 chapters.')
  const chapterIds = new Set<string>(),
    sentenceIds = new Set<string>()
  let total = 0
  const chapters = value.chapters.map((raw, ci) => {
    if (!object(raw)) throw new Error(`Chapter ${ci + 1} must be an object.`)
    const chapterId = id(raw.id ?? `chapter-${ci + 1}`, 'Chapter ID')
    if (chapterIds.has(chapterId)) throw new Error('Chapter IDs must be unique.')
    chapterIds.add(chapterId)
    if (!Array.isArray(raw.sentences) || raw.sentences.length === 0 || raw.sentences.length > 500)
      throw new Error('Each chapter needs 1 to 500 sentences.')
    const sentences = raw.sentences.map((item, si) => {
      const sentence = typeof item === 'string' ? { text: item } : item
      if (!object(sentence)) throw new Error('A sentence must be text or an object with a text field.')
      const sentenceId = id(sentence.id ?? `${chapterId}-${si + 1}`, 'Sentence ID')
      if (sentenceIds.has(sentenceId)) throw new Error('Sentence IDs must be unique within a course.')
      sentenceIds.add(sentenceId)
      total++
      return {
        id: sentenceId,
        text: text(sentence.text, 'Sentence'),
        ...(sentence.hint ? { hint: text(sentence.hint, 'Hint') } : {}),
      }
    })
    return {
      id: chapterId,
      title: text(raw.title ?? `Chapter ${ci + 1}`, 'Chapter title', 100),
      description: typeof raw.description === 'string' ? raw.description.slice(0, 300) : '',
      sentences,
    }
  })
  if (total > 10000) throw new Error('A course can contain at most 10,000 sentences.')
  const level = ['A1', 'A2', 'B1', 'B2'].includes(String(value.level)) ? (value.level as Level) : 'A2'
  return {
    id: courseId,
    title,
    tagline: typeof value.tagline === 'string' ? value.tagline.slice(0, 160) : 'Your words. Your practice.',
    description:
      typeof value.description === 'string' ? value.description.slice(0, 600) : 'A personal sentence collection.',
    level,
    category: typeof value.category === 'string' ? value.category.slice(0, 60) : 'Your courses',
    chapters,
  }
}
export function parseCSV(csv: string): string[][] {
  const rows: string[][] = []
  let row: string[] = [],
    field = '',
    quoted = false
  const value = csv.replace(/^\uFEFF/, '')
  for (let i = 0; i < value.length; i++) {
    const char = value[i]
    if (char === '"') {
      if (quoted && value[i + 1] === '"') {
        field += '"'
        i++
      } else if (quoted || !field) quoted = !quoted
      else throw new Error('Unexpected quotation mark in CSV. Quote the whole field.')
    } else if (char === ',' && !quoted) {
      row.push(field)
      field = ''
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && value[i + 1] === '\n') i++
      row.push(field)
      if (row.some((cell) => cell.trim())) rows.push(row)
      row = []
      field = ''
    } else field += char
  }
  if (quoted) throw new Error('The CSV contains an unclosed quoted field.')
  row.push(field)
  if (row.some((cell) => cell.trim())) rows.push(row)
  return rows
}
export function importCourse(contents: string, filename: string): Course {
  if (contents.length > 3 * 1024 * 1024) throw new Error('Please choose a course file smaller than 3 MB.')
  let course: Course
  if (filename.toLowerCase().endsWith('.csv')) {
    const rows = parseCSV(contents)
    const header = rows.shift()?.map((cell) => cell.trim().toLowerCase()) ?? []
    const ti = header.indexOf('text'),
      ci = header.indexOf('chapter'),
      hi = header.indexOf('hint')
    if (ti < 0 || rows.length === 0)
      throw new Error('CSV needs a text column and at least one sentence. Optional columns: chapter, hint.')
    const groups = new Map<string, { text: string; hint?: string }[]>()
    rows.forEach((row) => {
      const chapter = ci >= 0 && row[ci]?.trim() ? row[ci].trim() : 'My sentences'
      const items = groups.get(chapter) ?? []
      items.push({ text: row[ti] ?? '', ...(hi >= 0 && row[hi] ? { hint: row[hi] } : {}) })
      groups.set(chapter, items)
    })
    course = validateCourse({
      id: 'imported',
      title:
        filename
          .replace(/\.csv$/i, '')
          .replace(/[-_]/g, ' ')
          .slice(0, 100) || 'My course',
      chapters: [...groups].map(([title, sentences], i) => ({ id: `chapter-${i + 1}`, title, sentences })),
    })
  } else {
    let json: unknown
    try {
      json = JSON.parse(contents)
    } catch {
      throw new Error('This file is not valid JSON. Download the example to see the course format.')
    }
    course = validateCourse(json)
  }
  // Every import is a new course: never silently replace existing progress or content.
  return { ...course, id: `custom-${crypto.randomUUID()}`, custom: true }
}
export function downloadFile(filename: string, content: string, mime = 'application/json') {
  const url = URL.createObjectURL(new Blob([content], { type: mime }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
export const exampleCourse = {
  id: 'my-course',
  title: 'My first course',
  level: 'A2',
  chapters: [
    {
      id: 'getting-started',
      title: 'Getting started',
      sentences: [
        {
          id: 'one',
          text: 'A little practice makes a real difference.',
          hint: 'Small efforts can lead to improvement.',
        },
        { id: 'two', text: 'What would you like to learn today?', hint: 'Ask about today’s learning goal.' },
      ],
    },
  ],
}
