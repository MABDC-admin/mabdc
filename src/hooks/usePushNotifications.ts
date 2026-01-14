import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';
import { useQueryClient } from '@tanstack/react-query';

interface Notification {
  id: string;
  title: string;
  body: string;
  type: string;
  data: Json;
  read: boolean;
  sent_at: string;
  read_at: string | null;
}

interface NotificationPreferences {
  leave_updates: boolean;
  attendance_reminders: boolean;
  announcements: boolean;
  document_expiry: boolean;
}

interface PushSubscription {
  id: string;
  device_name: string;
  created_at: string;
  last_used_at: string | null;
}

// Convert base64 to Uint8Array for VAPID key
function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray.buffer;
}

export function usePushNotifications() {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [subscriptions, setSubscriptions] = useState<PushSubscription[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    leave_updates: true,
    attendance_reminders: true,
    announcements: true,
    document_expiry: true,
  });

  // Check if push notifications are supported
  useEffect(() => {
    const supported = 'Notification' in window && 
                     'serviceWorker' in navigator && 
                     'PushManager' in window;
    setIsSupported(supported);
    
    if (supported) {
      setPermission(Notification.permission);
    }
  }, []);

  // Check current subscription status
  const checkSubscription = useCallback(async () => {
    if (!isSupported) return;

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch (error) {
      console.error('Error checking subscription:', error);
    }
  }, [isSupported]);

  useEffect(() => {
    checkSubscription();
  }, [checkSubscription]);

  // Fetch user's push subscriptions
  const fetchSubscriptions = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('push_subscriptions')
        .select('id, device_name, created_at, last_used_at')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSubscriptions(data || []);
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
    }
  }, []);

  // Fetch user's notifications
  const fetchNotifications = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('sent_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setNotifications(data || []);
      setUnreadCount((data || []).filter(n => !n.read).length);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  }, []);

  // Fetch notification preferences
  const fetchPreferences = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setPreferences({
          leave_updates: data.leave_updates,
          attendance_reminders: data.attendance_reminders,
          announcements: data.announcements,
          document_expiry: data.document_expiry,
        });
      }
    } catch (error) {
      console.error('Error fetching preferences:', error);
    }
  }, []);

  // Update notification preferences
  const updatePreferences = useCallback(async (newPreferences: Partial<NotificationPreferences>) => {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        toast.error('Please sign in first');
        return false;
      }

      const { error } = await supabase
        .from('notification_preferences')
        .upsert({
          user_id: session.session.user.id,
          ...preferences,
          ...newPreferences,
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;
      
      setPreferences(prev => ({ ...prev, ...newPreferences }));
      toast.success('Notification preferences updated');
      return true;
    } catch (error) {
      console.error('Error updating preferences:', error);
      toast.error('Failed to update preferences');
      return false;
    }
  }, [preferences]);

  // Subscribe to push notifications
  const subscribe = useCallback(async (deviceName?: string): Promise<boolean> => {
    if (!isSupported) {
      toast.error('Push notifications are not supported on this device');
      return false;
    }

    setIsLoading(true);

    try {
      // Request permission
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result !== 'granted') {
        toast.error('Notification permission denied');
        return false;
      }

      // Get VAPID public key from server
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-vapid-key`,
        {
          method: 'GET',
          headers: {
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to get VAPID key');
      }

      const { publicKey } = await response.json();

      // Subscribe to push
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      const subscriptionData = subscription.toJSON();

      // Save subscription to database
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        toast.error('Please sign in first');
        return false;
      }

      const { error } = await supabase
        .from('push_subscriptions')
        .upsert({
          user_id: session.session.user.id,
          endpoint: subscriptionData.endpoint!,
          p256dh: subscriptionData.keys!.p256dh,
          auth: subscriptionData.keys!.auth,
          device_name: deviceName || getDeviceName(),
        }, {
          onConflict: 'endpoint'
        });

      if (error) throw error;

      setIsSubscribed(true);
      toast.success('Push notifications enabled!');
      await fetchSubscriptions();
      return true;
    } catch (error) {
      console.error('Subscription error:', error);
      if (error instanceof Error) {
        toast.error(error.message || 'Failed to enable notifications');
      }
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, fetchSubscriptions]);

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        // Remove from database
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('endpoint', subscription.endpoint);

        // Unsubscribe from browser
        await subscription.unsubscribe();
      }

      setIsSubscribed(false);
      toast.success('Push notifications disabled');
      await fetchSubscriptions();
      return true;
    } catch (error) {
      console.error('Unsubscribe error:', error);
      toast.error('Failed to disable notifications');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [fetchSubscriptions]);

  // Delete a specific subscription
  const deleteSubscription = useCallback(async (subscriptionId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('push_subscriptions')
        .delete()
        .eq('id', subscriptionId);

      if (error) throw error;

      toast.success('Device removed');
      await fetchSubscriptions();
      await checkSubscription();
      return true;
    } catch (error) {
      console.error('Error deleting subscription:', error);
      toast.error('Failed to remove device');
      return false;
    }
  }, [fetchSubscriptions, checkSubscription]);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true, read_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true, read_at: new Date().toISOString() } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
      return true;
    } catch (error) {
      console.error('Error marking as read:', error);
      return false;
    }
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async (): Promise<boolean> => {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) return false;

      const { error } = await supabase
        .from('notifications')
        .update({ read: true, read_at: new Date().toISOString() })
        .eq('user_id', session.session.user.id)
        .eq('read', false);

      if (error) throw error;

      setNotifications(prev =>
        prev.map(n => ({ ...n, read: true, read_at: n.read_at || new Date().toISOString() }))
      );
      setUnreadCount(0);
      return true;
    } catch (error) {
      console.error('Error marking all as read:', error);
      return false;
    }
  }, []);

  return {
    isSupported,
    isSubscribed,
    isLoading,
    permission,
    subscriptions,
    notifications,
    unreadCount,
    preferences,
    subscribe,
    unsubscribe,
    deleteSubscription,
    fetchSubscriptions,
    fetchNotifications,
    fetchPreferences,
    updatePreferences,
    markAsRead,
    markAllAsRead,
    checkSubscription,
  };
}

// Helper to get device name
function getDeviceName(): string {
  const userAgent = navigator.userAgent;
  
  if (/iPhone/i.test(userAgent)) return 'iPhone';
  if (/iPad/i.test(userAgent)) return 'iPad';
  if (/Android/i.test(userAgent)) return 'Android Device';
  if (/Windows/i.test(userAgent)) return 'Windows PC';
  if (/Mac/i.test(userAgent)) return 'Mac';
  if (/Linux/i.test(userAgent)) return 'Linux PC';
  
  return 'Unknown Device';
}

/**
 * Real-time notification updates using Supabase Realtime
 * Automatically syncs notifications when created, updated, or deleted
 * Eliminates need for polling or manual refresh
 */
export function useRealtimeNotifications() {
  const queryClient = useQueryClient();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const setupRealtimeSubscription = async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) return;

      const userId = session.session.user.id;

      // Subscribe to notifications table changes for current user
      channel = supabase
        .channel(`notifications-${userId}`)
        .on(
          'postgres_changes',
          {
            event: '*', // Listen to INSERT, UPDATE, DELETE
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${userId}`
          },
          (payload) => {
            console.log('🔔 Real-time notification update:', payload);

            // Handle different events
            if (payload.eventType === 'INSERT') {
              const newNotification = payload.new as Notification;
              toast.info(newNotification.title, {
                description: newNotification.body,
                duration: 5000,
              });
              // Invalidate queries to fetch latest notifications
              queryClient.invalidateQueries({ queryKey: ['notifications'] });
            } else if (payload.eventType === 'UPDATE') {
              // Notification marked as read or updated
              queryClient.invalidateQueries({ queryKey: ['notifications'] });
            } else if (payload.eventType === 'DELETE') {
              // Notification deleted
              queryClient.invalidateQueries({ queryKey: ['notifications'] });
            }
          }
        )
        .subscribe();

      console.log('✅ Real-time notifications subscribed');
    };

    setupRealtimeSubscription();

    // Cleanup on unmount
    return () => {
      if (channel) {
        supabase.removeChannel(channel);
        console.log('🔌 Real-time notifications unsubscribed');
      }
    };
  }, [queryClient]);

  // Fetch unread count on mount and after updates
  useEffect(() => {
    const fetchUnreadCount = async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) return;

      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', session.session.user.id)
        .eq('read', false);

      setUnreadCount(count || 0);
    };

    fetchUnreadCount();

    // Re-fetch when notifications query is invalidated
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (event?.query.queryKey[0] === 'notifications') {
        fetchUnreadCount();
      }
    });

    return () => unsubscribe();
  }, [queryClient]);

  return { unreadCount };
}
