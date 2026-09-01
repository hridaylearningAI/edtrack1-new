"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import PartnerLayout from "@/components/partner/partner-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BookOpen, Loader2, Percent, Users, UserRoundCog } from "lucide-react"
import { useUser } from "@/lib/hooks/useUser"

function formatMoney(currency: string, amount: number) {
  const code = (currency || "AUD").toUpperCase()
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: code }).format(amount)
  } catch {
    return `${code} ${amount.toFixed(2)}`
  }
}

const getGreeting = () => {
  const hour = new Date().getHours()
  if (hour < 12) return "Good morning"
  if (hour < 17) return "Good afternoon"
  return "Good evening"
}

export default function PartnerDashboardPage() {
  const { user, isAuthenticated, isLoading, getAccessToken } = useUser()
  const [commissionLoading, setCommissionLoading] = useState(true)
  const [commissionByCurrency, setCommissionByCurrency] = useState<Record<string, number>>({})
  const [commissionRate, setCommissionRate] = useState(0.1)

  useEffect(() => {
    if (isLoading || !isAuthenticated) return
    let cancelled = false
    ;(async () => {
      try {
        setCommissionLoading(true)
        const token = await getAccessToken()
        if (!token) return
        const res = await fetch("/api/partners/me/commissions", {
          headers: { Authorization: `Bearer ${token}` },
        })
        const json = await res.json().catch(() => ({}))
        if (!cancelled && json?.success && json?.data?.totalCommissionByCurrency) {
          setCommissionByCurrency(json.data.totalCommissionByCurrency as Record<string, number>)
          if (typeof json.data.commissionRate === "number") setCommissionRate(json.data.commissionRate)
        }
      } catch {
        if (!cancelled) setCommissionByCurrency({})
      } finally {
        if (!cancelled) setCommissionLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [isLoading, isAuthenticated, getAccessToken])

  if (isLoading || !isAuthenticated || !user) {
    return (
      <PartnerLayout>
        <div className="flex h-64 w-full items-center justify-center">
          <div className="text-center">
            <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-primary" />
            <h2 className="mb-2 text-xl font-semibold text-gray-900 dark:text-gray-100">Loading…</h2>
            <p className="text-gray-600 dark:text-gray-400">Opening your partner dashboard</p>
          </div>
        </div>
      </PartnerLayout>
    )
  }

  const first = user.name?.split(" ")[0] ?? "Partner"

  return (
    <PartnerLayout>
      <div className="space-y-6">
        <div className="relative overflow-hidden rounded-xl border-2 border-brand-blue/20 bg-gradient-to-br from-brand-blue/10 via-brand-red/5 to-brand-golden/10 p-6 shadow-lg shadow-brand-blue/5 dark:border-brand-blue/30 dark:from-brand-blue/20 dark:via-brand-red/10 dark:to-brand-golden/15">
          <div className="relative z-10">
            <p className="mb-1 text-sm font-medium text-brand-blue dark:text-brand-blue-light">
              {getGreeting()}, {first}
            </p>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Edtec Partner</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-300">
              Track enrollments attributed to your partner code and view commissions on qualifying purchases.
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card className="border-brand-blue/15 transition-shadow hover:shadow-md">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-brand-blue dark:text-brand-blue-light" />
                <CardTitle className="text-lg">Total enrollments done</CardTitle>
              </div>
              <CardDescription>Enrollments recorded when students used your partner code at checkout.</CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                href="/partner/enrollments"
                className="text-sm font-medium text-brand-blue hover:underline dark:text-brand-blue-light"
              >
                View enrollments →
              </Link>
            </CardContent>
          </Card>

          <Card className="border-brand-blue/15 transition-shadow hover:shadow-md">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Percent className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                <CardTitle className="text-lg">Commissions</CardTitle>
              </div>
              <CardDescription>
                {(commissionRate * 100).toFixed(0)}% of the final amount paid on attributed purchases.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {commissionLoading ? (
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading…
                </div>
              ) : Object.keys(commissionByCurrency).length === 0 ? (
                <p className="text-sm text-slate-600 dark:text-slate-400">No commission yet — attributed purchases will appear here.</p>
              ) : (
                <div className="space-y-1">
                  {Object.entries(commissionByCurrency).map(([cur, amt]) => (
                    <p key={cur} className="text-lg font-semibold text-slate-900 dark:text-white">
                      {formatMoney(cur, amt)}
                    </p>
                  ))}
                </div>
              )}
              <Link
                href="/partner/enrollments"
                className="inline-block text-sm font-medium text-brand-blue hover:underline dark:text-brand-blue-light"
              >
                View breakdown →
              </Link>
            </CardContent>
          </Card>

          <Card className="border-brand-blue/15 transition-shadow hover:shadow-md">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-brand-golden dark:text-brand-golden-light" />
                <CardTitle className="text-lg">How this portal fits in</CardTitle>
              </div>
              <CardDescription>
                Partners use this area alongside the main site and student portal. Course purchase and enrolment still flow
                through EdTec; your role is to guide and clarify so students choose the right course with confidence.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-brand-blue/15 transition-shadow hover:shadow-md">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <UserRoundCog className="h-5 w-5 text-brand-blue dark:text-brand-blue-light" />
                <CardTitle className="text-lg">My partner profile</CardTitle>
              </div>
              <CardDescription>Add phone, address, and country code to auto-generate your partner code.</CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                href="/partner/profile"
                className="text-sm font-medium text-brand-blue hover:underline dark:text-brand-blue-light"
              >
                Open profile →
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </PartnerLayout>
  )
}
