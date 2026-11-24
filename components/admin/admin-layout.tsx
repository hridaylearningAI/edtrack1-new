'use client'

import { useEffect, type ReactNode } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { DidacPortalShell, type PortalNavSection } from '@/components/portal/didac-portal-shell'
import { PLATFORM_ICONS } from '@/components/platform/platform-icons'
import { useUser } from '@/lib/hooks/useUser'
import { isDemoPlatformUser } from '@/lib/demo-platform'

const adminSections: PortalNavSection[] = [
  {
    label: 'Overview',
    items: [
      { title: 'Dashboard', href: '/admin', icon: PLATFORM_ICONS.home, exact: true },
      { title: 'Reports', href: '/admin/reports', icon: PLATFORM_ICONS.analytics },
    ],
  },
  {
    label: 'People',
    items: [
      { title: 'Students', href: '/admin/students', icon: PLATFORM_ICONS.students },
      { title: 'Profiles', href: '/admin/student-profiles', icon: PLATFORM_ICONS.user },
      { title: 'Trainers', href: '/admin/trainers', icon: PLATFORM_ICONS.learning },
      { title: 'Partners', href: '/admin/partners', icon: PLATFORM_ICONS.fees },
    ],
  },
  {
    label: 'Enrolment',
    items: [
      { title: 'Enrol overview', href: '/admin/enrollment-overview', icon: PLATFORM_ICONS.learners },
      { title: 'Enrol student', href: '/admin/enrolment', icon: PLATFORM_ICONS.enrol },
      { title: 'Documents', href: '/admin/documents', icon: PLATFORM_ICONS.docs },
      { title: 'CRM', href: '/admin/crm', icon: PLATFORM_ICONS.crm },
    ],
  },
  {
    label: 'Learning',
    items: [
      { title: 'Courses', href: '/admin/courses', icon: PLATFORM_ICONS.learning },
      { title: 'Theme Studio', href: '/admin/lms-builder', icon: PLATFORM_ICONS.docs },
      { title: 'Content CDN', href: '/admin/course-content', icon: PLATFORM_ICONS.docs },
      { title: 'Progress', href: '/admin/progress', icon: PLATFORM_ICONS.analytics },
      { title: 'Schedule', href: '/admin/schedule', icon: PLATFORM_ICONS.schedule },
      { title: 'Resources', href: '/admin/resources', icon: PLATFORM_ICONS.folder },
      { title: 'Certificates', href: '/admin/certificates', icon: PLATFORM_ICONS.compliance },
    ],
  },
  {
    label: 'Billing',
    items: [
      { title: 'Invoices', href: '/admin/invoices', icon: PLATFORM_ICONS.fees },
      { title: 'Partial payments', href: '/admin/partial-payments', icon: PLATFORM_ICONS.paid },
      { title: 'Discounts', href: '/admin/discounts', icon: PLATFORM_ICONS.continue },
    ],
  },
  {
    label: 'Portals',
    items: [
      { title: 'Student portal', href: '/student', icon: PLATFORM_ICONS.students },
      { title: 'Trainer portal', href: '/trainer', icon: PLATFORM_ICONS.learning },
      { title: 'Partner portal', href: '/partner', icon: PLATFORM_ICONS.fees },
    ],
  },
]

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, isLoading: authLoading, isAuthenticated, roleResolved } = useUser()
  const showPlatformMap = isDemoPlatformUser(user?.email)

  const adminAccess: 'unknown' | 'allowed' | 'denied' = authLoading
    ? 'unknown'
    : !isAuthenticated
      ? 'denied'
      : !roleResolved
        ? 'unknown'
        : user?.role === 'admin' || user?.role === 'super_admin'
          ? 'allowed'
          : 'denied'

  useEffect(() => {
    if (adminAccess !== 'denied') return
    if (pathname.startsWith('/admin')) router.replace('/student')
  }, [adminAccess, pathname, router])

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f3ed] text-sm text-[#4f5853]">
        Loading workspace…
      </div>
    )
  }

  if (adminAccess === 'denied') return null

  // Full-bleed immersive halls — same surface as the platform modules.
  // Theme Studio owns its chrome; hide the campus Platform map sidebar.
  if (
    pathname === '/admin/schedule' ||
    pathname === '/admin/reports' ||
    pathname === '/admin/resources' ||
    pathname === '/admin/lms-builder'
  ) {
    return <>{children}</>
  }

  return (
    <DidacPortalShell
      brandTitle="EdTrack ONE"
      brandSubtitle="Admin workspace"
      brandHref="/admin"
      showPlatformMap={showPlatformMap}
      showCommandPalette
      sections={adminSections}
    >
      {children}
    </DidacPortalShell>
  )
}
