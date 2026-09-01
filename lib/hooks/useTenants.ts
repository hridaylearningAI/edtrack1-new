import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { useUser } from "@/lib/hooks/useUser"
import type { Tenant, TenantCreateInput, TenantUpdateInput } from "@/lib/types/tenant"

interface UseTenantsReturn {
  tenants: Tenant[]
  loading: boolean
  error: string | null
  fetchTenants: () => Promise<void>
  createTenant: (input: TenantCreateInput) => Promise<Tenant | null>
  updateTenant: (id: string, input: TenantUpdateInput) => Promise<Tenant | null>
}

export function useTenants(): UseTenantsReturn {
  const { getAccessToken } = useUser()
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchTenants = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const token = await getAccessToken()
      const res = await fetch("/api/super-admin/tenants", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        cache: "no-store",
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to load tenants")
      }
      setTenants(json.data ?? [])
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load tenants"
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }, [getAccessToken])

  const createTenant = useCallback(
    async (input: TenantCreateInput) => {
      try {
        const token = await getAccessToken()
        const res = await fetch("/api/super-admin/tenants", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(input),
        })
        const json = await res.json()
        if (!res.ok || !json.success) {
          throw new Error(json.message || "Failed to create tenant")
        }
        const tenant = json.data?.tenant as Tenant | undefined
        toast.success(json.message || "Tenant created")
        await fetchTenants()
        return tenant ?? null
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to create tenant"
        toast.error(message)
        return null
      }
    },
    [getAccessToken, fetchTenants]
  )

  const updateTenant = useCallback(
    async (id: string, input: TenantUpdateInput) => {
      try {
        const token = await getAccessToken()
        const res = await fetch(`/api/super-admin/tenants/${id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(input),
        })
        const json = await res.json()
        if (!res.ok || !json.success) {
          throw new Error(json.message || "Failed to update tenant")
        }
        const tenant = json.data as Tenant
        toast.success(json.message || "Tenant updated")
        await fetchTenants()
        return tenant
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to update tenant"
        toast.error(message)
        return null
      }
    },
    [getAccessToken, fetchTenants]
  )

  useEffect(() => {
    void fetchTenants()
  }, [fetchTenants])

  return {
    tenants,
    loading,
    error,
    fetchTenants,
    createTenant,
    updateTenant,
  }
}
