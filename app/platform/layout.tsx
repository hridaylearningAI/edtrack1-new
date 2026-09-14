'use client'

import type { ReactNode } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Loader2 } from 'lucide-react'

export default function PlatformLayout({
  children,
}: {
  children: ReactNode
}) {
  const { isLoaded, isSignedIn } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.replace('/demo')
    }
  }, [isLoaded, isSignedIn, router])

  if (!isLoaded || !isSignedIn) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f9fc] text-[#2054a0]">
        <Loader2 className="h-8 w-8 animate-spin text-[#2054a0]" />
      </div>
    )
  }

  return <>{children}</>
}
