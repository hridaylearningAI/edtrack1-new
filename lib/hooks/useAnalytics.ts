import { useState, useCallback, useEffect, useRef } from 'react'
import { useAuth } from '@clerk/nextjs'
import { toast } from 'sonner'

import type { AnalyticsData } from '@/lib/types/analytics'

export type { AnalyticsData } from '@/lib/types/analytics'

interface UseAnalyticsReturn {
  data: AnalyticsData | null
  loading: boolean
  error: string | null
  refreshData: () => Promise<void>
}

async function getBearer(getToken: (() => Promise<string | null>) | null) {
  try {
    if (getToken) {
      const token = await getToken()
      if (token) return token
    }
  } catch {
    // fall through
  }
  if (typeof window !== 'undefined') {
    return sessionStorage.getItem('clerk_auth_token')
  }
  return null
}

export function useAnalytics(): UseAnalyticsReturn {
  const auth = useAuth()
  const getToken = auth?.getToken || null
  const getTokenRef = useRef(getToken)
  getTokenRef.current = getToken

  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAnalyticsData = useCallback(async (opts?: { silent?: boolean }) => {
    try {
      if (!opts?.silent) setLoading(true)
      setError(null)

      const token = await getBearer(getTokenRef.current)
      const res = await fetch('/api/admin/analytics', {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      })
      const json = await res.json().catch(() => ({}))

      if (!res.ok || !json?.success) {
        throw new Error(json?.error || json?.message || 'Failed to fetch analytics data')
      }

      setData(json.data as AnalyticsData)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch analytics data'
      setError(errorMessage)
      if (!opts?.silent) toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [])

  const refreshData = useCallback(async () => {
    await fetchAnalyticsData({ silent: false })
  }, [fetchAnalyticsData])

  useEffect(() => {
    fetchAnalyticsData()
  }, [fetchAnalyticsData])

  return {
    data,
    loading,
    error,
    refreshData,
  }
}
