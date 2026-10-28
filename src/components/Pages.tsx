import { useMemo, useRef, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  AudioLines,
  BarChart3,
  BookOpen,
  Bookmark,
  Check,
  CheckCircle2,
  ChevronRight,
  Download,
  Flame,
  Headphones,
  Play,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  Upload,
  Volume2,
} from 'lucide-react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { CourseCard, CourseIcon, EmptyState, Modal, ProgressBar, SectionHeading } from './UI'
import { useApp } from '../hooks/useApp'
import useSpeech from '../hooks/useSpeech'
import { chapterKey, completedCount, nextChapter, palette, sentenceCount } from '../data/catalog'
import { downloadFile, exampleCourse, importCourse } from '../lib/imports'
import { friendlyTime, localDay, streak, wpm } from '../lib/matching'
import { STORAGE_KEY } from '../lib/storage'
import type { Course, PracticeItem, PracticeMode } from '../types'

const modes: { id: PracticeMode; title: string; description: string }[] = [
  { id: 'read', title: 'Read + type', description: 'See the whole sentence and build confidence.' },
  { id: 'hints', title: 'A little help', description: 'First-letter hints leave room to remember.' },
  { id: 'dictation', title: 'Listen + type', description: 'No text. Just your ears and your keyboard.' },
]

export function ImportDialog({ onClose }: { onClose: () => void }) {
  const { state, addCourse } = useApp(),
    navigate = useNavigate(),
    input = useRef<HTMLInputElement>(null)
  const [course, setCourse] = useState<Course | null>(null),
    [error, setError] = useState(''),
    [filename, setFilename] = useState(''),
    [loading, setLoading] = useState(false)
  async function read(file?: File) {
    if (!file) return
    setLoading(true)
    setError('')
    setCourse(null)
    setFilename(file.name)
    try {
      if (file.size > 3 * 1024 * 1024) throw new Error('Choose a course file smaller than 3 MB.')
      setCourse(importCourse(await file.text(), file.name))
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not read this file.')
    } finally {
      setLoading(false)
    }
  }
  function add() {
    if (!course) return
    if (state.customCourses.length >= 30) {
      setError('You can keep up to 30 custom courses.')
      return
    }
    addCourse(course)
    onClose()
    navigate(`/course/${course.id}`)
  }
  return (
    <Modal title="Bring your own sentences" onClose={onClose}>
      <p className="muted">
        Turn a personal collection into a course. Import a JSON course or a CSV with a <code>text</code> column.
        Optional CSV columns: <code>chapter</code> and <code>hint</code>.
      </p>
      <input
        ref={input}
        aria-label="Course file"
        type="file"
        accept=".json,.csv,application/json,text/csv"
        className="sr-only"
        onChange={(event) => {
          void read(event.target.files?.[0])
          event.target.value = ''
        }}
      />
      <button className="upload-zone" onClick={() => input.current?.click()}>
        <span className="upload-icon">
          <Upload size={25} />
        </span>
        <strong>{filename || 'Choose your course file'}</strong>
        <span>JSON or CSV · up to 3 MB</span>
      </button>
      <div className="example-links">
        <button
          className="text-button"
          onClick={() => downloadFile('example-course.json', JSON.stringify(exampleCourse, null, 2))}
        >
          <Download size={14} />
          JSON example
        </button>
        <button
          className="text-button"
          onClick={() =>
            downloadFile(
              'example-course.csv',
              'chapter,text,hint\nGetting started,"A little practice makes a real difference.",Small efforts help you improve.\nGetting started,"What would you like to learn today?",Ask about today’s goal.\n',
              'text/csv',
            )
          }
        >
          <Download size={14} />
          CSV example
        </button>
      </div>
      {loading && <p role="status">Reading your course…</p>}
      {error && (
        <p className="inline-error" role="alert">
          {error}
        </p>
      )}
      {course && (
        <div className="import-preview">
          <CheckCircle2 size={22} />
          <div>
            <strong>{course.title}</strong>
            <p>
              {course.chapters.length} chapters · {sentenceCount(course)} sentences · {course.level}
            </p>
          </div>
        </div>
      )}
      <p className="fine-print">
        Only import content you own or have permission to use. Imports stay in this browser and never replace an
        existing course.
      </p>
      <div className="modal-actions">
        <button className="button secondary" onClick={onClose}>
          Cancel
        </button>
        <button className="button primary" disabled={!course || loading} onClick={add}>
          Add course
          <Plus size={16} />
        </button>
      </div>
    </Modal>
  )
}

export function LibraryPage() {
  const { state, courses } = useApp(),
    [params, setParams] = useSearchParams()
  const [query, setQuery] = useState(''),
    [level, setLevel] = useState('All'),
    [importing, setImporting] = useState(params.get('import') === '1')
  const chosen = courses.find((c) => c.id === state.lastPractice?.courseId) ?? courses[0],
    chapter = nextChapter(chosen, state)
  const filtered = courses.filter(
    (course) =>
      (level === 'All' || (level === 'Imported' ? course.custom : course.level === level)) &&
      `${course.title} ${course.description} ${course.category}`.toLowerCase().includes(query.toLowerCase()),
  )
  const demo = useSpeech('A little practice makes a real difference.', state.settings)
  function closeImport() {
    setImporting(false)
    if (params.has('import')) {
      params.delete('import')
      setParams(params, { replace: true })
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">MAKE YOURSELF AT HOME</div>
          <h1>
            Find your next sentence<span className="green-dot">.</span>
          </h1>
          <p>Real English. Whole thoughts. One little practice at a time.</p>
        </div>
        <button className="button secondary" onClick={() => setImporting(true)}>
          <Plus size={17} />
          Import course
        </button>
      </div>
      <section className="welcome-banner">
        <div className="welcome-copy">
          <span className="hero-kicker">
            <span />
            YOUR EVERYDAY ENGLISH RITUAL
          </span>
          <h2>
            Listen closely.
            <br />
            Let your fingers
            <br className="desktop-only" /> do the learning.
          </h2>
          <p>Build your English through sentences, not isolated words. A few minutes is a good place to start.</p>
          <Link className="button hero-button" to={`/practice/${chosen.id}/${chapter.id}`}>
            {state.records.length ? 'Keep learning' : 'Start your first chapter'}
            <ArrowRight size={17} />
          </Link>
          <div className="hero-proof">
            <Check size={13} />
            Free courses
            <Check size={13} />
            No sign-up
            <Check size={13} />
            Your own pace
          </div>
        </div>
        <div className="hero-demo">
          <div className="demo-label">
            <Headphones size={15} /> A LITTLE PREVIEW<span>EN</span>
          </div>
          <div className="waveform" aria-hidden="true">
            {[14, 27, 39, 22, 48, 63, 38, 53, 75, 45, 29, 52, 38, 67, 42, 25, 44, 58, 31, 17, 29].map(
              (height, index) => (
                <i
                  key={index}
                  style={{ height, animationDelay: `${index * 0.07}s` }}
                  className={demo.speaking ? 'wave-speaking' : ''}
                />
              ),
            )}
          </div>
          <p className="demo-sentence">
            A little practice makes
            <br />a real difference<span>.</span>
          </p>
          <div className="demo-bottom">
            <span>
              <kbd>A</kbd>
              <kbd>a</kbd>
              <span>Hear the whole thought.</span>
            </span>
            <button
              className="demo-play"
              aria-label={demo.speaking ? 'Stop sample audio' : 'Play sample sentence'}
              onClick={demo.speaking ? demo.cancel : demo.speak}
            >
              {demo.speaking ? <AudioLines size={20} /> : <Play size={18} fill="currentColor" />}
            </button>
          </div>
          {demo.error && (
            <p className="demo-error" role="status">
              {demo.error}
            </p>
          )}
        </div>
      </section>
      <div className="library-strip">
        <span>
          <BookOpen size={17} />
          <strong>{courses.length}</strong> courses to explore
        </span>
        <span>
          <AudioLines size={17} />
          <strong>{courses.reduce((n, c) => n + sentenceCount(c), 0).toLocaleString()}</strong> complete sentences
        </span>
        <span>
          <ShieldCheck size={17} />
          Your progress. On your device.
        </span>
      </div>
      <section aria-label="Course library">
        <div className="library-heading">
          <div>
            <h2>The course collection</h2>
            <p>Start somewhere familiar. Go somewhere new.</p>
          </div>
          <label className="search-field">
            <Search size={17} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Find a course…"
              aria-label="Search courses"
            />
            {query && (
              <button onClick={() => setQuery('')} aria-label="Clear course search">
                ×
              </button>
            )}
          </label>
        </div>
        <div className="course-filters" aria-label="Filter by level">
          {['All', 'A1', 'A2', 'B1', 'B2', 'Imported'].map((item) => (
            <button
              key={item}
              className={`filter-pill ${level === item ? 'selected' : ''}`}
              aria-pressed={level === item}
              onClick={() => setLevel(item)}
            >
              {item === 'All' ? 'All courses' : item === 'Imported' ? 'Your imports' : item}
            </button>
          ))}
          <span className="filter-count">
            {filtered.length} {filtered.length === 1 ? 'course' : 'courses'}
          </span>
        </div>
        {filtered.length ? (
          <div className="course-grid">
            {filtered.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<Search size={27} />}
            title="A fresh search?"
            action={
              <button
                className="button secondary"
                onClick={() => {
                  setQuery('')
                  setLevel('All')
                }}
              >
                Show all courses
              </button>
            }
          >
            No courses match those filters. Try another topic or level.
          </EmptyState>
        )}
      </section>
      <div className="bottom-callout">
        <span className="callout-icon">
          <Sparkles size={22} />
        </span>
        <div>
          <h3>Make it personal.</h3>
          <p>Bring sentences from your own writing or licensed learning materials.</p>
        </div>
        <button className="text-button" onClick={() => setImporting(true)}>
          Import your course
          <ArrowUpRight size={16} />
        </button>
      </div>
      {importing && <ImportDialog onClose={closeImport} />}
    </>
  )
}

export function CoursePage() {
  const { courseId } = useParams(),
    { courses, state, updateSettings } = useApp()
  const course = courses.find((c) => c.id === courseId)
  if (!course) return <NotFoundPage />
  const done = completedCount(course, state),
    total = sentenceCount(course),
    next = nextChapter(course, state),
    p = palette(course)
  return (
    <>
      <Link className="back-link" to="/">
        <ArrowLeft size={15} />
        All courses
      </Link>
      <section
        className="course-detail-hero"
        style={{ '--course-color': p.color, '--course-bg': p.bg } as React.CSSProperties}
      >
        <div className="detail-copy">
          <div className="eyebrow">
            {course.category} <span className="pill">{course.level}</span>
          </div>
          <h1>{course.title}</h1>
          <p>{course.description}</p>
          <div className="detail-meta">
            <span>
              <BookOpen size={16} />
              {course.chapters.length} chapters
            </span>
            <span>
              <AudioLines size={16} />
              {total} sentences
            </span>
            <span>
              <CheckCircle2 size={16} />
              All chapters open
            </span>
          </div>
          <Link className="button primary" to={`/practice/${course.id}/${next.id}`}>
            {done > 0 && done < total ? 'Continue course' : done === total ? 'Practice again' : 'Begin this course'}
            <ArrowRight size={16} />
          </Link>
        </div>
        <div className="detail-progress">
          <CourseIcon course={course} size={47} />
          <strong>
            {Math.round((done / total) * 100)}
            <span>%</span>
          </strong>
          <p>
            {done} of {total} sentences
          </p>
          <ProgressBar value={done} max={total} label={`${course.title} completion`} />
        </div>
      </section>
      <SectionHeading eyebrow="FIND YOUR COMFORT ZONE" title="How would you like to practice?" />
      <div className="mode-cards">
        {modes.map((mode) => (
          <button
            key={mode.id}
            className={`mode-card ${state.settings.mode === mode.id ? 'selected' : ''}`}
            onClick={() => updateSettings({ mode: mode.id })}
            aria-pressed={state.settings.mode === mode.id}
          >
            <span className="radio-mark">{state.settings.mode === mode.id && <span />}</span>
            <div>
              <strong>{mode.title}</strong>
              <p>{mode.description}</p>
            </div>
          </button>
        ))}
      </div>
      <SectionHeading eyebrow="ONE CHAPTER AT A TIME" title="Your path through this course">
        <span className="muted">
          {
            course.chapters.filter(
              (ch) => state.progress[chapterKey(course, ch)]?.completed.length === ch.sentences.length,
            ).length
          }{' '}
          / {course.chapters.length} completed
        </span>
      </SectionHeading>
      <div className="chapter-grid">
        {course.chapters.map((ch, index) => {
          const completed = state.progress[chapterKey(course, ch)]?.completed.length ?? 0,
            isComplete = completed === ch.sentences.length
          return (
            <Link
              key={ch.id}
              to={`/practice/${course.id}/${ch.id}`}
              className={`chapter-card ${isComplete ? 'chapter-complete' : ''}`}
              aria-label={`${isComplete ? 'Replay' : completed ? 'Resume' : 'Practice'} chapter ${index + 1}: ${ch.title}`}
            >
              <span className="chapter-number">
                {isComplete ? <Check size={20} /> : String(index + 1).padStart(2, '0')}
              </span>
              <div>
                <span className="eyebrow">CHAPTER {String(index + 1).padStart(2, '0')}</span>
                <h3>{ch.title}</h3>
                <p>{ch.description}</p>
                <span className="chapter-status">
                  {isComplete ? 'Completed · practice again' : `${completed} / ${ch.sentences.length} sentences`}
                </span>
              </div>
              <ChevronRight size={19} />
            </Link>
          )
        })}
      </div>
    </>
  )
}

export function LearningPage() {
  const { state, courses, items } = useApp()
  const records = state.records,
    today = records.filter((r) => localDay(new Date(r.at)) === localDay())
  const totalMs = records.reduce((n, r) => n + r.durationMs, 0),
    typed = records.reduce((n, r) => n + r.typedCharacters, 0),
    errors = records.reduce((n, r) => n + r.errors, 0)
  const currentStreak = streak(records.map((r) => localDay(new Date(r.at))))
  const week = Array.from({ length: 7 }, (_, i) => {
    const day = new Date()
    day.setDate(day.getDate() - 6 + i)
    const list = records.filter((r) => localDay(new Date(r.at)) === localDay(day))
    return { day, count: list.length, minutes: Math.round(list.reduce((n, r) => n + r.durationMs, 0) / 60000) }
  })
  const maxMinutes = Math.max(1, ...week.map((d) => d.minutes)),
    inProgress = courses.filter((c) => completedCount(c, state) > 0)
  const lookup = new Map(items.map((item) => [item.key, item]))
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">SMALL STEPS DESERVE TO BE SEEN</div>
          <h1>
            Your English, in progress<span className="green-dot">.</span>
          </h1>
          <p>No perfect days needed. Just keep showing up.</p>
        </div>
        <Link className="button primary" to="/">
          Find a course
          <ArrowRight size={16} />
        </Link>
      </div>
      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-icon">
            <Flame size={20} />
          </span>
          <span>Current streak</span>
          <strong>
            {currentStreak}
            <small>{currentStreak === 1 ? 'day' : 'days'}</small>
          </strong>
          <p>Based on your local dates</p>
        </div>
        <div className="stat-card">
          <span className="stat-icon">
            <AudioLines size={20} />
          </span>
          <span>Sentences practiced</span>
          <strong>{records.length.toLocaleString()}</strong>
          <p>{new Set(records.map((r) => r.key)).size} different sentences</p>
        </div>
        <div className="stat-card">
          <span className="stat-icon">
            <BarChart3 size={20} />
          </span>
          <span>Active study time</span>
          <strong>
            {Math.floor(totalMs / 60000)}
            <small>min</small>
          </strong>
          <p>Pauses and idle time excluded</p>
        </div>
        <div className="stat-card">
          <span className="stat-icon">
            <Target size={20} />
          </span>
          <span>Typing accuracy</span>
          <strong>
            {typed ? Math.round(Math.max(0, 1 - errors / typed) * 100) : '—'}
            <small>{typed ? '%' : ''}</small>
          </strong>
          <p>Across your saved attempts</p>
        </div>
      </div>
      <div className="dashboard-row">
        <section className="panel week-panel">
          <SectionHeading title="A week of little wins">
            <span className="muted">Active minutes</span>
          </SectionHeading>
          <div
            className="week-chart"
            role="img"
            aria-label={`Study minutes in the last seven days: ${week.map((d) => `${d.day.toLocaleDateString('en', { weekday: 'short' })}: ${d.minutes}`).join(', ')}`}
          >
            {week.map(({ day, minutes }) => (
              <div className={`chart-day ${localDay(day) === localDay() ? 'today' : ''}`} key={localDay(day)}>
                <span>{minutes}</span>
                <div className="bar-track">
                  <div className="bar-fill" style={{ height: `${Math.max(3, (minutes / maxMinutes) * 100)}%` }} />
                </div>
                <span>{day.toLocaleDateString('en', { weekday: 'short' })}</span>
              </div>
            ))}
          </div>
        </section>
        <section className="panel today-panel">
          <span className="round-icon">
            <Target size={23} />
          </span>
          <h3>A little practice today</h3>
          <p>
            <strong>{today.length}</strong> / {state.settings.dailyGoal} sentences
          </p>
          <ProgressBar
            value={Math.min(today.length, state.settings.dailyGoal)}
            max={state.settings.dailyGoal}
            label="Today's sentence goal"
          />
          <span className="muted">
            {today.length >= state.settings.dailyGoal
              ? 'Daily goal reached. Everything extra is a bonus.'
              : `${Math.max(0, state.settings.dailyGoal - today.length)} more to reach your daily goal.`}
          </span>
          <Link className="text-button" to="/">
            Keep learning
            <ArrowRight size={15} />
          </Link>
        </section>
      </div>
      <SectionHeading title="Pick up where you left off" />
      {inProgress.length ? (
        <div className="course-grid">
          {inProgress.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<BookOpen size={27} />}
          title="Your first chapter is waiting"
          action={
            <Link className="button primary" to="/">
              Explore courses
              <ArrowRight size={16} />
            </Link>
          }
        >
          Finish a sentence in any course and your learning story will start here.
        </EmptyState>
      )}
      <SectionHeading title="Recent practice">
        <span className="muted">Last {Math.min(records.length, 8)} sentences</span>
      </SectionHeading>
      <div className="history-list">
        {records
          .slice(-8)
          .reverse()
          .map((record) => {
            const item = lookup.get(record.key)
            return item ? (
              <div className="history-row" key={record.id}>
                <CourseIcon course={item.course} size={21} />
                <div>
                  <strong>{item.sentence.text}</strong>
                  <span>
                    {item.course.title} ·{' '}
                    {new Date(record.at).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                    {record.assisted ? ' · with hints' : ''}
                  </span>
                </div>
                <span className="history-metric">
                  {friendlyTime(record.durationMs)}
                  <small>{wpm(record.characters, record.durationMs)} WPM</small>
                </span>
                <CheckCircle2 size={18} className="green" />
              </div>
            ) : null
          })}
        {!records.length && (
          <p className="no-history muted">No practice recorded yet. That can change in one sentence.</p>
        )}
      </div>
    </>
  )
}

export function CollectionPage({ kind }: { kind: 'review' | 'saved' }) {
  const { state, items, toggleFavorite } = useApp(),
    [query, setQuery] = useState('')
  const saved = kind === 'saved'
  const collection = useMemo(
    () => items.filter((item) => (saved ? state.favorites.includes(item.key) : !!state.mistakes[item.key])),
    [items, saved, state.favorites, state.mistakes],
  )
  const filtered = collection.filter((item) =>
    `${item.sentence.text} ${item.course.title}`.toLowerCase().includes(query.toLowerCase()),
  )
  const destination = `/practice/${kind}`
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">{saved ? 'KEEP THE GOOD ONES CLOSE' : 'A LITTLE MORE FAMILIAR, EVERY TIME'}</div>
          <h1>
            {saved ? 'Words worth keeping' : 'Make the tricky ones yours'}
            <span className="green-dot">.</span>
          </h1>
          <p>
            {saved
              ? 'Your bookmarked sentences, ready whenever you are.'
              : 'Practice in the original sentence. A clean, unassisted review clears it from this list.'}
          </p>
        </div>
        {collection.length > 0 && (
          <Link className="button primary" to={destination}>
            <Play size={15} />
            {saved ? 'Practice saved sentences' : 'Start review'}
          </Link>
        )}
      </div>
      {collection.length ? (
        <>
          <div className="collection-toolbar">
            <span>
              <strong>{collection.length}</strong> {saved ? 'saved' : 'sentences to revisit'}
            </span>
            <label className="search-field">
              <Search size={17} />
              <input
                placeholder="Find a sentence…"
                aria-label="Search sentences"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
          </div>
          <div className="sentence-list">
            {filtered.slice(0, 100).map((item) => (
              <SentenceRow
                key={item.key}
                item={item}
                saved={state.favorites.includes(item.key)}
                onSave={() => toggleFavorite(item.key)}
                destination={`${destination}?start=${encodeURIComponent(item.key)}`}
                count={saved ? undefined : state.mistakes[item.key]?.count}
              />
            ))}
          </div>
          {filtered.length > 100 && (
            <p className="fine-print">
              Showing the first 100 matches. Search to narrow the list; practice includes the full collection.
            </p>
          )}
          {!filtered.length && <p className="no-history muted">No sentences match this search.</p>}
        </>
      ) : (
        <EmptyState
          icon={saved ? <Bookmark size={28} /> : <Headphones size={28} />}
          title={saved ? 'Your collection starts with a sentence' : 'A clean slate. A good feeling.'}
          action={
            <Link className="button primary" to="/">
              Explore courses
              <ArrowRight size={16} />
            </Link>
          }
        >
          {saved
            ? 'Tap the bookmark during practice to keep a sentence here.'
            : 'Sentences you find tricky will appear here automatically. For now, find something new to learn.'}
        </EmptyState>
      )}
    </>
  )
}
function SentenceRow({
  item,
  saved,
  onSave,
  destination,
  count,
}: {
  item: PracticeItem
  saved: boolean
  onSave: () => void
  destination: string
  count?: number
}) {
  return (
    <article className="sentence-row">
      <CourseIcon course={item.course} size={22} />
      <div className="sentence-row-copy">
        <span className="eyebrow">
          {item.course.title} · {item.chapter.title}
        </span>
        <h3>{item.sentence.text}</h3>
        {count && (
          <span className="muted">
            {count} {count === 1 ? 'attempt' : 'attempts'} needing another look
          </span>
        )}
      </div>
      <button
        className={`icon-button ${saved ? 'saved' : ''}`}
        onClick={onSave}
        aria-label={saved ? 'Unsave sentence' : 'Save sentence'}
        aria-pressed={saved}
      >
        <Bookmark size={18} fill={saved ? 'currentColor' : 'none'} />
      </button>
      <Link className="icon-button" aria-label={`Practice: ${item.sentence.text}`} to={destination}>
        <ArrowRight size={19} />
      </Link>
    </article>
  )
}

export function SettingsPage() {
  const { state, updateSettings, restore, reset, storageError } = useApp(),
    [message, setMessage] = useState(''),
    [error, setError] = useState('')
  const backupInput = useRef<HTMLInputElement>(null),
    speech = useSpeech('Every sentence is a small step forward.', state.settings)
  const settings = state.settings
  async function restoreFile(file?: File) {
    if (!file) return
    setMessage('')
    setError('')
    try {
      if (file.size > 5 * 1024 * 1024) throw new Error('Choose a backup smaller than 5 MB.')
      const contents = await file.text()
      if (
        !window.confirm(
          'Restore this backup? It will replace the learning progress, settings, saved sentences, and imported courses on this device. Export your current data first if you need it.',
        )
      )
        return
      restore(contents)
      setMessage('Your backup has been restored.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Backup could not be restored.')
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">MAKE YOURSELF COMFORTABLE</div>
          <h1>
            A practice that fits you<span className="green-dot">.</span>
          </h1>
          <p>Changes are saved automatically on this device.</p>
        </div>
      </div>
      <div className="settings-layout">
        <section className="panel settings-panel">
          <div className="settings-title">
            <Headphones size={21} />
            <div>
              <h2>Sound & practice</h2>
              <p>Let English sound like English.</p>
            </div>
          </div>
          <div className="setting-row">
            <div>
              <label htmlFor="voice">English voice</label>
              <p>Available voices come from your browser or device.</p>
            </div>
            <select
              id="voice"
              value={speech.voices.some((v) => v.voiceURI === settings.voice) ? settings.voice : ''}
              onChange={(event) => updateSettings({ voice: event.target.value })}
            >
              <option value="">Automatic English voice</option>
              {speech.voices.map((voice) => (
                <option value={voice.voiceURI} key={voice.voiceURI}>
                  {voice.name} ({voice.lang})
                </option>
              ))}
            </select>
          </div>
          <div className="setting-row">
            <div>
              <label htmlFor="rate">Playback speed</label>
              <p>Take your time, or challenge your ear.</p>
            </div>
            <select
              id="rate"
              value={settings.rate}
              onChange={(event) => updateSettings({ rate: Number(event.target.value) })}
            >
              {[0.5, 0.65, 0.75, 0.9, 1, 1.25, 1.5, 1.75, 2].map((rate) => (
                <option key={rate} value={rate}>
                  {rate}×
                </option>
              ))}
            </select>
          </div>
          <div className="setting-row">
            <div>
              <label htmlFor="repeats">Readings per playback</label>
              <p>A short pause separates each reading.</p>
            </div>
            <select
              id="repeats"
              value={settings.repeats}
              onChange={(event) => updateSettings({ repeats: Number(event.target.value) })}
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n} {n === 1 ? 'reading' : 'readings'}
                </option>
              ))}
            </select>
          </div>
          <div className="setting-row">
            <div>
              <strong>Play after the next sentence</strong>
              <p>Starts only after you use Play in the session.</p>
            </div>
            <input
              className="switch"
              type="checkbox"
              aria-label="Automatically play next sentence"
              checked={settings.autoPlay}
              onChange={(event) => updateSettings({ autoPlay: event.target.checked })}
            />
          </div>
          <div className="voice-test">
            <button className="button secondary" onClick={speech.speaking ? speech.cancel : speech.speak}>
              <Volume2 size={16} />
              {speech.speaking ? 'Stop voice test' : 'Test this voice'}
            </button>
            <span className="fine-print">Voice availability and quality vary. Some voices require internet.</span>
          </div>
          {(!speech.supported || speech.error) && (
            <p className="inline-error" role="status">
              {speech.error || 'This browser does not support speech. You can still use Read + type mode.'}
            </p>
          )}
          <div className="setting-row">
            <div>
              <label htmlFor="default-mode">Default practice mode</label>
              <p>You can change it during any session.</p>
            </div>
            <select
              id="default-mode"
              value={settings.mode}
              onChange={(event) => updateSettings({ mode: event.target.value as PracticeMode })}
            >
              {modes.map((mode) => (
                <option key={mode.id} value={mode.id}>
                  {mode.title}
                </option>
              ))}
            </select>
          </div>
          <div className="setting-row">
            <div>
              <strong>Match capitalization</strong>
              <p>When off, “Hello” and “hello” both count.</p>
            </div>
            <input
              className="switch"
              type="checkbox"
              aria-label="Match capitalization"
              checked={settings.strictCase}
              onChange={(event) => updateSettings({ strictCase: event.target.checked })}
            />
          </div>
          <div className="setting-row">
            <div>
              <strong>Match punctuation</strong>
              <p>When off, punctuation is optional.</p>
            </div>
            <input
              className="switch"
              type="checkbox"
              aria-label="Match punctuation"
              checked={settings.strictPunctuation}
              onChange={(event) => updateSettings({ strictPunctuation: event.target.checked })}
            />
          </div>
        </section>
        <div className="settings-side">
          <section className="panel settings-panel">
            <div className="settings-title">
              <Sparkles size={21} />
              <div>
                <h2>Your space</h2>
                <p>A few personal touches.</p>
              </div>
            </div>
            <label className="stacked-label" htmlFor="theme">
              Appearance
              <select
                id="theme"
                value={settings.theme}
                onChange={(event) => updateSettings({ theme: event.target.value as typeof settings.theme })}
              >
                <option value="system">Follow device</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </label>
            <label className="stacked-label" htmlFor="daily-goal">
              Daily sentence goal
              <select
                id="daily-goal"
                value={settings.dailyGoal}
                onChange={(event) => updateSettings({ dailyGoal: Number(event.target.value) })}
              >
                {[5, 10, 15, 20, 30, 50, 100].map((n) => (
                  <option key={n} value={n}>
                    {n} sentences
                  </option>
                ))}
              </select>
            </label>
          </section>
          <section className="panel settings-panel">
            <div className="settings-title">
              <ShieldCheck size={21} />
              <div>
                <h2>Your data is yours</h2>
                <p>No account. No tracking. No cloud sync.</p>
              </div>
            </div>
            <p className="muted">
              Progress, imported courses, and saved sentences live in this browser. Clearing site data removes them.
              Keep a backup for a fresh device.
            </p>
            <button
              className="button secondary full-width"
              onClick={() => downloadFile('sentence-backup.json', JSON.stringify(state, null, 2))}
            >
              <Download size={16} />
              Export progress backup
            </button>
            <button className="button secondary full-width" onClick={() => backupInput.current?.click()}>
              <Upload size={16} />
              Restore a backup
            </button>
            <input
              ref={backupInput}
              type="file"
              accept=".json,application/json"
              className="sr-only"
              aria-label="Progress backup file"
              onChange={(event) => {
                void restoreFile(event.target.files?.[0])
                event.target.value = ''
              }}
            />
            {storageError && (
              <button
                className="text-button"
                onClick={() => {
                  try {
                    downloadFile('sentence-recovery.txt', localStorage.getItem(STORAGE_KEY) ?? '', 'text/plain')
                  } catch {
                    setError('Browser storage is unavailable.')
                  }
                }}
              >
                Download existing storage for recovery
              </button>
            )}
            {message && (
              <p className="success-text" role="status">
                {message}
              </p>
            )}
            {error && (
              <p className="inline-error" role="alert">
                {error}
              </p>
            )}
            <button
              className="text-button danger-text"
              onClick={() => {
                if (
                  window.confirm(
                    'Reset all Sentence data on this device? This deletes your progress, saved sentences, imported courses, and settings. Export a backup first.',
                  )
                ) {
                  reset()
                  setMessage('Local data reset. A fresh start.')
                  setError('')
                }
              }}
            >
              Reset local data
            </button>
          </section>
        </div>
      </div>
    </>
  )
}

export function AboutPage() {
  return (
    <div className="about-page">
      <div className="eyebrow">OPEN SOURCE. OPEN TO YOU.</div>
      <h1>
        A little English, every day<span className="green-dot">.</span>
      </h1>
      <p className="lede">
        Sentence is a free, independently branded sentence-listening and typing app. Hear a whole thought, type it
        yourself, and make it a little more familiar.
      </p>
      <section className="panel">
        <h2>Built with a good starting point</h2>
        <p>
          This application is adapted from{' '}
          <a href="https://github.com/RealKai42/qwerty-learner" target="_blank" rel="noopener noreferrer">
            Qwerty Learner by RealKai42 and contributors
          </a>
          . It retains the React, TypeScript, and Vite foundation, adapts the browser speech hook and practice
          architecture, and reuses upstream utilities. Sentence practice, the English interface, local learning model,
          and course content are new work.
        </p>
        <p>
          The app is released under GNU GPL version 3. Original notices and modification details are included in the
          source. It comes without warranty. You may copy, modify, and redistribute it under that license.
        </p>
        <div className="inline-actions">
          <a
            className="button secondary"
            href="https://github.com/i-houssin/sentence-learner"
            target="_blank"
            rel="noopener noreferrer"
          >
            Source code
            <ArrowUpRight size={15} />
          </a>
          <a className="button secondary" href="/license.txt" target="_blank" rel="noopener noreferrer">
            Read GPL-3.0
            <ArrowUpRight size={15} />
          </a>
        </div>
      </section>
      <section className="panel">
        <h2>Your content. Your privacy.</h2>
        <p>
          The eight starter courses contain 800 original example sentences. They do not reproduce YouType’s paid
          courses, recordings, or branding. Sentence is not affiliated with YouType or Qwerty Learner’s maintainers.
        </p>
        <p>
          Your learning data stays in this browser. There are no analytics, advertising trackers, or application
          accounts. Browser speech is provided by your device; an online voice may send sentence text to its speech
          provider. We do not record your microphone.
        </p>
        <p>
          Practice works best with a physical keyboard, but a phone or tablet’s regular keyboard works too. Audio
          depends on available English voices and browser support. Use Read + type when speech is unavailable.
        </p>
      </section>
      <Link className="text-button" to="/">
        Find your next sentence
        <ArrowRight size={16} />
      </Link>
    </div>
  )
}
export function NotFoundPage() {
  return (
    <EmptyState
      title="This page wandered off"
      action={
        <Link className="button primary" to="/">
          Back to courses
          <ArrowRight size={16} />
        </Link>
      }
    >
      That course or page isn’t available on this device. If it was imported elsewhere, restore your backup here.
    </EmptyState>
  )
}
