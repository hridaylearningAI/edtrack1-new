"use client"

import { useEffect, useState } from "react"
import type React from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { motion } from "framer-motion"
import {
  IconDashboard,
  IconCalendar,
  IconBrain,
  IconBook,
  IconShieldCheck,
} from "@tabler/icons-react"
import { Loader2 } from "lucide-react"

import {
  Sidebar,
  SidebarBody,
  SidebarLink,
  SidebarToggleButton,
  isNavActive,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"
import { ThemeToggle } from "@/components/theme-toggle"
import { EdTecTopBar } from "@/components/edtec-top-bar"
import { SidebarUserButton } from "@/components/sidebar-user-button"
import { useUser } from "@/lib/hooks/useUser"

interface TrainerLayoutProps {
  children: React.ReactNode
}

export default function TrainerLayout({ children }: TrainerLayoutProps) {
  const pathname = usePathname()
  const { isAuthenticated, isLoading, getAccessToken } = useUser()

  const [trainerAccess, setTrainerAccess] = useState<"loading" | "allowed" | "denied">("loading")
  const [open, setOpen] = useState(true)

  const links = [
    {
      label: "Dashboard",
      href: "/trainer",
      icon: <IconDashboard className="h-4 w-4" />,
    },
    {
      label: "Schedule",
      href: "/trainer/schedule",
      icon: <IconCalendar className="h-4 w-4" />,
    },
    {
      label: "NCLEX Trainer",
      href: "/trainer/nclex",
      icon: <IconBrain className="h-4 w-4" />,
    },
    {
      label: "Mock Proctoring",
      href: "/trainer/nclex/proctoring",
      icon: <IconShieldCheck className="h-4 w-4" />,
    },
    {
      label: "NCLEX Course (Full)",
      href: "/trainer/nclex-course",
      icon: <IconBook className="h-4 w-4" />,
    },
  ]

  useEffect(() => {
    let cancelled = false
    if (isLoading) return
    if (!isAuthenticated) {
      setTrainerAccess("denied")
      return
    }

    ;(async () => {
      try {
        const token = await getAccessToken()
        if (!token) throw new Error("Auth token missing")

        const res = await fetch("/api/trainers/me", {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        })
        const json = await res.json().catch(() => ({}))
        const allowed = !!json?.data?.allowed
        if (!cancelled) setTrainerAccess(allowed ? "allowed" : "denied")
      } catch {
        if (!cancelled) setTrainerAccess("denied")
      }
    })()

    return () => {
      cancelled = true
    }
  }, [getAccessToken, isAuthenticated, isLoading])

  if (trainerAccess === "loading") {
    return (
      <div className="mx-auto flex min-h-screen w-full items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-neutral-500" />
          <p className="text-sm text-neutral-600 dark:text-neutral-300">Checking trainer access…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-full flex-1 flex-col overflow-hidden bg-neutral-50 md:flex-row dark:bg-neutral-950">
      <Sidebar open={open} setOpen={setOpen}>
        <SidebarBody className="justify-between gap-4">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className={cn("shrink-0 px-1", !open && "flex justify-center")}>
              {open ? <TrainerLogo /> : <TrainerLogoIcon />}
            </div>
            <div className="mt-5 flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto scrollbar-hide">
              {links.map((link) => {
                const active =
                  link.href === "/trainer/nclex"
                    ? pathname === "/trainer/nclex" ||
                      (pathname.startsWith("/trainer/nclex/") &&
                        !pathname.startsWith("/trainer/nclex/proctoring"))
                    : isNavActive(pathname, link.href)
                return <SidebarLink key={link.href} link={link} active={active} />
              })}
            </div>
          </div>
          <div className="shrink-0 space-y-1 border-t border-neutral-200 pt-3 dark:border-neutral-800">
            <div className={cn("flex w-full", open ? "justify-start" : "justify-center")}>
              <SidebarToggleButton />
            </div>
            <ThemeToggle open={open} />
            <SidebarUserButton />
          </div>
        </SidebarBody>
      </Sidebar>
      <div className="flex flex-1 overflow-hidden">
        <div className="flex h-full w-full flex-1 flex-col gap-3 overflow-hidden bg-white p-3 sm:p-5 md:p-8 dark:bg-neutral-900 md:rounded-tl-xl md:border-l md:border-neutral-200/80 dark:md:border-neutral-800">
          <EdTecTopBar portalLabel="Trainer" />
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
            className="flex-1 min-h-0 w-full overflow-y-auto scrollbar-hide"
          >
            {trainerAccess === "denied" ? (
              <div className="flex min-h-[60vh] items-center justify-center">
                <div className="w-full max-w-md rounded-xl border border-amber-200 bg-amber-50 p-6 text-center dark:border-amber-800 dark:bg-amber-950/30">
                  <p className="mb-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
                    Access denied
                  </p>
                  <p className="mb-5 text-sm text-slate-600 dark:text-slate-300">
                    You don&apos;t have access to the trainer portal. Contact your administrator if
                    you need access.
                  </p>
                  <Link
                    href="/student"
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100"
                  >
                    Go to dashboard
                  </Link>
                </div>
              </div>
            ) : (
              children
            )}
          </motion.div>
        </div>
      </div>
    </div>
  )
}

function TrainerLogo() {
  return (
    <Link href="/trainer" className="relative z-20 flex items-center gap-2.5 px-1 py-1">
      <Image
        src="/images/etia-logo.png"
        alt="EdTrack"
        width={28}
        height={28}
        className="shrink-0 rounded-md"
      />
      <div className="min-w-0 leading-tight">
        <div className="truncate text-sm font-semibold text-neutral-900 dark:text-white">
          EdTrack
        </div>
        <div className="truncate text-[11px] text-neutral-500 dark:text-neutral-400">
          Trainer workspace
        </div>
      </div>
    </Link>
  )
}

function TrainerLogoIcon() {
  return (
    <Link href="/trainer" className="relative z-20 flex items-center justify-center py-1">
      <Image
        src="/images/etia-logo.png"
        alt="EdTrack"
        width={28}
        height={28}
        className="shrink-0 rounded-md"
      />
    </Link>
  )
}
