"use client"

import { motion, useReducedMotion } from "framer-motion"
import {
  ArrowLeft,
  CheckCircle,
  ChevronRight,
  HelpCircle,
  Lock,
  Play,
  Presentation,
} from "lucide-react"
import { cn } from "@/lib/utils"

export type NclexTopicActivityStatus = "done" | "current" | "upcoming" | "locked"

export type NclexTopicActivityItem = {
  pageId: string
  label: string
  description: string
  kind: "practice-q" | "quiz"
  status: NclexTopicActivityStatus
  unlocked: boolean
}

function activityStatusLabel(status: NclexTopicActivityStatus): string {
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

export function NclexTopicUnitHome({
  courseCode,
  topicIndex,
  topicLabel,
  activities,
  onBack,
  onOpenActivity,
  onContinue,
}: {
  courseCode: string
  topicIndex: number
  topicLabel: string
  activities: NclexTopicActivityItem[]
  onBack: () => void
  onOpenActivity: (pageId: string) => void
  onContinue: () => void
}) {
  const prefersReducedMotion = useReducedMotion()
  const completedCount = activities.filter((a) => a.status === "done").length
  const current =
    activities.find((a) => a.status === "current") ??
    activities.find((a) => a.unlocked && a.status !== "done") ??
    null
  const unitComplete = activities.length > 0 && completedCount >= activities.length
  const continueLabel = unitComplete
    ? "Review first activity"
    : current
      ? `Continue · ${current.label}`
      : "Open unit"

  return (
    <div className="gnps-home gnps-home-v2 gnps-level-home">
      <section className="gnps-home-hero" aria-labelledby="nclex-topic-unit-title">
        <div className="gnps-home-hero-media" aria-hidden>
          <div className="gnps-home-hero-fallback" />
          <div className="gnps-home-hero-scrim" />
        </div>

        <div className="gnps-home-hero-content">
          <div className="gnps-home-hero-top">
            <button type="button" className="gnps-home-back" onClick={onBack}>
              <ArrowLeft className="h-4 w-4" aria-hidden />
              <span>All topics</span>
            </button>
            <div className="gnps-home-hero-badges" aria-label="Topic details">
              <span>{courseCode || "ETP-NCLEX-TP"}</span>
              <span>Topic {topicIndex}</span>
            </div>
          </div>

          <div className="gnps-home-hero-copy">
            <p className="gnps-home-kicker">Topic practice</p>
            <h1 id="nclex-topic-unit-title">{topicLabel}</h1>
            <p className="gnps-home-intro">
              Work through interactive practice questions to build mastery for this unit.
            </p>

            <div className="gnps-home-actions">
              <button type="button" className="gnps-home-primary" onClick={onContinue}>
                <Play className="h-4 w-4" aria-hidden />
                <span>{continueLabel}</span>
                <ChevronRight className="h-4 w-4" aria-hidden />
              </button>
            </div>
          </div>

          <div
            className="gnps-home-hero-rail"
            aria-label={`${completedCount} of ${activities.length} activities complete`}
          >
            <div className="gnps-home-rail-stats">
              <div>
                <span>Activities</span>
                <strong>
                  {completedCount}/{activities.length}
                </strong>
              </div>
              <div>
                <span>Up next</span>
                <strong>{unitComplete ? "Complete" : current?.label ?? "Ready"}</strong>
              </div>
              <div>
                <span>Status</span>
                <strong>{unitComplete ? "Complete" : "In progress"}</strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="gnps-home-pathway" aria-labelledby="nclex-topic-activities-heading">
        <div className="gnps-home-section-heading">
          <div>
            <p>Topic {topicIndex}</p>
            <h2 id="nclex-topic-activities-heading">Unit activities</h2>
          </div>
          <span>
            {completedCount} of {activities.length} complete
          </span>
        </div>

        <div className="gnps-stage-list">
          {activities.map((activity, index) => {
            const locked = !activity.unlocked || activity.status === "locked"
            const Icon = activity.kind === "quiz" ? HelpCircle : Presentation
            return (
              <motion.button
                key={activity.pageId}
                type="button"
                disabled={locked}
                className={cn(
                  "gnps-stage-row",
                  `is-${activity.status === "locked" ? "upcoming" : activity.status}`,
                  locked && "is-locked",
                  activity.status === "current" && "is-next"
                )}
                onClick={() => !locked && onOpenActivity(activity.pageId)}
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
                <div className="gnps-stage-index">{String(index + 1).padStart(2, "0")}</div>
                <div className="gnps-stage-icon">
                  {activity.status === "done" ? (
                    <CheckCircle className="h-5 w-5" aria-hidden />
                  ) : locked ? (
                    <Lock className="h-5 w-5" aria-hidden />
                  ) : (
                    <Icon className="h-5 w-5" aria-hidden />
                  )}
                </div>
                <div className="gnps-stage-copy">
                  <h3>{activity.label}</h3>
                  <p>{activity.description}</p>
                </div>
                <div className="gnps-stage-status">
                  <span className="gnps-stage-status-pill">
                    {activityStatusLabel(activity.status)}
                  </span>
                </div>
              </motion.button>
            )
          })}
        </div>
      </section>
    </div>
  )
}
