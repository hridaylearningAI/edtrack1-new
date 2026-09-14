"use client"

import { useEffect, useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { CaseStudyView, type CaseQuestion } from "@/components/player/activities/case-study-view"

export type NgnCase = { title: string; stem: string; questions: CaseQuestion[] }

/** One case at a time — a module carries a dozen or more, which is too much for a single scroll. */
export function NgnView({ moduleTitle, cases }: { moduleTitle: string; cases: NgnCase[] }) {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    setIndex(0)
  }, [cases])

  if (cases.length === 0) {
    return <p className="py-16 text-center text-sm text-muted-foreground">No case studies for this module yet.</p>
  }

  const current = Math.min(index, cases.length - 1)
  const kase = cases[current]

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-[13px] border border-border bg-card px-4 py-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            NGN case study
          </p>
          <p className="truncate text-sm font-semibold text-foreground">{moduleTitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            disabled={current === 0}
            aria-label="Previous case"
            className="grid h-9 w-9 place-items-center rounded-lg border border-border bg-card text-foreground disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-xs text-muted-foreground">
            Case {current + 1} of {cases.length}
          </span>
          <button
            type="button"
            onClick={() => setIndex((i) => Math.min(cases.length - 1, i + 1))}
            disabled={current >= cases.length - 1}
            aria-label="Next case"
            className="grid h-9 w-9 place-items-center rounded-lg border border-border bg-card text-foreground disabled:opacity-40"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <CaseStudyView
        key={kase.title}
        title={kase.title}
        stem={kase.stem}
        questions={kase.questions}
        kicker={`Case ${current + 1}`}
      />
    </div>
  )
}
