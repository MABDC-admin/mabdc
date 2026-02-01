import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Scanner } from '@yudiel/react-qr-scanner';
import { useCheckInByHRMS, useCheckOutByHRMS, useTodayAttendance } from '@/hooks/useAttendance';
import { useScannerSounds } from '@/hooks/useScannerSounds';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  QrCode, CheckCircle, Clock, Users, ArrowLeft, 
  LogIn, LogOut, RefreshCw, Camera, AlertTriangle, User,
  Maximize, Minimize
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

type ScanMode = 'check-in' | 'check-out';
type ScannerState = 'standby' | 'scanning' | 'result';

interface ScannedEmployee {
  name: string;
  photo?: string | null;
  department?: string;
  jobPosition?: string;
  status: string;
  isLate: boolean;
  checkInTime?: string;
  checkOutTime?: string;
  mode: ScanMode;
  hrmsNo?: string;
}

export default function QRScannerPage() {
  const [scanMode, setScanMode] = useState<ScanMode>('check-in');
  const [scannerState, setScannerState] = useState<ScannerState>('standby');
  const [scannedEmployee, setScannedEmployee] = useState<ScannedEmployee | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [lastScannedHRMS, setLastScannedHRMS] = useState<string | null>(null);
  const [cooldownEndTime, setCooldownEndTime] = useState<number>(0);
  const [kioskMode, setKioskMode] = useState(false);
  const [showHeader, setShowHeader] = useState(true);
  
  const scanTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const resultTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const postScanTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const headerTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const checkIn = useCheckInByHRMS();
  const checkOut = useCheckOutByHRMS();
  const { data: todayAttendance = [], refetch } = useTodayAttendance();
  const { playSound } = useScannerSounds();

  // Auto-select mode based on time of day
  useEffect(() => {
    const currentHour = new Date().getHours();
    // Before 1 PM (13:00) = Check-in, After 1 PM = Check-out
    if (currentHour < 13) {
      setScanMode('check-in');
    } else {
      setScanMode('check-out');
    }
  }, []);

  // Update current time every second
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Auto-refresh attendance every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => refetch(), 30000);
    return () => clearInterval(interval);
  }, [refetch]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current);
      if (resultTimeoutRef.current) clearTimeout(resultTimeoutRef.current);
      if (postScanTimeoutRef.current) clearTimeout(postScanTimeoutRef.current);
      if (headerTimeoutRef.current) clearTimeout(headerTimeoutRef.current);
    };
  }, []);

  // Auto-hide header in kiosk mode
  useEffect(() => {
    if (!kioskMode) {
      setShowHeader(true);
      return;
    }

    // Initially hide header in kiosk mode
    const timeout = setTimeout(() => {
      setShowHeader(false);
    }, 3000);

    return () => clearTimeout(timeout);
  }, [kioskMode]);

  const handleMouseMove = useCallback(() => {
    if (!kioskMode) return;
    
    setShowHeader(true);
    
    if (headerTimeoutRef.current) {
      clearTimeout(headerTimeoutRef.current);
    }
    
    headerTimeoutRef.current = setTimeout(() => {
      setShowHeader(false);
    }, 3000);
  }, [kioskMode]);

  const toggleKioskMode = useCallback(() => {
    if (!kioskMode) {
      // Enter fullscreen
      document.documentElement.requestFullscreen?.().catch(() => {
        // Fullscreen not supported, continue without it
      });
      setKioskMode(true);
      // Auto-start scanning in kiosk mode
      setScannerState('scanning');
    } else {
      // Exit fullscreen
      document.exitFullscreen?.().catch(() => {});
      setKioskMode(false);
      setShowHeader(true);
    }
  }, [kioskMode]);

  // Listen for fullscreen exit
  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && kioskMode) {
        setKioskMode(false);
        setShowHeader(true);
      }
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [kioskMode]);

  const clearAllTimeouts = useCallback(() => {
    if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current);
    if (resultTimeoutRef.current) clearTimeout(resultTimeoutRef.current);
    if (postScanTimeoutRef.current) clearTimeout(postScanTimeoutRef.current);
    if (headerTimeoutRef.current) clearTimeout(headerTimeoutRef.current);
  }, []);

  const startScanning = useCallback(() => {
    setScannerState('scanning');
    setScannedEmployee(null);
    setScanError(null);
    clearAllTimeouts();
    
    // Auto-standby after 10 seconds if no scan
    scanTimeoutRef.current = setTimeout(() => {
      setScannerState('standby');
    }, 10000);
  }, [clearAllTimeouts]);

  const sendLateNotification = async (employeeData: {
    employeeName: string;
    employeeId: string;
    hrmsNo: string;
    department: string;
    jobPosition: string;
    checkInTime: string;
    photoUrl?: string | null;
  }) => {
    try {
      const [hours, minutes] = employeeData.checkInTime.split(':').map(Number);
      const checkInMinutes = hours * 60 + minutes;
      const scheduledMinutes = 8 * 60;
      const minutesLate = checkInMinutes - scheduledMinutes;

      await supabase.functions.invoke('send-late-notification', {
        body: {
          employeeName: employeeData.employeeName,
          employeeId: employeeData.employeeId,
          hrmsNo: employeeData.hrmsNo,
          department: employeeData.department,
          jobPosition: employeeData.jobPosition,
          checkInTime: employeeData.checkInTime,
          scheduledTime: '08:00 AM',
          minutesLate: minutesLate,
          photoUrl: employeeData.photoUrl,
        },
      });
    } catch (error) {
      console.error('Failed to send late notification:', error);
    }
  };

  const sendUndertimeNotification = async (employeeData: {
    employeeName: string;
    employeeId: string;
    hrmsNo: string;
    department: string;
    jobPosition: string;
    employeeEmail: string;
    checkOutTime: string;
    scheduledEndTime: string;
  }) => {
    try {
      const [hours, minutes] = employeeData.checkOutTime.split(':').map(Number);
      const checkOutMinutes = hours * 60 + minutes;
      
      const [endHours, endMins] = employeeData.scheduledEndTime.split(':').map(Number);
      const scheduledMinutes = endHours * 60 + endMins;
      
      const minutesEarly = scheduledMinutes - checkOutMinutes;

      if (minutesEarly > 0) {
        await supabase.functions.invoke('send-undertime-notification', {
          body: {
            employeeName: employeeData.employeeName,
            employeeId: employeeData.employeeId,
            hrmsNo: employeeData.hrmsNo,
            department: employeeData.department,
            jobPosition: employeeData.jobPosition,
            employeeEmail: employeeData.employeeEmail,
            checkOutTime: employeeData.checkOutTime,
            scheduledEndTime: employeeData.scheduledEndTime,
            minutesEarly,
          },
        });
        console.log('Undertime notification sent successfully');
      }
    } catch (error) {
      console.error('Failed to send undertime notification:', error);
    }
  };

  const handleScan = async (result: string) => {
    if (!result || scannerState !== 'scanning') return;
    
    // Check for duplicate scan within cooldown period
    const now = Date.now();
    if (result === lastScannedHRMS && now < cooldownEndTime) {
      return; // Skip duplicate scan
    }
    
    clearAllTimeouts();
    setScannerState('result');
    setLastScannedHRMS(result);
    setCooldownEndTime(now + 30000); // 30 second cooldown for same HRMS
    
    try {
      if (scanMode === 'check-in') {
        const data = await checkIn.mutateAsync(result);
        const isLate = data.status === 'Late';
        
        // Play appropriate sound
        if (isLate) {
          playSound('late');
        } else {
          playSound('check-in');
        }
        
        setScannedEmployee({
          name: data.employeeName,
          photo: data.employeePhoto,
          department: data.department,
          jobPosition: data.jobPosition,
          status: data.status,
          isLate: isLate,
          checkInTime: data.checkInTime,
          mode: 'check-in',
          hrmsNo: result,
        });

        if (isLate) {
          sendLateNotification({
            employeeName: data.employeeName,
            employeeId: data.employeeId,
            hrmsNo: result,
            department: data.department || '',
            jobPosition: data.jobPosition || '',
            checkInTime: data.checkInTime,
            photoUrl: data.employeePhoto,
          });
        }
      } else {
        const data = await checkOut.mutateAsync(result);
        
        // Play check-out sound
        playSound('check-out');
        
        setScannedEmployee({
          name: data.employeeName,
          photo: data.employeePhoto,
          department: data.department,
          jobPosition: data.jobPosition,
          status: data.status || 'Present',
          isLate: data.status === 'Late',
          checkInTime: data.checkInTime,
          checkOutTime: data.checkOutTime,
          mode: 'check-out',
          hrmsNo: result,
        });

        // Send undertime notification if employee is leaving early
        if (data.status?.includes('Undertime')) {
          // Fetch employee email for notification
          const { data: empData } = await supabase
            .from('employees')
            .select('work_email')
            .eq('hrms_no', result)
            .single();
          
          sendUndertimeNotification({
            employeeName: data.employeeName,
            employeeId: data.employee_id || '',
            hrmsNo: result,
            department: data.department || '',
            jobPosition: data.jobPosition || '',
            employeeEmail: empData?.work_email || '',
            checkOutTime: data.checkOutTime,
            scheduledEndTime: '17:00', // Default shift end
          });
        }
      }
      
      // Show result for 5 seconds
      resultTimeoutRef.current = setTimeout(() => {
        setScannedEmployee(null);
        setScannerState('scanning');
        
        // Keep camera on for 10 more seconds
        postScanTimeoutRef.current = setTimeout(() => {
          setScannerState('standby');
        }, 10000);
      }, 5000);
      
    } catch (error: any) {
      console.error('Scan error:', error);
      playSound('error');
      setScanError(error.message || 'Scan failed');
      
      resultTimeoutRef.current = setTimeout(() => {
        setScannerState('scanning');
        setScanError(null);
        
        postScanTimeoutRef.current = setTimeout(() => {
          setScannerState('standby');
        }, 10000);
      }, 4000);
    }
  };

  const presentCount = todayAttendance.filter(a => a.status === 'Present' || a.status === 'Late').length;
  const lateCount = todayAttendance.filter(a => a.status === 'Late').length;
  const isWorkDay = currentTime.getDay() >= 1 && currentTime.getDay() <= 5;
  const workHours = "8:00 AM - 7:00 PM";

  return (
    <div 
      className={cn(
        "min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/5 transition-all",
        kioskMode && "bg-black"
      )}
      onMouseMove={handleMouseMove}
      onTouchStart={handleMouseMove}
    >
      {/* Header - auto-hide in kiosk mode */}
      <header 
        className={cn(
          "bg-card border-b border-border transition-all duration-300",
          kioskMode && "fixed top-0 left-0 right-0 z-50",
          kioskMode && !showHeader && "-translate-y-full opacity-0"
        )}
      >
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {!kioskMode && (
                <Link to="/">
                  <Button variant="ghost" size="icon">
                    <ArrowLeft className="w-5 h-5" />
                  </Button>
                </Link>
              )}
              <div>
                <h1 className="text-xl font-bold text-foreground">QR Attendance Scanner</h1>
                <p className="text-sm text-muted-foreground">{format(currentTime, 'EEEE, dd MMMM yyyy')}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="font-mono text-lg">{format(currentTime, 'HH:mm:ss')}</span>
                </div>
                <p className="text-xs text-muted-foreground hidden sm:block">Work hours: {workHours}</p>
              </div>
              <Button 
                variant="outline" 
                size="icon"
                onClick={toggleKioskMode}
                title={kioskMode ? "Exit Kiosk Mode" : "Enter Kiosk Mode"}
              >
                {kioskMode ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className={cn(
        "max-w-6xl mx-auto px-4 py-6",
        kioskMode && "max-w-none h-screen flex flex-col p-0"
      )}>
        <div className={cn(
          "grid grid-cols-1 lg:grid-cols-3 gap-6",
          kioskMode && "flex-1 flex flex-col lg:grid-cols-1"
        )}>
          {/* Main Scanner Section - Full Width */}
          <div className={cn(
            "lg:col-span-2 space-y-4",
            kioskMode && "flex-1 flex flex-col space-y-0"
          )}>
            {/* Mode Toggle */}
            <div className={cn(
              "flex gap-2 p-1 bg-secondary rounded-xl",
              kioskMode && "rounded-none"
            )}>
              <button
                onClick={() => setScanMode('check-in')}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-4 px-4 rounded-lg font-medium transition-all text-lg",
                  scanMode === 'check-in'
                    ? "bg-primary text-primary-foreground shadow-lg"
                    : "text-muted-foreground hover:text-foreground",
                  kioskMode && "py-6 text-xl"
                )}
              >
                <LogIn className={cn("w-6 h-6", kioskMode && "w-8 h-8")} />
                Check In
              </button>
              <button
                onClick={() => setScanMode('check-out')}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-4 px-4 rounded-lg font-medium transition-all text-lg",
                  scanMode === 'check-out'
                    ? "bg-accent text-accent-foreground shadow-lg"
                    : "text-muted-foreground hover:text-foreground",
                  kioskMode && "py-6 text-xl"
                )}
              >
                <LogOut className={cn("w-6 h-6", kioskMode && "w-8 h-8")} />
                Check Out
              </button>
            </div>

            {/* QR Scanner Card - Large */}
            <Card className={cn(
              "overflow-hidden",
              kioskMode && "flex-1 rounded-none border-0"
            )}>
              <CardContent className="p-0 h-full">
                <div className={cn(
                  "relative aspect-[4/3] md:aspect-video bg-gradient-to-br from-secondary to-muted min-h-[400px]",
                  kioskMode && "aspect-auto h-full min-h-0"
                )}>
                  {scannerState === 'scanning' && !scannedEmployee && (
                    <>
                      <Scanner
                        onScan={(result) => {
                          if (result && result[0]?.rawValue) {
                            handleScan(result[0].rawValue);
                          }
                        }}
                        constraints={{
                          facingMode: 'user'
                        }}
                        styles={{
                          container: { width: '100%', height: '100%' },
                          video: { width: '100%', height: '100%', objectFit: 'cover' }
                        }}
                      />
                      {/* Scan Frame Overlay */}
                      <div className="absolute inset-0 pointer-events-none">
                        <div className="absolute inset-12 md:inset-16 border-2 border-white/30 rounded-3xl">
                          <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-primary rounded-tl-2xl" />
                          <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-primary rounded-tr-2xl" />
                          <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-primary rounded-bl-2xl" />
                          <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-primary rounded-br-2xl" />
                        </div>
                        <div className="absolute inset-x-0 top-1/2 h-0.5 bg-primary/50 animate-pulse" />
                        <div className="absolute top-4 left-4 bg-black/60 px-3 py-1 rounded-full text-white text-sm flex items-center gap-2">
                          <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                          Scanning...
                        </div>
                      </div>
                    </>
                  )}

                  {scannerState === 'standby' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-6">
                      <div className="text-center">
                        <div className="w-32 h-32 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
                          <Camera className="w-16 h-16 text-primary" />
                        </div>
                        <h3 className="text-2xl font-semibold text-foreground mb-2">
                          Ready to Scan
                        </h3>
                        <p className="text-muted-foreground mb-6">
                          Tap the button below to activate camera
                        </p>
                        <Button 
                          onClick={startScanning}
                          size="lg"
                          className="gap-2 text-lg px-8 py-6"
                        >
                          <QrCode className="w-6 h-6" />
                          Start Scanning
                        </Button>
                        <p className="text-xs text-muted-foreground mt-4">
                          Camera will auto-standby after 10 seconds of inactivity
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Error State */}
                  {scannerState === 'result' && scanError && !scannedEmployee && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-card">
                      <div className="text-center animate-scale-in">
                        <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-destructive/10 flex items-center justify-center">
                          <AlertTriangle className="w-12 h-12 text-destructive" />
                        </div>
                        <h3 className="text-2xl font-bold text-destructive mb-2">
                          Scan Failed
                        </h3>
                        <p className="text-muted-foreground mb-4 max-w-xs">
                          {scanError}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Returning to scanner...
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Success Result */}
                  {scannerState === 'result' && scannedEmployee && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-card">
                      <div className="text-center animate-scale-in">
                        <Avatar className="w-32 h-32 mx-auto mb-4 ring-4 ring-primary/20">
                          <AvatarImage src={scannedEmployee.photo || undefined} />
                          <AvatarFallback className="bg-primary/10 text-primary text-3xl">
                            {scannedEmployee.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>

                        <div className={cn(
                          "w-14 h-14 mx-auto -mt-8 mb-2 rounded-full flex items-center justify-center",
                          scannedEmployee.isLate 
                            ? "bg-amber-500 text-white" 
                            : "bg-primary text-primary-foreground"
                        )}>
                          {scannedEmployee.isLate ? (
                            <AlertTriangle className="w-7 h-7" />
                          ) : (
                            <CheckCircle className="w-7 h-7" />
                          )}
                        </div>

                        <h3 className="text-2xl font-bold text-foreground mb-1">
                          {scannedEmployee.name}
                        </h3>
                        
                        {(scannedEmployee.jobPosition || scannedEmployee.department) && (
                          <p className="text-muted-foreground mb-3">
                            {scannedEmployee.jobPosition}
                            {scannedEmployee.jobPosition && scannedEmployee.department && ' • '}
                            {scannedEmployee.department}
                          </p>
                        )}

                        <div className={cn(
                          "inline-flex items-center gap-2 px-6 py-3 rounded-full text-lg font-medium mb-3",
                          scannedEmployee.mode === 'check-in'
                            ? scannedEmployee.isLate 
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                              : "bg-primary/10 text-primary"
                            : "bg-accent/10 text-accent-foreground"
                        )}>
                          {scannedEmployee.mode === 'check-in' ? (
                            <>
                              <LogIn className="w-5 h-5" />
                              Checked In {scannedEmployee.isLate && '(Late)'}
                            </>
                          ) : (
                            <>
                              <LogOut className="w-5 h-5" />
                              Checked Out
                            </>
                          )}
                        </div>

                        <div className="flex items-center justify-center gap-6 text-lg">
                          {scannedEmployee.checkInTime && (
                            <span className="flex items-center gap-2 text-muted-foreground">
                              <LogIn className="w-5 h-5" />
                              In: {scannedEmployee.checkInTime}
                            </span>
                          )}
                          {scannedEmployee.checkOutTime && (
                            <span className="flex items-center gap-2 text-muted-foreground">
                              <LogOut className="w-5 h-5" />
                              Out: {scannedEmployee.checkOutTime}
                            </span>
                          )}
                        </div>

                        {scannedEmployee.isLate && scannedEmployee.mode === 'check-in' && (
                          <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                            <p className="text-amber-800 dark:text-amber-400">
                              <AlertTriangle className="w-5 h-5 inline mr-1" />
                              Late arrival - HR has been notified
                            </p>
                          </div>
                        )}
                        
                        <p className="text-sm text-muted-foreground mt-4">
                          Ready for next scan in 5 seconds...
                        </p>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="p-4 text-center bg-card border-t border-border">
                  <div className="flex items-center justify-center gap-2 text-muted-foreground">
                    <QrCode className="w-5 h-5" />
                    {scannerState === 'scanning' && !scannedEmployee && "Position QR code in frame"}
                    {scannerState === 'standby' && `Ready for ${scanMode === 'check-in' ? 'check-in' : 'check-out'}`}
                    {scannerState === 'result' && "Processing complete"}
                  </div>
                  {!isWorkDay && (
                    <p className="text-sm text-amber-600 dark:text-amber-400 mt-2">
                      Note: Today is not a regular work day (Mon-Fri)
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Stats & Recent Activity Sidebar - Hidden in kiosk mode */}
          {!kioskMode && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-1 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <Users className="w-8 h-8 mx-auto mb-2 text-primary" />
                  <p className="text-3xl font-bold text-foreground">{presentCount}</p>
                  <p className="text-xs text-muted-foreground">Present Today</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <Clock className="w-8 h-8 mx-auto mb-2 text-amber-500" />
                  <p className="text-3xl font-bold text-foreground">{lateCount}</p>
                  <p className="text-xs text-muted-foreground">Late Arrivals</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Recent Activity</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => refetch()}>
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {todayAttendance.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">No attendance records today</p>
                ) : (
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {todayAttendance.slice(0, 15).map((record) => (
                      <div 
                        key={record.id} 
                        className="flex items-center justify-between p-2 rounded-lg bg-secondary/30"
                      >
                        <div className="flex items-center gap-2">
                          <Avatar className="w-7 h-7">
                            <AvatarImage src={(record.employees as any)?.photo_url || undefined} />
                            <AvatarFallback className="text-xs">
                              <User className="w-3 h-3" />
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <span className="font-medium text-xs block truncate max-w-[100px]">
                              {record.employees?.full_name || 'Unknown'}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          {record.check_in && (
                            <span>{record.check_in}</span>
                          )}
                          <span className={cn(
                            "px-1.5 py-0.5 rounded-full text-[10px]",
                            record.status === 'Present' && "bg-primary/20 text-primary",
                            record.status === 'Late' && "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                          )}>
                            {record.status === 'Present' ? 'P' : 'L'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          )}
        </div>
      </main>
    </div>
  );
}
