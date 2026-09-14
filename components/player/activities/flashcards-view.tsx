"use client"

import { ActivityHeading } from "../activity-heading"

import { useEffect, useState } from "react"
import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react"

export type Flashcard = { id: string; front: string; back: string }

export function FlashcardsView({ title, cards }: { title: string; cards: Flashcard[] }) {
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)

  // A new activity reuses this component; start its deck from the top.
  useEffect(() => {
    setIndex(0)
    setFlipped(false)
  }, [cards])

  if (cards.length === 0) {
    return <p className="py-16 text-center text-sm text-muted-foreground">No flashcards for this section yet.</p>
  }

  const card = cards[Math.min(index, cards.length - 1)]
  const go = (delta: number) => {
    setIndex((i) => Math.min(cards.length - 1, Math.max(0, i + delta)))
    setFlipped(false)
  }

  return (
    <section className="studio-flashcards">
      <ActivityHeading label="Flashcards" title={title} kind="cards"/>

      <button
        type="button"
        onClick={() => setFlipped((f) => !f)}
        aria-label={flipped ? "Show question" : "Show answer"}
        className="mt-6 grid min-h-[260px] w-full place-items-center rounded-[13px] border border-border bg-card px-6 py-10 text-center transition-colors hover:border-primary-line"
      >
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {flipped ? "Answer" : "Question"}
          </p>
          <p className="mt-3 text-lg leading-relaxed text-foreground">{flipped ? card.back : card.front}</p>
          {!flipped && <p className="mt-6 text-xs text-muted-foreground">Click the card to reveal the answer</p>}
        </div>
      </button>

      <div className="mt-4 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => go(-1)}
          disabled={index === 0}
          className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-border bg-card px-3 text-sm text-foreground disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </button>
        <span className="text-xs text-muted-foreground">
          Card {index + 1} of {cards.length}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setIndex(0)
              setFlipped(false)
            }}
            className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-border bg-card px-3 text-sm text-foreground"
          >
            <RotateCcw className="h-4 w-4" />
            Restart
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            disabled={index >= cards.length - 1}
            className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-border bg-card px-3 text-sm text-foreground disabled:opacity-40"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  )
}
