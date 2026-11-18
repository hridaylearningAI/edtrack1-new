'use client'

import type { ReactNode } from 'react'
import { DidacPortalShell } from '@/components/portal/didac-portal-shell'
import { PLATFORM_ICONS } from './platform-icons'

const demoSections = [
  {
    label: 'Demo ops',
    items: [
      { title: 'Learner directory', href: '/platform/students', icon: PLATFORM_ICONS.students },
      { title: 'Learning', href: '/platform/modules/lms', icon: PLATFORM_ICONS.learning },
      { title: 'Fees', href: '/platform/modules/fees', icon: PLATFORM_ICONS.fees },
      { title: 'Compliance', href: '/platform/modules/comply-vet', icon: PLATFORM_ICONS.compliance },
    ],
  },
  {
    label: 'Portals',
    items: [
      { title: 'Admin SMS', href: '/admin', icon: PLATFORM_ICONS.docs },
      { title: 'Student portal', href: '/student', icon: PLATFORM_ICONS.students },
      { title: 'Trainer portal', href: '/trainer', icon: PLATFORM_ICONS.learning },
      { title: 'Partner portal', href: '/partner', icon: PLATFORM_ICONS.fees },
    ],
  },
]

/** Lightweight demo chrome for remaining platform ops pages. Feature catalog lives at `/platform`. */
export function WorkspaceShell({ children }: { children: ReactNode }) {
  return (
    <DidacPortalShell
      brandTitle="EdTrack ONE"
      brandSubtitle="Demo Institute"
      brandHref="/platform"
      showPlatformMap
      showCommandPalette
      sections={demoSections}
    >
      {children}
    </DidacPortalShell>
  )
}
