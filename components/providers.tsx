'use client'

import { Toaster } from 'sonner'
import { UserProvider } from '@/lib/hooks/useUser'
import { SessionListener } from '@/components/session-listener'
import { EnsureDefaultOrganization } from '@/components/ensure-default-organization'
import { DemoDataProvider } from '@/components/demo-data-provider'

interface ProvidersProps {
  children: React.ReactNode
}

export function Providers({ children }: ProvidersProps) {
  return (
    <UserProvider>
      <SessionListener />
      <EnsureDefaultOrganization />
      <DemoDataProvider>{children}</DemoDataProvider>
      <Toaster position="top-right" richColors />
    </UserProvider>
  )
}
