"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import { Loader2, Send, Sparkles } from "lucide-react"
import { EdBotFigure } from "@/components/student/edbot-figure"
import type { QuizAnalysisResult } from "@/lib/quiz-analysis"
import { cn } from "@/lib/utils"

type ChatMessage = { role: "user" | "model"; content: string }

type CoachBlock =
  | { type: "p"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }

function parseCoachBlocks(content: string): CoachBlock[] {
  const lines = content.replace(/\r\n/g, "\n").trim().split("\n")
  const blocks: CoachBlock[] = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]?.trim() ?? ""
    if (!line) {
      i += 1
      continue
    }
    if (/^[-*•]\s+/.test(line)) {
      const items: string[] = []
      while (i < lines.length) {
        const match = lines[i]?.trim().match(/^[-*•]\s+(.+)$/)
        if (!match) break
        items.push(match[1] ?? "")
        i += 1
      }
      blocks.push({ type: "ul", items })
      continue
    }
    if (/^\d+[.)]\s+/.test(line)) {
      const items: string[] = []
      while (i < lines.length) {
        const match = lines[i]?.trim().match(/^\d+[.)]\s+(.+)$/)
        if (!match) break
        items.push(match[1] ?? "")
        i += 1
      }
      blocks.push({ type: "ol", items })
      continue
    }
    const para: string[] = [line]
    i += 1
    while (i < lines.length) {
      const next = lines[i]?.trim() ?? ""
      if (!next || /^[-*•]\s+/.test(next) || /^\d+[.)]\s+/.test(next)) break
      para.push(next)
      i += 1
    }
    blocks.push({ type: "p", text: para.join(" ") })
  }
  return blocks
}

function renderInlineMarkdown(text: string): ReactNode[] {
  const nodes: ReactNode[] = []
  const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*)/g
  let last = 0
  let match: RegExpExecArray | null
  let key = 0
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) nodes.push(text.slice(last, match.index))
    const token = match[0]
    if (token.startsWith("**")) {
      nodes.push(<strong key={`b-${key++}`}>{token.slice(2, -2)}</strong>)
    } else {
      nodes.push(<em key={`i-${key++}`}>{token.slice(1, -1)}</em>)
    }
    last = match.index + token.length
  }
  if (last < text.length) nodes.push(text.slice(last))
  return nodes
}

function CoachListItem({ text, index }: { text: string; index: number }) {
  const labeled = text.match(/^\*\*([^*]+)\*\*:?\s*(.*)$/) || text.match(/^([^:*]{2,32}):\s+(.+)$/)
  if (labeled) {
    const label = labeled[1]?.replace(/\*+/g, "").trim() ?? ""
    const rest = labeled[2] ?? ""
    return (
      <li>
        <span className="gnps-quiz-analysis-step-num" aria-hidden>
          {index + 1}
        </span>
        <div className="gnps-quiz-analysis-step-body">
          <span className="gnps-quiz-analysis-step-label">{label}</span>
          {rest ? <span className="gnps-quiz-analysis-step-copy">{renderInlineMarkdown(rest)}</span> : null}
        </div>
      </li>
    )
  }
  return (
    <li>
      <span className="gnps-quiz-analysis-step-num" aria-hidden>
        {index + 1}
      </span>
      <div className="gnps-quiz-analysis-step-body">
        <span className="gnps-quiz-analysis-step-copy">{renderInlineMarkdown(text)}</span>
      </div>
    </li>
  )
}

export function CoachRichText({ content }: { content: string }) {
  const blocks = parseCoachBlocks(content)
  if (blocks.length === 0) return null
  return (
    <div className="gnps-quiz-analysis-md">
      {blocks.map((block, idx) => {
        switch (block.type) {
          case "p":
            return (
              <p key={`p-${idx}`} className={idx === 0 ? "is-lead" : undefined}>
                {renderInlineMarkdown(block.text)}
              </p>
            )
          case "ul":
          case "ol":
            return (
              <ul key={`l-${idx}`} className="gnps-quiz-analysis-steps">
                {block.items.map((item, itemIdx) => (
                  <CoachListItem key={`${idx}-${itemIdx}`} text={item} index={itemIdx} />
                ))}
              </ul>
            )
          default: {
            const _exhaustive: never = block
            return _exhaustive
          }
        }
      })}
    </div>
  )
}

function buildLocalCoaching(analysis: QuizAnalysisResult, passingPercent: number): string {
  const weakSection =
    analysis.bySection.filter((b) => b.total > 0).sort((a, b) => a.percent - b.percent)[0] ?? null
  const weakDiff =
    analysis.byDifficulty.filter((b) => b.total > 0).sort((a, b) => a.percent - b.percent)[0] ?? null
  const lines = [
    analysis.passed
      ? `Nice work — you passed at **${analysis.scorePercent}%**. Let's lock in the gaps so the next attempt is even stronger.`
      : `You scored **${analysis.scorePercent}%** (pass mark ${passingPercent}%). You're close — focus the next study block on the weakest labels below.`,
  ]
  if (weakSection) {
    lines.push(
      `Weakest section label: “${weakSection.label}” (${weakSection.correct}/${weakSection.total}). Re-read that section's notes/flashcards, then retry only those items.`
    )
  }
  if (weakDiff) {
    lines.push(
      `Weakest difficulty band: ${weakDiff.label} (${weakDiff.correct}/${weakDiff.total}). Practice a few more ${weakDiff.label.toLowerCase()} stems before a full retake.`
    )
  }
  lines.push("Here are a few concrete next steps:")
  lines.push("* **Review:** Go through each missed item and its rationale")
  lines.push("* **Revisit notes:** Focus on your weakest section label")
  lines.push("* **Retake:** Practice weak areas, then attempt the full check again")
  return lines.join("\n")
}

async function requestCoaching(
  analysis: QuizAnalysisResult,
  quizTitle: string | undefined,
  topicName: string | undefined,
  passingPercent: number,
  messages: ChatMessage[],
  signal?: AbortSignal
): Promise<string> {
  const res = await fetch("/api/quiz/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal,
    body: JSON.stringify({
      quizTitle,
      topicName,
      scorePercent: analysis.scorePercent,
      passed: analysis.passed,
      passingPercent,
      correctCount: analysis.correctCount,
      totalQuestions: analysis.totalQuestions,
      bySection: analysis.bySection,
      byDifficulty: analysis.byDifficulty,
      missed: analysis.missed,
      messages,
    }),
  })

  let data: { success?: boolean; text?: string; error?: string } = {}
  try {
    data = await res.json()
  } catch {
    throw new Error(`Coaching request failed (${res.status})`)
  }
  if (!res.ok || !data.success || !data.text) {
    throw new Error(data.error || `Coaching request failed (${res.status})`)
  }
  return data.text
}

export type QuizAttemptHistoryItem = {
  id?: number | string
  quiz_identifier?: string
  score_percent: number
  passed: boolean
  total_questions: number
  correct_count: number
  attempted_at: string
}

export function QuizAnalysisPanel({
  analysis,
  quizTitle,
  topicName,
  passingPercent,
  onReviewMiss,
  previousAttempts = [],
  className,
}: {
  analysis: QuizAnalysisResult
  quizTitle?: string
  topicName?: string
  passingPercent: number
  onReviewMiss?: (questionNumber: number) => void
  previousAttempts?: QuizAttemptHistoryItem[]
  className?: string
}) {
  const [tab, setTab] = useState<"current" | "history">("current")
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [input, setInput] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)
  const analysisRef = useRef(analysis)
  analysisRef.current = analysis
  const attemptKey = `${analysis.correctCount}/${analysis.totalQuestions}:${analysis.scorePercent}:${analysis.missed
    .map((m) => m.number)
    .join(",")}`

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
  }, [messages, loading])

  useEffect(() => {
    const snapshot = analysisRef.current
    const controller = new AbortController()
    let cancelled = false
    setLoading(true)
    setMessages([])

    const timeout = window.setTimeout(() => controller.abort(), 45000)

    requestCoaching(snapshot, quizTitle, topicName, passingPercent, [], controller.signal)
      .then((text) => {
        if (cancelled) return
        setMessages([{ role: "model", content: text }])
      })
      .catch(() => {
        if (cancelled) return
        // Offline / API / Strict Mode abort recovery — still give actionable coaching.
        setMessages([{ role: "model", content: buildLocalCoaching(snapshot, passingPercent) }])
      })
      .finally(() => {
        window.clearTimeout(timeout)
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
      controller.abort()
      window.clearTimeout(timeout)
    }
  }, [attemptKey, quizTitle, topicName, passingPercent])

  const sendFollowUp = () => {
    const trimmed = input.trim()
    if (!trimmed || loading) return
    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: trimmed }]
    setMessages(nextMessages)
    setInput("")
    setLoading(true)
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 45000)
    requestCoaching(analysis, quizTitle, topicName, passingPercent, nextMessages, controller.signal)
      .then((text) => {
        setMessages((prev) => [...prev, { role: "model", content: text }])
      })
      .catch(() => {
        setMessages((prev) => [
          ...prev,
          {
            role: "model",
            content:
              "I couldn't reach the live coach just now. Use the section/difficulty bars above, review missed rationales, then ask again in a moment.",
          },
        ])
      })
      .finally(() => {
        window.clearTimeout(timeout)
        setLoading(false)
      })
  }

  const programArea =
    analysis.missed.find((m) => m.programArea)?.programArea ||
    analysis.bySection[0]?.label ||
    null

  const historyRows = previousAttempts
    .slice()
    .sort((a, b) => new Date(b.attempted_at).getTime() - new Date(a.attempted_at).getTime())

  return (
    <div className={cn("gnps-quiz-analysis", className)}>
      <div className="gnps-quiz-analysis-tabs" role="tablist" aria-label="Knowledge check analysis">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "current"}
          className={cn("gnps-quiz-analysis-tab", tab === "current" && "is-active")}
          onClick={() => setTab("current")}
        >
          This attempt
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "history"}
          className={cn("gnps-quiz-analysis-tab", tab === "history" && "is-active")}
          onClick={() => setTab("history")}
        >
          Previous attempts
          {historyRows.length > 0 ? <em>{historyRows.length}</em> : null}
        </button>
      </div>

      {tab === "history" ? (
        <section className="gnps-quiz-analysis-history" aria-label="Previous knowledge check attempts">
          <div className="gnps-quiz-analysis-hero">
            <div>
              <p className="gnps-quiz-analysis-kicker">Attempt history</p>
              <h3>Marks from earlier tries</h3>
              <p>Compare how your score has moved across attempts for this knowledge check.</p>
            </div>
          </div>
          {historyRows.length === 0 ? (
            <p className="gnps-quiz-analysis-history-empty">No previous attempts saved yet for this knowledge check.</p>
          ) : (
            <ul className="gnps-quiz-analysis-history-list">
              {historyRows.map((row, idx) => {
                const when = (() => {
                  try {
                    return new Date(row.attempted_at).toLocaleString(undefined, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })
                  } catch {
                    return row.attempted_at
                  }
                })()
                return (
                  <li key={row.id ?? `${row.attempted_at}-${idx}`}>
                    <div className="gnps-quiz-analysis-history-meta">
                      <strong>Attempt {historyRows.length - idx}</strong>
                      <span>{when}</span>
                    </div>
                    <div className={cn("gnps-quiz-analysis-history-score", row.passed ? "is-pass" : "is-fail")}>
                      <strong>{Math.round(row.score_percent)}%</strong>
                      <span>
                        {row.correct_count}/{row.total_questions} · {row.passed ? "Passed" : "Not passed"}
                      </span>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      ) : (
        <>
      <div className="gnps-quiz-analysis-hero">
        <div>
          <p className="gnps-quiz-analysis-kicker">Attempt analysis</p>
          <h3>{analysis.passed ? "Solid attempt — here’s the breakdown" : "Close — here’s where to focus"}</h3>
          <p>
            {analysis.correctCount}/{analysis.totalQuestions} correct ({analysis.scorePercent}%). Pass mark{" "}
            {passingPercent}%.
            {programArea ? ` Program area: ${programArea}.` : ""}
          </p>
        </div>
        <div className={cn("gnps-quiz-analysis-score", analysis.passed ? "is-pass" : "is-fail")}>
          <strong>{analysis.scorePercent}%</strong>
          <span>{analysis.passed ? "Passed" : "Below pass"}</span>
        </div>
      </div>

      <div className="gnps-quiz-analysis-grid">
        <section className="gnps-quiz-analysis-card">
          <h4>By section label</h4>
          <p className="gnps-quiz-analysis-card-sub">Where each item comes from in the question bank</p>
          <ul className="gnps-quiz-analysis-bars">
            {analysis.bySection.map((bucket) => (
              <li key={bucket.key}>
                <div className="gnps-quiz-analysis-bar-meta">
                  <span>{bucket.label}</span>
                  <strong>
                    {bucket.correct}/{bucket.total} · {bucket.percent}%
                  </strong>
                </div>
                <div className="gnps-quiz-analysis-bar-track" aria-hidden>
                  <div
                    className={cn(bucket.percent >= passingPercent ? "is-strong" : "is-weak")}
                    style={{ transform: `scaleX(${Math.max(bucket.percent, 4) / 100})` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="gnps-quiz-analysis-card">
          <h4>By difficulty</h4>
          <p className="gnps-quiz-analysis-card-sub">Simple · Moderate · Difficult from the bank labels</p>
          <ul className="gnps-quiz-analysis-bars">
            {analysis.byDifficulty.map((bucket) => (
              <li key={bucket.key}>
                <div className="gnps-quiz-analysis-bar-meta">
                  <span>{bucket.label}</span>
                  <strong>
                    {bucket.correct}/{bucket.total} · {bucket.percent}%
                  </strong>
                </div>
                <div className="gnps-quiz-analysis-bar-track" aria-hidden>
                  <div
                    className={cn(bucket.percent >= passingPercent ? "is-strong" : "is-weak")}
                    style={{ transform: `scaleX(${Math.max(bucket.percent, 4) / 100})` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {analysis.missed.length > 0 && (
        <section className="gnps-quiz-analysis-card">
          <h4>Missed items</h4>
          <ul className="gnps-quiz-analysis-missed">
            {analysis.missed.map((item) => (
              <li key={item.number}>
                <button
                  type="button"
                  onClick={() => onReviewMiss?.(item.number)}
                  className="gnps-quiz-analysis-missed-btn"
                >
                  <span className="gnps-quiz-analysis-missed-num">Q{item.number}</span>
                  <span className="gnps-quiz-analysis-missed-copy">
                    <strong>{item.question}</strong>
                    <span>
                      {[item.sectionLabel, item.difficulty, item.programArea].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="gnps-quiz-analysis-edbot">
        <div className="gnps-quiz-analysis-edbot-head">
          <EdBotFigure pose="getHelp" size="sm" knockOutBlack decorative className="gnps-quiz-analysis-edbot-fig" />
          <div>
            <p>
              <Sparkles className="inline h-3.5 w-3.5" aria-hidden /> EdBot coaching
            </p>
            <h4>How to score better next time</h4>
          </div>
        </div>
        <div ref={scrollRef} className="gnps-quiz-analysis-edbot-thread">
          {messages.map((m, idx) => (
            <div
              key={`${m.role}-${idx}`}
              className={cn("gnps-quiz-analysis-bubble", m.role === "user" ? "is-user" : "is-bot")}
            >
              {m.role === "model" ? <CoachRichText content={m.content} /> : m.content}
            </div>
          ))}
          {loading && (
            <div className="gnps-quiz-analysis-bubble is-bot is-loading">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Thinking…
            </div>
          )}
        </div>
        <div className="gnps-quiz-analysis-edbot-compose">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                sendFollowUp()
              }
            }}
            placeholder="Ask EdBot how to improve…"
            disabled={loading}
          />
          <button type="button" onClick={sendFollowUp} disabled={loading || !input.trim()} aria-label="Send">
            <Send className="h-4 w-4" />
          </button>
        </div>
      </section>
        </>
      )}
    </div>
  )
}
