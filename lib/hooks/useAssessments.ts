import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { apiClient, Assessment, AssessmentCreate, AssessmentUpdate } from '../api';
import { toast } from 'sonner';

interface UseAssessmentsReturn {
  assessments: Assessment[];
  loading: boolean;
  error: string | null;
  fetchAssessments: (params?: {
    status?: string;
    type?: string;
    trainer_id?: number;
    course_id?: number;
    title?: string;
    limit?: number;
    page?: number;
  }) => Promise<void>;
  createAssessment: (assessment: AssessmentCreate) => Promise<Assessment | null>;
  updateAssessment: (id: number, updates: AssessmentUpdate) => Promise<void>;
  deleteAssessment: (id: number) => Promise<void>;
  refreshData: () => Promise<void>;
}

export function useAssessments(): UseAssessmentsReturn {
  const { getToken } = useAuth();
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Set token getter for API client
  useEffect(() => {
    apiClient.setTokenGetter(async () => {
      try {
        if (getToken) {
          const token = await getToken();
          if (token) return token;
        }
        const stored = sessionStorage.getItem('clerk_auth_token');
        return stored;
      } catch (error) {
        console.warn('Error getting token:', error);
        return sessionStorage.getItem('clerk_auth_token');
      }
    });
  }, [getToken]);

  const fetchAssessments = useCallback(async (params?: {
    status?: string;
    type?: string;
    trainer_id?: number;
    course_id?: number;
    title?: string;
    limit?: number;
    page?: number;
  }) => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.getAssessments(params);
      setAssessments(response.data || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch assessments';
      setError(errorMessage);
      console.error('Error fetching assessments:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const createAssessment = useCallback(async (assessment: AssessmentCreate): Promise<Assessment | null> => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.createAssessment(assessment);
      toast.success('Assessment created successfully');
      await fetchAssessments(); // Refresh list
      return response.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create assessment';
      setError(errorMessage);
      toast.error(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchAssessments]);

  const updateAssessment = useCallback(async (id: number, updates: AssessmentUpdate) => {
    try {
      setLoading(true);
      setError(null);
      await apiClient.updateAssessment(id, updates);
      toast.success('Assessment updated successfully');
      await fetchAssessments(); // Refresh list
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update assessment';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [fetchAssessments]);

  const deleteAssessment = useCallback(async (id: number) => {
    try {
      setLoading(true);
      setError(null);
      await apiClient.deleteAssessment(id);
      toast.success('Assessment deleted successfully');
      await fetchAssessments(); // Refresh list
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete assessment';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [fetchAssessments]);

  const refreshData = useCallback(async () => {
    await fetchAssessments();
  }, [fetchAssessments]);

  // Load data on mount
  useEffect(() => {
    fetchAssessments({ limit: 1000 });
  }, [fetchAssessments]);

  return {
    assessments,
    loading,
    error,
    fetchAssessments,
    createAssessment,
    updateAssessment,
    deleteAssessment,
    refreshData,
  };
}

