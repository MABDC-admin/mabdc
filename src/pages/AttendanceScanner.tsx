import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Scanner } from '@yudiel/react-qr-scanner';
import { useCheckInByHRMS, useCheckOutByHRMS, useTodayAttendance } from '@/hooks/useAttendance';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  QrCode, CheckCircle, XCircle, Clock, Users, ArrowLeft, 
  LogIn, LogOut, RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

type ScanMode = 'check-in' | 'check-out';

export default function AttendanceScanner() {
  const [scanMode, setScanMode] = useState<ScanMode>('check-in');
  const [lastScanned, setLastScanned] = useState<{ name: string; status: string; time: string } | null>(null);
  const [isScanning, setIsScanning] = useState(true);
  
  const checkIn = useCheckInByHRMS();
  const checkOut = useCheckOutByHRMS();
  const { data: todayAttendance = [], refetch } = useTodayAttendance();

  // Auto-refresh attendance every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => refetch(), 30000);
    return () => clearInterval(interval);
  }, [refetch]);

  const handleScan = async (result: string) => {
    if (!result || !isScanning) return;
    
    // Prevent rapid scanning
    setIsScanning(false);
    
    try {
      if (scanMode === 'check-in') {
        await checkIn.mutateAsync(result);
        setLastScanned({
          name: result,
          status: 'Checked In',
          time: format(new Date(), 'HH:mm:ss'),
        });
      } else {
        await checkOut.mutateAsync(result);
        setLastScanned({
          name: result,
          status: 'Checked Out',
          time: format(new Date(), 'HH:mm:ss'),
        });
      }
    } catch (error) {
      console.error('Scan error:', error);
    }
    
    // Re-enable scanning after 3 seconds
    setTimeout(() => {
      setIsScanning(true);
      setLastScanned(null);
    }, 3000);
  };

  const presentCount = todayAttendance.filter(a => a.status === 'Present' || a.status === 'Late').length;
  const lateCount = todayAttendance.filter(a => a.status === 'Late').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/5">
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
                <p className="text-sm text-muted-foreground">{format(new Date(), 'EEEE, dd MMMM yyyy')}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="font-mono text-lg">{format(new Date(), 'HH:mm')}</span>
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

            {/* QR Scanner */}
            <Card className="overflow-hidden">
              <CardContent className="p-0">
                <div className="relative aspect-square bg-black">
                  {isScanning ? (
                    <Scanner
                      onScan={(result) => {
                        if (result && result[0]?.rawValue) {
                          handleScan(result[0].rawValue);
                        }
                      }}
                      styles={{
                        container: { width: '100%', height: '100%' },
                        video: { width: '100%', height: '100%', objectFit: 'cover' }
                      }}
                    />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80">
                      {lastScanned ? (
                        <div className="text-center animate-scale-in">
                          <CheckCircle className={cn(
                            "w-20 h-20 mx-auto mb-4",
                            scanMode === 'check-in' ? "text-primary" : "text-accent"
                          )} />
                          <p className="text-2xl font-bold text-white mb-1">{lastScanned.status}</p>
                          <p className="text-lg text-white/80">HRMS: {lastScanned.name}</p>
                          <p className="text-sm text-white/60 mt-2">{lastScanned.time}</p>
                        </div>
                      ) : (
                        <div className="text-center">
                          <RefreshCw className="w-12 h-12 animate-spin text-white/50 mx-auto" />
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Scan Frame Overlay */}
                  {isScanning && (
                    <div className="absolute inset-0 pointer-events-none">
                      <div className="absolute inset-8 border-2 border-white/30 rounded-3xl">
                        <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-2xl" />
                        <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-2xl" />
                        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-2xl" />
                        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-2xl" />
                      </div>
                      <div className="absolute inset-x-0 top-1/2 h-0.5 bg-primary/50 animate-pulse" />
                    </div>
                  )}
                </div>
                
                <div className="p-4 text-center bg-card">
                  <QrCode className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    {isScanning 
                      ? `Scan employee QR code to ${scanMode === 'check-in' ? 'check in' : 'check out'}`
                      : 'Processing...'}
                  </p>
                </div>
              </CardContent>
            </Card>
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
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "w-2 h-2 rounded-full",
                            record.status === 'Present' && "bg-primary",
                            record.status === 'Late' && "bg-amber-500"
                          )} />
                          <span className="font-medium text-sm">
                            {record.employees?.full_name || 'Unknown'}
                          </span>
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
                            record.status === 'Late' && "bg-amber-500/20 text-amber-500"
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
