import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

const LOCK_CODE_KEY = 'app_lock_code';
const LOCK_STATE_KEY = 'app_lock_state';

export interface AppLockState {
  isLocked: boolean;
  hasCode: boolean;
}

export function useAppLock() {
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [hasCode, setHasCode] = useState<boolean>(false);

  // Initialize lock state from localStorage
  useEffect(() => {
    const storedCode = localStorage.getItem(LOCK_CODE_KEY);
    const storedLockState = localStorage.getItem(LOCK_STATE_KEY);
    
    setHasCode(!!storedCode);
    setIsLocked(storedLockState === 'true');
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

  return {
    isLocked,
    hasCode,
    setLockCode,
    changeLockCode,
    unlockWithCode,
    lockApp,
    removeLockCode,
  };
}
