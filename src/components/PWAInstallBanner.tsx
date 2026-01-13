import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, Download, Share, MoreVertical } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "pwa-install-banner-dismissed";

export function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if dismissed
    const dismissed = localStorage.getItem(DISMISS_KEY);
    if (dismissed) {
      setIsDismissed(true);
    }

    // Check if running in standalone mode
    const standalone = window.matchMedia("(display-mode: standalone)").matches || 
                       (window.navigator as any).standalone === true;
    setIsStandalone(standalone);

    // Detect platform
    const userAgent = window.navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(userAgent));
    setIsAndroid(/android/.test(userAgent));

    // Listen for install prompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === "accepted") {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, "true");
    setIsDismissed(true);
  };

  // Don't show if already installed, dismissed, or in standalone mode
  if (isStandalone || isDismissed || isInstalled) {
    return null;
  }

  return (
    <Alert className="mb-4 relative bg-primary/5 border-primary/20">
      <Button
        variant="ghost"
        size="icon"
        className="absolute right-2 top-2 h-6 w-6"
        onClick={handleDismiss}
      >
        <X className="h-4 w-4" />
      </Button>
      
      <AlertDescription className="pr-8">
        {deferredPrompt ? (
          <div className="flex items-center gap-3">
            <Download className="h-5 w-5 text-primary flex-shrink-0" />
            <div className="flex-1">
              <p className="font-medium text-foreground">Install App for Better Experience</p>
              <p className="text-sm text-muted-foreground">Quick access from your home screen</p>
            </div>
            <Button size="sm" onClick={handleInstall}>
              Install
            </Button>
          </div>
        ) : isIOS ? (
          <div className="flex items-start gap-3">
            <Share className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-foreground">Install on iOS</p>
              <p className="text-sm text-muted-foreground">
                Tap <Share className="inline h-4 w-4" /> then "Add to Home Screen"
              </p>
            </div>
          </div>
        ) : isAndroid ? (
          <div className="flex items-start gap-3">
            <MoreVertical className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-foreground">Install on Android</p>
              <p className="text-sm text-muted-foreground">
                Tap menu <MoreVertical className="inline h-4 w-4" /> then "Install app"
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3">
            <Download className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-foreground">Install App</p>
              <p className="text-sm text-muted-foreground">
                Use your browser menu to install this app
              </p>
            </div>
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
}
