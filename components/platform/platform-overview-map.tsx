'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { UserButton, useUser } from '@clerk/nextjs'
import { ArrowLeft, ArrowRight, ArrowUpRight, BookOpen, Users, ShieldCheck, Monitor, BarChart3, FolderOpen, GraduationCap, Wallet, CalendarClock, HelpCircle, Search, LayoutDashboard, Pin, Check, Compass, Sparkles, ChevronRight, X, type LucideIcon } from 'lucide-react'
import { PLATFORM_MODULES, exploreStorageKey, type PlatformModuleSlug } from '@/lib/demo-platform'
import { DemoSurface } from './demo-surface'
import styles from './dashboard.module.css'

export const MODULE_DETAILS: Record<PlatformModuleSlug, { title: string; icon: LucideIcon; description: string; category: 'Learning' | 'Operations' | 'Compliance'; tone: string }> = {
  sms: { title: 'Student Management', icon: GraduationCap, description: 'Manage student profiles, enrolments, progress, and certificates.', category: 'Operations', tone: 'blue' },
  lms: { title: 'Learning Management', icon: Monitor, description: 'Explore course delivery, learner pathways, and learning progress.', category: 'Learning', tone: 'blue' },
  elibrary: { title: 'eLibrary', icon: BookOpen, description: 'Browse the catalogue and discover learning resources in one place.', category: 'Learning', tone: 'red' },
  crm: { title: 'CRM & Enquiries', icon: Users, description: 'Follow enquiries and explore the journey from first contact to enrolment.', category: 'Operations', tone: 'blue' },
  'comply-he': { title: 'Higher Education Compliance', icon: ShieldCheck, description: 'Explore compliance checklists and evidence for higher education.', category: 'Compliance', tone: 'green' },
  'comply-vet': { title: 'VET Compliance', icon: ShieldCheck, description: 'Review vocational education compliance and audit readiness views.', category: 'Compliance', tone: 'green' },
  insight: { title: 'Insight Analytics', icon: BarChart3, description: 'See how enrolment, completion, and performance trends come together.', category: 'Operations', tone: 'green' },
  resources: { title: 'Resource Management', icon: FolderOpen, description: 'Explore shared facilities, equipment, and campus resource allocation.', category: 'Operations', tone: 'red' },
  fees: { title: 'Fees & Payments', icon: Wallet, description: 'Explore invoice, balance, and payment tracking for your campus.', category: 'Operations', tone: 'green' },
  scheduling: { title: 'Scheduling', icon: CalendarClock, description: 'See sessions, trainer calendars, and rooms in a shared timetable.', category: 'Operations', tone: 'red' },
}
const CATEGORIES = ['All modules', 'Learning', 'Operations', 'Compliance'] as const

export function PlatformOverviewMap() {
  const { user } = useUser()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<string>('All modules')
  const [pinned, setPinned] = useState<PlatformModuleSlug[]>([])
  const [visited, setVisited] = useState<PlatformModuleSlug[]>([])
  const [loadedKey, setLoadedKey] = useState('')
  const [guideOpen, setGuideOpen] = useState(false)
  const libraryRef = useRef<HTMLElement>(null)
  const storageKey = user?.id ? exploreStorageKey(user.id) : ''

  useEffect(() => {
    if (!storageKey) return
    const valid = (values: unknown): PlatformModuleSlug[] => Array.isArray(values)
      ? [...new Set(values.filter((value): value is PlatformModuleSlug => PLATFORM_MODULES.some(module => module.slug === value)))] : []
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || '{}')
      setPinned(valid(saved.pinned))
      setVisited(valid(saved.visited))
    } catch { setPinned([]); setVisited([]) }
    setLoadedKey(storageKey)
  }, [storageKey])
  useEffect(() => {
    if (!storageKey || loadedKey !== storageKey) return
    try { localStorage.setItem(storageKey, JSON.stringify({ pinned, visited })) } catch { /* Browsing still works when storage is unavailable. */ }
  }, [pinned, visited, loadedKey, storageKey])

  const openModule = (slug: PlatformModuleSlug) => setVisited(previous => previous.includes(slug) ? previous : [...previous, slug])
  const chooseCategory = (value: string) => {
    setCategory(value); setQuery('')
    libraryRef.current?.scrollIntoView({ block: 'start' })
  }
  const modules = useMemo(() => [...PLATFORM_MODULES].sort((a, b) => a.slug === 'sms' ? -1 : b.slug === 'sms' ? 1 : 0).filter(module => {
    const detail = MODULE_DETAILS[module.slug]
    const matchesCategory = category === 'All modules' || (category === 'Pinned' ? pinned.includes(module.slug) : detail.category === category)
    return matchesCategory && `${detail.title} ${detail.description} ${module.label}`.toLowerCase().includes(query.trim().toLowerCase())
  }), [query, category, pinned])
  const progress = Math.round(visited.length / PLATFORM_MODULES.length * 100)

  return <DemoSurface><div className={styles.shell}>
    <aside className={styles.sidebar} aria-label="Workspace navigation">
      <Link href="/platform" className={styles.brand} aria-label="EdTrack ONE overview"><Image src="/images/EdTrack1 logo.png" alt="EdTrack ONE" width={1967} height={800} priority /></Link>
      <div className={styles.workspaceSwitch}><span>E</span><div><b>EdTrack workspace</b><small>Platform demo</small></div><ChevronRight size={14} /></div>
      <p className={styles.navLabel}>WORKSPACE</p>
      <nav><button type="button" aria-label="Overview" data-active={category === 'All modules' && !query} onClick={() => { setCategory('All modules'); setQuery(''); window.scrollTo({top:0}) }}><LayoutDashboard size={18} /><span>Overview</span></button><button type="button" aria-label="Pinned modules" data-active={category === 'Pinned'} onClick={() => chooseCategory('Pinned')}><Pin size={18} /><span>Pinned modules</span><small>{pinned.length}</small></button></nav>
      <p className={styles.navLabel}>EXPLORE YOUR CAMPUS</p>
      <nav>{[{name:'Learning',icon:BookOpen},{name:'Operations',icon:Users},{name:'Compliance',icon:ShieldCheck}].map(item => <button type="button" key={item.name} aria-label={item.name} data-active={category === item.name} onClick={() => chooseCategory(item.name)}><item.icon size={18} /><span>{item.name}</span><small>{PLATFORM_MODULES.filter(module => MODULE_DETAILS[module.slug].category === item.name).length}</small></button>)}</nav>
      <div className={styles.sidebarBottom}><div className={styles.helpCard}><span><Compass size={21} /></span><h3>A little guidance?</h3><p>Find your way around your connected campus.</p><button type="button" onClick={() => { setGuideOpen(!guideOpen); if (!guideOpen) window.scrollTo({ top: 0 }) }} aria-expanded={guideOpen} aria-controls="dashboard-guide">Explore the guide <ArrowUpRight size={14} /></button></div><Link className={styles.homeLink} href="/" aria-label="Back to website"><ArrowLeft size={16} /><span>Back to website</span></Link><div className={styles.account}><UserButton afterSignOutUrl="/" /><div><b>{user?.firstName || 'Demo'} workspace</b><small>Let’s explore together</small></div></div></div>
    </aside>
    <div className={styles.content}>
      <header className={styles.topbar}><span className={styles.breadcrumb}>Workspace <ChevronRight size={13} /><b>Overview</b></span><div className={styles.search}><Search size={16} /><input type="search" aria-label="Search modules" placeholder="Find a module…" value={query} onChange={event => { setQuery(event.target.value); libraryRef.current?.scrollIntoView({block:'start'}) }} /></div><span className={styles.demoBadge}><i />Platform demo</span><button type="button" className={styles.guideToggle} aria-label="Platform guide" aria-expanded={guideOpen} aria-controls="dashboard-guide" onClick={() => { setGuideOpen(!guideOpen); if (!guideOpen) window.scrollTo({ top: 0 }) }}><HelpCircle size={19}/></button><div className={styles.mobileUser}><UserButton afterSignOutUrl="/" /></div></header>
      <main className={styles.main}>
        <div className={styles.greeting} data-demo-reveal><div><p>YOUR CAMPUS, AT YOUR FINGERTIPS</p><h1>A little clarity.<span> A lot of possibility.</span></h1><h2>Welcome to your connected workspace. Where would you like to begin?</h2></div><span className={styles.greetingMark} aria-hidden="true"><Sparkles size={26} /></span></div>
        {guideOpen && <section className={styles.guide} id="dashboard-guide" aria-label="Platform guide"><div><HelpCircle size={18} /><strong>Your guide to EdTrack ONE</strong><button type="button" aria-label="Close guide" onClick={() => setGuideOpen(false)}><X size={18} /></button></div><p><b>Start with a module.</b> Student Management opens the full admin workspace, filled with sample data; other modules are illustrative previews. <b>Make it yours.</b> Pin the tools you want to return to. Your pins and exploration progress are saved in this browser.</p></section>}
        <div className={styles.bento}>
          <section className={styles.heroCard} aria-labelledby="campus-heading" data-demo-reveal><div className={styles.heroCopy}><span className={styles.heroEyebrow}><i /> YOUR NEXT CHAPTER</span><h2 id="campus-heading">Big possibilities.<br />One connected campus.</h2><p>Bring your students, learning, and everyday operations into the same picture.</p><Link href="/admin" onClick={() => openModule('sms')}>Open Student Management <ArrowUpRight size={17} /></Link><small><span /> Full workspace · Sample data, changes aren’t saved</small></div><div className={styles.campusArt} aria-label="Connected campus shortcuts"><div className={styles.orbit} /><div className={styles.orbitTwo} /><svg viewBox="0 0 300 280" className={styles.connectors} aria-hidden="true"><path d="M150 140 L65 50 M150 140 L245 95 M150 140 L220 235 M150 140 L50 205" /></svg><div className={styles.campusCore}><GraduationCap size={37} strokeWidth={1.3}/><span>ONE</span></div><Link className={styles.artNode} data-node="students" href="/admin" onClick={() => openModule('sms')}><Users size={18}/><span>Students</span></Link><Link className={styles.artNode} data-node="learning" href="/platform/modules/lms" onClick={() => openModule('lms')}><BookOpen size={18}/><span>Learning</span></Link><Link className={styles.artNode} data-node="insight" href="/platform/modules/insight" onClick={() => openModule('insight')}><BarChart3 size={18}/><span>Insight</span></Link><Link className={styles.artNode} data-node="comply" href="/platform/modules/comply-vet" onClick={() => openModule('comply-vet')}><ShieldCheck size={18}/><span>Comply</span></Link><span className={styles.artDot}/><span className={styles.artDotTwo}/></div></section>
          <section className={styles.progressCard} data-demo-reveal><div className={styles.cardHeading}><span>YOUR DISCOVERY TRAIL</span><Compass size={18}/></div><div className={styles.ring}><svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="50"/><circle cx="60" cy="60" r="50" strokeDasharray={`${progress * 3.14159} 314.159`}/></svg><div><strong>{visited.length}<span> / 10</span></strong><small>modules explored</small></div></div><h3>{progress === 100 ? 'You’ve seen the whole picture.' : visited.length ? 'Your next discovery awaits.' : 'A fresh perspective starts here.'}</h3><p>{progress === 100 ? 'Pin your favourites to keep them close.' : 'Open a module and make yourself at home.'}</p><button type="button" onClick={() => chooseCategory('All modules')}>Keep exploring <ArrowRight size={15}/></button></section>
        </div>
        <section className={styles.pathways} aria-label="Explore by purpose">{[
          {title:'Inspire learning',description:'Courses, content & resources',icon:BookOpen,category:'Learning',tone:'blue',number:'02'},
          {title:'Simplify the everyday',description:'People, payments & planning',icon:Users,category:'Operations',tone:'red',number:'06'},
          {title:'Move forward confidently',description:'Compliance & audit readiness',icon:ShieldCheck,category:'Compliance',tone:'green',number:'02'},
        ].map(item => <button key={item.category} type="button" data-tone={item.tone} onClick={() => chooseCategory(item.category)}><span className={styles.pathIcon}><item.icon size={21}/></span><div><h3>{item.title}</h3><p>{item.description}</p></div><span className={styles.pathNumber}>{item.number}<ArrowUpRight size={14}/></span></button>)}</section>
        <section ref={libraryRef} id="module-library" className={styles.library} aria-labelledby="library-title"><div className={styles.libraryHeading}><div><h2 id="library-title">Your campus toolkit<span>{PLATFORM_MODULES.length}</span></h2><p>Everything you need. A little easier to find.</p></div><span className={styles.pinHint}><Pin size={13}/> Pin your favourites for quick access</span></div>
          <div className={styles.filterRow}><div role="group" aria-label="Filter modules" className={styles.filters}>{[...CATEGORIES,'Pinned'].map(item => <button type="button" key={item} aria-pressed={category === item} onClick={() => setCategory(item)}>{item}{item === 'Pinned' && <span>{pinned.length}</span>}</button>)}</div><p role="status">{modules.length} {modules.length === 1 ? 'module' : 'modules'}{query && ` matching “${query}”`}</p></div>
          {modules.length ? <div className={styles.moduleGrid}>{modules.map(module => {
            const detail = MODULE_DETAILS[module.slug]; const live = module.slug === 'sms'; const isPinned = pinned.includes(module.slug)
            return <article key={module.slug} className={styles.moduleCard} data-tone={detail.tone}><div className={styles.moduleTop}><span className={styles.moduleIcon}><detail.icon size={22} strokeWidth={1.6}/></span><button type="button" aria-label={`${isPinned ? 'Unpin' : 'Pin'} ${detail.title}`} aria-pressed={isPinned} onClick={() => setPinned(previous => isPinned ? previous.filter(slug => slug !== module.slug) : [...previous, module.slug])}><Pin size={16}/></button></div><Link href={module.href} onClick={() => openModule(module.slug)}><h3>{detail.title}</h3><p>{detail.description}</p><div className={styles.moduleFooter}><span data-live={live}><i/>{live ? 'Full workspace' : 'Demo preview'}</span><span>{visited.includes(module.slug) && <Check size={13}/>}<ArrowUpRight size={17}/></span></div></Link></article>
          })}</div> : <div className={styles.empty}><Search size={25}/><h3>{category === 'Pinned' && !query ? 'Keep your favourites close.' : 'No modules found.'}</h3><p>{category === 'Pinned' && !query ? 'Use the pin on any module to add it here.' : 'Try another search or explore all modules.'}</p><button type="button" onClick={() => {setQuery('');setCategory('All modules')}}>Browse all modules <ArrowRight size={15}/></button></div>}
        </section><footer className={styles.footer}><span>EdTrack ONE · Built around education.</span><span><i/><i/><i/> More connected. More possible.</span></footer>
      </main>
    </div>
  </div></DemoSurface>
}
