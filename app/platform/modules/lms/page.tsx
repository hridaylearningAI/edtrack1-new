'use client'

import { DemoKpis, DemoModuleShell } from '@/components/platform/demo-module-shell'
import s from '@/components/platform/module.module.css'
import { getPlatformModule } from '@/lib/demo-platform'

const COURSES = [
  { name: 'GNPS Stage 1 Foundations', progress: 72, learners: 48 },
  { name: 'NCLEX-RN Strategies', progress: 41, learners: 112 },
  { name: 'BSBCRT511 Critical Thinking', progress: 88, learners: 26 },
  { name: 'Clinical Placement Prep', progress: 15, learners: 34 },
]

export default function LmsDemoPage() {
  const module = getPlatformModule('lms')!
  return (
    <DemoModuleShell module={module}>
      <DemoKpis
        items={[
          { label: 'Active courses', value: '24' },
          { label: 'Learners online', value: '163' },
          { label: 'Avg. completion', value: '61%' },
        ]}
      />

      <div className={s.section}>
        <h2>Course completion</h2>
        <small>{COURSES.length} courses</small>
      </div>
      <div className={s.grid}>
        {COURSES.map((course) => (
          <article key={course.name} className={s.card}>
            <h3>{course.name}</h3>
            <p className={s.meta}>{course.learners} learners</p>
            <div className={s.progress}>
              <span className={s.bar} aria-hidden>
                <i style={{ width: `${course.progress}%` }} />
              </span>
              {course.progress}%
            </div>
          </article>
        ))}
      </div>
    </DemoModuleShell>
  )
}
