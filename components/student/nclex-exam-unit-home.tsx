"use client"

import type { ComponentType } from "react"
import Link from "next/link"
import { motion, useReducedMotion } from "framer-motion"
import {
  Activity,
  ArrowLeft,
  Brain,
  CheckCircle,
  ChevronRight,
  GraduationCap,
  Lightbulb,
  Lock,
  Play,
  Target,
  TrendingUp,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type {
  NclexReadinessSummary,
  NclexTodaySession,
} from "@/lib/nclex-readiness"

export type NclexExamStageStatus = "done" | "current" | "upcoming"

export type NclexExamHomeStage = {
  id: string
  label: string
  description: string
  status: NclexExamStageStatus
  unlocked: boolean
  optional?: boolean
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>
}

function statusLabel(status: NclexExamStageStatus, isNext: boolean, unlocked: boolean): string {
  if (!unlocked) return "Locked"
  switch (status) {
    case "done":
      return "Done"
    case "current":
      return "Current"
    case "upcoming":
      return isNext ? "Next" : "Later"
    default: {
      const _exhaustive: never = status
      return _exhaustive
    }
  }
}

export function NclexExamUnitHome({
  courseCode,
  courseName,
  imageUrl,
  progressPercent,
  completedActivities,
  totalActivities,
  nextActivityLabel,
  stages,
  todaySession,
  readiness,
  readinessLoading,
  onContinue,
  onOpenStage,
  onOpenMock,
  onOpenResources,
  onOpenFreeDiagnostic,
}: {
  courseCode: string
  courseName: string
  imageUrl?: string | null
  progressPercent: number
  completedActivities: number
  totalActivities: number
  nextActivityLabel: string
  stages: NclexExamHomeStage[]
  todaySession: NclexTodaySession | null
  readiness: NclexReadinessSummary
  readinessLoading: boolean
  onContinue: () => void
  onOpenStage: (stageId: string) => void
  onOpenMock: () => void
  onOpenResources: () => void
  onOpenFreeDiagnostic: () => void
}) {
  const prefersReducedMotion = useReducedMotion()
  const unitComplete = totalActivities > 0 && completedActivities >= totalActivities
  const hasStarted = completedActivities > 0
  const continueLabel = unitComplete
    ? "Review pathway"
    : todaySession?.ctaLabel ??
      (hasStarted ? `Continue · ${nextActivityLabel}` : `Begin · ${nextActivityLabel}`)
  const currentStage =
    stages.find((stage) => stage.status === "current") ??
    stages.find((stage) => stage.status === "upcoming" && stage.unlocked) ??
    null

  return (
    <div className="gnps-home gnps-home-v2">
      <section className="gnps-home-hero" aria-labelledby="nclex-exam-home-title">
        <div className="gnps-home-hero-media" aria-hidden={!imageUrl}>
          {imageUrl ? (
            <img src={imageUrl} alt="" className="gnps-home-hero-image" />
          ) : (
            <div className="gnps-home-hero-fallback" />
          )}
          <div className="gnps-home-hero-scrim" />
        </div>

        <div className="gnps-home-hero-content">
          <div className="gnps-home-hero-top">
            <Link href="/student/current-units" className="gnps-home-back">
              <ArrowLeft className="h-4 w-4" aria-hidden />
              <span>Current Units</span>
            </Link>
            <div className="gnps-home-hero-badges" aria-label="Course details">
              <span>{courseCode || "ETP-NCLEX-TP"}</span>
              <span>Exam prep</span>
            </div>
          </div>

          <div className="gnps-home-hero-copy">
            <p className="gnps-home-kicker">NCLEX Test Preparation</p>
            <h1 id="nclex-exam-home-title">{courseName || "NCLEX Test Preparation"}</h1>
            <p className="gnps-home-intro">
              Orientation, topic practice, adaptive mock tests, and exam strategies — one clear pathway.
              Your place is saved automatically.
            </p>

            <div className="gnps-home-actions">
              <button type="button" className="gnps-home-primary" onClick={onContinue}>
                <Play className="h-4 w-4" aria-hidden />
                <span>{continueLabel}</span>
                <ChevronRight className="h-4 w-4" aria-hidden />
              </button>
              {currentStage?.unlocked ? (
                <button
                  type="button"
                  className="gnps-home-secondary"
                  onClick={() => onOpenStage(currentStage.id)}
                >
                  <span>Open current stage</span>
                </button>
              ) : null}
            </div>
          </div>

          <div className="gnps-home-hero-rail" aria-label={`${progressPercent}% of this course complete`}>
            <div className="gnps-home-rail-stats">
              <div>
                <span>Progress</span>
                <strong>{progressPercent}%</strong>
              </div>
              <div>
                <span>Activities</span>
                <strong>
                  {completedActivities}/{totalActivities}
                </strong>
              </div>
              <div>
                <span>{unitComplete ? "Status" : "Up next"}</span>
                <strong>{unitComplete ? "Complete" : nextActivityLabel}</strong>
              </div>
            </div>
            <div className="gnps-home-progress-track" aria-hidden>
              <span style={{ transform: `scaleX(${Math.max(0, Math.min(1, progressPercent / 100))})` }} />
            </div>
            <ol className="gnps-home-stage-strip" aria-label="Stage progress">
              {stages.map((stage, index) => {
                const isNext =
                  stage.status === "upcoming" &&
                  stages.findIndex((s) => s.status === "upcoming") === index
                const stripStatus =
                  stage.status === "done"
                    ? "Done"
                    : stage.status === "current"
                      ? "Current"
                      : isNext
                        ? "Next"
                        : "Later"
                return (
                  <li
                    key={stage.id}
                    className={cn(`is-${stage.status}`, isNext && "is-next")}
                  >
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <strong>{stage.label}</strong>
                    <em>{stripStatus}</em>
                  </li>
                )
              })}
            </ol>
          </div>
        </div>
      </section>

      <section className="nclex-home-focus" aria-labelledby="nclex-today-session-heading">
        <article className="nclex-today-session">
          <div className="nclex-home-panel-icon" aria-hidden>
            <Target className="h-5 w-5" />
          </div>
          <div className="nclex-today-session-copy">
            <p>Today’s session</p>
            <h2 id="nclex-today-session-heading">
              {todaySession?.title ?? "Your pathway is ready"}
            </h2>
            <span>
              {todaySession?.detail ??
                "Choose a stage below to begin building your exam readiness."}
            </span>
          </div>
          <button
            type="button"
            className="nclex-today-session-cta"
            onClick={onContinue}
            disabled={!todaySession}
          >
            <Play className="h-4 w-4" aria-hidden />
            <span>{todaySession?.ctaLabel ?? (unitComplete ? "Course complete" : "Choose a stage")}</span>
            <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
        </article>

        <aside className="nclex-readiness" aria-labelledby="nclex-readiness-heading" aria-busy={readinessLoading}>
          <div className="nclex-readiness-head">
            <div className="nclex-home-panel-icon" aria-hidden>
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <p>Readiness snapshot</p>
              <h2 id="nclex-readiness-heading">Your latest signals</h2>
            </div>
          </div>

          {readinessLoading ? (
            <div className="nclex-readiness-empty" role="status">
              Loading assessment history…
            </div>
          ) : readiness.hasAssessmentData ? (
            <>
              <div className="nclex-readiness-stats">
                <div>
                  <span>Latest mock</span>
                  <strong>
                    {readiness.latestMock
                      ? `${readiness.latestMock.marksEarned}/${readiness.latestMock.passingMarks}`
                      : "Not taken"}
                  </strong>
                  <small>
                    {readiness.latestMock
                      ? `${readiness.latestMock.accuracyPercent}% accuracy`
                      : "Complete a mock to compare"}
                  </small>
                </div>
                <div>
                  <span>Topic quiz average</span>
                  <strong>
                    {readiness.topicQuizAverage == null
                      ? "Not taken"
                      : `${readiness.topicQuizAverage}%`}
                  </strong>
                  <small>{readiness.topicQuizzesAttempted} topics attempted</small>
                </div>
              </div>
              <div className="nclex-readiness-focus">
                <div className="nclex-readiness-focus-title">
                  <TrendingUp className="h-4 w-4" aria-hidden />
                  <span>Recommended focus</span>
                </div>
                {readiness.focusAreas.length > 0 ? (
                  <ul>
                    {readiness.focusAreas.map((area) => (
                      <li key={area.module}>
                        <span>{area.label}</span>
                        <strong>{area.accuracyPercent}%</strong>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>Complete a mock test to reveal your focus areas.</p>
                )}
              </div>
            </>
          ) : (
            <div className="nclex-readiness-empty">
              <GraduationCap className="h-5 w-5" aria-hidden />
              <span>Complete topic practice or a mock test to build your readiness snapshot.</span>
            </div>
          )}
        </aside>
      </section>

      <section className="gnps-home-pathway" aria-labelledby="nclex-exam-pathway-heading">
        <div className="gnps-home-section-heading">
          <div>
            <p>Exam pathway</p>
            <h2 id="nclex-exam-pathway-heading">Stages in this course</h2>
          </div>
          <span>
            {completedActivities} complete · {totalActivities} total
          </span>
        </div>
        <div className="gnps-stage-list">
          {stages.map((stage, index) => {
            const Icon = stage.icon
            const isNextUpcoming =
              stage.status === "upcoming" &&
              stages.findIndex((s) => s.status === "upcoming") === index
            return (
              <motion.button
                key={stage.id}
                type="button"
                className={cn(
                  "gnps-stage-row",
                  `is-${stage.status}`,
                  isNextUpcoming && "is-next",
                  !stage.unlocked && "is-locked"
                )}
                disabled={!stage.unlocked}
                onClick={() => stage.unlocked && onOpenStage(stage.id)}
                initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={
                  prefersReducedMotion
                    ? { duration: 0 }
                    : { delay: 0.06 + index * 0.05, duration: 0.32, ease: [0.23, 1, 0.32, 1] as const }
                }
              >
                <div className="gnps-stage-index">{String(index + 1).padStart(2, "0")}</div>
                <div className="gnps-stage-icon">
                  {stage.status === "done" ? (
                    <CheckCircle className="h-5 w-5" aria-hidden />
                  ) : (
                    <Icon className="h-5 w-5" aria-hidden />
                  )}
                </div>
                <div className="gnps-stage-copy">
                  <h3>
                    {stage.label}
                    {stage.optional ? (
                      <span className="gnps-stage-optional"> · Optional</span>
                    ) : null}
                  </h3>
                  <p>{stage.description}</p>
                </div>
                <div className="gnps-stage-status">
                  <span className="gnps-stage-status-pill">
                    {statusLabel(stage.status, isNextUpcoming, stage.unlocked)}
                  </span>
                </div>
              </motion.button>
            )
          })}
        </div>
      </section>

      <section className="gnps-home-pathway" aria-labelledby="nclex-exam-tools-heading">
        <div className="gnps-home-section-heading">
          <div>
            <p>Quick tools</p>
            <h2 id="nclex-exam-tools-heading">Mock test & strategies</h2>
          </div>
        </div>
        <div className="gnps-level-cards">
          <button type="button" className="gnps-level-card is-current" onClick={onOpenMock}>
            <div className="gnps-level-card-top">
              <span className="gnps-level-card-num">01</span>
              <span className="gnps-level-card-status">Mock</span>
            </div>
            <h3>Main mock test</h3>
            <p>Adaptive difficulty up to 150 questions. Pass at 125 marks.</p>
            <div className="gnps-level-card-cta">
              <GraduationCap className="h-4 w-4" aria-hidden />
              <span>Start mock test</span>
            </div>
          </button>
          <button type="button" className="gnps-level-card is-current" onClick={onOpenResources}>
            <div className="gnps-level-card-top">
              <span className="gnps-level-card-num">02</span>
              <span className="gnps-level-card-status">Prep</span>
            </div>
            <h3>Test prep hub</h3>
            <p>72-hour plan, traps list, NGN cases, and exam strategies.</p>
            <div className="gnps-level-card-cta">
              <Lightbulb className="h-4 w-4" aria-hidden />
              <span>Open resources</span>
            </div>
          </button>
          <button type="button" className="gnps-level-card is-current" onClick={onOpenFreeDiagnostic}>
            <div className="gnps-level-card-top">
              <span className="gnps-level-card-num">03</span>
              <span className="gnps-level-card-status">Free</span>
            </div>
            <h3>Free 80-Q diagnostic</h3>
            <p>Sample all 10 GNPS program areas and see where to strengthen.</p>
            <div className="gnps-level-card-cta">
              <Brain className="h-4 w-4" aria-hidden />
              <span>Start diagnostic</span>
            </div>
          </button>
        </div>
      </section>
    </div>
  )
}

/** Convenience icons for stage builders outside this file. */
export const NclexExamHomeIcons = {
  orientation: Lightbulb,
  topics: Play,
  mock: GraduationCap,
  resources: Brain,
  locked: Lock,
} as const
