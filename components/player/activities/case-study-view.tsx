"use client"

import { ActivityHeading } from "../activity-heading"

import { useEffect, useState } from "react"
import { Check, X } from "lucide-react"

import { cn } from "@/lib/utils"

export type CaseQuestion = {
  id: string
  title?: string
  stem: string
  /** "select_all" accepts several answers; "single" accepts exactly one. */
  type: "select_all" | "single"
  options: { id: string; text: string }[]
  correctOptionIds: string[]
  rationale?: string
}

export function CaseStudyView({
  title,
  stem,
  questions,
  kicker = "Case study",
}: {
  title: string
  stem: string
  questions: CaseQuestion[]
  kicker?: string
}) {
  const [picked, setPicked] = useState<Record<string, string[]>>({})
  const [revealed, setRevealed] = useState<Record<string, boolean>>({})

  useEffect(() => {
    setPicked({})
    setRevealed({})
  }, [questions])

  const toggle = (q: CaseQuestion, optionId: string) => {
    if (revealed[q.id]) return
    setPicked((prev) => {
      const current = prev[q.id] ?? []
      if (q.type === "single") return { ...prev, [q.id]: [optionId] }
      return {
        ...prev,
        [q.id]: current.includes(optionId) ? current.filter((id) => id !== optionId) : [...current, optionId],
      }
    })
  }

  return (
    <section>
      <ActivityHeading label={kicker} title={title} kind="case"/>

      <div className="mt-5 rounded-[13px] border border-border bg-card p-5">
        {stem.split(/\n{2,}/).map((para, i) => (
          <p key={i} className={cn("text-sm leading-relaxed text-foreground", i > 0 && "mt-3")}>
            {para}
          </p>
        ))}
      </div>

      <ol className="mt-5 space-y-4">
        {questions.map((q, qIndex) => {
          const chosen = picked[q.id] ?? []
          const show = revealed[q.id] ?? false
          return (
            <li key={q.id} className="rounded-[13px] border border-border bg-card p-5">
              {q.title && (
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {q.title}
                </p>
              )}
              <p className="mt-1 text-sm font-semibold text-foreground">
                {qIndex + 1}. {q.stem}
              </p>
              <div className="mt-3 space-y-2">
                {q.options.map((option) => {
                  const isChosen = chosen.includes(option.id)
                  const isCorrect = q.correctOptionIds.includes(option.id)
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => toggle(q, option.id)}
                      aria-pressed={isChosen}
                      className={cn(
                        "flex w-full items-start gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors",
                        show && isCorrect && "border-success-line bg-success-soft",
                        show && isChosen && !isCorrect && "border-destructive-line bg-destructive-soft",
                        !show && isChosen ? "border-primary bg-primary-soft" : "border-border bg-card"
                      )}
                    >
                      <span className="flex-1 text-foreground">{option.text}</span>
                      {show && isCorrect && <Check className="h-4 w-4 shrink-0 text-success" aria-hidden />}
                      {show && isChosen && !isCorrect && (
                        <X className="h-4 w-4 shrink-0 text-destructive" aria-hidden />
                      )}
                    </button>
                  )
                })}
              </div>
              {!show ? (
                <button
                  type="button"
                  disabled={chosen.length === 0}
                  onClick={() => setRevealed((prev) => ({ ...prev, [q.id]: true }))}
                  className="mt-3 inline-flex min-h-9 items-center rounded-lg border border-border bg-card px-3 text-sm font-semibold text-primary disabled:opacity-40"
                >
                  Check answer
                </button>
              ) : (
                q.rationale && (
                  <p className="mt-3 rounded-lg bg-muted px-3 py-2.5 text-sm text-muted-foreground">{q.rationale}</p>
                )
              )}
            </li>
          )
        })}
      </ol>
    </section>
  )
}
