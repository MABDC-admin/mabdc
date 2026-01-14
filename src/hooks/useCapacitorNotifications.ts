import { useState, useEffect, useCallback } from 'react';
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useCapacitorNotifications() {
  const [isSupported, setIsSupported] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [fcmToken, setFcmToken] = useState<string | null>(null);

  useEffect(() => {
    // Check if running on native platform
    const supported = Capacitor.isNativePlatform();
    setIsSupported(supported);

    if (supported) {
      initializePushNotifications();
    }
  }, []);

  const initializePushNotifications = async () => {
    try {
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
        
        // Save token to database
        await savePushToken(token.value);
      });

      // Listen for registration errors
      await PushNotifications.addListener('registrationError', (error) => {
        console.error('Push registration error:', error);
        toast.error('Failed to register for push notifications');
      });

      // Listen for push notifications received
      await PushNotifications.addListener(
        'pushNotificationReceived',
        (notification) => {
          console.log('Push notification received:', notification);
          
          // Show toast for foreground notifications
          toast.info(notification.title || 'New Notification', {
            description: notification.body,
          });
        }
      );

      // Listen for push notification actions performed
      await PushNotifications.addListener(
        'pushNotificationActionPerformed',
        (notification) => {
          console.log('Push notification action performed:', notification);
          
          // Handle notification tap - navigate to relevant screen
          const data = notification.notification.data;
          if (data && data.url) {
            window.location.href = data.url;
          }
        }
      );

    } catch (error) {
      console.error('Error initializing push notifications:', error);
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

  return {
    isSupported,
    isRegistered,
    fcmToken,
    requestPermissions,
    removeAllListeners,
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
