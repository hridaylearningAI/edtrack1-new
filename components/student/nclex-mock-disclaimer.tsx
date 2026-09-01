"use client"

import { AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"

const DISCLAIMER_PARAGRAPHS = [
  "This is a practice/mock NCLEX test and is NOT the official NCLEX examination.",
  "This mock test is designed to help you familiarise yourself with the NCLEX-style testing environment, question format, time management, and exam conditions.",
  "Web camera, head-tracking, and browser focus monitoring are used during this practice test. The exam runs in fullscreen; leaving the tab, switching apps, exiting fullscreen, or capturing content (screenshots, copy, print) can stop the attempt.",
  "Your performance in this mock test does not represent an official NCLEX result, does not guarantee success in the actual NCLEX examination, and has no validity as an NCLEX examination score.",
  "The official NCLEX examination is administered separately by the relevant examination authorities and must be taken through the approved NCLEX testing process.",
  "By proceeding, you acknowledge that you are taking a practice assessment and agree to camera, head-tracking, and focus-lock monitoring for this mock test.",
] as const

export function NclexMockDisclaimer({
  onProceed,
  onCancel,
  className,
}: {
  onProceed: () => void
  onCancel?: () => void
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex flex-1 flex-col min-h-0 overflow-hidden bg-gradient-to-b from-slate-100 to-brand-golden/5 dark:from-slate-950 dark:to-brand-golden/10",
        className
      )}
      role="dialog"
      aria-modal="true"
      aria-labelledby="nclex-mock-disclaimer-title"
    >
      <div className="flex-1 overflow-y-auto overscroll-y-contain p-4 sm:p-8">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 rounded-2xl border border-amber-200/80 bg-white p-5 shadow-lg dark:border-amber-900/50 dark:bg-slate-900 sm:p-8">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
              <AlertTriangle className="h-5 w-5" aria-hidden />
            </span>
            <div className="min-w-0 space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
                Before you begin
              </p>
              <h2
                id="nclex-mock-disclaimer-title"
                className="text-xl font-bold text-slate-900 dark:text-white sm:text-2xl"
              >
                Important Disclaimer
              </h2>
            </div>
          </div>

          <div className="space-y-4 text-sm leading-relaxed text-slate-700 dark:text-slate-300 sm:text-[15px]">
            {DISCLAIMER_PARAGRAPHS.map((paragraph) => (
              <p key={paragraph.slice(0, 48)}>{paragraph}</p>
            ))}
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 dark:border-slate-700 sm:flex-row sm:justify-end">
            {onCancel ? (
              <button
                type="button"
                onClick={onCancel}
                className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
            ) : null}
            <button
              type="button"
              onClick={onProceed}
              className="rounded-xl bg-brand-blue px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-blue/90"
            >
              I understand — begin mock test
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
