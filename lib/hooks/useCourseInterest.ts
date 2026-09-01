'use client'

import { useState, useCallback, useEffect } from 'react'
import { useUser } from '@/lib/hooks/useUser'

interface UseCourseInterestReturn {
  hasShownInterest: (courseId: number, email?: string) => boolean
  checkInterest: (courseId: number, email?: string) => Promise<boolean>
  interestStatus: Map<number, boolean>
}

/**
 * Hook to check if a user has shown interest in courses (category 5 - Competitive Test Prep)
 */
export function useCourseInterest(): UseCourseInterestReturn {
  const { user } = useUser()
  const [interestStatus, setInterestStatus] = useState<Map<number, boolean>>(new Map())

  const checkInterest = useCallback(async (courseId: number, email?: string): Promise<boolean> => {
    const emailToCheck = email || user?.email
    if (!emailToCheck || !courseId) {
      return false
    }

    try {
      const res = await fetch(
        `/api/course-interest?courseId=${courseId}&email=${encodeURIComponent(emailToCheck)}`,
        { headers: { 'Content-Type': 'application/json' } }
      )
      if (res.ok) {
        const data = await res.json()
        const hasInterest = data.hasShownInterest || false
        setInterestStatus((prev) => {
          const next = new Map(prev)
          next.set(courseId, hasInterest)
          return next
        })
        return hasInterest
      }
    } catch (err) {
      console.error('Error checking interest status:', err)
    }
    return false
  }, [user?.email])

  const hasShownInterest = useCallback((courseId: number): boolean => {
    return interestStatus.get(courseId) ?? false
  }, [interestStatus])

  return {
    hasShownInterest,
    checkInterest,
    interestStatus,
  }
}
