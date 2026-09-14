"use client"

import { ActivityHeading } from "../activity-heading"

import { useEffect, useMemo, useState } from "react"
import { Check, X } from "lucide-react"

import { cn } from "@/lib/utils"

export type QuizOption = { id: string; text: string }
export type QuizItem = {
  id: string
  stem: string
  options: QuizOption[]
  correctOptionId: string
  rationale?: string
}

export function QuizView({
  title,
  questions,
  passingScorePercent,
  onPassed,
}: {
  title: string
  questions: QuizItem[]
  passingScorePercent: number
  /** Called once when the learner reaches the passing score, so the shell can unlock what follows. */
  onPassed?: () => void
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    setAnswers({})
    setSubmitted(false)
  }, [questions])

  const correctCount = useMemo(
    () => questions.filter((q) => answers[q.id] === q.correctOptionId).length,
    [questions, answers]
  )
  const percent = questions.length ? Math.round((correctCount / questions.length) * 100) : 0
  const passed = submitted && percent >= passingScorePercent

  useEffect(() => {
    if (passed) onPassed?.()
  }, [passed, onPassed])

  if (questions.length === 0) {
    return <p className="py-16 text-center text-sm text-muted-foreground">No questions for this section yet.</p>
  }

  const allAnswered = questions.every((q) => answers[q.id])

  return (
    <section>
      <ActivityHeading label="Knowledge check" title={title} kind="quiz"/>
      <p className="mt-1 text-sm text-muted-foreground">
        {questions.length} questions · {passingScorePercent}% to pass
      </p>

      {submitted && (
        <div
          className={cn(
            "mt-5 rounded-[13px] border px-4 py-3",
            passed ? "border-success-line bg-success-soft" : "border-warning-line bg-warning-soft"
          )}
        >
          <p className={cn("text-sm font-semibold", passed ? "text-success" : "text-warning")}>
            {passed ? "Passed" : "Not quite yet"} — {correctCount}/{questions.length} correct ({percent}%)
          </p>
          {!passed && (
            <button
              type="button"
              onClick={() => {
                setAnswers({})
                setSubmitted(false)
              }}
              className="mt-2 text-sm font-semibold text-primary underline-offset-2 hover:underline"
            >
              Try again
            </button>
          )}
        </div>
      )}

      <ol className="mt-6 space-y-4">
        {questions.map((q, qIndex) => (
          <li key={q.id} className="rounded-[13px] border border-border bg-card p-5">
            <p className="text-sm font-semibold text-foreground">
              {qIndex + 1}. {q.stem}
            </p>
            <div className="mt-3 space-y-2">
              {q.options.map((option) => {
                const chosen = answers[q.id] === option.id
                const isCorrect = option.id === q.correctOptionId
                return (
                  <label
                    key={option.id}
                    className={cn(
                      "flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors",
                      submitted && isCorrect && "border-success-line bg-success-soft",
                      submitted && chosen && !isCorrect && "border-destructive-line bg-destructive-soft",
                      !submitted && chosen ? "border-primary bg-primary-soft" : "border-border bg-card",
                      submitted && "cursor-default"
                    )}
                  >
                    <input
                      type="radio"
                      name={q.id}
                      value={option.id}
                      checked={chosen}
                      disabled={submitted}
                      onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: option.id }))}
                      className="mt-0.5 h-4 w-4 accent-[#2054a0]"
                    />
                    <span className="flex-1 text-foreground">{option.text}</span>
                    {submitted && isCorrect && <Check className="h-4 w-4 shrink-0 text-success" aria-hidden />}
                    {submitted && chosen && !isCorrect && (
                      <X className="h-4 w-4 shrink-0 text-destructive" aria-hidden />
                    )}
                  </label>
                )
              })}
            </div>
            {submitted && q.rationale && (
              <p className="mt-3 rounded-lg bg-muted px-3 py-2.5 text-sm text-muted-foreground">{q.rationale}</p>
            )}
          </li>
        ))}
      </ol>

      {!submitted && (
        <button
          type="button"
          disabled={!allAnswered}
          onClick={() => setSubmitted(true)}
          className="mt-5 inline-flex min-h-10 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-40"
        >
          {allAnswered ? "Submit answers" : `Answer all ${questions.length} questions`}
        </button>
      )}
    </section>
  )
}
