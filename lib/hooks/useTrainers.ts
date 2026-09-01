import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { apiClient, Trainer, TrainerCreate, TrainerUpdate } from '../api';
import { toast } from 'sonner';

interface UseTrainersReturn {
  trainers: Trainer[];
  loading: boolean;
  error: string | null;
  fetchTrainers: (params?: {
    status?: string;
    specialization?: string;
    name?: string;
    email?: string;
    limit?: number;
    page?: number;
  }) => Promise<void>;
  createTrainer: (trainer: TrainerCreate) => Promise<Trainer | null>;
  updateTrainer: (id: number, updates: TrainerUpdate) => Promise<void>;
  deleteTrainer: (id: number) => Promise<void>;
  refreshData: () => Promise<void>;
}

export function useTrainers(): UseTrainersReturn {
  const { getToken } = useAuth();
  const [trainers, setTrainers] = useState<Trainer[]>([]);
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

  const fetchTrainers = useCallback(async (params?: {
    status?: string;
    specialization?: string;
    name?: string;
    email?: string;
    limit?: number;
    page?: number;
  }) => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.getTrainers(params);
      setTrainers(response.data || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch trainers';
      setError(errorMessage);
      console.error('Error fetching trainers:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const createTrainer = useCallback(async (trainer: TrainerCreate): Promise<Trainer | null> => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.createTrainer(trainer);
      toast.success('Trainer created successfully');
      await fetchTrainers(); // Refresh list
      return response.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create trainer';
      setError(errorMessage);
      toast.error(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchTrainers]);

  const updateTrainer = useCallback(async (id: number, updates: TrainerUpdate) => {
    try {
      setLoading(true);
      setError(null);
      await apiClient.updateTrainer(id, updates);
      toast.success('Trainer updated successfully');
      await fetchTrainers(); // Refresh list
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update trainer';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [fetchTrainers]);

  const deleteTrainer = useCallback(async (id: number) => {
    try {
      setLoading(true);
      setError(null);
      await apiClient.deleteTrainer(id);
      toast.success('Trainer deleted successfully');
      await fetchTrainers(); // Refresh list
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete trainer';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [fetchTrainers]);

  const refreshData = useCallback(async () => {
    await fetchTrainers();
  }, [fetchTrainers]);

  // Load data on mount
  useEffect(() => {
    fetchTrainers({ limit: 1000 });
  }, [fetchTrainers]);

  return {
    trainers,
    loading,
    error,
    fetchTrainers,
    createTrainer,
    updateTrainer,
    deleteTrainer,
    refreshData,
  };
}

