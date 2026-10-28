import { useEffect, useId, useRef } from 'react'
import type { ReactNode } from 'react'
import {
  ArrowUpRight,
  BookOpen,
  BriefcaseBusiness,
  Check,
  Code2,
  Headphones,
  MessageCircle,
  Plane,
  Sparkles,
  Sun,
  Type,
  X,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Course } from '../types'
import { useApp } from '../hooks/useApp'
import { completedCount, palette, sentenceCount } from '../data/catalog'

export function Brand({ small = false }: { small?: boolean }) {
  return (
    <Link to="/" className={`brand ${small ? 'brand-small' : ''}`} aria-label="Sentence home">
      <span className="brand-mark">
        <Type size={23} strokeWidth={2.4} />
      </span>
      <span>
        sentence<span className="brand-period">.</span>
      </span>
    </Link>
  )
}
export function CourseIcon({ course, size = 29 }: { course: Course; size?: number }) {
  const p = palette(course),
    props = { size, strokeWidth: 1.65, 'aria-hidden': true as const }
  const icons: Record<string, ReactNode> = {
    sun: <Sun {...props} />,
    plane: <Plane {...props} />,
    chat: <MessageCircle {...props} />,
    briefcase: <BriefcaseBusiness {...props} />,
    book: <BookOpen {...props} />,
    code: <Code2 {...props} />,
    spark: <Sparkles {...props} />,
    letters: <Type {...props} />,
  }
  return (
    <span className="course-icon" style={{ color: p.color, background: p.bg }}>
      {icons[p.icon] ?? icons.book}
    </span>
  )
}
export function ProgressBar({ value, max = 100, label = 'Progress' }: { value: number; max?: number; label?: string }) {
  return <progress className="progress" aria-label={label} value={value} max={max || 1} />
}
export function CourseCard({ course }: { course: Course }) {
  const { state } = useApp(),
    total = sentenceCount(course),
    done = completedCount(course, state),
    p = palette(course)
  return (
    <Link className="course-card" to={`/course/${course.id}`} aria-label={`Explore ${course.title}`}>
      <div className="course-art" style={{ background: p.bg, color: p.color }}>
        <span className="course-art-label">{p.label}</span>
        <CourseIcon course={course} size={49} />
        <div className="art-lines" aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
        <span className="level-badge">{course.level}</span>
      </div>
      <div className="course-card-body">
        <div className="eyebrow">{course.custom ? 'Your course' : course.category}</div>
        <h3>{course.title}</h3>
        <p>{course.tagline}</p>
        <div className="course-meta">
          <span>
            <BookOpen size={13} /> {course.chapters.length} chapters
          </span>
          <span>{total} sentences</span>
        </div>
        <div className="course-card-bottom">
          {done > 0 ? (
            <div className="card-progress">
              <ProgressBar value={done} max={total} />
              <span>{Math.round((done / total) * 100)}% complete</span>
            </div>
          ) : (
            <span className="course-start">Explore course</span>
          )}
          <span className={`card-arrow ${done === total ? 'is-complete' : ''}`}>
            {done === total ? <Check size={16} /> : <ArrowUpRight size={17} />}
          </span>
        </div>
      </div>
    </Link>
  )
}
export function EmptyState({
  icon,
  title,
  children,
  action,
}: {
  icon?: ReactNode
  title: string
  children: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="empty-state">
      <span className="empty-icon">{icon ?? <Headphones size={28} />}</span>
      <h2>{title}</h2>
      <p>{children}</p>
      {action}
    </div>
  )
}
export function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null),
    id = useId()
  useEffect(() => {
    const element = ref.current
    element?.showModal()
    return () => {
      element?.close()
    }
  }, [])
  return (
    <dialog
      ref={ref}
      className="modal"
      aria-labelledby={id}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="modal-content">
        <div className="modal-header">
          <h2 id={id}>{title}</h2>
          <button className="icon-button" onClick={onClose} aria-label="Close dialog">
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  )
}
export function SectionHeading({
  eyebrow,
  title,
  children,
}: {
  eyebrow?: string
  title: string
  children?: ReactNode
}) {
  return (
    <div className="section-heading">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h2>{title}</h2>
      </div>
      {children}
    </div>
  )
}
