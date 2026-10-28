/* Sentence-level adaptation of Qwerty Learner's chapter/typing practice flow.
 * This module replaces word-by-word input with complete thoughts and native text input.
 * GPL-3.0; substantial modifications made 2026-10-28. */
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  AudioLines,
  Bookmark,
  Check,
  CheckCircle2,
  ChevronDown,
  Eye,
  Headphones,
  Keyboard,
  RotateCcw,
  Settings2,
  SkipForward,
  Sparkles,
  Volume2,
  X,
} from 'lucide-react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Brand, EmptyState, ProgressBar } from './UI'
import { useApp } from '../hooks/useApp'
import type { AnswerMetrics } from '../hooks/useApp'
import useSpeech from '../hooks/useSpeech'
import { chapterKey } from '../data/catalog'
import { checkAnswer, clock, hintMask, insertionStats, normalize, wpm } from '../lib/matching'
import shuffle from '../upstream/shuffle'
import type { PracticeItem, PracticeMode } from '../types'

const modeLabels: { mode: PracticeMode; label: string }[] = [
  { mode: 'read', label: 'Read + type' },
  { mode: 'hints', label: 'A little help' },
  { mode: 'dictation', label: 'Listen + type' },
]
export default function PracticePage({ collection }: { collection?: 'review' | 'saved' }) {
  const { courseId, chapterId } = useParams(),
    [params] = useSearchParams(),
    navigate = useNavigate()
  const {
    state,
    courses,
    items,
    storageError,
    updateSettings,
    setLastPractice,
    commitAnswer,
    markMistake,
    saveCursor,
    toggleFavorite,
  } = useApp()
  const course = courses.find((c) => c.id === courseId),
    chapter = course?.chapters.find((c) => c.id === chapterId)
  const [queue] = useState<PracticeItem[]>(() => {
    let result: PracticeItem[]
    if (collection)
      result = items.filter((item) =>
        collection === 'review' ? !!state.mistakes[item.key] : state.favorites.includes(item.key),
      )
    else if (course && chapter) {
      const progress = state.progress[chapterKey(course, chapter)]
      const all = items.filter((item) => item.course.id === course.id && item.chapter.id === chapter.id)
      const pending = all.filter((item) => !progress?.completed.includes(item.sentence.id))
      result = pending.length ? pending : all
      const cursor = progress?.cursor ?? 0
      const start = result.findIndex((item) => chapter.sentences.findIndex((s) => s.id === item.sentence.id) >= cursor)
      if (start > 0) result = [...result.slice(start), ...result.slice(0, start)]
    } else result = []
    const startKey = params.get('start')
    if (startKey) {
      const index = result.findIndex((item) => item.key === startKey)
      if (index > 0) result = [...result.slice(index), ...result.slice(0, index)]
    } else if (collection === 'review') result = shuffle(result)
    return result
  })
  const [position, setPosition] = useState(0),
    [answer, setAnswer] = useState(''),
    [status, setStatus] = useState<'typing' | 'wrong' | 'correct'>('typing')
  const [mode, setMode] = useState<PracticeMode>(collection === 'review' ? 'dictation' : state.settings.mode)
  const [revealed, setRevealed] = useState(false),
    [finished, setFinished] = useState(false),
    [elapsed, setElapsed] = useState(0),
    [notice, setNotice] = useState(''),
    [audioUsed, setAudioUsed] = useState(false)
  const [summary, setSummary] = useState({
    sentences: 0,
    skipped: 0,
    milliseconds: 0,
    characters: 0,
    typed: 0,
    errors: 0,
  })
  const textarea = useRef<HTMLTextAreaElement>(null),
    played = useRef(false),
    locked = useRef(false),
    focused = useRef(false),
    statusRef = useRef(status)
  const counter = useRef({ ms: 0, tick: Date.now(), activity: 0, typed: 0, errors: 0, attempts: 0 })
  const item = queue[position],
    settings = state.settings
  const audio = useSpeech(item?.sentence.text ?? '', settings)
  statusRef.current = status
  const flush = useCallback(() => {
    const now = Date.now(),
      current = counter.current
    if (
      focused.current &&
      document.visibilityState === 'visible' &&
      current.activity > 0 &&
      now - current.activity < 15000 &&
      statusRef.current !== 'correct'
    )
      current.ms += Math.min(1100, Math.max(0, now - current.tick))
    current.tick = now
    setElapsed(current.ms)
  }, [])
  useEffect(() => {
    const timer = window.setInterval(flush, 1000)
    return () => clearInterval(timer)
  }, [flush])
  useEffect(() => {
    if (course && chapter && !collection) setLastPractice(course.id, chapter.id)
    textarea.current?.focus({ preventScroll: true })
    // The queue is intentionally captured at entry: progress writes must not reorder a running session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => {
    if (position > 0 && played.current && settings.autoPlay && !finished) audio.speak()
    // Playback is triggered only by advancing after an explicit Play gesture in this session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position])
  function play() {
    played.current = true
    setAudioUsed(true)
    audio.speak()
    textarea.current?.focus({ preventScroll: true })
  }
  function reveal() {
    setRevealed(true)
    textarea.current?.focus({ preventScroll: true })
  }
  function change(next: string) {
    if (!item || status === 'correct') return
    flush()
    const inserted = insertionStats(answer, next, item.sentence.text, settings)
    counter.current.typed += inserted.characters
    counter.current.errors += inserted.errors
    counter.current.activity = Date.now()
    setAnswer(next)
    setNotice('')
    if (status === 'wrong') setStatus('typing')
  }
  function submit() {
    if (!item || locked.current) return
    if (!answer.trim()) {
      setNotice('Type a sentence first. Take your time.')
      textarea.current?.focus()
      return
    }
    flush()
    counter.current.attempts++
    const assessment = checkAnswer(answer, item.sentence.text, settings)
    if (!assessment.correct) {
      counter.current.errors = Math.max(counter.current.errors, assessment.errors)
      setStatus('wrong')
      markMistake(item)
      textarea.current?.focus()
      return
    }
    locked.current = true
    const metrics: AnswerMetrics = {
      durationMs: counter.current.ms,
      characters: normalize(item.sentence.text, settings).length,
      typedCharacters: Math.max(counter.current.typed, answer.length),
      errors: counter.current.errors,
      attempts: counter.current.attempts,
      assisted: revealed || mode === 'hints' || (collection === 'review' && mode !== 'dictation'),
      review: collection === 'review',
    }
    commitAnswer(item, metrics)
    setSummary((old) => ({
      ...old,
      sentences: old.sentences + 1,
      milliseconds: old.milliseconds + metrics.durationMs,
      characters: old.characters + metrics.characters,
      typed: old.typed + metrics.typedCharacters,
      errors: old.errors + metrics.errors,
    }))
    setStatus('correct')
    audio.cancel()
  }
  function advance(skip = false) {
    if (!item) return
    flush()
    audio.cancel()
    if (skip) {
      markMistake(item)
      setSummary((old) => ({ ...old, skipped: old.skipped + 1 }))
      if (!collection)
        saveCursor(
          item,
          (item.chapter.sentences.findIndex((s) => s.id === item.sentence.id) + 1) % item.chapter.sentences.length,
        )
    }
    if (position === queue.length - 1) {
      setFinished(true)
      return
    }
    counter.current = { ms: 0, tick: Date.now(), activity: 0, typed: 0, errors: 0, attempts: 0 }
    locked.current = false
    statusRef.current = 'typing'
    setElapsed(0)
    setAnswer('')
    setStatus('typing')
    setRevealed(false)
    setNotice('')
    setPosition((old) => old + 1)
    setTimeout(() => textarea.current?.focus({ preventScroll: true }), 0)
  }
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (finished || !item || event.repeat) return
      if (event.altKey && event.key.toLowerCase() === 'r') {
        event.preventDefault()
        play()
      }
      if (event.altKey && event.key.toLowerCase() === 'h') {
        event.preventDefault()
        reveal()
      }
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  })
  const back = collection ? `/${collection}` : course ? `/course/${course.id}` : '/'
  if (!queue.length)
    return (
      <div className="practice-shell">
        <header className="practice-header">
          <Brand small />
          <Link className="icon-button" to={back} aria-label="Exit practice">
            <X size={20} />
          </Link>
        </header>
        <EmptyState
          title={collection ? 'Nothing to practice here yet' : 'This chapter is not available'}
          action={
            <Link className="button primary" to={back}>
              Back to learning
              <ArrowRight size={16} />
            </Link>
          }
        >
          {collection
            ? 'Explore a course, save a sentence, or return when you have something to review.'
            : 'The course may have been imported on a different device. Restore its backup here first.'}
        </EmptyState>
      </div>
    )
  const visibleTarget = mode === 'read' || revealed || status === 'correct'
  const accuracy = counter.current.typed
    ? Math.max(0, Math.round((1 - counter.current.errors / counter.current.typed) * 100))
    : 100
  const next = course && chapter ? course.chapters[course.chapters.findIndex((c) => c.id === chapter.id) + 1] : null
  if (finished)
    return (
      <div className="practice-shell">
        <header className="practice-header">
          <Brand small />
          <Link className="text-button" to={back}>
            <X size={18} />
            Exit practice
          </Link>
        </header>
        <main className="summary-page">
          <span className="completion-icon">
            <CheckCircle2 size={43} />
          </span>
          <div className="eyebrow">SMALL STEPS. REAL PROGRESS.</div>
          <h1>
            {collection === 'review'
              ? 'A little more familiar.'
              : collection === 'saved'
                ? 'Good words, well practiced.'
                : summary.skipped
                  ? 'A good session in the books.'
                  : 'Another chapter in your story.'}
          </h1>
          <p>
            {summary.sentences} {summary.sentences === 1 ? 'sentence' : 'sentences'} practiced
            {summary.skipped ? ` · ${summary.skipped} saved for review` : ''}. That’s time well spent.
          </p>
          <div className="summary-stats">
            <div>
              <strong>{summary.sentences}</strong>
              <span>sentences</span>
            </div>
            <div>
              <strong>
                {summary.typed ? Math.max(0, Math.round((1 - summary.errors / summary.typed) * 100)) : 0}
                <small>%</small>
              </strong>
              <span>accuracy</span>
            </div>
            <div>
              <strong>{wpm(summary.characters, summary.milliseconds)}</strong>
              <span>words / min</span>
            </div>
            <div>
              <strong>{clock(summary.milliseconds)}</strong>
              <span>active time</span>
            </div>
          </div>
          {collection === 'review' && Object.keys(state.mistakes).length > 0 && (
            <p className="fine-print">
              Some sentences still need a clean, unassisted dictation. They’re waiting in Review.
            </p>
          )}
          <div className="summary-actions">
            {next && course ? (
              <Link className="button primary" to={`/practice/${course.id}/${next.id}`}>
                Next chapter
                <ArrowRight size={17} />
              </Link>
            ) : (
              <Link className="button primary" to="/learning">
                See my learning
                <ArrowRight size={17} />
              </Link>
            )}
            <button
              className="button secondary"
              onClick={() =>
                navigate(window.location.pathname + window.location.search, {
                  replace: true,
                  state: { replay: crypto.randomUUID() },
                })
              }
            >
              <RotateCcw size={16} />
              Practice again
            </button>
          </div>
          <Link className="text-button" to={back}>
            Back to {collection ?? 'course'}
            <ArrowRight size={15} />
          </Link>
        </main>
      </div>
    )
  return (
    <div className="practice-shell">
      <header className="practice-header">
        <Brand small />
        <div className="practice-breadcrumb">
          <Link to={back}>
            {collection === 'review'
              ? 'Mistake review'
              : collection === 'saved'
                ? 'Saved sentences'
                : item.course.title}
          </Link>
          <ChevronDown size={13} />
          <span>{collection ? 'Practice session' : item.chapter.title}</span>
        </div>
        <Link className="icon-button" to={back} aria-label="Exit practice">
          <X size={20} />
        </Link>
      </header>
      {storageError && (
        <div className="storage-warning" role="alert">
          {storageError}
        </div>
      )}
      <main className="practice-main">
        <div className="session-top">
          <Link className="back-link" to={back}>
            <ArrowLeft size={15} />
            {collection ? 'Back to collection' : 'Back to course'}
          </Link>
          <span className="session-count">
            Sentence <strong>{position + 1}</strong> of {queue.length}
          </span>
          <span className="save-indicator">
            <span />
            {storageError ? 'Saving unavailable' : 'Completed sentences auto-save'}
          </span>
        </div>
        <ProgressBar value={position + (status === 'correct' ? 1 : 0)} max={queue.length} label="Session progress" />
        <div className="practice-toolbar">
          <div className="mode-switch" aria-label="Practice mode">
            {modeLabels.map((option) => (
              <button
                key={option.mode}
                aria-pressed={mode === option.mode}
                disabled={status === 'correct'}
                className={mode === option.mode ? 'selected' : ''}
                onClick={() => {
                  setMode(option.mode)
                  updateSettings({ mode: option.mode })
                  textarea.current?.focus()
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
          <details className="practice-options">
            <summary aria-label="Practice options">
              <Settings2 size={17} />
              <span>Options</span>
            </summary>
            <div className="options-popover">
              <label>
                Speed
                <select
                  aria-label="Practice playback speed"
                  value={settings.rate}
                  onChange={(event) => updateSettings({ rate: Number(event.target.value) })}
                >
                  {[0.5, 0.65, 0.75, 0.9, 1, 1.25, 1.5, 1.75, 2].map((rate) => (
                    <option key={rate} value={rate}>
                      {rate}×
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Readings
                <select
                  aria-label="Practice repeat count"
                  value={settings.repeats}
                  onChange={(event) => updateSettings({ repeats: Number(event.target.value) })}
                >
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Voice
                <select
                  aria-label="Practice English voice"
                  value={audio.voices.some((v) => v.voiceURI === settings.voice) ? settings.voice : ''}
                  onChange={(event) => updateSettings({ voice: event.target.value })}
                >
                  <option value="">Automatic English voice</option>
                  {audio.voices.map((voice) => (
                    <option value={voice.voiceURI} key={voice.voiceURI}>
                      {voice.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="option-check">
                <input
                  type="checkbox"
                  checked={settings.autoPlay}
                  onChange={(event) => updateSettings({ autoPlay: event.target.checked })}
                />
                Play next sentence automatically
              </label>
              <label className="option-check">
                <input
                  type="checkbox"
                  checked={settings.strictCase}
                  onChange={(event) => updateSettings({ strictCase: event.target.checked })}
                />
                Match capitalization
              </label>
              <label className="option-check">
                <input
                  type="checkbox"
                  checked={settings.strictPunctuation}
                  onChange={(event) => updateSettings({ strictPunctuation: event.target.checked })}
                />
                Match punctuation
              </label>
            </div>
          </details>
        </div>
        <section className={`sentence-stage ${status === 'correct' ? 'stage-correct' : ''}`}>
          <div className="stage-caption">
            <span>
              <Headphones size={15} />
              {mode === 'dictation' && !visibleTarget
                ? 'LISTEN TO THE WHOLE THOUGHT'
                : mode === 'hints' && !visibleTarget
                  ? 'A LITTLE GUIDANCE, A LITTLE INDEPENDENCE'
                  : 'LET’S MAKE THIS SENTENCE YOURS'}
            </span>
            <button
              className={`icon-button ${state.favorites.includes(item.key) ? 'saved' : ''}`}
              aria-label={state.favorites.includes(item.key) ? 'Unsave sentence' : 'Save sentence'}
              aria-pressed={state.favorites.includes(item.key)}
              onClick={() => toggleFavorite(item.key)}
            >
              <Bookmark size={19} fill={state.favorites.includes(item.key) ? 'currentColor' : 'none'} />
            </button>
          </div>
          {visibleTarget ? (
            <p className="target-sentence" data-testid="target-sentence">
              {item.sentence.text}
            </p>
          ) : mode === 'hints' ? (
            <div>
              <p className="target-sentence hint-sentence">{hintMask(item.sentence.text)}</p>
              {item.sentence.hint && <p className="sentence-hint">{item.sentence.hint}</p>}
            </div>
          ) : (
            <div className="dictation-prompt">
              <div className={`listening-orbit ${audio.speaking ? 'playing' : ''}`}>
                <AudioLines size={38} />
              </div>
              <h1>What do you hear?</h1>
              <p>Play the audio, then type the complete sentence below.</p>
            </div>
          )}
          <div className="audio-row">
            <button
              className={`audio-button ${audio.speaking ? 'playing' : ''}`}
              onClick={audio.speaking ? audio.cancel : play}
              aria-label={
                audio.speaking ? 'Stop sentence audio' : audioUsed ? 'Replay sentence audio' : 'Play sentence audio'
              }
            >
              {audio.speaking ? <AudioLines size={19} /> : <Volume2 size={19} />}
              <span>{audio.speaking ? 'Playing…' : audioUsed ? 'Listen again' : 'Listen to sentence'}</span>
              <span className="audio-rate">{settings.rate}×</span>
            </button>
            {mode !== 'read' && !revealed && status !== 'correct' && (
              <button className="text-button reveal-button" onClick={reveal}>
                <Eye size={16} />
                Show sentence
              </button>
            )}
          </div>
          {(audio.error || !audio.supported) && (
            <p className="audio-warning" role="status">
              {audio.error ||
                'Speech is unavailable in this browser. Choose Read + type, or try a browser with English voices.'}
            </p>
          )}
        </section>
        <section
          className={`answer-panel ${status === 'wrong' ? 'answer-wrong' : status === 'correct' ? 'answer-correct' : ''}`}
        >
          <label htmlFor="sentence-answer">
            {status === 'correct' ? 'A whole thought, well typed.' : 'Your turn. Type the whole sentence.'}
            <span>
              {settings.strictCase ? 'Case sensitive' : 'Case optional'} ·{' '}
              {settings.strictPunctuation ? 'Punctuation required' : 'Punctuation optional'}
            </span>
          </label>
          <textarea
            id="sentence-answer"
            ref={textarea}
            value={answer}
            placeholder="Start typing here…"
            aria-label="Type the complete sentence"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
            maxLength={1200}
            rows={3}
            readOnly={status === 'correct'}
            onFocus={() => {
              focused.current = true
              counter.current.tick = Date.now()
            }}
            onBlur={() => {
              flush()
              focused.current = false
            }}
            onChange={(event) => change(event.target.value)}
            onPaste={(event) => {
              event.preventDefault()
              setNotice('Typing is the practice—paste is off in this field.')
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault()
                if (!event.repeat) {
                  if (status === 'correct') advance()
                  else submit()
                }
              }
            }}
          />
          <div className="answer-bottom">
            <span>
              <Keyboard size={15} />
              {status === 'correct' ? 'Press Enter to keep going' : 'Enter to check · Shift + Enter for a new line'}
            </span>
            <span>{answer.length} characters</span>
          </div>
        </section>
        <div className={`answer-feedback ${status}`} aria-live="polite" role="status">
          {status === 'correct' ? (
            <>
              <CheckCircle2 size={20} />
              <div>
                <strong>
                  {counter.current.errors ? 'You worked through it. Nicely done.' : 'That’s it. Every word.'}
                </strong>
                <p>
                  {counter.current.errors
                    ? 'This sentence is saved in Review for another day.'
                    : collection === 'review' && !revealed && mode === 'dictation'
                      ? 'A clean dictation. This sentence has left your review list.'
                      : 'A little more English that feels familiar.'}
                </p>
              </div>
            </>
          ) : status === 'wrong' ? (
            <>
              <RotateCcw size={19} />
              <div>
                <strong>Not quite yet. You’ve got another try.</strong>
                <p>
                  {visibleTarget ? (
                    <AttemptWords
                      answer={answer}
                      target={item.sentence.text}
                      strictCase={settings.strictCase}
                      strictPunctuation={settings.strictPunctuation}
                    />
                  ) : (
                    'Listen again, or reveal the sentence for a little help.'
                  )}
                </p>
              </div>
            </>
          ) : (
            <span className="muted">
              {notice ||
                (mode === 'dictation'
                  ? 'Listen as often as you like. There’s no rush.'
                  : 'It’s one complete thought—not a race.')}
            </span>
          )}
        </div>
        <div className="practice-actions">
          <button className="text-button muted" onClick={() => advance(true)} disabled={status === 'correct'}>
            <SkipForward size={16} />
            Skip for now
          </button>
          <button className="button primary check-button" onClick={() => (status === 'correct' ? advance() : submit())}>
            {status === 'correct'
              ? position === queue.length - 1
                ? 'Finish session'
                : 'Next sentence'
              : 'Check sentence'}
            {status === 'correct' ? <ArrowRight size={17} /> : <Check size={17} />}
          </button>
        </div>
        <div className="live-stats">
          <div>
            <strong>{clock(elapsed)}</strong>
            <span>active time</span>
          </div>
          <div>
            <strong>
              {answer ? accuracy : '—'}
              {answer ? '%' : ''}
            </strong>
            <span>accuracy</span>
          </div>
          <div>
            <strong>{wpm(normalize(answer, settings).length, elapsed)}</strong>
            <span>words / min</span>
          </div>
          <div className="stat-reminder">
            <Sparkles size={18} />
            <span>Progress over perfection.</span>
          </div>
        </div>
        <footer className="practice-footer">
          <span>
            <kbd>Alt</kbd> + <kbd>R</kbd> replay<span className="footer-dot">·</span>
            <kbd>Alt</kbd> + <kbd>H</kbd> reveal
          </span>
          <span>Completed sentences save. Unchecked drafts don’t.</span>
        </footer>
      </main>
    </div>
  )
}
function AttemptWords({
  answer,
  target,
  strictCase,
  strictPunctuation,
}: {
  answer: string
  target: string
  strictCase: boolean
  strictPunctuation: boolean
}) {
  const actual = answer.split(/\s+/),
    expected = target.split(/\s+/),
    options = { strictCase, strictPunctuation }
  return (
    <span className="attempt-words">
      You typed:{' '}
      {actual.map((word, i) => (
        <span
          key={i}
          className={normalize(word, options) === normalize(expected[i] ?? '', options) ? 'word-right' : 'word-wrong'}
        >
          {word}{' '}
        </span>
      ))}
    </span>
  )
}
