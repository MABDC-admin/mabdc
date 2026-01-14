import { useState, useEffect, useCallback } from 'react';
import { BiometricAuth, BiometryType, CheckBiometryResult } from '@aparajita/capacitor-biometric-auth';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useNativeBiometric() {
  const [isSupported, setIsSupported] = useState(false);
  const [biometryType, setBiometryType] = useState<BiometryType | null>(null);
  const [isAvailable, setIsAvailable] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Check if biometric authentication is available
  useEffect(() => {
    const checkBiometricAvailability = async () => {
      // Only check on native platforms
      if (!Capacitor.isNativePlatform()) {
        setIsSupported(false);
        setIsAvailable(false);
        return;
      }

      try {
        const result: CheckBiometryResult = await BiometricAuth.checkBiometry();
        setIsSupported(result.isAvailable);
        setIsAvailable(result.isAvailable);
        setBiometryType(result.biometryType);
        
        console.log('Biometric check result:', {
          isAvailable: result.isAvailable,
          biometryType: result.biometryType,
          strongBiometryIsAvailable: result.strongBiometryIsAvailable
        });
      } catch (error) {
        console.error('Error checking biometric availability:', error);
        setIsSupported(false);
        setIsAvailable(false);
      }
    };

    checkBiometricAvailability();
  }, []);

  // Authenticate with biometrics
  const authenticate = useCallback(async (email: string): Promise<boolean> => {
    if (!isAvailable) {
      toast.error('Biometric authentication is not available on this device');
      return false;
    }

    if (!email) {
      toast.error('Please enter your email address');
      return false;
    }

    setIsLoading(true);

    try {
      // Check if user has stored biometric credentials
      const storedEmail = localStorage.getItem('biometric_email');
      if (storedEmail !== email) {
        toast.error('No biometric login registered for this email. Please sign in with password first.');
        return false;
      }

      // Prompt for biometric authentication
      await BiometricAuth.authenticate({
        reason: 'Please authenticate to sign in',
        cancelTitle: 'Cancel',
        allowDeviceCredential: true,
        iosFallbackTitle: 'Use Passcode',
        androidTitle: 'Sign In',
        androidSubtitle: 'Authenticate with biometrics',
        androidConfirmationRequired: false,
      });

      // If successful, get the stored session token
      const storedToken = localStorage.getItem('biometric_token');
      if (!storedToken) {
        toast.error('No saved session found. Please sign in with password again.');
        return false;
      }

      // Restore session from stored token
      const { data, error } = await supabase.auth.setSession({
        access_token: storedToken,
        refresh_token: localStorage.getItem('biometric_refresh_token') || '',
      });

      if (error || !data.session) {
        // Token expired or invalid, clear stored data
        localStorage.removeItem('biometric_token');
        localStorage.removeItem('biometric_refresh_token');
        toast.error('Your session has expired. Please sign in with password again.');
        return false;
      }

      toast.success('Signed in successfully!');
      return true;
    } catch (error: any) {
      console.error('Biometric authentication error:', error);
      
      if (error.code === 'biometric/user_cancel') {
        toast.error('Biometric authentication cancelled');
      } else if (error.code === 'biometric/lockout') {
        toast.error('Too many attempts. Please try again later.');
      } else if (error.code === 'biometric/not_enrolled') {
        toast.error('No biometrics enrolled. Please set up fingerprint or face recognition in your device settings.');
      } else {
        toast.error('Biometric authentication failed');
      }
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isAvailable]);

  // Register biometric login (save session tokens after successful password login)
  const registerBiometric = useCallback(async (email: string): Promise<boolean> => {
    if (!isAvailable) {
      toast.error('Biometric authentication is not available on this device');
      return false;
    }

    try {
      // Get current session
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        toast.error('Please sign in first to register biometric login');
        return false;
      }

      // Prompt for biometric to confirm registration
      await BiometricAuth.authenticate({
        reason: 'Confirm biometric registration',
        cancelTitle: 'Cancel',
        allowDeviceCredential: true,
        iosFallbackTitle: 'Use Passcode',
        androidTitle: 'Register Biometric Login',
        androidSubtitle: 'Authenticate to enable biometric login',
        androidConfirmationRequired: false,
      });

      // Store session tokens securely
      localStorage.setItem('biometric_email', email);
      localStorage.setItem('biometric_token', sessionData.session.access_token);
      localStorage.setItem('biometric_refresh_token', sessionData.session.refresh_token);

      toast.success('Biometric login registered successfully!');
      return true;
    } catch (error: any) {
      console.error('Biometric registration error:', error);
      
      if (error.code === 'biometric/user_cancel') {
        toast.error('Biometric registration cancelled');
      } else {
        toast.error('Failed to register biometric login');
      }
      return false;
    }
  }, [isAvailable]);

  // Check if biometric is already registered for an email
  const isRegistered = useCallback((email: string): boolean => {
    const storedEmail = localStorage.getItem('biometric_email');
    const storedToken = localStorage.getItem('biometric_token');
    return storedEmail === email && !!storedToken;
  }, []);

  // Clear biometric registration
  const clearBiometric = useCallback(() => {
    localStorage.removeItem('biometric_email');
    localStorage.removeItem('biometric_token');
    localStorage.removeItem('biometric_refresh_token');
    toast.success('Biometric login cleared');
  }, []);

  return {
    isSupported,
    isAvailable,
    biometryType,
    isLoading,
    authenticate,
    registerBiometric,
    isRegistered,
    clearBiometric,
  };
}
