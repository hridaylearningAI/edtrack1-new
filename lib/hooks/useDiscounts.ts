import { useState, useCallback, useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'
import { apiClient } from '@/lib/api'
import { Discount, DiscountCreate, DiscountUpdate, DiscountSearchParams } from '@/lib/api'
import { toast } from 'sonner'

interface UseDiscountsReturn {
  discounts: Discount[]
  loading: boolean
  error: string | null
  fetchDiscounts: (params?: DiscountSearchParams) => Promise<void>
  createDiscount: (data: DiscountCreate) => Promise<void>
  updateDiscount: (id: number, data: DiscountUpdate) => Promise<void>
  deleteDiscount: (id: number) => Promise<void>
  searchDiscounts: (params: DiscountSearchParams) => Promise<void>
  clearError: () => void
}

export function useDiscounts(): UseDiscountsReturn {
  const { getToken } = useAuth()
  const [discounts, setDiscounts] = useState<Discount[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Set token getter for API client
  useEffect(() => {
    // Always set token getter, even if getToken is null (will fallback to sessionStorage)
    apiClient.setTokenGetter(async () => {
      try {
        // First try to get from Clerk if available
        if (getToken) {
          const token = await getToken()
          if (token) return token
        }
        
        // Fallback to sessionStorage (for token-based auth)
        const stored = sessionStorage.getItem('clerk_auth_token')
        return stored
      } catch (error) {
        console.warn('Error getting token:', error)
        // Fallback to sessionStorage
        return sessionStorage.getItem('clerk_auth_token')
      }
    })
  }, [getToken])

  const fetchDiscounts = useCallback(async (params?: DiscountSearchParams) => {
    try {
      setLoading(true)
      setError(null)
      const response = await apiClient.getDiscounts({ ...params, limit: params?.limit || 100 })
      setDiscounts(response.data || [])
      
      // If response message indicates table doesn't exist, set a helpful error message
      if (response.message?.includes('does not exist')) {
        setError('Discounts table does not exist. Please create the table first.')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch discounts'
      setError(errorMessage)
      // Only show toast if it's not a table missing error (to avoid spam on page load)
      if (!errorMessage.includes('does not exist') && !errorMessage.includes('relation "discounts"')) {
        toast.error(errorMessage)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  const createDiscount = useCallback(async (data: DiscountCreate) => {
    try {
      setLoading(true)
      setError(null)
      await apiClient.createDiscount(data)
      toast.success('Discount created successfully')
      // Refresh the discounts list
      const response = await apiClient.getDiscounts({ limit: 100 })
      setDiscounts(response.data || [])
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create discount'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [])

  const updateDiscount = useCallback(async (id: number, data: DiscountUpdate) => {
    try {
      setLoading(true)
      setError(null)
      await apiClient.updateDiscount(id, data)
      toast.success('Discount updated successfully')
      // Refresh the discounts list
      const response = await apiClient.getDiscounts({ limit: 100 })
      setDiscounts(response.data || [])
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update discount'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [])

  const deleteDiscount = useCallback(async (id: number) => {
    try {
      setLoading(true)
      setError(null)
      await apiClient.deleteDiscount(id)
      toast.success('Discount deleted successfully')
      // Refresh the discounts list
      const response = await apiClient.getDiscounts({ limit: 100 })
      setDiscounts(response.data || [])
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete discount'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [])

  const searchDiscounts = useCallback(async (params: DiscountSearchParams) => {
    try {
      setLoading(true)
      setError(null)
      const response = await apiClient.getDiscounts({ ...params, limit: params.limit || 100 })
      setDiscounts(response.data || [])
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to search discounts'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  // Load discounts on mount
  useEffect(() => {
    fetchDiscounts()
  }, [fetchDiscounts])

  return {
    discounts,
    loading,
    error,
    fetchDiscounts,
    createDiscount,
    updateDiscount,
    deleteDiscount,
    searchDiscounts,
    clearError,
  }
}
