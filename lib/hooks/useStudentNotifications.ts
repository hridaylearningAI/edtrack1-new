'use client'

import { useState, useCallback, useEffect } from 'react';
import { useUser } from '@/lib/hooks/useUser';
import { apiClient, Notification } from '../api';

interface UseStudentNotificationsReturn {
  notifications: Notification[];
  loading: boolean;
  error: string | null;
  unreadCount: number;
  fetchNotifications: () => Promise<void>;
  markAsRead: (notificationId: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

/**
 * Hook to fetch notifications for the current student
 * Gets the Supabase user ID and filters notifications by recipient_id
 */
export function useStudentNotifications(): UseStudentNotificationsReturn {
  const { user, isAuthenticated, getAccessToken } = useUser();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [supabaseUserId, setSupabaseUserId] = useState<number | null>(null);

  // Get Supabase user ID from /api/auth/me
  const fetchSupabaseUserId = useCallback(async () => {
    if (!isAuthenticated || !user) return null;

    try {
      const token = await getAccessToken();
      if (!token) return null;

      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data?.id) {
          return data.data.id as number;
        }
      }
    } catch (err) {
      console.error('Error fetching Supabase user ID:', err);
    }
    return null;
  }, [isAuthenticated, user, getAccessToken]);

  // Fetch notifications for the student
  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setNotifications([]);
      return;
    }

    // Get Supabase user ID if we don't have it
    let userId = supabaseUserId;
    if (!userId) {
      userId = await fetchSupabaseUserId();
      if (userId) {
        setSupabaseUserId(userId);
      } else {
        setError('Unable to fetch user information');
        setLoading(false);
        return;
      }
    }

    if (!userId) {
      setError('User ID not available');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Set token getter for API client
      apiClient.setTokenGetter(async () => {
        const token = await getAccessToken();
        return token || sessionStorage.getItem('clerk_auth_token');
      });

      // Fetch notifications for this student:
      // 1. Notifications specifically for this student (recipient_id = userId)
      // 2. Broadcast notifications for all students (recipient_id is null)
      // Fetch all notifications and filter client-side to get both types
      const allResponse = await apiClient.getNotifications({
        limit: 100, // Get more to ensure we capture all relevant notifications
        page: 1,
      });

      if (allResponse.success && allResponse.data) {
        // Filter to include:
        // 1. Notifications for this student (recipient_id = userId)
        // 2. Broadcast notifications (recipient_id is null/undefined) - these are for "All Students"
        const filtered = allResponse.data.filter(
          (n: Notification) => 
            n.recipient_id === userId || 
            n.recipient_id === null || 
            n.recipient_id === undefined
        );

        // Get read status for these notifications
        const notificationIds = filtered.map((n: Notification) => n.id);
        let readStatusMap: Record<number, string> = {};
        
        if (notificationIds.length > 0) {
          try {
            const readStatusResponse = await apiClient.getNotificationReadStatus(notificationIds);
            if (readStatusResponse.success && readStatusResponse.data) {
              readStatusMap = readStatusResponse.data;
            }
          } catch (readError) {
            console.warn('Error fetching read status, continuing without it:', readError);
          }
        }

        // Merge read status into notifications
        const notificationsWithReadStatus = filtered.map((n: Notification) => ({
          ...n,
          read_at: readStatusMap[n.id] || n.read_at || null, // Use per-student read_at if available, fallback to global read_at
        }));

        // Sort by created_at descending (newest first)
        const sorted = notificationsWithReadStatus.sort((a, b) => {
          const dateA = new Date(a.created_at).getTime();
          const dateB = new Date(b.created_at).getTime();
          return dateB - dateA;
        });
        
        setNotifications(sorted);
      } else {
        setError(allResponse.message || 'Failed to fetch notifications');
        setNotifications([]);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch notifications';
      setError(errorMessage);
      console.error('Error fetching notifications:', err);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user, supabaseUserId, fetchSupabaseUserId, getAccessToken]);

  // Mark a notification as read
  const markAsRead = useCallback(async (notificationId: number) => {
    try {
      apiClient.setTokenGetter(async () => {
        const token = await getAccessToken();
        return token || sessionStorage.getItem('clerk_auth_token');
      });

      // Use the new mark-read endpoint that tracks per-student read status
      await apiClient.markNotificationAsRead(notificationId);

      // Update local state
      const readAt = new Date().toISOString();
      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId
            ? { ...n, read_at: readAt }
            : n
        )
      );
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  }, [getAccessToken]);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      apiClient.setTokenGetter(async () => {
        const token = await getAccessToken();
        return token || sessionStorage.getItem('clerk_auth_token');
      });

      // Mark all unread notifications as read using the new endpoint
      const unreadNotifications = notifications.filter(n => !n.read_at);
      await Promise.all(
        unreadNotifications.map(n =>
          apiClient.markNotificationAsRead(n.id)
        )
      );

      // Update local state
      const readAt = new Date().toISOString();
      setNotifications(prev =>
        prev.map(n => ({
          ...n,
          read_at: n.read_at || readAt,
        }))
      );
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    }
  }, [notifications, getAccessToken]);

  // Calculate unread count
  const unreadCount = notifications.filter(n => !n.read_at).length;

  // Fetch Supabase user ID when user is authenticated
  useEffect(() => {
    if (isAuthenticated && user && !supabaseUserId) {
      fetchSupabaseUserId().then(userId => {
        if (userId) {
          setSupabaseUserId(userId);
        }
      });
    } else if (!isAuthenticated) {
      setSupabaseUserId(null);
      setNotifications([]);
    }
  }, [isAuthenticated, user, supabaseUserId, fetchSupabaseUserId]);

  // Fetch notifications when we have the Supabase user ID
  useEffect(() => {
    if (isAuthenticated && user && supabaseUserId && !loading) {
      fetchNotifications();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabaseUserId]);

  return {
    notifications,
    loading,
    error,
    unreadCount,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
  };
}
