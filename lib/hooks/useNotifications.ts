import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { apiClient, Notification, NotificationCreate, NotificationUpdate, NotificationSetting, NotificationSettingCreate } from '../api';
import { toast } from 'sonner';

interface UseNotificationsReturn {
  notifications: Notification[];
  settings: NotificationSetting[];
  loading: boolean;
  error: string | null;
  totalNotifications: number;
  sentNotifications: number;
  pendingNotifications: number;
  deliveryRate: number;
  fetchNotifications: (params?: {
    status?: string;
    type?: string;
    priority?: string;
    recipient_id?: number;
    limit?: number;
    page?: number;
  }) => Promise<void>;
  createNotification: (notification: NotificationCreate) => Promise<Notification | null>;
  updateNotification: (id: number, updates: NotificationUpdate) => Promise<void>;
  deleteNotification: (id: number) => Promise<void>;
  sendNotification: (id: number) => Promise<void>;
  fetchSettings: (userId?: number) => Promise<void>;
  saveSettings: (setting: NotificationSettingCreate) => Promise<void>;
  refreshData: () => Promise<void>;
}

export function useNotifications(): UseNotificationsReturn {
  const { getToken } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [settings, setSettings] = useState<NotificationSetting[]>([]);
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

  const fetchNotifications = useCallback(async (params?: {
    status?: string;
    type?: string;
    priority?: string;
    recipient_id?: number;
    limit?: number;
    page?: number;
  }) => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.getNotifications(params);
      setNotifications(response.data || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch notifications';
      setError(errorMessage);
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const createNotification = useCallback(async (notification: NotificationCreate): Promise<Notification | null> => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.createNotification(notification);
      toast.success('Notification created successfully');
      await fetchNotifications(); // Refresh list
      return response.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create notification';
      setError(errorMessage);
      toast.error(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchNotifications]);

  const updateNotification = useCallback(async (id: number, updates: NotificationUpdate) => {
    try {
      setLoading(true);
      setError(null);
      await apiClient.updateNotification(id, updates);
      toast.success('Notification updated successfully');
      await fetchNotifications(); // Refresh list
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update notification';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [fetchNotifications]);

  const deleteNotification = useCallback(async (id: number) => {
    try {
      setLoading(true);
      setError(null);
      await apiClient.deleteNotification(id);
      toast.success('Notification deleted successfully');
      await fetchNotifications(); // Refresh list
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete notification';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [fetchNotifications]);

  const sendNotification = useCallback(async (id: number) => {
    try {
      setLoading(true);
      setError(null);
      await apiClient.updateNotification(id, {
        status: 'Sent',
        sent_at: new Date().toISOString(),
      });
      toast.success('Notification sent successfully');
      await fetchNotifications(); // Refresh list
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send notification';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [fetchNotifications]);

  const fetchSettings = useCallback(async (userId?: number) => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.getNotificationSettings(userId);
      setSettings(response.data || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch notification settings';
      setError(errorMessage);
      console.error('Error fetching notification settings:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const saveSettings = useCallback(async (setting: NotificationSettingCreate) => {
    try {
      setLoading(true);
      setError(null);
      await apiClient.saveNotificationSettings(setting);
      toast.success('Notification settings saved successfully');
      await fetchSettings(setting.user_id); // Refresh settings
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save notification settings';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [fetchSettings]);

  const refreshData = useCallback(async () => {
    await Promise.all([fetchNotifications(), fetchSettings()]);
  }, [fetchNotifications, fetchSettings]);

  // Calculate statistics
  const totalNotifications = notifications.length;
  const sentNotifications = notifications.filter(n => n.status === 'Sent' || n.status === 'Delivered').length;
  const pendingNotifications = notifications.filter(n => n.status === 'Pending').length;
  const deliveryRate = totalNotifications > 0 ? Math.round((sentNotifications / totalNotifications) * 100) : 0;

  // Load data on mount
  useEffect(() => {
    refreshData();
  }, [refreshData]);

  return {
    notifications,
    settings,
    loading,
    error,
    totalNotifications,
    sentNotifications,
    pendingNotifications,
    deliveryRate,
    fetchNotifications,
    createNotification,
    updateNotification,
    deleteNotification,
    sendNotification,
    fetchSettings,
    saveSettings,
    refreshData,
  };
}

