import { useState, useMemo } from 'react';
import { format, eachDayOfInterval, subDays, differenceInDays } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { useEmployees } from '@/hooks/useEmployees';
import { useAttendanceByDateRange, useUpdateAttendance } from '@/hooks/useAttendance';
import { useTimeShifts } from '@/hooks/useTimeShifts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { 
  Clock, 
  Search, 
  RefreshCw, 
  Download, 
  Edit2,
  CheckCircle,
  XCircle,
  ArrowDownLeft,
  ArrowUpRight,
  CalendarIcon,
  TrendingUp,
  Users,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

type TimeClockStatus = 'early_in' | 'late_entry' | 'early_out' | 'late_exit' | 'miss_punch_in' | 'miss_punch_out' | 'on_time' | 'no_record';

interface TimeClockRecord {
  employeeId: string;
  employeeName: string;
  hrmsNo: string;
  department: string;
  photoUrl?: string;
  shiftStart: string;
  shiftEnd: string;
  date: string;
  checkIn?: string;
  checkOut?: string;
  status: TimeClockStatus[];
  attendanceId?: string;
}

interface EmployeeSummary {
  employeeId: string;
  employeeName: string;
  hrmsNo: string;
  department: string;
  photoUrl?: string;
  totalDays: number;
  presentDays: number;
  earlyInCount: number;
  lateEntryCount: number;
  earlyOutCount: number;
  lateExitCount: number;
  missPunchInCount: number;
  missPunchOutCount: number;
  records: TimeClockRecord[];
}

const STATUS_LABELS: Record<TimeClockStatus, string> = {
  early_in: 'Early In',
  late_entry: 'Late Entry',
  early_out: 'Early Out',
  late_exit: 'Late Exit',
  miss_punch_in: 'Miss Punch In',
  miss_punch_out: 'Miss Punch Out',
  on_time: 'On Time',
  no_record: 'No Record'
};

const STATUS_COLORS: Record<TimeClockStatus, string> = {
  early_in: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  late_entry: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  early_out: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  late_exit: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  miss_punch_in: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  miss_punch_out: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  on_time: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  no_record: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
};

const SHIFT_TIMES = {
  morning: { start: '08:00', end: '17:00' },
  afternoon: { start: '10:00', end: '19:00' },
  default: { start: '08:00', end: '17:00' }
};

export default function TimeClockView() {
  const today = new Date();
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(today, 6),
    to: today
  });
  const [viewMode, setViewMode] = useState<'summary' | 'detailed'>('summary');
  
  const startDate = dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : '';
  const endDate = dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : startDate;
  const dayCount = dateRange?.from && dateRange?.to ? differenceInDays(dateRange.to, dateRange.from) + 1 : 1;
  
  const { data: employees = [], isLoading: loadingEmployees, refetch } = useEmployees();
  const { data: attendance = [], isLoading: loadingAttendance, refetch: refetchAttendance } = useAttendanceByDateRange(startDate, endDate);
  const { data: shifts = [] } = useTimeShifts();
  const updateAttendance = useUpdateAttendance();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [editDialog, setEditDialog] = useState<{ open: boolean; record: TimeClockRecord | null }>({ open: false, record: null });
  const [editCheckIn, setEditCheckIn] = useState('');
  const [editCheckOut, setEditCheckOut] = useState('');
  const [editStatus, setEditStatus] = useState<TimeClockStatus>('on_time');

  const shiftMap = useMemo(() => {
    const map = new Map<string, 'morning' | 'afternoon'>();
    shifts.forEach(s => map.set(s.employee_id, s.shift_type as 'morning' | 'afternoon'));
    return map;
  }, [shifts]);

  const attendanceMap = useMemo(() => {
    const map = new Map<string, Map<string, { id: string; checkIn?: string; checkOut?: string }>>();
    attendance.forEach(a => {
      if (!map.has(a.employee_id)) {
        map.set(a.employee_id, new Map());
      }
      map.get(a.employee_id)!.set(a.date, { 
        id: a.id, 
        checkIn: a.check_in || undefined, 
        checkOut: a.check_out || undefined 
      });
    });
    return map;
  }, [attendance]);

  const calculateStatus = (
    checkIn: string | undefined, 
    checkOut: string | undefined, 
    shiftStart: string, 
    shiftEnd: string,
    forDate: Date
  ): TimeClockStatus[] => {
    const statuses: TimeClockStatus[] = [];
    const dateStr = format(forDate, 'yyyy-MM-dd');
    const now = new Date();
    const isViewingToday = dateStr === format(now, 'yyyy-MM-dd');
    const isPastDate = forDate < new Date(format(now, 'yyyy-MM-dd'));

    const shiftStartTime = shiftStart;
    const shiftEndTime = shiftEnd;
    
    const [startHour, startMin] = shiftStartTime.split(':').map(Number);
    const earlyThreshold = `${String(Math.max(0, startHour - 1)).padStart(2, '0')}:${String(startMin).padStart(2, '0')}`;

    if (!checkIn && !checkOut) {
      if (isPastDate) {
        return ['no_record'];
      }
      if (isViewingToday && now > new Date(`${dateStr}T${shiftStartTime}:00`)) {
        statuses.push('miss_punch_in');
      }
      return statuses.length > 0 ? statuses : ['on_time'];
    }

    if (!checkIn) {
      if (isPastDate || (isViewingToday && now > new Date(`${dateStr}T${shiftStartTime}:00`))) {
        statuses.push('miss_punch_in');
      }
    } else {
      if (checkIn <= earlyThreshold) {
        statuses.push('early_in');
      } else if (checkIn > shiftStartTime) {
        statuses.push('late_entry');
      } else {
        statuses.push('on_time');
      }
    }

    if (checkIn && !checkOut) {
      if (isPastDate || (isViewingToday && now > new Date(`${dateStr}T${shiftEndTime}:00`))) {
        statuses.push('miss_punch_out');
      }
    } else if (checkOut) {
      if (checkOut < shiftEndTime) {
        statuses.push('early_out');
      } else if (checkOut > shiftEndTime) {
        statuses.push('late_exit');
      }
    }

    return statuses.length > 0 ? statuses : ['on_time'];
  };

  const employeeSummaries = useMemo<EmployeeSummary[]>(() => {
    if (!dateRange?.from || !dateRange?.to) return [];
    
    const daysInRange = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });
    
    return employees.map(emp => {
      const shiftType = shiftMap.get(emp.id) || 'default';
      const shiftTimes = SHIFT_TIMES[shiftType] || SHIFT_TIMES.default;
      const empAttendance = attendanceMap.get(emp.id) || new Map();
      
      const records: TimeClockRecord[] = [];
      let presentDays = 0;
      let earlyInCount = 0;
      let lateEntryCount = 0;
      let earlyOutCount = 0;
      let lateExitCount = 0;
      let missPunchInCount = 0;
      let missPunchOutCount = 0;

      daysInRange.forEach(day => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const att = empAttendance.get(dateStr);
        const statuses = calculateStatus(att?.checkIn, att?.checkOut, shiftTimes.start, shiftTimes.end, day);
        
        if (att?.checkIn || att?.checkOut) {
          presentDays++;
        }
        
        statuses.forEach(s => {
          if (s === 'early_in') earlyInCount++;
          if (s === 'late_entry') lateEntryCount++;
          if (s === 'early_out') earlyOutCount++;
          if (s === 'late_exit') lateExitCount++;
          if (s === 'miss_punch_in') missPunchInCount++;
          if (s === 'miss_punch_out') missPunchOutCount++;
        });

        records.push({
          employeeId: emp.id,
          employeeName: emp.full_name,
          hrmsNo: emp.hrms_no,
          department: emp.department,
          photoUrl: emp.photo_url,
          shiftStart: shiftTimes.start,
          shiftEnd: shiftTimes.end,
          date: dateStr,
          checkIn: att?.checkIn,
          checkOut: att?.checkOut,
          status: statuses,
          attendanceId: att?.id
        });
      });

      return {
        employeeId: emp.id,
        employeeName: emp.full_name,
        hrmsNo: emp.hrms_no,
        department: emp.department,
        photoUrl: emp.photo_url,
        totalDays: daysInRange.length,
        presentDays,
        earlyInCount,
        lateEntryCount,
        earlyOutCount,
        lateExitCount,
        missPunchInCount,
        missPunchOutCount,
        records
      };
    });
  }, [employees, shiftMap, attendanceMap, dateRange]);

  const filteredSummaries = useMemo(() => {
    return employeeSummaries.filter(summary => {
      const matchesSearch = 
        summary.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        summary.hrmsNo.toLowerCase().includes(searchQuery.toLowerCase());
      
      if (!matchesSearch) return false;
      
      if (statusFilter === 'all') return true;
      if (statusFilter === 'late_entry') return summary.lateEntryCount > 0;
      if (statusFilter === 'early_in') return summary.earlyInCount > 0;
      if (statusFilter === 'early_out') return summary.earlyOutCount > 0;
      if (statusFilter === 'late_exit') return summary.lateExitCount > 0;
      if (statusFilter === 'miss_punch') return summary.missPunchInCount > 0 || summary.missPunchOutCount > 0;
      return true;
    });
  }, [employeeSummaries, searchQuery, statusFilter]);

  const overallStats = useMemo(() => {
    return {
      totalEmployees: employees.length,
      totalLateEntries: employeeSummaries.reduce((sum, s) => sum + s.lateEntryCount, 0),
      totalEarlyIns: employeeSummaries.reduce((sum, s) => sum + s.earlyInCount, 0),
      totalEarlyOuts: employeeSummaries.reduce((sum, s) => sum + s.earlyOutCount, 0),
      totalLateExits: employeeSummaries.reduce((sum, s) => sum + s.lateExitCount, 0),
      totalMissPunchIns: employeeSummaries.reduce((sum, s) => sum + s.missPunchInCount, 0),
      totalMissPunchOuts: employeeSummaries.reduce((sum, s) => sum + s.missPunchOutCount, 0),
      avgAttendanceRate: employeeSummaries.length > 0 
        ? Math.round((employeeSummaries.reduce((sum, s) => sum + (s.presentDays / s.totalDays * 100), 0) / employeeSummaries.length))
        : 0
    };
  }, [employees.length, employeeSummaries]);

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleEdit = (record: TimeClockRecord) => {
    setEditDialog({ open: true, record });
    setEditCheckIn(record.checkIn || '');
    setEditCheckOut(record.checkOut || '');
    setEditStatus(record.status[0] || 'on_time');
  };

  const handleSaveEdit = async () => {
    if (!editDialog.record?.attendanceId) {
      toast.error('No attendance record to update');
      return;
    }

    try {
      await updateAttendance.mutateAsync({
        id: editDialog.record.attendanceId,
        check_in: editCheckIn || null,
        check_out: editCheckOut || null,
        status: editStatus === 'late_entry' ? 'Late' : 
                editStatus === 'miss_punch_in' || editStatus === 'miss_punch_out' ? 'Missed Punch' : 
                'Present'
      });
      toast.success('Time record updated');
      setEditDialog({ open: false, record: null });
      refetchAttendance();
    } catch (error) {
      toast.error('Failed to update record');
    }
  };

  const handleRefresh = () => {
    refetch();
    refetchAttendance();
  };

  const handleExportExcel = () => {
    const exportData: Record<string, string | number>[] = [];
    
    filteredSummaries.forEach(summary => {
      // Summary row
      exportData.push({
        'HRMS No': summary.hrmsNo,
        'Employee Name': summary.employeeName,
        'Department': summary.department,
        'Date': 'SUMMARY',
        'Present Days': summary.presentDays,
        'Total Days': summary.totalDays,
        'Late Entries': summary.lateEntryCount,
        'Early Ins': summary.earlyInCount,
        'Early Outs': summary.earlyOutCount,
        'Miss Punches': summary.missPunchInCount + summary.missPunchOutCount
      });
      
      // Detail rows
      summary.records.forEach(record => {
        exportData.push({
          'HRMS No': record.hrmsNo,
          'Employee Name': record.employeeName,
          'Department': record.department,
          'Date': record.date,
          'Shift': `${record.shiftStart} - ${record.shiftEnd}`,
          'Check In': record.checkIn || '-',
          'Check Out': record.checkOut || '-',
          'Status': record.status.map(s => STATUS_LABELS[s]).join(', ')
        });
      });
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Time Clock');
    
    ws['!cols'] = [
      { wch: 12 }, { wch: 25 }, { wch: 15 }, { wch: 12 },
      { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 30 }
    ];

    XLSX.writeFile(wb, `time-clock-${startDate}-to-${endDate}.xlsx`);
    toast.success('Exported to Excel');
  };

  const isLoading = loadingEmployees || loadingAttendance;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Time Clock</h1>
          <p className="text-muted-foreground">
            Employee attendance tracking • {dayCount} day{dayCount > 1 ? 's' : ''} selected
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {/* Date Range Picker */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("justify-start text-left font-normal min-w-[240px]")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange?.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, 'MMM d')} - {format(dateRange.to, 'MMM d, yyyy')}
                    </>
                  ) : (
                    format(dateRange.from, 'PPP')
                  )
                ) : (
                  <span>Pick date range</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="range"
                defaultMonth={dateRange?.from}
                selected={dateRange}
                onSelect={setDateRange}
                numberOfMonths={2}
                disabled={(date) => date > new Date()}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button size="sm" onClick={handleExportExcel}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Overall Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <Users className="h-5 w-5 text-primary mx-auto mb-1" />
            <p className="text-lg font-bold">{overallStats.totalEmployees}</p>
            <p className="text-xs text-muted-foreground">Employees</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-3 text-center">
            <TrendingUp className="h-5 w-5 text-green-600 mx-auto mb-1" />
            <p className="text-lg font-bold">{overallStats.avgAttendanceRate}%</p>
            <p className="text-xs text-muted-foreground">Avg Attendance</p>
          </CardContent>
        </Card>
        
        <Card className={`cursor-pointer hover:shadow-md transition-shadow ${statusFilter === 'early_in' ? 'ring-2 ring-blue-500' : ''}`}
              onClick={() => setStatusFilter(statusFilter === 'early_in' ? 'all' : 'early_in')}>
          <CardContent className="p-3 text-center">
            <ArrowDownLeft className="h-5 w-5 text-blue-600 mx-auto mb-1" />
            <p className="text-lg font-bold">{overallStats.totalEarlyIns}</p>
            <p className="text-xs text-muted-foreground">Early Ins</p>
          </CardContent>
        </Card>
        
        <Card className={`cursor-pointer hover:shadow-md transition-shadow ${statusFilter === 'late_entry' ? 'ring-2 ring-red-500' : ''}`}
              onClick={() => setStatusFilter(statusFilter === 'late_entry' ? 'all' : 'late_entry')}>
          <CardContent className="p-3 text-center">
            <Clock className="h-5 w-5 text-red-600 mx-auto mb-1" />
            <p className="text-lg font-bold">{overallStats.totalLateEntries}</p>
            <p className="text-xs text-muted-foreground">Late Entries</p>
          </CardContent>
        </Card>
        
        <Card className={`cursor-pointer hover:shadow-md transition-shadow ${statusFilter === 'early_out' ? 'ring-2 ring-orange-500' : ''}`}
              onClick={() => setStatusFilter(statusFilter === 'early_out' ? 'all' : 'early_out')}>
          <CardContent className="p-3 text-center">
            <ArrowUpRight className="h-5 w-5 text-orange-600 mx-auto mb-1" />
            <p className="text-lg font-bold">{overallStats.totalEarlyOuts}</p>
            <p className="text-xs text-muted-foreground">Early Outs</p>
          </CardContent>
        </Card>
        
        <Card className={`cursor-pointer hover:shadow-md transition-shadow ${statusFilter === 'late_exit' ? 'ring-2 ring-purple-500' : ''}`}
              onClick={() => setStatusFilter(statusFilter === 'late_exit' ? 'all' : 'late_exit')}>
          <CardContent className="p-3 text-center">
            <Clock className="h-5 w-5 text-purple-600 mx-auto mb-1" />
            <p className="text-lg font-bold">{overallStats.totalLateExits}</p>
            <p className="text-xs text-muted-foreground">Late Exits</p>
          </CardContent>
        </Card>
        
        <Card className={`cursor-pointer hover:shadow-md transition-shadow ${statusFilter === 'miss_punch' ? 'ring-2 ring-red-500' : ''}`}
              onClick={() => setStatusFilter(statusFilter === 'miss_punch' ? 'all' : 'miss_punch')}>
          <CardContent className="p-3 text-center">
            <XCircle className="h-5 w-5 text-red-600 mx-auto mb-1" />
            <p className="text-lg font-bold">{overallStats.totalMissPunchIns}</p>
            <p className="text-xs text-muted-foreground">Miss Punch In</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-3 text-center">
            <AlertTriangle className="h-5 w-5 text-red-600 mx-auto mb-1" />
            <p className="text-lg font-bold">{overallStats.totalMissPunchOuts}</p>
            <p className="text-xs text-muted-foreground">Miss Punch Out</p>
          </CardContent>
        </Card>
      </div>

      {/* Employee Time Clock List */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-2">
              <CardTitle>Employee Time Records</CardTitle>
              <div className="flex gap-1">
                <Button 
                  size="sm" 
                  variant={viewMode === 'summary' ? 'default' : 'outline'}
                  onClick={() => setViewMode('summary')}
                >
                  Summary
                </Button>
                <Button 
                  size="sm" 
                  variant={viewMode === 'detailed' ? 'default' : 'outline'}
                  onClick={() => setViewMode('detailed')}
                >
                  Detailed
                </Button>
              </div>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search employees..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="late_entry">Has Late Entry</SelectItem>
                  <SelectItem value="early_in">Has Early In</SelectItem>
                  <SelectItem value="early_out">Has Early Out</SelectItem>
                  <SelectItem value="late_exit">Has Late Exit</SelectItem>
                  <SelectItem value="miss_punch">Has Miss Punch</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : filteredSummaries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No records found</div>
          ) : (
            <ScrollArea className="h-[500px]">
              <div className="space-y-2">
                {viewMode === 'summary' ? (
                  <>
                    {/* Summary Header */}
                    <div className="grid grid-cols-12 gap-2 p-3 bg-muted/50 rounded-lg font-medium text-sm">
                      <div className="col-span-3">Employee</div>
                      <div className="col-span-1 text-center">Present</div>
                      <div className="col-span-1 text-center">Early In</div>
                      <div className="col-span-1 text-center">Late</div>
                      <div className="col-span-1 text-center">Early Out</div>
                      <div className="col-span-1 text-center">Late Exit</div>
                      <div className="col-span-2 text-center">Miss Punch</div>
                      <div className="col-span-2 text-center">Rate</div>
                    </div>

                    {filteredSummaries.map((summary) => (
                      <div
                        key={summary.employeeId}
                        className="grid grid-cols-12 gap-2 p-3 rounded-lg border hover:bg-muted/50 transition-colors items-center"
                      >
                        <div className="col-span-3 flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={summary.photoUrl || ''} alt={summary.employeeName} />
                            <AvatarFallback className="text-xs">{getInitials(summary.employeeName)}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{summary.employeeName}</p>
                            <p className="text-xs text-muted-foreground">{summary.hrmsNo}</p>
                          </div>
                        </div>
                        <div className="col-span-1 text-center">
                          <span className="font-medium">{summary.presentDays}/{summary.totalDays}</span>
                        </div>
                        <div className="col-span-1 text-center">
                          {summary.earlyInCount > 0 ? (
                            <Badge variant="outline" className={STATUS_COLORS.early_in}>{summary.earlyInCount}</Badge>
                          ) : <span className="text-muted-foreground">-</span>}
                        </div>
                        <div className="col-span-1 text-center">
                          {summary.lateEntryCount > 0 ? (
                            <Badge variant="outline" className={STATUS_COLORS.late_entry}>{summary.lateEntryCount}</Badge>
                          ) : <span className="text-muted-foreground">-</span>}
                        </div>
                        <div className="col-span-1 text-center">
                          {summary.earlyOutCount > 0 ? (
                            <Badge variant="outline" className={STATUS_COLORS.early_out}>{summary.earlyOutCount}</Badge>
                          ) : <span className="text-muted-foreground">-</span>}
                        </div>
                        <div className="col-span-1 text-center">
                          {summary.lateExitCount > 0 ? (
                            <Badge variant="outline" className={STATUS_COLORS.late_exit}>{summary.lateExitCount}</Badge>
                          ) : <span className="text-muted-foreground">-</span>}
                        </div>
                        <div className="col-span-2 text-center">
                          {(summary.missPunchInCount > 0 || summary.missPunchOutCount > 0) ? (
                            <div className="flex justify-center gap-1">
                              {summary.missPunchInCount > 0 && (
                                <Badge variant="outline" className={STATUS_COLORS.miss_punch_in}>In: {summary.missPunchInCount}</Badge>
                              )}
                              {summary.missPunchOutCount > 0 && (
                                <Badge variant="outline" className={STATUS_COLORS.miss_punch_out}>Out: {summary.missPunchOutCount}</Badge>
                              )}
                            </div>
                          ) : <span className="text-muted-foreground">-</span>}
                        </div>
                        <div className="col-span-2 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-green-500 rounded-full" 
                                style={{ width: `${(summary.presentDays / summary.totalDays) * 100}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium">
                              {Math.round((summary.presentDays / summary.totalDays) * 100)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </>
                ) : (
                  <>
                    {/* Detailed Header */}
                    <div className="grid grid-cols-12 gap-2 p-3 bg-muted/50 rounded-lg font-medium text-sm">
                      <div className="col-span-3">Employee</div>
                      <div className="col-span-2 text-center">Date</div>
                      <div className="col-span-2 text-center">Check In</div>
                      <div className="col-span-2 text-center">Check Out</div>
                      <div className="col-span-2 text-center">Status</div>
                      <div className="col-span-1 text-center">Action</div>
                    </div>

                    {filteredSummaries.flatMap(summary => 
                      summary.records.map((record) => (
                        <div
                          key={`${record.employeeId}-${record.date}`}
                          className="grid grid-cols-12 gap-2 p-3 rounded-lg border hover:bg-muted/50 transition-colors items-center"
                        >
                          <div className="col-span-3 flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={record.photoUrl || ''} alt={record.employeeName} />
                              <AvatarFallback className="text-xs">{getInitials(record.employeeName)}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate">{record.employeeName}</p>
                              <p className="text-xs text-muted-foreground">{record.hrmsNo}</p>
                            </div>
                          </div>
                          <div className="col-span-2 text-center text-sm">
                            {format(new Date(record.date), 'MMM d, EEE')}
                          </div>
                          <div className="col-span-2 text-center">
                            {record.checkIn ? (
                              <span className="text-sm font-medium">{record.checkIn}</span>
                            ) : (
                              <span className="text-sm text-muted-foreground">-</span>
                            )}
                          </div>
                          <div className="col-span-2 text-center">
                            {record.checkOut ? (
                              <span className="text-sm font-medium">{record.checkOut}</span>
                            ) : (
                              <span className="text-sm text-muted-foreground">-</span>
                            )}
                          </div>
                          <div className="col-span-2 flex flex-wrap justify-center gap-1">
                            {record.status.map((s, idx) => (
                              <Badge key={idx} variant="outline" className={`text-xs ${STATUS_COLORS[s]}`}>
                                {STATUS_LABELS[s]}
                              </Badge>
                            ))}
                          </div>
                          <div className="col-span-1 text-center">
                            {record.attendanceId && (
                              <Button size="sm" variant="ghost" onClick={() => handleEdit(record)}>
                                <Edit2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </>
                )}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialog.open} onOpenChange={(open) => setEditDialog({ open, record: open ? editDialog.record : null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Time Record</DialogTitle>
          </DialogHeader>
          {editDialog.record && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={editDialog.record.photoUrl || ''} />
                  <AvatarFallback>{getInitials(editDialog.record.employeeName)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{editDialog.record.employeeName}</p>
                  <p className="text-sm text-muted-foreground">
                    {editDialog.record.hrmsNo} • {format(new Date(editDialog.record.date), 'PPP')}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Check In</Label>
                  <Input
                    type="time"
                    value={editCheckIn}
                    onChange={(e) => setEditCheckIn(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Check Out</Label>
                  <Input
                    type="time"
                    value={editCheckOut}
                    onChange={(e) => setEditCheckOut(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Status Override</Label>
                <Select value={editStatus} onValueChange={(v) => setEditStatus(v as TimeClockStatus)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="on_time">On Time</SelectItem>
                    <SelectItem value="early_in">Early In</SelectItem>
                    <SelectItem value="late_entry">Late Entry</SelectItem>
                    <SelectItem value="early_out">Early Out</SelectItem>
                    <SelectItem value="late_exit">Late Exit</SelectItem>
                    <SelectItem value="miss_punch_in">Miss Punch In</SelectItem>
                    <SelectItem value="miss_punch_out">Miss Punch Out</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog({ open: false, record: null })}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={updateAttendance.isPending}>
              {updateAttendance.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Legend */}
      <Card>
        <CardContent className="p-4">
          <h3 className="font-semibold mb-3">Status Legend</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={STATUS_COLORS.on_time}>On Time</Badge>
              <span className="text-xs text-muted-foreground">Within schedule</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={STATUS_COLORS.early_in}>Early In</Badge>
              <span className="text-xs text-muted-foreground">1+ hour early</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={STATUS_COLORS.late_entry}>Late Entry</Badge>
              <span className="text-xs text-muted-foreground">After shift start</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={STATUS_COLORS.early_out}>Early Out</Badge>
              <span className="text-xs text-muted-foreground">Before shift end</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
