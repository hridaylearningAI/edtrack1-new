import { useState, useCallback, useEffect } from 'react'
import { apiClient } from '@/lib/api'
import { Invoice, Payment, InvoiceCreate, PaymentCreate } from '@/lib/api'
import { toast } from 'sonner'

interface UseInvoicesReturn {
  invoices: Invoice[]
  payments: Payment[]
  loading: boolean
  error: string | null
  totalInvoices: number
  totalPayments: number
  fetchInvoices: (params?: {
    student_id?: number
    status?: string
    course_id?: number
    limit?: number
    offset?: number
  }) => Promise<void>
  fetchPayments: (params?: {
    invoice_id?: string
    student_id?: number
    status?: string
    limit?: number
    offset?: number
  }) => Promise<void>
  createInvoice: (invoice: InvoiceCreate) => Promise<void>
  updateInvoice: (id: string, invoice: Partial<InvoiceCreate>) => Promise<void>
  deleteInvoice: (id: string) => Promise<void>
  createPayment: (payment: PaymentCreate) => Promise<void>
  updatePayment: (id: string, payment: Partial<PaymentCreate>) => Promise<void>
  deletePayment: (id: string) => Promise<void>
}

export function useInvoices(): UseInvoicesReturn {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [totalInvoices, setTotalInvoices] = useState(0)
  const [totalPayments, setTotalPayments] = useState(0)

  const fetchInvoices = useCallback(async (params?: {
    student_id?: number
    status?: string
    course_id?: number
    limit?: number
    offset?: number
  }) => {
    try {
      setLoading(true)
      setError(null)
      const response = await apiClient.getInvoices(params)
      
      // Fetch student names for all unique student IDs
      const studentIds = [...new Set(response.data.map(invoice => invoice.student_id))]
      const studentsResponse = await apiClient.getStudents({ limit: 1000 })
      const studentsMap = new Map(studentsResponse.data.map(student => [student.id, student.name]))
      
      // Map student names to invoices
      const invoicesWithNames = response.data.map(invoice => ({
        ...invoice,
        student_name: studentsMap.get(invoice.student_id) || undefined
      }))
      
      setInvoices(invoicesWithNames)
      setTotalInvoices(response.count || response.data.length)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch invoices'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchPayments = useCallback(async (params?: {
    invoice_id?: string
    student_id?: number
    status?: string
    limit?: number
    offset?: number
  }) => {
    try {
      setLoading(true)
      setError(null)
      const response = await apiClient.getPayments(params)
      
      // Fetch student names for all unique student IDs
      const studentIds = [...new Set(response.data.map(payment => payment.student_id))]
      const studentsResponse = await apiClient.getStudents({ limit: 1000 })
      const studentsMap = new Map(studentsResponse.data.map(student => [student.id, student.name]))
      
      // Map student names to payments
      const paymentsWithNames = response.data.map(payment => ({
        ...payment,
        student_name: studentsMap.get(payment.student_id) || undefined
      }))
      
      setPayments(paymentsWithNames)
      setTotalPayments(response.count || response.data.length)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch payments'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [])

  const createInvoice = useCallback(async (invoice: InvoiceCreate) => {
    try {
      setLoading(true)
      setError(null)
      await apiClient.createInvoice(invoice)
      toast.success('Invoice created successfully')
      await fetchInvoices()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create invoice'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [fetchInvoices])

  const updateInvoice = useCallback(async (id: string, invoice: Partial<InvoiceCreate>) => {
    try {
      setLoading(true)
      setError(null)
      await apiClient.updateInvoice(id, invoice)
      toast.success('Invoice updated successfully')
      await fetchInvoices()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update invoice'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [fetchInvoices])

  const deleteInvoice = useCallback(async (id: string) => {
    try {
      setLoading(true)
      setError(null)
      await apiClient.deleteInvoice(id)
      toast.success('Invoice deleted successfully')
      await fetchInvoices()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete invoice'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [fetchInvoices])

  const createPayment = useCallback(async (payment: PaymentCreate) => {
    try {
      setLoading(true)
      setError(null)
      await apiClient.createPayment(payment)
      toast.success('Payment created successfully')
      await fetchPayments()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create payment'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [fetchPayments])

  const updatePayment = useCallback(async (id: string, payment: Partial<PaymentCreate>) => {
    try {
      setLoading(true)
      setError(null)
      await apiClient.updatePayment(id, payment)
      toast.success('Payment updated successfully')
      await fetchPayments()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update payment'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [fetchPayments])

  const deletePayment = useCallback(async (id: string) => {
    try {
      setLoading(true)
      setError(null)
      await apiClient.deletePayment(id)
      toast.success('Payment deleted successfully')
      await fetchPayments()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete payment'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [fetchPayments])

  // Load data on mount
  useEffect(() => {
    fetchInvoices()
    fetchPayments()
  }, [fetchInvoices, fetchPayments])

  return {
    invoices,
    payments,
    loading,
    error,
    totalInvoices,
    totalPayments,
    fetchInvoices,
    fetchPayments,
    createInvoice,
    updateInvoice,
    deleteInvoice,
    createPayment,
    updatePayment,
    deletePayment,
  }
}
