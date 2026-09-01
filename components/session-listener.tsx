'use client'

import { useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'

/**
 * Component that listens to Clerk session changes and handles cross-app logout
 * When user logs out from portfolio app, this detects the session change and redirects
 */
export function SessionListener() {
  const { isSignedIn, isLoaded, getToken } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const previousSignedInState = useRef<boolean | null>(null)
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Check if user is on a protected route
  const isProtectedRoute = pathname && 
    !pathname.startsWith('/login') && 
    !pathname.startsWith('/signup') &&
    pathname !== '/'

  // Main effect: Detect session changes
  useEffect(() => {
    // Wait for Clerk to load
    if (!isLoaded) return

    // Initialize previous state on first load
    if (previousSignedInState.current === null) {
      previousSignedInState.current = isSignedIn
      return
    }

    // Detect when user logs out (session change from signed in to signed out)
    if (previousSignedInState.current === true && isSignedIn === false) {
      
      // Don't redirect if already on login/signup page
      if (!isProtectedRoute) {
        return
      }

      // Redirect to login page
      router.push('/login')
    }

    // Update previous state
    previousSignedInState.current = isSignedIn
  }, [isSignedIn, isLoaded, router, pathname, isProtectedRoute])

  // Periodic session check (for cross-origin logout detection)
  // Clerk may not immediately propagate session changes across different origins
  useEffect(() => {
    if (!isLoaded || !isProtectedRoute) {
      // Clear interval if not on protected route
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current)
        checkIntervalRef.current = null
      }
      return
    }

    // Check session every 2 seconds when on protected routes
    checkIntervalRef.current = setInterval(async () => {
      try {
        // Try to get token - if session is invalid, this will fail or return null
        const token = await getToken()
        
        // If we were previously signed in but now can't get a token, user was logged out
        if (previousSignedInState.current === true && !token && isSignedIn === false) {
          router.push('/login')
        }
      } catch (error) {
        // If getting token fails, session might be invalid
        if (previousSignedInState.current === true) {
          router.push('/login')
        }
      }
    }, 2000) // Check every 2 seconds

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current)
        checkIntervalRef.current = null
      }
    }
  }, [isLoaded, isProtectedRoute, getToken, isSignedIn, router])

  // Listen to storage events (for cross-tab logout detection)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      // If Clerk session is cleared in another tab/window
      if (e.key === '__clerk_db_jwt' || e.key?.includes('clerk')) {
        // Check if user is still signed in
        if (!isSignedIn && isLoaded && isProtectedRoute) {
          router.push('/login')
        }
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [isSignedIn, isLoaded, router, isProtectedRoute])

  return null // This component doesn't render anything
}

