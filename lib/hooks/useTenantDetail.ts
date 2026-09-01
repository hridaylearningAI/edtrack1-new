import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { useUser } from "@/lib/hooks/useUser"
import type { TenantUpdateInput, TenantWithUsage } from "@/lib/types/tenant"
import type { TenantUserRow } from "@/lib/api/tenant"

export function useTenantDetail(tenantId: string) {
  const { getAccessToken } = useUser()
  const [tenant, setTenant] = useState<TenantWithUsage | null>(null)
  const [users, setUsers] = useState<TenantUserRow[]>([])
  const [loading, setLoading] = useState(false)
  const [usersLoading, setUsersLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const authHeaders = useCallback(async () => {
    const token = await getAccessToken()
    return token ? { Authorization: `Bearer ${token}` } : {}
  }, [getAccessToken])

  const fetchTenant = useCallback(async () => {
    if (!tenantId) return
    setLoading(true)
    setError(null)
    try {
      const headers = await authHeaders()
      const res = await fetch(`/api/super-admin/tenants/${tenantId}`, { headers, cache: "no-store" })
      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to load tenant")
      }
      setTenant(json.data)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load tenant"
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }, [tenantId, authHeaders])

  const fetchUsers = useCallback(async () => {
    if (!tenantId) return
    setUsersLoading(true)
    try {
      const headers = await authHeaders()
      const res = await fetch(`/api/super-admin/tenants/${tenantId}/users`, {
        headers,
        cache: "no-store",
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to load users")
      }
      setUsers(json.data ?? [])
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load users"
      toast.error(message)
    } finally {
      setUsersLoading(false)
    }
  }, [tenantId, authHeaders])

  const updateTenant = useCallback(
    async (input: TenantUpdateInput) => {
      try {
        const headers = await authHeaders()
        const res = await fetch(`/api/super-admin/tenants/${tenantId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", ...headers },
          body: JSON.stringify(input),
        })
        const json = await res.json()
        if (!res.ok || !json.success) {
          throw new Error(json.message || "Failed to update tenant")
        }
        toast.success("Tenant updated")
        await fetchTenant()
        return json.data as TenantWithUsage
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to update tenant"
        toast.error(message)
        return null
      }
    },
    [tenantId, authHeaders, fetchTenant]
  )

  const assignUserByEmail = useCallback(
    async (email: string, role: "student" | "admin" = "student") => {
      try {
        const headers = await authHeaders()
        const res = await fetch(`/api/super-admin/tenants/${tenantId}/users`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...headers },
          body: JSON.stringify({ email, role }),
        })
        const json = await res.json()
        if (!res.ok || !json.success) {
          throw new Error(json.message || "Failed to assign user")
        }
        toast.success("User assigned")
        await fetchUsers()
        await fetchTenant()
        return json.data
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to assign user"
        toast.error(message)
        return null
      }
    },
    [tenantId, authHeaders, fetchUsers, fetchTenant]
  )

  const updateUserRole = useCallback(
    async (userId: number, role: "student" | "admin") => {
      try {
        const headers = await authHeaders()
        const res = await fetch(`/api/super-admin/tenants/${tenantId}/users`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", ...headers },
          body: JSON.stringify({ user_id: userId, role }),
        })
        const json = await res.json()
        if (!res.ok || !json.success) {
          throw new Error(json.message || "Failed to update user")
        }
        toast.success("User role updated")
        await fetchUsers()
        return json.data
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to update user"
        toast.error(message)
        return null
      }
    },
    [tenantId, authHeaders, fetchUsers]
  )

  useEffect(() => {
    void fetchTenant()
    void fetchUsers()
  }, [fetchTenant, fetchUsers])

  return {
    tenant,
    users,
    loading,
    usersLoading,
    error,
    fetchTenant,
    fetchUsers,
    updateTenant,
    assignUserByEmail,
    updateUserRole,
  }
}
