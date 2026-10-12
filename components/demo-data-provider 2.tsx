'use client'

import type { ReactNode } from 'react'
import { useUser } from '@clerk/nextjs'
import { isDemoPlatformUser } from '@/lib/demo-platform'
import { configureDemoData } from '@/lib/demo-data'

/** Serves sample data to the demo account; everyone else talks to the real API. */
export function DemoDataProvider({ children }: { children: ReactNode }) {
  const { user, isLoaded } = useUser()
  // ponytail: configured during render (idempotent) so the wrapper exists before any page fetches on mount.
  configureDemoData({ loaded: isLoaded, isDemo: isDemoPlatformUser(user?.primaryEmailAddress?.emailAddress) })
  return <>{children}</>
}
