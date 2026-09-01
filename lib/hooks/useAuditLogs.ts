import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { useUser } from "@/lib/hooks/useUser"
import type { PlatformAuditLog } from "@/lib/types/audit"

export function useAuditLogs(tenantId?: string) {
  const { getAccessToken } = useUser()
  const [logs, setLogs] = useState<PlatformAuditLog[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const token = await getAccessToken()
      const params = new URLSearchParams()
      if (tenantId) params.set("tenant_id", tenantId)
      params.set("limit", "50")
      const res = await fetch(`/api/super-admin/audit-logs?${params}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        cache: "no-store",
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to load audit logs")
      }
      setLogs(json.data?.logs ?? [])
      setTotal(json.data?.total ?? 0)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load audit logs"
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }, [getAccessToken, tenantId])

  useEffect(() => {
    void fetchLogs()
  }, [fetchLogs])

  return { logs, total, loading, error, fetchLogs }
}
