'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';
import { apiClient, Student, StudentCreate, StudentUpdate, StudentSearchParams } from '../api';

interface UseStudentsReturn {
  students: Student[];
  loading: boolean;
  error: string | null;
  totalCount: number;
  currentPage: number;
  totalPages: number;
  fetchStudents: (params?: StudentSearchParams) => Promise<void>;
  fetchStudent: (id: number) => Promise<Student | null>;
  createStudent: (student: StudentCreate) => Promise<Student | null>;
  updateStudent: (id: number, student: StudentUpdate) => Promise<Student | null>;
  deleteStudent: (id: number) => Promise<boolean>;
  searchStudents: (params: StudentSearchParams) => Promise<void>;
  clearError: () => void;
}

export function useStudents(): UseStudentsReturn {
  const { getToken } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  // Set token getter for API client
  useEffect(() => {
    // Always set token getter, even if getToken is null (will fallback to sessionStorage)
    apiClient.setTokenGetter(async () => {
      try {
        // First try to get from Clerk if available
        if (getToken) {
          const token = await getToken();
          if (token) return token;
        }
        
        // Fallback to sessionStorage (for token-based auth)
        const stored = sessionStorage.getItem('clerk_auth_token');
        return stored;
      } catch (error) {
        console.warn('Error getting token:', error);
        // Fallback to sessionStorage
        return sessionStorage.getItem('clerk_auth_token');
      }
    });
  }, [getToken]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const fetchStudents = useCallback(async (params?: StudentSearchParams) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiClient.getStudents(params);
      
      if (response.success) {
        setStudents(response.data);
        setTotalCount(response.count || 0);
        setCurrentPage(response.current_page || 1);
        setTotalPages(response.total_pages || 0);
      } else {
        setError(response.message || 'Failed to fetch students');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      console.error('Error fetching students:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStudent = useCallback(async (id: number): Promise<Student | null> => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiClient.getStudent(id);
      
      if (response.success) {
        return response.data;
      } else {
        setError(response.message || 'Failed to fetch student');
        return null;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      console.error('Error fetching student:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const createStudent = useCallback(async (student: StudentCreate): Promise<Student | null> => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiClient.createStudent(student);
      
      if (response.success) {
        // Refresh the students list to include the new student
        await fetchStudents({ limit: 100 });
        return response.data;
      } else {
        setError(response.message || 'Failed to create student');
        return null;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      console.error('Error creating student:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchStudents]);

  const updateStudent = useCallback(async (id: number, student: StudentUpdate): Promise<Student | null> => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiClient.updateStudent(id, student);
      
      if (response.success) {
        // Update the student in the local state
        setStudents(prev => prev.map(s => s.id === id ? response.data : s));
        return response.data;
      } else {
        setError(response.message || 'Failed to update student');
        return null;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      console.error('Error updating student:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteStudent = useCallback(async (id: number): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiClient.deleteStudent(id);
      
      if (response.success) {
        // Remove the student from the local state
        setStudents(prev => prev.filter(s => s.id !== id));
        setTotalCount(prev => prev - 1);
        return true;
      } else {
        setError(response.message || 'Failed to delete student');
        return false;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      console.error('Error deleting student:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const searchStudents = useCallback(async (params: StudentSearchParams) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiClient.searchStudents(params);
      
      if (response.success) {
        setStudents(response.data);
        setTotalCount(response.count || 0);
        setCurrentPage(response.current_page || 1);
        setTotalPages(response.total_pages || 0);
      } else {
        setError(response.message || 'Failed to search students');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      console.error('Error searching students:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load students on mount
  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  return {
    students,
    loading,
    error,
    totalCount,
    currentPage,
    totalPages,
    fetchStudents,
    fetchStudent,
    createStudent,
    updateStudent,
    deleteStudent,
    searchStudents,
    clearError,
  };
}
