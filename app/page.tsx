'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useUser, useAuth } from '@clerk/nextjs'
import { Loader2 } from 'lucide-react'
import { useClerkUserSync } from '@/lib/hooks/useClerkUserSync'
import { isDemoPlatformUser } from '@/lib/demo-platform'
import { HomeLanding } from '@/components/home-landing'

function HomePageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isLoaded, user } = useUser()
  const { getToken, isSignedIn } = useAuth()
  const [userRole, setUserRole] = useState<string | null>(null)
  const [trainerAccess, setTrainerAccess] = useState<"unknown" | "allowed" | "denied">("unknown")
  const [partnerAccess, setPartnerAccess] = useState<"unknown" | "allowed" | "denied">("unknown")
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false)
  const [sessionCheckAttempts, setSessionCheckAttempts] = useState(0)
  const clerkTokenFromUrl = searchParams.get('clerk_token')
  const fromPortfolio = searchParams.get('from') === 'portfolio' || !!clerkTokenFromUrl
  const [storedToken, setStoredToken] = useState<string | null>(null)
  const [tokenVerified, setTokenVerified] = useState(false)
  
  // Sync Clerk user to Supabase
  useClerkUserSync()

  // Handle token from URL parameter - store it and verify it
  useEffect(() => {
    // Drop stale non-JWT values left in sessionStorage from older flows
    try {
      const stored = sessionStorage.getItem('clerk_auth_token')
      if (stored && stored.split('.').length !== 3) {
        sessionStorage.removeItem('clerk_auth_token')
      }
    } catch {
      // ignore
    }

    if (clerkTokenFromUrl) {
      
      // Store only real JWTs — never persist opaque Clerk cookie values
      try {
        if (clerkTokenFromUrl.split('.').length === 3) {
          sessionStorage.setItem('clerk_auth_token', clerkTokenFromUrl)
          setStoredToken(clerkTokenFromUrl)
        }
      } catch (error) {
        console.error('Error storing token:', error)
      }
      
      // Remove token from URL immediately for security
      const newUrl = new URL(window.location.href)
      newUrl.searchParams.delete('clerk_token')
      window.history.replaceState({}, '', newUrl.toString())
      
      // Verify the token
      const verifyTokenFromUrl = async () => {
        try {
          const response = await fetch('/api/auth/verify-session', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ token: clerkTokenFromUrl }),
          })
          
          if (response.ok) {
            const data = await response.json()
            if (data.success && data.user) {
              setTokenVerified(true)
              
              // Get user role from Supabase
              const roleResponse = await fetch('/api/auth/me', {
                headers: {
                  'Authorization': `Bearer ${clerkTokenFromUrl}`,
                },
              })
              
              if (roleResponse.ok) {
                const roleData = await roleResponse.json()
                const role = roleData.data?.role || data.user.publicMetadata?.role || 'student'
                setUserRole(role)
              } else {
                // Fallback to metadata role
                const role = (data.user.publicMetadata?.role as string) || 'student'
                setUserRole(role)
              }
            } else {
              console.error('❌ Token verification failed:', data.error)
              // Remove invalid token from storage
              sessionStorage.removeItem('clerk_auth_token')
            }
          } else {
            const errorData = await response.json().catch(() => ({}))
            console.error('❌ Token verification failed:', response.status, errorData.error)
            // Remove invalid token from storage
            sessionStorage.removeItem('clerk_auth_token')
          }
        } catch (error) {
          console.error('❌ Error verifying token from URL:', error)
          // Remove invalid token from storage
          sessionStorage.removeItem('clerk_auth_token')
        }
      }
      
      verifyTokenFromUrl()
    } else {
      // Check if we have a stored token from previous visit
      try {
        const stored = sessionStorage.getItem('clerk_auth_token')
        if (stored) {
          setStoredToken(stored)
        }
      } catch (error) {
        console.error('Error reading stored token:', error)
      }
    }
  }, [clerkTokenFromUrl])

  // Check if Clerk session exists via token (even if useUser hasn't loaded yet)
  // This handles cross-origin session sync where cookies exist but useUser hasn't synced yet
  useEffect(() => {
    const checkSessionViaToken = async () => {
      if (!isLoaded || !getToken) return
      
      // Check if Clerk cookies exist - if they do, try to manually verify session
      const hasClerkCookies = typeof document !== 'undefined' && 
        document.cookie.split(';').some(c => c.trim().startsWith('__clerk'))
      
      if (hasClerkCookies && !user && !isSignedIn) {
        
        // Try to manually verify session by calling our API
        if (sessionCheckAttempts === 0 || sessionCheckAttempts % 3 === 0) {
          try {
            // Try to get token - this might trigger Clerk to load the session
            const token = await getToken({ template: 'default' })
            if (token) {
              // Token exists, session is valid - wait for useUser to catch up
              if (sessionCheckAttempts < 20) {
                setTimeout(() => {
                  setSessionCheckAttempts(prev => prev + 1)
                }, 500)
                return
              }
            }
          } catch (error) {
          }
          
          // Also try to verify via API endpoint (verify-session uses cookies directly)
          try {
            const response = await fetch('/api/auth/verify-session', {
              method: 'POST',
              credentials: 'include', // Include cookies
            })
            if (response.ok) {
              const data = await response.json()
              if (data.success && data.user) {
                // Session is valid, force a reload to trigger Clerk to recognize it
                if (sessionCheckAttempts >= 3) {
                  setTimeout(() => {
                    window.location.reload()
                  }, 500)
                  return
                }
                // Wait a bit more for Clerk to sync
                if (sessionCheckAttempts < 20) {
                  setTimeout(() => {
                    setSessionCheckAttempts(prev => prev + 1)
                  }, 500)
                  return
                }
              }
            } else {
              const errorData = await response.json().catch(() => ({}))
            }
          } catch (error) {
          }
        }
        
        // Wait for Clerk to sync
        if (sessionCheckAttempts < 20) {
          setTimeout(() => {
            setSessionCheckAttempts(prev => prev + 1)
          }, 500)
          return
        } else {
        }
      }
      
      // If isSignedIn is true but user is not loaded, wait for sync
      if (isSignedIn && !user) {
        if (sessionCheckAttempts < 20) {
          setTimeout(() => {
            setSessionCheckAttempts(prev => prev + 1)
          }, 500)
          return
        } else {
        }
      }
      
      // Try to get token to verify session
      try {
        const token = await getToken()
        if (token && !user) {
          if (sessionCheckAttempts < 20) {
            setTimeout(() => {
              setSessionCheckAttempts(prev => prev + 1)
            }, 500)
            return
          }
        }
      } catch (error) {
      }
    }
    
    checkSessionViaToken()
  }, [isLoaded, getToken, user, isSignedIn, sessionCheckAttempts])


  useEffect(() => {
    // Wait for Clerk to fully load before making any redirect decisions
    // This prevents redirect loops when opening in a new tab
    if (!isLoaded || !getToken) {
      return
    }
    
    // Check if Clerk cookies exist - if they do, wait longer for session to sync
    const hasClerkCookies = typeof document !== 'undefined' && 
      document.cookie.split(';').some(c => c.trim().startsWith('__clerk'))
    
    // If we have cookies but no session yet, wait longer
    if (hasClerkCookies && !user && !isSignedIn && sessionCheckAttempts < 20) {
      return
    }
    
    // If we have a token but user is not loaded yet, wait a bit more
    // This handles cross-origin session sync delays
    if (isSignedIn && !user && sessionCheckAttempts < 20) {
      return
    }

    // Unauthenticated visitors stay on this app's landing page (no portfolio bounce)
    if (!fromPortfolio && !user && !isSignedIn) {
      return
    }

    
    // Use isSignedIn OR user OR tokenVerified - if any is true, user is authenticated
    // This handles the case where session exists but useUser hasn't synced yet
    // Also handles token from URL parameter
    const isAuthenticated = user || (isSignedIn && sessionCheckAttempts >= 3) || tokenVerified
    
    if (isAuthenticated) {
      // If we have isSignedIn but not user yet, wait a bit more
      if (isSignedIn && !user && sessionCheckAttempts < 10) {
        return
      }
      
      // If we still don't have user after waiting, try to proceed with token
      if (!user && isSignedIn) {
        // We'll handle this case below by trying to get token
      } else if (user) {
      } else {
      }
      
      // Fetch user role from Supabase via API
      const fetchUserRole = async () => {
        try {
          // Use getToken from useAuth hook instead of user.getToken()
          const token = await getToken()
          if (!token) {
            // Fallback to Clerk metadata
            const role = user ? ((user.publicMetadata?.role as string) || 'student') : 'student'
            setUserRole(role)
            setTrainerAccess(role === 'admin' ? 'allowed' : 'denied')
            return
          }

          const response = await fetch('/api/auth/me', {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          })

          if (response.ok) {
            const data = await response.json()
            const role = data.data?.role || (user?.publicMetadata?.role as string) || 'student'
            setUserRole(role)

            if (fromPortfolio && role !== 'admin') {
              try {
                const trainerRes = await fetch('/api/trainers/me', {
                  headers: { 'Authorization': `Bearer ${token}` },
                })
                if (trainerRes.ok) {
                  const trainerData = await trainerRes.json()
                  const allowed = !!trainerData.data?.allowed
                  setTrainerAccess(allowed ? 'allowed' : 'denied')
                } else {
                  setTrainerAccess('denied')
                }
              } catch {
                setTrainerAccess('denied')
              }

              try {
                const partnerRes = await fetch('/api/partners/me', {
                  headers: { 'Authorization': `Bearer ${token}` },
                })
                if (partnerRes.ok) {
                  const partnerData = await partnerRes.json()
                  const allowed = !!partnerData.data?.allowed
                  setPartnerAccess(allowed ? 'allowed' : 'denied')
                } else {
                  setPartnerAccess('denied')
                }
              } catch {
                setPartnerAccess('denied')
              }
            } else {
              setTrainerAccess(role === 'admin' ? 'allowed' : 'unknown')
              setPartnerAccess(role === 'admin' ? 'allowed' : 'unknown')
            }
          } else {
            // Fallback to Clerk metadata
            const role = user ? ((user.publicMetadata?.role as string) || 'student') : 'student'
            setUserRole(role)
            setTrainerAccess(role === 'admin' ? 'allowed' : 'denied')
            setPartnerAccess(role === 'admin' ? 'allowed' : 'denied')
          }
        } catch (error) {
          console.error('Error fetching user role:', error)
          // Fallback to Clerk metadata
          const role = user ? ((user.publicMetadata?.role as string) || 'student') : 'student'
          setUserRole(role)
          setTrainerAccess(role === 'admin' ? 'allowed' : 'denied')
          setPartnerAccess(role === 'admin' ? 'allowed' : 'denied')
        }
      }

      fetchUserRole()
    } else {
      // Check if we have a token even if user is not loaded
      // This handles cross-origin session sync where cookies exist but useUser hasn't synced yet
      const checkTokenAsync = async () => {
        // Wait longer for session to sync - cookies exist, so session might be loading
        if (sessionCheckAttempts < 15) {
          // Wait up to 7.5 seconds (15 attempts * 500ms) for Clerk to sync session
          setTimeout(() => {
            setSessionCheckAttempts(prev => prev + 1)
          }, 500)
          return
        }
        
        try {
          const token = await getToken()
          if (token) {
            // Token exists, so user is authenticated - just wait for useUser to catch up
            // Don't redirect, just wait
            return
          }
        } catch (error) {
        }
        
        // No token found after waiting, user is truly not authenticated
        
        // Prevent multiple redirect attempts (avoid loops)
        if (hasCheckedAuth) {
          // Show a message to user instead of redirecting
          return
        }
        setHasCheckedAuth(true)
        
        // If coming from portfolio but not authenticated after Clerk has loaded
        // DON'T redirect back - this causes loops. Stay on homepage landing.
        if (fromPortfolio) {
          return
        }
        // Unauthenticated — landing page renders below; no portfolio /login bounce
      }
      
      checkTokenAsync()
    }
  }, [isLoaded, user, getToken, isSignedIn, router, fromPortfolio, hasCheckedAuth, sessionCheckAttempts])

  // Redirect once we have the user role
  // Allow redirect if we have userRole and either user object, isSignedIn, or tokenVerified
  useEffect(() => {
    if (!userRole) return
    
    if (fromPortfolio && userRole !== 'admin' && (trainerAccess === 'unknown' || partnerAccess === 'unknown')) {
      // Wait for `/api/trainers/me` + `/api/partners/me` to decide portal routing.
      return
    }
    
    const userEmail =
      user?.primaryEmailAddress?.emailAddress ||
      user?.emailAddresses?.[0]?.emailAddress ||
      null

    // Dedicated demo platform account always lands on the overview map
    if (isDemoPlatformUser(userEmail)) {
      router.replace('/platform')
      return
    }

    // If we have tokenVerified, we can redirect immediately
    if (tokenVerified && userRole) {
      const redirectPath =
        userRole === 'super_admin'
          ? '/super-admin'
          : userRole === 'admin'
          ? '/admin'
          : fromPortfolio && trainerAccess === 'allowed'
            ? '/trainer'
            : fromPortfolio && partnerAccess === 'allowed'
              ? '/partner'
            : '/student'
      router.replace(redirectPath)
      return
    }
    
    // Otherwise, wait for Clerk to load
    if (!isLoaded) return
    
    // If we have isSignedIn but not user yet, wait a bit more
    if (isSignedIn && !user && sessionCheckAttempts < 5) {
      return
    }
    
    // If we don't have user and not signed in and not token verified, don't redirect
    if (!user && !isSignedIn && !tokenVerified) {
      return
    }

    const redirectPath =
      userRole === 'super_admin'
        ? '/super-admin'
        : userRole === 'admin'
        ? '/admin'
        : fromPortfolio && trainerAccess === 'allowed'
          ? '/trainer'
          : fromPortfolio && partnerAccess === 'allowed'
            ? '/partner'
          : '/student'
    
    if (fromPortfolio) {
      router.replace(redirectPath)
    } else {
      router.push(redirectPath)
    }
  }, [isLoaded, user, isSignedIn, userRole, trainerAccess, partnerAccess, router, fromPortfolio, sessionCheckAttempts, tokenVerified])

  // Signed out / session expired: simple landing (stay on this site)
  if (isLoaded && !isSignedIn && !tokenVerified && !user) {
    return <HomeLanding />
  }

  // Session missing after waiting — show landing instead of portfolio bounce
  const showError = hasCheckedAuth && !user && !isSignedIn && sessionCheckAttempts >= 20
  
  if (showError) {
    return <HomeLanding />
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading session...</h2>
        <p className="text-gray-600">Please wait while we verify your authentication.</p>
        {sessionCheckAttempts > 5 && (
          <p className="text-sm text-gray-500 mt-2">This may take a few moments...</p>
        )}
      </div>
    </div>
  )
}

export default function HomePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading...</h2>
          <p className="text-gray-600">Please wait while we load the page...</p>
        </div>
      </div>
    }>
      <HomePageContent />
    </Suspense>
  )
}
