"use client"

import Link from "next/link"
import { useState, type ReactNode } from "react"
import {
  Award,
  BarChart3,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock3,
  HandHeart,
  MessageSquare,
  Play,
  Target,
  Users,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { Enrollment } from "@/lib/hooks/useEnrollments"
import { GnpsLiveSummary } from "@/components/student/gnps-live-summary"
import { GnpsResourcesPanel } from "@/components/student/gnps-resources-panel"
import { ETHTL115_SECTIONS_PER_LEVEL, getGnpsProgramSummary } from "@/lib/gnps/ethtl115"
import { cn } from "@/lib/utils"

const LEVEL_COUNT = 3
const ASSESSMENT_COUNT = LEVEL_COUNT * ETHTL115_SECTIONS_PER_LEVEL

const FEATURES = [
  { icon: BookOpen, label: "Build core nursing knowledge" },
  { icon: Users, label: "Learn from expert instructors" },
  { icon: Target, label: "Apply skills in real-world scenarios" },
] as const

function cleanUnitTitle(displayName: string, courseCode: string): string {
  const escaped = courseCode.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  return displayName.replace(new RegExp(`^${escaped}\\s*[·•\\-:]\\s*`, "i"), "").trim() || displayName
}

function ProgressRow({
  label,
  valueLabel,
  percent,
}: {
  label: string
  valueLabel: string
  percent: number
}) {
  const width = Math.min(100, Math.max(0, percent))
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold tabular-nums text-foreground">{valueLabel}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted/80">
        <div className="h-full rounded-full bg-primary" style={{ width: `${width}%` }} />
      </div>
    </div>
  )
}

export function GnpsDashboardCard({
  enrollment,
  displayName,
  courseCode,
  imageUrl,
  canOpen,
  extraActions,
  resourcesContent,
}: {
  enrollment: Enrollment
  displayName: string
  courseCode: string
  imageUrl?: string | null
  canOpen: boolean
  extraActions?: ReactNode
  resourcesContent?: ReactNode
}) {
  const [tab, setTab] = useState<"overview" | "resources">("overview")
  const [imageFailed, setImageFailed] = useState(false)
  const summary = getGnpsProgramSummary(courseCode)
  const title = cleanUnitTitle(displayName, courseCode) || summary.title
  const progress = Math.min(100, Math.max(0, Math.round(Number(enrollment.progress) || 0)))
  const levelsDone = Math.round((progress / 100) * LEVEL_COUNT)
  const assessmentsDone = Math.round((progress / 100) * ASSESSMENT_COUNT)
  const isComplete = enrollment.status === "completed" || progress >= 100
  const grade = enrollment.grade?.trim() || "N/A"
  const enrolledOn = new Date(enrollment.enrollment_date).toLocaleDateString()
  const courseHref = `/student/course/${enrollment.course_id}`

  return (
    <article className="relative overflow-hidden rounded-[1.35rem] border border-border/90 bg-white shadow-[0_10px_30px_rgba(15,39,68,0.08)]">
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-24 opacity-70"
        aria-hidden
        style={{
          background:
            "radial-gradient(120% 80% at 88% 120%, rgba(47,111,237,0.16), transparent 58%)",
        }}
      />

      <div className="relative space-y-5 p-5 md:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <div className="relative h-[7.5rem] w-[7.5rem] shrink-0">
              <div className="h-full w-full overflow-hidden rounded-[1.15rem] bg-muted">
                {imageUrl && !imageFailed ? (
                  <img
                    src={imageUrl}
                    alt=""
                    className="h-full w-full object-cover"
                    onError={() => setImageFailed(true)}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                    <BookOpen className="h-8 w-8" aria-hidden />
                  </div>
                )}
              </div>
              <span className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white shadow-md ring-2 ring-white">
                <HandHeart className="h-4 w-4" aria-hidden />
              </span>
            </div>
            <div className="min-w-0">
              <Badge className="border-0 bg-primary px-2.5 py-0.5 text-[10px] font-semibold tracking-[0.04em] text-white hover:bg-[#194685]">
                {courseCode.toUpperCase()}
              </Badge>
              <h3 className="mt-2 text-xl font-bold leading-snug tracking-tight text-foreground md:text-2xl">
                {title}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                3-level pathway · Enrolled {enrolledOn}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 flex-col items-start gap-2.5 lg:items-end">
            {canOpen ? (
              <Button asChild className="h-11 rounded-xl bg-primary px-5 text-white hover:bg-[#194685]">
                <Link href={courseHref}>
                  <Play className="mr-2 h-4 w-4 fill-current" />
                  Open course
                </Link>
              </Button>
            ) : (
              <span className="rounded-xl border border-border px-4 py-2 text-sm text-muted-foreground">
                Content opening soon
              </span>
            )}
            <div className="flex flex-wrap gap-2">
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
                  isComplete
                    ? "bg-success-soft text-success"
                    : "bg-primary-soft text-primary"
                )}
              >
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                {isComplete ? "Completed" : "In progress"}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2.5 py-1 text-xs font-medium text-primary">
                <BarChart3 className="h-3.5 w-3.5" aria-hidden />
                Grade: {grade}
              </span>
              {enrollment.with_certificate ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2.5 py-1 text-xs font-medium text-primary">
                  <Award className="h-3.5 w-3.5" aria-hidden />
                  Certificate included
                </span>
              ) : null}
            </div>
            {extraActions ? <div className="flex flex-wrap gap-2">{extraActions}</div> : null}
          </div>
        </div>

        <div className="grid gap-6 border-t border-border pt-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(16rem,0.85fr)]">
          <div>
            <div className="mb-3 flex gap-5 text-[11px] font-semibold uppercase tracking-[0.12em]">
              <button
                type="button"
                onClick={() => setTab("overview")}
                className={cn(
                  "border-b-2 pb-1.5",
                  tab === "overview"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-muted-foreground"
                )}
              >
                Overview
              </button>
              <button
                type="button"
                onClick={() => setTab("resources")}
                className={cn(
                  "border-b-2 pb-1.5",
                  tab === "resources"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-muted-foreground"
                )}
              >
                Resources
              </button>
            </div>
            {tab === "overview" ? (
              <div className="space-y-5 text-sm leading-relaxed text-muted-foreground">
                <section>
                  <h4 className="text-base font-semibold tracking-tight text-foreground">
                    About this course
                  </h4>
                  <p className="mt-1.5">
                    {summary.about} This GNPS unit, <strong className="font-semibold text-foreground">{summary.title}</strong>,
                    is a structured 3-level pathway that builds from core practice through to international and global nursing capability.
                  </p>
                </section>

                <section>
                  <h4 className="text-base font-semibold tracking-tight text-foreground">
                    How you will learn
                  </h4>
                  <h5 className="mt-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    In every section
                  </h5>
                  <ul className="mt-1.5 list-disc space-y-1 pl-5 marker:text-primary">
                    <li>
                      <strong className="font-semibold text-foreground">Study notes</strong> — read the core concepts before you watch.
                    </li>
                    <li>
                      <strong className="font-semibold text-foreground">Lecture video</strong> — follow the section teaching with guided explanation.
                    </li>
                    <li>
                      <strong className="font-semibold text-foreground">Flashcards</strong> — reinforce key terms and clinical cues.
                    </li>
                    <li>
                      <strong className="font-semibold text-foreground">Knowledge check</strong> — confirm understanding before you move on.
                    </li>
                  </ul>
                  <h5 className="mt-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    After the sections
                  </h5>
                  <ul className="mt-1.5 list-disc space-y-1 pl-5 marker:text-primary">
                    <li>Apply judgement in case studies</li>
                    <li>Practise clinical decisions in realistic scenarios</li>
                  </ul>
                </section>

                <section>
                  <h4 className="text-base font-semibold tracking-tight text-foreground">
                    The 3-level pathway
                  </h4>
                  <ol className="mt-2 list-decimal space-y-2 pl-5 marker:font-semibold marker:text-primary">
                    {summary.levels.map((level) => (
                      <li key={level.id}>
                        <h5 className="inline text-sm font-semibold text-foreground">
                          Level {level.number} — {level.title}.
                        </h5>{" "}
                        {level.blurb}
                      </li>
                    ))}
                  </ol>
                </section>

                <div className="grid gap-3 sm:grid-cols-3">
                  {FEATURES.map((feature) => (
                    <div key={feature.label} className="flex items-center gap-2.5">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
                        <feature.icon className="h-4 w-4" aria-hidden />
                      </span>
                      <span className="text-xs font-medium leading-snug text-muted-foreground">
                        {feature.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <GnpsResourcesPanel
                courseCode={courseCode}
                courseHref={courseHref}
                canOpen={canOpen}
                extras={resourcesContent}
              />
            )}
          </div>

          <div className="space-y-3 lg:border-l lg:border-border lg:pl-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Your progress</p>
            <ProgressRow label="Overall Progress" valueLabel={`${progress}%`} percent={progress} />
            <ProgressRow
              label="Levels completed"
              valueLabel={`${levelsDone}/${LEVEL_COUNT}`}
              percent={(levelsDone / LEVEL_COUNT) * 100}
            />
            <ProgressRow
              label="Knowledge checks"
              valueLabel={`${assessmentsDone}/${ASSESSMENT_COUNT}`}
              percent={(assessmentsDone / ASSESSMENT_COUNT) * 100}
            />
            <GnpsLiveSummary enrollmentId={enrollment.id} courseId={enrollment.course_id} />
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" className="rounded-lg" asChild>
              <Link href="/student/support">
                <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
                Contact Instructor
              </Link>
            </Button>
            <Button variant="outline" size="sm" className="rounded-lg" asChild>
              <Link href="/student/completed-units">
                <Clock3 className="mr-1.5 h-3.5 w-3.5" />
                View History
              </Link>
            </Button>
          </div>
          <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" aria-hidden />
            Next class
            <span className="font-semibold text-foreground">TBD</span>
          </p>
        </div>
      </div>
    </article>
  )
}
