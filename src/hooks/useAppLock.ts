import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

const LOCK_CODE_KEY = 'app_lock_code';
const LOCK_STATE_KEY = 'app_lock_state';
const LOCK_BACKGROUND_KEY = 'app_lock_background';

export interface AppLockState {
  isLocked: boolean;
  hasCode: boolean;
  backgroundImage: string | null;
}

export interface BackgroundImageValidation {
  isValid: boolean;
  error?: string;
}

export function useAppLock() {
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [hasCode, setHasCode] = useState<boolean>(false);
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);

  // Initialize lock state from localStorage
  useEffect(() => {
    const storedCode = localStorage.getItem(LOCK_CODE_KEY);
    const storedLockState = localStorage.getItem(LOCK_STATE_KEY);
    const storedBackground = localStorage.getItem(LOCK_BACKGROUND_KEY);
    
    setHasCode(!!storedCode);
    setIsLocked(storedLockState === 'true');
    setBackgroundImage(storedBackground);
  }, []);

  // Set a new lock code
  const setLockCode = useCallback((code: string) => {
    if (code.length !== 5 || !/^\d{5}$/.test(code)) {
      toast.error('Lock code must be exactly 5 digits');
      return false;
    }
    
    localStorage.setItem(LOCK_CODE_KEY, code);
    setHasCode(true);
    toast.success('Lock code set successfully');
    return true;
  }, []);

  // Change existing lock code
  const changeLockCode = useCallback((oldCode: string, newCode: string) => {
    const storedCode = localStorage.getItem(LOCK_CODE_KEY);
    
    if (storedCode !== oldCode) {
      toast.error('Current code is incorrect');
      return false;
    }
    
    if (newCode.length !== 5 || !/^\d{5}$/.test(newCode)) {
      toast.error('New code must be exactly 5 digits');
      return false;
    }
    
    localStorage.setItem(LOCK_CODE_KEY, newCode);
    toast.success('Lock code changed successfully');
    return true;
  }, []);

  // Verify and unlock with code
  const unlockWithCode = useCallback((code: string) => {
    const storedCode = localStorage.getItem(LOCK_CODE_KEY);
    
    if (!storedCode) {
      toast.error('No lock code set');
      return false;
    }
    
    if (storedCode === code) {
      setIsLocked(false);
      localStorage.setItem(LOCK_STATE_KEY, 'false');
      toast.success('Application unlocked');
      return true;
    } else {
      toast.error('Incorrect code');
      return false;
    }
  }, []);

  // Lock the application
  const lockApp = useCallback(() => {
    const storedCode = localStorage.getItem(LOCK_CODE_KEY);
    
    if (!storedCode) {
      toast.error('Please set a lock code first');
      return false;
    }
    
    setIsLocked(true);
    localStorage.setItem(LOCK_STATE_KEY, 'true');
    toast.success('Application locked');
    return true;
  }, []);

  // Remove lock code
  const removeLockCode = useCallback((code: string) => {
    const storedCode = localStorage.getItem(LOCK_CODE_KEY);
    
    if (storedCode !== code) {
      toast.error('Incorrect code');
      return false;
    }
    
    localStorage.removeItem(LOCK_CODE_KEY);
    localStorage.removeItem(LOCK_STATE_KEY);
    setHasCode(false);
    setIsLocked(false);
    toast.success('Lock code removed');
    return true;
  }, []);

  // Validate background image
  const validateBackgroundImage = useCallback(async (file: File): Promise<BackgroundImageValidation> => {
    // Check file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      return { isValid: false, error: 'Invalid file type. Please use JPG, PNG, or WebP format.' };
    }

    // Check file size (5MB limit)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return { isValid: false, error: 'File size exceeds 5MB limit.' };
    }

    // Check image dimensions
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        if (img.width < 1280 || img.height < 720) {
          resolve({ isValid: false, error: 'Image dimensions must be at least 1280×720 pixels.' });
        } else {
          resolve({ isValid: true });
        }
      };
      img.onerror = () => {
        resolve({ isValid: false, error: 'Failed to load image.' });
      };
      img.src = URL.createObjectURL(file);
    });
  }, []);

  // Set background image
  const setBackgroundImageFromFile = useCallback(async (file: File): Promise<boolean> => {
    const validation = await validateBackgroundImage(file);
    
    if (!validation.isValid) {
      toast.error(validation.error || 'Invalid image');
      return false;
    }

    // Convert to base64
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        localStorage.setItem(LOCK_BACKGROUND_KEY, base64);
        setBackgroundImage(base64);
        toast.success('Lock screen background updated');
        resolve(true);
      };
      reader.onerror = () => {
        toast.error('Failed to read image file');
        resolve(false);
      };
      reader.readAsDataURL(file);
    });
  }, [validateBackgroundImage]);

  // Reset background to default
  const resetBackground = useCallback(() => {
    localStorage.removeItem(LOCK_BACKGROUND_KEY);
    setBackgroundImage(null);
    toast.success('Lock screen background reset to default');
  }, []);

  return {
    isLocked,
    hasCode,
    backgroundImage,
    setLockCode,
    changeLockCode,
    unlockWithCode,
    lockApp,
    removeLockCode,
    setBackgroundImageFromFile,
    resetBackground,
  };
}
