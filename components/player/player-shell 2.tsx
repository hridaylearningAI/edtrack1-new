"use client"

/**
 * The single course player shell: sidebar, progress and content frame.
 *
 * Renders any course from the unified model (lib/player/model.ts), so GNPS units and general
 * courses share one layout. It decides nothing about unlocking — callers pass `isUnlocked`, which
 * comes from lib/player/gating.ts.
 */
import { useEffect, useRef, useState, type ReactNode } from "react"
import Link from "next/link"
import {
  BookOpen, Check, ChevronLeft, ChevronRight, ClipboardList, FileText, Layers, Lock,
  PlayCircle, ScrollText, Sparkles, Stethoscope, X, type LucideIcon,
} from "lucide-react"

import { StudioTransition } from "./studio-transition"
import { LearningBrand } from "./learning-brand"
import "./learning-player.css"
import "./studio.css"

import { cn } from "@/lib/utils"
import type { PageId } from "@/lib/player/gating"
import { flattenActivities, requiredActivities, type Activity, type ActivityKind, type CourseModel } from "@/lib/player/model"

const ACTIVITY_ICON: Record<ActivityKind, LucideIcon> = {
  notes: ScrollText,
  video: PlayCircle,
  audio: PlayCircle,
  slides: Layers,
  flashcards: Sparkles,
  quiz: ClipboardList,
  "case-study": Stethoscope,
  decision: Stethoscope,
  "practice-q": ClipboardList,
  ngn: Stethoscope,
  overview: FileText,
  home: BookOpen,
}

export type PlayerShellProps = {
  model: CourseModel
  currentPageId: PageId
  completed: ReadonlySet<PageId>
  isUnlocked: (pageId: PageId) => boolean
  /** Unlock state as it will be once the current activity is finished — drives the Next button. */
  isUnlockedAfterCurrent: (pageId: PageId) => boolean
  onNavigate: (pageId: PageId) => void
  /** Marks the current activity complete without navigating (used on the final activity). */
  onComplete?: () => void
  /** Where "Back" goes; the student course list by default. */
  backHref?: string
  backLabel?: string
  children: ReactNode
  contentReady?: boolean
}

export function PlayerShell({
  model,
  currentPageId,
  completed,
  isUnlocked,
  isUnlockedAfterCurrent,
  onNavigate,
  onComplete,
  backHref = "/student/current-units",
  backLabel = "Current units",
  children,
  contentReady = true,
}: PlayerShellProps) {
  const animateActivity = useRef(true)
  const [navOpen, setNavOpen] = useState(false)
  const sidebarRef = useRef<HTMLElement>(null)
  const menuRef = useRef<HTMLButtonElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!navOpen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); setNavOpen(false) }
      if (event.key !== 'Tab') return
      const controls = Array.from(sidebarRef.current?.querySelectorAll<HTMLElement>('a[href], button:not(:disabled), summary') || []).filter(element => element.getClientRects().length)
      const first = controls[0], last = controls[controls.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
    }
    document.addEventListener('keydown', handleKey)
    return () => { document.body.style.overflow = previousOverflow; document.removeEventListener('keydown', handleKey); menuRef.current?.focus() }
  }, [navOpen])

  const required = requiredActivities(model)
  const done = required.filter((activity) => completed.has(activity.id)).length
  const percent = required.length ? Math.round((done / required.length) * 100) : 0

  const isCurrentComplete = completed.has(currentPageId)
  const all = flattenActivities(model)
  const currentIndex = all.findIndex((activity) => activity.id === currentPageId)
  const previous = currentIndex > 0 ? all[currentIndex - 1] : undefined
  // Finishing the current activity is what unlocks the next one, so look ahead with it counted done.
  const next =
    currentIndex >= 0 ? all.slice(currentIndex + 1).find((activity) => isUnlockedAfterCurrent(activity.id)) : undefined

  const currentLevel = model.levels.find(level => [...level.lead, ...level.sections.flatMap(section => section.activities), ...level.extras].some(activity => activity.id === currentPageId))
  const currentSection = currentLevel?.sections.find(section => section.activities.some(activity => activity.id === currentPageId))
  const navigate = (id: PageId) => { onNavigate(id); setNavOpen(false); window.scrollTo({ top: 0 }) }
  const rows = (activities: Activity[]) => <ul className="studio-rows">{activities.map(activity => <SidebarRow key={activity.id} {...{ activity, currentPageId, completed, isUnlocked }} onNavigate={navigate} />)}</ul>

  return (
    <div className="learning-player studio" onPointerDownCapture={() => { animateActivity.current = true }} onKeyDownCapture={() => { animateActivity.current = false }}>
      {navOpen && <button className="studio-backdrop" aria-label="Close course contents" onClick={() => setNavOpen(false)} />}
      <aside ref={sidebarRef} className="studio-sidebar" data-open={navOpen} aria-label="Course contents">
        <div className="studio-brand"><LearningBrand href={backHref} /><button ref={closeRef} className="studio-close" aria-label="Close course contents" onClick={() => setNavOpen(false)}><X size={18}/></button></div>
        <div className="studio-course">
          <span className="studio-eyebrow">YOUR LEARNING PATHWAY</span>
          <h2>{model.title}</h2>
          <div className="studio-course-meta"><span>{model.courseCode || 'Course'}</span><span>{all.length} activities</span></div>
          <div className="studio-progress-label"><span>Course progress</span><strong>{percent}%</strong></div>
          <div className="studio-progress" role="progressbar" aria-label="Course progress" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}><span style={{width:`${percent}%`}}/></div>
          <small>{done} of {required.length} required activities complete</small>
        </div>
        <nav className="studio-curriculum" aria-label="Learning pathway">
          {model.levels.map(level => <details key={level.id} open={level.id === currentLevel?.id || model.levels.length === 1} className="studio-level">
            <summary><span className="studio-level-number">{String(level.number).padStart(2,'0')}</span><span><small>LEVEL {level.number}</small><strong>{level.title}</strong></span><ChevronRight size={16}/></summary>
            {rows(level.lead)}
            {level.sections.map(section => <details key={section.id} open={section.id === currentSection?.id} className="studio-section"><summary><span>{section.number}. {section.title}</span><ChevronRight size={14}/></summary>{rows(section.activities)}</details>)}
            {level.extras.length > 0 && <details className="studio-section" open={level.extras.some(activity => activity.id === currentPageId)}><summary><span>Apply your learning</span><ChevronRight size={14}/></summary>{rows(level.extras)}</details>}
          </details>)}
        </nav>
        <Link className="studio-back" href={backHref}><ChevronLeft size={16}/>{backLabel}</Link>
      </aside>
      <div className="studio-workspace">
        <header className="studio-topbar"><button ref={menuRef} className="studio-menu" aria-label="Open course contents" aria-expanded={navOpen} onClick={() => setNavOpen(true)}><Layers size={18}/></button><div><span>{model.courseCode || 'Learning studio'}</span><ChevronRight size={13}/><strong>{currentLevel ? `Level ${currentLevel.number}` : 'Your course'}</strong></div><span className="studio-status"><i/>Your learning space</span></header>
        <div className="studio-context"><span className="studio-eyebrow">{currentSection ? `SECTION ${String(currentSection.number).padStart(2,'0')}` : 'CONTINUE YOUR PATHWAY'}</span><p>{currentSection?.title || currentLevel?.title || model.title}</p><span className="studio-context-count">Activity {Math.max(1,currentIndex + 1)} <span>/ {all.length}</span></span></div>
        <main className="studio-main" key={currentPageId}><StudioTransition kind="activity" motionKey={currentPageId} ready={contentReady} animate={animateActivity.current}>{children}</StudioTransition></main>
        <footer className="studio-footer">
          <button className="studio-previous" disabled={!previous} onClick={() => previous && navigate(previous.id)}><ChevronLeft size={17}/><span>Previous activity</span></button>
          <div className="studio-next-label"><small>{isCurrentComplete ? 'COMPLETED' : 'WHEN YOU’RE READY'}</small><span>{next ? `Up next: ${next.title}` : 'Finish this activity'}</span></div>
          <button className="studio-continue" disabled={!next && isCurrentComplete} onClick={() => next ? navigate(next.id) : onComplete?.()}>{next ? 'Continue' : isCurrentComplete ? 'Finished' : 'Mark complete'}<ChevronRight size={17}/></button>
        </footer>
      </div>
    </div>
  )
}

function SidebarRow({
  activity,
  currentPageId,
  completed,
  isUnlocked,
  onNavigate,
}: {
  activity: Activity
  currentPageId: PageId
  completed: ReadonlySet<PageId>
  isUnlocked: (pageId: PageId) => boolean
  onNavigate: (pageId: PageId) => void
}) {
  const Icon = ACTIVITY_ICON[activity.kind]
  const isDone = completed.has(activity.id)
  const isCurrent = activity.id === currentPageId
  const locked = !isUnlocked(activity.id)

  return (
    <li>
      <button
        type="button"
        disabled={locked}
        aria-current={isCurrent ? "page" : undefined}
        onClick={() => onNavigate(activity.id)}
        className={cn(
          "flex min-h-11 w-full items-center gap-2.5 rounded-[7px] px-2 text-left text-[13px] transition-colors",
          isCurrent ? "bg-primary-soft font-semibold text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
          locked && "cursor-not-allowed opacity-55 hover:bg-transparent"
        )}
      >
        <span
          className={cn(
            "grid h-5 w-5 shrink-0 place-items-center rounded-full border",
            isDone ? "border-success bg-success text-white" : isCurrent ? "border-primary text-primary" : "border-border text-muted-foreground"
          )}
        >
          {isDone ? <Check className="h-3 w-3" /> : locked ? <Lock className="h-2.5 w-2.5" /> : <Icon className="h-3 w-3" />}
        </span>
        <span className="min-w-0 flex-1 truncate">{activity.title}</span>
        {activity.optional && !isDone && <span className="shrink-0 text-[10px] text-muted-foreground">optional</span>}
      </button>
    </li>
  )
}
