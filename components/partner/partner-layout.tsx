'use client'

import { useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { DidacPortalShell, type PortalNavSection } from '@/components/portal/didac-portal-shell'
import { PLATFORM_ICONS } from '@/components/platform/platform-icons'
import { useUser } from '@/lib/hooks/useUser'
import { isDemoPlatformUser } from '@/lib/demo-platform'

const partnerSections: PortalNavSection[] = [
  {
    label: 'Workspace',
    items: [
      { title: 'Dashboard', href: '/partner', icon: PLATFORM_ICONS.home, exact: true },
      { title: 'Enrolments', href: '/partner/enrollments', icon: PLATFORM_ICONS.students },
      { title: 'Enquiries', href: '/partner/enquiries', icon: PLATFORM_ICONS.crm },
      { title: 'Schedule', href: '/partner/schedule', icon: PLATFORM_ICONS.schedule },
      { title: 'My profile', href: '/partner/profile', icon: PLATFORM_ICONS.user },
    ],
  },
  {
    label: 'Portals',
    items: [
      { title: 'Admin SMS', href: '/admin', icon: PLATFORM_ICONS.docs },
      { title: 'Student portal', href: '/student', icon: PLATFORM_ICONS.students },
      { title: 'Trainer portal', href: '/trainer', icon: PLATFORM_ICONS.learning },
    ],
  },
]

export default function PartnerLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const { user, isAuthenticated, isLoading, getAccessToken } = useUser()
  const [partnerAccess, setPartnerAccess] = useState<'loading' | 'allowed' | 'denied'>('loading')
  const showPlatformMap = isDemoPlatformUser(user?.email)
  const immersiveHall = pathname === '/partner/schedule'

  useEffect(() => {
    let cancelled = false
    if (isLoading) return
    if (!isAuthenticated) {
      setPartnerAccess('denied')
      return
    }
    ;(async () => {
      try {
        const token = await getAccessToken()
        if (!token) throw new Error('Auth token missing')
        const res = await fetch('/api/partners/me', {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        })
        const json = await res.json().catch(() => ({}))
        if (!cancelled) setPartnerAccess(json?.data?.allowed ? 'allowed' : 'denied')
      } catch {
        if (!cancelled) setPartnerAccess('denied')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [getAccessToken, isAuthenticated, isLoading])

  if (partnerAccess === 'loading') {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#f5f3ed]">
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-[#245ac6]" />
          <p className="text-sm text-[#4f5853]">Checking partner access…</p>
        </div>
      </div>
    )
  }

  if (partnerAccess === 'denied') {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-[#f5f3ed]">
        <div className="w-full max-w-md rounded-[16px] border border-[#d8dfd2] bg-[#fafaf7] p-6 text-center">
          <p className="mb-2 text-lg font-semibold text-[#263432]">Access denied</p>
          <p className="mb-5 text-sm text-[#4f5853]">
            You don’t have access to the partner portal. Contact your administrator if you need access.
          </p>
          <Link
            href="/student"
            className="inline-flex min-h-10 items-center justify-center rounded-full bg-[#263a32] px-4 text-sm font-semibold text-white"
          >
            Go to dashboard
          </Link>
        </div>
      </div>
    )
  }

  if (immersiveHall) {
    return <>{children}</>
  }

  return (
    <DidacPortalShell
      brandTitle="EdTrack ONE"
      brandSubtitle="Partner workspace"
      brandHref="/partner"
      showPlatformMap={showPlatformMap}
      showCommandPalette
      sections={partnerSections}
    >
      {children}
    </DidacPortalShell>
  )
}
