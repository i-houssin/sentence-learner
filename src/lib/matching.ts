import type { Settings } from '../types'
import clamp from '../upstream/clamp'

export type MatchOptions = Pick<Settings, 'strictCase' | 'strictPunctuation'>
export function normalize(text: string, options: MatchOptions): string {
  let value = text
    .normalize('NFKC')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/\u00a0/g, ' ')
  if (!options.strictCase) value = value.toLocaleLowerCase('en')
  if (!options.strictPunctuation) value = value.replace(/[^\p{L}\p{N}\s]/gu, '')
  return value.trim().replace(/\s+/g, ' ')
}
export function distance(a: string, b: string): number {
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const current = [i]
    for (let j = 1; j <= b.length; j++)
      current[j] = Math.min(current[j - 1] + 1, previous[j] + 1, previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    previous = current
  }
  return previous[b.length]
}
export function checkAnswer(input: string, expected: string, options: MatchOptions) {
  const actual = normalize(input, options),
    target = normalize(expected, options)
  const errors = distance(actual, target)
  return {
    correct: actual.length > 0 && actual === target,
    errors,
    accuracy: Math.round(clamp(1 - errors / Math.max(actual.length, target.length, 1), 0, 1) * 100),
  }
}
export function insertionStats(previous: string, next: string, target: string, options: MatchOptions) {
  let start = 0
  while (start < previous.length && start < next.length && previous[start] === next[start]) start++
  let oldEnd = previous.length,
    newEnd = next.length
  while (oldEnd > start && newEnd > start && previous[oldEnd - 1] === next[newEnd - 1]) {
    oldEnd--
    newEnd--
  }
  const inserted = next.slice(start, newEnd)
  const partial = (value: string) => {
    let result = value
      .normalize('NFKC')
      .replace(/[‘’]/g, "'")
      .replace(/[“”]/g, '"')
      .replace(/[–—]/g, '-')
      .replace(/\u00a0/g, ' ')
    if (!options.strictCase) result = result.toLocaleLowerCase('en')
    if (!options.strictPunctuation) result = result.replace(/[^\p{L}\p{N}\s]/gu, '')
    return result.trimStart().replace(/\s+/g, ' ')
  }
  const expected = partial(target)
  let errors = 0
  for (let i = 0; i < inserted.length; i++) {
    const before = partial(next.slice(0, start + i)),
      after = partial(next.slice(0, start + i + 1))
    const addition = after.slice(before.length)
    for (let j = 0; j < addition.length; j++) if (addition[j] !== expected[before.length + j]) errors++
  }
  return { characters: inserted.length, errors }
}
export function hintMask(text: string): string {
  return text.replace(/[\p{L}\p{N}]+/gu, (word) => word[0] + '·'.repeat(Math.max(0, word.length - 1)))
}
export const wpm = (characters: number, milliseconds: number) =>
  milliseconds < 1000 ? 0 : Math.round(characters / 5 / (milliseconds / 60000))
export function clock(ms: number) {
  const seconds = Math.floor(ms / 1000)
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
}
export function friendlyTime(ms: number) {
  return ms < 60000 ? `${Math.round(ms / 1000)} sec` : `${Math.round(ms / 60000)} min`
}
export function localDay(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
export function streak(dates: string[], now = new Date()) {
  const unique = new Set(dates)
  const day = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  if (!unique.has(localDay(day))) day.setDate(day.getDate() - 1)
  let result = 0
  while (unique.has(localDay(day))) {
    result++
    day.setDate(day.getDate() - 1)
  }
  return result
}
