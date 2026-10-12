'use client'

import { useRef, useState } from 'react'
import { useGSAP } from '@gsap/react'
import { gsap } from 'gsap'
import { ArrowRight, BookOpen, Check, ChevronRight, GraduationCap, Play, Users, Wallet } from 'lucide-react'
import styles from './connected-workspace.module.css'

if (typeof window !== 'undefined') gsap.registerPlugin(useGSAP)

const chapters = [
  { label: 'Enrol', title: 'One student record.', description: 'Start with the learner. Keep their enrolment and course together.', icon: Users, area: 'Student management' },
  { label: 'Learn', title: 'A clear next step.', description: 'The same learner. Their course, content and progress, ready to explore.', icon: BookOpen, area: 'Learning workspace' },
  { label: 'Manage', title: 'The whole picture.', description: 'Bring the learning journey and administrative record into the same view.', icon: Wallet, area: 'Campus operations' },
]

export function ConnectedWorkspace() {
  const [chapter, setChapter] = useState(0)
  const root = useRef<HTMLDivElement>(null)
  const stage = useRef<HTMLDivElement>(null)
  const indicator = useRef<HTMLSpanElement>(null)
  const pointer = useRef(false)
  const previous = useRef(0)

  useGSAP(() => {
    const direction = chapter >= previous.current ? 1 : -1
    previous.current = chapter
    const media = gsap.matchMedia()
    media.add('(prefers-reduced-motion: no-preference)', () => {
      if (!pointer.current) return
      // The shared learner record stays still. Only the workspace changes.
      const sequence = gsap.timeline({ defaults: { ease: 'power3.inOut' } })
        .fromTo(stage.current, { clipPath: direction > 0 ? 'inset(0 100% 0 0 round 16px)' : 'inset(0 0 0 100% round 16px)' },
          { clipPath: 'inset(0 0% 0 0% round 16px)', duration: .48, clearProps: 'clipPath' }, 0)
        .from('[data-record-row]', { x: direction * 12, opacity: .35, duration: .28, stagger: .045, clearProps: 'transform,opacity' }, .15)
      const finish = () => sequence.progress(1)
      root.current?.addEventListener('focusin', finish)
      return () => root.current?.removeEventListener('focusin', finish)
    })
    return () => media.revert()
  }, { scope: root, dependencies: [chapter], revertOnUpdate: true })

  useGSAP(() => {
    const media = gsap.matchMedia()
    media.add('(prefers-reduced-motion: no-preference)', () => {
      if (!pointer.current) return
      gsap.fromTo(indicator.current, { scaleX: .65 }, { scaleX: 1, duration: .35, ease: 'power3.out', clearProps: 'transform' })
    })
    return () => media.revert()
  }, { scope: root, dependencies: [chapter], revertOnUpdate: true })

  const Icon = chapters[chapter].icon
  return <div ref={root} className={styles.film}>
    <div className={styles.chapters} role="tablist" aria-label="Explore a connected student journey">
      {chapters.map((item, index) => <button key={item.label} id={`journey-tab-${index}`} role="tab" aria-selected={chapter === index} aria-controls="journey-scene" tabIndex={chapter === index ? 0 : -1} onClick={event => { pointer.current = event.detail !== 0; setChapter(index) }} onKeyDown={event => {
        const next = event.key === 'ArrowRight' ? (chapter + 1) % 3 : event.key === 'ArrowLeft' ? (chapter + 2) % 3 : event.key === 'Home' ? 0 : event.key === 'End' ? 2 : null
        if (next === null) return
        event.preventDefault(); pointer.current = false; setChapter(next)
        root.current?.querySelector<HTMLButtonElement>(`#journey-tab-${next}`)?.focus()
      }}><span>0{index + 1}</span>{item.label}{index === chapter && <span ref={indicator} className={styles.indicator} />}</button>)}
    </div>
    <div className={styles.storyHeading}><h3>{chapters[chapter].title}</h3><p>{chapters[chapter].description}</p></div>
    <div className={styles.window}>
      <div className={styles.toolbar}><span><i /><i /><i /></span><b>EdTrack ONE</b><small>Illustrative product walkthrough</small></div>
      <div className={styles.workspace}>
        <aside className={styles.record}><div className={styles.recordLabel}>THE CONNECTED RECORD</div><div className={styles.avatar}>JL</div><h4>Jamie Lee</h4><p>Example learner</p><div className={styles.recordDetails}><span>Course</span><strong>Critical thinking</strong><span>Enrolment</span><strong><i /> Active</strong></div><div className={styles.recordLink}><GraduationCap size={16} /><span>One learner.<br />Every workspace.</span></div></aside>
        <div className={styles.scene} role="tabpanel" id="journey-scene" aria-labelledby={`journey-tab-${chapter}`} tabIndex={0}>
          <div className={styles.sceneHeader}><span><Icon size={17} />{chapters[chapter].area}</span><span>Jamie Lee <ChevronRight size={13} /></span></div>
          <div ref={stage} className={styles.stage}>
            {chapter === 0 && <><div className={styles.screenTitle}><span>STUDENT MANAGEMENT</span><h4>A good beginning.</h4><p>The details your team needs, in one place.</p></div><div className={styles.profileGrid}><div data-record-row><span>Student</span><strong>Jamie Lee</strong></div><div data-record-row><span>Course</span><strong>Critical thinking</strong></div><div data-record-row><span>Study mode</span><strong>Online</strong></div><div data-record-row><span>Status</span><strong className={styles.green}><Check size={14} /> Enrolled</strong></div></div><div className={styles.receipt} data-record-row><Users size={19} /><div><b>A shared starting point</b><p>Student profile and course enrolment connected.</p></div><Check size={18} /></div></>}
            {chapter === 1 && <><div className={styles.screenTitle}><span>LEARNING WORKSPACE</span><h4>Make the next step clear.</h4><p>Critical thinking · Topic 01</p></div><div className={styles.lesson}><div className={styles.lessonCover} aria-hidden="true"><BookOpen size={42} strokeWidth={1} /><span>01</span></div><div><small>CONTINUE LEARNING</small><h5>Foundations of critical thinking</h5><p>Notes, activities and assessment in sequence.</p></div></div><div className={styles.lessonRows}><div data-record-row><Check size={16} /><span>Introduction</span><small>Complete</small></div><div data-record-row><Play size={16} /><span>Learning notes</span><small>Up next</small></div><div data-record-row><BookOpen size={16} /><span>Practice activity</span><small>Then explore</small></div></div></>}
            {chapter === 2 && <><div className={styles.screenTitle}><span>CAMPUS OPERATIONS</span><h4>Details that stay connected.</h4><p>A shared view across your team.</p></div><div className={styles.summary}><span className={styles.summaryIcon}><GraduationCap size={27} /></span><div><h5>Jamie Lee</h5><p>Critical thinking · Online</p></div><span className={styles.status}>Active learner</span></div><div className={styles.operationRows}>{[['Student record','Profile complete'],['Course delivery','Learning in progress'],['Fee administration','Record available']].map(([label,status])=><div key={label} data-record-row><span>{label}</span><strong>{status}</strong><Check size={15}/></div>)}</div><p className={styles.footnote}>A connected view of learning and administration.</p></>}
          </div>
        </div>
      </div>
    </div>
    <div className={styles.caption}><span>Follow one learner through three connected workspaces.</span><button type="button" onClick={event=>{pointer.current=event.detail!==0;setChapter((chapter+1)%3)}}>{chapter === 2 ? 'Start again' : `Next: ${chapters[chapter+1].label}`}<ArrowRight size={16}/></button></div>
  </div>
}
