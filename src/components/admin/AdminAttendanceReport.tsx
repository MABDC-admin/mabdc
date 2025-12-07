import { useState, useMemo } from 'react';
import { useAttendance } from '@/hooks/useAttendance';
import { useEmployees } from '@/hooks/useEmployees';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, FileText, Calendar, Clock, Users } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isWeekend, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

export function AdminAttendanceReport() {
  const { data: attendance = [] } = useAttendance();
  const { data: employees = [] } = useEmployees();
  
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(format(currentDate, 'yyyy-MM'));

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
    </div>
  );
}
