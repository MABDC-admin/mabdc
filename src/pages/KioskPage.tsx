import { useEffect, useState, useRef } from 'react';
import { QrCode, LogIn, LogOut, CheckCircle, XCircle, AlertTriangle, Download, Wifi, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useCheckInByHRMS, useCheckOutByHRMS } from '@/hooks/useAttendance';
import { useScannerSounds } from '@/hooks/useScannerSounds';
import { Scanner } from '@yudiel/react-qr-scanner';
import { format } from 'date-fns';

type ScanMode = 'check-in' | 'check-out';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function KioskPage() {
  const [scanMode, setScanMode] = useState<ScanMode>(() => {
    const hour = new Date().getHours();
    return hour < 13 ? 'check-in' : 'check-out';
  });
  const [scannedEmployee, setScannedEmployee] = useState<{
    name: string;
    hrmsNo: string;
    time: string;
    status: string;
    isLate?: boolean;
  } | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  const lastScannedRef = useRef<{ hrmsNo: string; timestamp: number } | null>(null);
  const resultTimeoutRef = useRef<NodeJS.Timeout>();

  const checkIn = useCheckInByHRMS();
  const checkOut = useCheckOutByHRMS();
  const { playSound } = useScannerSounds();

  // Update time every second
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Auto-update scan mode based on time
  useEffect(() => {
    const interval = setInterval(() => {
      const hour = new Date().getHours();
      setScanMode(hour < 13 ? 'check-in' : 'check-out');
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // PWA install prompt
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // Online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  const clearResult = () => {
    setScannedEmployee(null);
    setScanError(null);
  };

  const handleScan = async (result: string) => {
    if (isProcessing) return;

    // Cooldown check - 30 seconds per employee
    const now = Date.now();
    if (lastScannedRef.current && 
        lastScannedRef.current.hrmsNo === result && 
        now - lastScannedRef.current.timestamp < 30000) {
      return;
    }

    setIsProcessing(true);
    clearResult();

    if (resultTimeoutRef.current) {
      clearTimeout(resultTimeoutRef.current);
    }

    try {
      if (scanMode === 'check-in') {
        const data = await checkIn.mutateAsync(result);
        const isLate = data.status === 'Late';
        if (isLate) {
          playSound('late');
        } else {
          playSound('check-in');
        }
        setScannedEmployee({
          name: data.employeeName || 'Unknown',
          hrmsNo: result,
          time: data.checkInTime || format(new Date(), 'HH:mm:ss'),
          status: 'Checked In',
          isLate
        });
      } else {
        const data = await checkOut.mutateAsync(result);
        playSound('check-out');
        setScannedEmployee({
          name: data.employeeName || 'Unknown',
          hrmsNo: result,
          time: data.checkOutTime || format(new Date(), 'HH:mm:ss'),
          status: 'Checked Out'
        });
      }

      lastScannedRef.current = { hrmsNo: result, timestamp: now };
    } catch (error: any) {
      console.error('Scan error:', error);
      playSound('error');
      setScanError(error.message || 'Scan failed');
    } finally {
      setIsProcessing(false);
      resultTimeoutRef.current = setTimeout(clearResult, 5000);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-black/80 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
            <QrCode className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold">Attendance Kiosk</h1>
            <p className="text-xs text-white/60">Scan QR to mark attendance</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Online status */}
          <div className={cn(
            "flex items-center gap-1 px-2 py-1 rounded-full text-xs",
            isOnline ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
          )}>
            {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {isOnline ? 'Online' : 'Offline'}
          </div>
          
          {/* Install button */}
          {deferredPrompt && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleInstall}
              className="gap-2 border-primary/50 text-primary hover:bg-primary/20"
            >
              <Download className="w-4 h-4" />
              Install
            </Button>
          )}
          
          {/* Time */}
          <div className="text-right">
            <p className="text-2xl font-bold font-mono">{format(currentTime, 'HH:mm:ss')}</p>
            <p className="text-xs text-white/60">{format(currentTime, 'EEEE, MMM d')}</p>
          </div>
        </div>
      </div>

      {/* Mode Toggle */}
      <div className="flex justify-center gap-4 p-4">
        <Button
          size="lg"
          variant={scanMode === 'check-in' ? 'default' : 'outline'}
          onClick={() => setScanMode('check-in')}
          className={cn(
            "gap-2 min-w-32",
            scanMode === 'check-in' 
              ? "bg-green-600 hover:bg-green-700" 
              : "border-white/20 text-white hover:bg-white/10"
          )}
        >
          <LogIn className="w-5 h-5" />
          Check In
        </Button>
        <Button
          size="lg"
          variant={scanMode === 'check-out' ? 'default' : 'outline'}
          onClick={() => setScanMode('check-out')}
          className={cn(
            "gap-2 min-w-32",
            scanMode === 'check-out' 
              ? "bg-blue-600 hover:bg-blue-700" 
              : "border-white/20 text-white hover:bg-white/10"
          )}
        >
          <LogOut className="w-5 h-5" />
          Check Out
        </Button>
      </div>

      {/* Scanner Area */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="relative w-full max-w-lg aspect-square">
          {/* Scanner */}
          <div className="absolute inset-0 rounded-3xl overflow-hidden">
            <Scanner
              onScan={(results) => {
                if (results && results.length > 0) {
                  handleScan(results[0].rawValue);
                }
              }}
              onError={(error) => console.error('Scanner error:', error)}
              constraints={{ facingMode: 'user' }}
              styles={{
                container: { width: '100%', height: '100%' },
                video: { width: '100%', height: '100%', objectFit: 'cover' }
              }}
            />
          </div>

          {/* Scan Frame Overlay */}
          <div className="absolute inset-0 pointer-events-none">
            <div className={cn(
              "absolute inset-8 border-4 rounded-2xl transition-colors duration-300",
              scanMode === 'check-in' ? "border-green-500/50" : "border-blue-500/50"
            )}>
              <div className={cn(
                "absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 rounded-tl-xl",
                scanMode === 'check-in' ? "border-green-500" : "border-blue-500"
              )} />
              <div className={cn(
                "absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 rounded-tr-xl",
                scanMode === 'check-in' ? "border-green-500" : "border-blue-500"
              )} />
              <div className={cn(
                "absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 rounded-bl-xl",
                scanMode === 'check-in' ? "border-green-500" : "border-blue-500"
              )} />
              <div className={cn(
                "absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 rounded-br-xl",
                scanMode === 'check-in' ? "border-green-500" : "border-blue-500"
              )} />
            </div>
          </div>

          {/* Result Overlay */}
          {(scannedEmployee || scanError) && (
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm rounded-3xl flex items-center justify-center p-8">
              {scannedEmployee ? (
                <div className="text-center space-y-4">
                  <div className={cn(
                    "w-24 h-24 rounded-full mx-auto flex items-center justify-center",
                    scannedEmployee.isLate ? "bg-amber-500/20" : "bg-green-500/20"
                  )}>
                    {scannedEmployee.isLate ? (
                      <AlertTriangle className="w-12 h-12 text-amber-400" />
                    ) : (
                      <CheckCircle className="w-12 h-12 text-green-400" />
                    )}
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold">{scannedEmployee.name}</h2>
                    <p className="text-white/60">{scannedEmployee.hrmsNo}</p>
                  </div>
                  <div className={cn(
                    "inline-flex items-center gap-2 px-4 py-2 rounded-full text-lg font-semibold",
                    scannedEmployee.isLate 
                      ? "bg-amber-500/20 text-amber-400" 
                      : scannedEmployee.status === 'Checked In'
                        ? "bg-green-500/20 text-green-400"
                        : "bg-blue-500/20 text-blue-400"
                  )}>
                    {scannedEmployee.status}
                    {scannedEmployee.isLate && ' (Late)'}
                  </div>
                  <p className="text-4xl font-mono font-bold">{scannedEmployee.time}</p>
                </div>
              ) : scanError ? (
                <div className="text-center space-y-4">
                  <div className="w-24 h-24 rounded-full bg-red-500/20 mx-auto flex items-center justify-center">
                    <XCircle className="w-12 h-12 text-red-400" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-red-400">Scan Failed</h2>
                    <p className="text-white/60 mt-2">{scanError}</p>
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {/* Processing Indicator */}
          {isProcessing && (
            <div className="absolute inset-0 bg-black/60 rounded-3xl flex items-center justify-center">
              <div className="w-16 h-16 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="p-4 text-center">
        <p className="text-white/40 text-sm">
          Position your QR code within the frame • Auto-clears after 5 seconds
        </p>
      </div>
    </div>
  );
}
