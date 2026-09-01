"use client"

import React, { useState, useEffect, useRef, useCallback } from "react"
import { useUser } from "@/lib/hooks/useUser"
import {
  ArrowLeft,
  ChevronRight,
  Loader2,
  FileText,
  BookOpen,
  MessageSquareQuote,
  Lightbulb,
  ChevronDown,
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { COURSE_VIEW_HEADER_CLASS, COURSE_VIEW_HEADER_GRADIENT } from "@/lib/course-view-header"

/** Parse markdown into sections by ## headings. */
function parseSections(markdown: string): { intro: string; sections: { title: string; body: string }[] } {
  const trimmed = markdown.trim()
  const parts = trimmed.split(/\n## /)
  const intro = parts[0]?.trim() ?? ""
  const sections: { title: string; body: string }[] = []
  for (let i = 1; i < parts.length; i++) {
    const block = parts[i]!.trim()
    const firstNewline = block.indexOf("\n")
    const title = firstNewline >= 0 ? block.slice(0, firstNewline).trim() : block
    const body = firstNewline >= 0 ? block.slice(firstNewline).trim() : ""
    sections.push({ title, body })
  }
  return { intro, sections }
}

/** Section type from title. */
function getSectionType(title: string): "story" | "reflection" | "questions" | "default" {
  const t = title.toLowerCase()
  if (t.includes("story") || t.includes("real life")) return "story"
  if (t.includes("reflection") || t.includes("closing")) return "reflection"
  if (t.includes("question") || t.includes("thinking")) return "questions"
  return "default"
}

/** Split intro into title (first # line) and short intro (2-3 lines after). */
function getOpening(intro: string): { title: string; introLines: string[] } {
  const lines = intro.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  let title = ""
  const introLines: string[] = []
  for (const line of lines) {
    if (line.startsWith("# ")) {
      title = line.replace(/^#\s*/, "").trim()
      continue
    }
    introLines.push(line)
    if (introLines.length >= 3) break
  }
  return { title, introLines }
}

/** Split story body into 3 chunks (by paragraphs). */
function splitStoryIntoPanels(body: string): [string, string, string] {
  const paragraphs = body.split(/\n\n+/).map((p) => p.trim()).filter(Boolean)
  const n = paragraphs.length
  if (n <= 3) {
    return [
      paragraphs[0] ?? "",
      paragraphs[1] ?? "",
      paragraphs[2] ?? "",
    ]
  }
  const perPanel = Math.ceil(n / 3)
  const p1 = paragraphs.slice(0, perPanel).join("\n\n")
  const p2 = paragraphs.slice(perPanel, perPanel * 2).join("\n\n")
  const p3 = paragraphs.slice(perPanel * 2).join("\n\n")
  return [p1, p2, p3]
}

/** Extract question lines from questions section (lines starting with - or *). */
function extractQuestions(body: string): string[] {
  const lines = body.split(/\r?\n/).map((l) => l.trim())
  const questions: string[] = []
  for (const line of lines) {
    if (line.startsWith("- ") || line.startsWith("* ")) {
      questions.push(line.slice(2).trim())
    }
  }
  return questions.length > 0 ? questions : [body]
}

/** Simple paragraph renderer (no ## in content). */
function Paragraphs({ content }: { content: string }) {
  const paragraphs = content.split(/\n\n+/).map((p) => p.trim()).filter(Boolean)
  return (
    <div className="space-y-3">
      {paragraphs.map((p, i) => (
        <p key={i} className="text-slate-700 dark:text-slate-300 leading-relaxed">
          {p}
        </p>
      ))}
    </div>
  )
}

export function CaseStudyView({
  courseId,
  courseDisplayName,
  currentPageId,
  progressionOrder,
  prevUnlockedPageId,
  nextUnlockedPageId,
  onNavigateToActivity,
  onMarkComplete,
  isCompleted,
}: {
  courseId: number
  courseDisplayName: string
  currentPageId: string
  progressionOrder: string[]
  prevUnlockedPageId: string | null
  nextUnlockedPageId: string | null
  onNavigateToActivity: (pageId: string) => void
  onMarkComplete?: () => void
  isCompleted?: boolean
}) {
  const [markdown, setMarkdown] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedPanel, setExpandedPanel] = useState(1)
  const [phase, setPhase] = useState<"story" | "reflection">("story")
  const [response, setResponse] = useState("")
  const { getAccessToken } = useUser()

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    const doFetch = async () => {
      const token = await getAccessToken()
      const headers: Record<string, string> = {}
      if (token) headers["Authorization"] = `Bearer ${token}`
      return fetch(`/api/case-study?courseId=${courseId}`, {
        headers: Object.keys(headers).length ? headers : undefined,
      })
    }
    doFetch()
      .then((res) => {
        if (cancelled) return
        if (!res.ok) {
          if (res.status === 404) return { success: false, data: null }
          throw new Error("Failed to load")
        }
        return res.json()
      })
      .then((json) => {
        if (cancelled) return
        if (json?.success && json?.data?.markdown != null) {
          setMarkdown(json.data.markdown)
        } else {
          setMarkdown(null)
        }
      })
      .catch(() => {
        if (!cancelled) setError("Could not load case study")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [courseId, getAccessToken])

  useEffect(() => {
    if (!loading && onMarkComplete && !isCompleted) {
      onMarkComplete()
    }
  }, [loading, onMarkComplete, isCompleted])

  const order = progressionOrder ?? []
  const currentIdx = order.indexOf(currentPageId)
  const prevActivityPageId = prevUnlockedPageId ?? (currentIdx > 0 ? order[currentIdx - 1] : null)
  const nextActivityPageId = nextUnlockedPageId ?? (currentIdx >= 0 && currentIdx < order.length - 1 ? order[currentIdx + 1] : null)
  const canGoPrev = !!prevActivityPageId && !!onNavigateToActivity
  const canGoNext = !!nextActivityPageId && !!onNavigateToActivity

  const scrollRef = useRef<HTMLDivElement>(null)
  const [readProgress, setReadProgress] = useState(0)
  const onScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const { scrollTop, scrollHeight, clientHeight } = el
    const max = scrollHeight - clientHeight
    setReadProgress(max <= 0 ? 100 : Math.round((scrollTop / max) * 100))
  }, [])

  const parsed = markdown ? parseSections(markdown) : null
  const storySection = parsed?.sections.find((s) => getSectionType(s.title) === "story")
  const reflectionSection = parsed?.sections.find((s) => getSectionType(s.title) === "reflection")
  const questionsSection = parsed?.sections.find((s) => getSectionType(s.title) === "questions")

  const opening = parsed?.intro ? getOpening(parsed.intro) : null
  const storyPanelsRaw = storySection?.body ? splitStoryIntoPanels(storySection.body) : null
  const storyPanels = storyPanelsRaw?.some((t) => t.length > 0) ? storyPanelsRaw : null

  useEffect(() => {
    if (!loading && parsed && !storyPanels) {
      setPhase("reflection")
    }
  }, [loading, parsed, storyPanels])
  const reflectionText = reflectionSection?.body?.trim() ?? ""
  const questions = questionsSection ? extractQuestions(questionsSection.body) : []
  const firstQuestion = questions[0] ?? "What key takeaway will you apply?"

  const goToReflection = () => {
    setPhase("reflection")
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#f8f9fb] dark:bg-slate-950">
      <header className={cn(COURSE_VIEW_HEADER_CLASS, "justify-between gap-3")}>
        <div className={COURSE_VIEW_HEADER_GRADIENT} />
        <div className="min-w-0 flex-1 flex flex-col justify-center gap-0.5 overflow-hidden">
          <nav className="flex min-w-0 items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="truncate font-medium text-slate-800 dark:text-slate-200">{courseDisplayName}</span>
          </nav>
          <h1 className="flex items-center gap-2 truncate text-lg font-bold text-slate-900 dark:text-white">
            <FileText className="h-5 w-5 shrink-0 text-brand-blue" aria-hidden />
            <span className="truncate">Case Study</span>
          </h1>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {loading && (
            <span className="flex items-center gap-1.5 text-xs text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              <span className="hidden sm:inline">Loading…</span>
            </span>
          )}
        </div>
      </header>
      {error && (
        <div className="shrink-0 border-b border-amber-200/80 bg-amber-50/90 px-6 py-2 text-xs text-amber-800 dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-200">
          {error}
        </div>
      )}

      {(onNavigateToActivity && progressionOrder.length > 0) && (
        <div className="flex items-center justify-between gap-4 px-4 py-3 bg-white dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <button
            type="button"
            title={canGoPrev ? "Previous activity" : undefined}
            onClick={() => canGoPrev && onNavigateToActivity(prevActivityPageId!)}
            disabled={!canGoPrev}
            className="p-2 text-slate-500 hover:text-brand-red dark:hover:text-brand-red-light hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="text-sm font-medium hidden sm:inline">Prev</span>
          </button>
          <span className="text-xs text-slate-400 dark:text-slate-500">Case Study</span>
          <button
            type="button"
            title={canGoNext ? "Next activity" : undefined}
            onClick={() => canGoNext && onNavigateToActivity(nextActivityPageId!)}
            disabled={!canGoNext}
            className="p-2 text-slate-500 hover:text-brand-blue hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="text-sm font-medium hidden sm:inline">Next</span>
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      )}

      {markdown && (
        <div className="h-0.5 bg-slate-200 dark:bg-slate-700 shrink-0">
          <motion.div
            className="h-full bg-gradient-to-r from-brand-blue via-brand-red to-brand-golden"
            initial={{ width: 0 }}
            animate={{ width: `${readProgress}%` }}
            transition={{ type: "tween", duration: 0.2 }}
            style={{ maxWidth: "100%" }}
          />
        </div>
      )}

      <div ref={scrollRef} onScroll={onScroll} className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto w-full px-4 md:px-6 py-8 md:py-12 space-y-8">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-brand-blue" />
            </div>
          ) : parsed && opening ? (
            <>
              {/* 1. Opening Section – Title + Short Intro */}
              <motion.section
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="rounded-2xl bg-gradient-to-b from-white to-slate-50/90 dark:from-slate-900 dark:to-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-sm p-8 md:p-10 text-center"
              >
                <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-4">
                  {opening.title || "Case Study"}
                </h2>
                {opening.introLines.length > 0 && (
                  <div className="space-y-2 text-slate-600 dark:text-slate-400 text-base leading-relaxed max-w-xl mx-auto">
                    {opening.introLines.map((line, i) => (
                      <p key={i}>{line}</p>
                    ))}
                  </div>
                )}
              </motion.section>

              {/* 2. Three Story Panels – Sequential reveal */}
              <AnimatePresence mode="wait">
                {phase === "story" && storyPanels && (
                  <motion.section
                    key="story-panels"
                    exit={{ opacity: 0, transition: { duration: 0.35 } }}
                    className="space-y-4"
                  >
                    {[1, 2, 3].map((panelNum) => {
                      const isRevealed = expandedPanel >= panelNum
                      const isActive = expandedPanel === panelNum
                      const text = storyPanels[panelNum - 1]
                      if (!text) return null
                      return (
                        <motion.div
                          key={panelNum}
                          initial={false}
                          animate={{
                            opacity: isRevealed ? (isActive ? 1 : 0.65) : 0,
                            height: isRevealed ? "auto" : 0,
                            overflow: "hidden",
                          }}
                          transition={{ duration: 0.4, ease: "easeOut" }}
                          className={`rounded-xl border shadow-sm overflow-hidden ${
                            isActive
                              ? "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 ring-1 ring-slate-200/50 dark:ring-slate-700/50"
                              : "border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/50"
                          }`}
                        >
                          <div className="p-6 md:p-8 flex gap-4 md:gap-6">
                            <div className="shrink-0 w-10 h-10 rounded-xl bg-brand-blue/10 dark:bg-brand-blue/20 flex items-center justify-center text-brand-blue">
                              <BookOpen className="h-5 w-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <Paragraphs content={text} />
                            </div>
                          </div>
                        </motion.div>
                      )
                    })}

                    <div className="flex justify-end pt-2">
                      {expandedPanel < 3 ? (
                        <button
                          type="button"
                          onClick={() => setExpandedPanel((p) => Math.min(p + 1, 3))}
                          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-brand-blue text-white text-sm font-medium hover:bg-brand-blue/90 transition-colors"
                        >
                          Continue
                          <ChevronDown className="h-4 w-4 rotate-[-90deg]" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={goToReflection}
                          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-slate-800 dark:bg-slate-700 text-white text-sm font-medium hover:bg-slate-700 dark:hover:bg-slate-600 transition-colors"
                        >
                          Continue to reflection
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </motion.section>
                )}
              </AnimatePresence>

              {/* 4. Closing Reflection – after transition */}
              <AnimatePresence>
                {phase === "reflection" && (
                  <motion.section
                    key="reflection"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45 }}
                    className="rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm bg-gradient-to-br from-amber-50/50 to-slate-50/50 dark:from-amber-950/20 dark:to-slate-900"
                  >
                    <div className="p-6 md:p-8 pl-6 md:pl-8 border-l-4 border-amber-500/70 dark:border-amber-500/50">
                      <div className="flex items-center gap-3 mb-4">
                        <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
                          <MessageSquareQuote className="h-5 w-5" />
                        </span>
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                          Closing Reflection
                        </h3>
                      </div>
                      <div className="text-slate-700 dark:text-slate-300 leading-relaxed">
                        <Paragraphs content={reflectionText} />
                      </div>
                    </div>
                  </motion.section>
                )}
              </AnimatePresence>

              {/* 5. Question Section – reflect and respond */}
              {phase === "reflection" && (
                <motion.section
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.15 }}
                  className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm p-6 md:p-8"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-brand-golden/20 text-brand-golden dark:text-brand-golden">
                      <Lightbulb className="h-5 w-5" />
                    </span>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                      Now reflect and respond
                    </h3>
                  </div>
                  <p className="text-slate-700 dark:text-slate-300 mb-4">{firstQuestion}</p>
                  <textarea
                    placeholder="Your response (optional)"
                    value={response}
                    onChange={(e) => setResponse(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-brand-blue/50"
                  />
                </motion.section>
              )}
            </>
          ) : !loading ? (
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-8 text-center text-slate-500 dark:text-slate-400">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No case study for this course.</p>
              <p className="text-sm mt-1">
                Add a <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">case-study.md</code> file in the course content folder.
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
