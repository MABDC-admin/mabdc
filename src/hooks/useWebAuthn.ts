import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Passkey {
  id: string;
  device_name: string;
  created_at: string;
  last_used_at: string | null;
}

// Convert base64url to ArrayBuffer
function base64UrlToArrayBuffer(base64url: string): ArrayBuffer {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(base64 + padding);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// Convert ArrayBuffer to base64url
function arrayBufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

export function useWebAuthn() {
  const [isSupported, setIsSupported] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [passkeys, setPasskeys] = useState<Passkey[]>([]);

  // Check if WebAuthn is supported
  useEffect(() => {
    const checkSupport = async () => {
      if (!window.PublicKeyCredential) {
        setIsSupported(false);
        return;
      }

      try {
        // Check if platform authenticator is available (fingerprint, Face ID, etc.)
        const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        setIsSupported(available);
      } catch {
        setIsSupported(false);
      }
    };

    checkSupport();
  }, []);

  // Fetch user's registered passkeys
  const fetchPasskeys = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('user_passkeys')
        .select('id, device_name, created_at, last_used_at')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPasskeys(data || []);
    } catch (error) {
      console.error('Error fetching passkeys:', error);
    }
  }, []);

  // Register a new passkey (requires user to be authenticated)
  const registerPasskey = useCallback(async (deviceName?: string): Promise<boolean> => {
    if (!isSupported) {
      toast.error('Biometric authentication is not supported on this device');
      return false;
    }

    setIsLoading(true);

    try {
      // Get registration options from server
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        toast.error('Please sign in first to register a passkey');
        return false;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/webauthn-register-options`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.session.access_token}`,
          },
          body: JSON.stringify({ deviceName: deviceName || 'My Device' }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to get registration options');
      }

      const { options } = await response.json();

      // Convert challenge and user.id to ArrayBuffer
      const publicKeyOptions: PublicKeyCredentialCreationOptions = {
        ...options,
        challenge: base64UrlToArrayBuffer(options.challenge),
        user: {
          ...options.user,
          id: base64UrlToArrayBuffer(options.user.id),
        },
        excludeCredentials: options.excludeCredentials?.map((cred: { id: string; type: string; transports?: string[] }) => ({
          ...cred,
          id: base64UrlToArrayBuffer(cred.id),
        })),
      };

      // Create the credential (this prompts the user for biometrics)
      const credential = await navigator.credentials.create({
        publicKey: publicKeyOptions,
      }) as PublicKeyCredential;

      if (!credential) {
        throw new Error('Failed to create credential');
      }

      const attestationResponse = credential.response as AuthenticatorAttestationResponse;

      // Send credential to server for verification
      const verifyResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/webauthn-register-verify`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.session.access_token}`,
          },
          body: JSON.stringify({
            credential: {
              id: credential.id,
              rawId: arrayBufferToBase64Url(credential.rawId),
              type: credential.type,
              response: {
                clientDataJSON: arrayBufferToBase64Url(attestationResponse.clientDataJSON),
                attestationObject: arrayBufferToBase64Url(attestationResponse.attestationObject),
                transports: attestationResponse.getTransports?.() || ['internal'],
              },
            },
            deviceName: deviceName || 'My Device',
          }),
        }
      );

      if (!verifyResponse.ok) {
        const error = await verifyResponse.json();
        throw new Error(error.error || 'Failed to verify registration');
      }

      toast.success('Biometric login registered successfully!');
      await fetchPasskeys();
      return true;
    } catch (error) {
      console.error('Passkey registration error:', error);
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          toast.error('Biometric registration was cancelled or timed out');
        } else if (error.name === 'InvalidStateError') {
          toast.error('This device is already registered');
        } else {
          toast.error(error.message || 'Failed to register biometric login');
        }
      }
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, fetchPasskeys]);

  // Authenticate with passkey
  const authenticateWithPasskey = useCallback(async (email: string): Promise<boolean> => {
    if (!isSupported) {
      toast.error('Biometric authentication is not supported on this device');
      return false;
    }

    if (!email) {
      toast.error('Please enter your email address');
      return false;
    }

    setIsLoading(true);

    try {
      // Get authentication options from server
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/webauthn-auth-options`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ email }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        if (response.status === 404) {
          toast.error('No biometric login found for this email. Please sign in with password first to set it up.');
        } else {
          toast.error(error.error || 'Failed to start biometric login');
        }
        return false;
      }

      const { options } = await response.json();

      // Convert challenge and credential IDs to ArrayBuffer
      const publicKeyOptions: PublicKeyCredentialRequestOptions = {
        ...options,
        challenge: base64UrlToArrayBuffer(options.challenge),
        allowCredentials: options.allowCredentials?.map((cred: { id: string; type: string; transports?: string[] }) => ({
          ...cred,
          id: base64UrlToArrayBuffer(cred.id),
        })),
      };

      // Get the credential (this prompts the user for biometrics)
      const credential = await navigator.credentials.get({
        publicKey: publicKeyOptions,
      }) as PublicKeyCredential;

      if (!credential) {
        throw new Error('Failed to get credential');
      }

      const assertionResponse = credential.response as AuthenticatorAssertionResponse;

      // Send credential to server for verification
      const verifyResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/webauthn-auth-verify`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            email,
            credential: {
              id: credential.id,
              rawId: arrayBufferToBase64Url(credential.rawId),
              type: credential.type,
              response: {
                clientDataJSON: arrayBufferToBase64Url(assertionResponse.clientDataJSON),
                authenticatorData: arrayBufferToBase64Url(assertionResponse.authenticatorData),
                signature: arrayBufferToBase64Url(assertionResponse.signature),
                userHandle: assertionResponse.userHandle
                  ? arrayBufferToBase64Url(assertionResponse.userHandle)
                  : null,
              },
            },
          }),
        }
      );

      if (!verifyResponse.ok) {
        const error = await verifyResponse.json();
        throw new Error(error.error || 'Failed to verify biometric login');
      }

      const result = await verifyResponse.json();

      // Use the magic link to set the session
      if (result.tokenHash) {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: result.tokenHash,
          type: 'magiclink',
        });

        if (error) {
          // If magic link verification fails, try using the redirect URL
          if (result.redirectUrl) {
            window.location.href = result.redirectUrl;
            return true;
          }
          throw error;
        }
      } else if (result.redirectUrl) {
        // Fallback to redirect
        window.location.href = result.redirectUrl;
        return true;
      }

      toast.success('Signed in successfully!');
      return true;
    } catch (error) {
      console.error('Passkey authentication error:', error);
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          toast.error('Biometric verification was cancelled or timed out');
        } else {
          toast.error(error.message || 'Failed to sign in with biometrics');
        }
      }
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported]);

  // Delete a passkey
  const deletePasskey = useCallback(async (passkeyId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('user_passkeys')
        .delete()
        .eq('id', passkeyId);

      if (error) throw error;

      toast.success('Passkey removed successfully');
      await fetchPasskeys();
      return true;
    } catch (error) {
      console.error('Error deleting passkey:', error);
      toast.error('Failed to remove passkey');
      return false;
    }
  }, [fetchPasskeys]);

  return {
    isSupported,
    isLoading,
    passkeys,
    fetchPasskeys,
    registerPasskey,
    authenticateWithPasskey,
    deletePasskey,
  };
}
