'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@clerk/nextjs';

interface StudentProgress {
  id: number;
  name: string;
  email: string;
  avatar: string | null;
  course: string;
  enrollmentDate: string;
  overallProgress: number;
  currentUnit: string;
  unitsCompleted: number;
  totalUnits: number;
  lastActivity: string;
  timeSpent: number;
  status: string;
  unitProgress: Array<{
    name: string;
    progress: number;
    status: string;
    enrollmentId: number;
    courseId: number;
    trialSectionsCompleted?: number;
    trialSectionIds?: string[];
    quizAttempts?: Array<{
      quiz_identifier: string;
      score_percent: number;
      passed: boolean;
      attempted_at: string;
    }>;
  }>;
  enrollments: Array<{
    id: number;
    courseId: number;
    courseName: string;
    progress: number;
    status: string;
    enrollmentDate: string;
    completionDate: string | null;
    updatedAt: string;
    withCertificate?: boolean;
    planId?: number | null;
    planName?: string | null;
    planKey?: string | null;
    trialSectionsCompleted?: number;
    trialSectionIds?: string[];
    quizAttempts?: Array<{
      quiz_identifier: string;
      score_percent: number;
      passed: boolean;
      attempted_at: string;
    }>;
  }>;
}

interface UseAdminProgressReturn {
  students: StudentProgress[];
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refresh: () => Promise<void>;
  autoRefresh: boolean;
  setAutoRefresh: (enabled: boolean) => void;
}

/**
 * Hook to fetch and manage real-time student progress data for admin
 * Supports auto-refresh for live updates
 */
export function useAdminProgress(refreshInterval: number = 30000): UseAdminProgressReturn {
  const { getToken } = useAuth();
  const [students, setStudents] = useState<StudentProgress[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchProgress = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get token from Clerk, with fallback to sessionStorage
      let token: string | null = null;
      try {
        if (getToken) {
          token = await getToken();
        }
        if (!token) {
          // Fallback to sessionStorage (for token-based auth)
          token = sessionStorage.getItem('clerk_auth_token');
        }
      } catch (error) {
        console.warn('Error getting token:', error);
        // Fallback to sessionStorage
        token = sessionStorage.getItem('clerk_auth_token');
      }

      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch('/api/progress/admin/all', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to fetch progress data');
      }

      setStudents(data.data || []);
      setLastUpdated(new Date());
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      console.error('Error fetching admin progress:', err);
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  // Set up auto-refresh
  useEffect(() => {
    // Initial fetch
    fetchProgress();

    // Set up interval if auto-refresh is enabled
    if (autoRefresh) {
      intervalRef.current = setInterval(() => {
        fetchProgress();
      }, refreshInterval);
    }

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchProgress, autoRefresh, refreshInterval]);

  const refresh = useCallback(async () => {
    await fetchProgress();
  }, [fetchProgress]);

  return {
    students,
    loading,
    error,
    lastUpdated,
    refresh,
    autoRefresh,
    setAutoRefresh,
  };
}

