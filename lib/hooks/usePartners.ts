import { useState, useCallback, useEffect } from "react"
import { useAuth } from "@clerk/nextjs"
import { apiClient, Partner, PartnerCreate, PartnerUpdate } from "@/lib/api"
import { toast } from "sonner"

interface UsePartnersReturn {
  partners: Partner[]
  loading: boolean
  error: string | null
  fetchPartners: (params?: { status?: string; name?: string; email?: string; limit?: number; page?: number }) => Promise<void>
  createPartner: (partner: PartnerCreate) => Promise<Partner | null>
  updatePartner: (id: number, updates: PartnerUpdate) => Promise<void>
  deletePartner: (id: number) => Promise<void>
}

export function usePartners(): UsePartnersReturn {
  const { getToken } = useAuth()
  const [partners, setPartners] = useState<Partner[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    apiClient.setTokenGetter(async () => {
      try {
        if (getToken) {
          const token = await getToken()
          if (token) return token
        }
        return sessionStorage.getItem("clerk_auth_token")
      } catch {
        return sessionStorage.getItem("clerk_auth_token")
      }
    })
  }, [getToken])

  const fetchPartners = useCallback(async (params?: { status?: string; name?: string; email?: string; limit?: number; page?: number }) => {
    try {
      setLoading(true)
      setError(null)
      const response = await apiClient.getPartners(params)
      setPartners(response.data || [])
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to fetch partners"
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }, [])

  const createPartner = useCallback(async (partner: PartnerCreate): Promise<Partner | null> => {
    try {
      setLoading(true)
      setError(null)
      const response = await apiClient.createPartner(partner)
      toast.success("Partner added successfully")
      await fetchPartners({ limit: 200 })
      return response.data || null
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to create partner"
      setError(msg)
      toast.error(msg)
      return null
    } finally {
      setLoading(false)
    }
  }, [fetchPartners])

  const updatePartner = useCallback(async (id: number, updates: PartnerUpdate) => {
    try {
      setLoading(true)
      setError(null)
      await apiClient.updatePartner(id, updates)
      toast.success("Partner updated successfully")
      await fetchPartners({ limit: 200 })
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to update partner"
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }, [fetchPartners])

  const deletePartner = useCallback(async (id: number) => {
    try {
      setLoading(true)
      setError(null)
      await apiClient.deletePartner(id)
      toast.success("Partner removed successfully")
      await fetchPartners({ limit: 200 })
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to delete partner"
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }, [fetchPartners])

  useEffect(() => {
    fetchPartners({ limit: 200 })
  }, [fetchPartners])

  return {
    partners,
    loading,
    error,
    fetchPartners,
    createPartner,
    updatePartner,
    deletePartner,
  }
}

