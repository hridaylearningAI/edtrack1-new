"use client"

import Image from "next/image"
import Link from "next/link"
import { UserButton, useUser } from "@clerk/nextjs"
import { IconChevronRight, IconExternalLink } from "@tabler/icons-react"
import { useStudentTopBarActions } from "@/lib/contexts/student-top-bar-actions"
import { isDemoPlatformUser } from "@/lib/demo-platform"
import { DemoCommandPalette } from "@/components/demo-command-palette"

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
  const label = showCustomBack ? backLabel : "Back to EdTec"
  const topBarActions = useStudentTopBarActions()
  const { user } = useUser()
  const isDemo = isDemoPlatformUser(user?.primaryEmailAddress?.emailAddress)
  const backClass =
    "flex min-h-10 items-center gap-2 rounded-md text-muted-foreground transition-colors hover:text-foreground"
  const backContent = (
    <>
      <Image src="/images/etia-logo.png" alt="" width={24} height={24} className="shrink-0 rounded-md" />
      <span className="hidden sm:inline">{label}</span>
    </>
  )

  return (
    <header className="sticky top-0 z-50 flex min-h-16 w-full shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-sidebar-border bg-white/85 px-4 py-2 backdrop-blur-lg sm:px-6 md:px-9">
      <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-2.5 text-xs">
        {showCustomBack && backHref.startsWith("/") ? (
          <Link href={backHref} className={backClass} aria-label={label} title={label}>
            {backContent}
          </Link>
        ) : (
          <a
            href={showCustomBack ? backHref : portfolioBaseUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={backClass}
            aria-label={label}
            title={label}
          >
            {backContent}
          </a>
        )}
        <IconChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
        <span className="truncate font-semibold text-foreground">{portalLabel}</span>
      </nav>
      <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
        {topBarActions?.actions}
        {isDemo && <DemoCommandPalette />}
        {isDemo && (
          <span
            className="inline-flex min-h-7 items-center gap-1.5 rounded-full border border-primary-line bg-primary-soft px-2.5 text-[11px] font-semibold text-primary"
            title="You're viewing sample data. Changes aren't saved."
          >
            <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden />
            Sample data
          </span>
        )}
        {showUserButton && (
          <UserButton
            afterSignOutUrl="/"
            appearance={{ elements: { avatarBox: "h-8 w-8" } }}
          />
        )}
        {onLogout && !showUserButton && (
          <button
            type="button"
            onClick={onLogout}
            className="inline-flex min-h-9 items-center rounded-lg px-3 text-xs font-semibold text-destructive transition-colors hover:bg-destructive/10"
          >
            Logout
          </button>
        )}
        <Link
          href={portfolioCoursesUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Browse Courses"
          title="Browse Courses"
          className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-border bg-[#f8fafd] px-3 text-xs font-semibold text-primary transition-colors hover:border-[#cddbee] hover:bg-[#eff5ff]"
        >
          <span className="hidden sm:inline">Browse courses</span>
          <IconExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden />
        </Link>
      </div>
    </header>
  )
}
