import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Download, Smartphone, Share, Plus, MoreVertical, Check } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallPage() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already installed
    const checkStandalone = window.matchMedia('(display-mode: standalone)').matches 
      || (window.navigator as any).standalone === true;
    setIsStandalone(checkStandalone);
    
    // Detect platform
    const userAgent = navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(userAgent));
    setIsAndroid(/android/.test(userAgent));

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  if (isStandalone) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/5 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Check className="w-8 h-8 text-primary" />
            </div>
            <CardTitle>App Already Installed</CardTitle>
            <CardDescription>
              You're using the installed version of MABDC HR System.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Link to="/">
              <Button className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Go to Home
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/5">
      <header className="bg-card border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Link to="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-foreground">Install App</h1>
              <p className="text-sm text-muted-foreground">Add to your home screen</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <div className="w-24 h-24 mx-auto mb-4 rounded-3xl bg-primary/10 flex items-center justify-center">
            <Smartphone className="w-12 h-12 text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">MABDC HR System</h2>
          <p className="text-muted-foreground">
            Install this app on your device for quick access and a better experience.
          </p>
        </div>

        {isInstalled ? (
          <Card>
            <CardContent className="py-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                <Check className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Installation Complete!</h3>
              <p className="text-muted-foreground">
                You can now find the app on your home screen.
              </p>
            </CardContent>
          </Card>
        ) : deferredPrompt ? (
          <Card>
            <CardContent className="py-8 text-center">
              <Button onClick={handleInstall} size="lg" className="gap-2">
                <Download className="w-5 h-5" />
                Install App
              </Button>
              <p className="text-sm text-muted-foreground mt-4">
                Click the button above to install the app
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {isIOS && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Smartphone className="w-5 h-5" />
                    Install on iPhone/iPad
                  </CardTitle>
                  <CardDescription>
                    Follow these steps to add the app to your home screen
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="font-semibold text-primary">1</span>
                    </div>
                    <div>
                      <p className="font-medium">Tap the Share button</p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        Look for the <Share className="w-4 h-4 inline" /> icon at the bottom of Safari
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="font-semibold text-primary">2</span>
                    </div>
                    <div>
                      <p className="font-medium">Select "Add to Home Screen"</p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        Look for the <Plus className="w-4 h-4 inline" /> icon in the share menu
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="font-semibold text-primary">3</span>
                    </div>
                    <div>
                      <p className="font-medium">Tap "Add"</p>
                      <p className="text-sm text-muted-foreground">
                        Confirm to add the app to your home screen
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {isAndroid && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Smartphone className="w-5 h-5" />
                    Install on Android
                  </CardTitle>
                  <CardDescription>
                    Follow these steps to add the app to your home screen
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="font-semibold text-primary">1</span>
                    </div>
                    <div>
                      <p className="font-medium">Tap the menu button</p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        Look for the <MoreVertical className="w-4 h-4 inline" /> icon in Chrome
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="font-semibold text-primary">2</span>
                    </div>
                    <div>
                      <p className="font-medium">Select "Install app" or "Add to Home screen"</p>
                      <p className="text-sm text-muted-foreground">
                        The option may vary depending on your browser
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="font-semibold text-primary">3</span>
                    </div>
                    <div>
                      <p className="font-medium">Confirm installation</p>
                      <p className="text-sm text-muted-foreground">
                        Tap "Install" or "Add" to complete
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {!isIOS && !isAndroid && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Download className="w-5 h-5" />
                    Install on Desktop
                  </CardTitle>
                  <CardDescription>
                    Follow these steps to install the app
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="font-semibold text-primary">1</span>
                    </div>
                    <div>
                      <p className="font-medium">Look for the install icon</p>
                      <p className="text-sm text-muted-foreground">
                        Check the address bar for an install button or icon
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="font-semibold text-primary">2</span>
                    </div>
                    <div>
                      <p className="font-medium">Click "Install"</p>
                      <p className="text-sm text-muted-foreground">
                        Confirm the installation when prompted
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Benefits of Installing</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-primary" />
                    Quick access from your home screen
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-primary" />
                    Works offline for basic features
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-primary" />
                    Full-screen experience without browser UI
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-primary" />
                    Faster loading times
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
