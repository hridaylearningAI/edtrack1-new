'use client'

import { useEffect } from 'react'
import { useUser, useAuth } from '@clerk/nextjs'

/**
 * Hook to sync Clerk user to Supabase when user authenticates
 * This ensures user data is available in Supabase for API calls
 */
export function useClerkUserSync() {
  const { user, isLoaded } = useUser()
  const { getToken } = useAuth()

  useEffect(() => {
    if (!isLoaded || !user || !getToken) return

    // Sync user to Supabase via API
    const syncUser = async () => {
      try {
        // Use getToken from useAuth hook instead of user.getToken()
        const token = await getToken()
        if (!token) return

        // Call API to sync/verify user in Supabase
        const response = await fetch('/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        })

        if (response.ok) {
          const data = await response.json()
        } else {
          console.warn('⚠️ User sync to Supabase failed, but continuing...')
        }
      } catch (error) {
        console.error('Error syncing user to Supabase:', error)
      }
    }

    syncUser()
  }, [user, isLoaded, getToken])
}

