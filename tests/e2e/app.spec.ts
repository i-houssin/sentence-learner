import { expect, test } from '@playwright/test'
import { builtInCourses } from '../../src/data/catalog'
import { exampleCourse } from '../../src/lib/imports'

const first = builtInCourses[0],
  firstChapter = first.chapters[0],
  route = `/practice/${first.id}/${firstChapter.id}`
let errors: string[] = []
test.beforeEach(async ({ page }) => {
  errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.addInitScript(() => {
    const calls: { text: string; rate: number }[] = []
    Object.defineProperty(window, '__speechCalls', { value: calls })
    Object.defineProperty(window, 'SpeechSynthesisUtterance', {
      configurable: true,
      value: class {
        text: string
        rate = 1
        lang = 'en-US'
        voice: unknown = null
        onstart: (() => void) | null = null
        onend: (() => void) | null = null
        onerror: unknown = null
        constructor(text: string) {
          this.text = text
        }
      },
    })
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: {
        getVoices: () => [{ voiceURI: 'test-en', name: 'English test voice', lang: 'en-US' }],
        addEventListener: () => {},
        removeEventListener: () => {},
        cancel: () => {},
        speak: (utterance: { text: string; rate: number; onstart?: () => void; onend?: () => void }) => {
          calls.push({ text: utterance.text, rate: utterance.rate })
          setTimeout(() => utterance.onstart?.(), 0)
          setTimeout(() => utterance.onend?.(), 30)
        },
      },
    })
  })
})
test.afterEach(() => {
  expect(errors).toEqual([])
})

test('course library, search, levels and desktop layout', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Find your next sentence.' })).toBeVisible()
  await expect(page.locator('.course-card')).toHaveCount(8)
  await page.getByRole('textbox', { name: 'Search courses' }).fill('travel')
  await expect(page.locator('.course-card')).toHaveCount(1)
  await expect(page.locator('.course-card')).toContainText('Travel')
  await page.getByRole('button', { name: 'Clear course search' }).click()
  await page.getByRole('button', { name: 'B2', exact: true }).click()
  await expect(page.locator('.course-card')).toHaveCount(2)
  await page.getByRole('button', { name: 'All courses', exact: true }).click()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: '/agent/workspace/sentence-desktop.png', fullPage: true })
})

test('wrong answers, correction, bookmarks and progress persist after refresh', async ({ page }) => {
  await page.goto(route)
  await page.getByRole('button', { name: 'Save sentence', exact: true }).click()
  const answer = page.getByRole('textbox', { name: 'Type the complete sentence' })
  await answer.fill('This is deliberately a different sentence.')
  await answer.press('Enter')
  await expect(page.getByText('Not quite yet. You’ve got another try.')).toBeVisible()
  await expect(page.locator('.word-wrong').first()).toBeVisible()
  await answer.fill(firstChapter.sentences[0].text)
  await answer.press('Enter')
  await expect(page.getByRole('button', { name: 'Next sentence' })).toBeVisible()
  await page.reload()
  await expect(page.getByTestId('target-sentence')).toHaveText(firstChapter.sentences[1].text)
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('sentence-learner:v1')!))
  expect(stored.records).toHaveLength(1)
  expect(stored.favorites).toHaveLength(1)
  expect(Object.keys(stored.mistakes)).toHaveLength(1)
  await page.goto('/saved')
  await expect(page.locator('.sentence-row')).toHaveCount(1)
  await page.goto('/review')
  await expect(page.locator('.sentence-row')).toHaveCount(1)
})

test('a whole chapter can be completed and appears in learning', async ({ page }) => {
  await page.goto(route)
  const answer = page.getByRole('textbox', { name: 'Type the complete sentence' })
  for (const sentence of firstChapter.sentences) {
    await expect(page.getByTestId('target-sentence')).toHaveText(sentence.text)
    await answer.fill(sentence.text)
    await answer.press('Enter')
    await expect(page.locator('.answer-feedback')).toContainText('That’s it. Every word.')
    await answer.press('Enter')
  }
  await expect(page.getByRole('heading', { name: 'Another chapter in your story.' })).toBeVisible()
  await expect(page.locator('.summary-stats').first()).toContainText('10')
  await page.goto(`/course/${first.id}`)
  await expect(page.locator('.chapter-complete')).toHaveCount(1)
  await page.goto('/learning')
  await expect(page.locator('.stat-card').nth(1)).toContainText('10')
})

test('sentence audio uses the complete text, speed and repetition controls', async ({ page }) => {
  await page.goto(route)
  await page.getByRole('button', { name: 'Listen + type', exact: true }).click()
  await expect(page.getByTestId('target-sentence')).toHaveCount(0)
  await page.getByRole('button', { name: 'Play sentence audio', exact: true }).click()
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { __speechCalls: { text: string }[] }).__speechCalls.length))
    .toBe(1)
  const call = await page.evaluate(() => (window as unknown as { __speechCalls: { text: string }[] }).__speechCalls[0])
  expect(call.text).toBe(firstChapter.sentences[0].text)
  await page.getByLabel('Practice options', { exact: true }).click()
  await page.getByLabel('Practice playback speed').selectOption('0.5')
  await page.getByLabel('Practice repeat count').selectOption('2')
  await page.getByRole('button', { name: 'Replay sentence audio', exact: true }).click()
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { __speechCalls: { text: string }[] }).__speechCalls.length))
    .toBe(3)
  const calls = await page.evaluate(
    () => (window as unknown as { __speechCalls: { text: string; rate: number }[] }).__speechCalls,
  )
  expect(calls[1].rate).toBe(0.5)
  expect(calls[2].text).toBe(firstChapter.sentences[0].text)
})

test('hints can be revealed and saved sentence practice works', async ({ page }) => {
  await page.goto(route)
  await page.getByRole('button', { name: 'A little help', exact: true }).click()
  await expect(page.locator('.hint-sentence')).toContainText('·')
  await page.getByRole('button', { name: 'Show sentence', exact: true }).click()
  await expect(page.getByTestId('target-sentence')).toHaveText(firstChapter.sentences[0].text)
  await page.getByRole('button', { name: 'Save sentence', exact: true }).click()
  await page.goto('/saved')
  await page.getByRole('link', { name: 'Practice saved sentences' }).click()
  await expect(page.getByRole('textbox', { name: 'Type the complete sentence' })).toBeVisible()
})

test('a clean audio-only review clears a mistake', async ({ page }) => {
  await page.goto(route)
  await page.getByRole('textbox', { name: 'Type the complete sentence' }).fill('wrong')
  await page.getByRole('button', { name: 'Check sentence' }).click()
  await page.goto('/review')
  await page.getByRole('link', { name: 'Start review' }).click()
  await expect(page.getByRole('heading', { name: 'What do you hear?' })).toBeVisible()
  const answer = page.getByRole('textbox', { name: 'Type the complete sentence' })
  await answer.fill(firstChapter.sentences[0].text)
  await answer.press('Enter')
  await answer.press('Enter')
  await page.goto('/review')
  await expect(page.getByRole('heading', { name: 'A clean slate. A good feeling.' })).toBeVisible()
})

test('JSON and CSV imports create working courses without overwriting', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Import course', exact: true }).click()
  await page.getByLabel('Course file', { exact: true }).setInputFiles({
    name: 'my-course.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(exampleCourse)),
  })
  await expect(page.locator('.import-preview')).toContainText('2 sentences')
  await page.getByRole('button', { name: 'Add course', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'My first course' })).toBeVisible()
  await page.getByRole('link', { name: 'Begin this course' }).click()
  await expect(page.getByTestId('target-sentence')).toHaveText(exampleCourse.chapters[0].sentences[0].text)
  await page.goto('/?import=1')
  await page.getByLabel('Course file', { exact: true }).setInputFiles({
    name: 'my-csv.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from('chapter,text,hint\nFirst,"This is a full sentence, with a comma.",A complete thought.\n'),
  })
  await page.getByRole('button', { name: 'Add course', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'my csv' })).toBeVisible()
  await page.goto('/')
  await expect(page.locator('.course-card')).toHaveCount(10)
})

test('settings, backup export and rejected restore preserve progress', async ({ page }) => {
  await page.goto('/settings')
  await page.getByRole('combobox', { name: 'Appearance', exact: true }).selectOption('dark')
  await expect(page.locator('html')).toHaveClass('dark')
  await page.getByRole('combobox', { name: 'Daily sentence goal', exact: true }).selectOption('20')
  await page.reload()
  await expect(page.getByRole('combobox', { name: 'Daily sentence goal', exact: true })).toHaveValue('20')
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export progress backup' }).click()
  expect((await download).suggestedFilename()).toBe('sentence-backup.json')
  page.once('dialog', (dialog) => dialog.accept())
  await page
    .getByLabel('Progress backup file', { exact: true })
    .setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{"version":99}') })
  await expect(page.getByRole('alert')).toContainText('not a compatible')
  await expect(page.getByRole('combobox', { name: 'Daily sentence goal', exact: true })).toHaveValue('20')
})

test('mobile navigation, layout and accessible modal closing', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.getByRole('button', { name: 'Open navigation', exact: true }).click()
  await page.getByRole('link', { name: 'My learning', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Your English, in progress.' })).toBeVisible()
  await page.goto('/')
  await page.getByRole('button', { name: 'Import course', exact: true }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.screenshot({ path: '/agent/workspace/sentence-mobile.png', fullPage: false })
  await page.goto(route)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('unsupported audio degrades to visible-text practice without crashing', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { configurable: true, value: undefined })
  })
  await page.goto(route)
  await expect(page.getByText('Speech is unavailable in this browser.', { exact: false })).toBeVisible()
  await expect(page.getByTestId('target-sentence')).toHaveText(firstChapter.sentences[0].text)
  const answer = page.getByRole('textbox', { name: 'Type the complete sentence' })
  await answer.fill(firstChapter.sentences[0].text)
  await answer.press('Enter')
  await expect(page.getByRole('button', { name: 'Next sentence' })).toBeVisible()
})

test('practice screen has readable full-sentence controls and no overflow', async ({ page }) => {
  await page.goto(route)
  await expect(page.getByRole('button', { name: 'Check sentence' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: '/agent/workspace/sentence-practice.png', fullPage: true })
})
