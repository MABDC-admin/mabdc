import { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { RefreshCw, X } from 'lucide-react';

export const PWAUpdatePrompt = () => {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      // Listen for new service worker taking control
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        setUpdateAvailable(true);
      });

      // Check for waiting service worker on load
      navigator.serviceWorker.ready.then((registration) => {
        if (registration.waiting) {
          setUpdateAvailable(true);
        }

        // Listen for new service worker installation
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setUpdateAvailable(true);
              }
            });
          }
        });
      });
    }
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        if (registration.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
      });
    }
    
    // Force reload after a short delay
    setTimeout(() => {
      window.location.reload();
    }, 500);
  };

  const handleDismiss = () => {
    setUpdateAvailable(false);
  };

  if (!updateAvailable) return null;

  return (
    <Alert className="mb-4 border-primary bg-primary/10 relative">
      <RefreshCw className="h-4 w-4 text-primary" />
      <AlertDescription className="flex items-center justify-between gap-2 pr-8">
        <span className="text-sm font-medium">App update available!</span>
        <Button 
          size="sm" 
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="h-7 px-3"
        >
          {isRefreshing ? (
            <RefreshCw className="h-3 w-3 animate-spin" />
          ) : (
            'Refresh Now'
          )}
        </Button>
      </AlertDescription>
      <button 
        onClick={handleDismiss}
        className="absolute right-2 top-2 p-1 rounded-sm hover:bg-primary/20"
      >
        <X className="h-3 w-3" />
      </button>
    </Alert>
  );
};
