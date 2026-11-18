'use client'

import { useEffect, useRef } from 'react'
import { useUser } from '@clerk/nextjs'
import { demoAccountAvatarUrl } from '@/lib/demo-avatars'
import { getDemoPlatformEmail } from '@/lib/demo-platform'

const SYNC_FLAG = 'edtrack-demo-dicebear-avatar-v1'

/**
 * Keeps the signed-in demo Clerk account on a stable DiceBear portrait
 * so UserButton avatars match the rest of the demo UI.
 */
export function DemoClerkAvatarSync() {
  const { isLoaded, user } = useUser()
  const busy = useRef(false)

  useEffect(() => {
    if (!isLoaded || !user || busy.current) return

    const email = user.primaryEmailAddress?.emailAddress?.toLowerCase()
    if (!email || email !== getDemoPlatformEmail()) return
    if (user.imageUrl?.includes('dicebear.com')) return
    if (typeof window !== 'undefined' && sessionStorage.getItem(SYNC_FLAG) === user.id) return

    let cancelled = false
    busy.current = true

    ;(async () => {
      try {
        const response = await fetch(demoAccountAvatarUrl({ format: 'png', size: 256 }))
        if (!response.ok) return
        const blob = await response.blob()
        if (cancelled) return
        const file = new File([blob], 'demo-avatar.png', { type: blob.type || 'image/png' })
        await user.setProfileImage({ file })
        sessionStorage.setItem(SYNC_FLAG, user.id)
      } catch {
        /* Demo browsing continues even if Clerk image upload is unavailable. */
      } finally {
        busy.current = false
      }
    })()

    return () => {
      cancelled = true
    }
  }, [isLoaded, user])

  return null
}
