'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, ChevronRight } from 'lucide-react'
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from 'recharts'
import { enrolmentTrend, money, workspaceAssessments, workspaceCourses, workspaceSessions } from '@/lib/demo-workspace'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { WorkspaceDialog } from './workspace-dialog'
import { EnrolmentForm } from './enrolment-form'
import { useWorkspace } from './workspace-state'
import { useWorkspaceMotion } from './use-workspace-motion'
import { DemoAvatar } from '@/components/demo-avatar'
import { DEMO_ACCOUNT_NAME, DEMO_ACCOUNT_SEED } from '@/lib/demo-avatars'
import { WorkspaceLordIcon } from './workspace-lord-icon'
import {
  LI_ACTIVE,
  LI_BLUE,
  LI_BLUSH,
  LI_LILAC,
  LI_PRIMARY,
  LI_SAGE,
  PLATFORM_ICONS,
} from './platform-icons'
import s from './workspace.module.css'

const engagementConfig = {
  count: { label: 'New learners', color: '#245ac6' },
} satisfies ChartConfig

const RING_TONES: Record<string, string> = {
  blue: '#245ac6',
  green: '#1a6b52',
  lilac: '#5b4d7a',
  red: '#9a3a2a',
}

export function WorkspaceOverview() {
  const { learners, invoices } = useWorkspace()
  const [months, setMonths] = useState(6)
  const [enrolling, setEnrolling] = useState(false)
  const [detail, setDetail] = useState<'assessments' | number | null>(null)
  const [point, setPoint] = useState<number | null>(null)
  const [tasks, setTasks] = useState([
    { id: 'enrol', label: 'Enrol Leah Chen', detail: 'Demo spine step 1', done: true },
    { id: 'fee', label: 'Simulate fee payment', detail: 'Unlock learning stage', done: false },
    { id: 'comply', label: 'Show compliance glimpse', detail: 'AVETMISS / audit beat', done: false },
  ])
  const motionRef = useWorkspaceMotion([learners.length, invoices.length, months])

  const active = learners.filter((item) => item.status === 'active').length
  const pending = learners.filter((item) => item.status === 'pending').length
  const completed = learners.filter((item) => item.status === 'completed').length
  const due = invoices.filter((item) => item.status === 'pending')
  const pendingFees = due.reduce((sum, item) => sum + item.amount, 0)
  const unitsInProgress = Math.max(1, workspaceCourses.length)
  const completionRate = Math.round(
    learners.reduce((sum, item) => sum + item.progress, 0) / Math.max(1, learners.length),
  )
  const trend = enrolmentTrend(learners, months)

  const pathways = workspaceCourses.slice(0, 2).map((course) => {
    const cohort = learners.filter((item) => item.courseId === course.id)
    const progress = cohort.length
      ? Math.round(cohort.reduce((sum, item) => sum + item.progress, 0) / cohort.length)
      : 0
    return { ...course, progress, cohort: cohort.length }
  })

  const rings = [
    { label: 'Course progress', value: completionRate, tone: 'blue' as const },
    { label: 'Attendance', value: 64, tone: 'green' as const },
    { label: 'Assessments', value: Math.min(100, workspaceAssessments.length * 18), tone: 'lilac' as const },
    { label: 'Fees collected', value: Math.min(100, Math.round((1 - due.length / Math.max(1, invoices.length)) * 100)), tone: 'red' as const },
  ]

  const metrics: Array<{
    label: string
    value: string
    icon: string
    colors: string
    tone: 'lilac' | 'mint' | 'blush' | 'blue'
    href: string
    delta: string
    down?: boolean
    state?: string
  }> = [
    {
      label: 'Active learners',
      value: String(active),
      icon: PLATFORM_ICONS.learners,
      colors: LI_LILAC,
      tone: 'lilac',
      href: '/platform/students?status=active',
      delta: '+12%',
    },
    {
      label: 'Units in progress',
      value: String(unitsInProgress),
      icon: PLATFORM_ICONS.learning,
      colors: LI_SAGE,
      tone: 'mint',
      href: '/platform/modules/lms',
      delta: `+${unitsInProgress}`,
    },
    {
      label: 'Pending fees',
      value: money(pendingFees),
      icon: PLATFORM_ICONS.fees,
      colors: LI_BLUSH,
      tone: 'blush',
      href: '/platform/modules/fees?status=pending',
      delta: `${due.length} due`,
      down: true,
    },
    {
      label: 'Completion rate',
      value: `${completionRate}%`,
      icon: PLATFORM_ICONS.compliance,
      colors: LI_BLUE,
      tone: 'blue',
      href: '/platform/students?status=active',
      delta: `${completed} done`,
      // Marker-backed hover segment (not in-check) so hover doesn't redraw over the resting icon.
      state: 'hover-check',
    },
  ]

  return (
    <>
      <div ref={motionRef} className={s.pageStack}>
        <div className={s.hero}>
          <div className={`${s.heroCard} ${s.greeting}`} data-animate="card">
            <div className={s.heroCopy}>
              <div className={s.eyebrow}>Demo Institute · EdTrack ONE</div>
              <div className={s.greetingIdentity}>
                <DemoAvatar seed={DEMO_ACCOUNT_SEED} name={DEMO_ACCOUNT_NAME} size={56} className={s.heroAvatar} />
                <div>
                  <h1>Good morning, Aisha</h1>
                  <p>Your campus is connected: enrolment, learning, fees and compliance in one workspace.</p>
                </div>
              </div>
            </div>
            <div className={s.ctaStack}>
              <button className={s.primary} type="button" onClick={() => setEnrolling(true)}>
                <WorkspaceLordIcon src={PLATFORM_ICONS.enrol} trigger="hover" colors={LI_ACTIVE} target="button" size={18} />
                Enrol student
              </button>
              <Link className={s.secondary} href="/platform/modules/lms">
                <WorkspaceLordIcon src={PLATFORM_ICONS.continue} trigger="hover" colors={LI_PRIMARY} target="a" size={18} />
                Continue learning
              </Link>
            </div>
          </div>

          <div className={s.heroSide} data-animate="card">
            <div>
              <h3>Today’s focus</h3>
              <p>
                {due.length} fee follow-ups, {workspaceAssessments.length} assessments due, NCLEX cohort live at 2:00
              </p>
            </div>
            <div className={s.focusRow}>
              <span data-focus-clock>
                <WorkspaceLordIcon
                  src={PLATFORM_ICONS.schedule}
                  trigger="none"
                  colors={LI_BLUE}
                  size={28}
                />
              </span>
              <div>
                <strong>{workspaceSessions[2]?.title || 'Next session'}</strong>
                <span>
                  {workspaceSessions[2]?.time} · {workspaceSessions[2]?.detail}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className={s.metrics} aria-label="Key metrics">
          {metrics.map((metric) => (
            <Link className={s.metric} data-tone={metric.tone} data-animate="metric" key={metric.label} href={metric.href}>
              <span className={s.metricBg} data-metric-icon>
                <WorkspaceLordIcon
                  src={metric.icon}
                  trigger="hover"
                  state={metric.state}
                  target="[data-animate='metric']"
                  colors={metric.colors}
                  size={96}
                />
              </span>
              <div className={s.metricTop}>
                <span className={metric.down ? `${s.delta} ${s.deltaDown}` : s.delta}>{metric.delta}</span>
              </div>
              <div className={s.metricBody}>
                <strong>{metric.value}</strong>
                <small>{metric.label}</small>
              </div>
            </Link>
          ))}
        </div>

        <div className={s.previewGrid}>
          <section className={`${s.panel} ${s.trend}`} aria-labelledby="trend-title" data-animate="card">
            <div className={s.panelHeading}>
              <span className={s.panelIcon}>
                <WorkspaceLordIcon src={PLATFORM_ICONS.analytics} trigger="hover" colors={LI_BLUE} size={26} />
              </span>
              <div>
                <h2 id="trend-title">Learner engagement</h2>
                <p>New learners, last {months} months</p>
              </div>
              <label className={s.period}>
                <span className={s.srOnly}>Chart period</span>
                <select
                  value={months}
                  onChange={(event) => {
                    setMonths(Number(event.target.value))
                    setPoint(null)
                  }}
                >
                  <option value={6}>6 months</option>
                  <option value={3}>3 months</option>
                </select>
              </label>
            </div>
            <div className={s.chart}>
              <ChartContainer
                config={engagementConfig}
                className={`!aspect-auto h-[220px] w-full ${s.chartShell}`}
                role="img"
                aria-label={`New learners by month: ${trend.map((item) => `${item.month}: ${item.count}`).join(', ')}`}
              >
                <AreaChart
                  data={trend}
                  margin={{ top: 16, right: 12, left: -8, bottom: 0 }}
                  onClick={(state) => {
                    const index = state?.activeTooltipIndex
                    if (typeof index === 'number') setPoint(point === index ? null : index)
                  }}
                >
                  <defs>
                    <linearGradient id="enrolment-fill" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#245ac6" stopOpacity={0.18} />
                      <stop offset="100%" stopColor="#245ac6" stopOpacity={0.015} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="#e8ece4" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="month"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: '#6b7c74', fontSize: 12 }}
                  />
                  <YAxis
                    allowDecimals={false}
                    tickLine={false}
                    axisLine={false}
                    width={28}
                    tick={{ fill: '#6b7c74', fontSize: 12 }}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="var(--color-count)"
                    strokeWidth={2}
                    fill="url(#enrolment-fill)"
                    activeDot={{ r: 6 }}
                  />
                </AreaChart>
              </ChartContainer>
            </div>
            <p className={s.chartCaption} aria-live="polite">
              {point === null
                ? 'Study sessions and enrolment movement for the demo institute.'
                : `${trend[point].month}: ${trend[point].count} new learners in the demo directory.`}
            </p>
          </section>

          <section className={s.panel} aria-labelledby="rings-title" data-animate="card">
            <div className={s.panelHeading}>
              <span className={s.panelIcon}>
                <WorkspaceLordIcon src={PLATFORM_ICONS.analytics} trigger="hover" colors={LI_PRIMARY} size={24} />
              </span>
              <div>
                <h2 id="rings-title">Study analytics</h2>
                <p>Rings</p>
              </div>
            </div>
            <div className={s.rings}>
              {rings.map((ring) => {
                const tone = RING_TONES[ring.tone] || RING_TONES.blue
                const ringData = [
                  { name: 'done', value: ring.value, fill: tone },
                  { name: 'left', value: Math.max(0, 100 - ring.value), fill: '#e8ece4' },
                ]
                return (
                  <div className={s.ringCard} key={ring.label} data-tone={ring.tone}>
                    <div className={s.ringChart}>
                      <ChartContainer
                        config={{
                          done: { label: 'Done', color: tone },
                          left: { label: 'Left', color: '#e8ece4' },
                        }}
                        className="!aspect-auto h-[84px] w-[84px]"
                      >
                        <PieChart>
                          <Pie
                            data={ringData}
                            dataKey="value"
                            innerRadius={28}
                            outerRadius={40}
                            startAngle={90}
                            endAngle={-270}
                            strokeWidth={0}
                          >
                            {ringData.map((slice) => (
                              <Cell key={slice.name} fill={slice.fill} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ChartContainer>
                      <div className={s.ringLabel}>
                        <strong>
                          {ring.value}%<small>done</small>
                        </strong>
                      </div>
                    </div>
                    <p>{ring.label}</p>
                  </div>
                )
              })}
            </div>
          </section>

          <section className={s.panel} aria-labelledby="schedule-title" data-animate="card">
            <div className={s.panelHeading}>
              <span className={s.panelIcon}>
                <WorkspaceLordIcon src={PLATFORM_ICONS.schedule} trigger="hover" colors={LI_BLUE} size={24} />
              </span>
              <div>
                <h2 id="schedule-title">Schedule</h2>
                <p>Today</p>
              </div>
              <Link className={s.panelLink} href="/platform/modules/scheduling">
                View all <ArrowRight size={14} />
              </Link>
            </div>
            <div className={s.schedule}>
              {workspaceSessions.map((session, index) => (
                <button key={session.time} type="button" onClick={() => setDetail(index)}>
                  <time>{session.time}</time>
                  <DemoAvatar seed={session.person} name={session.person} size={28} className={s.schedulePerson} />
                  <div>
                    <b>{session.title}</b>
                    <small>{session.detail}</small>
                  </div>
                  <ChevronRight size={16} />
                </button>
              ))}
            </div>
          </section>
        </div>

        <div className={s.previewGridTwo}>
          <section className={s.panel} aria-labelledby="learning-title" data-animate="card">
            <div className={s.panelHeading}>
              <span className={s.panelIcon}>
                <WorkspaceLordIcon src={PLATFORM_ICONS.learning} trigger="hover" colors={LI_BLUE} size={24} />
              </span>
              <div>
                <h2 id="learning-title">Continue learning</h2>
                <p>Active pathways</p>
              </div>
            </div>
            <div className={s.courses}>
              {pathways.map((course, index) => (
                <div className={s.course} key={course.id}>
                  <div className={index ? `${s.thumb} ${s.thumbAlt}` : s.thumb}>
                    <WorkspaceLordIcon
                      src={index ? PLATFORM_ICONS.assessments : PLATFORM_ICONS.students}
                      trigger="hover"
                      colors={index ? LI_SAGE : LI_BLUE}
                      size={32}
                    />
                  </div>
                  <div>
                    <h4>{course.name}</h4>
                    <p>
                      {course.cohort} learners · {course.progress}% average progress
                    </p>
                    <div className={s.bar}>
                      <span style={{ width: `${course.progress}%` }} />
                    </div>
                  </div>
                  <Link className={s.btnMini} href="/platform/modules/lms">
                    Continue
                    <WorkspaceLordIcon src={PLATFORM_ICONS.continue} trigger="hover" colors={LI_ACTIVE} target="a" size={16} />
                  </Link>
                </div>
              ))}
            </div>
          </section>

          <section className={s.panel} aria-labelledby="tasks-title" data-animate="card">
            <div className={s.panelHeading}>
              <span className={s.panelIcon}>
                <WorkspaceLordIcon src={PLATFORM_ICONS.compliance} trigger="hover" colors={LI_PRIMARY} size={24} />
              </span>
              <div>
                <h2 id="tasks-title">Tasks</h2>
                <p>Booth checklist</p>
              </div>
            </div>
            <div className={s.taskList}>
              {tasks.map((task) => (
                <label key={task.id} className={task.done ? `${s.taskRow} ${s.taskDone}` : s.taskRow}>
                  <input
                    type="checkbox"
                    checked={task.done}
                    onChange={() =>
                      setTasks((current) =>
                        current.map((item) => (item.id === task.id ? { ...item, done: !item.done } : item)),
                      )
                    }
                  />
                  <div>
                    <strong>{task.label}</strong>
                    <span>{task.detail}</span>
                  </div>
                </label>
              ))}
              <button className={s.textButton} type="button" onClick={() => setDetail('assessments')}>
                Review assessment queue <ArrowRight size={14} />
              </button>
              {pending > 0 && (
                <Link className={s.textButton} href="/platform/students?status=pending">
                  {pending} pending enrolments <ChevronRight size={14} />
                </Link>
              )}
            </div>
          </section>
        </div>
      </div>

      <EnrolmentForm open={enrolling} onClose={() => setEnrolling(false)} />
      <WorkspaceDialog
        title={detail === 'assessments' ? 'Assessment review queue.' : typeof detail === 'number' ? workspaceSessions[detail].title : ''}
        description="Illustrative demo information"
        open={detail !== null}
        onClose={() => setDetail(null)}
      >
        {detail === 'assessments' ? (
          <div className={s.detailList}>
            {workspaceAssessments.map((item) => (
              <div key={item.title}>
                <span className={s.rowIcon} data-tone="green">
                  <WorkspaceLordIcon src={PLATFORM_ICONS.learning} trigger="hover" colors={LI_SAGE} size={20} />
                </span>
                <div>
                  <b>{item.title}</b>
                  <small>{item.course}</small>
                </div>
                <span className={s.status}>Active</span>
              </div>
            ))}
            <Link className={s.secondary} href="/platform/modules/lms">
              Open learning workspace <ArrowRight size={16} />
            </Link>
          </div>
        ) : (
          typeof detail === 'number' && (
            <div className={s.eventDetail}>
              <span className={s.status}>
                {workspaceSessions[detail].time} · Today
              </span>
              <p>{workspaceSessions[detail].description}</p>
              <p>{workspaceSessions[detail].detail}</p>
              <Link className={s.secondary} href="/platform/modules/scheduling">
                Open timetable <ArrowRight size={16} />
              </Link>
            </div>
          )
        )}
      </WorkspaceDialog>
    </>
  )
}
