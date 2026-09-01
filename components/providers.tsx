'use client'

import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from 'sonner'
import { UserProvider } from '@/lib/hooks/useUser'
import { SessionListener } from '@/components/session-listener'
import { EnsureDefaultOrganization } from '@/components/ensure-default-organization'

interface ProvidersProps {
  children: React.ReactNode
}

export function Providers({ children }: ProvidersProps) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange
    >
      <UserProvider>
        <SessionListener />
        <EnsureDefaultOrganization />
        {children}
        <Toaster position="top-right" richColors />
      </UserProvider>
    </ThemeProvider>
  )
}
