"use client"

import { useEffect, useState } from "react"
import type React from "react"
import { usePathname, useRouter } from "next/navigation"
import { Building2, ClipboardList, ExternalLink, LayoutDashboard } from "lucide-react"
import {
  Sidebar,
  SidebarBody,
  SidebarBrand,
  SidebarLink,
  SidebarSectionLabel,
  SidebarToggleButton,
  isNavActive,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"
import { EdTecTopBar } from "@/components/edtec-top-bar"
import { SidebarUserButton } from "@/components/sidebar-user-button"
import { useUser } from "@/lib/hooks/useUser"

interface SuperAdminLayoutProps {
  children: React.ReactNode
}

const navItems = [
  { label: "Overview", href: "/super-admin", icon: LayoutDashboard },
  { label: "Tenants", href: "/super-admin/tenants", icon: Building2 },
  { label: "Audit log", href: "/super-admin/audit-logs", icon: ClipboardList },
]

export default function SuperAdminLayout({ children }: SuperAdminLayoutProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, isLoading: authLoading, isAuthenticated, getAccessToken } = useUser()
  const [access, setAccess] = useState<"unknown" | "allowed" | "denied">("unknown")
  const [open, setOpen] = useState(true)

  useEffect(() => {
    if (authLoading) return
    if (!isAuthenticated) {
      setAccess("denied")
      return
    }

    let cancelled = false
    ;(async () => {
      try {
        const token = await getAccessToken()
        const res = await fetch("/api/super-admin/me", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          cache: "no-store",
        })
        const json = await res.json()
        if (!cancelled) {
          setAccess(res.ok && json?.data?.allowed ? "allowed" : "denied")
        }
      } catch {
        if (!cancelled) setAccess("denied")
      }
    })()

    return () => {
      cancelled = true
    }
  }, [authLoading, isAuthenticated, getAccessToken])

  useEffect(() => {
    if (access !== "denied") return
    if (pathname.startsWith("/super-admin")) {
      router.replace(user?.role === "admin" || user?.role === "super_admin" ? "/admin" : "/student")
    }
  }, [access, pathname, router, user?.role])

  if (authLoading || access === "unknown") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas">
        <div className="text-sm text-muted-foreground">Loading platform console…</div>
      </div>
    )
  }

  if (access === "denied") return null

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-canvas md:flex-row">
      <Sidebar open={open} setOpen={setOpen}>
        <SidebarBody className="justify-between gap-4">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <SidebarBrand href="/super-admin" workspace="Platform console" />
            <nav className="mt-2 flex min-h-0 flex-1 flex-col overflow-y-auto scrollbar-hide">
              <SidebarSectionLabel>Platform</SidebarSectionLabel>
              <div className="flex flex-col gap-0.5">
                {navItems.map((item) => (
                  <SidebarLink
                    key={item.href}
                    link={{ label: item.label, href: item.href, icon: <item.icon className="h-4 w-4" /> }}
                    active={isNavActive(pathname, item.href)}
                  />
                ))}
              </div>
              <SidebarSectionLabel>Portals</SidebarSectionLabel>
              <SidebarLink
                link={{ label: "Tenant admin", href: "/admin", icon: <ExternalLink className="h-4 w-4" /> }}
              />
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
        <EdTecTopBar portalLabel="Platform Console" />
        <main className="mx-auto min-h-0 w-full max-w-[1480px] flex-1 overflow-y-auto scrollbar-hide px-4 py-5 sm:px-6 md:px-9 md:py-8">
          {children}
        </main>
      </div>
    </div>
  )
}
