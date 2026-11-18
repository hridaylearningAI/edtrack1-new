'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight, ChevronRight } from 'lucide-react'
import { DemoAvatar } from '@/components/demo-avatar'
import { DEMO_ACCOUNT_NAME, DEMO_ACCOUNT_SEED } from '@/lib/demo-avatars'
import { SHOWCASE_COURSES } from '@/lib/lms/showcase-courses'
import { workspaceSessions } from '@/lib/demo-workspace'
import { useWorkspaceMotion } from '@/components/platform/use-workspace-motion'
import { WorkspaceLordIcon } from '@/components/platform/workspace-lord-icon'
import {
  LI_ACTIVE,
  LI_BLUE,
  LI_BLUSH,
  LI_LILAC,
  LI_PRIMARY,
  LI_SAGE,
  PLATFORM_ICONS,
} from '@/components/platform/platform-icons'
import s from '@/components/platform/workspace.module.css'

type TeachableCourse = {
  id: number
  name: string
  code?: string | null
  content_folder?: string | null
  description?: string | null
}

function greetingForNow() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export function TrainerWorkspaceOverview({
  firstName,
  courses,
  loading,
}: {
  firstName: string
  courses: TeachableCourse[]
  loading?: boolean
}) {
  const router = useRouter()
  const [tasks, setTasks] = useState([
    { id: 'open', label: 'Open ETHTL115 learner preview', detail: 'Confirm content unlock', done: true },
    { id: 'build', label: 'Customize theme in Theme Studio', detail: 'Pick template / publish sections', done: false },
    { id: 'schedule', label: 'Check upcoming sessions', detail: 'Meeting links ready', done: false },
  ])
  const motionRef = useWorkspaceMotion([courses.length, tasks.filter((t) => t.done).length])

  const openable = courses.filter((c) => c.content_folder).length || courses.length
  const nextSession = workspaceSessions[1] ?? workspaceSessions[0]
  const pathways = useMemo(
    () =>
      (courses.length
        ? courses
        : SHOWCASE_COURSES.map((c) => ({
            id: c.id,
            name: c.name,
            code: c.code,
            content_folder: c.contentFolder,
            description: c.description,
          }))
      ).slice(0, 4),
    [courses],
  )

  const metrics = [
    {
      label: 'Courses teaching',
      value: loading ? '—' : String(courses.length || pathways.length),
      icon: PLATFORM_ICONS.learning,
      colors: LI_SAGE,
      tone: 'mint' as const,
      href: '/trainer/courses',
      delta: `${openable} open`,
    },
    {
      label: 'Pages to build',
      value: '5',
      icon: PLATFORM_ICONS.docs,
      colors: LI_BLUE,
      tone: 'blue' as const,
      href: '/trainer/content',
      delta: 'LMS ready',
    },
    {
      label: 'Sessions today',
      value: String(Math.min(3, workspaceSessions.length)),
      icon: PLATFORM_ICONS.schedule,
      colors: LI_LILAC,
      tone: 'lilac' as const,
      href: '/trainer/schedule',
      delta: nextSession?.time ?? '—',
    },
    {
      label: 'Follow-ups',
      value: String(tasks.filter((t) => !t.done).length),
      icon: PLATFORM_ICONS.assessments,
      colors: LI_BLUSH,
      tone: 'blush' as const,
      href: '/trainer/content',
      delta: 'builder',
      down: true,
    },
  ]

  return (
    <div ref={motionRef} className={s.pageStack}>
      <div className={s.hero}>
        <div className={`${s.heroCard} ${s.greeting}`} data-animate="card">
          <div className={s.heroCopy}>
            <div className={s.eyebrow}>Trainer workspace · EdTrack ONE</div>
            <div className={s.greetingIdentity}>
              <DemoAvatar seed={DEMO_ACCOUNT_SEED} name={DEMO_ACCOUNT_NAME} size={56} className={s.heroAvatar} />
              <div>
                <h1>
                  {greetingForNow()}, {firstName}
                </h1>
                <p>
                  Your delivery desk is connected: courses, Theme Studio, schedule and exam-prep tools in one campus
                  workspace.
                </p>
              </div>
            </div>
          </div>
          <div className={s.ctaStack}>
            <Link className={s.primary} href="/trainer/content">
              <WorkspaceLordIcon src={PLATFORM_ICONS.docs} trigger="hover" colors={LI_ACTIVE} target="a" size={18} />
              Open Theme Studio
            </Link>
            <Link className={s.secondary} href="/trainer/courses">
              <WorkspaceLordIcon src={PLATFORM_ICONS.continue} trigger="hover" colors={LI_PRIMARY} target="a" size={18} />
              Browse my courses
            </Link>
          </div>
        </div>

        <div className={s.heroSide} data-animate="card">
          <div>
            <h3>Today’s focus</h3>
            <p>
              {tasks.filter((t) => !t.done).length} delivery tasks, {pathways.length} active units, next session at{' '}
              {nextSession?.time ?? '—'}.
            </p>
          </div>
          <div className={s.focusRow}>
            <span data-focus-clock>
              <WorkspaceLordIcon src={PLATFORM_ICONS.schedule} trigger="none" colors={LI_BLUE} size={28} />
            </span>
            <div>
              <strong>{nextSession?.title || 'Next session'}</strong>
              <span>
                {nextSession?.time} · {nextSession?.detail}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className={s.metrics} aria-label="Trainer metrics">
        {metrics.map((metric) => (
          <Link className={s.metric} data-tone={metric.tone} data-animate="metric" key={metric.label} href={metric.href}>
            <span className={s.metricBg} data-metric-icon>
              <WorkspaceLordIcon
                src={metric.icon}
                trigger="hover"
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

      <div className={s.previewGridTwo}>
        <section className={s.panel} aria-labelledby="courses-title" data-animate="card">
          <div className={s.panelHeading}>
            <span className={s.panelIcon}>
              <WorkspaceLordIcon src={PLATFORM_ICONS.learning} trigger="hover" colors={LI_BLUE} size={24} />
            </span>
            <div>
              <h2 id="courses-title">Your courses</h2>
              <p>Unlocked for delivery and page building</p>
            </div>
            <Link className={s.panelLink} href="/trainer/courses">
              View all <ArrowRight size={14} />
            </Link>
          </div>
          <div className={s.courses}>
            {loading ? (
              <p className={s.footerHint}>Loading courses…</p>
            ) : (
              pathways.map((course, index) => (
                <div className={s.course} key={course.id}>
                  <div className={index % 2 ? `${s.thumb} ${s.thumbAlt}` : s.thumb}>
                    <WorkspaceLordIcon
                      src={index % 2 ? PLATFORM_ICONS.assessments : PLATFORM_ICONS.learning}
                      trigger="hover"
                      colors={index % 2 ? LI_SAGE : LI_BLUE}
                      size={32}
                    />
                  </div>
                  <div>
                    <h4>{course.name}</h4>
                    <p>
                      {course.code ?? `Course ${course.id}`}
                      {course.content_folder ? ` · ${course.content_folder}` : ''}
                    </p>
                  </div>
                  <Link className={s.btnMini} href={`/trainer/course/${course.id}`}>
                    Open
                    <WorkspaceLordIcon src={PLATFORM_ICONS.continue} trigger="hover" colors={LI_ACTIVE} target="a" size={16} />
                  </Link>
                </div>
              ))
            )}
          </div>
          <Link className={s.textButton} href="/trainer/content" style={{ marginTop: 12 }}>
            Customize in Theme Studio <ArrowRight size={14} />
          </Link>
        </section>

        <div style={{ display: 'grid', gap: 24 }}>
          <section className={s.panel} aria-labelledby="tasks-title" data-animate="card">
            <div className={s.panelHeading}>
              <span className={s.panelIcon}>
                <WorkspaceLordIcon src={PLATFORM_ICONS.assessments} trigger="hover" colors={LI_BLUSH} size={24} />
              </span>
              <div>
                <h2 id="tasks-title">Delivery checklist</h2>
                <p>Keep the showcase path moving</p>
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
              <Link className={s.textButton} href="/trainer/content">
                Open Theme Studio <ArrowRight size={14} />
              </Link>
            </div>
          </section>

          <section className={s.panel} aria-labelledby="schedule-title" data-animate="card">
            <div className={s.panelHeading}>
              <span className={s.panelIcon}>
                <WorkspaceLordIcon src={PLATFORM_ICONS.schedule} trigger="hover" colors={LI_BLUE} size={24} />
              </span>
              <div>
                <h2 id="schedule-title">Upcoming sessions</h2>
                <p>Today</p>
              </div>
              <Link className={s.panelLink} href="/trainer/schedule">
                Schedule <ArrowRight size={14} />
              </Link>
            </div>
            <div className={s.schedule}>
              {workspaceSessions.slice(0, 3).map((session) => (
                <button key={`${session.time}-${session.title}`} type="button" onClick={() => router.push('/trainer/schedule')}>
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
      </div>

      <div className={s.notice}>
        <i />
        Demo trainer workspace · Sample courses and outlines for showcase
      </div>
    </div>
  )
}
