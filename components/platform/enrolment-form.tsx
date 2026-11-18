'use client'

import { useState, type FormEvent } from 'react'
import { ArrowRight, CheckCircle2 } from 'lucide-react'
import { workspaceCourses } from '@/lib/demo-workspace'
import { useWorkspace } from './workspace-state'
import { WorkspaceDialog } from './workspace-dialog'
import s from './workspace.module.css'

export function EnrolmentForm({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { enrol } = useWorkspace()
  const [error, setError] = useState('')
  const [created, setCreated] = useState('')
  function close() { setError(''); setCreated(''); onClose() }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    try {
      const learner = enrol({ name: String(data.get('name') || ''), email: String(data.get('email') || ''), courseId: Number(data.get('course')) })
      setError(''); setCreated(learner.name)
    } catch (issue) { setError(issue instanceof Error ? issue.message : 'Could not create the sample enrolment. Try again.') }
  }
  return <WorkspaceDialog title={created ? 'A new chapter begins.' : 'Enrol a learner.'} description="Demo only · Use fictional details. Changes last until you refresh." open={open} onClose={close}>
    {created ? <div className={s.success}><CheckCircle2 size={38} /><h3>{created} is enrolled.</h3><p>The student directory, overview and pending invoice have been updated in this demo session.</p><button className={s.primary} onClick={close}>Back to your workspace <ArrowRight size={17} /></button></div> : <form onSubmit={submit} className={s.form}>
      <label>Full name<input name="name" autoComplete="off" minLength={2} maxLength={100} placeholder="e.g. Taylor Morgan" required /></label>
      <label>Email address<input name="email" type="email" autoComplete="off" maxLength={254} placeholder="taylor@example.com" required /></label>
      <label>Course<select name="course" required defaultValue=""><option value="" disabled>Select a course</option>{workspaceCourses.map(course => <option key={course.id} value={course.id}>{course.name}</option>)}</select></label>
      {error && <p role="alert" className={s.error}>{error}</p>}
      <div className={s.formActions}><button type="button" className={s.secondary} onClick={close}>Cancel</button><button className={s.primary} type="submit">Create sample enrolment <ArrowRight size={17} /></button></div>
    </form>}
  </WorkspaceDialog>
}
