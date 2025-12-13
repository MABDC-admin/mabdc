import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useEmployees } from '@/hooks/useEmployees';
import { useAttendance } from '@/hooks/useAttendance';
import { useLeave } from '@/hooks/useLeave';
import { useContracts } from '@/hooks/useContracts';
import { usePayroll } from '@/hooks/usePayroll';
import { useTimeShifts } from '@/hooks/useTimeShifts';
import { useCompanySettings } from '@/hooks/useSettings';
import { useDiscipline } from '@/hooks/useDiscipline';
import { 
  FileText, Users, Calendar, Clock, DollarSign, FileCheck, Timer,
  Download, Filter, AlertTriangle, UserX
} from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, getDay, differenceInDays } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export function ReportsView() {
  const { data: employees = [] } = useEmployees();
  const { data: attendance = [] } = useAttendance();
  const { data: leaveRecords = [] } = useLeave();
  const { data: contracts = [] } = useContracts();
  const { data: payroll = [] } = usePayroll();
  const { data: shifts = [] } = useTimeShifts();
  const { data: settings } = useCompanySettings();
  const { data: disciplineRecords = [] } = useDiscipline();

  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(format(currentDate, 'yyyy-MM'));
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');

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

  const departments = useMemo(() => {
    const depts = [...new Set(employees.map(e => e.department))];
    return ['all', ...depts];
  }, [employees]);

  const filteredEmployees = useMemo(() => {
    if (selectedDepartment === 'all') return employees;
    return employees.filter(e => e.department === selectedDepartment);
  }, [employees, selectedDepartment]);

  // Employee Report Data
  const employeeReportData = useMemo(() => {
    return filteredEmployees.map((emp, idx) => {
      const contract = contracts.find(c => c.employee_id === emp.id && c.status === 'Active');
      return {
        no: idx + 1,
        hrmsNo: emp.hrms_no,
        name: emp.full_name,
        department: emp.department,
        position: emp.job_position,
        status: emp.status || 'Active',
        joiningDate: emp.joining_date,
        contractStatus: contract?.status || 'No Contract',
      };
    });
  }, [filteredEmployees, contracts]);

  // Attendance Report Data
  const attendanceReportData = useMemo(() => {
    const monthStart = startOfMonth(parseISO(`${selectedMonth}-01`));
    const monthEnd = endOfMonth(monthStart);
    
    return filteredEmployees.map((emp, idx) => {
      const empAttendance = attendance.filter(a => 
        a.employee_id === emp.id && 
        a.date >= format(monthStart, 'yyyy-MM-dd') &&
        a.date <= format(monthEnd, 'yyyy-MM-dd')
      );
      
      const present = empAttendance.filter(a => a.status === 'Present').length;
      const late = empAttendance.filter(a => a.status === 'Late').length;
      const absent = empAttendance.filter(a => a.status === 'Absent').length;
      const undertime = empAttendance.filter(a => a.status?.includes('Undertime')).length;
      
      return {
        no: idx + 1,
        hrmsNo: emp.hrms_no,
        name: emp.full_name,
        department: emp.department,
        present,
        late,
        absent,
        undertime,
        total: present + late,
      };
    });
  }, [filteredEmployees, attendance, selectedMonth]);

  // Leave Report Data
  const leaveReportData = useMemo(() => {
    const monthStart = startOfMonth(parseISO(`${selectedMonth}-01`));
    const monthEnd = endOfMonth(monthStart);
    
    return leaveRecords
      .filter(l => {
        const startDate = parseISO(l.start_date);
        return startDate >= monthStart && startDate <= monthEnd;
      })
      .filter(l => {
        if (selectedDepartment === 'all') return true;
        const emp = employees.find(e => e.id === l.employee_id);
        return emp?.department === selectedDepartment;
      })
      .map((l, idx) => {
        const emp = employees.find(e => e.id === l.employee_id);
        return {
          no: idx + 1,
          hrmsNo: emp?.hrms_no || '',
          name: emp?.full_name || 'Unknown',
          leaveType: l.leave_type,
          startDate: l.start_date,
          endDate: l.end_date,
          days: l.days_count,
          status: l.status,
        };
      });
  }, [leaveRecords, employees, selectedMonth, selectedDepartment]);

  // Contract Report Data
  const contractReportData = useMemo(() => {
    return contracts
      .filter(c => {
        if (selectedDepartment === 'all') return true;
        const emp = employees.find(e => e.id === c.employee_id);
        return emp?.department === selectedDepartment;
      })
      .map((c, idx) => {
        const emp = employees.find(e => e.id === c.employee_id);
        const daysLeft = c.end_date ? differenceInDays(parseISO(c.end_date), new Date()) : null;
        return {
          no: idx + 1,
          hrmsNo: emp?.hrms_no || '',
          name: emp?.full_name || 'Unknown',
          contractType: c.contract_type,
          mohreNo: c.mohre_contract_no,
          startDate: c.start_date,
          endDate: c.end_date || 'Unlimited',
          status: c.status,
          daysLeft: daysLeft !== null ? (daysLeft > 0 ? `${daysLeft} days` : 'Expired') : 'N/A',
        };
      });
  }, [contracts, employees, selectedDepartment]);

  // Time Clock Report Data
  const timeClockReportData = useMemo(() => {
    const monthStart = startOfMonth(parseISO(`${selectedMonth}-01`));
    const monthEnd = endOfMonth(monthStart);
    
    return filteredEmployees.map((emp, idx) => {
      const shift = shifts.find(s => s.employee_id === emp.id);
      const empAttendance = attendance.filter(a => 
        a.employee_id === emp.id && 
        a.date >= format(monthStart, 'yyyy-MM-dd') &&
        a.date <= format(monthEnd, 'yyyy-MM-dd')
      );
      
      const onTime = empAttendance.filter(a => a.status === 'Present' || a.status === 'on_time').length;
      const lateEntry = empAttendance.filter(a => a.status === 'Late' || a.status === 'late_entry').length;
      const earlyOut = empAttendance.filter(a => a.status?.includes('early_out') || a.status?.includes('Undertime')).length;
      const missedPunch = empAttendance.filter(a => a.status?.includes('miss_punch')).length;
      
      return {
        no: idx + 1,
        hrmsNo: emp.hrms_no,
        name: emp.full_name,
        shift: shift?.shift_type || 'Not Assigned',
        onTime,
        lateEntry,
        earlyOut,
        missedPunch,
      };
    });
  }, [filteredEmployees, attendance, shifts, selectedMonth]);

  // Payroll Report Data
  const payrollReportData = useMemo(() => {
    return payroll
      .filter(p => p.month.startsWith(selectedMonth))
      .filter(p => {
        if (selectedDepartment === 'all') return true;
        const emp = employees.find(e => e.id === p.employee_id);
        return emp?.department === selectedDepartment;
      })
      .map((p, idx) => {
        const emp = employees.find(e => e.id === p.employee_id);
        return {
          no: idx + 1,
          hrmsNo: emp?.hrms_no || '',
          name: emp?.full_name || 'Unknown',
          basicSalary: p.basic_salary,
          allowances: p.allowances || 0,
          deductions: p.deductions || 0,
          netSalary: p.net_salary,
          wpsStatus: p.wps_processed ? 'Processed' : 'Pending',
        };
      });
  }, [payroll, employees, selectedMonth, selectedDepartment]);

  // EOS Report Data - Calculate gratuity for all employees
  const eosReportData = useMemo(() => {
    return filteredEmployees
      .map((emp, idx) => {
        const start = new Date(emp.joining_date);
        const now = new Date();
        const years = (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365);
        const basicSalary = emp.basic_salary || 0;
        
        let gratuity = 0;
        if (years >= 1) {
          if (years <= 5) {
            gratuity = Math.round((21 / 30) * basicSalary * years);
          } else {
            const first5 = (21 / 30) * basicSalary * 5;
            const remaining = (30 / 30) * basicSalary * (years - 5);
            gratuity = Math.round(first5 + remaining);
          }
        }
        
        return {
          no: idx + 1,
          hrmsNo: emp.hrms_no,
          name: emp.full_name,
          department: emp.department,
          joiningDate: emp.joining_date,
          yearsOfService: Math.round(years * 10) / 10,
          basicSalary,
          gratuity,
        };
      })
      .filter(e => e.yearsOfService >= 1);
  }, [filteredEmployees]);

  // Discipline Report Data
  const disciplineReportData = useMemo(() => {
    return disciplineRecords
      .filter(d => {
        if (selectedDepartment === 'all') return true;
        const emp = employees.find(e => e.id === d.employee_id);
        return emp?.department === selectedDepartment;
      })
      .map((d, idx) => {
        const emp = employees.find(e => e.id === d.employee_id);
        return {
          no: idx + 1,
          hrmsNo: emp?.hrms_no || d.employees?.hrms_no || '',
          name: emp?.full_name || d.employees?.full_name || 'Unknown',
          incidentType: d.incident_type,
          incidentDate: d.incident_date,
          description: d.description,
          actionTaken: d.action_taken || '-',
          status: d.status || 'Active',
          issuedBy: d.issued_by || '-',
        };
      });
  }, [disciplineRecords, employees, selectedDepartment]);

  const generatePDF = (reportType: string, data: any[], columns: { header: string; key: string }[]) => {
    const doc = new jsPDF('landscape');
    const companyName = settings?.company_name || 'MABDC';
    
    // Header
    doc.setFontSize(18);
    doc.text(companyName, 14, 15);
    doc.setFontSize(14);
    doc.text(`${reportType} Report`, 14, 25);
    doc.setFontSize(10);
    doc.text(`Month: ${format(parseISO(`${selectedMonth}-01`), 'MMMM yyyy')}`, 14, 32);
    doc.text(`Generated: ${format(new Date(), 'MMM dd, yyyy HH:mm')}`, 14, 38);
    if (selectedDepartment !== 'all') {
      doc.text(`Department: ${selectedDepartment}`, 14, 44);
    }
    
    // Table
    autoTable(doc, {
      startY: selectedDepartment !== 'all' ? 50 : 44,
      head: [columns.map(c => c.header)],
      body: data.map(row => columns.map(c => row[c.key]?.toString() || '')),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [59, 130, 246], textColor: 255 },
      alternateRowStyles: { fillColor: [245, 247, 250] },
    });
    
    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.width - 30, doc.internal.pageSize.height - 10);
    }
    
    doc.save(`${reportType.toLowerCase().replace(/\s+/g, '-')}-report-${selectedMonth}.pdf`);
  };

  const reportTabs = [
    { id: 'employees', label: 'Employees', icon: Users },
    { id: 'attendance', label: 'Attendance', icon: Clock },
    { id: 'leave', label: 'Leave', icon: Calendar },
    { id: 'contracts', label: 'Contracts', icon: FileCheck },
    { id: 'timeclock', label: 'Time Clock', icon: Timer },
    { id: 'payroll', label: 'Payroll', icon: DollarSign },
    { id: 'eos', label: 'EOS', icon: UserX },
    { id: 'discipline', label: 'Discipline', icon: AlertTriangle },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FileText className="w-6 h-6" />
            Reports
          </h1>
          <p className="text-muted-foreground">Generate and export HR reports</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filters:</span>
            </div>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select month" />
              </SelectTrigger>
              <SelectContent>
                {months.map((m) => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent>
                {departments.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d === 'all' ? 'All Departments' : d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Report Tabs */}
      <Tabs defaultValue="employees" className="w-full">
        <TabsList className="grid grid-cols-8 w-full">
          {reportTabs.map((tab) => (
            <TabsTrigger key={tab.id} value={tab.id} className="flex items-center gap-2">
              <tab.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Employees Report */}
        <TabsContent value="employees">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Employee Report
              </CardTitle>
              <Button
                onClick={() => generatePDF('Employee', employeeReportData, [
                  { header: '#', key: 'no' },
                  { header: 'HRMS No.', key: 'hrmsNo' },
                  { header: 'Name', key: 'name' },
                  { header: 'Department', key: 'department' },
                  { header: 'Position', key: 'position' },
                  { header: 'Status', key: 'status' },
                  { header: 'Joining Date', key: 'joiningDate' },
                  { header: 'Contract', key: 'contractStatus' },
                ])}
                className="gap-2"
              >
                <Download className="w-4 h-4" />
                Export PDF
              </Button>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-auto max-h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>HRMS No.</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Position</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Joining Date</TableHead>
                      <TableHead>Contract</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employeeReportData.map((row) => (
                      <TableRow key={row.no}>
                        <TableCell>{row.no}</TableCell>
                        <TableCell className="font-mono">{row.hrmsNo}</TableCell>
                        <TableCell className="font-medium">{row.name}</TableCell>
                        <TableCell>{row.department}</TableCell>
                        <TableCell>{row.position}</TableCell>
                        <TableCell>
                          <Badge variant={row.status === 'Active' ? 'default' : 'secondary'}>
                            {row.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{row.joiningDate}</TableCell>
                        <TableCell>
                          <Badge variant={row.contractStatus === 'Active' ? 'default' : 'outline'}>
                            {row.contractStatus}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Total: {employeeReportData.length} employees
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Attendance Report */}
        <TabsContent value="attendance">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Attendance Report - {format(parseISO(`${selectedMonth}-01`), 'MMMM yyyy')}
              </CardTitle>
              <Button
                onClick={() => generatePDF('Attendance', attendanceReportData, [
                  { header: '#', key: 'no' },
                  { header: 'HRMS No.', key: 'hrmsNo' },
                  { header: 'Name', key: 'name' },
                  { header: 'Department', key: 'department' },
                  { header: 'Present', key: 'present' },
                  { header: 'Late', key: 'late' },
                  { header: 'Absent', key: 'absent' },
                  { header: 'Undertime', key: 'undertime' },
                  { header: 'Total Days', key: 'total' },
                ])}
                className="gap-2"
              >
                <Download className="w-4 h-4" />
                Export PDF
              </Button>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-auto max-h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>HRMS No.</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead className="text-center">Present</TableHead>
                      <TableHead className="text-center">Late</TableHead>
                      <TableHead className="text-center">Absent</TableHead>
                      <TableHead className="text-center">Undertime</TableHead>
                      <TableHead className="text-center">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attendanceReportData.map((row) => (
                      <TableRow key={row.no}>
                        <TableCell>{row.no}</TableCell>
                        <TableCell className="font-mono">{row.hrmsNo}</TableCell>
                        <TableCell className="font-medium">{row.name}</TableCell>
                        <TableCell>{row.department}</TableCell>
                        <TableCell className="text-center text-green-600 font-medium">{row.present}</TableCell>
                        <TableCell className="text-center text-amber-600 font-medium">{row.late}</TableCell>
                        <TableCell className="text-center text-red-600 font-medium">{row.absent}</TableCell>
                        <TableCell className="text-center text-orange-600 font-medium">{row.undertime}</TableCell>
                        <TableCell className="text-center font-bold">{row.total}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Leave Report */}
        <TabsContent value="leave">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Leave Report - {format(parseISO(`${selectedMonth}-01`), 'MMMM yyyy')}
              </CardTitle>
              <Button
                onClick={() => generatePDF('Leave', leaveReportData, [
                  { header: '#', key: 'no' },
                  { header: 'HRMS No.', key: 'hrmsNo' },
                  { header: 'Name', key: 'name' },
                  { header: 'Leave Type', key: 'leaveType' },
                  { header: 'Start Date', key: 'startDate' },
                  { header: 'End Date', key: 'endDate' },
                  { header: 'Days', key: 'days' },
                  { header: 'Status', key: 'status' },
                ])}
                className="gap-2"
              >
                <Download className="w-4 h-4" />
                Export PDF
              </Button>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-auto max-h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>HRMS No.</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Leave Type</TableHead>
                      <TableHead>Start Date</TableHead>
                      <TableHead>End Date</TableHead>
                      <TableHead className="text-center">Days</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leaveReportData.length > 0 ? leaveReportData.map((row) => (
                      <TableRow key={row.no}>
                        <TableCell>{row.no}</TableCell>
                        <TableCell className="font-mono">{row.hrmsNo}</TableCell>
                        <TableCell className="font-medium">{row.name}</TableCell>
                        <TableCell>{row.leaveType}</TableCell>
                        <TableCell>{row.startDate}</TableCell>
                        <TableCell>{row.endDate}</TableCell>
                        <TableCell className="text-center font-medium">{row.days}</TableCell>
                        <TableCell>
                          <Badge variant={row.status === 'Approved' ? 'default' : row.status === 'Pending' ? 'secondary' : 'destructive'}>
                            {row.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                          No leave records for this month
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Total: {leaveReportData.length} leave records
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contracts Report */}
        <TabsContent value="contracts">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileCheck className="w-5 h-5" />
                Contract Report
              </CardTitle>
              <Button
                onClick={() => generatePDF('Contract', contractReportData, [
                  { header: '#', key: 'no' },
                  { header: 'HRMS No.', key: 'hrmsNo' },
                  { header: 'Name', key: 'name' },
                  { header: 'Type', key: 'contractType' },
                  { header: 'MOHRE No.', key: 'mohreNo' },
                  { header: 'Start Date', key: 'startDate' },
                  { header: 'End Date', key: 'endDate' },
                  { header: 'Status', key: 'status' },
                  { header: 'Days Left', key: 'daysLeft' },
                ])}
                className="gap-2"
              >
                <Download className="w-4 h-4" />
                Export PDF
              </Button>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-auto max-h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>HRMS No.</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>MOHRE No.</TableHead>
                      <TableHead>Start Date</TableHead>
                      <TableHead>End Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Days Left</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contractReportData.map((row) => (
                      <TableRow key={row.no}>
                        <TableCell>{row.no}</TableCell>
                        <TableCell className="font-mono">{row.hrmsNo}</TableCell>
                        <TableCell className="font-medium">{row.name}</TableCell>
                        <TableCell>{row.contractType}</TableCell>
                        <TableCell>{row.mohreNo}</TableCell>
                        <TableCell>{row.startDate}</TableCell>
                        <TableCell>{row.endDate}</TableCell>
                        <TableCell>
                          <Badge variant={row.status === 'Active' ? 'default' : 'secondary'}>
                            {row.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={row.daysLeft === 'Expired' ? 'destructive' : 'outline'}>
                            {row.daysLeft}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Total: {contractReportData.length} contracts
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Time Clock Report */}
        <TabsContent value="timeclock">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Timer className="w-5 h-5" />
                Time Clock Report - {format(parseISO(`${selectedMonth}-01`), 'MMMM yyyy')}
              </CardTitle>
              <Button
                onClick={() => generatePDF('Time Clock', timeClockReportData, [
                  { header: '#', key: 'no' },
                  { header: 'HRMS No.', key: 'hrmsNo' },
                  { header: 'Name', key: 'name' },
                  { header: 'Shift', key: 'shift' },
                  { header: 'On Time', key: 'onTime' },
                  { header: 'Late Entry', key: 'lateEntry' },
                  { header: 'Early Out', key: 'earlyOut' },
                  { header: 'Missed Punch', key: 'missedPunch' },
                ])}
                className="gap-2"
              >
                <Download className="w-4 h-4" />
                Export PDF
              </Button>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-auto max-h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>HRMS No.</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Shift</TableHead>
                      <TableHead className="text-center">On Time</TableHead>
                      <TableHead className="text-center">Late Entry</TableHead>
                      <TableHead className="text-center">Early Out</TableHead>
                      <TableHead className="text-center">Missed Punch</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {timeClockReportData.map((row) => (
                      <TableRow key={row.no}>
                        <TableCell>{row.no}</TableCell>
                        <TableCell className="font-mono">{row.hrmsNo}</TableCell>
                        <TableCell className="font-medium">{row.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{row.shift}</Badge>
                        </TableCell>
                        <TableCell className="text-center text-green-600 font-medium">{row.onTime}</TableCell>
                        <TableCell className="text-center text-amber-600 font-medium">{row.lateEntry}</TableCell>
                        <TableCell className="text-center text-orange-600 font-medium">{row.earlyOut}</TableCell>
                        <TableCell className="text-center text-red-600 font-medium">{row.missedPunch}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payroll Report */}
        <TabsContent value="payroll">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Payroll Report - {format(parseISO(`${selectedMonth}-01`), 'MMMM yyyy')}
              </CardTitle>
              <Button
                onClick={() => generatePDF('Payroll', payrollReportData, [
                  { header: '#', key: 'no' },
                  { header: 'HRMS No.', key: 'hrmsNo' },
                  { header: 'Name', key: 'name' },
                  { header: 'Basic Salary', key: 'basicSalary' },
                  { header: 'Allowances', key: 'allowances' },
                  { header: 'Deductions', key: 'deductions' },
                  { header: 'Net Salary', key: 'netSalary' },
                  { header: 'WPS Status', key: 'wpsStatus' },
                ])}
                className="gap-2"
              >
                <Download className="w-4 h-4" />
                Export PDF
              </Button>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-auto max-h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>HRMS No.</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead className="text-right">Basic Salary</TableHead>
                      <TableHead className="text-right">Allowances</TableHead>
                      <TableHead className="text-right">Deductions</TableHead>
                      <TableHead className="text-right">Net Salary</TableHead>
                      <TableHead>WPS Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payrollReportData.length > 0 ? payrollReportData.map((row) => (
                      <TableRow key={row.no}>
                        <TableCell>{row.no}</TableCell>
                        <TableCell className="font-mono">{row.hrmsNo}</TableCell>
                        <TableCell className="font-medium">{row.name}</TableCell>
                        <TableCell className="text-right">AED {row.basicSalary.toLocaleString()}</TableCell>
                        <TableCell className="text-right text-green-600">AED {row.allowances.toLocaleString()}</TableCell>
                        <TableCell className="text-right text-red-600">AED {row.deductions.toLocaleString()}</TableCell>
                        <TableCell className="text-right font-bold">AED {row.netSalary.toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant={row.wpsStatus === 'Processed' ? 'default' : 'secondary'}>
                            {row.wpsStatus}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                          No payroll records for this month
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              {payrollReportData.length > 0 && (
                <div className="flex justify-end mt-4 p-4 bg-secondary/30 rounded-lg">
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Total Net Payroll</p>
                    <p className="text-xl font-bold">
                      AED {payrollReportData.reduce((sum, r) => sum + r.netSalary, 0).toLocaleString()}
                    </p>
                  </div>
                </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

        {/* EOS Report */}
        <TabsContent value="eos">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <UserX className="w-5 h-5" />
                End of Service (EOS) Report
              </CardTitle>
              <Button
                onClick={() => generatePDF('EOS', eosReportData, [
                  { header: '#', key: 'no' },
                  { header: 'HRMS No.', key: 'hrmsNo' },
                  { header: 'Name', key: 'name' },
                  { header: 'Department', key: 'department' },
                  { header: 'Joining Date', key: 'joiningDate' },
                  { header: 'Years of Service', key: 'yearsOfService' },
                  { header: 'Basic Salary', key: 'basicSalary' },
                  { header: 'Gratuity (AED)', key: 'gratuity' },
                ])}
                className="gap-2"
              >
                <Download className="w-4 h-4" />
                Export PDF
              </Button>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-auto max-h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>HRMS No.</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Joining Date</TableHead>
                      <TableHead className="text-center">Years of Service</TableHead>
                      <TableHead className="text-right">Basic Salary</TableHead>
                      <TableHead className="text-right">Gratuity (AED)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {eosReportData.length > 0 ? eosReportData.map((row) => (
                      <TableRow key={row.no}>
                        <TableCell>{row.no}</TableCell>
                        <TableCell className="font-mono">{row.hrmsNo}</TableCell>
                        <TableCell className="font-medium">{row.name}</TableCell>
                        <TableCell>{row.department}</TableCell>
                        <TableCell>{row.joiningDate}</TableCell>
                        <TableCell className="text-center font-medium">{row.yearsOfService}</TableCell>
                        <TableCell className="text-right">AED {row.basicSalary.toLocaleString()}</TableCell>
                        <TableCell className="text-right font-bold text-primary">AED {row.gratuity.toLocaleString()}</TableCell>
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                          No employees with 1+ years of service
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              {eosReportData.length > 0 && (
                <div className="flex justify-end mt-4 p-4 bg-secondary/30 rounded-lg">
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Total EOS Liability</p>
                    <p className="text-xl font-bold text-primary">
                      AED {eosReportData.reduce((sum, r) => sum + r.gratuity, 0).toLocaleString()}
                    </p>
                  </div>
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-2">
                * Calculated per UAE Labor Law: 21 days salary/year for first 5 years, 30 days/year thereafter.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Discipline Report */}
        <TabsContent value="discipline">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Discipline Report
              </CardTitle>
              <Button
                onClick={() => generatePDF('Discipline', disciplineReportData, [
                  { header: '#', key: 'no' },
                  { header: 'HRMS No.', key: 'hrmsNo' },
                  { header: 'Name', key: 'name' },
                  { header: 'Incident Type', key: 'incidentType' },
                  { header: 'Incident Date', key: 'incidentDate' },
                  { header: 'Description', key: 'description' },
                  { header: 'Action Taken', key: 'actionTaken' },
                  { header: 'Status', key: 'status' },
                ])}
                className="gap-2"
              >
                <Download className="w-4 h-4" />
                Export PDF
              </Button>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-auto max-h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>HRMS No.</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Incident Type</TableHead>
                      <TableHead>Incident Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Action Taken</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {disciplineReportData.length > 0 ? disciplineReportData.map((row) => (
                      <TableRow key={row.no}>
                        <TableCell>{row.no}</TableCell>
                        <TableCell className="font-mono">{row.hrmsNo}</TableCell>
                        <TableCell className="font-medium">{row.name}</TableCell>
                        <TableCell>
                          <Badge variant={
                            row.incidentType === 'Termination' ? 'destructive' : 
                            row.incidentType === 'Suspension' ? 'destructive' :
                            row.incidentType === 'Final Warning' ? 'destructive' :
                            'secondary'
                          }>
                            {row.incidentType}
                          </Badge>
                        </TableCell>
                        <TableCell>{row.incidentDate}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{row.description}</TableCell>
                        <TableCell>{row.actionTaken}</TableCell>
                        <TableCell>
                          <Badge variant={
                            row.status === 'Resolved' ? 'default' : 
                            row.status === 'Active' ? 'secondary' : 
                            'outline'
                          }>
                            {row.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                          No discipline records found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Total: {disciplineReportData.length} discipline records
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
