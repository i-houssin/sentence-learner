import { useEffect, useState } from 'react'
import {
  BarChart3,
  Bookmark,
  Check,
  ChevronRight,
  CircleHelp,
  Headphones,
  LayoutGrid,
  Menu,
  Settings2,
  ShieldCheck,
  X,
} from 'lucide-react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { Brand } from './UI'
import { useApp } from '../hooks/useApp'
import { localDay } from '../lib/matching'

export default function Shell() {
  const { state, storageError } = useApp(),
    [open, setOpen] = useState(false),
    location = useLocation()
  useEffect(() => {
    setOpen(false)
    window.scrollTo(0, 0)
  }, [location.pathname])
  const today = state.records.filter((r) => localDay(new Date(r.at)) === localDay()).length
  const goal = state.settings.dailyGoal,
    fraction = Math.min(today / goal, 1)
  const labels: Record<string, string> = {
    '/': 'Courses',
    '/learning': 'My learning',
    '/review': 'Review',
    '/saved': 'Saved sentences',
    '/settings': 'Settings',
    '/about': 'About Sentence',
  }
  const label = labels[location.pathname] ?? 'Your course'
  const navigation = [
    { to: '/', icon: LayoutGrid, label: 'Courses', end: true },
    { to: '/learning', icon: BarChart3, label: 'My learning' },
    { to: '/review', icon: Headphones, label: 'Review', count: Object.keys(state.mistakes).length },
    { to: '/saved', icon: Bookmark, label: 'Saved sentences', count: state.favorites.length },
  ]
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      {open && <button className="sidebar-backdrop" aria-label="Close navigation" onClick={() => setOpen(false)} />}
      <aside className={`sidebar ${open ? 'sidebar-open' : ''}`}>
        <div className="sidebar-brand">
          <Brand />
          <button className="icon-button mobile-only" aria-label="Close navigation" onClick={() => setOpen(false)}>
            <X size={20} />
          </button>
        </div>
        <p className="sidebar-tagline">Hear it. Type it. Learn it.</p>
        <div className="nav-label">YOUR LEARNING SPACE</div>
        <nav aria-label="Main navigation">
          {navigation.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <item.icon size={18} strokeWidth={1.8} />
              <span>{item.label}</span>
              {!!item.count && <span className="nav-count">{item.count}</span>}
            </NavLink>
          ))}
        </nav>
        <div className="daily-card">
          <div className="daily-ring">
            <svg viewBox="0 0 48 48" aria-hidden="true">
              <circle cx="24" cy="24" r="20" />
              <circle className="ring-value" cx="24" cy="24" r="20" strokeDasharray={`${fraction * 125.66} 125.66`} />
            </svg>
            {fraction >= 1 ? <Check size={17} /> : <span>{today}</span>}
          </div>
          <div>
            <strong>Daily goal</strong>
            <p>
              {Math.min(today, goal)} of {goal} sentences
            </p>
          </div>
          <div className="daily-note">{fraction >= 1 ? 'You showed up. Nicely done.' : 'Small steps add up.'}</div>
        </div>
        <div className="sidebar-bottom">
          <NavLink to="/settings" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <Settings2 size={18} />
            Settings
          </NavLink>
          <NavLink to="/about" className="nav-link">
            <CircleHelp size={18} />
            About & open source
          </NavLink>
          <div className="device-note">
            <ShieldCheck size={15} />
            <span>Progress stays on this device.</span>
          </div>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="topbar-left">
            <button className="icon-button mobile-only" onClick={() => setOpen(true)} aria-label="Open navigation">
              <Menu size={22} />
            </button>
            <span className="topbar-label">Your learning space</span>
            <ChevronRight size={14} />
            <strong>{label}</strong>
          </div>
          <span className="local-badge">
            <span />
            Free. No account needed.
          </span>
        </header>
        {storageError && (
          <div className="storage-warning" role="alert">
            {storageError} <Link to="/settings">Open Settings</Link>
          </div>
        )}
        <main id="main-content" className="main-content">
          <Outlet />
        </main>
        <footer className="app-footer">
          <span>A little English, every day.</span>
          <span>
            Built on{' '}
            <a href="https://github.com/RealKai42/qwerty-learner" target="_blank" rel="noopener noreferrer">
              Qwerty Learner
            </a>
            <span className="footer-dot">·</span>
            <Link to="/about">GPL-3.0</Link>
          </span>
        </footer>
      </div>
    </div>
  )
}
