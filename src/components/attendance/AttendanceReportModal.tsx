import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileSpreadsheet, FileText, Download, Calendar, Users, AlertTriangle } from 'lucide-react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, parseISO, isWithinInterval, differenceInDays, eachDayOfInterval } from 'date-fns';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Employee {
  id: string;
  full_name: string;
  hrms_no: string;
  department: string;
}

interface AttendanceRecord {
  id: string;
  employee_id: string;
  date: string;
  check_in?: string;
  check_out?: string;
  status: string;
  employee_remarks?: string;
  admin_remarks?: string;
  employees?: {
    full_name: string;
    hrms_no: string;
  };
}

interface AttendanceReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  attendance: AttendanceRecord[];
  employees: Employee[];
}

type ReportType = 'daily' | 'weekly' | 'monthly';

export function AttendanceReportModal({ 
  isOpen, 
  onClose, 
  attendance,
  employees 
}: AttendanceReportModalProps) {
  const [reportType, setReportType] = useState<ReportType>('daily');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');

  const getDateRange = useMemo(() => {
    const date = parseISO(selectedDate);
    switch (reportType) {
      case 'daily':
        return { start: date, end: date };
      case 'weekly':
        return { start: startOfWeek(date, { weekStartsOn: 0 }), end: endOfWeek(date, { weekStartsOn: 0 }) };
      case 'monthly':
        return { start: startOfMonth(date), end: endOfMonth(date) };
    }
  }, [reportType, selectedDate]);

  const filteredRecords = useMemo(() => {
    return attendance.filter(record => {
      const recordDate = parseISO(record.date);
      const inRange = isWithinInterval(recordDate, getDateRange);
      const matchesEmployee = selectedEmployee === 'all' || record.employee_id === selectedEmployee;
      return inRange && matchesEmployee;
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [attendance, getDateRange, selectedEmployee]);

  const reportStats = useMemo(() => {
    const presentCount = filteredRecords.filter(r => r.status === 'Present').length;
    const lateCount = filteredRecords.filter(r => r.status === 'Late').length;
    const absentCount = filteredRecords.filter(r => r.status === 'Absent').length;
    const halfDayCount = filteredRecords.filter(r => r.status === 'Half Day').length;
    const totalDays = differenceInDays(getDateRange.end, getDateRange.start) + 1;
    
    // Calculate late count for the month (for monthly summary)
    const monthlyLateCount = attendance.filter(r => {
      const recordDate = parseISO(r.date);
      const monthStart = startOfMonth(parseISO(selectedDate));
      const monthEnd = endOfMonth(parseISO(selectedDate));
      const matchesEmployee = selectedEmployee === 'all' || r.employee_id === selectedEmployee;
      return isWithinInterval(recordDate, { start: monthStart, end: monthEnd }) && 
             r.status === 'Late' && 
             matchesEmployee;
    }).length;

    return { presentCount, lateCount, absentCount, halfDayCount, totalDays, monthlyLateCount };
  }, [filteredRecords, getDateRange, attendance, selectedDate, selectedEmployee]);

  const exportToExcel = () => {
    const workbook = XLSX.utils.book_new();
    
    // Prepare data
    const data = filteredRecords.map(record => ({
      'Date': format(parseISO(record.date), 'dd/MM/yyyy'),
      'Day': format(parseISO(record.date), 'EEEE'),
      'Employee': record.employees?.full_name || 'Unknown',
      'HRMS No': record.employees?.hrms_no || '',
      'Check In': record.check_in || '-',
      'Check Out': record.check_out || '-',
      'Status': record.status,
      'Employee Remarks': record.employee_remarks || '',
      'Admin Remarks': record.admin_remarks || '',
    }));

    // Add summary row
    data.push({} as any);
    data.push({
      'Date': 'SUMMARY',
      'Day': '',
      'Employee': '',
      'HRMS No': '',
      'Check In': `Present: ${reportStats.presentCount}`,
      'Check Out': `Late: ${reportStats.lateCount}`,
      'Status': `Absent: ${reportStats.absentCount}`,
      'Employee Remarks': '',
      'Admin Remarks': `Monthly Lates: ${reportStats.monthlyLateCount}`,
    } as any);

    const worksheet = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance Report');

    const fileName = `Attendance_Report_${reportType}_${format(parseISO(selectedDate), 'yyyy-MM-dd')}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Attendance Report', pageWidth / 2, 20, { align: 'center' });

    // Report info
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const periodText = reportType === 'daily' 
      ? format(parseISO(selectedDate), 'dd MMMM yyyy')
      : `${format(getDateRange.start, 'dd MMM yyyy')} - ${format(getDateRange.end, 'dd MMM yyyy')}`;
    doc.text(`Period: ${periodText}`, 14, 30);
    doc.text(`Report Type: ${reportType.charAt(0).toUpperCase() + reportType.slice(1)}`, 14, 36);
    doc.text(`Generated: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 42);

    // Summary
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Summary', 14, 52);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Present: ${reportStats.presentCount} | Late: ${reportStats.lateCount} | Absent: ${reportStats.absentCount} | Monthly Lates: ${reportStats.monthlyLateCount}`, 14, 58);

    // Table
    const tableData = filteredRecords.map(record => [
      format(parseISO(record.date), 'dd/MM/yyyy'),
      record.employees?.full_name || 'Unknown',
      record.employees?.hrms_no || '',
      record.check_in || '-',
      record.check_out || '-',
      record.status,
      record.admin_remarks || record.employee_remarks || '',
    ]);

    autoTable(doc, {
      startY: 65,
      head: [['Date', 'Employee', 'HRMS', 'In', 'Out', 'Status', 'Remarks']],
      body: tableData,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [74, 222, 128] },
      didParseCell: (data) => {
        // Red color for Late status
        if (data.column.index === 5 && data.cell.text[0] === 'Late') {
          data.cell.styles.textColor = [220, 38, 38];
          data.cell.styles.fontStyle = 'bold';
        }
      },
    });

    const fileName = `Attendance_Report_${reportType}_${format(parseISO(selectedDate), 'yyyy-MM-dd')}.pdf`;
    doc.save(fileName);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="glass-card border-border max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Attendance Report
          </DialogTitle>
        </DialogHeader>

        <Tabs value={reportType} onValueChange={(v) => setReportType(v as ReportType)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="daily">Daily</TabsTrigger>
            <TabsTrigger value="weekly">Weekly</TabsTrigger>
            <TabsTrigger value="monthly">Monthly</TabsTrigger>
          </TabsList>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className="space-y-2">
              <Label>Select Date</Label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-secondary/50 border-border"
              />
            </div>
            <div className="space-y-2">
              <Label>Filter Employee</Label>
              <select
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(e.target.value)}
                className="w-full p-2 rounded-lg bg-secondary/50 border border-border text-foreground"
              >
                <option value="all">All Employees</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.full_name} ({emp.hrms_no})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
            <div className="p-3 rounded-xl bg-primary/10 border border-primary/30">
              <p className="text-xs text-muted-foreground">Present</p>
              <p className="text-2xl font-bold text-primary">{reportStats.presentCount}</p>
            </div>
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
              <p className="text-xs text-muted-foreground">Late</p>
              <p className="text-2xl font-bold text-amber-400">{reportStats.lateCount}</p>
            </div>
            <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/30">
              <p className="text-xs text-muted-foreground">Absent</p>
              <p className="text-2xl font-bold text-destructive">{reportStats.absentCount}</p>
            </div>
            <div className="p-3 rounded-xl bg-accent/10 border border-accent/30 flex flex-col">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Monthly Lates
              </p>
              <p className="text-2xl font-bold text-destructive">{reportStats.monthlyLateCount}</p>
            </div>
          </div>

          {/* Preview Table */}
          <div className="mt-4 rounded-xl border border-border overflow-hidden">
            <div className="max-h-64 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary/50 sticky top-0">
                  <tr>
                    <th className="text-left p-2">Date</th>
                    <th className="text-left p-2">Employee</th>
                    <th className="text-left p-2">In</th>
                    <th className="text-left p-2">Out</th>
                    <th className="text-left p-2">Status</th>
                    <th className="text-left p-2">Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center p-4 text-muted-foreground">
                        No records found for selected period
                      </td>
                    </tr>
                  ) : (
                    filteredRecords.map((record) => (
                      <tr key={record.id} className="border-t border-border">
                        <td className="p-2">{format(parseISO(record.date), 'dd/MM')}</td>
                        <td className="p-2">{record.employees?.full_name}</td>
                        <td className="p-2">{record.check_in || '-'}</td>
                        <td className="p-2">{record.check_out || '-'}</td>
                        <td className={`p-2 font-medium ${record.status === 'Late' ? 'text-destructive' : ''}`}>
                          {record.status}
                        </td>
                        <td className="p-2 text-xs text-muted-foreground truncate max-w-[150px]">
                          {record.admin_remarks || record.employee_remarks || '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Export Buttons */}
          <div className="flex gap-3 mt-4">
            <Button
              onClick={exportToExcel}
              className="flex-1 bg-primary hover:bg-primary/90"
              disabled={filteredRecords.length === 0}
            >
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Export XLSX
            </Button>
            <Button
              onClick={exportToPDF}
              variant="outline"
              className="flex-1 border-accent text-accent hover:bg-accent/10"
              disabled={filteredRecords.length === 0}
            >
              <FileText className="w-4 h-4 mr-2" />
              Export PDF
            </Button>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
