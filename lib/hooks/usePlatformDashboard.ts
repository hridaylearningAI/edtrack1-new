import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { useUser } from "@/lib/hooks/useUser"
import type { PlatformDashboardStats } from "@/lib/types/tenant"

export function usePlatformDashboard() {
  const { getAccessToken } = useUser()
  const [stats, setStats] = useState<PlatformDashboardStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchDashboard = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const token = await getAccessToken()
      const res = await fetch("/api/super-admin/dashboard", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        cache: "no-store",
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to load dashboard")
      }
      setStats(json.data)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load dashboard"
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }, [getAccessToken])

  useEffect(() => {
    void fetchDashboard()
  }, [fetchDashboard])

  return { stats, loading, error, fetchDashboard }
}
