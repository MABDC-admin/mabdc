import { useState, useEffect } from 'react';
import { useAttendance, useTodayAttendance, useRealtimeAttendance, useCheckInByHRMS, useCheckOutByHRMS } from '@/hooks/useAttendance';
import { useEmployees } from '@/hooks/useEmployees';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Clock, LogIn, LogOut, RefreshCw, QrCode, Users, AlertTriangle, CheckCircle, X, Scan } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { QRCodeSVG } from 'qrcode.react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function AttendanceView() {
  const { data: allAttendance = [], isLoading, refetch } = useAttendance();
  const { data: todayAttendance = [] } = useTodayAttendance();
  const { data: employees = [] } = useEmployees();
  const checkIn = useCheckInByHRMS();
  const checkOut = useCheckOutByHRMS();
  
  // Enable realtime updates
  useRealtimeAttendance();

  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isQRCodeOpen, setIsQRCodeOpen] = useState(false);
  const [scanMode, setScanMode] = useState<'check-in' | 'check-out'>('check-in');
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [manualHRMS, setManualHRMS] = useState('');

  const handleScan = (result: string) => {
    if (result) {
      setIsScannerOpen(false);
      if (scanMode === 'check-in') {
        checkIn.mutate(result);
      } else {
        checkOut.mutate(result);
      }
    }
  };

  const handleManualEntry = () => {
    if (manualHRMS.trim()) {
      if (scanMode === 'check-in') {
        checkIn.mutate(manualHRMS.trim());
      } else {
        checkOut.mutate(manualHRMS.trim());
      }
      setManualHRMS('');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Present': return 'bg-primary/10 text-primary border-primary/30';
      case 'Late': return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'Absent': return 'bg-destructive/10 text-destructive border-destructive/30';
      default: return 'bg-accent/10 text-accent border-accent/30';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Present': return <CheckCircle className="w-4 h-4 text-primary" />;
      case 'Late': return <AlertTriangle className="w-4 h-4 text-amber-400" />;
      case 'Absent': return <X className="w-4 h-4 text-destructive" />;
      default: return <Clock className="w-4 h-4 text-accent" />;
    }
  };

  // Stats
  const presentCount = todayAttendance.filter(a => a.status === 'Present').length;
  const lateCount = todayAttendance.filter(a => a.status === 'Late').length;
  const checkedOutCount = todayAttendance.filter(a => a.check_out).length;

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card rounded-2xl border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Total Staff</p>
              <p className="text-2xl font-bold text-foreground">{employees.length}</p>
            </div>
          </div>
        </div>
        <div className="stat-card rounded-2xl border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Present</p>
              <p className="text-2xl font-bold text-primary">{presentCount}</p>
            </div>
          </div>
        </div>
        <div className="stat-card rounded-2xl border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Late</p>
              <p className="text-2xl font-bold text-amber-400">{lateCount}</p>
            </div>
          </div>
        </div>
        <div className="stat-card rounded-2xl border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
              <LogOut className="w-5 h-5 text-accent" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Checked Out</p>
              <p className="text-2xl font-bold text-accent">{checkedOutCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* QR Actions */}
      <section className="glass-card rounded-3xl border border-border p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">QR Code Attendance</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl bg-secondary/30 border border-border">
            <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
              <Scan className="w-4 h-4 text-primary" />
              Scan Employee QR
            </h3>
            <div className="flex gap-2">
              <Button 
                onClick={() => { setScanMode('check-in'); setIsScannerOpen(true); }}
                className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
                disabled={checkIn.isPending}
              >
                <LogIn className="w-4 h-4 mr-2" />
                Check In
              </Button>
              <Button 
                onClick={() => { setScanMode('check-out'); setIsScannerOpen(true); }}
                variant="outline"
                className="flex-1 border-accent text-accent hover:bg-accent/10"
                disabled={checkOut.isPending}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Check Out
              </Button>
            </div>
          </div>
          
          <div className="p-4 rounded-2xl bg-secondary/30 border border-border">
            <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
              <QrCode className="w-4 h-4 text-primary" />
              Manual Entry / Generate QR
            </h3>
            <div className="flex gap-2">
              <Input
                value={manualHRMS}
                onChange={(e) => setManualHRMS(e.target.value)}
                placeholder="Enter HRMS No..."
                className="bg-secondary/50 border-border"
                onKeyDown={(e) => e.key === 'Enter' && handleManualEntry()}
              />
              <Button onClick={handleManualEntry} disabled={!manualHRMS.trim()}>
                {scanMode === 'check-in' ? 'In' : 'Out'}
              </Button>
              <Button variant="outline" onClick={() => setIsQRCodeOpen(true)}>
                <QrCode className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Today's Attendance - Realtime */}
      <section className="glass-card rounded-3xl border border-border p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
              Today's Attendance
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              {new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="border-border">
            <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
          </Button>
        </div>

        <div className="space-y-3">
          {todayAttendance.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No attendance records for today</p>
              <p className="text-xs mt-1">Scan QR codes to start tracking attendance</p>
            </div>
          ) : (
            todayAttendance.map((record) => (
              <div key={record.id} className="glass-card rounded-2xl border border-border p-4 animate-fade-in">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl avatar-gradient flex items-center justify-center text-sm font-bold text-primary-foreground">
                      {record.employees?.full_name?.split(' ').map(n => n[0]).join('').substring(0, 2) || '??'}
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-foreground">{record.employees?.full_name || 'Unknown'}</h3>
                      <p className="text-xs text-muted-foreground">{record.employees?.hrms_no}</p>
                      <div className="flex items-center gap-4 mt-1">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <LogIn className="w-3 h-3" /> {record.check_in || '--:--'}
                        </span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <LogOut className="w-3 h-3" /> {record.check_out || '--:--'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn("text-xs px-3 py-1.5 rounded-full border flex items-center gap-1", getStatusColor(record.status))}>
                      {getStatusIcon(record.status)}
                      {record.status}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* All Records */}
      <section className="glass-card rounded-3xl border border-border p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Recent Attendance History</h2>
        <div className="space-y-2 max-h-96 overflow-y-auto soft-scroll">
          {allAttendance.slice(0, 20).map((record) => (
            <div key={record.id} className="flex items-center justify-between p-3 rounded-xl bg-secondary/30 border border-border">
              <div className="flex items-center gap-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{record.employees?.full_name || 'Unknown'}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(record.date).toLocaleDateString('en-GB')} • {record.check_in || '--:--'} - {record.check_out || '--:--'}
                  </p>
                </div>
              </div>
              <span className={cn("text-xs px-2 py-1 rounded-full border", getStatusColor(record.status))}>
                {record.status}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* QR Scanner Modal */}
      <Dialog open={isScannerOpen} onOpenChange={setIsScannerOpen}>
        <DialogContent className="glass-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Scan className="w-5 h-5 text-primary" />
              Scan Employee QR - {scanMode === 'check-in' ? 'Check In' : 'Check Out'}
            </DialogTitle>
          </DialogHeader>
          <div className="aspect-square rounded-xl overflow-hidden bg-black">
            <Scanner
              onScan={(result) => {
                if (result && result[0]) {
                  handleScan(result[0].rawValue);
                }
              }}
              styles={{
                container: { width: '100%', height: '100%' }
              }}
            />
          </div>
          <p className="text-xs text-center text-muted-foreground">
            Position the employee's QR code within the frame
          </p>
        </DialogContent>
      </Dialog>

      {/* QR Code Generator Modal */}
      <Dialog open={isQRCodeOpen} onOpenChange={setIsQRCodeOpen}>
        <DialogContent className="glass-card border-border max-w-lg">
          <DialogHeader>
            <DialogTitle>Employee QR Codes</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="generate" className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="generate" className="flex-1">Generate QR</TabsTrigger>
              <TabsTrigger value="all" className="flex-1">All Employees</TabsTrigger>
            </TabsList>
            <TabsContent value="generate" className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Select Employee</label>
                <select 
                  value={selectedEmployee}
                  onChange={(e) => setSelectedEmployee(e.target.value)}
                  className="w-full p-2 rounded-lg bg-secondary/50 border border-border text-foreground"
                >
                  <option value="">Choose an employee...</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.hrms_no}>{emp.full_name} ({emp.hrms_no})</option>
                  ))}
                </select>
              </div>
              {selectedEmployee && (
                <div className="flex flex-col items-center p-6 rounded-xl bg-white">
                  <QRCodeSVG 
                    value={selectedEmployee} 
                    size={200}
                    level="H"
                    includeMargin
                  />
                  <p className="text-black font-bold mt-2">{selectedEmployee}</p>
                </div>
              )}
            </TabsContent>
            <TabsContent value="all" className="space-y-4 max-h-96 overflow-y-auto soft-scroll">
              <div className="grid grid-cols-2 gap-4">
                {employees.map((emp) => (
                  <div key={emp.id} className="flex flex-col items-center p-4 rounded-xl bg-white">
                    <QRCodeSVG value={emp.hrms_no} size={100} level="H" />
                    <p className="text-black text-xs font-bold mt-2 text-center">{emp.full_name}</p>
                    <p className="text-gray-600 text-[10px]">{emp.hrms_no}</p>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}
