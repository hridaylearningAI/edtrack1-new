"use client"

import { ActivityHeading } from "../activity-heading"

import { useEffect, useState } from "react"
import { AlertTriangle } from "lucide-react"

import { cn } from "@/lib/utils"

export type DecisionPrompt = {
  title: string
  scenario: string
  prompts: string[]
  modelFirst: string
  modelWhy: string
  modelNext: string
  trap?: string
}

/**
 * Write-then-compare: the learner commits an answer before the model answer is shown, which is the
 * point of the exercise — so the reveal stays behind a button rather than rendering alongside.
 */
export function DecisionView({ title, decision }: { title: string; decision: DecisionPrompt }) {
  const [responses, setResponses] = useState<string[]>([])
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    setResponses([])
    setRevealed(false)
  }, [decision])

  const model = [
    { label: "First action", text: decision.modelFirst },
    { label: "Why", text: decision.modelWhy },
    { label: "What to check next", text: decision.modelNext },
  ]

  return (
    <section>
      <ActivityHeading label="Decision practice" title={title} kind="case"/>

      <div className="mt-5 rounded-[13px] border border-border bg-card p-5">
        {decision.scenario.split(/\n{2,}/).map((para, i) => (
          <p key={i} className={cn("text-sm leading-relaxed text-foreground", i > 0 && "mt-3")}>
            {para}
          </p>
        ))}
      </div>

      <div className="mt-5 space-y-3">
        {decision.prompts.map((prompt, i) => (
          <div key={prompt} className="rounded-[13px] border border-border bg-card p-4">
            <label htmlFor={`decision-prompt-${i}`} className="text-sm font-semibold text-foreground">
              {i + 1}. {prompt}
            </label>
            <textarea
              id={`decision-prompt-${i}`}
              rows={3}
              value={responses[i] ?? ""}
              onChange={(e) =>
                setResponses((prev) => {
                  const next = [...prev]
                  next[i] = e.target.value
                  return next
                })
              }
              placeholder="Write your answer before revealing the model response"
              className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-ring"
            />
          </div>
        ))}
      </div>

      {!revealed ? (
        <button
          type="button"
          onClick={() => setRevealed(true)}
          className="mt-5 inline-flex min-h-10 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground"
        >
          Reveal model answer
        </button>
      ) : (
        <div className="mt-5 rounded-[13px] border border-success-line bg-success-soft p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-success">Model answer</p>
          <dl className="mt-3 space-y-3">
            {model.map((item) => (
              <div key={item.label}>
                <dt className="text-sm font-semibold text-foreground">{item.label}</dt>
                <dd className="mt-0.5 text-sm leading-relaxed text-foreground">{item.text}</dd>
              </div>
            ))}
          </dl>
          {decision.trap && (
            <p className="mt-4 flex items-start gap-2 rounded-lg border border-warning-line bg-warning-soft px-3 py-2.5 text-sm text-foreground">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden />
              <span>
                <span className="font-semibold text-warning">Common trap: </span>
                {decision.trap}
              </span>
            </p>
          )}
        </div>
      )}
    </section>
  )
}
