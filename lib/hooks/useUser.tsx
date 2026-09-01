'use client'

import { createContext, useContext, useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { useUser as useClerkUser, useAuth as useClerkAuth } from '@clerk/nextjs'
import { User, AuthState, UserRole } from '@/lib/types'

interface UserContextType extends AuthState {
  refreshUser: () => Promise<User | null>
  getAccessToken: () => Promise<string | null>
  clerkUserId: string | null
  /** True once Supabase/DB role has been resolved (or failed) for the current session. */
  roleResolved: boolean
}

const UserContext = createContext<UserContextType | undefined>(undefined)

export const useUser = () => {
  const context = useContext(UserContext)
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider')
  }
  return context
}

interface UserProviderProps {
  children: React.ReactNode
}

// Map Clerk user to our User type
const mapClerkUserToUser = (clerkUser: any): User | null => {
  if (!clerkUser) return null
  
  return {
    id: clerkUser.id,
    email: clerkUser.emailAddresses?.[0]?.emailAddress || '',
    name: clerkUser.firstName && clerkUser.lastName
      ? `${clerkUser.firstName} ${clerkUser.lastName}`
      : clerkUser.firstName || clerkUser.emailAddresses?.[0]?.emailAddress?.split('@')[0] || 'User',
    role: (clerkUser.publicMetadata?.role as UserRole) || 'student',
    avatar: clerkUser.imageUrl || null,
    createdAt: clerkUser.createdAt ? new Date(clerkUser.createdAt).toISOString() : new Date().toISOString(),
  }
}

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const { user: clerkUser, isLoaded: isUserLoaded } = useClerkUser()
  const { getToken } = useClerkAuth()
  const [tokenBasedUser, setTokenBasedUser] = useState<User | null>(null)
  const [tokenAuthLoading, setTokenAuthLoading] = useState(true)
  const [dbRole, setDbRole] = useState<UserRole | null>(null)
  const [roleResolved, setRoleResolved] = useState(false)
  
  // Listen for logout events to clear token-based user
  useEffect(() => {
    const handleLogout = () => {
      setTokenBasedUser(null)
      setTokenAuthLoading(false)
      try {
        sessionStorage.removeItem('clerk_auth_token')
      } catch (error) {
        console.warn('Error clearing token on logout:', error)
      }
    }

    // Listen for storage events (logout from another tab)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'clerk_auth_token' && !e.newValue && tokenBasedUser) {
        handleLogout()
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [tokenBasedUser])

  // Check for token-based authentication if Clerk user is not available
  useEffect(() => {
    if (!clerkUser && isUserLoaded) {
      // Check for stored token from URL parameter authentication
      const checkTokenAuth = async () => {
        try {
          const storedToken = sessionStorage.getItem('clerk_auth_token')
          if (storedToken) {
            setTokenAuthLoading(true)
            
            // Verify token and get user info
            const response = await fetch('/api/auth/verify-session', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ token: storedToken }),
            })
            
            if (response.ok) {
              const data = await response.json()
              if (data.success && data.user) {
                // Get user role from Supabase
                const roleResponse = await fetch('/api/auth/me', {
                  headers: {
                    'Authorization': `Bearer ${storedToken}`,
                  },
                })
                
                let role = 'student'
                if (roleResponse.ok) {
                  const roleData = await roleResponse.json()
                  role = roleData.data?.role || data.user.publicMetadata?.role || 'student'
                } else {
                  role = (data.user.publicMetadata?.role as string) || 'student'
                }
                
                // Map to User type
                const mappedUser: User = {
                  id: data.user.id,
                  email: data.user.email || '',
                  name: data.user.firstName && data.user.lastName
                    ? `${data.user.firstName} ${data.user.lastName}`
                    : data.user.firstName || data.user.email?.split('@')[0] || 'User',
                  role: role as UserRole,
                  avatar: data.user.imageUrl || null,
                  createdAt: new Date().toISOString(),
                }
                
                setTokenBasedUser(mappedUser)
              } else {
                // Invalid token, remove it
                sessionStorage.removeItem('clerk_auth_token')
                setTokenBasedUser(null)
              }
            } else {
              // Token verification failed, remove it
              sessionStorage.removeItem('clerk_auth_token')
              setTokenBasedUser(null)
            }
          } else {
            setTokenBasedUser(null)
          }
        } catch (error) {
          console.error('Error checking token auth:', error)
          setTokenBasedUser(null)
        } finally {
          setTokenAuthLoading(false)
        }
      }
      
      checkTokenAuth()
    } else if (clerkUser) {
      // Clerk user is available, clear token-based user
      setTokenBasedUser(null)
      setTokenAuthLoading(false)
    } else if (!isUserLoaded) {
      // Still loading Clerk
      setTokenAuthLoading(true)
    }
  }, [clerkUser, isUserLoaded])
  
  // Map Clerk user to our User type, preferring DB role when available
  const user = useMemo(() => {
    const base = clerkUser ? mapClerkUserToUser(clerkUser) : tokenBasedUser
    if (!base) return null
    if (dbRole) {
      return { ...base, role: dbRole }
    }
    return base
  }, [clerkUser, tokenBasedUser, dbRole])
  
  const isAuthenticated = useMemo(() => {
    return (!!clerkUser && isUserLoaded) || !!tokenBasedUser
  }, [clerkUser, isUserLoaded, tokenBasedUser])

  // Create auth state
  const authState: AuthState = useMemo(() => ({
    user,
    isAuthenticated,
    isLoading: !isUserLoaded || tokenAuthLoading,
    error: null,
  }), [user, isAuthenticated, isUserLoaded, tokenAuthLoading])

  const refreshUser = useCallback(async () => {
    return user
  }, [user])

  // Keep Clerk's getToken behind a ref so getAccessToken identity stays stable.
  // An unstable getAccessToken re-triggers course/progress fetch effects and makes the learn page "refresh".
  const getTokenRef = useRef(getToken)
  getTokenRef.current = getToken
  const hasClerkUser = !!clerkUser
  const hasTokenUser = !!tokenBasedUser

  const getAccessToken = useCallback(async () => {
    if (!isAuthenticated) return null
    try {
      // Clerk users: use getToken()
      if (hasClerkUser) {
        return await getTokenRef.current()
      }
      // Token-based users (sessionStorage): return stored token
      if (hasTokenUser && typeof window !== 'undefined') {
        return sessionStorage.getItem('clerk_auth_token')
      }
      return null
    } catch (error) {
      console.error('Error getting auth token:', error)
      return null
    }
  }, [isAuthenticated, hasClerkUser, hasTokenUser])

  // Resolve authoritative role from Supabase once per session (avoids per-layout /api/auth/me gates).
  useEffect(() => {
    if (!isAuthenticated || authState.isLoading) {
      setDbRole(null)
      setRoleResolved(false)
      return
    }

    let cancelled = false
    ;(async () => {
      try {
        const token = await getAccessToken()
        if (!token) {
          if (!cancelled) {
            setDbRole(null)
            setRoleResolved(true)
          }
          return
        }
        const res = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) {
          if (!cancelled) {
            setDbRole(null)
            setRoleResolved(true)
          }
          return
        }
        const data = await res.json()
        const role = data?.data?.role
        if (!cancelled) {
          if (role === 'super_admin' || role === 'admin' || role === 'student') {
            setDbRole(role)
          } else {
            setDbRole('student')
          }
          setRoleResolved(true)
        }
      } catch {
        if (!cancelled) {
          setDbRole(null)
          setRoleResolved(true)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [isAuthenticated, authState.isLoading, getAccessToken])

  const value: UserContextType = useMemo(() => ({
    ...authState,
    refreshUser,
    getAccessToken,
    clerkUserId: clerkUser?.id || null,
    roleResolved,
  }), [authState, refreshUser, getAccessToken, clerkUser?.id, roleResolved])

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  )
}
