'use client'

import { useState, useEffect, useCallback, useRef } from 'react';
import { useUser } from '@/lib/hooks/useUser';

const MIN_FETCH_INTERVAL_MS = 3000; // Skip fetch if we fetched in the last 3 seconds

export interface Enrollment {
  id: number;
  student_id: number;
  course_id: number;
  enrollment_date: string;
  status: 'active' | 'completed' | 'cancelled' | 'suspended';
  progress: number;
  completion_date?: string;
  grade?: string;
  notes?: string;
  course_name?: string;
  course_description?: string;
  course_price?: number;
  instructor_name?: string;
  with_certificate?: boolean; // Whether this enrollment includes a certificate
  plan_id?: number | null;
  /** Set by GET /api/enrollments when embed omits course_plans (flattened for NCLEX gating). */
  plan_key?: string | null;
  partial_payment?: {
    max_stage_paid?: number;
    is_fully_paid?: boolean;
    max_topic_idx_unlocked?: number | null;
    latest_stage_plan_key?: string | null;
  } | null;
  course_plans?: { id?: number; name?: string; plan_key?: string } | null;
  courses?: {
    id: number;
    name: string;
    course_code?: string;
    description: string;
    image_url: string;
  };
}

export interface EnrollmentResponse {
  success: boolean;
  data: Enrollment[];
  message?: string;
  error?: string;
}

export interface EnrollmentCreate {
  student_id: number;
  course_id: number;
  enrollment_date: string;
  status: 'active' | 'completed' | 'cancelled' | 'suspended';
  progress: number;
  completion_date?: string;
  grade?: string;
  notes?: string;
  /** Admin-only: must match a row in `course_plans` for this course */
  plan_id?: number;
  with_certificate?: boolean;
}

interface UseEnrollmentsReturn {
  enrollments: Enrollment[];
  loading: boolean;
  error: string | null;
  fetchEnrollments: () => Promise<void>;
  refreshEnrollments: () => Promise<void>;
  createEnrollment: (enrollment: EnrollmentCreate) => Promise<Enrollment>;
}

export function useEnrollments(options?: { courseId?: number | null }): UseEnrollmentsReturn {
  const courseIdFilter =
    options?.courseId != null && Number.isFinite(options.courseId) && options.courseId > 0
      ? Math.floor(options.courseId)
      : null
  const { user, isAuthenticated, getAccessToken } = useUser();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastFetchTimeRef = useRef<number>(0);
  const lastFetchKeyRef = useRef<string>("");
  const getAccessTokenRef = useRef(getAccessToken);
  getAccessTokenRef.current = getAccessToken;

  const fetchEnrollments = useCallback(async () => {
    if (!user?.id || !isAuthenticated) return;

    const fetchKey = `${user.id}:${courseIdFilter ?? "all"}`
    const now = Date.now();
    if (
      fetchKey === lastFetchKeyRef.current &&
      now - lastFetchTimeRef.current < MIN_FETCH_INTERVAL_MS
    ) {
      return; // Skip - we fetched recently (prevents rapid successive refreshes)
    }
    lastFetchTimeRef.current = now;
    lastFetchKeyRef.current = fetchKey;

    const accessToken = await getAccessTokenRef.current();
    if (!accessToken) return;

    setLoading(true);
    setError(null);

    try {
      // Use Next.js API route - it will automatically use the authenticated user's ID
      // No need to pass student_id since the API route uses the authenticated user from the token
      // Request all enrollments (no 10-item default) for Active Units etc.
      // When the authenticated user is not a `student` (e.g. trainer/admin viewing student pages),
      // we want to filter enrollments to the numeric Supabase user id (enrollments.student_id is bigint).
      // The client `user.id` can be a Clerk id like `user_...`, so we must derive the numeric id.
      let studentIdFilter = ""
      if (user?.role && user.role !== "student") {
        const direct = typeof user.id === "number" ? user.id : parseInt(String(user.id), 10)
        let numericStudentId: number | null = Number.isNaN(direct) ? null : direct

        if (numericStudentId == null) {
          // Ask server for the authenticated Supabase user id.
          const meRes = await fetch("/api/auth/me", {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
          })
          const meJson = await meRes.json().catch(() => null)
          const idFromMe =
            meJson?.data?.id != null
              ? parseInt(String(meJson.data.id), 10)
              : null
          numericStudentId = idFromMe != null && !Number.isNaN(idFromMe) ? idFromMe : null
        }

        if (numericStudentId != null) {
          studentIdFilter = `&student_id=${encodeURIComponent(String(numericStudentId))}`
        }
      }

      // Learn page only needs the current course — avoid pulling hundreds of enrollments.
      const courseFilter =
        courseIdFilter != null ? `&course_id=${encodeURIComponent(String(courseIdFilter))}` : ""

      const response = await fetch(`/api/enrollments?limit=500${studentIdFilter}${courseFilter}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch enrollments: ${response.statusText}`);
      }

      const data: EnrollmentResponse = await response.json();

      if (data.success && data.data) {
        // Ensure with_certificate is properly typed as boolean
        const processedEnrollments = data.data.map((enrollment: any) => {
          const withCert = enrollment.with_certificate === true || enrollment.with_certificate === 'true' || enrollment.with_certificate === 1;
          return {
            ...enrollment,
            with_certificate: withCert,
          };
        });
        setEnrollments(processedEnrollments);
      } else {
        setError(data.error || 'Failed to fetch enrollments');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch enrollments');
    } finally {
      setLoading(false);
    }
  }, [user?.id, user?.role, isAuthenticated, courseIdFilter]);

  const refreshEnrollments = useCallback(async () => {
    await fetchEnrollments();
  }, [fetchEnrollments]);

  const createEnrollment = useCallback(async (enrollment: EnrollmentCreate): Promise<Enrollment> => {
    setLoading(true);
    setError(null);

    try {
      // Use Next.js API route instead of external Lambda API
      const accessToken = await getAccessToken();
      if (!accessToken) {
        throw new Error('Not authenticated. Please log in again.');
      }

      const response = await fetch('/api/enrollments', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(enrollment),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create enrollment: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();

      if (data.success && data.data) {
        // Add the new enrollment to the list
        setEnrollments(prev => [data.data, ...prev]);
        return data.data;
      } else {
        throw new Error(data.error || 'Failed to create enrollment');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create enrollment';
      console.error('💥 Enrollment creation error:', err);
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-fetch enrollments only when user/id or auth state / course filter changes
  const fetchEnrollmentsRef = useRef(fetchEnrollments);
  fetchEnrollmentsRef.current = fetchEnrollments;
  useEffect(() => {
    if (user?.id && isAuthenticated) {
      fetchEnrollmentsRef.current();
    }
  }, [user?.id, isAuthenticated, courseIdFilter]);

  return {
    enrollments,
    loading,
    error,
    fetchEnrollments,
    refreshEnrollments,
    createEnrollment,
  };
}