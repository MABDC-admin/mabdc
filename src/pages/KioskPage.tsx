import { useEffect, useState, useRef } from 'react';
import { QrCode, LogIn, LogOut, CheckCircle, XCircle, AlertTriangle, Download, Wifi, WifiOff, Camera, SwitchCamera, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useCheckInByHRMS, useCheckOutByHRMS, useRealtimeAttendance } from '@/hooks/useAttendance';
import { useScannerSounds } from '@/hooks/useScannerSounds';
import { Scanner } from '@yudiel/react-qr-scanner';
import { format } from 'date-fns';

type ScanMode = 'check-in' | 'check-out';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface ScannedEmployee {
  name: string;
  hrmsNo: string;
  time: string;
  status: string;
  isLate?: boolean;
  photo?: string;
}

export default function KioskPage() {
  const [scanMode, setScanMode] = useState<ScanMode>(() => {
    const hour = new Date().getHours();
    return hour < 13 ? 'check-in' : 'check-out';
  });
  const [scannedEmployee, setScannedEmployee] = useState<ScannedEmployee | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [cameraActive, setCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  
  const lastScannedRef = useRef<{ hrmsNo: string; timestamp: number } | null>(null);
  const resultTimeoutRef = useRef<NodeJS.Timeout>();
  const processingRef = useRef(false);

  const checkIn = useCheckInByHRMS();
  const checkOut = useCheckOutByHRMS();
  const { playSound } = useScannerSounds();
  
  // Use realtime subscription for live attendance updates
  useRealtimeAttendance();

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

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const toggleCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  const handleScan = async (result: string) => {
    // Immediate sync block using ref to prevent race conditions
    if (processingRef.current) return;

    // Cooldown check - 30 seconds per employee
    const now = Date.now();
    if (lastScannedRef.current && 
        lastScannedRef.current.hrmsNo === result && 
        now - lastScannedRef.current.timestamp < 30000) {
      return;
    }

    // Set ref immediately before any async operations
    processingRef.current = true;
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
          isLate,
          photo: data.employeePhoto
        });
      } else {
        const data = await checkOut.mutateAsync(result);
        playSound('check-out');
        setScannedEmployee({
          name: data.employeeName || 'Unknown',
          hrmsNo: result,
          time: data.checkOutTime || format(new Date(), 'HH:mm:ss'),
          status: 'Checked Out',
          photo: data.employeePhoto
        });
      }

      lastScannedRef.current = { hrmsNo: result, timestamp: now };
    } catch (error: any) {
      console.error('Scan error:', error);
      playSound('error');
      setScanError(error.message || 'Scan failed');
    } finally {
      processingRef.current = false;
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
      <div className="flex-1 flex items-center justify-center p-2 sm:p-4 min-h-0">
        <div className="relative w-full max-w-[min(100vw-1rem,24rem)] sm:max-w-lg aspect-square max-h-[calc(100vh-16rem)]">
          {/* Camera Off State */}
          {!cameraActive ? (
            <div className="absolute inset-0 rounded-2xl sm:rounded-3xl bg-white/5 border-2 border-dashed border-white/20 flex flex-col items-center justify-center gap-6">
              <div className="w-24 h-24 rounded-full bg-white/10 flex items-center justify-center">
                <Camera className="w-12 h-12 text-white/40" />
              </div>
              <div className="text-center">
                <h3 className="text-xl font-semibold text-white/80">Camera Off</h3>
                <p className="text-sm text-white/40 mt-1">Start the camera to scan QR codes</p>
              </div>
              <Button
                size="lg"
                onClick={() => setCameraActive(true)}
                className="gap-2 bg-primary hover:bg-primary/80"
              >
                <Camera className="w-5 h-5" />
                Start Camera
              </Button>
            </div>
          ) : (
            <>
              {/* Scanner */}
              <div className="absolute inset-0 rounded-2xl sm:rounded-3xl overflow-hidden">
                <Scanner
                  key={facingMode}
                  onScan={(results) => {
                    if (results && results.length > 0) {
                      handleScan(results[0].rawValue);
                    }
                  }}
                  onError={(error) => {
                    console.error('Scanner error:', error);
                    const errorMessage = error instanceof Error ? error.message : 'Camera initialization failed. Please check permissions.';
                    setCameraError(errorMessage);
                  }}
                  formats={['qr_code']}
                  scanDelay={500}
                  paused={isProcessing}
                  constraints={{ 
                    facingMode
                  }}
                  styles={{
                    container: { width: '100%', height: '100%' },
                    video: { width: '100%', height: '100%', objectFit: 'cover' }
                  }}
                />
              </div>

              {/* Camera Controls */}
              <div className="absolute top-3 right-3 flex gap-2 z-10">
                <Button
                  size="icon"
                  variant="secondary"
                  onClick={toggleCamera}
                  className="w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 border border-white/20"
                >
                  <SwitchCamera className="w-5 h-5 text-white" />
                </Button>
                <Button
                  size="icon"
                  variant="secondary"
                  onClick={() => setCameraActive(false)}
                  className="w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 border border-white/20"
                >
                  <XCircle className="w-5 h-5 text-white" />
                </Button>
              </div>

              {/* Scan Frame Overlay */}
              <div className="absolute inset-0 pointer-events-none">
                <div className={cn(
                  "absolute inset-4 sm:inset-8 border-4 rounded-xl sm:rounded-2xl transition-colors duration-300",
                  scanMode === 'check-in' ? "border-green-500/50" : "border-blue-500/50"
                )}>
                  <div className={cn(
                    "absolute -top-1 -left-1 w-6 h-6 sm:w-8 sm:h-8 border-t-4 border-l-4 rounded-tl-lg sm:rounded-tl-xl",
                    scanMode === 'check-in' ? "border-green-500" : "border-blue-500"
                  )} />
                  <div className={cn(
                    "absolute -top-1 -right-1 w-6 h-6 sm:w-8 sm:h-8 border-t-4 border-r-4 rounded-tr-lg sm:rounded-tr-xl",
                    scanMode === 'check-in' ? "border-green-500" : "border-blue-500"
                  )} />
                  <div className={cn(
                    "absolute -bottom-1 -left-1 w-6 h-6 sm:w-8 sm:h-8 border-b-4 border-l-4 rounded-bl-lg sm:rounded-bl-xl",
                    scanMode === 'check-in' ? "border-green-500" : "border-blue-500"
                  )} />
                  <div className={cn(
                    "absolute -bottom-1 -right-1 w-6 h-6 sm:w-8 sm:h-8 border-b-4 border-r-4 rounded-br-lg sm:rounded-br-xl",
                    scanMode === 'check-in' ? "border-green-500" : "border-blue-500"
                  )} />
                </div>
              </div>

              {/* Result Overlay */}
              {(scannedEmployee || scanError) && (
                <div className="absolute inset-0 bg-black/80 backdrop-blur-sm rounded-2xl sm:rounded-3xl flex items-center justify-center p-4 sm:p-8">
                  {scannedEmployee ? (
                    <div className="text-center space-y-4">
                      {/* Employee Photo or Initials */}
                      {scannedEmployee.photo ? (
                        <div className={cn(
                          "w-28 h-28 rounded-full mx-auto overflow-hidden ring-4",
                          scannedEmployee.isLate 
                            ? "ring-amber-500/50" 
                            : scannedEmployee.status === 'Checked In'
                              ? "ring-green-500/50"
                              : "ring-blue-500/50"
                        )}>
                          <img 
                            src={scannedEmployee.photo} 
                            alt={scannedEmployee.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className={cn(
                          "w-28 h-28 rounded-full mx-auto flex items-center justify-center text-3xl font-bold",
                          scannedEmployee.isLate 
                            ? "bg-amber-500/20 text-amber-400" 
                            : scannedEmployee.status === 'Checked In'
                              ? "bg-green-500/20 text-green-400"
                              : "bg-blue-500/20 text-blue-400"
                        )}>
                          {getInitials(scannedEmployee.name)}
                        </div>
                      )}
                      
                      {/* Status Icon Badge */}
                      <div className="flex justify-center -mt-8">
                        <div className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center border-4 border-black",
                          scannedEmployee.isLate 
                            ? "bg-amber-500" 
                            : scannedEmployee.status === 'Checked In'
                              ? "bg-green-500"
                              : "bg-blue-500"
                        )}>
                          {scannedEmployee.isLate ? (
                            <AlertTriangle className="w-5 h-5 text-white" />
                          ) : (
                            <CheckCircle className="w-5 h-5 text-white" />
                          )}
                        </div>
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

              {/* Camera Error Overlay */}
              {cameraError && (
                <div className="absolute inset-0 bg-black/90 rounded-2xl sm:rounded-3xl flex items-center justify-center p-4 sm:p-8">
                  <div className="text-center space-y-4">
                    <XCircle className="w-16 h-16 text-red-400 mx-auto" />
                    <h2 className="text-xl font-bold">Camera Error</h2>
                    <p className="text-white/60 text-sm">{cameraError}</p>
                    <Button 
                      onClick={() => setCameraError(null)}
                      className="bg-primary hover:bg-primary/80"
                    >
                      Retry
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="p-4 text-center">
        <p className="text-white/40 text-sm">
          {cameraActive 
            ? "Position your QR code within the frame • Auto-clears after 5 seconds"
            : "Tap 'Start Camera' to begin scanning"
          }
        </p>
      </div>
    </div>
  );
}
