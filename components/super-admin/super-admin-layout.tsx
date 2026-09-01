"use client"

import { useEffect, useState } from "react"
import type React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Building2, ClipboardList, LayoutDashboard, Shield } from "lucide-react"
import { cn } from "@/lib/utils"
import { ThemeToggle } from "@/components/theme-toggle"
import { EdTecTopBar } from "@/components/edtec-top-bar"
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
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <div className="text-sm text-muted-foreground">Loading platform console…</div>
      </div>
    )
  }

  if (access === "denied") return null

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <EdTecTopBar portalLabel="Platform Console" showUserButton />

      <div className="border-b border-border bg-card/50">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-3 md:px-6">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Super Admin</p>
            <h2 className="text-lg font-semibold">Platform console</h2>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin"
              className="hidden sm:inline-flex text-xs text-muted-foreground hover:text-foreground"
            >
              Tenant admin
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-7xl gap-6 px-4 py-6 md:px-6">
        <aside className="hidden w-56 shrink-0 md:block">
          <div className="rounded-xl border border-border bg-card p-3 shadow-sm">
            <div className="mb-4 flex items-center gap-2 px-2 py-1">
              <Shield className="h-4 w-4 text-brand-blue" />
              <span className="text-sm font-semibold">Platform</span>
            </div>
            <nav className="space-y-1">
              {navItems.map((item) => {
                const active =
                  item.href === "/super-admin"
                    ? pathname === "/super-admin"
                    : item.href === "/super-admin/tenants"
                      ? pathname.startsWith("/super-admin/tenants")
                      : pathname.startsWith(item.href)
                const Icon = item.icon
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                      active
                        ? "bg-brand-blue/10 text-brand-blue font-medium"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                )
              })}
            </nav>
          </div>
        </aside>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  )
}
