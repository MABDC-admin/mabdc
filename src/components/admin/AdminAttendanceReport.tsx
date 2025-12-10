import { useState, useMemo } from 'react';
import { useAttendance, useDeleteAttendance, useUpdateAttendance } from '@/hooks/useAttendance';
import { useEmployees } from '@/hooks/useEmployees';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, FileText, Calendar, Clock, Users, Trash2, Search, LogIn, LogOut, AlertTriangle, Pencil } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isWeekend, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
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
}

export function AdminAttendanceReport() {
  const { data: attendance = [] } = useAttendance();
  const { data: employees = [] } = useEmployees();
  const deleteAttendance = useDeleteAttendance();
  const updateAttendance = useUpdateAttendance();
  
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(format(currentDate, 'yyyy-MM'));
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [editRecord, setEditRecord] = useState<EditRecord | null>(null);

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
              <Calendar className="w-4 h-4 mr-2" />
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

      {/* Individual Attendance Records Management */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-md font-semibold text-foreground">Manage Attendance Records</h3>
            <p className="text-xs text-muted-foreground">View and delete individual check-in/check-out records</p>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or HRMS..."
              className="pl-9 bg-secondary/50 border-border"
            />
          </div>
        </div>

        <div className="rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Date</TableHead>
                <TableHead>Employee</TableHead>
                <TableHead>HRMS</TableHead>
                <TableHead className="text-center">Check In</TableHead>
                <TableHead className="text-center">Check Out</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {attendance
                .filter(a => {
                  if (!searchQuery) return true;
                  const emp = employees.find(e => e.id === a.employee_id);
                  return emp?.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         emp?.hrms_no.includes(searchQuery);
                })
                .slice(0, 50)
                .map((record) => {
                  const emp = employees.find(e => e.id === record.employee_id);
                  return (
                    <TableRow key={record.id} className="group">
                      <TableCell className="text-xs">
                        {format(parseISO(record.date), 'dd MMM yyyy')}
                      </TableCell>
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
                          record.status === 'Late' && "bg-amber-500/10 text-amber-500",
                          record.status === 'Absent' && "bg-destructive/10 text-destructive"
                        )}>
                          {record.status}
                        </span>
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
                })}
              {attendance.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No attendance records found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        {attendance.length > 50 && (
          <p className="text-xs text-muted-foreground text-center">
            Showing first 50 records. Use search to find specific records.
          </p>
        )}
      </div>

      {/* Edit Attendance Dialog */}
      <Dialog open={!!editRecord} onOpenChange={() => setEditRecord(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-5 h-5 text-primary" />
              Edit Attendance Record
            </DialogTitle>
            <DialogDescription>
              Modify check-in and check-out times for {editRecord?.employee_name} on {editRecord?.date ? format(parseISO(editRecord.date), 'dd MMM yyyy') : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditRecord(null)}>Cancel</Button>
            <Button 
              onClick={() => {
                if (editRecord) {
                  const checkInTime = editRecord.check_in || undefined;
                  const isLate = checkInTime && checkInTime > '08:00';
                  updateAttendance.mutate({
                    id: editRecord.id,
                    check_in: checkInTime,
                    check_out: editRecord.check_out || undefined,
                    status: checkInTime ? (isLate ? 'Late' : 'Present') : 'Absent',
                  });
                  setEditRecord(null);
                }
              }}
              className="bg-primary text-primary-foreground"
            >
              Save Changes
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
                  deleteAttendance.mutate(deleteConfirm);
                  setDeleteConfirm(null);
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
