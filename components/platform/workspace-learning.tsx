'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, BookOpen, ChevronRight, Search } from 'lucide-react'
import { DemoAvatar } from '@/components/demo-avatar'
import { DemoKpis, DemoModuleShell } from './demo-module-shell'
import { WorkspaceDialog } from './workspace-dialog'
import { useWorkspace } from './workspace-state'
import { workspaceCourses } from '@/lib/demo-workspace'
import { getPlatformModule } from '@/lib/demo-platform'
import s from './workspace.module.css'
import m from './module.module.css'

export function WorkspaceLearning() {
  const { learners } = useWorkspace()
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const courses = workspaceCourses.map(course => {
    const cohort = learners.filter(item => item.courseId === course.id)
    return { ...course, cohort, progress: cohort.length ? Math.round(cohort.reduce((sum, item) => sum + item.progress, 0) / cohort.length) : 0 }
  })
  const selected = courses.find(course => course.id === selectedId)
  const results = courses.filter(course => course.name.toLowerCase().includes(query.toLowerCase().trim()))
  return <DemoModuleShell module={getPlatformModule('lms')!}>
    <DemoKpis items={[{ label: 'Courses available', value: String(courses.length) }, { label: 'Active learners', value: String(learners.filter(item => item.status === 'active').length) }, { label: 'Average learner progress', value: `${Math.round(learners.reduce((sum, item) => sum + item.progress, 0) / Math.max(1, learners.length))}%` }]} />
    <div className={s.toolbar}><h2 style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontSize: 22, fontWeight: 600 }}>Learning, in motion.</h2><div className={s.searchField}><Search size={17} /><input type="search" aria-label="Search courses" placeholder="Find a course…" value={query} onChange={event => setQuery(event.target.value)} /></div></div>
    <div className={m.grid}>{results.map(course => <button className={`${m.card} ${s.courseButton}`} key={course.id} onClick={() => setSelectedId(course.id)}><span className={s.rowIcon} data-tone="blue"><BookOpen size={22} /></span><h3>{course.name}</h3><p className={m.meta}>{course.cohort.length} learners in the demo directory</p><div className={s.progress}><span><i style={{ width: `${course.progress}%` }} /></span>{course.progress}% average progress</div><span className={s.courseAction}>Explore course <ArrowRight size={16} /></span></button>)}</div>
    {!results.length && <div className={s.empty}><h3>No courses match that search.</h3><button className={s.textButton} onClick={() => setQuery('')}>Show all courses</button></div>}
    <WorkspaceDialog title={selected?.name || 'Course'} description="Sample course cohort · Latest learner enrolments" open={!!selected} onClose={() => setSelectedId(null)}>{selected && <div className={s.detailList}>{selected.cohort.length ? selected.cohort.map(learner => <div key={learner.id}><DemoAvatar seed={learner.name} name={learner.name} size={34} className={s.avatar} /><div><b>{learner.name}</b><small>{learner.progress}% complete · {learner.status}</small></div></div>) : <p className={s.empty}>No learners enrolled in this course yet. Try the Enrol student action to add one.</p>}<Link className={s.secondary} href="/platform/students">Open learner directory <ChevronRight size={16} /></Link></div>}</WorkspaceDialog>
  </DemoModuleShell>
}
