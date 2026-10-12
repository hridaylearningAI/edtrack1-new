'use client'

import { useRef, useState } from 'react'
import { useGSAP } from '@gsap/react'
import { gsap } from 'gsap'
import { ArrowRight, Check, CheckCircle2, GraduationCap, UserRound, ReceiptText, ShieldCheck, FileCheck2 } from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import s from './home-room-sandbox.module.css'

export type TourWorkspaceState = {
  studentOpened: boolean; enrolmentReviewed: boolean; lessonOpened: boolean; lessonComplete: boolean
  invoiceOpened: boolean; invoiceReviewed: boolean; portalViewed: boolean; recordReviewed: boolean
}
export const initialWorkspaceState: TourWorkspaceState = {
  studentOpened: false, enrolmentReviewed: false, lessonOpened: false, lessonComplete: false,
  invoiceOpened: false, invoiceReviewed: false, portalViewed: false, recordReviewed: false,
}
export function workspaceComplete(station: number, state: TourWorkspaceState) {
  return [false, state.enrolmentReviewed, state.lessonComplete, state.invoiceReviewed, state.portalViewed, state.recordReviewed][station] ?? false
}
const tasks = [
  { title: '', instruction: '', connection: '' },
  { title: 'Start with one student record', instruction: 'Find Leah Chen, open her record and review her enrolment.', connection: 'This same record follows Leah into learning, finance and completion.' },
  { title: 'Follow the learning journey', instruction: 'Open Leah’s activity, read the example and mark it complete.', connection: 'Her activity status will also appear in the student portal and completion evidence.' },
  { title: 'Understand what needs attention', instruction: 'Open Leah’s invoice and review its balance and payment history.', connection: 'Finance uses Leah’s existing student record. There is no second profile to reconcile.' },
  { title: 'See the student’s perspective', instruction: 'Switch from administrator to student and open Leah’s learning overview.', connection: 'Each role sees the information relevant to them, from the same underlying record.' },
  { title: 'Bring the evidence together', instruction: 'Review Leah’s enrolment and activity evidence, then finish the walkthrough.', connection: 'The student record and learning evidence are available together at completion.' },
]
const modules = ['Students', 'Learning', 'Fees', 'Portals', 'Records']
const icons = [UserRound, GraduationCap, ReceiptText, ShieldCheck, FileCheck2]

gsap.registerPlugin(useGSAP)
export function HomeRoomSandbox({ station, state, onChange, onContinue, onVisit }: {
  station: number; state: TourWorkspaceState; onChange: (patch: Partial<TourWorkspaceState>) => void
  onContinue: () => void; onVisit: (station: number) => void
}) {
  const root = useRef<HTMLDivElement>(null)
  const [query, setQuery] = useState('')
  const [role, setRole] = useState<'Administrator' | 'Student'>('Administrator')
  const task = tasks[station]
  const complete = workspaceComplete(station, state)
  const count = [1, 2, 3, 4, 5].filter(item => workspaceComplete(item, state)).length
  useGSAP(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    gsap.from(root.current, { opacity: 0, y: 10, duration: .24, ease: 'power2.out' })
  }, { scope: root })
  const status = (done: boolean) => <span className={s.status} data-done={done}>{done ? <Check size={12}/> : <span className={s.dot}/>} {done ? 'Reviewed' : 'To review'}</span>
  return <div ref={root} className={s.sandbox}>
    <aside className={s.sidebar} aria-label="Guided workspace modules"><span className={s.workspace}>E<span>EdTrack workspace<small>Interactive sample</small></span></span><p>YOUR CONNECTED SYSTEM</p><nav>{modules.map((name, i) => {
      const Icon = icons[i]; return <button key={name} onClick={() => onVisit(i + 1)} aria-current={station === i + 1 ? 'page' : undefined}><Icon size={17}/><span>{name}</span>{workspaceComplete(i + 1, state) && <Check size={14}/>}</button>
    })}</nav><div className={s.trail}><span>{count} of 5 tasks explored</span><progress value={count} max={5} aria-label="Guided tasks completed"/><small>Progress stays with you during this visit.</small></div></aside>
    <div className={s.main}>
      <div className={s.task}><span className={s.kicker}>GUIDED TASK {String(station).padStart(2, '0')} / 05</span><h2>{task.title}</h2><p>{task.instruction}</p></div>
      <div className={s.identity}><span className={s.avatar}>LC</span><div><strong>Leah Chen</strong><small>STU-1045 · Business leadership · Sample student</small></div><span className={s.chip}>Enrolled</span></div>
      <section className={s.panel} aria-label={`${modules[station - 1]} sample workspace`}>
        {station === 1 && <><div className={s.panelHeading}><h3>Student directory</h3><span>1 sample record</span></div><label className={s.search}>Find a student<Input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search name or student ID" /></label>{!query || 'leah chen stu-1045'.includes(query.toLowerCase().trim()) ? <button className={s.studentRow} onClick={() => onChange({ studentOpened: true })}><span className={s.avatar}>LC</span><span><strong>Leah Chen</strong><small>STU-1045 · Business leadership</small></span><span>Open record <ArrowRight size={15}/></span></button> : <p className={s.empty}>No matching sample student. Try “Leah” or “1045”.</p>}{state.studentOpened && <div className={s.detail}><div className={s.panelHeading}><h3>Enrolment details</h3>{status(state.enrolmentReviewed)}</div><dl><div><dt>Course</dt><dd>Business leadership</dd></div><div><dt>Delivery</dt><dd>Blended learning</dd></div><div><dt>Student contact</dt><dd>leah.chen@example.com</dd></div><div><dt>Linked workspaces</dt><dd>Learning, fees & records</dd></div></dl><Button onClick={() => onChange({ enrolmentReviewed: true })} disabled={state.enrolmentReviewed}>{state.enrolmentReviewed ? 'Enrolment reviewed' : 'Review enrolment'}<Check size={15}/></Button></div>}</>}
        {station === 2 && <><div className={s.panelHeading}><h3>Business leadership</h3><span>Learning & assessments</span></div><div className={s.lessonRow}><span className={s.lessonIcon}><GraduationCap size={25}/></span><div><h4>Giving constructive feedback</h4><p>Sample learning activity · Approximately 1 minute</p></div><span className={s.chip}>{state.lessonComplete ? 'Complete' : 'Ready to start'}</span></div>{!state.lessonOpened ? <Button onClick={() => onChange({ lessonOpened: true })}>Open activity <ArrowRight size={15}/></Button> : <div className={s.detail}><span className={s.kicker}>LEARNING NOTE · 01</span><h3>Make feedback useful</h3><p>Describe the situation, explain the behaviour you observed and share its impact. Finish with a specific next step you can agree on together.</p><blockquote>“In yesterday’s team meeting, you summarised our next steps clearly. It helped everyone understand their responsibilities. Let’s use that approach again next week.”</blockquote><Button onClick={() => onChange({ lessonComplete: true })} disabled={state.lessonComplete}>{state.lessonComplete ? 'Activity completed' : 'Mark activity complete'}<Check size={15}/></Button><small className={s.note}>This completes a sample activity, not a course or qualification.</small></div>}</>}
        {station === 3 && <><div className={s.panelHeading}><h3>Invoices</h3><span>Sample amounts · AUD</span></div><button className={s.studentRow} onClick={() => onChange({ invoiceOpened: true })}><ReceiptText size={23}/><span><strong>INV-1045</strong><small>Leah Chen · Business leadership</small></span><span>$650 due <ArrowRight size={15}/></span></button>{state.invoiceOpened && <div className={s.detail}><div className={s.panelHeading}><h3>Invoice breakdown</h3>{status(state.invoiceReviewed)}</div><dl><div><dt>Course fee</dt><dd>$1,200.00</dd></div><div><dt>Payment received</dt><dd>$550.00</dd></div><div><dt>Balance remaining</dt><dd>$650.00</dd></div><div><dt>Status</dt><dd>Partially paid</dd></div></dl><p>One payment of $550 is recorded against Leah’s student account. The outstanding balance stays visible to the administration team.</p><Button onClick={() => onChange({ invoiceReviewed: true })} disabled={state.invoiceReviewed}>{state.invoiceReviewed ? 'Invoice reviewed' : 'Review invoice'}<Check size={15}/></Button><small className={s.note}>Illustrative payment history. No payment will be taken.</small></div>}</>}
        {station === 4 && <><div className={s.panelHeading}><h3>Role preview</h3><span>Same student. Different perspective.</span></div><div className={s.roles} aria-label="Preview role">{(['Administrator', 'Student'] as const).map(item => <button key={item} aria-pressed={role === item} onClick={() => setRole(item)}>{item}</button>)}</div>{role === 'Administrator' ? <div className={s.detail}><h3>Your institution view</h3><p>Review Leah’s enrolment, learning activity and fee balance from one record.</p><dl><div><dt>Enrolment</dt><dd>Active</dd></div><div><dt>Sample activity</dt><dd>{state.lessonComplete ? 'Complete' : 'Ready to start'}</dd></div><div><dt>Fee balance</dt><dd>$650.00</dd></div></dl><p className={s.note}>Select Student above to see Leah’s perspective.</p></div> : <div className={s.detail}><span className={s.kicker}>LEAH’S STUDENT PORTAL</span><h3>Welcome back, Leah.</h3><p>Your Business leadership course is ready.</p><div className={s.lessonRow}><GraduationCap size={24}/><div><h4>Giving constructive feedback</h4><p>{state.lessonComplete ? 'Complete — updated from the learning workspace.' : 'Ready to start — the same activity from the learning workspace.'}</p></div></div><Button onClick={() => onChange({ portalViewed: true })} disabled={state.portalViewed}>{state.portalViewed ? 'Learning overview viewed' : 'View learning overview'}<ArrowRight size={15}/></Button>{state.portalViewed && <p className={s.note}>Leah sees her own learning information. The administrator has a broader institution view.</p>}</div>}</>}
        {station === 5 && <><div className={s.panelHeading}><h3>Completion evidence</h3><span>Leah Chen · STU-1045</span></div><div className={s.evidence}><div><FileCheck2 size={20}/><span><strong>Enrolment record</strong><small>Business leadership · Active enrolment</small></span>{status(state.enrolmentReviewed)}</div><div><GraduationCap size={20}/><span><strong>Sample learning activity</strong><small>Giving constructive feedback</small></span><span className={s.chip}>{state.lessonComplete ? 'Complete' : 'Not yet complete'}</span></div></div><p className={s.note}>This guided example shows how evidence connects. Course completion and certificate eligibility require the full assessment workflow in the platform.</p>{!state.lessonComplete ? <Button variant="outline" onClick={() => onVisit(2)}>Try the learning task first <ArrowRight size={15}/></Button> : <Button onClick={() => onChange({ recordReviewed: true })} disabled={state.recordReviewed}>{state.recordReviewed ? 'Evidence reviewed' : 'Review connected evidence'}<Check size={15}/></Button>}</>}
      </section>
      <div className={s.handoff} aria-live="polite">{complete ? <><CheckCircle2 size={21}/><div><strong>Task complete</strong><p>{task.connection}</p></div></> : <><span className={s.connectionLine}/><p>{task.connection}</p></>}</div>
      <footer className={s.footer}><span>Sample data · Changes last for this visit only</span><Button onClick={onContinue}>{complete ? station === 5 ? 'See the whole system' : 'Continue the room tour' : 'Return to the room'}<ArrowRight size={16}/></Button></footer>
    </div>
  </div>
}
