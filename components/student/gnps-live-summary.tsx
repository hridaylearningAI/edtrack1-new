"use client"

import { useEffect, useMemo, useState, type ReactNode } from "react"
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { useUser } from "@/lib/hooks/useUser"
import {
  buildEthtl115LevelPathway,
  ETHTL115_SECTIONS_PER_LEVEL,
  parseEthtl115PageId,
  type Ethtl115ActivityKind,
  type Ethtl115LevelNumber,
} from "@/lib/gnps/ethtl115"

const ACTIVITY_TOTAL = 3 * ETHTL115_SECTIONS_PER_LEVEL
const LEVELS: Ethtl115LevelNumber[] = [1, 2, 3]
const LEVEL_TOTALS = Object.fromEntries(
  LEVELS.map((level) => [level, buildEthtl115LevelPathway(level).length])
) as Record<Ethtl115LevelNumber, number>

const ACTIVITY_LABELS: Record<Ethtl115ActivityKind, string> = {
  notes: "Notes",
  video: "Video",
  flashcards: "Cards",
  quiz: "Quiz",
}

const PIE_COLORS = {
  done: "#2f6fed",
  left: "#dbe7fb",
}

type QuizAttempt = {
  quiz_identifier: string
  score_percent: number
  attempted_at: string
}

const SECTION_KEYS = ["s1", "s2", "s3", "s4"] as const

function emptyCounts(): Record<Ethtl115ActivityKind, number> {
  return { notes: 0, video: 0, flashcards: 0, quiz: 0 }
}

function emptyLevelCounts(): Record<Ethtl115LevelNumber, number> {
  return { 1: 0, 2: 0, 3: 0 }
}

function useGnpsLiveSummary(enrollmentId: number, courseId: number) {
  const { getAccessToken, isAuthenticated } = useUser()
  const [counts, setCounts] = useState(emptyCounts)
  const [levelCounts, setLevelCounts] = useState(emptyLevelCounts)
  const [attempts, setAttempts] = useState<QuizAttempt[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (!isAuthenticated) {
        setLoading(false)
        return
      }
      const token = await getAccessToken()
      if (!token || cancelled) {
        setLoading(false)
        return
      }

      try {
        const headers = { Authorization: `Bearer ${token}` }
        const [sectionsRes, quizRes] = await Promise.all([
          fetch(`/api/progress/trial/sections?enrollmentId=${enrollmentId}`, { headers }),
          fetch(`/api/progress/trial/quiz?enrollmentId=${enrollmentId}&courseId=${courseId}`, { headers }),
        ])

        const nextCounts = emptyCounts()
        const nextLevels = emptyLevelCounts()
        if (sectionsRes.ok) {
          const json = await sectionsRes.json()
          const ids = Array.isArray(json?.data?.completedSectionIds) ? json.data.completedSectionIds : []
          for (const id of ids) {
            if (typeof id !== "string") continue
            const parsed = parseEthtl115PageId(id)
            if (!parsed) continue
            nextLevels[parsed.level] += 1
            if (
              parsed.kind === "notes" ||
              parsed.kind === "video" ||
              parsed.kind === "flashcards" ||
              parsed.kind === "quiz"
            ) {
              nextCounts[parsed.kind] += 1
            }
          }
        }

        let nextAttempts: QuizAttempt[] = []
        if (quizRes.ok) {
          const json = await quizRes.json()
          const raw = Array.isArray(json?.data?.attempts) ? json.data.attempts : []
          nextAttempts = raw
            .filter(
              (row: QuizAttempt) =>
                typeof row?.quiz_identifier === "string" &&
                typeof row?.score_percent === "number" &&
                row.attempted_at
            )
            .sort(
              (a: QuizAttempt, b: QuizAttempt) =>
                new Date(a.attempted_at).getTime() - new Date(b.attempted_at).getTime()
            )
        }

        if (!cancelled) {
          setCounts(nextCounts)
          setLevelCounts(nextLevels)
          setAttempts(nextAttempts)
        }
      } catch {
        if (!cancelled) {
          setCounts(emptyCounts())
          setLevelCounts(emptyLevelCounts())
          setAttempts([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [courseId, enrollmentId, getAccessToken, isAuthenticated])

  return { counts, levelCounts, attempts, loading }
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{
    value?: number
    name?: string
    color?: string
    payload?: { name?: string; s1?: number; s2?: number; s3?: number; s4?: number; attempted?: number }
  }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  const row = payload[0]?.payload
  const title = label || row?.name || payload[0]?.name
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <p className="mb-1 font-semibold text-[#16325c] dark:text-slate-100">{title}</p>
      <div className="space-y-0.5">
        {payload.map((item) => (
          <p key={item.name} className="text-slate-500 dark:text-slate-400">
            <span className="font-medium" style={{ color: item.color }}>
              {item.name}
            </span>
            {": "}
            {typeof item.value === "number" ? `${Math.round(item.value)}%` : "—"}
          </p>
        ))}
        {row && typeof row.attempted === "number"
          ? SECTION_KEYS.map((key) => (
              <p key={key} className="text-slate-500 dark:text-slate-400">
                Section {key.slice(1)}: {row[key] ? `${row[key]}%` : "—"}
              </p>
            ))
          : null}
      </div>
    </div>
  )
}

function ChartFrame({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="min-w-0 overflow-hidden rounded-xl border border-slate-100 bg-slate-50/70 p-2.5 dark:border-slate-800 dark:bg-slate-800/40">
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">{title}</p>
      {children}
    </div>
  )
}

export function GnpsLiveSummary({
  enrollmentId,
  courseId,
}: {
  enrollmentId: number
  courseId: number
}) {
  const { counts, levelCounts, attempts, loading } = useGnpsLiveSummary(enrollmentId, courseId)

  const radarData = useMemo(
    () =>
      (Object.keys(ACTIVITY_LABELS) as Ethtl115ActivityKind[]).map((kind) => ({
        activity: ACTIVITY_LABELS[kind],
        complete: Math.min(100, Math.round((counts[kind] / ACTIVITY_TOTAL) * 100)),
        done: counts[kind],
      })),
    [counts]
  )

  const levelData = useMemo(
    () =>
      LEVELS.map((level) => {
        const total = LEVEL_TOTALS[level]
        const done = Math.min(total, levelCounts[level])
        return {
          level: `L${level}`,
          complete: total > 0 ? Math.round((done / total) * 100) : 0,
          done,
          total,
        }
      }),
    [levelCounts]
  )

  const overall = useMemo(() => {
    const done = LEVELS.reduce((sum, level) => sum + Math.min(LEVEL_TOTALS[level], levelCounts[level]), 0)
    const total = LEVELS.reduce((sum, level) => sum + LEVEL_TOTALS[level], 0)
    return {
      done,
      total,
      leftover: Math.max(0, total - done),
      percent: total > 0 ? Math.round((done / total) * 100) : 0,
    }
  }, [levelCounts])

  const pieData = useMemo(
    () => [
      { name: "Done", value: overall.done, fill: PIE_COLORS.done },
      { name: "Left", value: Math.max(overall.leftover, overall.done === 0 ? 1 : 0), fill: PIE_COLORS.left },
    ],
    [overall.done, overall.leftover]
  )

  const quizByLevel = useMemo(() => {
    const latestByQuiz = new Map<string, QuizAttempt>()
    for (const attempt of attempts) {
      latestByQuiz.set(attempt.quiz_identifier, attempt)
    }

    const rows = LEVELS.map((level) => {
      const sections: Record<(typeof SECTION_KEYS)[number], number | null> = {
        s1: null,
        s2: null,
        s3: null,
        s4: null,
      }
      const scores: number[] = []

      for (const attempt of latestByQuiz.values()) {
        const parsed = parseEthtl115PageId(attempt.quiz_identifier)
        if (!parsed || parsed.kind !== "quiz" || parsed.level !== level || parsed.section == null) continue
        const key = `s${parsed.section}` as (typeof SECTION_KEYS)[number]
        const score = Math.min(100, Math.max(0, Math.round(attempt.score_percent)))
        sections[key] = score
        scores.push(score)
      }

      return {
        level: `L${level}`,
        s1: sections.s1 ?? 0,
        s2: sections.s2 ?? 0,
        s3: sections.s3 ?? 0,
        s4: sections.s4 ?? 0,
        average: scores.length > 0 ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : 0,
        attempted: scores.length,
      }
    })

    const allLatest = [...latestByQuiz.values()].filter((attempt) => {
      const parsed = parseEthtl115PageId(attempt.quiz_identifier)
      return parsed?.kind === "quiz"
    })
    const averageScore =
      allLatest.length > 0
        ? Math.round(allLatest.reduce((sum, attempt) => sum + attempt.score_percent, 0) / allLatest.length)
        : null

    return { rows, averageScore, attemptedLevels: rows.filter((row) => row.attempted > 0).length }
  }, [attempts])

  if (loading) {
    return (
      <div className="grid min-w-0 grid-cols-2 gap-3 pt-1">
        <div className="h-40 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
        <div className="h-40 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
        <div className="h-36 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
        <div className="h-36 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
      </div>
    )
  }

  return (
    <div className="space-y-3 pt-1">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Live summary</p>
        <p className="text-[11px] font-medium tabular-nums text-[#2f6fed]">
          {quizByLevel.averageScore != null
            ? `Avg quiz ${quizByLevel.averageScore}% · ${quizByLevel.attemptedLevels} of 3 levels`
            : `${overall.percent}% of pathway complete`}
        </p>
      </div>

      <div className="grid min-w-0 grid-cols-2 gap-3">
        <ChartFrame title="Activity mix">
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} cx="50%" cy="52%" outerRadius="68%">
                <PolarGrid stroke="#cbd5e1" />
                <PolarAngleAxis dataKey="activity" tick={{ fill: "#64748b", fontSize: 10, fontWeight: 600 }} />
                <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                <Radar
                  name="Complete"
                  dataKey="complete"
                  stroke="#2f6fed"
                  fill="#2f6fed"
                  fillOpacity={0.28}
                  strokeWidth={2}
                />
                <Tooltip content={<ChartTooltip />} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </ChartFrame>

        <ChartFrame title="Overall pathway">
          <div className="relative h-40">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={42}
                  outerRadius={62}
                  paddingAngle={2}
                  stroke="none"
                >
                  {pieData.map((slice) => (
                    <Cell key={slice.name} fill={slice.fill} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-lg font-bold tabular-nums text-[#16325c] dark:text-slate-100">{overall.percent}%</p>
              <p className="text-[10px] text-slate-400">
                {overall.done}/{overall.total}
              </p>
            </div>
          </div>
        </ChartFrame>

        <ChartFrame title="Completion by level">
          <div className="h-36">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={levelData} margin={{ top: 8, right: 4, left: -22, bottom: 0 }}>
                <XAxis dataKey="level" tick={{ fill: "#64748b", fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fill: "#94a3b8", fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="complete" name="Complete" radius={[6, 6, 0, 0]} fill="#2f6fed" maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartFrame>

        <ChartFrame title="Quiz scores by level">
          <div className="h-36">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={quizByLevel.rows} margin={{ top: 8, right: 4, left: -22, bottom: 0 }}>
                <XAxis dataKey="level" tick={{ fill: "#64748b", fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fill: "#94a3b8", fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="average" name="Level avg" radius={[6, 6, 0, 0]} fill="#16325c" maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartFrame>
      </div>
    </div>
  )
}
