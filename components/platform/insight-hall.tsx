'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { UserButton, useUser } from '@clerk/nextjs'
import {
  Activity,
  ArrowLeft,
  CheckCircle2,
  Sparkles,
  TrendingUp,
  Users,
  X,
} from 'lucide-react'
import { DemoAvatar } from '@/components/demo-avatar'
import { DemoClerkAvatarSync } from '@/components/demo-clerk-avatar-sync'
import { DEMO_ACCOUNT_NAME, DEMO_ACCOUNT_SEED } from '@/lib/demo-avatars'
import {
  COURSE_SIGNALS,
  HEALTH_RINGS,
  INSIGHT_KPIS,
  INSIGHT_RANGES,
  JOURNEY_STAGES,
  formatMoney,
  rangeTrendPoints,
  stageToneColor,
  type CourseSignal,
  type InsightRange,
  type JourneyStage,
  type JourneyStageId,
} from '@/lib/insight/demo-insight'
import { DemoSurface } from './demo-surface'
import s from './insight-hall.module.css'

export type InsightHallProps = {
  backHref?: string
  backLabel?: string
  afterSignOutUrl?: string
  accountLabel?: string
}

export function InsightHall({
  backHref = '/platform',
  backLabel = 'Platform map',
  afterSignOutUrl = '/demo',
  accountLabel = 'Insight Analytics',
}: InsightHallProps) {
  const { user } = useUser()
  const [range, setRange] = useState<InsightRange>('6m')
  const [selectedStage, setSelectedStage] = useState<JourneyStageId | null>(null)
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null)

  const trends = useMemo(() => rangeTrendPoints(range), [range])
  const maxEnrol = useMemo(
    () => Math.max(...trends.map((t) => Math.max(t.enrolments, t.completions)), 1),
    [trends]
  )

  const openStage = (stage: JourneyStage) => {
    setSelectedCourse(null)
    setSelectedStage(stage.id)
  }

  const openCourse = (course: CourseSignal) => {
    setSelectedStage(null)
    setSelectedCourse(course.id)
  }

  const closeDrawer = () => {
    setSelectedStage(null)
    setSelectedCourse(null)
  }

  const selectedStageData = JOURNEY_STAGES.find((st) => st.id === selectedStage) ?? null
  const selectedCourseData = COURSE_SIGNALS.find((c) => c.id === selectedCourse) ?? null
  const rangeLabel = INSIGHT_RANGES.find((r) => r.id === range)?.label ?? '6 months'

  return (
    <DemoSurface>
      <DemoClerkAvatarSync />
      <div className={s.hall}>
        <div className={s.ambient} aria-hidden />

        <div className={s.chrome} data-chrome>
          <Link href={backHref} className={s.backLink}>
            <ArrowLeft size={14} aria-hidden />
            {backLabel}
          </Link>

          <div className={s.metricsRail} aria-label="Key metrics">
            <div className={s.metric}>
              <span className={s.metricIcon} data-tone="blue">
                <Users size={14} aria-hidden />
              </span>
              <div className={s.metricMeta}>
                <small>Enrolments YTD</small>
                <b>{INSIGHT_KPIS.enrolmentsYtd}</b>
              </div>
            </div>
            <div className={s.metric}>
              <span className={s.metricIcon} data-tone="green">
                <CheckCircle2 size={14} aria-hidden />
              </span>
              <div className={s.metricMeta}>
                <small>Completion</small>
                <b>{INSIGHT_KPIS.completionRate}%</b>
              </div>
            </div>
            <div className={s.metric}>
              <span className={s.metricIcon} data-tone="ink">
                <Sparkles size={14} aria-hidden />
              </span>
              <div className={s.metricMeta}>
                <small>NPS</small>
                <b>{INSIGHT_KPIS.nps}</b>
              </div>
            </div>
            <div className={s.metric}>
              <span className={s.metricIcon} data-tone="warm">
                <Activity size={14} aria-hidden />
              </span>
              <div className={s.metricMeta}>
                <small>At risk</small>
                <b>{INSIGHT_KPIS.atRisk}</b>
              </div>
            </div>
          </div>

          <div className={s.chromeRight}>
            <div className={s.rangeSwitch} role="group" aria-label="Time range">
              {INSIGHT_RANGES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={range === item.id}
                  onClick={() => setRange(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className={s.accountMenu} data-chrome>
              <div className={s.accountPanel}>
                <div className={s.accountHead}>
                  <div className={s.accountMeta}>
                    <b>{user?.fullName || DEMO_ACCOUNT_NAME}</b>
                    <small>{accountLabel}</small>
                  </div>
                  <div className={s.accountAvatar}>
                    <DemoAvatar
                      seed={user?.id || DEMO_ACCOUNT_SEED}
                      name={user?.fullName || DEMO_ACCOUNT_NAME}
                      size={36}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        opacity: 0,
                      }}
                    >
                      <UserButton afterSignOutUrl={afterSignOutUrl} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={s.scroll}>
          <div className={s.bento}>
            <div className={s.sectionLabel}>
              <h2>Learner journey</h2>
              <p>Enquiry → completion · {rangeLabel}</p>
            </div>

            {JOURNEY_STAGES.map((stage) => {
              const maxBar = Math.max(...stage.bars, 1)
              return (
                <button
                  key={stage.id}
                  type="button"
                  className={`${s.card} ${s.span3}`}
                  data-tone={stage.tone}
                  data-selected={selectedStage === stage.id || undefined}
                  onClick={() => openStage(stage)}
                >
                  <span className={s.cardAccent} aria-hidden />
                  <div className={s.cardTop}>
                    <div>
                      <small>{stage.eyebrow}</small>
                      <h3>{stage.title}</h3>
                    </div>
                    <span className={s.badge} data-tone={stage.tone === 'ink' ? 'blue' : stage.tone}>
                      {stage.conversionPct}%
                    </span>
                  </div>
                  <div className={s.metricRow}>
                    <div className={s.metricCell}>
                      <small>{stage.metricLabel}</small>
                      <b>{stage.metricValue}</b>
                    </div>
                    <div className={s.metricCell}>
                      <small>{stage.secondaryLabel}</small>
                      <b>{stage.secondaryValue}</b>
                    </div>
                  </div>
                  <div className={s.spark} aria-hidden>
                    {stage.bars.slice(-8).map((v, i) => (
                      <i key={i} style={{ height: `${Math.max(12, (v / maxBar) * 100)}%` }} />
                    ))}
                  </div>
                </button>
              )
            })}

            <div className={s.sectionLabel}>
              <h2>Trends & courses</h2>
              <p>Enrolment vs completion · top pathways</p>
            </div>

            <div className={`${s.card} ${s.span7} ${s.trendPanel}`}>
              <div className={s.trendHead}>
                <div>
                  <h3>Enrolments vs completions</h3>
                  <p>Monthly signal · {rangeLabel}</p>
                </div>
                <div className={s.legend}>
                  <span>
                    <i style={{ background: 'var(--blue)' }} /> Enrol
                  </span>
                  <span>
                    <i style={{ background: 'var(--green)' }} /> Complete
                  </span>
                </div>
              </div>
              <div className={s.dualBars}>
                {trends.map((pt) => (
                  <div key={pt.month} className={s.dualCol}>
                    <div className={s.dualPair}>
                      <span
                        data-series="enrol"
                        style={{ height: `${(pt.enrolments / maxEnrol) * 100}%` }}
                      />
                      <span
                        data-series="complete"
                        style={{ height: `${(pt.completions / maxEnrol) * 100}%` }}
                      />
                    </div>
                    <small>{pt.month}</small>
                  </div>
                ))}
              </div>
            </div>

            <div className={`${s.card} ${s.span5}`}>
              <div className={s.cardTop}>
                <div>
                  <small>Revenue pulse</small>
                  <h3>{formatMoney(INSIGHT_KPIS.revenueYtd)}</h3>
                </div>
                <span className={s.badge} data-tone="green">
                  <TrendingUp size={10} aria-hidden /> YTD
                </span>
              </div>
              <div className={s.chips}>
                <span className={s.chip}>
                  Open enquiries <strong>{INSIGHT_KPIS.openEnquiries}</strong>
                </span>
                <span className={s.chip}>
                  At risk <strong>{INSIGHT_KPIS.atRisk}</strong>
                </span>
                <span className={s.chip}>
                  NPS <strong>{INSIGHT_KPIS.nps}</strong>
                </span>
              </div>
              <div className={s.spark} aria-hidden>
                {trends.map((pt, i) => {
                  const maxRev = Math.max(...trends.map((t) => t.revenue), 1)
                  return (
                    <i
                      key={i}
                      style={{
                        height: `${Math.max(12, (pt.revenue / maxRev) * 100)}%`,
                        background: 'var(--warm)',
                      }}
                    />
                  )
                })}
              </div>
            </div>

            <div className={`${s.span12} ${s.courseRow}`}>
              {COURSE_SIGNALS.map((course) => (
                <button
                  key={course.id}
                  type="button"
                  className={s.card}
                  data-selected={selectedCourse === course.id || undefined}
                  onClick={() => openCourse(course)}
                >
                  <div className={s.cardTop}>
                    <div>
                      <small>Course</small>
                      <h3>{course.name}</h3>
                    </div>
                    <span
                      className={s.badge}
                      data-tone={course.atRisk > 4 ? 'warm' : 'green'}
                    >
                      {course.completionRate}%
                    </span>
                  </div>
                  <div className={s.metricRow}>
                    <div className={s.metricCell}>
                      <small>Enrolled</small>
                      <b>{course.enrolled}</b>
                    </div>
                    <div className={s.metricCell}>
                      <small>At risk</small>
                      <b>{course.atRisk}</b>
                    </div>
                  </div>
                  <div className={s.meter} aria-hidden>
                    <i style={{ width: `${course.completionRate}%` }} />
                  </div>
                </button>
              ))}
            </div>

            <div className={s.sectionLabel}>
              <h2>Campus health</h2>
              <p>Operational pulse across delivery</p>
            </div>

            <div className={`${s.card} ${s.span12}`}>
              <div className={s.ringRow}>
                {HEALTH_RINGS.map((ring) => {
                  const color = stageToneColor(ring.tone)
                  const r = 20
                  const c = 2 * Math.PI * r
                  const offset = c * (1 - ring.value / 100)
                  return (
                    <div key={ring.id} className={s.ringCard}>
                      <div className={s.ring}>
                        <svg viewBox="0 0 52 52" aria-hidden>
                          <circle
                            cx="26"
                            cy="26"
                            r={r}
                            fill="none"
                            stroke="rgba(38,52,50,0.08)"
                            strokeWidth="5"
                          />
                          <circle
                            cx="26"
                            cy="26"
                            r={r}
                            fill="none"
                            stroke={color}
                            strokeWidth="5"
                            strokeLinecap="round"
                            strokeDasharray={c}
                            strokeDashoffset={offset}
                          />
                        </svg>
                        <span className={s.ringValue}>{ring.value}%</span>
                      </div>
                      <div className={s.ringMeta}>
                        <h4>{ring.label}</h4>
                        <p>{ring.caption}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {selectedStageData ? (
          <aside className={s.drawer} data-drawer aria-label={`${selectedStageData.title} detail`}>
            <div className={s.drawerHead}>
              <div>
                <h2>{selectedStageData.title}</h2>
                <p>{selectedStageData.blurb}</p>
              </div>
              <button type="button" className={s.closeBtn} onClick={closeDrawer} aria-label="Close">
                <X size={14} />
              </button>
            </div>
            <div className={s.drawerBody}>
              <div className={s.kv}>
                <div>
                  <small>{selectedStageData.metricLabel}</small>
                  <b>{selectedStageData.metricValue}</b>
                </div>
                <div>
                  <small>{selectedStageData.secondaryLabel}</small>
                  <b>{selectedStageData.secondaryValue}</b>
                </div>
                <div>
                  <small>{selectedStageData.conversionLabel}</small>
                  <b>{selectedStageData.conversionPct}%</b>
                </div>
              </div>
              <div className={s.chips}>
                {selectedStageData.signals.map((sig) => (
                  <span key={sig.label} className={s.chip}>
                    {sig.label} <strong>{sig.value}</strong>
                  </span>
                ))}
              </div>
              <div className={s.drawerSpark} aria-hidden>
                {selectedStageData.bars.map((v, i) => {
                  const max = Math.max(...selectedStageData.bars, 1)
                  return (
                    <i
                      key={i}
                      style={{
                        height: `${Math.max(8, (v / max) * 100)}%`,
                        background: stageToneColor(selectedStageData.tone),
                      }}
                    />
                  )
                })}
              </div>
            </div>
          </aside>
        ) : null}

        {selectedCourseData ? (
          <aside className={s.drawer} data-drawer aria-label={`${selectedCourseData.name} detail`}>
            <div className={s.drawerHead}>
              <div>
                <h2>{selectedCourseData.name}</h2>
                <p>
                  {selectedCourseData.enrolled} enrolled ·{' '}
                  {formatMoney(selectedCourseData.revenue)} revenue
                </p>
              </div>
              <button type="button" className={s.closeBtn} onClick={closeDrawer} aria-label="Close">
                <X size={14} />
              </button>
            </div>
            <div className={s.drawerBody}>
              <div className={s.kv}>
                <div>
                  <small>Completed</small>
                  <b>{selectedCourseData.completed}</b>
                </div>
                <div>
                  <small>Completion rate</small>
                  <b>{selectedCourseData.completionRate}%</b>
                </div>
                <div>
                  <small>At risk</small>
                  <b>{selectedCourseData.atRisk}</b>
                </div>
                <div>
                  <small>Revenue</small>
                  <b>{formatMoney(selectedCourseData.revenue)}</b>
                </div>
              </div>
              <div className={s.meter} aria-hidden>
                <i style={{ width: `${selectedCourseData.completionRate}%` }} />
              </div>
            </div>
          </aside>
        ) : null}
      </div>
    </DemoSurface>
  )
}
