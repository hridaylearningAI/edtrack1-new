"use client"

import React, { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import StudentLayout from "@/components/student/student-layout"
import { ChevronLeft, ChevronRight, Clock, Calendar } from "lucide-react"

type DayTab = "day1" | "day2" | "day3" | "exam"

const TABS: { id: DayTab; label: string }[] = [
  { id: "day1", label: "Day 1" },
  { id: "day2", label: "Day 2" },
  { id: "day3", label: "Day 3" },
  { id: "exam", label: "Exam day" },
]

type TimeBlockId = "morning" | "midday" | "afternoon" | "evening" | "night"

const TIME_BLOCKS: { id: TimeBlockId; label: string; color: string; colorDark: string }[] = [
  { id: "morning", label: "Morning", color: "#f59e0b", colorDark: "#fbbf24" },
  { id: "midday", label: "Midday", color: "#eab308", colorDark: "#facc15" },
  { id: "afternoon", label: "Afternoon", color: "#22c55e", colorDark: "#4ade80" },
  { id: "evening", label: "Evening", color: "#3b82f6", colorDark: "#60a5fa" },
  { id: "night", label: "Night", color: "#8b5cf6", colorDark: "#a78bfa" },
]

/** SVG donut segment from angle a to b (degrees, 0 = top). */
function getDonutPath(cx: number, cy: number, R: number, r: number, aDeg: number, bDeg: number): string {
  const toRad = (d: number) => ((d - 90) * Math.PI) / 180
  const x = (radius: number, deg: number) => cx + radius * Math.cos(toRad(deg))
  const y = (radius: number, deg: number) => cy + radius * Math.sin(toRad(deg))
  const large = bDeg - aDeg > 180 ? 1 : 0
  return `M ${x(R, aDeg)} ${y(R, aDeg)} A ${R} ${R} 0 ${large} 1 ${x(R, bDeg)} ${y(R, bDeg)} L ${x(r, bDeg)} ${y(r, bDeg)} A ${r} ${r} 0 ${large} 0 ${x(r, aDeg)} ${y(r, aDeg)} Z`
}

/** Arc path from angle a to b (degrees, 0 = top) at given radius — for curved text. */
function getArcPath(cx: number, cy: number, radius: number, aDeg: number, bDeg: number): string {
  const toRad = (d: number) => ((d - 90) * Math.PI) / 180
  const x = (r: number, deg: number) => cx + r * Math.cos(toRad(deg))
  const y = (r: number, deg: number) => cy + r * Math.sin(toRad(deg))
  const large = bDeg - aDeg > 180 ? 1 : 0
  return `M ${x(radius, aDeg)} ${y(radius, aDeg)} A ${radius} ${radius} 0 ${large} 1 ${x(radius, bDeg)} ${y(radius, bDeg)}`
}

type DayBlock = { id: TimeBlockId; title: string; body: React.ReactNode }

function DayPieWithFlip({
  activeSegment,
  onSegmentClick,
  blocks,
}: {
  activeSegment: TimeBlockId | null
  onSegmentClick: (id: TimeBlockId) => void
  blocks: DayBlock[]
}) {
  const size = 380
  const cx = size / 2
  const cy = size / 2
  const R = 150
  const r = 118
  const segmentDeg = 360 / TIME_BLOCKS.length
  const centerSize = r * 2 - 12
  const selectedBlock = activeSegment ? blocks.find((b) => b.id === activeSegment) : null
  const isFlipped = !!activeSegment && !!selectedBlock

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative" style={{ width: size, height: size }}>
        {/* Donut ring only — no center in SVG so the flip card shows through */}
        <svg width={size} height={size} className="overflow-visible" aria-hidden>
          <defs>
            {TIME_BLOCKS.map((block, i) => {
              const a = i * segmentDeg
              const b = (i + 1) * segmentDeg
              const labelRadius = (R + r) / 2
              return (
                <path
                  key={block.id}
                  id={`day-pie-arc-${block.id}`}
                  d={getArcPath(cx, cy, labelRadius, a, b)}
                  fill="none"
                />
              )
            })}
          </defs>
          {TIME_BLOCKS.map((block, i) => {
            const a = i * segmentDeg
            const b = (i + 1) * segmentDeg
            const isActive = activeSegment === block.id
            return (
              <g key={block.id}>
                <path
                  d={getDonutPath(cx, cy, R, r, a, b)}
                  fill={block.color}
                  stroke={isActive ? "white" : "transparent"}
                  strokeWidth={3}
                  className="cursor-pointer transition-opacity hover:opacity-95"
                  style={{ opacity: activeSegment == null || isActive ? 1 : 0.55, touchAction: "manipulation" }}
                  onPointerDown={(e) => {
                    // PointerDown is more reliable than click for touch devices.
                    e.preventDefault()
                    e.stopPropagation()
                    onSegmentClick(block.id)
                  }}
                  aria-label={block.label}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault()
                      onSegmentClick(block.id)
                    }
                  }}
                />
                <text
                  fill="white"
                  fontSize={12}
                  fontWeight={600}
                  className="pointer-events-none select-none"
                  style={{ textShadow: "0 1px 2px rgba(0,0,0,0.3)" }}
                >
                  <textPath
                    href={`#day-pie-arc-${block.id}`}
                    startOffset="50%"
                    textAnchor="middle"
                  >
                    {block.label}
                  </textPath>
                </text>
              </g>
            )
          })}
        </svg>

        {/* Center: flip card — front = "Your day", back = segment content */}
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full overflow-hidden pointer-events-none"
          style={{
            width: centerSize,
            height: centerSize,
            perspective: "800px",
          }}
        >
          <div
            className="relative w-full h-full transition-transform duration-500"
            style={{
              transformStyle: "preserve-3d",
              transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
            }}
          >
            {/* Front: prompt */}
            <div
              className="absolute inset-0 rounded-full flex flex-col items-center justify-center p-6 bg-slate-100 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-600"
              style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}
            >
              <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 text-center">Your day</span>
              <span className="text-xs text-slate-400 dark:text-slate-500 text-center mt-1">Click a segment</span>
            </div>

            {/* Back: segment title only (full content shown in card below) */}
            <div
              className="absolute inset-0 rounded-full flex flex-col items-center justify-center p-6 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700"
              style={{
                backfaceVisibility: "hidden",
                WebkitBackfaceVisibility: "hidden",
                transform: "rotateY(180deg)",
              }}
            >
              {selectedBlock && (
                <>
                  <span
                    className="text-base font-bold text-center leading-tight"
                    style={{ color: TIME_BLOCKS.find((b) => b.id === selectedBlock.id)?.color }}
                  >
                    {selectedBlock.title}
                  </span>
                  <span className="text-xs text-slate-400 dark:text-slate-500 text-center mt-2">↓ See below</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs">
        {TIME_BLOCKS.map((block) => (
          <button
            key={block.id}
            type="button"
            onClick={() => onSegmentClick(block.id)}
            className={`flex items-center gap-1.5 font-medium transition-opacity hover:opacity-100 ${
              activeSegment === block.id ? "opacity-100" : "opacity-70"
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: block.color }} />
            {block.label}
          </button>
        ))}
      </div>

      {/* Full content card below — no clipping, fully readable */}
      {selectedBlock && (
        <div
          className="w-full max-w-lg rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden shadow-lg"
          style={{ borderLeftColor: TIME_BLOCKS.find((b) => b.id === selectedBlock.id)?.color, borderLeftWidth: 4 }}
        >
          <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-100 dark:border-slate-800">
            <h3
              className="text-base font-bold text-slate-900 dark:text-white"
              style={{ color: TIME_BLOCKS.find((b) => b.id === selectedBlock.id)?.color }}
            >
              {selectedBlock.title}
            </h3>
            <button
              type="button"
              onClick={() => onSegmentClick(selectedBlock.id)}
              className="flex-shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-300 transition-colors"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
          <div className="px-5 py-4 text-sm text-slate-600 dark:text-slate-400 leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_p]:mb-2">
            {selectedBlock.body}
          </div>
        </div>
      )}
    </div>
  )
}

export default function Nclex72HoursPage() {
  const params = useParams()
  const router = useRouter()
  const courseId = typeof params?.courseId === "string" ? parseInt(params.courseId, 10) : null
  const [activeTab, setActiveTab] = useState<DayTab>("day1")
  const [activeSegment, setActiveSegment] = useState<TimeBlockId | null>(null)

  // Reset segment when switching day tab
  useEffect(() => {
    setActiveSegment(null)
  }, [activeTab])

  const handleSegmentClick = (blockId: TimeBlockId) => {
    setActiveSegment((prev) => (prev === blockId ? null : blockId))
  }

  if (courseId == null || Number.isNaN(courseId)) {
    router.replace("/student")
    return null
  }

  return (
    <StudentLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <Link
          href={`/student/course/${courseId}`}
          className="inline-flex items-center gap-2 text-sm font-medium text-brand-blue hover:underline mb-6"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to NCLEX course
        </Link>
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
            <Clock className="h-6 w-6 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              NCLEX Last 72 Hours Strategy Plan
            </h1>
            <p className="text-slate-600 dark:text-slate-400 text-sm mt-0.5">
              Revision, confidence building, and mental preparation
            </p>
          </div>
        </div>

        {/* Clickable day tabs with arrows — only the selected day's content is shown below */}
        <div className="flex flex-wrap items-center gap-x-1 gap-y-2 mb-8">
          {TABS.map((tab, index) => (
            <div key={tab.id} className="flex items-center">
              <button
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  activeTab === tab.id
                    ? "bg-amber-500 text-white shadow-md"
                    : "bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 hover:bg-amber-200 dark:hover:bg-amber-800/40"
                }`}
              >
                {tab.label}
              </button>
              {index < TABS.length - 1 && (
                <ChevronRight className="h-5 w-5 text-amber-400 dark:text-amber-500 mx-2 shrink-0" aria-hidden />
              )}
            </div>
          ))}
        </div>

        <div className="prose prose-slate dark:prose-invert max-w-none">
          {activeTab === "day1" && (
            <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-brand-blue" />
                Day 1 (72 – 48 Hours Before Exam)
              </h2>
              <p className="text-slate-600 dark:text-slate-300 mb-6 font-medium">Focus: High Yield Revision + Practice Questions</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Click a segment — the center flips to show the label; full details appear in the card below.</p>
              <DayPieWithFlip
                activeSegment={activeSegment}
                onSegmentClick={handleSegmentClick}
                blocks={[
                  {
                    id: "morning",
                    title: "Morning (3–4 hours)",
                    body: (
                      <>
                        <p className="mb-2">Review core nursing concepts:</p>
                        <ul className="list-disc pl-4 space-y-0.5">
                          <li>Infection control precautions</li>
                          <li>Isolation precautions</li>
                          <li>Basic pharmacology</li>
                          <li>IV therapy basics</li>
                          <li>Oxygen therapy</li>
                          <li>Vital signs interpretation</li>
                          <li>Normal lab values</li>
                        </ul>
                        <p className="mt-2">Quick lab values: Sodium 135–145, Potassium 3.5–5.0, Calcium 8.6–10.2, Glucose 70–110, Hemoglobin 12–18</p>
                      </>
                    ),
                  },
                  {
                    id: "midday",
                    title: "Midday (2–3 hours)",
                    body: <p>Practice 75–100 NCLEX questions. Focus: Medical Surgical Nursing, Pharmacology, Prioritization. Review all rationales, especially incorrect answers.</p>,
                  },
                  {
                    id: "afternoon",
                    title: "Afternoon (2 hours)",
                    body: <p>Practice Clinical Judgment Case Studies. Focus on recognizing symptoms, prioritizing interventions, interpreting labs, identifying complications. Practice NGN question types.</p>,
                  },
                  {
                    id: "evening",
                    title: "Evening (1–2 hours)",
                    body: <p>Review pharmacology essentials: drug classifications, high alert medications, side effects, nursing considerations (ACE inhibitors, beta blockers, diuretics, insulin, antibiotics).</p>,
                  },
                  { id: "night", title: "Night", body: <p className="text-amber-700 dark:text-amber-300 font-medium">Relax. Sleep 7–8 hours.</p> },
                ]}
              />
            </section>
          )}

          {activeTab === "day2" && (
            <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-brand-blue" />
                Day 2 (48 – 24 Hours Before Exam)
              </h2>
              <p className="text-slate-600 dark:text-slate-300 mb-6 font-medium">Focus: NCLEX Strategy + Weak Areas</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Click a segment — the center flips to show the label; full details appear in the card below.</p>
              <DayPieWithFlip
                activeSegment={activeSegment}
                onSegmentClick={handleSegmentClick}
                blocks={[
                  { id: "morning", title: "Morning (2–3 hours)", body: <p>Review NCLEX strategies: ABC Priority, Maslow&apos;s Hierarchy, Acute vs Chronic, Stable vs Unstable, Least invasive first.</p> },
                  { id: "midday", title: "Midday (3 hours)", body: <p>Take one full NCLEX practice test (85 questions). Simulate exam: no distractions, timer on. Analyze mistakes and identify weak areas.</p> },
                  { id: "afternoon", title: "Afternoon (2 hours)", body: <p>Revise weak topics: pharmacology, pediatrics, maternal nursing, electrolyte imbalance, emergency nursing.</p> },
                  { id: "evening", title: "Evening (1–2 hours)", body: <p>Review high-yield: cardiac emergencies, respiratory distress, diabetes, electrolytes, shock and sepsis, postoperative complications.</p> },
                  { id: "night", title: "Night", body: <p className="text-amber-700 dark:text-amber-300 font-medium">Light review. Prepare exam day items. Sleep early.</p> },
                ]}
              />
            </section>
          )}

          {activeTab === "day3" && (
            <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-brand-blue" />
                Day 3 (24 Hours Before Exam)
              </h2>
              <p className="text-slate-600 dark:text-slate-300 mb-6 font-medium">Focus: Confidence + Mental Preparation</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Click a segment — the center flips to show the label; full details appear in the card below.</p>
              <DayPieWithFlip
                activeSegment={activeSegment}
                onSegmentClick={handleSegmentClick}
                blocks={[
                  { id: "morning", title: "Morning", body: <p>Light review — flashcards, lab values, isolation precautions, emergency drugs. Do not start new topics.</p> },
                  { id: "midday", title: "Midday", body: <p>Practice 20–30 light questions only. Confidence building.</p> },
                  { id: "afternoon", title: "Afternoon", body: <p>Relax — light walk, meditation, deep breathing. Avoid discussing difficult questions.</p> },
                  { id: "evening", title: "Evening", body: <p>Prepare: exam authorization, ID, exam center location, transportation.</p> },
                  { id: "night", title: "Night", body: <p className="text-amber-700 dark:text-amber-300 font-medium">Healthy dinner. No caffeine late. Sleep 7–8 hours.</p> },
                ]}
              />
            </section>
          )}

          {activeTab === "exam" && (
            <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Exam Day Strategy</h2>
              <ul className="list-disc pl-6 space-y-2 text-sm text-slate-600 dark:text-slate-400">
                <li>Wake up early. Eat a light breakfast.</li>
                <li>Arrive at the exam center 30 minutes early.</li>
                <li>Read each question carefully. Identify priority keywords: First, Best, Priority, Initial, Immediate.</li>
                <li>Apply: ABC rule → Maslow → Acute vs chronic → Stable vs unstable → Safety first.</li>
                <li>If unsure: eliminate wrong answers first. Never rush. Stay calm.</li>
                <li>Remember: NCLEX tests safe practice, not perfection. If the exam stops early, the system may be confident in your performance.</li>
              </ul>
            </section>
          )}
        </div>
      </div>
    </StudentLayout>
  )
}
