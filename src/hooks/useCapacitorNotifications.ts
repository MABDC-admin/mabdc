import { useState, useEffect, useCallback } from 'react';
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Get emoji based on notification type
function getTypeEmoji(type: string): string {
  const emojis: Record<string, string> = {
    leave_approval: '✅',
    leave_rejection: '❌',
    attendance_reminder: '⏰',
    announcement: '📢',
    document_expiry: '⚠️',
    attendance_appeal: '📋',
    general: '🔔',
  };
  return emojis[type] || '🔔';
}

export function useCapacitorNotifications(options: { autoInitialize?: boolean } = {}) {
  const { autoInitialize = true } = options;
  const [isSupported, setIsSupported] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Check if running on native platform
    const supported = Capacitor.isNativePlatform();
    setIsSupported(supported);

    // Only auto-initialize if explicitly enabled
    if (supported && !isInitialized && autoInitialize) {
      initializePushNotifications();
    }
  }, [isInitialized, autoInitialize]);

  const initializePushNotifications = async () => {
    try {
      // Mark as initialized to prevent re-initialization
      setIsInitialized(true);
      
      // Request permission to use push notifications
      let permStatus = await PushNotifications.checkPermissions();

      if (permStatus.receive === 'prompt') {
        permStatus = await PushNotifications.requestPermissions();
      }

      if (permStatus.receive !== 'granted') {
        console.log('Push notification permission not granted');
        return;
      }

      // Register with push notification service
      await PushNotifications.register();

      // Listen for registration success
      await PushNotifications.addListener('registration', async (token) => {
        console.log('Push registration success, token: ' + token.value);
        setFcmToken(token.value);
        setIsRegistered(true);
        
        // Save token to database - wrapped in try-catch to prevent app crashes
        try {
          await savePushToken(token.value);
        } catch (error) {
          console.error('Error saving push token (non-critical):', error);
          // Don't show error to user - token is saved in state, can retry later
        }
      });

      // Listen for registration errors
      await PushNotifications.addListener('registrationError', (error) => {
        console.error('Push registration error:', error);
        toast.error('Failed to register for push notifications');
      });

      // Listen for push notifications received (when app is in foreground)
      await PushNotifications.addListener(
        'pushNotificationReceived',
        (notification) => {
          console.log('📱 Push notification received (foreground):', notification);
          
          // Show in-app toast for foreground notifications
          // Native system notification will also be displayed automatically
          const notifType = notification.data?.type || 'general';
          const typeEmoji = getTypeEmoji(notifType);
          
          toast.info(`${typeEmoji} ${notification.title || 'New Notification'}`, {
            description: notification.body,
            duration: 5000,
          });
        }
      );

      // Listen for push notification actions performed (when user taps notification)
      await PushNotifications.addListener(
        'pushNotificationActionPerformed',
        (notification) => {
          console.log('👆 Push notification tapped:', notification);
          
          // Handle notification tap - navigate to relevant screen based on type
          const data = notification.notification.data;
          const notifType = data?.type;
          
          // Route to appropriate screen based on notification type
          if (data && notifType) {
            let targetUrl = '/employee-portal';
            
            switch (notifType) {
              case 'leave_approval':
              case 'leave_rejection':
                targetUrl = '/employee-portal?tab=leave';
                break;
              case 'attendance_reminder':
              case 'attendance_appeal':
                targetUrl = '/employee-portal?tab=attendance';
                break;
              case 'document_expiry':
                targetUrl = '/employee-portal?tab=documents';
                break;
              case 'announcement':
                targetUrl = '/employee-portal?tab=overview';
                break;
              case 'contract':
                targetUrl = '/employee-portal?tab=contract';
                break;
              default:
                targetUrl = '/employee-portal';
            }
            
            // Navigate to the target URL
            if (data.url) {
              window.location.href = data.url;
            } else {
              window.location.href = targetUrl;
            }
          }
        }
      );

    } catch (error) {
      console.error('Error initializing push notifications:', error);
      // Reset initialized state on error so it can be retried
      setIsInitialized(false);
    }
  };

  const savePushToken = async (token: string) => {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        console.log('No active session');
        return;
      }

      const deviceName = getDeviceName();

      // For Capacitor, we use the token as both endpoint and store it
      // The p256dh and auth fields are required by the schema but not used for FCM
      const { error } = await supabase
        .from('push_subscriptions')
        .upsert({
          user_id: session.session.user.id,
          endpoint: token,
          device_name: deviceName,
          p256dh: token, // Use token as placeholder
          auth: token, // Use token as placeholder
        }, {
          onConflict: 'endpoint'
        });

      if (error) {
        console.error('Error saving push token:', error);
      } else {
        console.log('Push token saved successfully');
      }
    } catch (error) {
      console.error('Error in savePushToken:', error);
    }
  };

  const requestPermissions = useCallback(async () => {
    if (!isSupported) {
      toast.error('Push notifications not supported on this platform');
      return false;
    }

    try {
      const permStatus = await PushNotifications.requestPermissions();
      
      if (permStatus.receive === 'granted') {
        await PushNotifications.register();
        toast.success('Notifications enabled!');
        return true;
      } else {
        toast.error('Notification permission denied');
        return false;
      }
    } catch (error) {
      console.error('Error requesting permissions:', error);
      toast.error('Failed to enable notifications');
      return false;
    }
  }, [isSupported]);

  const removeAllListeners = useCallback(async () => {
    await PushNotifications.removeAllListeners();
  }, []);

  // Manual initialization method for explicit control
  const initialize = useCallback(async () => {
    if (!isSupported) {
      console.log('Push notifications not supported');
      return false;
    }
    if (isInitialized) {
      console.log('Already initialized');
      return true;
    }
    await initializePushNotifications();
    return true;
  }, [isSupported, isInitialized]);

  return {
    isSupported,
    isRegistered,
    fcmToken,
    requestPermissions,
    removeAllListeners,
    initialize, // Export the manual initialization method
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
