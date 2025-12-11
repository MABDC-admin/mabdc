import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { useEmployees } from '@/hooks/useEmployees';
import { useAttendanceByDate, useUpdateAttendance } from '@/hooks/useAttendance';
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
import { Checkbox } from '@/components/ui/checkbox';
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
  Users
} from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

type TimeClockStatus = 'early_in' | 'late_entry' | 'early_out' | 'late_exit' | 'miss_punch_in' | 'miss_punch_out' | 'on_time';

interface TimeClockRecord {
  employeeId: string;
  employeeName: string;
  hrmsNo: string;
  department: string;
  photoUrl?: string;
  shiftStart: string;
  shiftEnd: string;
  checkIn?: string;
  checkOut?: string;
  status: TimeClockStatus[];
  attendanceId?: string;
}

const STATUS_LABELS: Record<TimeClockStatus, string> = {
  early_in: 'Early In',
  late_entry: 'Late Entry',
  early_out: 'Early Out',
  late_exit: 'Late Exit',
  miss_punch_in: 'Miss Punch In',
  miss_punch_out: 'Miss Punch Out',
  on_time: 'On Time'
};

const STATUS_COLORS: Record<TimeClockStatus, string> = {
  early_in: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  late_entry: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  early_out: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  late_exit: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  miss_punch_in: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  miss_punch_out: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  on_time: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
};

const SHIFT_TIMES = {
  morning: { start: '08:00', end: '17:00' },
  afternoon: { start: '10:00', end: '19:00' },
  default: { start: '08:00', end: '17:00' }
};

export default function TimeClockView() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const dateString = format(selectedDate, 'yyyy-MM-dd');
  const isToday = dateString === format(new Date(), 'yyyy-MM-dd');
  
  const { data: employees = [], isLoading: loadingEmployees, refetch } = useEmployees();
  const { data: attendance = [], isLoading: loadingAttendance, refetch: refetchAttendance } = useAttendanceByDate(dateString);
  const { data: shifts = [] } = useTimeShifts();
  const updateAttendance = useUpdateAttendance();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [editDialog, setEditDialog] = useState<{ open: boolean; record: TimeClockRecord | null }>({ open: false, record: null });
  const [editCheckIn, setEditCheckIn] = useState('');
  const [editCheckOut, setEditCheckOut] = useState('');
  const [editStatus, setEditStatus] = useState<TimeClockStatus>('on_time');
  
  // Bulk edit state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkEditDialog, setBulkEditDialog] = useState(false);
  const [bulkCheckIn, setBulkCheckIn] = useState('');
  const [bulkCheckOut, setBulkCheckOut] = useState('');
  const [bulkStatus, setBulkStatus] = useState<TimeClockStatus | ''>('');
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);

  const shiftMap = useMemo(() => {
    const map = new Map<string, 'morning' | 'afternoon'>();
    shifts.forEach(s => map.set(s.employee_id, s.shift_type as 'morning' | 'afternoon'));
    return map;
  }, [shifts]);

  const attendanceMap = useMemo(() => {
    const map = new Map<string, { id: string; checkIn?: string; checkOut?: string }>();
    attendance.forEach(a => {
      map.set(a.employee_id, { 
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

    // Parse shift times
    const shiftStartTime = shiftStart;
    const shiftEndTime = shiftEnd;
    
    // Calculate early threshold (1 hour before shift start)
    const [startHour, startMin] = shiftStartTime.split(':').map(Number);
    const earlyThreshold = `${String(startHour - 1).padStart(2, '0')}:${String(startMin).padStart(2, '0')}`;

    if (!checkIn) {
      // Only mark as miss punch if past shift start time (for today) or if viewing past date
      if (isPastDate || (isViewingToday && now > new Date(`${dateStr}T${shiftStartTime}:00`))) {
        statuses.push('miss_punch_in');
      }
    } else {
      // Check early in (1 hour early)
      if (checkIn <= earlyThreshold) {
        statuses.push('early_in');
      }
      // Check late entry
      else if (checkIn > shiftStartTime) {
        statuses.push('late_entry');
      }
      // On time for check-in
      else {
        statuses.push('on_time');
      }
    }

    if (checkIn && !checkOut) {
      // Only mark as miss punch out if past shift end time (for today) or if viewing past date
      if (isPastDate || (isViewingToday && now > new Date(`${dateStr}T${shiftEndTime}:00`))) {
        statuses.push('miss_punch_out');
      }
    } else if (checkOut) {
      // Check early out
      if (checkOut < shiftEndTime) {
        statuses.push('early_out');
      }
      // Check late exit
      else if (checkOut > shiftEndTime) {
        statuses.push('late_exit');
      }
    }

    return statuses.length > 0 ? statuses : ['on_time'];
  };

  const timeClockRecords = useMemo<TimeClockRecord[]>(() => {
    return employees.map(emp => {
      const shiftType = shiftMap.get(emp.id) || 'default';
      const shiftTimes = SHIFT_TIMES[shiftType] || SHIFT_TIMES.default;
      const att = attendanceMap.get(emp.id);
      
      const statuses = calculateStatus(att?.checkIn, att?.checkOut, shiftTimes.start, shiftTimes.end, selectedDate);

      return {
        employeeId: emp.id,
        employeeName: emp.full_name,
        hrmsNo: emp.hrms_no,
        department: emp.department,
        photoUrl: emp.photo_url,
        shiftStart: shiftTimes.start,
        shiftEnd: shiftTimes.end,
        checkIn: att?.checkIn,
        checkOut: att?.checkOut,
        status: statuses,
        attendanceId: att?.id
      };
    });
  }, [employees, shiftMap, attendanceMap, selectedDate]);

  const filteredRecords = useMemo(() => {
    return timeClockRecords.filter(record => {
      const matchesSearch = 
        record.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        record.hrmsNo.toLowerCase().includes(searchQuery.toLowerCase());
      
      if (!matchesSearch) return false;
      
      if (statusFilter === 'all') return true;
      return record.status.includes(statusFilter as TimeClockStatus);
    });
  }, [timeClockRecords, searchQuery, statusFilter]);

  const statusStats = useMemo(() => {
    const stats = {
      early_in: 0,
      late_entry: 0,
      early_out: 0,
      late_exit: 0,
      miss_punch_in: 0,
      miss_punch_out: 0,
      on_time: 0
    };
    
    timeClockRecords.forEach(record => {
      record.status.forEach(s => stats[s]++);
    });
    
    return stats;
  }, [timeClockRecords]);

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
    setSelectedIds(new Set());
  };

  // Bulk selection handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const selectableIds = filteredRecords
        .filter(r => r.attendanceId)
        .map(r => r.employeeId);
      setSelectedIds(new Set(selectableIds));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (employeeId: string, checked: boolean) => {
    const newSet = new Set(selectedIds);
    if (checked) {
      newSet.add(employeeId);
    } else {
      newSet.delete(employeeId);
    }
    setSelectedIds(newSet);
  };

  const selectableRecords = filteredRecords.filter(r => r.attendanceId);
  const allSelected = selectableRecords.length > 0 && selectableRecords.every(r => selectedIds.has(r.employeeId));
  const someSelected = selectedIds.size > 0;

  const handleOpenBulkEdit = () => {
    setBulkCheckIn('');
    setBulkCheckOut('');
    setBulkStatus('');
    setBulkEditDialog(true);
  };

  const handleBulkSave = async () => {
    const recordsToUpdate = filteredRecords.filter(r => selectedIds.has(r.employeeId) && r.attendanceId);
    
    if (recordsToUpdate.length === 0) {
      toast.error('No valid records to update');
      return;
    }

    setIsBulkUpdating(true);
    try {
      const updates = recordsToUpdate.map(record => {
        const updateData: any = { id: record.attendanceId };
        
        if (bulkCheckIn) updateData.check_in = bulkCheckIn;
        if (bulkCheckOut) updateData.check_out = bulkCheckOut;
        if (bulkStatus) {
          updateData.status = bulkStatus === 'late_entry' ? 'Late' : 
                              bulkStatus === 'miss_punch_in' || bulkStatus === 'miss_punch_out' ? 'Missed Punch' : 
                              'Present';
        }
        
        return updateAttendance.mutateAsync(updateData);
      });

      await Promise.all(updates);
      toast.success(`Updated ${recordsToUpdate.length} records`);
      setBulkEditDialog(false);
      setSelectedIds(new Set());
      refetchAttendance();
    } catch (error) {
      toast.error('Failed to update some records');
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
    }
  };

  const handleExportExcel = () => {
    const exportData = filteredRecords.map(record => ({
      'HRMS No': record.hrmsNo,
      'Employee Name': record.employeeName,
      'Department': record.department,
      'Date': format(selectedDate, 'yyyy-MM-dd'),
      'Shift Start': record.shiftStart,
      'Shift End': record.shiftEnd,
      'Check In': record.checkIn || '-',
      'Check Out': record.checkOut || '-',
      'Status': record.status.map(s => STATUS_LABELS[s]).join(', ')
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Time Clock');
    
    // Set column widths
    ws['!cols'] = [
      { wch: 12 }, { wch: 25 }, { wch: 15 }, { wch: 12 },
      { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 30 }
    ];

    XLSX.writeFile(wb, `time-clock-${dateString}.xlsx`);
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
            Daily employee check-in/check-out tracking
            {isToday && <Badge variant="outline" className="ml-2 bg-green-100 text-green-800">Today</Badge>}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {/* Date Picker */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("justify-start text-left font-normal", !selectedDate && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(selectedDate, 'PPP')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={handleDateSelect}
                disabled={(date) => date > new Date()}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
          {someSelected && (
            <Button variant="default" size="sm" onClick={handleOpenBulkEdit}>
              <Users className="h-4 w-4 mr-2" />
              Bulk Edit ({selectedIds.size})
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button size="sm" onClick={handleExportExcel}>
            <Download className="h-4 w-4 mr-2" />
            Export Excel
          </Button>
        </div>
      </div>

      {/* Status Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <Card className={`cursor-pointer hover:shadow-md transition-shadow ${statusFilter === 'on_time' ? 'ring-2 ring-green-500' : ''}`}
              onClick={() => setStatusFilter(statusFilter === 'on_time' ? 'all' : 'on_time')}>
          <CardContent className="p-3 text-center">
            <CheckCircle className="h-5 w-5 text-green-600 mx-auto mb-1" />
            <p className="text-lg font-bold">{statusStats.on_time}</p>
            <p className="text-xs text-muted-foreground">On Time</p>
          </CardContent>
        </Card>
        
        <Card className={`cursor-pointer hover:shadow-md transition-shadow ${statusFilter === 'early_in' ? 'ring-2 ring-blue-500' : ''}`}
              onClick={() => setStatusFilter(statusFilter === 'early_in' ? 'all' : 'early_in')}>
          <CardContent className="p-3 text-center">
            <ArrowDownLeft className="h-5 w-5 text-blue-600 mx-auto mb-1" />
            <p className="text-lg font-bold">{statusStats.early_in}</p>
            <p className="text-xs text-muted-foreground">Early In</p>
          </CardContent>
        </Card>
        
        <Card className={`cursor-pointer hover:shadow-md transition-shadow ${statusFilter === 'late_entry' ? 'ring-2 ring-red-500' : ''}`}
              onClick={() => setStatusFilter(statusFilter === 'late_entry' ? 'all' : 'late_entry')}>
          <CardContent className="p-3 text-center">
            <Clock className="h-5 w-5 text-red-600 mx-auto mb-1" />
            <p className="text-lg font-bold">{statusStats.late_entry}</p>
            <p className="text-xs text-muted-foreground">Late Entry</p>
          </CardContent>
        </Card>
        
        <Card className={`cursor-pointer hover:shadow-md transition-shadow ${statusFilter === 'early_out' ? 'ring-2 ring-orange-500' : ''}`}
              onClick={() => setStatusFilter(statusFilter === 'early_out' ? 'all' : 'early_out')}>
          <CardContent className="p-3 text-center">
            <ArrowUpRight className="h-5 w-5 text-orange-600 mx-auto mb-1" />
            <p className="text-lg font-bold">{statusStats.early_out}</p>
            <p className="text-xs text-muted-foreground">Early Out</p>
          </CardContent>
        </Card>
        
        <Card className={`cursor-pointer hover:shadow-md transition-shadow ${statusFilter === 'late_exit' ? 'ring-2 ring-purple-500' : ''}`}
              onClick={() => setStatusFilter(statusFilter === 'late_exit' ? 'all' : 'late_exit')}>
          <CardContent className="p-3 text-center">
            <Clock className="h-5 w-5 text-purple-600 mx-auto mb-1" />
            <p className="text-lg font-bold">{statusStats.late_exit}</p>
            <p className="text-xs text-muted-foreground">Late Exit</p>
          </CardContent>
        </Card>
        
        <Card className={`cursor-pointer hover:shadow-md transition-shadow ${statusFilter === 'miss_punch_in' ? 'ring-2 ring-red-500' : ''}`}
              onClick={() => setStatusFilter(statusFilter === 'miss_punch_in' ? 'all' : 'miss_punch_in')}>
          <CardContent className="p-3 text-center">
            <XCircle className="h-5 w-5 text-red-600 mx-auto mb-1" />
            <p className="text-lg font-bold">{statusStats.miss_punch_in}</p>
            <p className="text-xs text-muted-foreground">Miss Punch In</p>
          </CardContent>
        </Card>
        
        <Card className={`cursor-pointer hover:shadow-md transition-shadow ${statusFilter === 'miss_punch_out' ? 'ring-2 ring-red-500' : ''}`}
              onClick={() => setStatusFilter(statusFilter === 'miss_punch_out' ? 'all' : 'miss_punch_out')}>
          <CardContent className="p-3 text-center">
            <XCircle className="h-5 w-5 text-red-600 mx-auto mb-1" />
            <p className="text-lg font-bold">{statusStats.miss_punch_out}</p>
            <p className="text-xs text-muted-foreground">Miss Punch Out</p>
          </CardContent>
        </Card>
      </div>

      {/* Employee Time Clock List */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle>Employee Time Records</CardTitle>
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
                  <SelectValue placeholder="Filter status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
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
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : filteredRecords.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No records found</div>
          ) : (
            <ScrollArea className="h-[500px]">
              <div className="space-y-2">
                {/* Header Row */}
                <div className="grid grid-cols-13 gap-2 p-3 bg-muted/50 rounded-lg font-medium text-sm">
                  <div className="col-span-1 flex items-center justify-center">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={handleSelectAll}
                      aria-label="Select all"
                    />
                  </div>
                  <div className="col-span-3">Employee</div>
                  <div className="col-span-2 text-center">Shift</div>
                  <div className="col-span-2 text-center">Check In</div>
                  <div className="col-span-2 text-center">Check Out</div>
                  <div className="col-span-2 text-center">Status</div>
                  <div className="col-span-1 text-center">Action</div>
                </div>

                {filteredRecords.map((record) => (
                  <div
                    key={record.employeeId}
                    className={cn(
                      "grid grid-cols-13 gap-2 p-3 rounded-lg border hover:bg-muted/50 transition-colors items-center",
                      selectedIds.has(record.employeeId) && "bg-primary/5 border-primary/30"
                    )}
                  >
                    {/* Checkbox */}
                    <div className="col-span-1 flex items-center justify-center">
                      {record.attendanceId ? (
                        <Checkbox
                          checked={selectedIds.has(record.employeeId)}
                          onCheckedChange={(checked) => handleSelectOne(record.employeeId, !!checked)}
                          aria-label={`Select ${record.employeeName}`}
                        />
                      ) : (
                        <span className="w-4 h-4" />
                      )}
                    </div>

                    {/* Employee Info */}
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

                    {/* Shift */}
                    <div className="col-span-2 text-center text-sm">
                      {record.shiftStart} - {record.shiftEnd}
                    </div>

                    {/* Check In */}
                    <div className="col-span-2 text-center">
                      {record.checkIn ? (
                        <span className="text-sm font-medium">{record.checkIn}</span>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </div>

                    {/* Check Out */}
                    <div className="col-span-2 text-center">
                      {record.checkOut ? (
                        <span className="text-sm font-medium">{record.checkOut}</span>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </div>

                    {/* Status */}
                    <div className="col-span-2 flex flex-wrap justify-center gap-1">
                      {record.status.map((s, idx) => (
                        <Badge key={idx} variant="outline" className={`text-xs ${STATUS_COLORS[s]}`}>
                          {STATUS_LABELS[s]}
                        </Badge>
                      ))}
                    </div>

                    {/* Action */}
                    <div className="col-span-1 text-center">
                      {record.attendanceId && (
                        <Button size="sm" variant="ghost" onClick={() => handleEdit(record)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
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
                  <p className="text-sm text-muted-foreground">{editDialog.record.hrmsNo} • Shift: {editDialog.record.shiftStart} - {editDialog.record.shiftEnd}</p>
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

      {/* Bulk Edit Dialog */}
      <Dialog open={bulkEditDialog} onOpenChange={setBulkEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Edit Time Records</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                Editing <span className="font-semibold text-foreground">{selectedIds.size}</span> employee records.
                Leave fields empty to keep existing values.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Check In (optional)</Label>
                <Input
                  type="time"
                  value={bulkCheckIn}
                  onChange={(e) => setBulkCheckIn(e.target.value)}
                  placeholder="Leave empty to skip"
                />
              </div>
              <div className="space-y-2">
                <Label>Check Out (optional)</Label>
                <Input
                  type="time"
                  value={bulkCheckOut}
                  onChange={(e) => setBulkCheckOut(e.target.value)}
                  placeholder="Leave empty to skip"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Status Override (optional)</Label>
              <Select value={bulkStatus} onValueChange={(v) => setBulkStatus(v as TimeClockStatus | '')}>
                <SelectTrigger>
                  <SelectValue placeholder="Leave unchanged" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Leave unchanged</SelectItem>
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkEditDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleBulkSave} 
              disabled={isBulkUpdating || (!bulkCheckIn && !bulkCheckOut && !bulkStatus)}
            >
              {isBulkUpdating ? 'Updating...' : `Update ${selectedIds.size} Records`}
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
              <span className="text-xs text-muted-foreground">Within scheduled time</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={STATUS_COLORS.early_in}>Early In</Badge>
              <span className="text-xs text-muted-foreground">1+ hour before shift</span>
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
