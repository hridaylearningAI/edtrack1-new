import { useState, useCallback, useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'
import { apiClient } from '@/lib/api'
import { toast } from 'sonner'

export interface Certificate {
  id: string
  studentId: number
  studentName: string
  studentEmail: string
  course: string
  completionDate: string
  issueDate: string | null
  certificateNumber: string
  grade: string
  status: 'Issued' | 'Pending'
  downloadCount: number
  avatar?: string
}

interface UseCertificatesReturn {
  certificates: Certificate[]
  loading: boolean
  error: string | null
  totalCertificates: number
  issuedCertificates: number
  pendingCertificates: number
  totalDownloads: number
  fetchCertificates: () => Promise<void>
  issueCertificate: (enrollmentId: number) => Promise<void>
  refreshData: () => Promise<void>
}

export function useCertificates(): UseCertificatesReturn {
  const { getToken } = useAuth()
  const [certificates, setCertificates] = useState<Certificate[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Set token getter for API client
  useEffect(() => {
    apiClient.setTokenGetter(async () => {
      try {
        if (getToken) {
          const token = await getToken()
          if (token) return token
        }
        const stored = sessionStorage.getItem('clerk_auth_token')
        return stored
      } catch (error) {
        console.warn('Error getting token:', error)
        return sessionStorage.getItem('clerk_auth_token')
      }
    })
  }, [getToken])

  // Transform completed enrollment to certificate format
  const transformEnrollmentToCertificate = useCallback((enrollment: any): Certificate => {
    const certificateNumber = `CERT-${enrollment.course_id}-${enrollment.student_id}-${new Date(enrollment.completion_date).getFullYear()}`
    const isIssued = enrollment.status === 'completed' && enrollment.completion_date
    
    return {
      id: `cert-${enrollment.id}`,
      studentId: enrollment.student_id,
      studentName: enrollment.student_name || `Student ${enrollment.student_id}`,
      studentEmail: enrollment.student_email || '',
      course: enrollment.course_name || `Course ${enrollment.course_id}`,
      completionDate: enrollment.completion_date || enrollment.enrollment_date,
      issueDate: isIssued ? enrollment.completion_date : null,
      certificateNumber,
      grade: enrollment.grade || 'N/A',
      status: isIssued ? 'Issued' : 'Pending',
      downloadCount: 0, // This would need to be tracked separately
      avatar: '/placeholder.svg?height=40&width=40'
    }
  }, [])

  const fetchCertificates = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Fetch completed enrollments
      const enrollmentsResponse = await apiClient.getEnrollments({
        status: 'completed',
        limit: 1000
      })
      
      // Fetch all enrollments to get pending ones too
      const allEnrollmentsResponse = await apiClient.getEnrollments({
        limit: 1000
      })
      
      // Combine completed and pending enrollments
      const allEnrollments = [
        ...enrollmentsResponse.data,
        ...allEnrollmentsResponse.data.filter((e: any) => e.status !== 'completed' && e.progress >= 80)
      ]
      
      // Remove duplicates based on enrollment ID
      const uniqueEnrollments = allEnrollments.filter((enrollment, index, self) => 
        index === self.findIndex(e => e.id === enrollment.id)
      )
      
      // Transform to certificates
      const transformedCertificates = uniqueEnrollments.map(transformEnrollmentToCertificate)
      
      setCertificates(transformedCertificates)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch certificates'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [transformEnrollmentToCertificate])

  const issueCertificate = useCallback(async (enrollmentId: number) => {
    try {
      setLoading(true)
      setError(null)
      
      // Update enrollment status to completed and set completion date
      await apiClient.updateEnrollment(enrollmentId, {
        status: 'completed',
        completion_date: new Date().toISOString().split('T')[0]
      })
      
      toast.success('Certificate issued successfully')
      await fetchCertificates() // Refresh the list
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to issue certificate'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [fetchCertificates])

  const refreshData = useCallback(async () => {
    await fetchCertificates()
  }, [fetchCertificates])

  // Calculate statistics
  const totalCertificates = certificates.length
  const issuedCertificates = certificates.filter(c => c.status === 'Issued').length
  const pendingCertificates = certificates.filter(c => c.status === 'Pending').length
  const totalDownloads = certificates.reduce((acc, cert) => acc + cert.downloadCount, 0)

  // Load certificates on mount
  useEffect(() => {
    fetchCertificates()
  }, [fetchCertificates])

  return {
    certificates,
    loading,
    error,
    totalCertificates,
    issuedCertificates,
    pendingCertificates,
    totalDownloads,
    fetchCertificates,
    issueCertificate,
    refreshData
  }
}
