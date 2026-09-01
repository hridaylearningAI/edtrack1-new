import { useState, useCallback } from 'react';
import { useUser } from './useUser';

interface TrackResourceParams {
  enrollmentId: number;
  courseId: number;
  resourceId: number;
  resourceName: string;
  resourceType: string;
  resourceUrl?: string;
  timeSpentSeconds?: number;
  markCompleted?: boolean;
}

interface ProgressData {
  enrollment: {
    id: number;
    student_id: number;
    course_id: number;
    progress: number;
    status: string;
  };
  statistics: {
    totalResources: number;
    completedResources: number;
    totalTimeSpentSeconds: number;
    totalTimeSpentFormatted: string;
    uniqueResourcesAccessed: number;
    completionRate: number;
  };
  resourceAccess: Array<{
    id: number;
    resource_id: number;
    resource_name: string;
    resource_type: string;
    access_count: number;
    time_spent_seconds: number;
    completed: boolean;
    last_accessed_at: string;
  }>;
  sectionProgress: Array<{
    id: number;
    section_id: number;
    section_name: string;
    section_number: number;
    progress_percentage: number;
    resources_total: number;
    resources_accessed: number;
    resources_completed: number;
  }>;
  recentActivity: Array<{
    id: number;
    activity_type: string;
    activity_details: any;
    created_at: string;
  }>;
}

export function useProgressTracking() {
  const { getAccessToken } = useUser();
  const [tracking, setTracking] = useState(false);

  /**
   * Track when a student accesses a resource
   */
  const trackResourceAccess = useCallback(async (params: TrackResourceParams) => {
    try {
      setTracking(true);
      const token = await getAccessToken();
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch('/api/progress/track-resource', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to track resource access');
      }

      return data.data;
    } catch (error) {
      console.error('Error tracking resource access:', error);
      throw error;
    } finally {
      setTracking(false);
    }
  }, [getAccessToken]);

  /**
   * Get detailed progress for an enrollment
   */
  const getDetailedProgress = useCallback(async (
    enrollmentId?: number,
    courseId?: number,
    studentId?: number
  ): Promise<ProgressData> => {
    try {
      const token = await getAccessToken();
      if (!token) {
        throw new Error('Not authenticated');
      }

      const params = new URLSearchParams();
      if (enrollmentId) params.append('enrollmentId', enrollmentId.toString());
      if (courseId) params.append('courseId', courseId.toString());
      if (studentId) params.append('studentId', studentId.toString());

      const response = await fetch(`/api/progress/get-detailed?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to get progress data');
      }

      return data.data;
    } catch (error) {
      console.error('Error getting detailed progress:', error);
      throw error;
    }
  }, [getAccessToken]);

  /**
   * Track time spent on a resource (call this periodically while resource is open)
   */
  const trackTimeSpent = useCallback(async (
    params: TrackResourceParams,
    intervalSeconds: number = 30
  ) => {
    // Track initial access
    await trackResourceAccess(params);

    // Set up interval to track time spent
    const interval = setInterval(async () => {
      try {
        await trackResourceAccess({
          ...params,
          timeSpentSeconds: intervalSeconds,
        });
      } catch (error) {
        console.error('Error tracking time spent:', error);
      }
    }, intervalSeconds * 1000);

    // Return cleanup function
    return () => clearInterval(interval);
  }, [trackResourceAccess]);

  return {
    trackResourceAccess,
    getDetailedProgress,
    trackTimeSpent,
    tracking,
  };
}

