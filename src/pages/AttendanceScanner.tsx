import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Scanner } from '@yudiel/react-qr-scanner';
import { useCheckInByHRMS, useCheckOutByHRMS, useTodayAttendance, useCheckInById, useCheckOutById } from '@/hooks/useAttendance';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  QrCode, CheckCircle, Clock, Users, ArrowLeft, 
  LogIn, LogOut, RefreshCw, Camera, AlertTriangle, User, ScanFace, UserPlus
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { FaceRecognitionScanner } from '@/components/FaceRecognitionScanner';
import { FaceEnrollmentModal } from '@/components/FaceEnrollmentModal';
import { toast } from 'sonner';

type ScanMode = 'check-in' | 'check-out';
type ScannerState = 'standby' | 'scanning' | 'result';
type ScanMethod = 'qr' | 'face';

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
}

export default function AttendanceScanner() {
  const [scanMode, setScanMode] = useState<ScanMode>('check-in');
  const [scanMethod, setScanMethod] = useState<ScanMethod>('qr');
  const [scannerState, setScannerState] = useState<ScannerState>('standby');
  const [scannedEmployee, setScannedEmployee] = useState<ScannedEmployee | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [enrollModalOpen, setEnrollModalOpen] = useState(false);
  const [faceProcessing, setFaceProcessing] = useState(false);
  const scanTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const checkIn = useCheckInByHRMS();
  const checkOut = useCheckOutByHRMS();
  const checkInById = useCheckInById();
  const checkOutById = useCheckOutById();
  const { data: todayAttendance = [], refetch } = useTodayAttendance();

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

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
      }
    };
  }, []);

  const startScanning = useCallback(() => {
    setScannerState('scanning');
    setScannedEmployee(null);
    setScanError(null);
    
    // Auto-standby after 10 seconds
    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current);
    }
    scanTimeoutRef.current = setTimeout(() => {
      setScannerState('standby');
    }, 10000);
  }, []);

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
      // Calculate minutes late (work starts at 8:00 AM)
      const [hours, minutes] = employeeData.checkInTime.split(':').map(Number);
      const checkInMinutes = hours * 60 + minutes;
      const scheduledMinutes = 8 * 60; // 8:00 AM
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
      console.log('Late notification sent successfully');
    } catch (error) {
      console.error('Failed to send late notification:', error);
    }
  };

  const handleScan = async (result: string) => {
    if (!result || scannerState !== 'scanning') return;
    
    // Clear the timeout
    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current);
    }
    
    setScannerState('result');
    
    try {
      if (scanMode === 'check-in') {
        const data = await checkIn.mutateAsync(result);
        setScannedEmployee({
          name: data.employeeName,
          photo: data.employeePhoto,
          department: data.department,
          jobPosition: data.jobPosition,
          status: data.status,
          isLate: data.status === 'Late',
          checkInTime: data.checkInTime,
          mode: 'check-in',
        });

        // Send late notification if employee is late
        if (data.status === 'Late') {
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
        });
      }
    } catch (error: any) {
      console.error('Scan error:', error);
      setScanError(error.message || 'Scan failed');
      // Return to standby after showing error for 4 seconds
      setTimeout(() => {
        setScannerState('standby');
        setScanError(null);
      }, 4000);
      return;
    }
    
    // Return to standby after showing result for 5 seconds
    setTimeout(() => {
      setScannerState('standby');
      setScannedEmployee(null);
    }, 5000);
  };

  // Handle face recognition
  const handleFaceRecognized = async (employeeId: string, employeeName: string, hrmsNo: string) => {
    setFaceProcessing(true);
    
    try {
      if (scanMode === 'check-in') {
        const data = await checkInById.mutateAsync(employeeId);
        setScannedEmployee({
          name: data.employeeName,
          photo: data.employeePhoto,
          department: data.department,
          jobPosition: data.jobPosition,
          status: data.status,
          isLate: data.status === 'Late',
          checkInTime: data.checkInTime,
          mode: 'check-in',
        });

        // Send late notification if employee is late
        if (data.status === 'Late') {
          sendLateNotification({
            employeeName: data.employeeName,
            employeeId: data.employeeId,
            hrmsNo: data.hrmsNo || hrmsNo,
            department: data.department || '',
            jobPosition: data.jobPosition || '',
            checkInTime: data.checkInTime,
            photoUrl: data.employeePhoto,
          });
        }
      } else {
        const data = await checkOutById.mutateAsync(employeeId);
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
        });
      }
      
      setScannerState('result');
      
      // Return to normal after showing result
      setTimeout(() => {
        setScannerState('standby');
        setScannedEmployee(null);
      }, 5000);
    } catch (error: any) {
      console.error('Face recognition attendance error:', error);
      toast.error(error.message || 'Attendance failed');
    } finally {
      setFaceProcessing(false);
    }
  };

  const presentCount = todayAttendance.filter(a => a.status === 'Present' || a.status === 'Late').length;
  const lateCount = todayAttendance.filter(a => a.status === 'Late').length;

  // Check if current day is a work day (Monday to Friday)
  const isWorkDay = currentTime.getDay() >= 1 && currentTime.getDay() <= 5;
  const workHours = "8:00 AM - 7:00 PM";

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/5">
      {/* Face Enrollment Modal */}
      <FaceEnrollmentModal 
        isOpen={enrollModalOpen} 
        onClose={() => setEnrollModalOpen(false)} 
      />
      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link to="/">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-bold text-foreground">Attendance Scanner</h1>
                <p className="text-sm text-muted-foreground">{format(currentTime, 'EEEE, dd MMMM yyyy')}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setEnrollModalOpen(true)}
                className="gap-2"
              >
                <UserPlus className="w-4 h-4" />
                <span className="hidden sm:inline">Enroll Face</span>
              </Button>
              <div className="text-right">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="font-mono text-lg">{format(currentTime, 'HH:mm:ss')}</span>
                </div>
                <p className="text-xs text-muted-foreground hidden sm:block">Work hours: {workHours}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Scanner Section */}
          <div className="space-y-4">
            {/* Mode Toggle */}
            <div className="flex gap-2 p-1 bg-secondary rounded-xl">
              <button
                onClick={() => setScanMode('check-in')}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-all",
                  scanMode === 'check-in'
                    ? "bg-primary text-primary-foreground shadow-lg"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <LogIn className="w-5 h-5" />
                Check In
              </button>
              <button
                onClick={() => setScanMode('check-out')}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-all",
                  scanMode === 'check-out'
                    ? "bg-accent text-accent-foreground shadow-lg"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <LogOut className="w-5 h-5" />
                Check Out
              </button>
            </div>

            {/* Scan Method Tabs */}
            <Tabs value={scanMethod} onValueChange={(v) => setScanMethod(v as ScanMethod)} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="qr" className="gap-2">
                  <QrCode className="w-4 h-4" />
                  QR Code
                </TabsTrigger>
                <TabsTrigger value="face" className="gap-2">
                  <ScanFace className="w-4 h-4" />
                  Face ID
                </TabsTrigger>
              </TabsList>

              <TabsContent value="qr" className="mt-4">
                {/* QR Scanner Card */}
                <Card className="overflow-hidden">
                  <CardContent className="p-0">
                    <div className="relative aspect-square bg-gradient-to-br from-secondary to-muted">
                      {scannerState === 'scanning' && scanMethod === 'qr' && (
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
                            <div className="absolute inset-8 border-2 border-white/30 rounded-3xl">
                              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-2xl" />
                              <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-2xl" />
                              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-2xl" />
                              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-2xl" />
                            </div>
                            <div className="absolute inset-x-0 top-1/2 h-0.5 bg-primary/50 animate-pulse" />
                            {/* Timer indicator */}
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
                            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
                              <Camera className="w-12 h-12 text-primary" />
                            </div>
                            <h3 className="text-lg font-semibold text-foreground mb-2">
                              Ready to Scan
                            </h3>
                            <p className="text-sm text-muted-foreground mb-6">
                              Tap the button below to activate camera
                            </p>
                            <Button 
                              onClick={startScanning}
                              size="lg"
                              className="gap-2"
                            >
                              <QrCode className="w-5 h-5" />
                              Start Scanning
                            </Button>
                            <p className="text-xs text-muted-foreground mt-4">
                              Camera will auto-standby after 10 seconds
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Error State */}
                      {scannerState === 'result' && scanError && !scannedEmployee && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-card">
                          <div className="text-center animate-scale-in">
                            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-destructive/10 flex items-center justify-center">
                              <AlertTriangle className="w-10 h-10 text-destructive" />
                            </div>
                            <h3 className="text-lg font-bold text-destructive mb-2">
                              Scan Failed
                            </h3>
                            <p className="text-sm text-muted-foreground mb-4 max-w-xs">
                              {scanError}
                            </p>
                            <Button 
                              variant="outline"
                              onClick={() => {
                                setScannerState('standby');
                                setScanError(null);
                              }}
                            >
                              Try Again
                            </Button>
                          </div>
                        </div>
                      )}

                      {scannerState === 'result' && scannedEmployee && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-card">
                          <div className="text-center animate-scale-in">
                            {/* Employee Photo */}
                            <Avatar className="w-28 h-28 mx-auto mb-4 ring-4 ring-primary/20">
                              <AvatarImage src={scannedEmployee.photo || undefined} />
                              <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                                {scannedEmployee.name.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>

                            {/* Status Icon */}
                            <div className={cn(
                              "w-12 h-12 mx-auto -mt-6 mb-2 rounded-full flex items-center justify-center",
                              scannedEmployee.isLate 
                                ? "bg-amber-500 text-white" 
                                : "bg-primary text-primary-foreground"
                            )}>
                              {scannedEmployee.isLate ? (
                                <AlertTriangle className="w-6 h-6" />
                              ) : (
                                <CheckCircle className="w-6 h-6" />
                              )}
                            </div>

                            {/* Employee Name */}
                            <h3 className="text-xl font-bold text-foreground mb-1">
                              {scannedEmployee.name}
                            </h3>
                            
                            {/* Position & Department */}
                            {(scannedEmployee.jobPosition || scannedEmployee.department) && (
                              <p className="text-sm text-muted-foreground mb-3">
                                {scannedEmployee.jobPosition}
                                {scannedEmployee.jobPosition && scannedEmployee.department && ' • '}
                                {scannedEmployee.department}
                              </p>
                            )}

                            {/* Check-in/out Status */}
                            <div className={cn(
                              "inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-3",
                              scannedEmployee.mode === 'check-in'
                                ? scannedEmployee.isLate 
                                  ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                                  : "bg-primary/10 text-primary"
                                : "bg-accent/10 text-accent-foreground"
                            )}>
                              {scannedEmployee.mode === 'check-in' ? (
                                <>
                                  <LogIn className="w-4 h-4" />
                                  Checked In {scannedEmployee.isLate && '(Late)'}
                                </>
                              ) : (
                                <>
                                  <LogOut className="w-4 h-4" />
                                  Checked Out
                                </>
                              )}
                            </div>

                            {/* Time Details */}
                            <div className="flex items-center justify-center gap-4 text-sm">
                              {scannedEmployee.checkInTime && (
                                <span className="flex items-center gap-1 text-muted-foreground">
                                  <LogIn className="w-4 h-4" />
                                  In: {scannedEmployee.checkInTime}
                                </span>
                              )}
                              {scannedEmployee.checkOutTime && (
                                <span className="flex items-center gap-1 text-muted-foreground">
                                  <LogOut className="w-4 h-4" />
                                  Out: {scannedEmployee.checkOutTime}
                                </span>
                              )}
                            </div>

                            {/* Late Warning */}
                            {scannedEmployee.isLate && scannedEmployee.mode === 'check-in' && (
                              <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                                <p className="text-sm text-amber-800 dark:text-amber-400">
                                  <AlertTriangle className="w-4 h-4 inline mr-1" />
                                  Late arrival - HR has been notified
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="p-4 text-center bg-card border-t border-border">
                      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                        <QrCode className="w-4 h-4" />
                        {scannerState === 'scanning' && "Position QR code in frame"}
                        {scannerState === 'standby' && `Ready for ${scanMode === 'check-in' ? 'check-in' : 'check-out'}`}
                        {scannerState === 'result' && "Processing complete"}
                      </div>
                      {!isWorkDay && (
                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                          Note: Today is not a regular work day (Mon-Fri)
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="face" className="mt-4">
                <FaceRecognitionScanner
                  onRecognized={handleFaceRecognized}
                  isProcessing={faceProcessing}
                />
              </TabsContent>
            </Tabs>
          </div>

          {/* Stats & Recent Activity */}
          <div className="space-y-4">
            {/* Today's Stats */}
            <div className="grid grid-cols-2 gap-4">
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

            {/* Recent Activity */}
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
                    {todayAttendance.slice(0, 20).map((record) => (
                      <div 
                        key={record.id} 
                        className="flex items-center justify-between p-3 rounded-lg bg-secondary/30"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={(record.employees as any)?.photo_url || undefined} />
                            <AvatarFallback className="text-xs">
                              <User className="w-4 h-4" />
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <span className="font-medium text-sm block">
                              {record.employees?.full_name || 'Unknown'}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {record.employees?.hrms_no}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          {record.check_in && (
                            <span className="flex items-center gap-1">
                              <LogIn className="w-3 h-3" />
                              {record.check_in}
                            </span>
                          )}
                          {record.check_out && (
                            <span className="flex items-center gap-1">
                              <LogOut className="w-3 h-3" />
                              {record.check_out}
                            </span>
                          )}
                          <span className={cn(
                            "px-2 py-0.5 rounded-full",
                            record.status === 'Present' && "bg-primary/20 text-primary",
                            record.status === 'Late' && "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                          )}>
                            {record.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}