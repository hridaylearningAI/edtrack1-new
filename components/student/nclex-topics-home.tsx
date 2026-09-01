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
import { cn } from "@/lib/utils"

export type NclexTopicCardStatus = "done" | "current" | "upcoming" | "locked"

export type NclexTopicListItem = {
  topicId: string
  index: number
  label: string
  description: string
  status: NclexTopicCardStatus
  completedCount: number
  totalCount: number
  unlocked: boolean
}

function topicStatusLabel(status: NclexTopicCardStatus): string {
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

export function NclexTopicsHome({
  courseCode,
  courseName,
  topics,
  onBack,
  onOpenTopic,
}: {
  courseCode: string
  courseName: string
  topics: NclexTopicListItem[]
  onBack: () => void
  onOpenTopic: (topicId: string) => void
}) {
  const prefersReducedMotion = useReducedMotion()
  const completedTopics = topics.filter((t) => t.status === "done").length
  const current =
    topics.find((t) => t.status === "current") ??
    topics.find((t) => t.unlocked && t.status !== "done") ??
    null

  return (
    <div className="gnps-home gnps-home-v2 gnps-level-home">
      <section className="gnps-home-hero" aria-labelledby="nclex-topics-home-title">
        <div className="gnps-home-hero-media" aria-hidden>
          <div className="gnps-home-hero-fallback" />
          <div className="gnps-home-hero-scrim" />
        </div>

        <div className="gnps-home-hero-content">
          <div className="gnps-home-hero-top">
            <button type="button" className="gnps-home-back" onClick={onBack}>
              <ArrowLeft className="h-4 w-4" aria-hidden />
              <span>Course overview</span>
            </button>
            <div className="gnps-home-hero-badges" aria-label="Course details">
              <span>{courseCode || "ETP-NCLEX-TP"}</span>
              <span>Topics 1–9</span>
            </div>
          </div>

          <div className="gnps-home-hero-copy">
            <p className="gnps-home-kicker">{courseName || "NCLEX Test Preparation"}</p>
            <h1 id="nclex-topics-home-title">Topic practice</h1>
            <p className="gnps-home-intro">
              Choose a unit to practice. Each topic includes interactive practice questions.
            </p>

            <div className="gnps-home-actions">
              {current?.unlocked ? (
                <button
                  type="button"
                  className="gnps-home-primary"
                  onClick={() => onOpenTopic(current.topicId)}
                >
                  <Play className="h-4 w-4" aria-hidden />
                  <span>
                    {current.status === "done"
                      ? `Review · ${current.label}`
                      : `Continue · ${current.label}`}
                  </span>
                  <ChevronRight className="h-4 w-4" aria-hidden />
                </button>
              ) : null}
            </div>
          </div>

          <div
            className="gnps-home-hero-rail"
            aria-label={`${completedTopics} of ${topics.length} topics complete`}
          >
            <div className="gnps-home-rail-stats">
              <div>
                <span>Topics</span>
                <strong>
                  {completedTopics}/{topics.length}
                </strong>
              </div>
              <div>
                <span>Up next</span>
                <strong>{current?.label ?? "All complete"}</strong>
              </div>
              <div>
                <span>Status</span>
                <strong>
                  {completedTopics >= topics.length && topics.length > 0
                    ? "Complete"
                    : "In progress"}
                </strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="gnps-home-pathway" aria-labelledby="nclex-topics-list-heading">
        <div className="gnps-home-section-heading">
          <div>
            <p>Units</p>
            <h2 id="nclex-topics-list-heading">Choose a topic</h2>
          </div>
          <span>
            {completedTopics} of {topics.length} complete
          </span>
        </div>

        <div className="gnps-level-cards gnps-section-cards">
          {topics.map((topic, index) => {
            const locked = !topic.unlocked || topic.status === "locked"
            const statusText = topicStatusLabel(topic.status)
            return (
              <motion.button
                key={topic.topicId}
                type="button"
                disabled={locked}
                className={cn(
                  "gnps-level-card",
                  topic.status === "done" && "is-complete",
                  topic.status === "current" && "is-current",
                  locked && "is-locked"
                )}
                onClick={() => !locked && onOpenTopic(topic.topicId)}
                initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={
                  prefersReducedMotion
                    ? { duration: 0 }
                    : {
                        delay: 0.04 + index * 0.04,
                        duration: 0.28,
                        ease: [0.23, 1, 0.32, 1] as const,
                      }
                }
              >
                <div className="gnps-level-card-top">
                  <span className="gnps-level-card-num">
                    Topic {String(topic.index).padStart(2, "0")}
                  </span>
                  <span className="gnps-level-card-status">{statusText}</span>
                </div>
                <h3>{topic.label}</h3>
                <p>
                  {topic.description} · {topic.completedCount}/{topic.totalCount} activities
                </p>
                <div className="gnps-level-card-cta">
                  {locked ? (
                    <Lock className="h-4 w-4" aria-hidden />
                  ) : topic.status === "done" ? (
                    <CheckCircle className="h-4 w-4" aria-hidden />
                  ) : (
                    <BookOpen className="h-4 w-4" aria-hidden />
                  )}
                  <span>{locked ? "Locked" : topic.status === "done" ? "Review unit" : "Open unit"}</span>
                </div>
              </motion.button>
            )
          })}
        </div>
      </section>
    </div>
  )
}
