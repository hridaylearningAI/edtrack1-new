'use client'

import { useEffect, type ReactNode } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { UserButton, useUser } from '@clerk/nextjs'
import { ArrowLeft, ChevronRight, LayoutDashboard } from 'lucide-react'

import { PLATFORM_MODULES, exploreStorageKey, type PlatformModuleDef } from '@/lib/demo-platform'
import { DemoSurface } from './demo-surface'
import { MODULE_DETAILS } from './platform-overview-map'
import styles from './dashboard.module.css'
import s from './module.module.css'

// Same order as the dashboard library: the live Student Management module first.
const NAV_MODULES = [...PLATFORM_MODULES].sort((a, b) => a.slug === 'sms' ? -1 : b.slug === 'sms' ? 1 : 0)

type DemoModuleShellProps = {
  module: PlatformModuleDef
  children: ReactNode
}

export function DemoModuleShell({ module, children }: DemoModuleShellProps) {
  const { user } = useUser()
  const detail = MODULE_DETAILS[module.slug]

  // Count this page on the dashboard's discovery trail, however the visitor arrived.
  useEffect(() => {
    if (!user?.id) return
    const key = exploreStorageKey(user.id)
    try {
      const saved = JSON.parse(localStorage.getItem(key) || '{}')
      const visited: unknown[] = Array.isArray(saved.visited) ? saved.visited : []
      if (!visited.includes(module.slug)) localStorage.setItem(key, JSON.stringify({ ...saved, visited: [...visited, module.slug] }))
    } catch { /* Browsing still works when storage is unavailable. */ }
  }, [user?.id, module.slug])

  return <DemoSurface><div className={styles.shell}>
    <aside className={styles.sidebar} aria-label="Workspace navigation">
      <Link href="/platform" className={styles.brand} aria-label="EdTrack ONE overview"><Image src="/images/EdTrack1 logo.png" alt="EdTrack ONE" width={1967} height={800} priority /></Link>
      <div className={styles.workspaceSwitch}><span>E</span><div><b>EdTrack workspace</b><small>Platform demo</small></div><ChevronRight size={14} /></div>
      <p className={styles.navLabel}>WORKSPACE</p>
      <nav aria-label="Workspace"><Link href="/platform" aria-label="Overview"><LayoutDashboard size={18} /><span>Overview</span></Link></nav>
      <p className={styles.navLabel}>MODULES</p>
      <nav aria-label="Modules">{NAV_MODULES.map(item => {
        const d = MODULE_DETAILS[item.slug]; const current = item.slug === module.slug
        return <Link key={item.slug} href={item.href} aria-label={d.title} aria-current={current ? 'page' : undefined} data-active={current}><d.icon size={18} /><span>{d.title}</span>{item.slug === 'sms' && <small>Full</small>}</Link>
      })}</nav>
      <div className={styles.sidebarBottom}><Link className={styles.homeLink} href="/" aria-label="Back to website"><ArrowLeft size={16} /><span>Back to website</span></Link><div className={styles.account}><UserButton afterSignOutUrl="/" /><div><b>{user?.firstName || 'Demo'} workspace</b><small>Let’s explore together</small></div></div></div>
    </aside>
    <div className={styles.content}>
      <header className={styles.topbar}>
        <span className={styles.breadcrumb}><Link className={s.crumb} href="/platform">Workspace</Link><ChevronRight size={13} />{detail.category}<ChevronRight size={13} /><b>{detail.title}</b></span>
        <span className={s.spacer} />
        <span className={styles.demoBadge}><i />Demo preview</span>
        <Link href="/platform" className={s.back}><ArrowLeft size={15} />All modules</Link>
        <div className={styles.mobileUser}><UserButton afterSignOutUrl="/" /></div>
      </header>
      <main className={`${styles.main} ${s.page}`} data-tone={detail.tone}>
        <div className={s.header} data-demo-reveal>
          <span className={s.icon}><detail.icon size={26} strokeWidth={1.6} /></span>
          <div><p>{detail.category.toUpperCase()}</p><h1>{detail.title}</h1><h2>{detail.description}</h2></div>
        </div>
        <div className={s.notice} data-demo-reveal><i />Sample data for illustration — nothing here is live.</div>
        <div data-demo-reveal>{children}</div>
        <footer className={styles.footer}><span>EdTrack ONE · Built around education.</span><span><i /><i /><i /> More connected. More possible.</span></footer>
      </main>
    </div>
  </div></DemoSurface>
}

export function DemoKpis({ items }: { items: { label: string; value: string }[] }) {
  return <dl className={s.kpis}>{items.map(kpi => <div key={kpi.label} className={s.kpi}><dt>{kpi.label}</dt><dd>{kpi.value}</dd></div>)}</dl>
}
