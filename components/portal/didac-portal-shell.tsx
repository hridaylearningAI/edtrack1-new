'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UserButton } from '@clerk/nextjs'
import { useGSAP } from '@gsap/react'
import { gsap } from 'gsap'
import { ArrowLeft, ArrowRight, Check } from 'lucide-react'
import { DemoAvatar } from '@/components/demo-avatar'
import { DemoClerkAvatarSync } from '@/components/demo-clerk-avatar-sync'
import { DemoCommandPalette } from '@/components/demo-command-palette'
import { WorkspaceLordIcon } from '@/components/platform/workspace-lord-icon'
import {
  LI_ACTIVE,
  LI_BLUE,
  LI_BLUSH,
  LI_PRIMARY,
  LI_SAGE,
  PLATFORM_ICONS,
} from '@/components/platform/platform-icons'
import { EdTrackLogo } from '@/components/brand/edtrack-logo'
import { DEMO_ACCOUNT_NAME, DEMO_ACCOUNT_SEED } from '@/lib/demo-avatars'
import s from '@/components/platform/workspace.module.css'

if (typeof window !== 'undefined') gsap.registerPlugin(useGSAP)

export type PortalNavItem = {
  title: string
  href: string
  icon?: string
  exact?: boolean
}

export type PortalNavSection = {
  label: string
  items: PortalNavItem[]
}

type DidacPortalShellProps = {
  children: ReactNode
  brandTitle?: string
  brandSubtitle?: string
  brandHref?: string
  sections: PortalNavSection[]
  showPlatformMap?: boolean
  showCommandPalette?: boolean
}

function linkActive(pathname: string, href: string, exact?: boolean) {
  if (exact || href === '/admin' || href === '/student' || href === '/trainer' || href === '/partner' || href === '/platform') {
    return pathname === href
  }
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function DidacPortalShell({
  children,
  brandTitle = 'EdTrack ONE',
  brandSubtitle = 'Demo Institute',
  brandHref = '/platform',
  sections,
  showPlatformMap = true,
  showCommandPalette = true,
}: DidacPortalShellProps) {
  const pathname = usePathname()
  const shellRef = useRef<HTMLDivElement>(null)
  const [noticeOpen, setNoticeOpen] = useState(false)
  const [read, setRead] = useState(false)
  const [instituteOpen, setInstituteOpen] = useState(false)
  const noticesRef = useRef<HTMLDivElement>(null)
  const instituteRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function keys(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setNoticeOpen(false)
        setInstituteOpen(false)
      }
    }
    function outside(event: PointerEvent) {
      if (!noticesRef.current?.contains(event.target as Node)) setNoticeOpen(false)
      if (!instituteRef.current?.contains(event.target as Node)) setInstituteOpen(false)
    }
    document.addEventListener('keydown', keys)
    document.addEventListener('pointerdown', outside)
    return () => {
      document.removeEventListener('keydown', keys)
      document.removeEventListener('pointerdown', outside)
    }
  }, [])

  useGSAP(() => {
    const media = gsap.matchMedia()
    media.add('(prefers-reduced-motion: no-preference)', () => {
      const items = gsap.utils.toArray<HTMLElement>('[data-animate="sidebar"]')
      // fromTo + clearProps avoids sticky autoAlpha:0 after remount/Strict Mode cleanup.
      gsap.fromTo(
        items,
        { x: -14, autoAlpha: 0 },
        {
          x: 0,
          autoAlpha: 1,
          duration: 0.4,
          stagger: 0.04,
          ease: 'power3.out',
          clearProps: 'transform,opacity,visibility',
        }
      )
    })
    return () => {
      gsap.set('[data-animate="sidebar"]', { clearProps: 'all' })
      media.revert()
    }
  }, { scope: shellRef })

  return (
    <div className={s.workspace} ref={shellRef}>
      <DemoClerkAvatarSync />
      <a href="#workspace-main" className={s.skip}>
        Skip to workspace content
      </a>

      <aside className={s.sidebar} aria-label="Workspace navigation">
        <div className={s.sidebarHeader} data-animate="sidebar">
          <div className={s.brandCopy} ref={instituteRef}>
            <Link href={brandHref} className={s.brandMark} aria-label={`${brandTitle} home`}>
              <EdTrackLogo className="h-8 w-auto max-w-[168px]" priority />
            </Link>
            <button
              className={s.brandButton}
              aria-expanded={instituteOpen}
              aria-controls="institution-panel"
              onClick={() => setInstituteOpen((value) => !value)}
            >
              <span>{brandSubtitle}</span>
            </button>
            {instituteOpen && (
              <div id="institution-panel" className={s.popover}>
                <strong>
                  {brandSubtitle} <Check size={15} />
                </strong>
                <p>You’re exploring an EdTrack workspace with the new campus design language.</p>
                <Link href="/" onClick={() => setInstituteOpen(false)}>
                  <ArrowLeft size={15} />
                  Back to website
                </Link>
                {showPlatformMap && (
                  <Link href="/platform" onClick={() => setInstituteOpen(false)}>
                    <ArrowRight size={15} />
                    Platform map
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>

        <nav className={s.navGroup} aria-label="Primary">
          {showPlatformMap && (
            <>
              <div className={s.navLabel} data-animate="sidebar">
                Campus
              </div>
              <Link
                href="/platform"
                className={s.navBtn}
                data-animate="sidebar"
                aria-current={pathname === '/platform' ? 'page' : undefined}
              >
                <WorkspaceLordIcon
                  src={PLATFORM_ICONS.home}
                  trigger="hover"
                  target="a"
                  colors={pathname === '/platform' ? LI_ACTIVE : LI_PRIMARY}
                  size={22}
                />
                <span>Platform map</span>
              </Link>
            </>
          )}

          {sections.map((section) => (
            <div key={section.label}>
              <div className={s.navLabel} data-animate="sidebar">
                {section.label}
              </div>
              {section.items.map((item) => {
                const active = linkActive(pathname, item.href, item.exact)
                return (
                  <Link
                    key={`${section.label}:${item.href}:${item.title}`}
                    href={item.href}
                    className={s.navBtn}
                    data-animate="sidebar"
                    aria-current={active ? 'page' : undefined}
                  >
                    <WorkspaceLordIcon
                      src={item.icon || PLATFORM_ICONS.docs}
                      trigger="hover"
                      target="a"
                      colors={active ? LI_ACTIVE : LI_PRIMARY}
                      size={22}
                    />
                    <span>{item.title}</span>
                  </Link>
                )
              })}
            </div>
          ))}
        </nav>

        <div className={s.sidebarFooter} data-animate="sidebar">
          <div className={s.userCard}>
            <div className={s.userAvatar}>
              <DemoAvatar seed={DEMO_ACCOUNT_SEED} name={DEMO_ACCOUNT_NAME} size={36} className={s.avatar} />
              <UserButton afterSignOutUrl="/" appearance={{ elements: { avatarBox: s.clerkHit } }} />
            </div>
            <div>
              <strong>{DEMO_ACCOUNT_NAME}</strong>
              <span>{brandSubtitle}</span>
            </div>
          </div>
        </div>
      </aside>

      <div className={s.content}>
        <header className={s.topbar}>
          <span className={s.demoBadge}>
            <i />
            Demo · Sample data
          </span>
          <div className={s.utilities}>
            {showCommandPalette && (
              <div className={s.searchSlot}>
                <DemoCommandPalette />
              </div>
            )}
            <div ref={noticesRef} className={s.notification}>
              <button
                className={s.iconButton}
                aria-label={read ? 'Notifications' : 'Notifications, unread updates'}
                aria-expanded={noticeOpen}
                aria-controls="notification-panel"
                onClick={() => setNoticeOpen((value) => !value)}
              >
                <WorkspaceLordIcon
                  src={PLATFORM_ICONS.bell}
                  trigger="hover"
                  target="button"
                  colors={LI_PRIMARY}
                  size={22}
                />
                {!read && <i className={s.unread} aria-hidden="true" />}
              </button>
              {noticeOpen && (
                <div className={s.popover} id="notification-panel" role="dialog" aria-label="Campus updates">
                  <strong>Campus updates</strong>
                  <p>Fresh sample signals from across the demo institute.</p>
                  <ul className={s.noticeList}>
                    <li data-tone="blue">
                      <span className={s.noticeIcon} data-tone="blue">
                        <WorkspaceLordIcon src={PLATFORM_ICONS.learners} trigger="hover" colors={LI_BLUE} size={22} />
                      </span>
                      <div>
                        <b>13 new learners this month</b>
                        <small>Engagement trend is up across active cohorts.</small>
                      </div>
                    </li>
                    <li data-tone="blush">
                      <span className={s.noticeIcon} data-tone="blush">
                        <WorkspaceLordIcon src={PLATFORM_ICONS.fees} trigger="hover" colors={LI_BLUSH} size={22} />
                      </span>
                      <div>
                        <b>1 fee follow-up due</b>
                        <small>A$790 pending on the demo invoice list.</small>
                      </div>
                    </li>
                    <li data-tone="mint">
                      <span className={s.noticeIcon} data-tone="mint">
                        <WorkspaceLordIcon src={PLATFORM_ICONS.schedule} trigger="hover" colors={LI_SAGE} size={22} />
                      </span>
                      <div>
                        <b>NCLEX cohort at 2:00</b>
                        <small>Trainer check-in is next on today’s schedule.</small>
                      </div>
                    </li>
                  </ul>
                  <Link href="/platform" onClick={() => setNoticeOpen(false)}>
                    Open platform map <ArrowRight size={15} />
                  </Link>
                  <button className={s.textButton} type="button" disabled={read} onClick={() => setRead(true)}>
                    {read ? 'All caught up' : 'Mark updates as read'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main id="workspace-main" className={s.main}>
          {children}
        </main>

        <footer className={s.footer}>
          <span>
            <i />
            EdTrack workspace · Press / or ⌘K to switch portals
          </span>
          <Link className={s.textButton} href="/platform">
            All features <ArrowRight size={14} />
          </Link>
        </footer>
      </div>
    </div>
  )
}
