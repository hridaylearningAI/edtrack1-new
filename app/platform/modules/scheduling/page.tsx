'use client'

import { DemoKpis, DemoModuleShell } from '@/components/platform/demo-module-shell'
import s from '@/components/platform/module.module.css'
import { getPlatformModule } from '@/lib/demo-platform'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const SESSIONS = [
  { day: 0, time: '09:00', title: 'GNPS Live Class', room: 'Studio A' },
  { day: 0, time: '14:00', title: 'Trainer huddle', room: 'Online' },
  { day: 1, time: '10:30', title: 'NCLEX Strategies', room: 'Studio B' },
  { day: 2, time: '09:00', title: 'Placement briefing', room: 'Hall 2' },
  { day: 3, time: '13:00', title: 'Partner webinar', room: 'Online' },
  { day: 4, time: '11:00', title: 'Assessment clinic', room: 'Studio A' },
  { day: 5, time: '10:00', title: 'Open study hall', room: 'Library' },
]

export default function SchedulingDemoPage() {
  const module = getPlatformModule('scheduling')!
  return (
    <DemoModuleShell module={module}>
      <DemoKpis
        items={[
          { label: 'Sessions this week', value: '18' },
          { label: 'Rooms booked', value: '6' },
          { label: 'Conflicts', value: '0' },
        ]}
      />

      <div className={s.section}>
        <h2>This week</h2>
        <small>Mon – Sun</small>
      </div>
      <div className={s.calendar}>
        <div className={s.week}>
          {DAYS.map((day, idx) => {
            const sessions = SESSIONS.filter((session) => session.day === idx)
            return (
              <section key={day} className={s.day}>
                <h3>{day.toUpperCase()}</h3>
                {sessions.length ? (
                  sessions.map((session) => (
                    <div key={`${session.time}-${session.title}`} className={s.session}>
                      <time>{session.time}</time>
                      <b>{session.title}</b>
                      <span>{session.room}</span>
                    </div>
                  ))
                ) : (
                  <p className={s.free}>No sessions</p>
                )}
              </section>
            )
          })}
        </div>
      </div>
    </DemoModuleShell>
  )
}
