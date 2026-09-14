"use client"

import type { CSSProperties, ReactNode } from "react"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts"
import {
  ArrowUpRight,
  AlertCircle,
  CheckCircle2,
  DollarSign,
  UserCheck,
  type LucideIcon,
} from "lucide-react"

import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import type { AnalyticsData } from "@/lib/types/analytics"
import { cn } from "@/lib/utils"

export type DashboardKpi = {
  label: string
  value: string
  hint: string
  icon: LucideIcon
  tone?: "good" | "bad" | "warn"
}

function Tip(props: Record<string, unknown>) {
  return (
    <div className="rounded-lg border border-border bg-white px-2.5 py-2 text-xs shadow-md">
      <ChartTooltipContent {...props} />
    </div>
  )
}

function CellBox({
  area,
  children,
  className,
}: {
  area: string
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-white p-3",
        className
      )}
      style={{ gridArea: area }}
    >
      {children}
    </div>
  )
}

function KpiTile({ kpi, area }: { kpi: DashboardKpi; area: string }) {
  const Icon = kpi.icon
  return (
    <CellBox area={area} className="justify-between">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {kpi.label}
        </p>
        <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      </div>
      <div>
        <p className="text-xl font-semibold tabular-nums tracking-tight text-foreground sm:text-2xl">
          {kpi.value}
        </p>
        <p
          className={cn(
            "mt-0.5 text-[11px] text-muted-foreground",
            kpi.tone === "good" && "text-success",
            kpi.tone === "bad" && "text-destructive",
            kpi.tone === "warn" && "text-warning"
          )}
        >
          {kpi.hint}
        </p>
      </div>
    </CellBox>
  )
}

type Props = {
  kpis: DashboardKpi[]
  enrollmentTrends: AnalyticsData["enrollmentTrends"]
  coursePerformance: AnalyticsData["coursePerformance"]
  courseCompletionRate: number
  pendingPayments: number
  newEnrollments: number
  totalRevenue: number
  onNavigate: (href: string) => void
}

const bentoStyle: CSSProperties = {
  display: "grid",
  height: "100%",
  width: "100%",
  gap: "0.625rem",
  gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
  gridTemplateRows: "repeat(5, minmax(0, 1fr))",
  gridTemplateAreas: `
    "k1 k2 k3 k4 k5 k6"
    "trend trend trend trend completion completion"
    "trend trend trend trend completion completion"
    "progress progress progress revenue signals signals"
    "progress progress progress revenue signals signals"
  `,
}

export default function DashboardBento({
  kpis,
  enrollmentTrends,
  coursePerformance,
  courseCompletionRate,
  pendingPayments,
  newEnrollments,
  totalRevenue,
  onNavigate,
}: Props) {
  const topCourses = coursePerformance
    .filter((c) => (c.enrolled || 0) > 0)
    .slice(0, 5)
    .map((c) => ({
      name:
        c.courseName && c.courseName.length > 16
          ? `${c.courseName.slice(0, 16)}…`
          : c.courseName || "Course",
      completed: Math.max(0, c.completed || 0),
      inProgress: Math.max(0, (c.enrolled || 0) - (c.completed || 0)),
      rate: c.completionRate,
      enrolled: c.enrolled,
    }))

  const distribution = [
    { name: "Completed", value: courseCompletionRate || 0, color: "#2054a0" },
    {
      name: "Open",
      value: Math.max(0, 100 - (courseCompletionRate || 0)),
      color: "#eef3f9",
    },
  ]

  const revenueMax = Math.max(...enrollmentTrends.map((t) => t.revenue), 1)

  const signals: Array<{
    icon: LucideIcon
    title: string
    body: string
    href: string
    warn?: boolean
  }> = [
    ...(newEnrollments > 0
      ? [
          {
            icon: UserCheck,
            title: "New enrollments",
            body: `${newEnrollments} in last 30 days`,
            href: "/admin/enrollment-overview",
          },
        ]
      : []),
    ...(totalRevenue > 0
      ? [
          {
            icon: DollarSign,
            title: "Revenue booked",
            body: `$${totalRevenue.toLocaleString()} total`,
            href: "/admin/invoices",
          },
        ]
      : []),
    ...(courseCompletionRate > 0
      ? [
          {
            icon: CheckCircle2,
            title: "Completion rate",
            body: `${courseCompletionRate}% across enrollments`,
            href: "/admin/progress",
          },
        ]
      : []),
    ...(pendingPayments > 0
      ? [
          {
            icon: AlertCircle,
            title: "Payments pending",
            body: `$${pendingPayments.toLocaleString()} outstanding`,
            href: "/admin/partial-payments",
            warn: true,
          },
        ]
      : []),
  ]

  const shortcuts = [
    { label: "Students", href: "/admin/students" },
    { label: "Courses", href: "/admin/courses" },
    { label: "Enrol", href: "/admin/enrolment" },
    { label: "Invoices", href: "/admin/invoices" },
    { label: "Reports", href: "/admin/reports" },
    { label: "Schedule", href: "/admin/schedule" },
  ]

  const kpiAreas = ["k1", "k2", "k3", "k4", "k5", "k6"] as const

  return (
    <div style={bentoStyle}>
      {kpis.map((kpi, i) => (
        <KpiTile key={kpi.label} kpi={kpi} area={kpiAreas[i]!} />
      ))}

      <CellBox area="trend">
        <div className="mb-1 flex shrink-0 items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              Enrollment trend
            </h2>
            <p className="text-[11px] text-muted-foreground">Last 6 months</p>
          </div>
        </div>
        <div className="min-h-0 flex-1">
          <ChartContainer
            config={{ students: { label: "Students", color: "#2054a0" } }}
            className="!aspect-auto h-full w-full"
          >
            <AreaChart data={enrollmentTrends} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="bentoStudents" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2054a0" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#2054a0" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                className="stroke-border"
              />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 10, fill: "#5a6d88" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#5a6d88" }}
                axisLine={false}
                tickLine={false}
                width={28}
              />
              <ChartTooltip content={<Tip />} />
              <Area
                type="monotone"
                dataKey="students"
                stroke="#2054a0"
                strokeWidth={2}
                fill="url(#bentoStudents)"
              />
            </AreaChart>
          </ChartContainer>
        </div>
      </CellBox>

      <CellBox area="completion">
        <div className="mb-1 flex shrink-0 items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Completion</h2>
          <span className="text-lg font-semibold tabular-nums text-brand-blue">
            {courseCompletionRate}%
          </span>
        </div>
        <div className="grid min-h-0 flex-1 grid-cols-2 items-center gap-2">
          <div className="relative mx-auto h-[120px] w-[120px]">
            <ChartContainer
              config={{
                completed: { label: "Completed", color: "#2054a0" },
                open: { label: "Open", color: "#eef3f9" },
              }}
              className="!aspect-auto h-[120px] w-[120px]"
            >
              <PieChart>
                <Pie
                  data={distribution}
                  dataKey="value"
                  innerRadius={36}
                  outerRadius={52}
                  startAngle={90}
                  endAngle={-270}
                  strokeWidth={0}
                >
                  {distribution.map((d) => (
                    <Cell key={d.name} fill={d.color} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
          </div>
          <div className="space-y-1.5 overflow-hidden">
            {topCourses.slice(0, 4).map((c) => (
              <div key={c.name} className="flex items-center justify-between gap-1">
                <span className="truncate text-[11px] text-muted-foreground">
                  {c.name}
                </span>
                <span className="shrink-0 text-[11px] font-semibold tabular-nums text-foreground">
                  {c.rate}%
                </span>
              </div>
            ))}
            {topCourses.length === 0 && (
              <p className="text-[11px] text-muted-foreground">No courses yet</p>
            )}
          </div>
        </div>
      </CellBox>

      <CellBox area="progress">
        <div className="mb-1 shrink-0">
          <h2 className="text-sm font-semibold text-foreground">
            Progress by course
          </h2>
          <p className="text-[11px] text-muted-foreground">Completed vs in progress</p>
        </div>
        <div className="min-h-0 flex-1">
          {topCourses.length > 0 ? (
            <ChartContainer
              config={{
                completed: { label: "Completed", color: "#2054a0" },
                inProgress: { label: "In Progress", color: "#c9d8ee" },
              }}
              className="!aspect-auto h-full w-full"
            >
              <BarChart data={topCourses} margin={{ top: 2, right: 4, left: -16, bottom: 0 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  className="stroke-border"
                />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 9, fill: "#5a6d88" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "#5a6d88" }}
                  axisLine={false}
                  tickLine={false}
                  width={26}
                  allowDecimals={false}
                />
                <ChartTooltip content={<Tip />} />
                <Bar dataKey="completed" stackId="a" fill="#2054a0" />
                <Bar dataKey="inProgress" stackId="a" fill="#c9d8ee" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ChartContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
              No progress data
            </div>
          )}
        </div>
      </CellBox>

      <CellBox area="revenue">
        <div className="mb-1 shrink-0">
          <h2 className="text-sm font-semibold text-foreground">Revenue</h2>
          <p className="text-[11px] text-muted-foreground">Monthly completed</p>
        </div>
        <div className="flex min-h-0 flex-1 items-end gap-1.5 pb-1">
          {enrollmentTrends.map((t) => {
            const h = Math.max(8, Math.round((t.revenue / revenueMax) * 100))
            return (
              <div key={t.period} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                <div
                  className="w-full rounded-md bg-gradient-to-t from-brand-blue to-brand-blue/40"
                  style={{ height: `${h}%` }}
                  title={`${t.month}: $${t.revenue.toLocaleString()}`}
                />
                <span className="text-[9px] font-medium uppercase text-muted-foreground">{t.month}</span>
              </div>
            )
          })}
        </div>
      </CellBox>

      <CellBox area="signals">
        <div className="mb-1 shrink-0">
          <h2 className="text-sm font-semibold text-foreground">Signals</h2>
        </div>
        <div className="min-h-0 flex-1 space-y-1 overflow-hidden">
          {signals.length > 0 ? (
            signals.slice(0, 3).map((item) => (
              <button
                key={item.title}
                type="button"
                onClick={() => onNavigate(item.href)}
                className="group flex w-full items-center gap-2 rounded-xl px-1.5 py-1.5 text-left hover:bg-muted"
              >
                <div
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground",
                    item.warn && "bg-warning-soft text-warning"
                  )}
                >
                  <item.icon className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-medium text-foreground">
                    {item.title}
                  </p>
                  <p className="truncate text-[10px] text-muted-foreground">{item.body}</p>
                </div>
                <ArrowUpRight className="h-3 w-3 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100" />
              </button>
            ))
          ) : (
            <p className="py-3 text-center text-[11px] text-muted-foreground">No signals yet</p>
          )}
        </div>
        <div className="mt-1 flex shrink-0 flex-wrap gap-1 border-t border-border pt-2">
          {shortcuts.map((s) => (
            <button
              key={s.href}
              type="button"
              onClick={() => onNavigate(s.href)}
              className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground hover:bg-brand-blue/10 hover:text-brand-blue"
            >
              {s.label}
            </button>
          ))}
        </div>
      </CellBox>
    </div>
  )
}
