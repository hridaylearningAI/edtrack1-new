import { useState, useCallback, useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'
import { apiClient } from '@/lib/api'
import { toast } from 'sonner'

// Purchase interface (matching the purchase_summary view)
interface Purchase {
  id?: string
  purchase_id?: number
  purchase_number?: string
  user_id: number
  user_name?: string
  user_email?: string
  student_name?: string // Alias for user_name for backward compatibility
  course_id?: number
  course_name?: string
  cart_id?: number
  total_amount: number | string
  subtotal: number | string
  discount_amount: number | string
  tax_amount: number | string
  status: 'pending' | 'completed' | 'cancelled' | 'refunded'
  payment_method?: string
  payment_status?: string
  purchase_date?: string
  created_at: string
  updated_at: string
  completed_at?: string
  description?: string
  currency?: string
  notes?: string
  refund_amount?: number | string
  refund_reason?: string
  refunded_at?: string
  item_count?: number
  items?: Array<{
    course_id: number
    course_name: string
    quantity: number
    unit_price: number
    discount_amount: number
    total_price: number
  }>
}

// Invoice interface (for display purposes)
interface Invoice {
  id: string
  student_id: number
  student_name?: string
  course_id?: number
  course_name?: string
  amount: number
  due_date: string
  issue_date: string
  status: 'Paid' | 'Pending' | 'Overdue' | 'Partial' | 'Cancelled'
  payment_method?: string
  payment_date?: string
  paid_amount?: number
  created_at?: string
  updated_at?: string
}

// Payment interface (derived from purchases)
interface Payment {
  id: string
  invoice_id: string
  student_id: number
  student_name?: string
  amount: number
  method: string
  transaction_id: string
  date: string
  status: 'Completed' | 'Pending' | 'Failed' | 'Refunded'
  created_at?: string
  updated_at?: string
}

interface UseAdminPurchasesReturn {
  purchases: Purchase[]
  invoices: Invoice[]
  payments: Payment[]
  loading: boolean
  error: string | null
  totalPurchases: number
  totalInvoices: number
  totalPayments: number
  fetchPurchases: (params?: {
    user_id?: number
    status?: string
    limit?: number
    offset?: number
  }) => Promise<void>
  refreshData: () => Promise<void>
}

export function useAdminPurchases(): UseAdminPurchasesReturn {
  const { getToken } = useAuth()
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [totalPurchases, setTotalPurchases] = useState(0)
  const [totalInvoices, setTotalInvoices] = useState(0)
  const [totalPayments, setTotalPayments] = useState(0)

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

  // Transform purchase to invoice format
  const transformPurchaseToInvoice = useCallback((purchase: Purchase): Invoice => {
    const isPaid = purchase.status === 'completed'
    const purchaseDate = purchase.purchase_date || purchase.created_at
    const isOverdue = !isPaid && new Date(purchaseDate) < new Date()
    
    // Use user_name from purchase_summary view, fallback to student_name
    const studentName = purchase.user_name || purchase.student_name
    
    // Get course name from items if not directly available
    const courseName = purchase.course_name || purchase.items?.[0]?.course_name
    
    return {
      id: purchase.purchase_number || purchase.id || purchase.purchase_id?.toString() || '',
      student_id: purchase.user_id,
      student_name: studentName,
      course_id: purchase.course_id || purchase.items?.[0]?.course_id,
      course_name: courseName,
      amount: typeof purchase.total_amount === 'string' ? parseFloat(purchase.total_amount) : (purchase.total_amount || 0),
      due_date: purchaseDate,
      issue_date: purchase.created_at,
      status: isPaid ? 'Paid' : (isOverdue ? 'Overdue' : 'Pending'),
      payment_method: purchase.payment_method,
      payment_date: isPaid ? purchaseDate : undefined,
      paid_amount: isPaid ? (typeof purchase.total_amount === 'string' ? parseFloat(purchase.total_amount) : (purchase.total_amount || 0)) : 0,
      created_at: purchase.created_at,
      updated_at: purchase.updated_at
    }
  }, [])

  // Transform purchase to payment format
  const transformPurchaseToPayment = useCallback((purchase: Purchase): Payment => {
    // Use user_name from purchase_summary view, fallback to student_name
    const studentName = purchase.user_name || purchase.student_name
    
    const purchaseId = purchase.purchase_number || purchase.id || purchase.purchase_id?.toString() || ''
    const purchaseDate = purchase.purchase_date || purchase.created_at
    
    return {
      id: `payment-${purchaseId}`, // Unique ID for payments
      invoice_id: purchase.purchase_number || purchase.id || purchase.purchase_id?.toString() || '',
      student_id: purchase.user_id,
      student_name: studentName,
      amount: typeof purchase.total_amount === 'string' ? parseFloat(purchase.total_amount) : (purchase.total_amount || 0),
      method: purchase.payment_method || 'Unknown',
      transaction_id: purchase.purchase_number || `TXN-${purchaseId}`,
      date: purchaseDate,
      status: purchase.status === 'completed' ? 'Completed' : 
              purchase.status === 'cancelled' ? 'Failed' :
              purchase.status === 'refunded' ? 'Refunded' : 'Pending',
      created_at: purchase.created_at,
      updated_at: purchase.updated_at
    }
  }, [])

  const fetchPurchases = useCallback(async (params?: {
    user_id?: number
    status?: string
    limit?: number
    offset?: number
  }) => {
    try {
      setLoading(true)
      setError(null)
      
      // Call the existing purchases endpoint
      const response = await apiClient.getPurchases(params)
      
      if (response.success && response.data) {
        const purchasesData = response.data
        
        // Purchase data from purchase_summary view already includes user_name and user_email
        // No need to fetch students separately - use user_name directly
        const purchasesWithNames = purchasesData.map(purchase => ({
          ...purchase,
          // Use user_name from purchase_summary view as student_name for backward compatibility
          student_name: purchase.user_name || purchase.student_name || undefined
        }))
        
        setPurchases(purchasesWithNames)
        setTotalPurchases(response.count || purchasesWithNames.length)
        
        // Transform purchases to invoices
        const transformedInvoices = purchasesWithNames.map(transformPurchaseToInvoice)
        setInvoices(transformedInvoices)
        setTotalInvoices(transformedInvoices.length)
        
        // Transform purchases to payments
        const transformedPayments = purchasesWithNames.map(transformPurchaseToPayment)
        setPayments(transformedPayments)
        setTotalPayments(transformedPayments.length)
        
      } else {
        setError('Failed to fetch purchases')
        toast.error('Failed to fetch purchases')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch purchases'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [transformPurchaseToInvoice, transformPurchaseToPayment])

  const refreshData = useCallback(async () => {
    await fetchPurchases()
  }, [fetchPurchases])

  // Load data on mount
  useEffect(() => {
    fetchPurchases()
  }, [fetchPurchases])

  return {
    purchases,
    invoices,
    payments,
    loading,
    error,
    totalPurchases,
    totalInvoices,
    totalPayments,
    fetchPurchases,
    refreshData,
  }
}
