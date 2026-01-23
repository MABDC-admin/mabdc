import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Download, Grid3X3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, parseISO, isSameDay, isWithinInterval } from 'date-fns';
import { useAttendance } from '@/hooks/useAttendance';
import { useEmployees } from '@/hooks/useEmployees';
import { useCompanySettings } from '@/hooks/useSettings';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import jsPDF from 'jspdf';
import { toast } from 'sonner';
import { getWeekendDays } from '@/utils/workWeekUtils';
interface AttendanceMatrixViewProps {
  onBack: () => void;
}

export function AttendanceMatrixView({ onBack }: AttendanceMatrixViewProps) {
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth());
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  
  const { data: allAttendance = [] } = useAttendance();
  const { data: employees = [] } = useEmployees();
  const { data: companySettings } = useCompanySettings();

  // Calculate weekend days from company settings
  const weekendDays = useMemo(() => {
    return getWeekendDays(
      companySettings?.work_week_start || 'Monday',
      companySettings?.work_week_end || 'Friday'
    );
  }, [companySettings?.work_week_start, companySettings?.work_week_end]);

  // Fetch public holidays
  const { data: publicHolidays = [] } = useQuery({
    queryKey: ['public_holidays'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('public_holidays')
        .select('*');
      if (error) throw error;
      return data;
    },
  });

  // Fetch approved leave records
  const { data: leaveRecords = [] } = useQuery({
    queryKey: ['leave_records'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leave_records')
        .select('*')
        .eq('status', 'Approved');
      if (error) throw error;
      return data;
    },
  });

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Generate days of the month
  const daysInMonth = useMemo(() => {
    const monthStart = startOfMonth(new Date(selectedYear, selectedMonth));
    const monthEnd = endOfMonth(monthStart);
    return eachDayOfInterval({ start: monthStart, end: monthEnd });
  }, [selectedMonth, selectedYear]);

  const getHolidayForDay = (date: Date) => {
    return publicHolidays.find(h => isSameDay(parseISO(h.date), date));
  };

  const getAttendanceForEmployeeDay = (employeeId: string, date: Date) => {
    return allAttendance.find(a => 
      a.employee_id === employeeId && isSameDay(parseISO(a.date), date)
    );
  };

  const getLeaveForEmployeeDay = (employeeId: string, date: Date) => {
    return leaveRecords.find(l => 
      l.employee_id === employeeId && 
      isWithinInterval(date, { 
        start: parseISO(l.start_date), 
        end: parseISO(l.end_date) 
      })
    );
  };

  const getDayStatus = (employeeId: string, date: Date) => {
    const attendance = getAttendanceForEmployeeDay(employeeId, date);
    const holiday = getHolidayForDay(date);
    const leave = getLeaveForEmployeeDay(employeeId, date);
    const dayOfWeek = getDay(date);
    const isWeekend = weekendDays.includes(dayOfWeek);
    
    // CHECK LEAVE FIRST - before weekends! So leave shows on Sat/Sun too
    if (leave) {
      const leaveType = leave.leave_type?.toLowerCase() || '';
      if (leaveType.includes('maternity')) {
        return { type: 'maternity', color: 'bg-pink-500/30', textColor: 'text-pink-600', label: 'ML' };
      }
      if (leaveType.includes('sick')) {
        return { type: 'sick-leave', color: 'bg-lime-500/30', textColor: 'text-lime-600', label: 'SL' };
      }
      // Default to vacation/annual leave
      return { type: 'leave', color: 'bg-blue-500/30', textColor: 'text-blue-600', label: 'VL' };
    }
    
    // Weekends (only if NOT on leave)
    if (isWeekend) {
      return { type: 'weekend', color: 'bg-zinc-600', textColor: 'text-white', label: 'W' };
    }
    
    if (holiday) {
      return { type: 'holiday', color: 'bg-sky-400/50', textColor: 'text-sky-800 dark:text-sky-200', label: 'H' };
    }
    
    if (!attendance) {
      return { type: 'no-record', color: 'bg-muted', textColor: 'text-muted-foreground', label: '-' };
    }

    // Check database status FIRST before raw punch data
    const status = attendance.status?.toLowerCase() || '';
    
    // Appealed - Cyan
    if (status === 'appealed') {
      return { type: 'appealed', color: 'bg-cyan-500/30', textColor: 'text-cyan-600', label: 'AP' };
    }
    
    // Missed Punch statuses - Orange
    if (status.includes('miss punch') || status === 'missed punch') {
      return { type: 'missed-punch', color: 'bg-orange-500/30', textColor: 'text-orange-600', label: 'M' };
    }
    
    // Undertime - Purple
    if (status === 'undertime') {
      return { type: 'undertime', color: 'bg-purple-500/30', textColor: 'text-purple-600', label: 'U' };
    }
    
    // Late (includes Late | Undertime) - Yellow
    if (status.includes('late')) {
      return { type: 'late', color: 'bg-yellow-500/30', textColor: 'text-yellow-600', label: 'L' };
    }
    
    // Half Day - Orange
    if (status === 'half day') {
      return { type: 'half-day', color: 'bg-orange-400/30', textColor: 'text-orange-500', label: 'HD' };
    }
    
    // On Leave - Blue
    if (status === 'on leave') {
      return { type: 'leave', color: 'bg-blue-500/30', textColor: 'text-blue-600', label: 'LV' };
    }
    
    // Present - Green
    if (status === 'present') {
      return { type: 'present', color: 'bg-green-500/30', textColor: 'text-green-600', label: 'P' };
    }
    
    // Absent - Red
    if (status === 'absent') {
      return { type: 'absent', color: 'bg-red-500/30', textColor: 'text-red-600', label: 'A' };
    }
    
    // Fallback: check raw punch data only if no recognized status
    const isMissedPunch = (attendance.check_in && !attendance.check_out) || (!attendance.check_in && attendance.check_out);
    if (isMissedPunch) {
      return { type: 'missed-punch', color: 'bg-orange-500/30', textColor: 'text-orange-600', label: 'M' };
    }
    
    return { type: 'present', color: 'bg-green-500/30', textColor: 'text-green-600', label: 'P' };
  };

  // Calculate summary for each employee
  const employeeSummaries = useMemo(() => {
    return employees.map(emp => {
      let present = 0, late = 0, absent = 0, missedPunch = 0, appealed = 0, undertime = 0, onLeave = 0;
      
      daysInMonth.forEach(day => {
        const status = getDayStatus(emp.id, day);
        if (status.type === 'present') present++;
        else if (status.type === 'late') late++;
        else if (status.type === 'absent') absent++;
        else if (status.type === 'missed-punch') missedPunch++;
        else if (status.type === 'appealed') appealed++;
        else if (status.type === 'undertime') undertime++;
        else if (status.type === 'half-day') present++; // Count half day as present
        else if (status.type === 'leave' || status.type === 'maternity' || status.type === 'sick-leave') onLeave++;
      });
      
      // Count appealed as present for summary stats
      present += appealed;
      
      return { ...emp, present, late, absent, missedPunch, appealed, undertime, onLeave };
    });
  }, [employees, daysInMonth, allAttendance, leaveRecords, weekendDays]);

  // PDF Generation
  const generateMatrixPDF = () => {
    const doc = new jsPDF('landscape', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 5;
    const cellSize = 6;
    const nameWidth = 45;
    const summaryWidth = 32;

    // Header
    doc.setFillColor(34, 34, 34);
    doc.rect(0, 0, pageWidth, 18, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('All Employees Attendance Matrix', pageWidth / 2, 10, { align: 'center' });
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`${months[selectedMonth]} ${selectedYear} | Generated: ${format(new Date(), 'dd MMM yyyy')}`, pageWidth / 2, 15, { align: 'center' });

    // Legend
    const legendY = 22;
    doc.setFontSize(7);
    doc.setTextColor(0, 0, 0);
    doc.setFillColor(34, 197, 94); doc.rect(margin, legendY, 4, 4, 'F');
    doc.text('P = Present', margin + 5, legendY + 3);
    doc.setFillColor(234, 179, 8); doc.rect(margin + 28, legendY, 4, 4, 'F');
    doc.text('L = Late', margin + 33, legendY + 3);
    doc.setFillColor(239, 68, 68); doc.rect(margin + 53, legendY, 4, 4, 'F');
    doc.text('A = Absent', margin + 58, legendY + 3);
    doc.setFillColor(249, 115, 22); doc.rect(margin + 83, legendY, 4, 4, 'F');
    doc.text('M = Missed', margin + 88, legendY + 3);
    doc.setFillColor(56, 189, 248); doc.rect(margin + 115, legendY, 4, 4, 'F');
    doc.text('H = Holiday', margin + 120, legendY + 3);
    doc.setFillColor(82, 82, 91); doc.rect(margin + 147, legendY, 4, 4, 'F');
    doc.text('W = Weekend', margin + 152, legendY + 3);

    const startY = 30;
    
    // Table header - Days
    doc.setFillColor(243, 244, 246);
    doc.rect(margin, startY, nameWidth + daysInMonth.length * cellSize + summaryWidth, 8, 'F');
    doc.setFontSize(6);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(75, 85, 99);
    doc.text('Employee', margin + 2, startY + 5);
    
    daysInMonth.forEach((day, idx) => {
      const x = margin + nameWidth + idx * cellSize;
      doc.text(format(day, 'd'), x + cellSize / 2, startY + 5, { align: 'center' });
    });

    // Summary headers
    const summaryStartX = margin + nameWidth + daysInMonth.length * cellSize;
    doc.text('P', summaryStartX + 4, startY + 5, { align: 'center' });
    doc.text('L', summaryStartX + 12, startY + 5, { align: 'center' });
    doc.text('A', summaryStartX + 20, startY + 5, { align: 'center' });
    doc.text('M', summaryStartX + 28, startY + 5, { align: 'center' });

    // Employee rows
    let currentY = startY + 8;
    const rowHeight = 6;

    employeeSummaries.forEach((emp, empIdx) => {
      // Check for page break
      if (currentY + rowHeight > doc.internal.pageSize.getHeight() - 10) {
        doc.addPage();
        currentY = 15;
      }

      // Row background
      if (empIdx % 2 === 0) {
        doc.setFillColor(249, 250, 251);
        doc.rect(margin, currentY, nameWidth + daysInMonth.length * cellSize + summaryWidth, rowHeight, 'F');
      }

      // Employee name
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5);
      doc.setTextColor(0, 0, 0);
      const displayName = emp.full_name.length > 20 ? emp.full_name.substring(0, 18) + '...' : emp.full_name;
      doc.text(displayName, margin + 2, currentY + 4);

      // Day cells
      daysInMonth.forEach((day, dayIdx) => {
        const x = margin + nameWidth + dayIdx * cellSize;
        const status = getDayStatus(emp.id, day);
        
        // Cell background color
        if (status.type === 'weekend') {
          doc.setFillColor(82, 82, 91);
        } else if (status.type === 'holiday') {
          doc.setFillColor(186, 230, 253);
        } else if (status.type === 'missed-punch') {
          doc.setFillColor(255, 237, 213);
        } else if (status.type === 'present') {
          doc.setFillColor(220, 252, 231);
        } else if (status.type === 'late') {
          doc.setFillColor(254, 249, 195);
        } else if (status.type === 'absent') {
          doc.setFillColor(254, 226, 226);
        } else {
          doc.setFillColor(243, 244, 246);
        }
        
        doc.rect(x, currentY, cellSize, rowHeight, 'F');
        doc.setDrawColor(229, 231, 235);
        doc.rect(x, currentY, cellSize, rowHeight);
        
        // Status letter
        doc.setFontSize(4);
        if (status.type === 'weekend') {
          doc.setTextColor(255, 255, 255);
        } else if (status.type === 'present') {
          doc.setTextColor(34, 197, 94);
        } else if (status.type === 'late') {
          doc.setTextColor(202, 138, 4);
        } else if (status.type === 'absent') {
          doc.setTextColor(220, 38, 38);
        } else if (status.type === 'missed-punch') {
          doc.setTextColor(234, 88, 12);
        } else if (status.type === 'holiday') {
          doc.setTextColor(14, 165, 233);
        } else {
          doc.setTextColor(156, 163, 175);
        }
        doc.text(status.label, x + cellSize / 2, currentY + 4, { align: 'center' });
      });

      // Summary cells
      doc.setFontSize(5);
      doc.setTextColor(34, 197, 94);
      doc.text(emp.present.toString(), summaryStartX + 4, currentY + 4, { align: 'center' });
      doc.setTextColor(202, 138, 4);
      doc.text(emp.late.toString(), summaryStartX + 12, currentY + 4, { align: 'center' });
      doc.setTextColor(220, 38, 38);
      doc.text(emp.absent.toString(), summaryStartX + 20, currentY + 4, { align: 'center' });
      doc.setTextColor(234, 88, 12);
      doc.text(emp.missedPunch.toString(), summaryStartX + 28, currentY + 4, { align: 'center' });

      currentY += rowHeight;
    });

    // Grid borders
    doc.setDrawColor(200, 200, 200);
    doc.rect(margin, startY, nameWidth + daysInMonth.length * cellSize + summaryWidth, currentY - startY);

    doc.save(`Attendance_Matrix_${months[selectedMonth]}_${selectedYear}.pdf`);
    toast.success('Matrix PDF generated successfully');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Attendance Matrix View</h1>
          <p className="text-sm text-muted-foreground">
            All employees attendance overview for the month
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={generateMatrixPDF}>
            <Download className="w-4 h-4 mr-2" />
            Export PDF
          </Button>
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Calendar
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Month</span>
          <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {months.map((month, idx) => (
                <SelectItem key={idx} value={idx.toString()}>{month}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Year</span>
          <Input
            type="number"
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value) || currentDate.getFullYear())}
            className="w-[100px]"
            min={2020}
            max={2030}
          />
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded flex items-center justify-center bg-green-500/30 text-green-600 text-xs font-bold">P</span>
          <span>Present</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded flex items-center justify-center bg-yellow-500/30 text-yellow-600 text-xs font-bold">L</span>
          <span>Late</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded flex items-center justify-center bg-red-500/30 text-red-600 text-xs font-bold">A</span>
          <span>Absent</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded flex items-center justify-center bg-sky-400/50 text-sky-600 text-xs font-bold">H</span>
          <span>Holiday</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded flex items-center justify-center bg-orange-500/30 text-orange-600 text-xs font-bold">M</span>
          <span>Missed Punch</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded flex items-center justify-center bg-cyan-500/30 text-cyan-600 text-xs font-bold">AP</span>
          <span>Appealed</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded flex items-center justify-center bg-purple-500/30 text-purple-600 text-xs font-bold">U</span>
          <span>Undertime</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded flex items-center justify-center bg-zinc-600 text-white text-xs font-bold">W</span>
          <span>Weekend</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded flex items-center justify-center bg-blue-500/30 text-blue-600 text-xs font-bold">VL</span>
          <span>Vacation Leave</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded flex items-center justify-center bg-pink-500/30 text-pink-600 text-xs font-bold">ML</span>
          <span>Maternity Leave</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded flex items-center justify-center bg-lime-500/30 text-lime-600 text-xs font-bold">SL</span>
          <span>Sick Leave</span>
        </div>
      </div>

      {/* Matrix Grid */}
      <Card>
        <CardContent className="p-4 overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-muted">
                <th className="sticky left-0 bg-muted text-left p-2 text-sm font-medium min-w-[180px] border-r border-border">
                  Employee
                </th>
                {daysInMonth.map((day) => (
                  <th 
                    key={day.toISOString()} 
                    className={cn(
                      "text-center p-1 text-xs font-medium min-w-[28px]",
                      (getDay(day) === 0 || getDay(day) === 6) && "bg-zinc-200 dark:bg-zinc-700"
                    )}
                  >
                    {format(day, 'd')}
                  </th>
                ))}
                <th className="text-center p-1 text-xs font-medium min-w-[32px] bg-green-100 dark:bg-green-900/30 border-l border-border">P</th>
                <th className="text-center p-1 text-xs font-medium min-w-[32px] bg-yellow-100 dark:bg-yellow-900/30">L</th>
                <th className="text-center p-1 text-xs font-medium min-w-[32px] bg-red-100 dark:bg-red-900/30">A</th>
                <th className="text-center p-1 text-xs font-medium min-w-[32px] bg-orange-100 dark:bg-orange-900/30">M</th>
              </tr>
            </thead>
            <tbody>
              {employeeSummaries.map((emp, idx) => (
                <tr key={emp.id} className={cn(idx % 2 === 0 && "bg-muted/30")}>
                  <td className="sticky left-0 bg-card p-2 border-r border-border">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={emp.photo_url || ''} />
                        <AvatarFallback className="text-[10px]">
                          {emp.full_name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate">{emp.full_name}</p>
                        <p className="text-[10px] text-muted-foreground">{emp.hrms_no}</p>
                      </div>
                    </div>
                  </td>
                  {daysInMonth.map((day) => {
                    const status = getDayStatus(emp.id, day);
                    return (
                      <td 
                        key={day.toISOString()} 
                        className={cn(
                          "text-center p-0.5 border border-border/50",
                          status.color,
                          status.type === 'late' && "animate-pulse",
                          status.type === 'missed-punch' && "animate-pulse"
                        )}
                      >
                        <span className={cn("text-[10px] font-bold", status.textColor)}>
                          {status.label}
                        </span>
                      </td>
                    );
                  })}
                  <td className="text-center p-1 bg-green-100/50 dark:bg-green-900/20 border-l border-border">
                    <span className="text-xs font-bold text-green-600">{emp.present}</span>
                  </td>
                  <td className="text-center p-1 bg-yellow-100/50 dark:bg-yellow-900/20">
                    <span className="text-xs font-bold text-yellow-600">{emp.late}</span>
                  </td>
                  <td className="text-center p-1 bg-red-100/50 dark:bg-red-900/20">
                    <span className="text-xs font-bold text-red-600">{emp.absent}</span>
                  </td>
                  <td className="text-center p-1 bg-orange-100/50 dark:bg-orange-900/20">
                    <span className="text-xs font-bold text-orange-600">{emp.missedPunch}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
