"use client"

import type { ReactNode } from "react"
import { ArrowLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

export function EdtecActivityHeader({
  kicker,
  title,
  courseName,
  aside,
  onPrev,
  onNext,
  canPrev,
  canNext,
  className,
}: {
  kicker: string
  title: string
  courseName?: string
  aside?: ReactNode
  onPrev?: () => void
  onNext?: () => void
  canPrev?: boolean
  canNext?: boolean
  className?: string
}) {
  const showNav = !!(onPrev || onNext)
  return (
    <header className={cn("edtec-activity-header", className)}>
      <div className="edtec-activity-header-copy">
        <p className="edtec-activity-kicker">{kicker}</p>
        <h1 className="edtec-activity-title truncate">{title}</h1>
        {courseName ? <p className="edtec-activity-course truncate">{courseName}</p> : null}
      </div>
      <div className="edtec-activity-aside">
        {showNav ? (
          <>
            <button
              type="button"
              className="edtec-activity-nav-btn"
              onClick={onPrev}
              disabled={!canPrev}
              aria-label="Previous activity"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="edtec-activity-nav-btn"
              onClick={onNext}
              disabled={!canNext}
              aria-label="Next activity"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </>
        ) : null}
        {aside}
      </div>
    </header>
  )
}
