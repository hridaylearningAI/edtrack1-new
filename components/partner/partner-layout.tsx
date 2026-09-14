"use client"

import { useEffect, useState } from "react"
import type React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion } from "framer-motion"
import { IconDashboard, IconUsers, IconUserCircle } from "@tabler/icons-react"
import { Loader2 } from "lucide-react"

import {
  Sidebar,
  SidebarBody,
  SidebarBrand,
  SidebarLink,
  SidebarToggleButton,
  isNavActive,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"
import { EdTecTopBar } from "@/components/edtec-top-bar"
import { SidebarUserButton } from "@/components/sidebar-user-button"
import { useUser } from "@/lib/hooks/useUser"

interface PartnerLayoutProps {
  children: React.ReactNode
}

export default function PartnerLayout({ children }: PartnerLayoutProps) {
  const pathname = usePathname()
  const { isAuthenticated, isLoading, getAccessToken } = useUser()
  const [partnerAccess, setPartnerAccess] = useState<"loading" | "allowed" | "denied">("loading")
  const [open, setOpen] = useState(true)

  const links = [
    {
      label: "Dashboard",
      href: "/partner",
      icon: <IconDashboard className="h-4 w-4" />,
    },
    {
      label: "Enrollments",
      href: "/partner/enrollments",
      icon: <IconUsers className="h-4 w-4" />,
    },
    {
      label: "My profile",
      href: "/partner/profile",
      icon: <IconUserCircle className="h-4 w-4" />,
    },
  ]

  useEffect(() => {
    let cancelled = false
    if (isLoading) return
    if (!isAuthenticated) {
      setPartnerAccess("denied")
      return
    }

    ;(async () => {
      try {
        const token = await getAccessToken()
        if (!token) throw new Error("Auth token missing")
        const res = await fetch("/api/partners/me", {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        })
        const json = await res.json().catch(() => ({}))
        const allowed = !!json?.data?.allowed
        if (!cancelled) setPartnerAccess(allowed ? "allowed" : "denied")
      } catch {
        if (!cancelled) setPartnerAccess("denied")
      }
    })()

    return () => {
      cancelled = true
    }
  }, [getAccessToken, isAuthenticated, isLoading])

  if (partnerAccess === "loading") {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-canvas">
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Checking partner access…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-canvas md:flex-row">
      <Sidebar open={open} setOpen={setOpen}>
        <SidebarBody className="justify-between gap-4">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <SidebarBrand href="/partner" workspace="Partner workspace" />
            <nav className="mt-4 flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto scrollbar-hide">
              {links.map((link) => (
                <SidebarLink
                  key={link.href}
                  link={link}
                  active={isNavActive(pathname, link.href)}
                />
              ))}
            </nav>
          </div>
          <div className="shrink-0 space-y-1 border-t border-sidebar-border pt-3">
            <div className={cn("flex w-full", open ? "justify-start" : "justify-center")}>
              <SidebarToggleButton />
            </div>
            <SidebarUserButton />
          </div>
        </SidebarBody>
      </Sidebar>
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <EdTecTopBar portalLabel="Partner" />
        <motion.div
          key={pathname}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
          className="scrollbar-hide mx-auto flex min-h-0 w-full max-w-[1480px] flex-1 overflow-y-auto px-4 py-5 sm:px-6 md:px-9 md:py-8"
        >
          {partnerAccess === "denied" ? (
            <div className="flex min-h-[60vh] w-full items-center justify-center">
              <div className="w-full max-w-md rounded-[13px] border border-border bg-card p-6 text-center">
                <p className="mb-2 text-lg font-semibold text-foreground">Access denied</p>
                <p className="mb-5 text-sm text-muted-foreground">
                  You don&apos;t have access to the partner portal. Contact your administrator if
                  you need access.
                </p>
                <Link
                  href="/student"
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
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
  )
}
