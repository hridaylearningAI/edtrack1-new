'use client'

import { useCallback, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import Image from 'next/image'
import { GeistSans } from 'geist/font/sans'
import { gsap } from 'gsap'
import { useGSAP } from '@gsap/react'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react'
import { ROOM_CHAPTERS, type RoomDriver } from './home-room-story'
import styles from './home-landing.module.css'
import { HomePlatformDetails } from './home-platform-details'
import {
  HomeTourLiveScreen,
  type TourScreenStation,
} from './home-tour-live-screen'
import type { RoomScreenFrame } from './home-room-scene'

const Room = dynamic(() => import('./home-room-scene').then((m) => m.HomeRoomScene), {
  ssr: false,
})
gsap.registerPlugin(useGSAP, ScrollTrigger)

export function HomeLanding() {
  const root = useRef<HTMLElement>(null)
  const tour = useRef<HTMLElement>(null)
  const driver = useRef<RoomDriver>({ progress: 0 })
  const bar = useRef<HTMLSpanElement>(null)
  const [chapter, setChapter] = useState(0)
  const [reduced, setReduced] = useState(false)
  const [roomFailed, setRoomFailed] = useState(false)
  const [screenFrame, setScreenFrame] = useState<RoomScreenFrame>({
    visible: false,
    chapter: 0,
    left: 0,
    top: 0,
    width: 0,
    height: 0,
  })
  const chapterRef = useRef(0)
  const frameRef = useRef(screenFrame)
  const current = ROOM_CHAPTERS[chapter]
  const final = chapter === ROOM_CHAPTERS.length - 1

  const update = (value: number) => {
    driver.current.progress = value
    driver.current.render?.()
    const next = Math.min(6, Math.floor(value + 0.001))
    if (next !== chapterRef.current) {
      chapterRef.current = next
      setChapter(next)
    }
    if (bar.current) bar.current.style.transform = `scaleX(${value / 6.95})`
  }

  const onScreenFrame = useCallback((frame: RoomScreenFrame) => {
    const prev = frameRef.current
    const changed =
      prev.visible !== frame.visible ||
      prev.chapter !== frame.chapter ||
      Math.abs(prev.left - frame.left) > 1.5 ||
      Math.abs(prev.top - frame.top) > 1.5 ||
      Math.abs(prev.width - frame.width) > 2 ||
      Math.abs(prev.height - frame.height) > 2
    if (!changed) return
    frameRef.current = frame
    setScreenFrame(frame)
  }, [])

  useGSAP(() => {
    const media = gsap.matchMedia()
    media.add('(prefers-reduced-motion: no-preference)', () => {
      setReduced(false)
      const state = { value: 0 }
      gsap.to(state, {
        value: 6.95,
        ease: 'none',
        onUpdate: () => update(state.value),
        scrollTrigger: {
          trigger: tour.current,
          start: 'top top',
          end: 'bottom bottom',
          scrub: 0.45,
          invalidateOnRefresh: true,
        },
      })
    })
    media.add('(prefers-reduced-motion: reduce)', () => {
      setReduced(true)
      update(0)
    })
    let disposed = false
    let frame = 0
    const refresh = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        if (!disposed) ScrollTrigger.refresh()
      })
    }
    const observer = new ResizeObserver(refresh)
    if (tour.current) observer.observe(tour.current)
    document.fonts.ready.then(() => {
      if (!disposed) refresh()
    })
    return () => {
      disposed = true
      cancelAnimationFrame(frame)
      observer.disconnect()
      media.revert()
    }
  }, { scope: root })

  function goTo(index: number) {
    const next = Math.max(0, Math.min(6, index))
    const progress = next === 0 ? 0 : next === 6 ? 6.94 : next + 0.8
    if (reduced) {
      update(progress)
      return
    }
    if (!tour.current) return
    const range = tour.current.offsetHeight - window.innerHeight
    const start = tour.current.getBoundingClientRect().top + window.scrollY
    window.scrollTo({ top: start + range * (progress / 6.95), behavior: 'smooth' })
  }

  const liveStation =
    chapter >= 1 && chapter <= 5 ? (chapter as TourScreenStation) : null
  const showMonitor =
    !roomFailed &&
    screenFrame.visible &&
    liveStation !== null &&
    screenFrame.chapter === liveStation

  return (
    <main
      ref={root}
      className={`${styles.home} ${GeistSans.variable}`}
      data-reduced={reduced}
      data-view={chapter > 0 && !final ? 'inside' : 'overview'}
    >
      <a href="#room-controls" className={styles.skip}>
        Skip to room navigation
      </a>
      <a href="#platform-details" className={styles.skip}>
        Skip walkthrough to platform details
      </a>
      <header className={styles.header}>
        <Link href="/" aria-label="EdTrack home" className={styles.brand}>
          <Image src="/images/EdTrack1 logo.png" alt="EdTrack ONE" width={180} height={65} priority />
        </Link>
        <span className={styles.headerNote}>
          One institution. <span>Every possibility.</span>
        </span>
        <div className={styles.headerActions}>
          <a href="#show-interest" className={styles.login}>
            Show interest
          </a>
          <Link href="/demo" className={styles.demo}>
            Explore demo <ArrowRight size={16} />
          </Link>
        </div>
      </header>
      <section
        ref={tour}
        className={styles.tour}
        aria-label="Explore the connected EdTrack institution"
      >
        <div className={styles.stage}>
          <div className={styles.scene} aria-hidden="true">
            <Room
              driver={driver}
              onError={() => setRoomFailed(true)}
              onScreenFrame={onScreenFrame}
            />
            {showMonitor && liveStation ? (
              <div
                className={styles.liveMonitor}
                style={{
                  left: screenFrame.left,
                  top: screenFrame.top,
                  width: screenFrame.width,
                  height: screenFrame.height,
                }}
              >
                <HomeTourLiveScreen
                  station={liveStation}
                  mode="monitor"
                  width={screenFrame.width}
                  height={screenFrame.height}
                />
              </div>
            ) : null}
            {roomFailed && (
              <div className={styles.roomFallback}>
                <Image
                  src={
                    chapter > 0 && !final
                      ? `/images/landing/product/${current.preview}.jpg`
                      : '/images/landing/campus-architecture.jpg'
                  }
                  alt=""
                  fill
                  sizes="100vw"
                />
                <span>Your connected institution</span>
              </div>
            )}
          </div>
          <div className={styles.roomLabel}>
            <i />
            <span>A GUIDED WORKSPACE TOUR</span>
            <small>{String(chapter + 1).padStart(2, '0')} / 07</small>
          </div>
          <article
            className={styles.story}
            style={{ '--chapter-color': current.color } as React.CSSProperties}
          >
            <div key={chapter} className={styles.storyContent}>
              <p className={styles.eyebrow}>{current.eyebrow}</p>
              {chapter === 0 ? (
                <h1>
                  {current.title.split('\n').map((line, i) => (
                    <span key={line} className={i === 1 ? styles.accent : ''}>
                      {i > 0 ? ' ' : ''}
                      {line}
                    </span>
                  ))}
                </h1>
              ) : (
                <h2>
                  {current.title.split('\n').map((line, i) => (
                    <span key={line} className={i === 1 ? styles.accent : ''}>
                      {i > 0 ? ' ' : ''}
                      {line}
                    </span>
                  ))}
                </h2>
              )}
              <p className={styles.description}>{current.description}</p>
              {chapter === 0 || final ? (
                <div className={styles.introActions}>
                  <Link href="/demo" className={styles.demo}>
                    Explore the demo <ArrowRight size={16} />
                  </Link>
                  <button className={styles.textAction} onClick={() => goTo(final ? 0 : 1)}>
                    {final ? 'Explore again' : 'Take a look around'}
                    {final ? <ArrowLeft size={15} /> : <ArrowDown size={15} />}
                  </button>
                  {final && (
                    <a className={styles.textAction} href="#platform-details">
                      Keep exploring <ArrowDown size={15} />
                    </a>
                  )}
                </div>
              ) : (
                <Link href="/demo" className={styles.screenAction}>
                  <span>Explore full demo</span>
                  <small>{current.label}</small>
                  <ArrowRight size={14} />
                </Link>
              )}

              {chapter > 0 && !final && (
                <p className={styles.benefit}>
                  <span className={styles.connectionDot} />
                  {current.benefit}
                </p>
              )}
            </div>
          </article>
          <div className={styles.connection} key={`connection-${chapter}`}>
            <span>CONNECTED BY DESIGN</span>
            <p>{current.connection}</p>
          </div>
          {chapter === 0 && (
            <button className={styles.scrollHint} onClick={() => goTo(1)}>
              <span>Scroll to step inside</span>
              <ArrowDown size={16} />
            </button>
          )}
          {final && (
            <span className={styles.endNote}>Your people. Your learning. Your operations.</span>
          )}
          <nav id="room-controls" className={styles.controls} aria-label="Room chapters">
            <div className={styles.progress}>
              <span ref={bar} />
            </div>
            <div className={styles.chapterList}>
              {ROOM_CHAPTERS.map((item, index) => (
                <button
                  key={item.label}
                  aria-current={chapter === index ? 'step' : undefined}
                  onClick={() => goTo(index)}
                >
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  {item.label}
                </button>
              ))}
            </div>
            <div className={styles.mobileControls}>
              <button
                disabled={chapter === 0}
                aria-label="Previous chapter"
                onClick={() => goTo(chapter - 1)}
              >
                <ArrowLeft size={18} />
              </button>
              <span>
                {String(chapter + 1).padStart(2, '0')} / 07 <b>{current.label}</b>
              </span>
              <button
                disabled={final}
                aria-label="Next chapter"
                onClick={() => goTo(chapter + 1)}
              >
                <ArrowRight size={18} />
              </button>
            </div>
          </nav>
        </div>
      </section>
      <HomePlatformDetails />
    </main>
  )
}
