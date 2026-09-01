"use client"

import Link from "next/link"
import { useMemo, useState, type ReactNode } from "react"
import {
  BookOpen,
  Clapperboard,
  FileQuestion,
  Layers3,
  Scale,
  Stethoscope,
} from "lucide-react"
import {
  ETHTL115_CASES_PER_LEVEL,
  ETHTL115_DECISIONS_PER_LEVEL,
  ETHTL115_SECTIONS_PER_LEVEL,
  getEthtl115CasePageId,
  getEthtl115CaseTitle,
  getEthtl115DecisionPageId,
  getEthtl115DecisionTitle,
  getEthtl115LevelIntroVideoPageId,
  getEthtl115Levels,
  getEthtl115NotesSectionTitle,
  hasEthtl115LevelIntroVideo,
  getEthtl115SectionFlashcards,
  getEthtl115SectionPageId,
  getEthtl115SectionQuizSlice,
  type Ethtl115ActivityKind,
  type Ethtl115CaseNumber,
  type Ethtl115DecisionNumber,
  type Ethtl115LevelNumber,
  type Ethtl115SectionNumber,
} from "@/lib/gnps/ethtl115"
import { cn } from "@/lib/utils"

type ResourceKind = Ethtl115ActivityKind | "case" | "decision"

type ResourceItem = {
  id: string
  kind: ResourceKind
  level: Ethtl115LevelNumber
  levelTitle: string
  title: string
  detail: string
}

const KIND_META: Record<
  ResourceKind,
  { label: string; icon: typeof BookOpen }
> = {
  notes: { label: "Notes", icon: BookOpen },
  video: { label: "Videos", icon: Clapperboard },
  flashcards: { label: "Flashcards", icon: Layers3 },
  quiz: { label: "Quizzes", icon: FileQuestion },
  case: { label: "Cases", icon: Stethoscope },
  decision: { label: "Decisions", icon: Scale },
}

const KIND_FILTERS: Array<ResourceKind | "all"> = [
  "all",
  "notes",
  "video",
  "flashcards",
  "quiz",
  "case",
  "decision",
]

const LEVELS: Ethtl115LevelNumber[] = [1, 2, 3]

function buildCatalog(courseCode: string): ResourceItem[] {
  const items: ResourceItem[] = []
  for (const level of LEVELS) {
    const levelTitle = getEthtl115Levels(courseCode).find((meta) => meta.number === level)?.title ?? `Level ${level}`
    if (hasEthtl115LevelIntroVideo(level)) {
      items.push({
        id: getEthtl115LevelIntroVideoPageId(level),
        kind: "video",
        level,
        levelTitle,
        title: levelTitle,
        detail: "Level introduction · Overview video",
      })
    }
    for (let section = 1; section <= ETHTL115_SECTIONS_PER_LEVEL; section++) {
      const sectionNum = section as Ethtl115SectionNumber
      const sectionTitle = getEthtl115NotesSectionTitle(level, sectionNum, courseCode)
      const flashCount = getEthtl115SectionFlashcards(level, sectionNum, courseCode).length
      const quizCount = getEthtl115SectionQuizSlice(level, sectionNum, courseCode).questions.length
      items.push({
        id: getEthtl115SectionPageId(level, sectionNum, "notes"),
        kind: "notes",
        level,
        levelTitle,
        title: sectionTitle,
        detail: `Section ${section} · Learning notes`,
      })
      items.push({
        id: getEthtl115SectionPageId(level, sectionNum, "video"),
        kind: "video",
        level,
        levelTitle,
        title: sectionTitle,
        detail: `Section ${section} · Lecture video`,
      })
      items.push({
        id: getEthtl115SectionPageId(level, sectionNum, "flashcards"),
        kind: "flashcards",
        level,
        levelTitle,
        title: sectionTitle,
        detail: `Section ${section} · ${flashCount} cards`,
      })
      items.push({
        id: getEthtl115SectionPageId(level, sectionNum, "quiz"),
        kind: "quiz",
        level,
        levelTitle,
        title: sectionTitle,
        detail: `Section ${section} · ${quizCount} questions`,
      })
    }
    for (let caseIndex = 1; caseIndex <= ETHTL115_CASES_PER_LEVEL; caseIndex++) {
      const index = caseIndex as Ethtl115CaseNumber
      items.push({
        id: getEthtl115CasePageId(level, index),
        kind: "case",
        level,
        levelTitle,
        title: getEthtl115CaseTitle(level, index, courseCode),
        detail: `Case study ${caseIndex}`,
      })
    }
    for (let decisionIndex = 1; decisionIndex <= ETHTL115_DECISIONS_PER_LEVEL; decisionIndex++) {
      const index = decisionIndex as Ethtl115DecisionNumber
      items.push({
        id: getEthtl115DecisionPageId(level, index),
        kind: "decision",
        level,
        levelTitle,
        title: getEthtl115DecisionTitle(level, index, courseCode),
        detail: `Decision ${decisionIndex}`,
      })
    }
  }
  return items
}

export function GnpsResourcesPanel({
  courseCode,
  courseHref,
  canOpen,
  extras,
}: {
  courseCode: string
  courseHref: string
  canOpen: boolean
  extras?: ReactNode
}) {
  const [kind, setKind] = useState<ResourceKind | "all">("all")
  const [levelFilter, setLevelFilter] = useState<Ethtl115LevelNumber | "all">("all")
  const catalog = useMemo(() => buildCatalog(courseCode), [courseCode])

  const filtered = catalog.filter((item) => {
    if (kind !== "all" && item.kind !== kind) return false
    if (levelFilter !== "all" && item.level !== levelFilter) return false
    return true
  })

  const grouped = LEVELS.map((level) => ({
    level,
    title: catalog.find((item) => item.level === level)?.levelTitle ?? `Level ${level}`,
    items: filtered.filter((item) => item.level === level),
  })).filter((group) => group.items.length > 0)

  return (
    <div className="space-y-4">
      {extras}

      <div className="flex flex-wrap gap-1.5">
        {KIND_FILTERS.map((filter) => (
          <button
            key={filter}
            type="button"
            onClick={() => setKind(filter)}
            className={cn(
              "rounded-full px-2.5 py-1 text-[11px] font-semibold",
              kind === filter
                ? "bg-[#16325c] text-white"
                : "bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
            )}
          >
            {filter === "all" ? "All" : KIND_META[filter].label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {(["all", ...LEVELS] as const).map((filter) => (
          <button
            key={filter}
            type="button"
            onClick={() => setLevelFilter(filter)}
            className={cn(
              "rounded-full px-2.5 py-1 text-[11px] font-semibold",
              levelFilter === filter
                ? "bg-[#2f6fed] text-white"
                : "bg-sky-50 text-sky-700 hover:bg-sky-100 dark:bg-sky-950/40 dark:text-sky-200"
            )}
          >
            {filter === "all" ? "All levels" : `Level ${filter}`}
          </button>
        ))}
      </div>

      <div className="max-h-[28rem] space-y-4 overflow-y-auto pr-1">
        {grouped.map((group) => (
          <section key={group.level}>
            <h5 className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#16325c] dark:text-slate-200">
              Level {group.level} — {group.title}
            </h5>
            <ul className="space-y-1.5">
              {group.items.map((item) => {
                const Icon = KIND_META[item.kind].icon
                const href = canOpen ? `${courseHref}?page=${encodeURIComponent(item.id)}` : undefined
                const row = (
                  <>
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-[#2f6fed] dark:bg-sky-950/40">
                      <Icon className="h-4 w-4" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-[#16325c] dark:text-slate-100">
                        {item.title}
                      </span>
                      <span className="block truncate text-xs text-slate-500 dark:text-slate-400">{item.detail}</span>
                    </span>
                    <span className="shrink-0 text-[11px] font-semibold text-[#2f6fed]">
                      {KIND_META[item.kind].label}
                    </span>
                  </>
                )
                return (
                  <li key={item.id}>
                    {href ? (
                      <Link
                        href={href}
                        className="flex items-center gap-2.5 rounded-xl border border-slate-100 px-2.5 py-2 transition-colors hover:border-sky-200 hover:bg-sky-50/70 dark:border-slate-800 dark:hover:border-sky-900 dark:hover:bg-sky-950/20"
                      >
                        {row}
                      </Link>
                    ) : (
                      <div className="flex items-center gap-2.5 rounded-xl border border-dashed border-slate-200 px-2.5 py-2 opacity-70 dark:border-slate-700">
                        {row}
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}
