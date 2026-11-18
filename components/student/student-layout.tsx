'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { DidacPortalShell, type PortalNavSection } from '@/components/portal/didac-portal-shell'
import { PLATFORM_ICONS } from '@/components/platform/platform-icons'
import { StudentTopBarActionsProvider } from '@/lib/contexts/student-top-bar-actions'
import { useEnrollments } from '@/lib/hooks/useEnrollments'
import { EdTecTopBar } from '@/components/edtec-top-bar'
import { useUser } from '@/lib/hooks/useUser'
import { isDemoPlatformUser } from '@/lib/demo-platform'

const studentSections: PortalNavSection[] = [
  {
    label: 'Learning',
    items: [
      { title: 'Dashboard', href: '/student', icon: PLATFORM_ICONS.home, exact: true },
      { title: 'Current units', href: '/student/current-units', icon: PLATFORM_ICONS.learning },
      { title: 'Completed units', href: '/student/completed-units', icon: PLATFORM_ICONS.compliance },
      { title: 'Certificates', href: '/student/certificates', icon: PLATFORM_ICONS.assessments },
    ],
  },
  {
    label: 'Account',
    items: [
      { title: 'Financial info', href: '/student/financial', icon: PLATFORM_ICONS.fees },
      { title: 'Get support', href: '/student/support', icon: PLATFORM_ICONS.docs },
      { title: 'Quick actions', href: '/student/quick-actions', icon: PLATFORM_ICONS.continue },
    ],
  },
  {
    label: 'Portals',
    items: [
      { title: 'Admin SMS', href: '/admin', icon: PLATFORM_ICONS.docs },
      { title: 'Trainer portal', href: '/trainer', icon: PLATFORM_ICONS.learning },
      { title: 'Partner portal', href: '/partner', icon: PLATFORM_ICONS.fees },
    ],
  },
]

export default function StudentLayout({
  children,
  immersive = false,
}: {
  children: ReactNode
  immersive?: boolean
}) {
  const pathname = usePathname()
  const { enrollments, loading: enrollmentsLoading } = useEnrollments()
  const { user } = useUser()
  // Defer demo-only chrome until mount so SSR HTML matches the first client paint.
  const [demoReady, setDemoReady] = useState(false)
  useEffect(() => setDemoReady(true), [])
  const hasNoEnrollments = !enrollmentsLoading && enrollments.length === 0
  const isOnCourseTrial = /^\/student\/course\/\d+$/.test(pathname)
  const showPlatformMap = demoReady && isDemoPlatformUser(user?.email)

  if (immersive || isOnCourseTrial || hasNoEnrollments) {
    return (
      <StudentTopBarActionsProvider>
        <div className="flex h-screen w-full flex-col overflow-hidden bg-[#f5f3ed]">
          {!immersive && (
            <EdTecTopBar
              portalLabel="MyEdtec"
              showUserButton={hasNoEnrollments}
              backLabel={isOnCourseTrial ? 'Back to Courses' : undefined}
              backHref={isOnCourseTrial ? '/student/current-units' : undefined}
            />
          )}
          <div className={`min-h-0 w-full flex-1 ${immersive ? 'overflow-hidden' : 'overflow-y-auto px-4 py-5 md:px-9 md:py-8'}`}>
            {children}
          </div>
        </div>
      </StudentTopBarActionsProvider>
    )
  }

  return (
    <StudentTopBarActionsProvider>
      <DidacPortalShell
        brandTitle="EdTrack ONE"
        brandSubtitle="Student workspace"
        brandHref="/student"
        showPlatformMap={showPlatformMap}
        showCommandPalette
        sections={studentSections}
      >
        {children}
      </DidacPortalShell>
    </StudentTopBarActionsProvider>
  )
}
