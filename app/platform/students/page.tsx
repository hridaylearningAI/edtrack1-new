'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { ArrowRight, ChevronDown, Search, Users } from 'lucide-react'
import { DemoAvatar } from '@/components/demo-avatar'
import { DidacPortalShell } from '@/components/portal/didac-portal-shell'
import { WorkspaceDialog } from '@/components/platform/workspace-dialog'
import { EnrolmentForm } from '@/components/platform/enrolment-form'
import { useWorkspace } from '@/components/platform/workspace-state'
import { PLATFORM_ICONS } from '@/components/platform/platform-icons'
import { money, type DemoLearner } from '@/lib/demo-workspace'
import s from '@/components/platform/workspace.module.css'

const directorySections = [
  {
    label: 'Demo directory',
    items: [
      { title: 'Learner directory', href: '/platform/students', icon: PLATFORM_ICONS.students },
      { title: 'Learning preview', href: '/platform/modules/lms', icon: PLATFORM_ICONS.learning },
      { title: 'Fees preview', href: '/platform/modules/fees', icon: PLATFORM_ICONS.fees },
    ],
  },
  {
    label: 'Portals',
    items: [
      { title: 'Admin SMS', href: '/admin', icon: PLATFORM_ICONS.docs },
      { title: 'Student portal', href: '/student', icon: PLATFORM_ICONS.students },
    ],
  },
]

function StudentDirectory() {
  const params = useSearchParams()
  const { learners, invoices } = useWorkspace()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState(params.get('status') || 'all')
  const [thisMonth, setThisMonth] = useState(params.get('period') === 'month')
  const [enrolling, setEnrolling] = useState(false)
  const [selected, setSelected] = useState<DemoLearner | null>(null)
  const [sort, setSort] = useState('recent')
  const [limit, setLimit] = useState(12)
  const statusParam = params.get('status') || 'all'
  const periodParam = params.get('period')
  useEffect(() => { setFilter(statusParam); setThisMonth(periodParam === 'month'); setLimit(12) }, [statusParam, periodParam])
  const month = new Date().toISOString().slice(0, 7)
  const results = learners.filter(item => (filter === 'all' || item.status === filter) && (!thisMonth || item.joined.startsWith(month)) && `${item.name} ${item.email} ${item.course}`.toLowerCase().includes(query.trim().toLowerCase())).sort((a, b) => sort === 'name' ? a.name.localeCompare(b.name) : b.joined.localeCompare(a.joined))
  const pendingInvoice = selected ? invoices.filter(item => item.studentId === selected.id && item.status === 'pending').reduce((sum, item) => sum + item.amount, 0) : 0
  return <DidacPortalShell brandTitle="EdTrack ONE" brandSubtitle="Learner directory" brandHref="/platform" showPlatformMap showCommandPalette sections={directorySections}><div className={s.pageHeading}><div><h1>Learner directory</h1><p>Your learners, their progress, one shared record.</p></div><button className={s.primary} onClick={() => setEnrolling(true)}>Enrol student <ArrowRight size={18} /></button></div>
    <div className={s.toolbar}><div className={s.searchField}><Search size={17} /><input type="search" aria-label="Search students" placeholder="Search name, email or course…" value={query} onChange={event => { setQuery(event.target.value); setLimit(12) }} /></div><div className={s.filters} role="group" aria-label="Student status">{['all', 'active', 'pending', 'completed'].map(value => <button key={value} aria-pressed={filter === value} onClick={() => { setFilter(value); setLimit(12) }}>{value === 'all' ? 'All learners' : value.charAt(0).toUpperCase() + value.slice(1)}</button>)}</div><label><span className={s.srOnly}>Sort students</span><select value={sort} onChange={event => setSort(event.target.value)}><option value="recent">Newest first</option><option value="name">Name A–Z</option></select></label></div>
    {thisMonth && <p className={s.notice}>Showing enrolments this month. <button className={s.textButton} onClick={() => setThisMonth(false)}>Show all dates</button></p>}
    <div className={s.tableWrap}>{results.length ? <table className={s.table}><thead><tr><th scope="col">Learner</th><th scope="col">Course</th><th scope="col">Status</th><th scope="col">Progress</th><th scope="col">Enrolled</th><th scope="col"><span className={s.srOnly}>View record</span></th></tr></thead><tbody>{results.slice(0, limit).map(learner => <tr key={learner.id}><td><button className={s.nameButton} onClick={() => setSelected(learner)}><DemoAvatar seed={learner.name} name={learner.name} size={34} className={s.avatar} /><span><b>{learner.name}</b><small>{learner.email}</small></span></button></td><td className={s.courseCell}>{learner.course}</td><td><span className={s.status} data-tone={learner.status === 'pending' ? 'blue' : learner.status === 'cancelled' ? 'red' : 'green'}>{learner.status}</span></td><td><span className={s.progress}><span><i style={{ width: `${learner.progress}%` }} /></span>{learner.progress}%</span></td><td>{new Date(`${learner.joined}T12:00:00`).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}</td><td><button className={s.iconButton} aria-label={`View ${learner.name}`} onClick={() => setSelected(learner)}><ArrowRight size={16} /></button></td></tr>)}</tbody></table> : <div className={s.empty}><Users size={28} style={{ margin: '0 auto 18px' }} /><h3>No learners in this view.</h3><p>Try another name or view all learner records.</p><button className={s.textButton} onClick={() => { setQuery(''); setFilter('all'); setThisMonth(false) }}>Clear filters <ArrowRight size={14} /></button></div>}</div>
    <div className={s.toolbar}><p className={s.count} role="status">Showing {Math.min(limit, results.length)} of {results.length} sample learners</p>{limit < results.length && <button className={s.secondary} onClick={() => setLimit(value => value + 12)}>Show more learners <ChevronDown size={16} /></button>}</div>
    <EnrolmentForm open={enrolling} onClose={() => setEnrolling(false)} />
    <WorkspaceDialog title={selected?.name || 'Learner record'} description="Sample learner record · Institution workspace" open={!!selected} onClose={() => setSelected(null)}>{selected && <><dl className={s.recordFacts}><div><dt>Email</dt><dd>{selected.email}</dd></div><div><dt>Status</dt><dd><span className={s.status}>{selected.status}</span></dd></div><div><dt>Course</dt><dd>{selected.course}</dd></div><div><dt>Learning progress</dt><dd>{selected.progress}% complete</dd></div><div><dt>Enrolled</dt><dd>{selected.joined}</dd></div><div><dt>Outstanding fees</dt><dd>{money(pendingInvoice)}</dd></div></dl><p className={s.notice}>Updates made in this demo session reset when you refresh.</p></>}</WorkspaceDialog>
  </DidacPortalShell>
}

export default function StudentsPage() { return <Suspense fallback={<p>Opening student directory…</p>}><StudentDirectory /></Suspense> }
