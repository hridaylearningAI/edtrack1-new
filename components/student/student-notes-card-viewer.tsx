"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import {
  BookOpen,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Lightbulb,
  ListChecks,
  Target,
  X,
} from "lucide-react"
import { EdBotFigure } from "@/components/student/edbot-figure"
import { NotesExplainPanel } from "@/components/notes/NotesExplainPanel"
import {
  notesBeatKindLabel,
  segmentNotesIntoLessonBeats,
  type NotesLessonBeat,
  type NotesLessonBeatKind,
} from "@/lib/learn/notes-lesson-beats"
import type { StudentLearningNotes, TopicLearningNotes } from "@/lib/types/learning-notes"
import { getVetNotesCardImageUrl, isBsbcrt511NotesUnit } from "@/lib/vet-unit-images"
import { cn } from "@/lib/utils"

function notesBeatKindIcon(kind: NotesLessonBeatKind) {
  switch (kind) {
    case "intro":
      return Lightbulb
    case "outcomes":
      return Target
    case "concept":
      return BookOpen
    case "example":
      return ClipboardList
    case "keypoints":
      return ListChecks
    default: {
      const _exhaustive: never = kind
      return _exhaustive
    }
  }
}

const NOTES_CARD_SLIDE = 48

const notesCardVariants = {
  enter: (direction: number) => ({
    x: direction === 0 ? 0 : direction > 0 ? NOTES_CARD_SLIDE : -NOTES_CARD_SLIDE,
    opacity: 0,
    scale: 0.985,
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
  },
  exit: (direction: number) => ({
    x: direction === 0 ? 0 : direction > 0 ? -NOTES_CARD_SLIDE : NOTES_CARD_SLIDE,
    opacity: 0,
    scale: 0.985,
  }),
}

const notesCardReducedVariants = {
  enter: { opacity: 0 },
  center: { opacity: 1 },
  exit: { opacity: 0 },
}

export type StudentNotesCardViewerVariant = "edtec" | "classic" | "immersive"

export function StudentNotesCardViewer({
  notes,
  courseDisplayName,
  courseCode,
  variant = "classic",
  onMarkComplete,
  isCompleted = false,
  pageId,
}: {
  notes: StudentLearningNotes | TopicLearningNotes
  courseDisplayName?: string
  /** Unit code (e.g. BSBCRT511) — used to attach note-card illustrations. */
  courseCode?: string | null
  variant?: StudentNotesCardViewerVariant
  onMarkComplete?: () => void
  isCompleted?: boolean
  /** Stable id so card index resets when the note page changes. */
  pageId?: string
}) {
  const reduceMotion = useReducedMotion()
  const resolvedCourseCode = (
    courseCode ??
    notes.courseCode ??
    ("title" in notes ? notes.title : "") ??
    ""
  ).trim()
  const beats = useMemo(() => {
    const segmented = segmentNotesIntoLessonBeats(notes.sections)
    const artCode = isBsbcrt511NotesUnit(resolvedCourseCode)
      ? resolvedCourseCode
      : isBsbcrt511NotesUnit(notes.courseCode)
        ? notes.courseCode
        : isBsbcrt511NotesUnit(notes.title)
          ? notes.title
          : resolvedCourseCode
    return segmented.map((beat, idx) => ({
      ...beat,
      imageUrl:
        beat.imageUrl ??
        getVetNotesCardImageUrl(artCode, idx + 1, beat.kind) ??
        undefined,
    }))
  }, [notes.sections, notes.courseCode, notes.title, resolvedCourseCode])
  const [cardIndex, setCardIndex] = useState(0)
  const [direction, setDirection] = useState(0)
  const [pageKey, setPageKey] = useState(pageId ?? notes.title)
  const [tipDismissed, setTipDismissed] = useState(false)
  const [brokenImages, setBrokenImages] = useState<Set<string>>(() => new Set())

  if (pageKey !== (pageId ?? notes.title)) {
    setPageKey(pageId ?? notes.title)
    setCardIndex(0)
    setDirection(0)
    setTipDismissed(false)
    setBrokenImages(new Set())
  }

  const total = beats.length
  const safeIndex = total > 0 ? Math.min(Math.max(0, cardIndex), total - 1) : 0
  const beat: NotesLessonBeat | undefined = beats[safeIndex]
  const isLastCard = total > 0 && safeIndex >= total - 1
  const canGoPrev = safeIndex > 0
  const canGoNext = safeIndex < total - 1
  const progressPct = total > 0 ? Math.round(((safeIndex + 1) / total) * 100) : 0

  const goToCard = useCallback(
    (nextIndex: number) => {
      const clamped = Math.min(Math.max(0, nextIndex), Math.max(0, total - 1))
      if (clamped === safeIndex) return
      setDirection(clamped > safeIndex ? 1 : -1)
      setCardIndex(clamped)
    },
    [safeIndex, total]
  )

  const goPrev = useCallback(() => goToCard(safeIndex - 1), [goToCard, safeIndex])
  const goNext = useCallback(() => goToCard(safeIndex + 1), [goToCard, safeIndex])

  const finishNotes = useCallback(() => {
    onMarkComplete?.()
  }, [onMarkComplete])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault()
        if (canGoPrev) goPrev()
        return
      }
      if (e.key === "ArrowRight") {
        e.preventDefault()
        if (canGoNext) {
          goNext()
          return
        }
        if (isLastCard && onMarkComplete && !isCompleted) finishNotes()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [canGoNext, canGoPrev, finishNotes, goNext, goPrev, isCompleted, isLastCard, onMarkComplete])

  if (!beat) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-sm text-slate-600">
        No learning notes for this unit yet.
      </div>
    )
  }

  const BeatIcon = notesBeatKindIcon(beat.kind)
  const showCardImage = !!beat.imageUrl && !brokenImages.has(beat.imageUrl)
  const cardMotionVariants = reduceMotion ? notesCardReducedVariants : notesCardVariants
  const cardTransition = reduceMotion
    ? { duration: 0.16 }
    : { type: "spring" as const, stiffness: 380, damping: 34, mass: 0.85 }

  const shellClass =
    variant === "edtec"
      ? "student-notes-cards is-edtec"
      : variant === "immersive"
        ? "student-notes-cards is-immersive"
        : "student-notes-cards is-classic"

  return (
    <div className={cn(shellClass, "flex min-h-0 flex-1 flex-col overflow-hidden")}>
      <div className="student-notes-cards-shell has-edbot">
        <section className="student-notes-cards-stage" aria-label="Learning note cards">
          <div className="student-notes-cards-nav-row">
            <button
              type="button"
              className="student-notes-cards-arrow"
              onClick={goPrev}
              disabled={!canGoPrev}
              aria-label="Previous card"
            >
              <ChevronLeft className="h-6 w-6" aria-hidden />
            </button>

            <div className="student-notes-cards-deck">
              <AnimatePresence initial={false} custom={direction} mode="wait">
                <motion.article
                  key={beat.id}
                  className={cn("student-notes-card", showCardImage && "has-banner")}
                  custom={direction}
                  variants={cardMotionVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={cardTransition}
                >
                  {showCardImage ? (
                    <motion.div
                      className="student-notes-card-banner"
                      aria-hidden
                      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 1.03 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={
                        reduceMotion
                          ? { duration: 0.16 }
                          : { type: "spring", stiffness: 320, damping: 28, delay: 0.02 }
                      }
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={beat.imageUrl}
                        alt=""
                        className="student-notes-card-image"
                        loading="eager"
                        onError={() => {
                          const url = beat.imageUrl
                          if (!url) return
                          setBrokenImages((prev) => {
                            if (prev.has(url)) return prev
                            const next = new Set(prev)
                            next.add(url)
                            return next
                          })
                        }}
                      />
                    </motion.div>
                  ) : null}

                  <div
                    className={cn(
                      "student-notes-card-layout",
                      !showCardImage && "with-icon"
                    )}
                  >
                    {!showCardImage ? (
                      <div className={cn("student-notes-card-icon", `is-${beat.kind}`)} aria-hidden>
                        <BeatIcon className="h-7 w-7" strokeWidth={1.75} />
                      </div>
                    ) : null}
                    <div className="student-notes-card-content">
                      <div className="student-notes-card-meta">
                        <span className="student-notes-card-kind">
                          {showCardImage ? (
                            <BeatIcon className="h-3.5 w-3.5" aria-hidden />
                          ) : null}
                          {notesBeatKindLabel(beat.kind)}
                        </span>
                        <em>
                          Card {safeIndex + 1} of {total}
                        </em>
                      </div>
                      {beat.sectionTitle ? (
                        <p className="student-notes-card-section">{beat.sectionTitle}</p>
                      ) : null}
                      <h2>{beat.title}</h2>
                      {beat.body
                        ? beat.body.split(/\n\n+/).map((para, idx) => (
                            <p key={`${beat.id}-p-${idx}`}>{para}</p>
                          ))
                        : null}
                      {beat.bullets && beat.bullets.length > 0 ? (
                        <ul className="student-notes-card-bullets">
                          {beat.bullets.map((item, idx) => (
                            <li key={`${beat.id}-b-${idx}`}>
                              <CheckCircle className="h-4 w-4 shrink-0 text-brand-blue" aria-hidden />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  </div>

                  <div className="student-notes-card-steps" role="tablist" aria-label="Note cards">
                    {beats.map((stepBeat, idx) => (
                      <button
                        key={stepBeat.id}
                        type="button"
                        role="tab"
                        aria-selected={idx === safeIndex}
                        aria-label={`Go to card ${idx + 1}: ${stepBeat.title}`}
                        className={cn(
                          "student-notes-card-step",
                          idx === safeIndex && "is-active",
                          idx < safeIndex && "is-done"
                        )}
                        onClick={() => goToCard(idx)}
                      />
                    ))}
                  </div>
                </motion.article>
              </AnimatePresence>
            </div>

            <button
              type="button"
              className="student-notes-cards-arrow"
              onClick={() => {
                if (canGoNext) {
                  goNext()
                  return
                }
                if (isLastCard && onMarkComplete && !isCompleted) finishNotes()
              }}
              disabled={!canGoNext && !(isLastCard && onMarkComplete && !isCompleted)}
              aria-label={canGoNext ? "Next card" : "Mark notes complete"}
            >
              <ChevronRight className="h-6 w-6" aria-hidden />
            </button>
          </div>

          {isLastCard && onMarkComplete ? (
            <div className="student-notes-cards-finish">
              <button
                type="button"
                className="student-notes-cards-finish-btn"
                onClick={finishNotes}
                disabled={isCompleted}
              >
                <span>{isCompleted ? "Notes complete" : "Mark notes complete"}</span>
                <ChevronRight className="h-4 w-4" aria-hidden />
              </button>
            </div>
          ) : null}

          {!tipDismissed ? (
            <aside className="student-notes-cards-tip" role="note">
              <Lightbulb className="h-4 w-4 shrink-0" aria-hidden />
              <p>
                <strong>Tip:</strong> Use ← → or the side arrows to move between cards. Ask EdBot on
                the right only when you want a deeper explanation.
              </p>
              <button
                type="button"
                className="student-notes-cards-tip-dismiss"
                aria-label="Dismiss tip"
                onClick={() => setTipDismissed(true)}
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </aside>
          ) : null}
        </section>

        <aside
          id="student-notes-edbot-panel"
          className="student-notes-edbot-panel is-open"
          aria-label="EdBot note explanation"
        >
          <div className="student-notes-edbot-panel-head">
            <EdBotFigure pose="getHelp" size="md" decorative />
            <div>
              <p>EdBot coach</p>
              <h3>Here when you need help</h3>
            </div>
          </div>
          <div className="student-notes-edbot-card-ref" aria-live="polite">
            <span>{notesBeatKindLabel(beat.kind)}</span>
            <strong>{beat.title}</strong>
          </div>
          <div className="student-notes-edbot-progress">
            <p>Progress</p>
            <strong>
              {safeIndex + 1} / {total}
            </strong>
            <div className="student-notes-edbot-progress-track" aria-hidden>
              <span style={{ transform: `scaleX(${progressPct / 100})` }} />
            </div>
          </div>
          <NotesExplainPanel
            key={`${pageKey}-${beat.id}`}
            className="student-notes-edbot-explain"
            context={{
              noteTitle: beat.title,
              noteKind: beat.kind,
              noteBody: beat.body,
              noteBullets: beat.bullets,
              sectionTitle: beat.sectionTitle ?? notes.title,
              courseName: courseDisplayName || notes.courseCode || notes.title,
            }}
          />
        </aside>
      </div>
    </div>
  )
}
