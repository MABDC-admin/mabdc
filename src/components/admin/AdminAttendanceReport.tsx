import { useState, useMemo } from 'react';
import { useAttendance, useDeleteAttendance, useUpdateAttendance, useCreateAttendance } from '@/hooks/useAttendance';
import { useEmployees } from '@/hooks/useEmployees';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, FileText, Calendar as CalendarIcon, Clock, Users, Trash2, Search, LogIn, LogOut, AlertTriangle, Pencil, Plus, MessageSquare } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isWeekend, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface EditRecord {
  id: string;
  employee_name: string;
  date: string;
  check_in: string;
  check_out: string;
  status: string;
  admin_remarks: string;
}

interface NewAttendanceRecord {
  employee_id: string;
  date: string;
  check_in: string;
  check_out: string;
  status: string;
  admin_remarks: string;
}

const ATTENDANCE_STATUSES = [
  'Present',
  'Late',
  'Absent',
  'Half Day',
  'Undertime',
  'Late | Undertime',
  'Miss Punch In',
  'Miss Punch In | Undertime',
  'Miss Punch Out',
  'Appealed',
  'On Time',
];

export function AdminAttendanceReport() {
  const { data: attendance = [] } = useAttendance();
  const { data: employees = [] } = useEmployees();
  const deleteAttendance = useDeleteAttendance();
  const updateAttendance = useUpdateAttendance();
  const createAttendance = useCreateAttendance();
  
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(format(currentDate, 'yyyy-MM'));
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [editRecord, setEditRecord] = useState<EditRecord | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newRecord, setNewRecord] = useState<NewAttendanceRecord>({
    employee_id: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    check_in: '',
    check_out: '',
    status: 'Present',
    admin_remarks: '',
  });

  const months = useMemo(() => {
    const result = [];
    for (let i = 0; i < 12; i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      result.push({
        value: format(date, 'yyyy-MM'),
        label: format(date, 'MMMM yyyy'),
      });
    }
    return result;
  }, []);

  const reportData = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const monthStart = startOfMonth(new Date(year, month - 1));
    const monthEnd = endOfMonth(new Date(year, month - 1));
    const workDays = eachDayOfInterval({ start: monthStart, end: monthEnd })
      .filter(date => !isWeekend(date));
    const totalWorkDays = workDays.length;

    return employees.map(employee => {
      const empAttendance = attendance.filter(a => {
        const attDate = parseISO(a.date);
        return a.employee_id === employee.id && 
          attDate >= monthStart && 
          attDate <= monthEnd;
      });

      const presentDays = empAttendance.filter(a => a.status === 'Present' || a.status === 'Late').length;
      const lateDays = empAttendance.filter(a => a.status === 'Late').length;
      const absentDays = totalWorkDays - presentDays;

      return {
        employee,
        presentDays,
        lateDays,
        absentDays,
        totalWorkDays,
        attendanceRate: totalWorkDays > 0 ? ((presentDays / totalWorkDays) * 100).toFixed(1) : '0',
      };
    });
  }, [selectedMonth, attendance, employees]);

  const totals = useMemo(() => {
    const totalPresent = reportData.reduce((sum, r) => sum + r.presentDays, 0);
    const totalLate = reportData.reduce((sum, r) => sum + r.lateDays, 0);
    const totalAbsent = reportData.reduce((sum, r) => sum + r.absentDays, 0);
    const avgAttendance = reportData.length > 0 
      ? (reportData.reduce((sum, r) => sum + parseFloat(r.attendanceRate), 0) / reportData.length).toFixed(1) 
      : '0';
    return { totalPresent, totalLate, totalAbsent, avgAttendance };
  }, [reportData]);

  // Filter attendance records by selected date
  const filteredAttendance = useMemo(() => {
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    return attendance.filter(a => {
      const matchesDate = a.date === dateStr;
      if (!searchQuery) return matchesDate;
      const emp = employees.find(e => e.id === a.employee_id);
      return matchesDate && (
        emp?.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp?.hrms_no.includes(searchQuery)
      );
    });
  }, [attendance, employees, selectedDate, searchQuery]);

  const downloadCSV = () => {
    const headers = ['HRMS No', 'Employee Name', 'Department', 'Present Days', 'Late Days', 'Absent Days', 'Attendance Rate'];
    const rows = reportData.map(r => [
      r.employee.hrms_no,
      r.employee.full_name,
      r.employee.department,
      r.presentDays,
      r.lateDays,
      r.absentDays,
      `${r.attendanceRate}%`,
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-report-${selectedMonth}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCreateAttendance = () => {
    if (!newRecord.employee_id) {
      toast.error('Please select an employee');
      return;
    }
    if (!newRecord.date) {
      toast.error('Please select a date');
      return;
    }

    createAttendance.mutate({
      employee_id: newRecord.employee_id,
      date: newRecord.date,
      check_in: newRecord.check_in || null,
      check_out: newRecord.check_out || null,
      status: newRecord.status,
      admin_remarks: newRecord.admin_remarks || null,
    }, {
      onSuccess: () => {
        toast.success('Attendance record created successfully');
        setShowAddDialog(false);
        setNewRecord({
          employee_id: '',
          date: format(selectedDate, 'yyyy-MM-dd'),
          check_in: '',
          check_out: '',
          status: 'Present',
          admin_remarks: '',
        });
      },
      onError: (error) => {
        toast.error('Failed to create attendance record');
        console.error(error);
      }
    });
  };

  const handleUpdateAttendance = () => {
    if (!editRecord) return;

    updateAttendance.mutate({
      id: editRecord.id,
      check_in: editRecord.check_in || undefined,
      check_out: editRecord.check_out || undefined,
      status: editRecord.status,
      admin_remarks: editRecord.admin_remarks || undefined,
    }, {
      onSuccess: () => {
        toast.success('Attendance record updated successfully');
        setEditRecord(null);
      },
      onError: (error) => {
        toast.error('Failed to update attendance record');
        console.error(error);
      }
    });
  };

  return (
    <div className="glass-card rounded-3xl border border-border p-6 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Monthly Attendance Report</h2>
          <p className="text-xs text-muted-foreground">Generate and download attendance reports</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-48">
              <CalendarIcon className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {months.map((month) => (
                <SelectItem key={month.value} value={month.value}>{month.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={downloadCSV} className="bg-primary text-primary-foreground">
            <Download size={16} className="mr-2" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border p-4 bg-muted/30">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground">Employees</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{employees.length}</p>
        </div>
        <div className="rounded-xl border border-border p-4 bg-muted/30">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-emerald-500" />
            <span className="text-xs text-muted-foreground">Total Present</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{totals.totalPresent}</p>
        </div>
        <div className="rounded-xl border border-border p-4 bg-muted/30">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-amber-500" />
            <span className="text-xs text-muted-foreground">Total Late</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{totals.totalLate}</p>
        </div>
        <div className="rounded-xl border border-border p-4 bg-muted/30">
          <div className="flex items-center gap-2 mb-1">
            <FileText className="w-4 h-4 text-blue-500" />
            <span className="text-xs text-muted-foreground">Avg Attendance</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{totals.avgAttendance}%</p>
        </div>
      </div>

      {/* Report Table */}
      <div className="rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>HRMS No</TableHead>
              <TableHead>Employee</TableHead>
              <TableHead>Department</TableHead>
              <TableHead className="text-center">Present</TableHead>
              <TableHead className="text-center">Late</TableHead>
              <TableHead className="text-center">Absent</TableHead>
              <TableHead className="text-center">Rate</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reportData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No employees found
                </TableCell>
              </TableRow>
            ) : (
              reportData.map((row) => (
                <TableRow key={row.employee.id}>
                  <TableCell className="text-xs font-mono">{row.employee.hrms_no}</TableCell>
                  <TableCell className="text-sm font-medium">{row.employee.full_name}</TableCell>
                  <TableCell className="text-xs">{row.employee.department}</TableCell>
                  <TableCell className="text-center text-sm font-medium text-emerald-500">{row.presentDays}</TableCell>
                  <TableCell className="text-center text-sm font-medium text-amber-500">{row.lateDays}</TableCell>
                  <TableCell className="text-center text-sm font-medium text-destructive">{row.absentDays}</TableCell>
                  <TableCell className="text-center">
                    <span className={cn(
                      "text-xs font-medium px-2 py-1 rounded-full",
                      parseFloat(row.attendanceRate) >= 90 && "bg-emerald-500/10 text-emerald-500",
                      parseFloat(row.attendanceRate) >= 70 && parseFloat(row.attendanceRate) < 90 && "bg-amber-500/10 text-amber-500",
                      parseFloat(row.attendanceRate) < 70 && "bg-destructive/10 text-destructive"
                    )}>
                      {row.attendanceRate}%
                    </span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Daily Attendance Records Management */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-md font-semibold text-foreground">Daily Attendance Records</h3>
            <p className="text-xs text-muted-foreground">View, edit, and delete attendance for a specific date</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Date Picker */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[180px] justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(selectedDate, 'dd MMM yyyy')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>

            {/* Search */}
            <div className="relative w-full sm:w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="pl-9 bg-secondary/50 border-border"
              />
            </div>

            {/* Add Attendance Button */}
            <Button 
              onClick={() => {
                setNewRecord(prev => ({ ...prev, date: format(selectedDate, 'yyyy-MM-dd') }));
                setShowAddDialog(true);
              }}
              className="bg-primary text-primary-foreground"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Attendance
            </Button>
          </div>
        </div>

        <div className="rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Employee</TableHead>
                <TableHead>HRMS</TableHead>
                <TableHead className="text-center">Check In</TableHead>
                <TableHead className="text-center">Check Out</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead>Remarks</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAttendance.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No attendance records for {format(selectedDate, 'dd MMM yyyy')}
                  </TableCell>
                </TableRow>
              ) : (
                filteredAttendance.map((record) => {
                  const emp = employees.find(e => e.id === record.employee_id);
                  return (
                    <TableRow key={record.id} className="group">
                      <TableCell className="text-sm font-medium">
                        {emp?.full_name || 'Unknown'}
                      </TableCell>
                      <TableCell className="text-xs font-mono">
                        {emp?.hrms_no || '-'}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="inline-flex items-center gap-1 text-xs">
                          <LogIn className="w-3 h-3 text-primary" />
                          {record.check_in || '--:--'}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="inline-flex items-center gap-1 text-xs">
                          <LogOut className="w-3 h-3 text-accent" />
                          {record.check_out || '--:--'}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={cn(
                          "text-xs px-2 py-1 rounded-full",
                          record.status === 'Present' && "bg-primary/10 text-primary",
                          record.status === 'On Time' && "bg-emerald-500/10 text-emerald-500",
                          String(record.status).includes('Late') && String(record.status).includes('Undertime') && "bg-gradient-to-r from-amber-500/10 to-cyan-500/10 text-amber-500",
                          record.status === 'Late' && "bg-amber-500/10 text-amber-500",
                          String(record.status) === 'Undertime' && "bg-cyan-500/10 text-cyan-500",
                          record.status === 'Absent' && "bg-destructive/10 text-destructive",
                          String(record.status).includes('Miss Punch') && "bg-orange-500/10 text-orange-500",
                          record.status === 'Half Day' && "bg-purple-500/10 text-purple-500",
                          record.status === 'Appealed' && "bg-blue-500/10 text-blue-500"
                        )}>
                          {record.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate">
                        {record.admin_remarks || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditRecord({
                              id: record.id,
                              employee_name: emp?.full_name || 'Unknown',
                              date: record.date,
                              check_in: record.check_in || '',
                              check_out: record.check_out || '',
                              status: record.status || 'Present',
                              admin_remarks: record.admin_remarks || '',
                            })}
                            className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteConfirm(record.id)}
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Add Attendance Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-primary" />
              Add Attendance Record
            </DialogTitle>
            <DialogDescription>
              Manually create a new attendance record
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {/* Employee Select */}
            <div className="grid gap-2">
              <Label htmlFor="employee" className="flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                Employee *
              </Label>
              <Select 
                value={newRecord.employee_id} 
                onValueChange={(value) => setNewRecord(prev => ({ ...prev, employee_id: value }))}
              >
                <SelectTrigger className="bg-secondary/50">
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.full_name} ({emp.hrms_no})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date */}
            <div className="grid gap-2">
              <Label htmlFor="date" className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                Date *
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal bg-secondary/50">
                    {newRecord.date ? format(parseISO(newRecord.date), 'dd MMM yyyy') : 'Select date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={newRecord.date ? parseISO(newRecord.date) : undefined}
                    onSelect={(date) => date && setNewRecord(prev => ({ ...prev, date: format(date, 'yyyy-MM-dd') }))}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Check In */}
            <div className="grid gap-2">
              <Label htmlFor="new_check_in" className="flex items-center gap-2">
                <LogIn className="w-4 h-4 text-primary" />
                Check In Time
              </Label>
              <Input
                id="new_check_in"
                type="time"
                value={newRecord.check_in}
                onChange={(e) => setNewRecord(prev => ({ ...prev, check_in: e.target.value }))}
                className="bg-secondary/50"
              />
            </div>

            {/* Check Out */}
            <div className="grid gap-2">
              <Label htmlFor="new_check_out" className="flex items-center gap-2">
                <LogOut className="w-4 h-4 text-accent" />
                Check Out Time
              </Label>
              <Input
                id="new_check_out"
                type="time"
                value={newRecord.check_out}
                onChange={(e) => setNewRecord(prev => ({ ...prev, check_out: e.target.value }))}
                className="bg-secondary/50"
              />
            </div>

            {/* Status */}
            <div className="grid gap-2">
              <Label htmlFor="new_status" className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                Status *
              </Label>
              <Select 
                value={newRecord.status} 
                onValueChange={(value) => setNewRecord(prev => ({ ...prev, status: value }))}
              >
                <SelectTrigger className="bg-secondary/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ATTENDANCE_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>{status}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Admin Remarks */}
            <div className="grid gap-2">
              <Label htmlFor="new_admin_remarks" className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-muted-foreground" />
                Admin Remarks
              </Label>
              <Textarea
                id="new_admin_remarks"
                value={newRecord.admin_remarks}
                onChange={(e) => setNewRecord(prev => ({ ...prev, admin_remarks: e.target.value }))}
                placeholder="Add notes..."
                className="bg-secondary/50 min-h-[60px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button 
              onClick={handleCreateAttendance}
              disabled={createAttendance.isPending}
              className="bg-primary text-primary-foreground"
            >
              {createAttendance.isPending ? 'Creating...' : 'Create Record'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Attendance Dialog */}
      <Dialog open={!!editRecord} onOpenChange={() => setEditRecord(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-5 h-5 text-primary" />
              Edit Attendance Record
            </DialogTitle>
            <DialogDescription>
              Modify attendance for {editRecord?.employee_name} on {editRecord?.date ? format(parseISO(editRecord.date), 'dd MMM yyyy') : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {/* Check In */}
            <div className="grid gap-2">
              <Label htmlFor="check_in" className="flex items-center gap-2">
                <LogIn className="w-4 h-4 text-primary" />
                Check In Time
              </Label>
              <Input
                id="check_in"
                type="time"
                value={editRecord?.check_in || ''}
                onChange={(e) => setEditRecord(prev => prev ? { ...prev, check_in: e.target.value } : null)}
                className="bg-secondary/50"
              />
            </div>

            {/* Check Out */}
            <div className="grid gap-2">
              <Label htmlFor="check_out" className="flex items-center gap-2">
                <LogOut className="w-4 h-4 text-accent" />
                Check Out Time
              </Label>
              <Input
                id="check_out"
                type="time"
                value={editRecord?.check_out || ''}
                onChange={(e) => setEditRecord(prev => prev ? { ...prev, check_out: e.target.value } : null)}
                className="bg-secondary/50"
              />
            </div>

            {/* Status */}
            <div className="grid gap-2">
              <Label htmlFor="status" className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                Status
              </Label>
              <Select 
                value={editRecord?.status || 'Present'} 
                onValueChange={(value) => setEditRecord(prev => prev ? { ...prev, status: value } : null)}
              >
                <SelectTrigger className="bg-secondary/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ATTENDANCE_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>{status}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Admin Remarks */}
            <div className="grid gap-2">
              <Label htmlFor="admin_remarks" className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-muted-foreground" />
                Admin Remarks
              </Label>
              <Textarea
                id="admin_remarks"
                value={editRecord?.admin_remarks || ''}
                onChange={(e) => setEditRecord(prev => prev ? { ...prev, admin_remarks: e.target.value } : null)}
                placeholder="Add admin notes..."
                className="bg-secondary/50 min-h-[60px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditRecord(null)}>Cancel</Button>
            <Button 
              onClick={handleUpdateAttendance}
              disabled={updateAttendance.isPending}
              className="bg-primary text-primary-foreground"
            >
              {updateAttendance.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Delete Attendance Record
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this attendance record? This will permanently remove the check-in and check-out data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteConfirm) {
                  deleteAttendance.mutate(deleteConfirm, {
                    onSuccess: () => {
                      toast.success('Attendance record deleted');
                      setDeleteConfirm(null);
                    }
                  });
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
