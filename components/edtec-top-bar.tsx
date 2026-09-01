"use client"

import Image from "next/image"
import Link from "next/link"
import { UserButton } from "@clerk/nextjs"
import { IconExternalLink } from "@tabler/icons-react"
import { useStudentTopBarActions } from "@/lib/contexts/student-top-bar-actions"

const portfolioBaseUrl =
  process.env.NEXT_PUBLIC_PORTFOLIO_URL ||
  (process.env.NODE_ENV === "production" ? "https://edtec.online" : "http://localhost:5173")
const portfolioCoursesUrl = `${portfolioBaseUrl}/programs`

interface EdTecTopBarProps {
  portalLabel?: "MyEdtec" | "Admin Portal" | string
  /** @deprecated Prefer sidebar UserButton; kept for rare no-sidebar layouts */
  onLogout?: () => void
  /** Show Clerk profile when the sidebar is hidden (e.g. zero enrollments) */
  showUserButton?: boolean
  /** When set (e.g. on course trial), show this instead of "Back to EdTec" */
  backLabel?: string
  backHref?: string
}

export function EdTecTopBar({
  portalLabel = "MyEdtec",
  onLogout,
  showUserButton = false,
  backLabel,
  backHref,
}: EdTecTopBarProps) {
  const showCustomBack = backLabel != null && backHref != null
  const isInternalLink = backHref?.startsWith("/")
  const topBarActions = useStudentTopBarActions()

  return (
    <div className="flex flex-wrap items-center justify-between gap-y-2 w-full min-h-12 px-3 sm:px-4 py-1.5 sm:py-0 shrink-0 border-b border-brand-blue/10 dark:border-brand-blue/20 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-sm sticky top-0 z-50">
      <div className="flex items-center gap-2 sm:gap-4 min-w-0 shrink max-w-[min(100%,14rem)] sm:max-w-none">
        {showCustomBack ? (
          isInternalLink ? (
            <Link
              href={backHref}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
              title={backLabel}
            >
              <Image src="/images/etia-logo.png" alt="EdTec" width={28} height={28} className="shrink-0" />
              <span className="font-semibold text-sm text-foreground hidden sm:inline">{backLabel}</span>
            </Link>
          ) : (
            <a
              href={backHref}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
              title={backLabel}
            >
              <Image src="/images/etia-logo.png" alt="EdTec" width={28} height={28} className="shrink-0" />
              <span className="font-semibold text-sm text-foreground hidden sm:inline">{backLabel}</span>
            </a>
          )
        ) : (
        <a
          href={portfolioBaseUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          title="Back to EdTec"
        >
          <Image src="/images/etia-logo.png" alt="EdTec" width={28} height={28} className="shrink-0" />
          <span className="font-semibold text-sm text-foreground hidden sm:inline">Back to EdTec</span>
        </a>
        )}
        <span className="text-muted-foreground text-xs hidden sm:inline">|</span>
        <span className="text-xs sm:text-sm font-medium text-brand-blue dark:text-brand-blue-light truncate">{portalLabel}</span>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-1 sm:gap-2 shrink-0 min-w-0 flex-1 sm:flex-none basis-full sm:basis-auto">
        {topBarActions?.actions}
        {showUserButton && (
          <UserButton
            afterSignOutUrl="/sign-in"
            appearance={{ elements: { avatarBox: "h-8 w-8" } }}
          />
        )}
        {onLogout && !showUserButton && (
          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 rounded-lg transition-colors"
          >
            <span>Logout</span>
          </button>
        )}
        <Link
          href={portfolioCoursesUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Browse Courses"
          title="Browse Courses"
          className="flex items-center gap-1 px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium text-brand-blue dark:text-brand-blue-light hover:bg-brand-blue/10 dark:hover:bg-brand-blue/20 rounded-lg transition-colors"
        >
          <span className="hidden sm:inline">Browse Courses</span>
          <IconExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden />
        </Link>
      </div>
    </div>
  )
}
