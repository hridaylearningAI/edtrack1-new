import { useState, useCallback, useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'
import { apiClient } from '@/lib/api'
import { Course, CourseCreate, CourseUpdate } from '@/lib/api'
import { toast } from 'sonner'

interface UseCoursesReturn {
  courses: Course[]
  loading: boolean
  error: string | null
  fetchCourses: (params?: {
    name?: string
    status?: string
    course_status?: 'live' | 'coming_soon' | 'archived' | 'draft'
    page?: number
    limit?: number
  }) => Promise<void>
  createCourse: (data: CourseCreate) => Promise<void>
  updateCourse: (id: number, data: CourseUpdate) => Promise<void>
  deleteCourse: (id: number) => Promise<void>
  searchCourses: (params: {
    name?: string
    status?: string
    course_status?: 'live' | 'coming_soon' | 'archived' | 'draft'
    page?: number
    limit?: number
  }) => Promise<void>
  clearError: () => void
}

export function useCourses(): UseCoursesReturn {
  const { getToken } = useAuth()
  const [courses, setCourses] = useState<Course[]>([])
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

  const fetchCourses = useCallback(async (params?: {
    name?: string
    status?: string
    course_status?: 'live' | 'coming_soon' | 'archived' | 'draft'
    page?: number
    limit?: number
  }) => {
    try {
      setLoading(true)
      setError(null)
      // Always request a high limit to get all courses
      const response = await apiClient.getCourses({ ...params, limit: params?.limit || 100 })
      setCourses(response.data || [])
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch courses'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [])

  const createCourse = useCallback(async (data: CourseCreate) => {
    try {
      setLoading(true)
      setError(null)
      await apiClient.createCourse(data)
      toast.success('Course created successfully')
      // Refresh the courses list without any filters to show the new course
      const response = await apiClient.getCourses({ limit: 100 })
      setCourses(response.data || [])
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create course'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [])

  const updateCourse = useCallback(async (id: number, data: CourseUpdate) => {
    try {
      setLoading(true)
      setError(null)
      await apiClient.updateCourse(id, data)
      toast.success('Course updated successfully')
      // Refresh the courses list without any filters
      const response = await apiClient.getCourses({ limit: 100 })
      setCourses(response.data || [])
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update course'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [])

  const deleteCourse = useCallback(async (id: number) => {
    try {
      setLoading(true)
      setError(null)
      await apiClient.deleteCourse(id)
      toast.success('Course deleted successfully')
      // Refresh the courses list without any filters
      const response = await apiClient.getCourses({ limit: 100 })
      setCourses(response.data || [])
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete course'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [])

  const searchCourses = useCallback(async (params: {
    name?: string
    status?: string
    course_status?: 'live' | 'coming_soon' | 'archived' | 'draft'
    page?: number
    limit?: number
  }) => {
    try {
      setLoading(true)
      setError(null)
      // Use high limit for search results as well
      const response = await apiClient.getCourses({ ...params, limit: params?.limit || 100 })
      setCourses(response.data || [])
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to search courses'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  // Load courses on mount
  useEffect(() => {
    fetchCourses()
  }, [fetchCourses])

  return {
    courses,
    loading,
    error,
    fetchCourses,
    createCourse,
    updateCourse,
    deleteCourse,
    searchCourses,
    clearError,
  }
}
