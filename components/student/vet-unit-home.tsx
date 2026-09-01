"use client"

import { motion, useReducedMotion } from "framer-motion"
import {
  ArrowLeft,
  BookOpen,
  CheckCircle,
  ChevronRight,
  Lock,
  Play,
} from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

export type VetTopicCardStatus = "done" | "current" | "upcoming" | "locked"

export type VetTopicListItem = {
  topicId: string
  index: number
  label: string
  description: string
  status: VetTopicCardStatus
  completedCount: number
  totalCount: number
  unlocked: boolean
  /** Optional illustrative thumbnail for the topic row. */
  imageUrl?: string | null
}

function topicStatusLabel(status: VetTopicCardStatus): string {
  switch (status) {
    case "done":
      return "Done"
    case "current":
      return "Current"
    case "upcoming":
      return "Open"
    case "locked":
      return "Locked"
    default: {
      const _exhaustive: never = status
      return _exhaustive
    }
  }
}

/**
 * Bold EdTec unit home for VET / BSB immersive learn.
 */
export function VetUnitHome({
  courseCode,
  courseName,
  seriesKicker = "Vocational Education & Training",
  imageUrl,
  progressPercent,
  topics,
  nextActivityLabel,
  onContinue,
  onOpenTopic,
}: {
  courseCode: string
  courseName: string
  seriesKicker?: string
  imageUrl?: string | null
  progressPercent: number
  topics: VetTopicListItem[]
  nextActivityLabel: string
  onContinue: () => void
  onOpenTopic: (topicId: string) => void
}) {
  const prefersReducedMotion = useReducedMotion()
  const completedTopics = topics.filter((t) => t.status === "done").length
  const current =
    topics.find((t) => t.status === "current") ??
    topics.find((t) => t.unlocked && t.status !== "done") ??
    null

  return (
    <div className="edtec-home">
      <section className="edtec-home-hero" aria-labelledby="vet-unit-home-title">
        <div className="edtec-home-hero-media" aria-hidden={!imageUrl}>
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt="" className="edtec-home-hero-image" />
          ) : null}
          <div className="edtec-home-hero-scrim" />
        </div>

        <div className="edtec-home-hero-content">
          <div className="edtec-home-top">
            <Link href="/student/current-units" className="edtec-home-back">
              <ArrowLeft className="h-4 w-4" aria-hidden />
              <span>Current units</span>
            </Link>
            {courseCode ? <span className="edtec-home-badge">{courseCode}</span> : null}
          </div>

          <div>
            <motion.p
              className="edtec-home-brand"
              id="vet-unit-home-brand"
              initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
            >
              {seriesKicker}
            </motion.p>
            <h1 id="vet-unit-home-title" className="edtec-home-unit">
              {courseName}
            </h1>
            <p className="edtec-home-intro">
              Move through each topic with notes, video, slides, practice, and knowledge checks.
            </p>
            <div className="edtec-home-actions">
              <button type="button" className="edtec-home-cta" onClick={onContinue}>
                <Play className="h-4 w-4" aria-hidden />
                <span>
                  {progressPercent >= 100
                    ? "Review unit"
                    : `Continue · ${nextActivityLabel || current?.label || "Start"}`}
                </span>
                <ChevronRight className="h-4 w-4" aria-hidden />
              </button>
            </div>
            <div
              className="edtec-home-progress"
              aria-label={`${progressPercent}% of this unit complete`}
            >
              <strong>{progressPercent}% complete</strong>
              <span>
                {completedTopics} of {topics.length} topics
              </span>
            </div>
            <div className="edtec-home-progress-track" aria-hidden>
              <span style={{ width: `${Math.max(0, Math.min(100, progressPercent))}%` }} />
            </div>
          </div>
        </div>
      </section>

      <section className="edtec-home-topics" aria-labelledby="vet-topics-list-heading">
        <div className="edtec-home-topics-head">
          <div>
            <p>Topics</p>
            <h2 id="vet-topics-list-heading">Your learning path</h2>
          </div>
          <span>
            {completedTopics}/{topics.length}
          </span>
        </div>

        <div className="edtec-topic-rows">
          {topics.map((topic, index) => {
            const locked = !topic.unlocked || topic.status === "locked"
            const statusText = topicStatusLabel(topic.status)
            return (
              <motion.button
                key={topic.topicId}
                type="button"
                disabled={locked}
                className={cn(
                  "edtec-topic-row",
                  topic.status === "done" && "is-done",
                  topic.status === "current" && "is-current",
                  locked && "is-locked"
                )}
                onClick={() => !locked && onOpenTopic(topic.topicId)}
                whileTap={locked || prefersReducedMotion ? undefined : { scale: 0.99 }}
                initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={
                  prefersReducedMotion
                    ? { duration: 0 }
                    : {
                        delay: 0.05 + index * 0.04,
                        duration: 0.28,
                        ease: [0.23, 1, 0.32, 1] as const,
                      }
                }
              >
                <span className="edtec-topic-row-media" aria-hidden>
                  {topic.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={topic.imageUrl} alt="" className="edtec-topic-row-image" />
                  ) : (
                    <span className="edtec-topic-row-index">
                      {topic.topicId === "program-overview" || topic.topicId === "learning-notes"
                        ? "•"
                        : String(topic.index).padStart(2, "0")}
                    </span>
                  )}
                </span>
                <span className="edtec-topic-row-copy">
                  <strong>{topic.label}</strong>
                  <span>
                    {topic.completedCount}/{topic.totalCount} activities
                  </span>
                </span>
                <span className="edtec-topic-row-meta">
                  {locked ? (
                    <Lock className="h-4 w-4" aria-hidden />
                  ) : topic.status === "done" ? (
                    <CheckCircle className="h-4 w-4 text-amber-600" aria-hidden />
                  ) : (
                    <BookOpen className="h-4 w-4 text-brand-blue" aria-hidden />
                  )}
                  {statusText}
                </span>
              </motion.button>
            )
          })}
        </div>
      </section>
    </div>
  )
}
