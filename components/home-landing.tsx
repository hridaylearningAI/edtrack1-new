'use client'

import { useRef, useState } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import Link from 'next/link'
import Image from 'next/image'
import { SignInButton, SignUpButton } from '@clerk/nextjs'
import {
  ArrowDown, ArrowRight, ArrowUpRight, BookOpen, CalendarDays,
  Check, CheckCheck, ChevronRight, GraduationCap, LayoutDashboard,
  Menu, Plus, Sparkles, Users, Wallet, X,
} from 'lucide-react'
import styles from './home-landing.module.css'

if (typeof window !== 'undefined') gsap.registerPlugin(useGSAP, ScrollTrigger)

const NAV = [
  { label: 'Platform', href: '#platform' },
  { label: 'Solutions', href: '#solutions' },
  { label: 'How it works', href: '#workflow' },
]

const PREVIEWS = {
  overview: {
    label: 'Overview', icon: LayoutDashboard, title: 'A little clarity. A lot of possibility.',
    subtitle: 'Your campus, at a glance.', metrics: [ ['Active learners', '1,284', '+12.8%'], ['Courses in progress', '46', '+6 this term'], ['Completion rate', '92%', '+8.2%'] ],
    chart: 'Learning momentum', chartLabel: 'Course completions this semester',
    bars: [30, 44, 38, 58, 49, 65, 56, 77, 67, 85, 79, 96],
    activity: ['New enrolment received', 'Assessment ready for review', 'Certificate issued'],
  },
  students: {
    label: 'Students', icon: Users, title: 'Every learner. A clearer picture.',
    subtitle: 'Keep the next step in sight.', metrics: [ ['Active learners', '1,284', '+12.8%'], ['New enrolments', '128', 'This term'], ['Certificates issued', '86', 'This month'] ],
    chart: 'Enrolment overview', chartLabel: 'New learners joining this semester',
    bars: [24, 34, 47, 40, 59, 54, 69, 60, 79, 72, 89, 96],
    activity: ['Student profile completed', 'New enrolment confirmed', 'Learning pathway assigned'],
  },
  learning: {
    label: 'Learning', icon: BookOpen, title: 'Make room for the next breakthrough.',
    subtitle: 'Bring learning and progress together.', metrics: [ ['Active courses', '46', 'This term'], ['Assessments completed', '342', 'This month'], ['Completion rate', '92%', '+8.2%'] ],
    chart: 'Learning progress', chartLabel: 'Completed assessments this semester',
    bars: [36, 29, 46, 55, 43, 66, 60, 76, 69, 89, 81, 98],
    activity: ['Learning resource published', 'Assessment submitted', 'Course milestone reached'],
  },
} as const

type PreviewKey = keyof typeof PREVIEWS

function Brand() {
  return <Link href="/" className={styles.brand} aria-label="EdTrack ONE home">
    <Image src="/images/EdTrack1 logo.png" alt="EdTrack ONE — Learn. Manage. Comply. All in One." width={1967} height={800} priority />
  </Link>
}

/** Repeated brand outlines remain decorative and never intercept interaction. */
function DecorativeMotif({ variant }: { variant: 'hero' | 'solutions' | 'workflow' | 'closing' }) {
  return <div className={`${styles.decorativeMotif} ${styles[`${variant}Motif`]}`} aria-hidden="true">
    {[0, 1, 2].map(index => <svg key={index} viewBox="0 0 440 440" fill="none" focusable="false">
      <rect x="10" y="10" width="420" height="420" rx="90" stroke="currentColor" strokeWidth="1" />
    </svg>)}
  </div>
}

function WorkspacePreview() {
  const [active, setActive] = useState<PreviewKey>('overview')
  const preview = PREVIEWS[active]
  const previewRef = useRef<HTMLDivElement>(null)
  const keyboardChange = useRef(false)
  const hasChangedView = useRef(false)

  useGSAP(() => {
    // Revert the previous view's tweens before React paints the next one.
    if (keyboardChange.current) return
    const media = gsap.matchMedia()
    media.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.from(`.${styles.bars} > div`, {
        scaleY: 0.08, transformOrigin: 'center bottom',
        duration: hasChangedView.current ? 0.2 : 0.75,
        stagger: hasChangedView.current ? 0.004 : 0.035, ease: 'power3.out',
        scrollTrigger: { trigger: previewRef.current, start: 'clamp(top 85%)', once: true },
        clearProps: 'transform',
      })
      gsap.from(`.${styles.metricLine}`, {
        scaleX: 0, transformOrigin: 'left center', duration: hasChangedView.current ? 0.2 : 0.65,
        stagger: 0.03, ease: 'power3.out', clearProps: 'transform',
        scrollTrigger: { trigger: previewRef.current, start: 'clamp(top 85%)', once: true },
      })
      if (active !== 'overview') {
        gsap.from(`.${styles.previewGreeting}, .${styles.activityItem}`, {
          y: 5, opacity: 0.5, duration: 0.22, stagger: 0.025,
          ease: 'power2.out', clearProps: 'transform,opacity',
        })
      }
    }, previewRef)
    return () => media.revert()
  }, { scope: previewRef, dependencies: [active], revertOnUpdate: true })

  return <div ref={previewRef} className={styles.previewFrame}>
    <div className={styles.previewTop}><span className={styles.windowDots}><i /><i /><i /></span><span>YOUR CONNECTED CAMPUS</span><span className={styles.previewLabel}>Illustrative preview</span></div>
    <div className={styles.workspace}>
      <aside className={styles.previewSidebar}>
        <div className={styles.miniBrand}><Image src="/images/EdTrack1 logo.png" alt="EdTrack ONE" width={1967} height={800} /></div>
        <span className={styles.workspaceName}>Campus workspace</span>
        <div className={styles.previewNav} aria-label="Workspace preview views">
          {(Object.keys(PREVIEWS) as PreviewKey[]).map((key) => {
            const Icon = PREVIEWS[key].icon
            return <button key={key} type="button" aria-pressed={active === key} aria-controls="workspace-preview-content" onClick={event => { keyboardChange.current = event.detail === 0; hasChangedView.current = true; setActive(key) }}><Icon size={16} />{PREVIEWS[key].label}{active === key && <ChevronRight size={14} />}</button>
          })}
        </div>
        <div className={styles.sidebarNote}><span className={styles.statusDot} /> A place for every possibility.</div>
        <div className={styles.previewUser}><span>AC</span><div><b>Alex Chen</b><small>Campus administrator</small></div></div>
      </aside>
      <div className={styles.previewMain} id="workspace-preview-content" aria-live="polite">
        <div className={styles.previewBreadcrumb}>Workspace <ChevronRight size={12} /> {preview.label}<span><CalendarDays size={13} /> This semester</span></div>
        <div className={styles.previewGreeting}><div><p>{preview.subtitle}</p><h3>{preview.title}</h3></div><span className={styles.avatarStack}><i>JD</i><i>AK</i><i>ML</i></span></div>
        <div className={styles.metrics}>{preview.metrics.map(([label, value, change], i) => <div key={label}><span>{label}</span><div><strong>{value}</strong><small className={i === 1 ? styles.blueChange : undefined}>{change}</small></div><div className={styles.metricLine} data-color={i} /></div>)}</div>
        <div className={styles.previewPanels}>
          <div className={styles.chartPanel}><div className={styles.panelHeading}><div><h4>{preview.chart}</h4><p>{preview.chartLabel}</p></div><span><i />Completions</span></div>
            <div className={styles.chart} role="img" aria-label={`Illustrative ${preview.chart.toLowerCase()} chart showing an upward trend from January to June.`}><div className={styles.chartAxis}><span>100</span><span>75</span><span>50</span><span>25</span></div><div className={styles.bars}>{preview.bars.map((height, i) => <div key={i} style={{ height: `${height}%` }}><span /></div>)}</div></div>
            <div className={styles.chartMonths}>{['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'].map(month => <span key={month}>{month}</span>)}</div>
          </div>
          <div className={styles.activityPanel}><h4>Campus activity</h4><p>The small steps that add up.</p>{preview.activity.map((activity, i) => <div className={styles.activityItem} key={activity}><span data-color={i}>{i === 0 ? <Users size={14} /> : i === 1 ? <BookOpen size={14} /> : <CheckCheck size={14} />}</span><div><b>{activity}</b><small>{[ 'Just now', '12 minutes ago', '28 minutes ago' ][i]}</small></div></div>)}<div className={styles.activityFooter}><span className={styles.statusDot} /> Everything in one place</div></div>
        </div>
      </div>
    </div>
  </div>
}

const SOLUTIONS = [
  { icon: GraduationCap, color: 'blue', number: '01', title: 'Put your students first.', label: 'STUDENT MANAGEMENT', description: 'From the first enquiry to the final certificate. Keep student records, enrolments, and progress connected.', features: ['Student profiles & enrolments', 'Progress tracking & certificates'] },
  { icon: BookOpen, color: 'red', number: '02', title: 'Give learning room to grow.', label: 'LEARNING & DELIVERY', description: 'Bring courses, resources, and assessments into a focused experience for learners and trainers.', features: ['Course content & assessments', 'Dedicated student & trainer portals'] },
  { icon: Wallet, color: 'green', number: '03', title: 'Make the everyday easier.', label: 'CAMPUS OPERATIONS', description: 'Bring clarity to the work behind great education, with billing, reporting, and administration in one place.', features: ['Invoices & payment tracking', 'Reports & operational insights'] },
]

export function HomeLanding() {
  const [menuOpen, setMenuOpen] = useState(false)
  const homeRef = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    const root = homeRef.current
    if (!root) return
    const media = gsap.matchMedia()
    media.add({
      motion: '(prefers-reduced-motion: no-preference)',
      desktop: '(min-width: 701px)',
    }, context => {
      if (!context.conditions?.motion) return
      const desktop = context.conditions.desktop
      const select = gsap.utils.selector(root)
      const entrances: { element: Element; animation: gsap.core.Animation }[] = []
      const hero = gsap.timeline({ defaults: { duration: 0.75, ease: 'power3.out', clearProps: 'transform,opacity' } })
      hero.from(select(`.${styles.heroContent} > .${styles.eyebrow}`), { y: 10, opacity: 0 }, 0)
        .from(select('[data-hero-line]'), { yPercent: 105, stagger: 0.09, duration: 0.95 }, 0.08)
        .from(select(`.${styles.heroDescription}`), { y: 14, opacity: 0 }, 0.25)
        .from(select(`.${styles.heroContent} .${styles.heroActions}`), { y: 12, opacity: 0 }, 0.34)
        .from(select(`.${styles.heroNotes}`), { opacity: 0 }, 0.44)
      entrances.push({ element: select(`.${styles.heroContent}`)[0], animation: hero })

      const frame = select(`.${styles.previewFrame}`)[0]
      const previewEntrance = gsap.from(frame, {
        y: desktop ? 38 : 20, scale: desktop ? 0.975 : 1,
        rotationX: desktop ? 4 : 0, transformOrigin: 'center bottom',
        opacity: 0.25, duration: 1, ease: 'power3.out', clearProps: 'transform,opacity',
        scrollTrigger: { trigger: select(`.${styles.previewSection}`)[0], start: 'clamp(top 95%)', once: true },
      })
      entrances.push({ element: frame, animation: previewEntrance })

      // Independent triggers keep stacked mobile cards from revealing off screen.
      const revealTargets = select([
        `.${styles.audience}`, `.${styles.sectionHeading}`, `.${styles.solution}`,
        `.${styles.workflowIntro}`, `.${styles.step}`, `.${styles.faqSection} > div`,
        `.${styles.cta} > .${styles.eyebrow}`, `.${styles.cta} > h2`,
        `.${styles.cta} > p:not(.${styles.eyebrow})`, `.${styles.cta} > .${styles.heroActions}`,
      ].join(', '))
      revealTargets.forEach((element: Element) => {
        const isCard = element.classList.contains(styles.solution)
        const cardIndex = isCard ? Array.from(element.parentElement!.children).indexOf(element) : 0
        const animation = gsap.from(element, {
          y: desktop ? 25 : 16, opacity: 0, duration: 0.7,
          delay: desktop && isCard ? cardIndex * 0.07 : 0,
          ease: 'power3.out', clearProps: 'transform,opacity',
          scrollTrigger: { trigger: element, start: 'clamp(top 94%)', once: true },
        })
        entrances.push({ element, animation })
      })
      gsap.from(select(`.${styles.ctaBrandLine} i`), {
        scaleX: 0, transformOrigin: 'left center', duration: 0.6, stagger: 0.1,
        ease: 'power3.out', clearProps: 'transform',
        scrollTrigger: { trigger: select(`.${styles.cta}`)[0], start: 'clamp(top 90%)', once: true },
      })
      // Slow, independent motion; pause whenever the motif is off screen or the tab is hidden.
      const decorativeLoops = select(`.${styles.decorativeMotif}`).map((motif: Element) => {
        const loop = gsap.timeline({ paused: true, repeat: -1, yoyo: true,
          defaults: { duration: 7, ease: 'sine.inOut' } })
          .to(motif.querySelectorAll('svg'), {
            x: (i: number) => (i === 1 ? -1 : 1) * (desktop ? 14 : 6),
            y: (i: number) => (i === 1 ? 1 : -1) * (desktop ? 22 : 10),
            rotation: (i: number) => i === 1 ? '+=5' : '-=4', stagger: 0.4,
          })
        const trigger = ScrollTrigger.create({
          trigger: motif.parentElement, start: 'top bottom', end: 'bottom top',
          onToggle: self => { loop.paused(!self.isActive || document.hidden) },
        })
        loop.paused(!trigger.isActive || document.hidden)
        return { loop, trigger }
      })
      const syncVisibility = () => decorativeLoops.forEach(({ loop, trigger }: { loop: gsap.core.Timeline; trigger: ScrollTrigger }) => {
        loop.paused(document.hidden || !trigger.isActive)
      })
      document.addEventListener('visibilitychange', syncVisibility)

      // Keyboard focus must never land on content waiting for a scroll reveal.
      const finishFocusedEntrance = (event: FocusEvent) => {
        if (!(event.target instanceof Node)) return
        for (const { element, animation } of entrances) {
          if (element.contains(event.target)) animation.progress(1)
        }
      }
      root.addEventListener('focusin', finishFocusedEntrance)
      return () => {
        root.removeEventListener('focusin', finishFocusedEntrance)
        document.removeEventListener('visibilitychange', syncVisibility)
      }
    }, homeRef)

    media.add('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)', () => {
      const cleanups: (() => void)[] = []
      root.querySelectorAll(`.${styles.solution}, .${styles.button}, .${styles.secondaryButton}`).forEach(element => {
        const isCard = element.classList.contains(styles.solution)
        const timeline = gsap.timeline({ paused: true, defaults: { duration: 0.22, ease: 'power2.out' } })
        if (isCard) timeline.to(element.querySelector(`.${styles.solutionIcon}`), { y: -4, rotation: -4 }, 0)
        timeline.to(element.querySelector(isCard ? 'a > svg' : 'svg'), { x: 3, y: isCard ? -3 : 0 }, 0)
        const enter = () => { timeline.play() }
        const leave = () => { timeline.reverse() }
        element.addEventListener('pointerenter', enter)
        element.addEventListener('pointerleave', leave)
        cleanups.push(() => { element.removeEventListener('pointerenter', enter); element.removeEventListener('pointerleave', leave) })
      })
      return () => cleanups.forEach(cleanup => cleanup())
    }, homeRef)

    // FAQ and menu expansion change the positions of later scroll triggers.
    let refreshFrame = 0
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(refreshFrame)
      refreshFrame = requestAnimationFrame(() => ScrollTrigger.refresh())
    })
    observer.observe(root)
    return () => { observer.disconnect(); cancelAnimationFrame(refreshFrame); media.revert() }
  }, { scope: homeRef })

  return <div ref={homeRef} className={styles.home}>
    <a href="#main-content" className={styles.skipLink}>Skip to content</a>
    <header className={styles.header}>
      <div className={styles.headerInner}><Brand /><nav className={styles.desktopNav} aria-label="Main navigation">{NAV.map(item => <a key={item.href} href={item.href}>{item.label}</a>)}</nav>
        <div className={styles.headerActions}><SignInButton mode="modal" forceRedirectUrl="/"><button className={styles.login} type="button">Log in <ArrowUpRight size={14} /></button></SignInButton><Link href="/demo" className={`${styles.button} ${styles.buttonSmall}`}>Explore demo <ArrowRight size={15} /></Link><button type="button" className={styles.menuToggle} aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={menuOpen} aria-controls="home-mobile-navigation" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X size={21} /> : <Menu size={21} />}</button></div>
      </div>
      {menuOpen && <nav id="home-mobile-navigation" className={styles.mobileNav} aria-label="Mobile navigation" onKeyDown={event => { if (event.key === 'Escape') { setMenuOpen(false); document.querySelector<HTMLButtonElement>('[aria-controls="home-mobile-navigation"]')?.focus() } }}>{NAV.map(item => <a key={item.href} href={item.href} onClick={() => setMenuOpen(false)}>{item.label}<ArrowUpRight size={16} /></a>)}</nav>}
    </header>
    <main id="main-content">
      <section className={styles.hero} aria-labelledby="hero-title">
        <DecorativeMotif variant="hero" />
        <div className={styles.heroContent}><p className={styles.eyebrow}><span className={styles.brandDots}><i /><i /><i /></span> A MORE CONNECTED CAMPUS</p>
          <h1 id="hero-title"><span className={styles.heroLine}><span data-hero-line>Great education.</span></span><span className={`${styles.heroLine} ${styles.heroLineBlue}`}><span data-hero-line>Beautifully connected.</span></span></h1>
          <p className={styles.heroDescription}>Less time managing systems.<br className={styles.mobileBreak} /> More time moving education forward.<br className={styles.desktopBreak} /> Your students, learning, and campus operations — together in EdTrack ONE.</p>
          <div className={styles.heroActions}><Link href="/demo" className={styles.button}>Explore the platform <ArrowRight size={17} /></Link><a href="#platform" className={styles.secondaryButton}>Take a closer look <ArrowDown size={16} /></a></div>
          <div className={styles.heroNotes}><span><Check size={13} /> One connected workspace</span><span><Check size={13} /> Built around your people</span></div>
        </div>
        <div id="platform" className={styles.previewSection}><WorkspacePreview /><div className={styles.previewCaption}><span><Sparkles size={14} /> A clearer view of your campus starts here.</span><span>Try the preview navigation above <ArrowUpRight size={13} /></span></div></div>
      </section>
      <div className={styles.audience}><span>DESIGNED FOR THE WAY YOU EDUCATE</span><div><span><GraduationCap />Vocational education</span><span><BookOpen />Higher education</span><span><Users />Training organisations</span></div></div>
      <section id="solutions" className={styles.solutions}>
        <DecorativeMotif variant="solutions" />
        <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>LESS COMPLEXITY. MORE POSSIBILITY.</p><h2>Everything in its place.<br /><span>Everyone moving forward.</span></h2></div><p>Bring the important parts of your campus together, so your people can focus on what they do best.</p></div>
        <div className={styles.solutionGrid}>{SOLUTIONS.map(solution => <article key={solution.number} className={styles.solution} data-tone={solution.color}><div className={styles.solutionTop}><span className={styles.solutionIcon}><solution.icon size={24} strokeWidth={1.6} /></span><span>{solution.number}</span></div><p className={styles.solutionLabel}>{solution.label}</p><h3>{solution.title}</h3><p className={styles.solutionDescription}>{solution.description}</p><ul>{solution.features.map(feature => <li key={feature}><Check size={14} />{feature}</li>)}</ul><Link href="/demo">Explore {solution.number === '01' ? 'student management' : solution.number === '02' ? 'learning' : 'campus operations'}<ArrowUpRight size={17} /></Link></article>)}</div>
      </section>
      <section id="workflow" className={styles.workflow}>
        <DecorativeMotif variant="workflow" />
        <div className={styles.workflowIntro}><p className={styles.eyebrow}>ONE JOURNEY. EVERY STEP.</p><h2>From first hello<br />to what comes next.</h2><p>Keep the student journey connected, with a shared place for the people who make it happen.</p><Link href="/demo" className={styles.textLink}>See how it comes together <ArrowRight size={17} /></Link><div className={styles.rolePills}><span>Administrators</span><span>Trainers</span><span>Students</span></div></div>
        <div className={styles.steps}>{[
          { icon: Users, title: 'Welcome your learners', description: 'Give every student a clear beginning with organised profiles and enrolments.', color: 'blue' },
          { icon: BookOpen, title: 'Create space for learning', description: 'Connect courses, learning resources, and assessments to the people who need them.', color: 'red' },
          { icon: GraduationCap, title: 'Celebrate the progress', description: 'Follow each milestone, review outcomes, and recognise achievement with certificates.', color: 'green' },
        ].map((step, i) => <div key={step.title} className={styles.step} data-tone={step.color}><span className={styles.stepIcon}><step.icon size={21} /></span><div><small>0{i + 1}</small><h3>{step.title}</h3><p>{step.description}</p></div></div>)}</div>
      </section>
      <section className={styles.faqSection} aria-labelledby="faq-title"><div><p className={styles.eyebrow}>A LITTLE MORE CLARITY</p><h2 id="faq-title">Good questions.<br />Clear answers.</h2></div><div className={styles.faqList}>{[
        ['Who is EdTrack ONE for?', 'EdTrack ONE brings together student administration and learning workflows for vocational education providers, higher education teams, and training organisations. Students, trainers, and administrators each have a dedicated portal.'],
        ['What can I explore in the demo?', 'The demo introduces the platform and its connected modules. Student Management connects to the SMS workspace; additional platform modules include illustrative walkthroughs. A dedicated demo account is required to enter.'],
        ['I already have an account. Where do I go?', 'Use Log in at the top of this page to access your account. After signing in, you will be directed to the workspace associated with your role.'],
      ].map(([question, answer]) => <details key={question}><summary>{question}<Plus size={18} /></summary><p>{answer}</p></details>)}</div></section>
      <section className={styles.cta}><DecorativeMotif variant="closing" /><div className={styles.ctaBrandLine}><i /><i /><i /></div><p className={styles.eyebrow}>YOUR NEXT CHAPTER STARTS HERE</p><h2>A better-connected campus.<br />A brighter way forward.</h2><p>Meet the workspace that brings it all together.</p><div className={styles.heroActions}><Link href="/demo" className={styles.button}>Explore the demo <ArrowRight size={17} /></Link><SignUpButton mode="modal" forceRedirectUrl="/"><button type="button" className={styles.secondaryButton}>Create an account <ArrowUpRight size={16} /></button></SignUpButton></div></section>
    </main>
    <footer className={styles.footer}><div className={styles.footerMain}><div><Brand /><p>More connected. More possible.</p></div><nav aria-label="Footer navigation"><a href="#platform">Platform</a><a href="#solutions">Solutions</a><Link href="/demo">Demo</Link><Link href="/sign-in">Sign in <ArrowUpRight size={13} /></Link></nav></div><div className={styles.footerBottom}><span>© {new Date().getFullYear()} EdTrack ONE. All rights reserved.</span><span><span className={styles.brandDots}><i /><i /><i /></span> Built around education.</span></div></footer>
  </div>
}
