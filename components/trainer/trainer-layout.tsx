'use client'

import { useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { DidacPortalShell, type PortalNavSection } from '@/components/portal/didac-portal-shell'
import { PLATFORM_ICONS } from '@/components/platform/platform-icons'
import { useUser } from '@/lib/hooks/useUser'
import { isDemoPlatformUser } from '@/lib/demo-platform'

const trainerSections: PortalNavSection[] = [
  {
    label: 'Workspace',
    items: [
      { title: 'Dashboard', href: '/trainer', icon: PLATFORM_ICONS.home, exact: true },
      { title: 'My courses', href: '/trainer/courses', icon: PLATFORM_ICONS.learning },
      { title: 'Theme Studio', href: '/trainer/content', icon: PLATFORM_ICONS.docs },
      { title: 'Schedule', href: '/trainer/schedule', icon: PLATFORM_ICONS.schedule },
    ],
  },
  {
    label: 'Exam prep',
    items: [
      { title: 'NCLEX tools', href: '/trainer/nclex', icon: PLATFORM_ICONS.compliance },
      { title: 'Mock proctoring', href: '/trainer/nclex/proctoring', icon: PLATFORM_ICONS.analytics },
    ],
  },
  {
    label: 'Portals',
    items: [
      { title: 'Admin SMS', href: '/admin', icon: PLATFORM_ICONS.docs },
      { title: 'Student portal', href: '/student', icon: PLATFORM_ICONS.students },
      { title: 'Partner portal', href: '/partner', icon: PLATFORM_ICONS.fees },
    ],
  },
]

export default function TrainerLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const { user, isAuthenticated, isLoading, getAccessToken } = useUser()
  const [trainerAccess, setTrainerAccess] = useState<'loading' | 'allowed' | 'denied'>('loading')
  const showPlatformMap = isDemoPlatformUser(user?.email)
  const isDemo = isDemoPlatformUser(user?.email)
  const immersiveSchedule = pathname === '/trainer/schedule'

  useEffect(() => {
    let cancelled = false
    if (isLoading) return
    if (!isAuthenticated) {
      setTrainerAccess('denied')
      return
    }
    // Demo account is always a trainer for showcase (also stubbed in demo-data).
    if (isDemo) {
      setTrainerAccess('allowed')
      return
    }
    ;(async () => {
      try {
        const token = await getAccessToken()
        if (!token) throw new Error('Auth token missing')
        const res = await fetch('/api/trainers/me', {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        })
        const json = await res.json().catch(() => ({}))
        if (!cancelled) setTrainerAccess(json?.data?.allowed ? 'allowed' : 'denied')
      } catch {
        if (!cancelled) setTrainerAccess('denied')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [getAccessToken, isAuthenticated, isDemo, isLoading])

  if (trainerAccess === 'loading') {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-[#f5f3ed]">
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-[#245ac6]" />
          <p className="text-sm text-[#4f5853]">Checking trainer access…</p>
        </div>
      </div>
    )
  }

  if (trainerAccess === 'denied') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f3ed]">
        <div className="w-full max-w-md rounded-[16px] border border-[#d8dfd2] bg-[#fafaf7] p-6 text-center">
          <p className="mb-2 text-lg font-semibold text-[#263432]">Access denied</p>
          <p className="mb-5 text-sm text-[#4f5853]">
            You don’t have access to the trainer portal. Contact your administrator if you need access.
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

  if (immersiveSchedule) {
    return <>{children}</>
  }

  return (
    <DidacPortalShell
      brandTitle="EdTrack ONE"
      brandSubtitle="Trainer workspace"
      brandHref="/trainer"
      showPlatformMap={showPlatformMap}
      showCommandPalette
      sections={trainerSections}
    >
      {children}
    </DidacPortalShell>
  )
}
