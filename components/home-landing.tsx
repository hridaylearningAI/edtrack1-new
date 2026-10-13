'use client'

import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import Image from 'next/image'
import { GeistSans } from 'geist/font/sans'
import { SignInButton } from '@clerk/nextjs'
import { gsap } from 'gsap'
import { useGSAP } from '@gsap/react'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { ArrowDown, ArrowLeft, ArrowRight, Expand, X } from 'lucide-react'
import { ROOM_CHAPTERS, type RoomDriver } from './home-room-story'
import styles from './home-landing.module.css'
import { HomePlatformDetails } from './home-platform-details'
import { HomeRoomSandbox, initialWorkspaceState, workspaceComplete } from './home-room-sandbox'

const Room = dynamic(() => import('./home-room-scene').then(m => m.HomeRoomScene), { ssr: false })
gsap.registerPlugin(useGSAP, ScrollTrigger)

export function HomeLanding() {
  const root = useRef<HTMLElement>(null)
  const tour = useRef<HTMLElement>(null)
  const driver = useRef<RoomDriver>({ progress: 0 })
  const bar = useRef<HTMLSpanElement>(null)
  const [chapter, setChapter] = useState(0)
  const [expanded, setExpanded] = useState(false)
  const paused = useRef(false)
  const [workspace, setWorkspace] = useState(initialWorkspaceState)
  const [previewChapter, setPreviewChapter] = useState(1)
  const [reduced, setReduced] = useState(false)
  const [roomFailed, setRoomFailed] = useState(false)
  const chapterRef = useRef(0)
  const dialog = useRef<HTMLDialogElement>(null)
  const current = ROOM_CHAPTERS[chapter]
  const final = chapter === ROOM_CHAPTERS.length - 1
  const update = (value: number) => {
    if (paused.current) return
    driver.current.progress = value
    driver.current.render?.()
    const next = Math.min(6, Math.floor(value + .001))
    if (next !== chapterRef.current) { chapterRef.current = next; setChapter(next) }
    if (bar.current) bar.current.style.transform = `scaleX(${value / 6.95})`
  }

  useGSAP(() => {
    const media = gsap.matchMedia()
    media.add('(prefers-reduced-motion: no-preference)', () => {
      setReduced(false)
      const state = { value: 0 }
      gsap.to(state, { value: 6.95, ease: 'none', onUpdate: () => update(state.value), scrollTrigger: { trigger: tour.current, start: 'top top', end: 'bottom bottom', scrub: .45, invalidateOnRefresh: true } })
    })
    media.add('(prefers-reduced-motion: reduce)', () => { setReduced(true); update(0) })
    let disposed = false
    let frame = 0
    const refresh = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => { if (!disposed) ScrollTrigger.refresh() })
    }
    const observer = new ResizeObserver(refresh)
    if (tour.current) observer.observe(tour.current)
    document.fonts.ready.then(() => { if (!disposed) refresh() })
    return () => { disposed = true; cancelAnimationFrame(frame); observer.disconnect(); media.revert() }
  }, { scope: root })

  function goTo(index: number) {
    const next = Math.max(0, Math.min(6, index))
    const progress = next === 0 ? 0 : next === 6 ? 6.94 : next + .8
    if (reduced) { update(progress); return }
    if (!tour.current) return
    const range = tour.current.offsetHeight - window.innerHeight
    const start = tour.current.getBoundingClientRect().top + window.scrollY
    window.scrollTo({ top: start + range * (progress / 6.95), behavior: 'smooth' })
  }
  useEffect(() => {
    if (!expanded) return
    const previous = document.documentElement.style.overflow
    document.documentElement.style.overflow = 'hidden'
    return () => { document.documentElement.style.overflow = previous }
  }, [expanded])
  function openPreview() {
    if (chapter < 1 || chapter > 5) return
    window.scrollTo({ top: window.scrollY, behavior: 'instant' as ScrollBehavior })
    paused.current = true
    setPreviewChapter(chapter); setExpanded(true); dialog.current?.showModal()
  }
  function closePreview() { dialog.current?.close(); paused.current = false; setExpanded(false) }
  function continueTour() {
    const next = workspaceComplete(previewChapter, workspace) ? previewChapter + 1 : chapter
    closePreview()
    if (next !== chapter) requestAnimationFrame(() => goTo(next))
  }
  const selectedPreview = ROOM_CHAPTERS[previewChapter]

  return <main ref={root} className={`${styles.home} ${GeistSans.variable}`} data-reduced={reduced} data-view={chapter > 0 && !final ? 'inside' : 'overview'}>
    <a href="#room-controls" className={styles.skip}>Skip to room navigation</a>
    <a href="#platform-details" className={styles.skip}>Skip walkthrough to platform details</a>
    <header className={styles.header}>
      <Link href="/" aria-label="EdTrack home" className={styles.brand}><Image src="/images/EdTrack1 logo.png" alt="EdTrack ONE" width={180} height={65} priority /></Link>
      <span className={styles.headerNote}>One institution. <span>Every possibility.</span></span>
      <div className={styles.headerActions}><SignInButton mode="modal"><button className={styles.login}>Log in</button></SignInButton><Link href="/demo" className={styles.demo}>Explore demo <ArrowRight size={16} /></Link></div>
    </header>
    <section ref={tour} className={styles.tour} aria-label="Explore the connected EdTrack institution">
      <div className={styles.stage}>
        <div className={styles.scene} aria-hidden="true"><Room driver={driver} onError={() => setRoomFailed(true)} onScreenOpen={openPreview} />
          {roomFailed && <div className={styles.roomFallback}><Image src={chapter > 0 && !final ? `/images/landing/product/${current.preview}.jpg` : "/images/landing/campus-architecture.jpg"} alt="" fill sizes="100vw" /><span>Your connected institution</span></div>}
        </div>
        <div className={styles.roomLabel}><i /><span>A GUIDED WORKSPACE TOUR</span><small>{String(chapter + 1).padStart(2, '0')} / 07</small></div>
        <article className={styles.story} style={{ '--chapter-color': current.color } as React.CSSProperties}>
          <div key={chapter} className={styles.storyContent}>
            <p className={styles.eyebrow}>{current.eyebrow}</p>
            {chapter === 0 ? <h1>{current.title.split('\n').map((line, i) => <span key={line} className={i === 1 ? styles.accent : ''}>{i > 0 ? ' ' : ''}{line}</span>)}</h1> : <h2>{current.title.split('\n').map((line, i) => <span key={line} className={i === 1 ? styles.accent : ''}>{i > 0 ? ' ' : ''}{line}</span>)}</h2>}
            <p className={styles.description}>{current.description}</p>
            {(chapter === 0 || final) ? <div className={styles.introActions}><Link href="/demo" className={styles.demo}>Explore the demo <ArrowRight size={16} /></Link><button className={styles.textAction} onClick={() => goTo(final ? 0 : 1)}>{final ? 'Explore again' : 'Take a look around'}{final ? <ArrowLeft size={15} /> : <ArrowDown size={15} />}</button>{final && <a className={styles.textAction} href="#platform-details">Keep exploring <ArrowDown size={15}/></a>}</div> : <button className={styles.screenAction} onClick={openPreview} aria-label={`Open ${current.label} screen`}><Expand size={14} /><span>Try this workspace</span><small>Demo data</small></button>}

            {chapter > 0 && !final && <p className={styles.benefit}><span className={styles.connectionDot} />{current.benefit}</p>}
          </div>
        </article>
        <div className={styles.connection} key={`connection-${chapter}`}><span>CONNECTED BY DESIGN</span><p>{current.connection}</p></div>
        {chapter === 0 && <button className={styles.scrollHint} onClick={() => goTo(1)}><span>Scroll to step inside</span><ArrowDown size={16} /></button>}
        {final && <span className={styles.endNote}>Your people. Your learning. Your operations.</span>}
        <nav id="room-controls" className={styles.controls} aria-label="Room chapters">
          <div className={styles.progress}><span ref={bar} /></div>
          <div className={styles.chapterList}>{ROOM_CHAPTERS.map((item, index) => <button key={item.label} aria-current={chapter === index ? 'step' : undefined} onClick={() => goTo(index)}><span>{String(index + 1).padStart(2, '0')}</span>{item.label}</button>)}</div>
          <div className={styles.mobileControls}><button disabled={chapter === 0} aria-label="Previous chapter" onClick={() => goTo(chapter - 1)}><ArrowLeft size={18}/></button><span>{String(chapter + 1).padStart(2,'0')} / 07 <b>{current.label}</b></span><button disabled={final} aria-label="Next chapter" onClick={() => goTo(chapter + 1)}><ArrowRight size={18}/></button></div>
        </nav>
      </div>
    </section>
    <HomePlatformDetails/>
    <dialog ref={dialog} className={`${styles.dialog} ${styles.workspaceDialog}`} onCancel={closePreview} onClose={() => { paused.current = false; setExpanded(false) }} onClick={event => { if(event.target === event.currentTarget) closePreview() }} aria-label={`${selectedPreview.label} guided workspace`}>
      <div className={styles.dialogHeader}><div><strong>{selectedPreview.label}</strong><p>Guided sandbox · Sample data · No sign-in needed</p></div><button onClick={closePreview} aria-label="Return to the room"><X size={21}/></button></div>
      {expanded && <HomeRoomSandbox station={previewChapter} state={workspace} onChange={patch => setWorkspace(previous => ({ ...previous, ...patch }))} onVisit={setPreviewChapter} onContinue={continueTour}/>}
      <div className={styles.dialogFooter}><span>Ready to explore more?</span><Link href="/demo" className={styles.demo}>Explore full demo <ArrowRight size={16}/></Link></div>
    </dialog>
  </main>
}
