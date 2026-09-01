import { useState, useCallback, useEffect } from 'react'
import { apiClient } from '@/lib/api'
import { Document, DocumentCreate, DocumentUpdate } from '@/lib/api'
import { toast } from 'sonner'

interface UseDocumentsReturn {
  documents: Document[]
  loading: boolean
  error: string | null
  total: number
  fetchDocuments: (params?: {
    student_id?: number
    document_type?: string
    status?: string
    limit?: number
    offset?: number
  }) => Promise<void>
  uploadDocument: (
    file: File,
    studentId: number,
    documentType: string,
    notes?: string
  ) => Promise<void>
  updateDocument: (id: number, data: DocumentUpdate) => Promise<void>
  verifyDocument: (id: number, status: string, comments?: string, rejectionReason?: string) => Promise<void>
  deleteDocument: (id: number) => Promise<void>
  downloadDocument: (id: number) => Promise<void>
}

export function useDocuments(): UseDocumentsReturn {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)

  const fetchDocuments = useCallback(async (params?: {
    student_id?: number
    document_type?: string
    status?: string
    limit?: number
    offset?: number
  }) => {
    try {
      setLoading(true)
      setError(null)
      const response = await apiClient.getDocuments(params)
      
      // Fetch student names and avatars for all unique student IDs
      const studentIds = [...new Set(response.documents.map(doc => doc.student_id))]
      const studentsResponse = await apiClient.getStudents({ limit: 1000 })
      const studentsMap = new Map(studentsResponse.data.map(student => [student.id, { name: student.name, avatar: student.avatar }]))
      
      // Map student names and avatars to documents
      const documentsWithNames = response.documents.map(doc => {
        const student = studentsMap.get(doc.student_id)
        return {
          ...doc,
          student_name: student?.name || undefined,
          student_avatar: student?.avatar || undefined
        }
      })
      
      setDocuments(documentsWithNames)
      setTotal(response.total)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch documents'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [])

  const uploadDocument = useCallback(async (
    file: File,
    studentId: number,
    documentType: string,
    notes?: string,
    isAdminUpload: boolean = false
  ) => {
    try {
      setLoading(true)
      setError(null)
      await apiClient.uploadDocument(file, studentId, documentType, notes, isAdminUpload)
      toast.success('Document uploaded successfully' + (isAdminUpload ? ' and automatically verified' : ''))
      // Refresh the documents list
      await fetchDocuments()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload document'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [fetchDocuments])

  const updateDocument = useCallback(async (id: number, data: DocumentUpdate) => {
    try {
      setLoading(true)
      setError(null)
      await apiClient.updateDocument(id, data)
      toast.success('Document updated successfully')
      // Refresh the documents list
      await fetchDocuments()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update document'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [fetchDocuments])

  const verifyDocument = useCallback(async (id: number, status: string, comments?: string, rejectionReason?: string) => {
    try {
      setLoading(true)
      setError(null)
      await apiClient.verifyDocument(id, status, comments, rejectionReason)
      const action = status === 'verified' ? 'verified' : 'rejected'
      toast.success(`Document ${action} successfully`)
      // Refresh the documents list
      await fetchDocuments()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to verify document'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [fetchDocuments])

  const deleteDocument = useCallback(async (id: number) => {
    try {
      setLoading(true)
      setError(null)
      await apiClient.deleteDocument(id)
      toast.success('Document deleted successfully')
      // Refresh the documents list
      await fetchDocuments()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete document'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [fetchDocuments])

  const downloadDocument = useCallback(async (id: number) => {
    try {
      setError(null)
      const response = await apiClient.downloadDocument(id)
      // Open download URL in new tab
      window.open(response.download_url, '_blank')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to download document'
      setError(errorMessage)
      toast.error(errorMessage)
    }
  }, [])

  // Load documents on mount
  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])

  return {
    documents,
    loading,
    error,
    total,
    fetchDocuments,
    uploadDocument,
    updateDocument,
    verifyDocument,
    deleteDocument,
    downloadDocument,
  }
}
