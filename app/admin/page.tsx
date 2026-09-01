"use client"

import dynamic from "next/dynamic"
import { useMemo } from "react"
import { useRouter } from "next/navigation"
import {
  Users,
  BookOpen,
  CreditCard,
  TrendingUp,
  DollarSign,
  UserCheck,
  RefreshCw,
  AlertCircle,
  Loader2,
  Plus,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { useUser } from "@/lib/hooks/useUser"
import { useAnalytics } from "@/lib/hooks/useAnalytics"
import type { DashboardKpi } from "./dashboard-charts"

const DashboardBento = dynamic(() => import("./dashboard-charts"), {
  ssr: false,
  loading: () => (
    <div
      className="h-full w-full gap-2.5"
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
        gridTemplateRows: "repeat(5, minmax(0, 1fr))",
      }}
    >
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="animate-pulse rounded-2xl bg-neutral-100 dark:bg-neutral-800" />
      ))}
    </div>
  ),
})

export default function AdminDashboard() {
  const { user, isLoading } = useUser()
  const { data, loading, error, refreshData } = useAnalytics()
  const router = useRouter()
  const name = user?.name?.split(" ")[0] || "Admin"

  const kpis = useMemo((): DashboardKpi[] | null => {
    if (!data) return null
    return [
      {
        label: "Students",
        value: data.totalStudents.toLocaleString(),
        hint: "Registered learners",
        icon: Users,
      },
      {
        label: "Courses",
        value: String(data.activeCourses),
        hint: "Active catalog",
        icon: BookOpen,
      },
      {
        label: "Revenue",
        value: `$${(data.totalRevenue / 1000).toFixed(data.totalRevenue >= 1000 ? 0 : 1)}K`,
        hint: `${data.financialMetrics.monthlyGrowth >= 0 ? "+" : ""}${data.financialMetrics.monthlyGrowth}% MoM`,
        icon: DollarSign,
        tone: data.financialMetrics.monthlyGrowth >= 0 ? "good" : "bad",
      },
      {
        label: "Completion",
        value: `${data.courseCompletionRate}%`,
        hint: "Avg enrollment",
        icon: TrendingUp,
      },
      {
        label: "Pending",
        value: `$${(data.pendingPayments / 1000).toFixed(data.pendingPayments >= 1000 ? 0 : 1)}K`,
        hint: "Outstanding",
        icon: CreditCard,
        tone: data.pendingPayments > 0 ? "warn" : undefined,
      },
      {
        label: "New (30d)",
        value: String(data.newEnrollments),
        hint: "Enrollments",
        icon: UserCheck,
      },
    ]
  }, [data])

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-2 overflow-hidden">
      <div className="flex h-8 shrink-0 items-center justify-between gap-3">
        <h1 className="truncate text-base font-semibold tracking-tight text-neutral-900 dark:text-white">
          Overview
          <span className="ml-2 font-normal text-neutral-400">{isLoading ? "" : name}</span>
        </h1>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={refreshData}
            disabled={loading}
            className="h-8 w-8 p-0"
            aria-label="Refresh"
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
          </Button>
          <Button
            size="sm"
            onClick={() => router.push("/admin/enrolment")}
            className="h-8 gap-1.5 bg-brand-blue px-3 text-xs hover:bg-brand-blue/90"
          >
            <Plus className="h-3.5 w-3.5" />
            Enrol
          </Button>
        </div>
      </div>

      {error && !data ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-2xl border border-red-200 bg-red-50/50">
          <AlertCircle className="h-8 w-8 text-red-500" />
          <p className="text-sm font-medium text-red-600">{error}</p>
          <Button size="sm" variant="outline" onClick={refreshData}>
            Retry
          </Button>
        </div>
      ) : (
        <div className="min-h-0 min-w-0 flex-1 overflow-hidden">
          {data && kpis ? (
            <DashboardBento
              kpis={kpis}
              enrollmentTrends={data.enrollmentTrends}
              coursePerformance={data.coursePerformance}
              courseCompletionRate={data.courseCompletionRate}
              pendingPayments={data.pendingPayments}
              newEnrollments={data.newEnrollments}
              totalRevenue={data.totalRevenue}
              onNavigate={(href) => router.push(href)}
            />
          ) : (
            <div
              className="h-full w-full gap-2.5"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
                gridTemplateRows: "repeat(5, minmax(0, 1fr))",
              }}
            >
              {Array.from({ length: 10 }).map((_, i) => (
                <div
                  key={i}
                  className="animate-pulse rounded-2xl bg-neutral-100 dark:bg-neutral-800"
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
