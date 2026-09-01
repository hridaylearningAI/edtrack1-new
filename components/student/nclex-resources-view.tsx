"use client"

import React, { useState } from "react"
import Link from "next/link"
import {
  Clock,
  AlertTriangle,
  Lightbulb,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Brain,
} from "lucide-react"
import { NCLEX_STRATEGIES } from "@/data/nclex-resources"
import { motion, AnimatePresence } from "framer-motion"

interface NclexResourcesViewProps {
  courseId: number
  onOpenFreeDiagnostic?: () => void
}

export function NclexResourcesView({ courseId, onOpenFreeDiagnostic }: NclexResourcesViewProps) {
  const [expandedStrategyId, setExpandedStrategyId] = useState<string | null>(null)

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto">
          {/* Hero: headline + two primary actions */}
          <section className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-blue/10 text-brand-blue text-xs font-semibold uppercase tracking-wider mb-4">
              <Sparkles className="h-3.5 w-3.5" />
              NCLEX Prep Hub
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-2">
              Exam prep & clinical judgment
            </h1>
            <p className="text-slate-600 dark:text-slate-400 text-sm max-w-lg mx-auto mb-8">
              Use the 72-hour plan and trap list when you’re close to test day. Review test strategies below.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
              {onOpenFreeDiagnostic ? (
                <button
                  type="button"
                  onClick={onOpenFreeDiagnostic}
                  className="group relative flex items-center gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border-2 border-brand-blue/30 dark:border-brand-blue/50 shadow-lg hover:shadow-xl hover:border-brand-blue hover:-translate-y-0.5 transition-all overflow-hidden text-left"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-brand-blue/10 rounded-bl-full" />
                  <div className="relative flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-brand-blue/10 group-hover:scale-110 transition-transform">
                      <Brain className="h-7 w-7 text-brand-blue" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white group-hover:text-brand-blue">
                        Free 80-Q diagnostic
                      </h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        GNPS strengths · In course
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="relative h-5 w-5 text-slate-400 group-hover:text-brand-blue shrink-0 ml-auto" />
                </button>
              ) : null}
              <Link
                href={`/student/course/${courseId}/nclex-72-hours`}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative flex items-center gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border-2 border-amber-200 dark:border-amber-800 shadow-lg hover:shadow-xl hover:border-amber-400 dark:hover:border-amber-600 hover:-translate-y-0.5 transition-all overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-amber-200/30 dark:bg-amber-800/30 rounded-bl-full" />
                <div className="relative flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-amber-100 dark:bg-amber-900/40 group-hover:scale-110 transition-transform">
                    <Clock className="h-7 w-7 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-bold text-slate-900 dark:text-white group-hover:text-amber-800 dark:group-hover:text-amber-300">
                      72-hour strategy
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Day-by-day plan · Opens in new tab
                    </p>
                  </div>
                </div>
                <ExternalLink className="relative h-5 w-5 text-slate-400 group-hover:text-amber-600 shrink-0 ml-auto" />
              </Link>
              <Link
                href={`/student/course/${courseId}/nclex-traps`}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative flex items-center gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border-2 border-rose-200 dark:border-rose-800 shadow-lg hover:shadow-xl hover:border-rose-400 dark:hover:border-rose-600 hover:-translate-y-0.5 transition-all overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-rose-200/30 dark:bg-rose-800/30 rounded-bl-full" />
                <div className="relative flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-rose-100 dark:bg-rose-900/40 group-hover:scale-110 transition-transform">
                    <AlertTriangle className="h-7 w-7 text-rose-600 dark:text-rose-400" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-bold text-slate-900 dark:text-white group-hover:text-rose-800 dark:group-hover:text-rose-300">
                      20 common traps
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Pitfalls to avoid · Opens in new tab
                    </p>
                  </div>
                </div>
                <ExternalLink className="relative h-5 w-5 text-slate-400 group-hover:text-rose-600 shrink-0 ml-auto" />
              </Link>
              <Link
                href={`/student/course/${courseId}/nclex-ngn`}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative flex items-center gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border-2 border-indigo-200 dark:border-indigo-800 shadow-lg hover:shadow-xl hover:border-indigo-400 dark:hover:border-indigo-600 hover:-translate-y-0.5 transition-all overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-200/30 dark:bg-indigo-800/30 rounded-bl-full" />
                <div className="relative flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 group-hover:scale-110 transition-transform">
                    <Brain className="h-7 w-7 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-bold text-slate-900 dark:text-white group-hover:text-indigo-800 dark:group-hover:text-indigo-300">
                      NGN case studies
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Drag/drop + click mode · Opens in new tab
                    </p>
                  </div>
                </div>
                <ExternalLink className="relative h-5 w-5 text-slate-400 group-hover:text-indigo-600 shrink-0 ml-auto" />
              </Link>
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Lightbulb className="h-5 w-5 text-brand-blue" />
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Test strategies</h2>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 text-center mb-6">
              Click a strategy to expand. Use these as a mental checklist on test day.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[0, 1, 2].map((colIndex) => (
                <div key={colIndex} className="flex flex-col gap-3">
                  {NCLEX_STRATEGIES.filter((_, i) => i % 3 === colIndex).map((strategy) => {
                    const isExpanded = expandedStrategyId === strategy.id
                    return (
                      <motion.div
                        key={strategy.id}
                        layout
                        className={`rounded-xl border-2 overflow-hidden transition-colors ${
                          isExpanded
                            ? "border-brand-blue/40 dark:border-brand-blue/50 bg-white dark:bg-slate-900 shadow-lg"
                            : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-600"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedStrategyId(isExpanded ? null : strategy.id)
                          }
                          className="flex items-center gap-3 w-full p-4 text-left"
                        >
                          <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-brand-blue/15 text-brand-blue font-bold text-sm flex items-center justify-center">
                            {strategy.id.padStart(2, "0")}
                          </span>
                          <span className="font-semibold text-slate-900 dark:text-white text-sm flex-1 min-w-0">
                            {strategy.title}
                          </span>
                          <ChevronRight
                            className={`h-4 w-4 text-slate-400 shrink-0 transition-transform ${
                              isExpanded ? "rotate-90" : ""
                            }`}
                          />
                        </button>
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="px-4 pb-4 pt-0 border-t border-slate-100 dark:border-slate-800 space-y-3">
                                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed pt-3">
                                  {strategy.description}
                                </p>
                                {strategy.example && (
                                  <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-800 space-y-1.5">
                                    {strategy.example.question && (
                                      <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                                        {strategy.example.question}
                                      </p>
                                    )}
                                    {strategy.example.answer && (
                                      <p className="text-xs text-green-700 dark:text-green-400 font-medium">
                                        ✓ {strategy.example.answer}
                                      </p>
                                    )}
                                    {strategy.example.rationale && (
                                      <p className="text-xs text-slate-500 dark:text-slate-500">
                                        {strategy.example.rationale}
                                      </p>
                                    )}
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    )
                  })}
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
