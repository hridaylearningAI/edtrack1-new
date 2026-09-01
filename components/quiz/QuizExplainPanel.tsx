"use client"

import { useState, useEffect, useRef } from "react"
import { Bot, Send, Loader2, Lightbulb, X } from "lucide-react"
import type { QuizQuestion } from "@/lib/types/quiz"
import { edbotSrcFromLegacyPose } from "@/lib/edbot"
import { cn } from "@/lib/utils"

interface QuizExplainPanelProps {
  question: QuizQuestion
  userAnswerText: string
  correctAnswerText: string
  quizTitle?: string
  topicName?: string
  isOpen: boolean
  onClose?: () => void
  /** Optional max height for the panel (e.g. to match quiz card height) */
  maxHeight?: number | null
  className?: string
  /** When true, student already selected the correct option. */
  wasCorrect?: boolean
}

interface ChatMessage {
  role: "user" | "model"
  content: string
}

function buildLocalExplain(args: {
  wasCorrect: boolean
  rationale?: string
  userAnswerText: string
  correctAnswerText: string
}): string {
  if (args.rationale?.trim()) {
    return args.wasCorrect
      ? `You got this right. Here’s the rationale to lock it in:\n\n${args.rationale.trim()}`
      : `Here’s the rationale for the safest answer:\n\n${args.rationale.trim()}`
  }
  return args.wasCorrect
    ? `Nice work — your answer (“${args.userAnswerText}”) matches the correct option (“${args.correctAnswerText}”). Ask if you want a deeper clinical walkthrough.`
    : `The correct answer is “${args.correctAnswerText}”. You chose “${args.userAnswerText}”. Ask a follow-up if you want help comparing the options.`
}

export function QuizExplainPanel({
  question,
  userAnswerText,
  correctAnswerText,
  quizTitle,
  topicName,
  isOpen,
  onClose,
  maxHeight,
  className = "",
  wasCorrect = false,
}: QuizExplainPanelProps) {
  type EdBotPose =
    | "welcome"
    | "thinking"
    | "typing"
    | "listening"
    | "explaining"
    | "searching"
    | "success"
    | "error"
    | "pointing"
    | "celebration"

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [input, setInput] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)
  const [pose, setPose] = useState<EdBotPose>("welcome")
  const rationale = question.rationale?.trim() || ""

  useEffect(() => {
    if (!isOpen) return
    let cancelled = false
    setMessages([])
    setPose("thinking")
    setLoading(true)
    fetch("/api/quiz/explain", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question: question.question,
        userAnswerText,
        correctAnswerText,
        rationale,
        wasCorrect,
        messages: [],
        quizContext: { quizTitle, topicName },
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return
        if (data.success && data.text) {
          setPose(wasCorrect ? "success" : "explaining")
          setMessages([{ role: "model", content: data.text }])
        } else {
          setPose("explaining")
          setMessages([
            {
              role: "model",
              content:
                data.error ??
                buildLocalExplain({ wasCorrect, rationale, userAnswerText, correctAnswerText }),
            },
          ])
        }
      })
      .catch(() => {
        if (cancelled) return
        setPose("explaining")
        setMessages([
          {
            role: "model",
            content: buildLocalExplain({ wasCorrect, rationale, userAnswerText, correctAnswerText }),
          },
        ])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [
    isOpen,
    question.question,
    rationale,
    userAnswerText,
    correctAnswerText,
    quizTitle,
    topicName,
    wasCorrect,
  ])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
  }, [messages, loading])

  const handleSend = () => {
    const trimmed = input.trim()
    if (!trimmed || loading) return

    const newUserMsg: ChatMessage = { role: "user", content: trimmed }
    setMessages((prev) => [...prev, newUserMsg])
    setInput("")
    setLoading(true)
    setPose("typing")

    const history = [...messages, newUserMsg].map((m) => ({ role: m.role, content: m.content }))
    fetch("/api/quiz/explain", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question: question.question,
        userAnswerText,
        correctAnswerText,
        rationale,
        wasCorrect,
        messages: history,
        quizContext: { quizTitle, topicName },
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.text) {
          setPose("explaining")
          setMessages((prev) => [...prev, { role: "model", content: data.text }])
        } else {
          setPose("error")
          setMessages((prev) => [
            ...prev,
            { role: "model", content: data.error ?? "Could not get response." },
          ])
        }
      })
      .catch(() => {
        setPose("error")
        setMessages((prev) => [
          ...prev,
          { role: "model", content: "Failed to send. Please try again." },
        ])
      })
      .finally(() => setLoading(false))
  }

  const derivedPose: EdBotPose = (() => {
    if (!isOpen) return "welcome"
    if (loading) {
      if (pose === "error") return "error"
      return messages.length === 0 ? "thinking" : pose
    }
    if (messages.length === 0) return "welcome"
    const last = messages[messages.length - 1]
    if (last.role === "user") return "listening"
    if (pose === "error") return "error"
    return pose === "welcome" ? "explaining" : pose
  })()

  if (!isOpen) return null

  return (
    <div
      className={cn(
        "flex flex-col rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden",
        className
      )}
      style={maxHeight != null ? { maxHeight, minHeight: 200 } : undefined}
    >
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 shrink-0">
        <div className="flex items-center gap-2">
          <img
            src={edbotSrcFromLegacyPose(derivedPose)}
            alt={`EdBot pose: ${derivedPose}`}
            width={42}
            height={42}
            loading="lazy"
            className="w-10 h-10 object-contain rounded-lg bg-slate-950"
          />
          <Lightbulb className="h-5 w-5 text-brand-golden" />
          <span className="font-semibold text-slate-900 dark:text-white text-sm">EdBot explanation</span>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="px-4 pt-3 shrink-0">
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/90 dark:bg-slate-800/40 p-3 space-y-2.5">
          <div>
            <p className="text-[0.68rem] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Question
            </p>
            <p className="text-sm text-slate-800 dark:text-slate-100 leading-snug">{question.question}</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <p className="text-[0.68rem] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Your answer
              </p>
              <p
                className={cn(
                  "text-sm leading-snug",
                  wasCorrect ? "text-emerald-700 dark:text-emerald-300" : "text-amber-800 dark:text-amber-200"
                )}
              >
                {userAnswerText}
              </p>
            </div>
            <div>
              <p className="text-[0.68rem] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Correct answer
              </p>
              <p className="text-sm text-emerald-700 dark:text-emerald-300 leading-snug">{correctAnswerText}</p>
            </div>
          </div>
          {rationale ? (
            <div className="rounded-lg border border-brand-blue/20 bg-white dark:bg-slate-900/60 px-3 py-2">
              <p className="text-[0.68rem] font-bold uppercase tracking-wide text-brand-blue">Rationale</p>
              <p className="mt-1 text-sm text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                {rationale}
              </p>
            </div>
          ) : null}
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[120px]"
      >
        {loading && messages.length === 0 && (
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            Thinking...
          </div>
        )}
        {messages.map((msg, i) =>
          msg.role === "user" ? (
            <div key={i} className="flex justify-end">
              <div className="bg-brand-blue text-white rounded-2xl rounded-tr-sm px-4 py-2 max-w-[90%] text-sm">
                {msg.content}
              </div>
            </div>
          ) : (
            <div key={i} className="flex gap-2">
              <div className="w-8 h-8 rounded-full bg-brand-blue/10 flex items-center justify-center shrink-0">
                <Bot className="h-4 w-4 text-brand-blue" />
              </div>
              <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl rounded-tl-sm px-4 py-2 text-slate-700 dark:text-slate-200 text-sm whitespace-pre-wrap max-w-[90%]">
                {msg.content}
              </div>
            </div>
          )
        )}
        {loading && messages.length > 0 && (
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            Thinking...
          </div>
        )}
      </div>
      <div className="p-3 border-t border-slate-200 dark:border-slate-700 shrink-0">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleSend())}
            placeholder="Ask a follow-up..."
            disabled={loading}
            className="flex-1 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-blue/50"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="p-2 rounded-lg bg-brand-blue hover:bg-brand-blue/90 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
