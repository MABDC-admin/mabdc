import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, parseISO, isSameDay } from 'date-fns';
import { useAttendance } from '@/hooks/useAttendance';
import { useEmployees } from '@/hooks/useEmployees';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AttendanceDetailModal } from './AttendanceDetailModal';
import { AttendanceAppealModal } from './AttendanceAppealModal';
import jsPDF from 'jspdf';
import { toast } from 'sonner';

interface EmployeeAttendanceCalendarProps {
  employeeId?: string;
  employeeName?: string;
  hrmsNo?: string;
  onBack?: () => void;
  showEmployeeSelector?: boolean;
  showBackButton?: boolean;
  isEmployeePortal?: boolean;
}

export function EmployeeAttendanceCalendar({
  employeeId: propEmployeeId,
  employeeName: propEmployeeName,
  hrmsNo: propHrmsNo,
  onBack,
  showEmployeeSelector = false,
  showBackButton = true,
  isEmployeePortal = false,
}: EmployeeAttendanceCalendarProps) {
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth());
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(propEmployeeId || '');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showAppealModal, setShowAppealModal] = useState(false);
  
  const { data: allAttendance = [] } = useAttendance();
  const { data: employees = [] } = useEmployees();

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

  const employeeId = propEmployeeId || selectedEmployeeId;
  
  const selectedEmployee = useMemo(() => {
    return employees.find(e => e.id === employeeId);
  }, [employees, employeeId]);

  const employeeName = propEmployeeName || selectedEmployee?.full_name || '';
  const hrmsNo = propHrmsNo || selectedEmployee?.hrms_no || '';

  // Filter attendance for selected employee and month
  const monthAttendance = useMemo(() => {
    if (!employeeId) return [];
    const monthStart = startOfMonth(new Date(selectedYear, selectedMonth));
    const monthEnd = endOfMonth(monthStart);
    
    return allAttendance.filter(a => {
      if (a.employee_id !== employeeId) return false;
      const date = parseISO(a.date);
      return date >= monthStart && date <= monthEnd;
    });
  }, [allAttendance, employeeId, selectedMonth, selectedYear]);

  // Calculate stats
  const stats = useMemo(() => {
    let present = 0;
    let late = 0;
    let absent = 0;
    let missedPunch = 0;

    // Count holidays in month
    const monthStart = startOfMonth(new Date(selectedYear, selectedMonth));
    const monthEnd = endOfMonth(monthStart);
    const holidays = publicHolidays.filter(h => {
      const date = parseISO(h.date);
      return date >= monthStart && date <= monthEnd;
    }).length;

    monthAttendance.forEach(record => {
      if (record.status === 'Present') present++;
      else if (record.status === 'Late' || record.status === 'Late | Undertime') late++;
      else if (record.status === 'Absent') absent++;
      
      // Check for missed punch
      if ((record.check_in && !record.check_out) || (!record.check_in && record.check_out)) {
        missedPunch++;
      }
    });

    return { present, late, absent, holidays, missedPunch };
  }, [monthAttendance, publicHolidays, selectedMonth, selectedYear]);

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(new Date(selectedYear, selectedMonth));
    const monthEnd = endOfMonth(monthStart);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    
    const startDay = getDay(monthStart);
    const emptySlots: null[] = Array(startDay).fill(null);
    
    return [...emptySlots, ...days];
  }, [selectedMonth, selectedYear]);

  const getAttendanceForDay = (date: Date) => {
    return monthAttendance.find(a => isSameDay(parseISO(a.date), date));
  };

  const getHolidayForDay = (date: Date) => {
    return publicHolidays.find(h => isSameDay(parseISO(h.date), date));
  };

  const getDayStatus = (date: Date) => {
    const attendance = getAttendanceForDay(date);
    const holiday = getHolidayForDay(date);
    const dayOfWeek = getDay(date);
    const isSat = dayOfWeek === 6;
    const isSun = dayOfWeek === 0;
    
    // Weekend - Dark Grey
    if (isSat || isSun) {
      return { type: 'weekend', label: 'Weekend', color: 'bg-zinc-600 dark:bg-zinc-700', textColor: 'text-white', pulse: false };
    }
    
    // Holiday - Light Blue
    if (holiday) {
      return { type: 'holiday', label: holiday.name, color: 'bg-sky-400/30 border-sky-400', textColor: 'text-sky-500', pulse: false };
    }
    
    if (!attendance) {
      return { type: 'no-record', label: 'No record', color: 'bg-card', textColor: 'text-muted-foreground', pulse: false };
    }

    // Missed Punch - Red Orange with pulse
    const isMissedPunch = (attendance.check_in && !attendance.check_out) || (!attendance.check_in && attendance.check_out);
    if (isMissedPunch) {
      return { type: 'missed-punch', label: 'Missed Punch', color: 'bg-orange-500/20 border-orange-500', textColor: 'text-orange-500', pulse: true };
    }
    
    // Present - Green
    if (attendance.status === 'Present') {
      return { type: 'present', label: 'Present', color: 'bg-green-500/20 border-green-500', textColor: 'text-green-500', pulse: false };
    }
    
    // Late - Yellow with pulse
    if (attendance.status === 'Late' || attendance.status === 'Late | Undertime') {
      return { type: 'late', label: attendance.status, color: 'bg-yellow-500/20 border-yellow-500', textColor: 'text-yellow-500', pulse: true };
    }
    
    // Absent - Red
    if (attendance.status === 'Absent') {
      return { type: 'absent', label: 'Absent', color: 'bg-red-500/20 border-red-500', textColor: 'text-red-500', pulse: false };
    }
    
    return { type: 'present', label: attendance.status || 'Present', color: 'bg-green-500/20 border-green-500', textColor: 'text-green-500', pulse: false };
  };

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const handleDayClick = (day: Date) => {
    const dayOfWeek = getDay(day);
    if (dayOfWeek === 0 || dayOfWeek === 6) return; // Skip weekends
    
    setSelectedDate(day);
    
    if (isEmployeePortal) {
      const attendance = getAttendanceForDay(day);
      // Only allow appeal for missed punch or no record
      const isMissedPunch = attendance && ((attendance.check_in && !attendance.check_out) || (!attendance.check_in && attendance.check_out));
      if (isMissedPunch || !attendance) {
        setShowAppealModal(true);
      } else {
        setShowDetailModal(true);
      }
    } else {
      setShowDetailModal(true);
    }
  };

  const selectedAttendance = selectedDate ? getAttendanceForDay(selectedDate) : null;

  // PDF Generation
  const generatePDF = () => {
    if (!employeeName) {
      toast.error('Please select an employee first');
      return;
    }

    const doc = new jsPDF('landscape', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 10;

    // Header
    doc.setFillColor(34, 34, 34);
    doc.rect(0, 0, pageWidth, 25, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Employee Attendance Calendar', pageWidth / 2, 12, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`${months[selectedMonth]} ${selectedYear}`, pageWidth / 2, 20, { align: 'center' });

    // Employee Info
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.text(`Employee: ${employeeName}`, margin, 35);
    doc.text(`HRMS No: ${hrmsNo}`, margin + 100, 35);
    doc.text(`Generated: ${format(new Date(), 'dd MMM yyyy HH:mm')}`, pageWidth - margin - 60, 35);

    // Stats summary
    const statsY = 42;
    doc.setFontSize(9);
    doc.setFillColor(34, 197, 94); doc.rect(margin, statsY, 8, 5, 'F');
    doc.text(`Present: ${stats.present}`, margin + 10, statsY + 4);
    doc.setFillColor(234, 179, 8); doc.rect(margin + 40, statsY, 8, 5, 'F');
    doc.text(`Late: ${stats.late}`, margin + 50, statsY + 4);
    doc.setFillColor(239, 68, 68); doc.rect(margin + 75, statsY, 8, 5, 'F');
    doc.text(`Absent: ${stats.absent}`, margin + 85, statsY + 4);
    doc.setFillColor(56, 189, 248); doc.rect(margin + 120, statsY, 8, 5, 'F');
    doc.text(`Holiday: ${stats.holidays}`, margin + 130, statsY + 4);
    doc.setFillColor(249, 115, 22); doc.rect(margin + 165, statsY, 8, 5, 'F');
    doc.text(`Missed Punch: ${stats.missedPunch}`, margin + 175, statsY + 4);

    // Calendar grid
    const calendarStartY = 55;
    const cellWidth = (pageWidth - margin * 2) / 7;
    const cellHeight = 25;

    // Week headers
    doc.setFillColor(243, 244, 246);
    doc.rect(margin, calendarStartY, pageWidth - margin * 2, 8, 'F');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(75, 85, 99);
    weekDays.forEach((day, idx) => {
      doc.text(day, margin + idx * cellWidth + cellWidth / 2, calendarStartY + 5.5, { align: 'center' });
    });

    // Calendar cells
    let currentRow = 0;
    let currentCol = 0;
    const gridStartY = calendarStartY + 10;

    calendarDays.forEach((day, idx) => {
      currentCol = idx % 7;
      currentRow = Math.floor(idx / 7);
      
      const cellX = margin + currentCol * cellWidth;
      const cellY = gridStartY + currentRow * cellHeight;

      if (!day) {
        // Empty cell
        doc.setDrawColor(229, 231, 235);
        doc.rect(cellX, cellY, cellWidth, cellHeight);
        return;
      }

      const status = getDayStatus(day);
      const attendance = getAttendanceForDay(day);
      const dayOfWeek = getDay(day);
      const isWeekendDay = dayOfWeek === 0 || dayOfWeek === 6;

      // Cell background color
      if (isWeekendDay) {
        doc.setFillColor(82, 82, 91); // Dark grey
      } else if (status.type === 'holiday') {
        doc.setFillColor(186, 230, 253); // Light blue
      } else if (status.type === 'missed-punch') {
        doc.setFillColor(255, 237, 213); // Orange light
      } else if (status.type === 'present') {
        doc.setFillColor(220, 252, 231); // Green light
      } else if (status.type === 'late') {
        doc.setFillColor(254, 249, 195); // Yellow light
      } else if (status.type === 'absent') {
        doc.setFillColor(254, 226, 226); // Red light
      } else {
        doc.setFillColor(255, 255, 255);
      }
      
      doc.rect(cellX, cellY, cellWidth, cellHeight, 'F');
      doc.setDrawColor(229, 231, 235);
      doc.rect(cellX, cellY, cellWidth, cellHeight);

      // Day number
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(isWeekendDay ? 255 : 0, isWeekendDay ? 255 : 0, isWeekendDay ? 255 : 0);
      doc.text(format(day, 'd'), cellX + 3, cellY + 6);

      // Status
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      if (isWeekendDay) {
        doc.setTextColor(200, 200, 200);
        doc.text('Weekend', cellX + 3, cellY + 12);
      } else {
        if (status.type === 'present') doc.setTextColor(34, 197, 94);
        else if (status.type === 'late') doc.setTextColor(202, 138, 4);
        else if (status.type === 'absent') doc.setTextColor(220, 38, 38);
        else if (status.type === 'missed-punch') doc.setTextColor(234, 88, 12);
        else if (status.type === 'holiday') doc.setTextColor(14, 165, 233);
        else doc.setTextColor(156, 163, 175);
        
        doc.text(status.label.substring(0, 15), cellX + 3, cellY + 12);
      }

      // Check-in/out times
      if (attendance && !isWeekendDay && status.type !== 'holiday') {
        doc.setTextColor(107, 114, 128);
        doc.setFontSize(6);
        if (attendance.check_in) {
          doc.text(`In: ${attendance.check_in.substring(0, 5)}`, cellX + 3, cellY + 17);
        }
        if (attendance.check_out) {
          doc.text(`Out: ${attendance.check_out.substring(0, 5)}`, cellX + 3, cellY + 21);
        }
      }
    });

    // Save
    doc.save(`Attendance_${employeeName.replace(/\s+/g, '_')}_${months[selectedMonth]}_${selectedYear}.pdf`);
    toast.success('PDF generated successfully');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Attendance Management</h1>
          <p className="text-sm text-muted-foreground">
            Track attendance with color-coded calendar view
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={generatePDF}>
            <Download className="w-4 h-4 mr-2" />
            Export PDF
          </Button>
          {showBackButton && onBack && (
            <Button variant="outline" onClick={onBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Present</p>
            <p className="text-3xl font-bold text-green-500">{stats.present}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Late</p>
            <p className="text-3xl font-bold text-yellow-500">{stats.late}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Absent</p>
            <p className="text-3xl font-bold text-red-500">{stats.absent}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Holidays</p>
            <p className="text-3xl font-bold text-sky-500">{stats.holidays}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Missed Punch</p>
            <p className="text-3xl font-bold text-orange-500">{stats.missedPunch}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        {showEmployeeSelector ? (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Employee</span>
            <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
              <SelectTrigger className="w-[280px]">
                <SelectValue placeholder="Select employee" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.full_name} (HRMS NO. {emp.hrms_no})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Employee</span>
            <div className="px-3 py-2 bg-secondary rounded-md text-sm font-medium">
              {employeeName} (HRMS NO. {hrmsNo})
            </div>
          </div>
        )}
        
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
          <span className="w-3 h-3 rounded-full bg-green-500"></span>
          <span>Present</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-yellow-500 animate-pulse"></span>
          <span>Late</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-red-500"></span>
          <span>Absent</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-sky-400"></span>
          <span>Holiday</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-orange-500 animate-pulse"></span>
          <span>Missed Punch</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-zinc-600"></span>
          <span>Weekend (Sat/Sun)</span>
        </div>
      </div>

      {/* Calendar Grid */}
      <Card>
        <CardContent className="p-4">
          {/* Week header */}
          <div className="grid grid-cols-7 mb-2">
            {weekDays.map((day) => (
              <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                {day}
              </div>
            ))}
          </div>
          
          {/* Calendar days */}
          <div className="grid grid-cols-7 gap-2">
            {calendarDays.map((day, idx) => {
              if (!day) {
                return <div key={`empty-${idx}`} className="h-24" />;
              }
              
              const status = getDayStatus(day);
              const dayOfWeek = getDay(day);
              const isWeekendDay = dayOfWeek === 0 || dayOfWeek === 6;
              const attendance = getAttendanceForDay(day);
              const isMissedPunch = attendance && ((attendance.check_in && !attendance.check_out) || (!attendance.check_in && attendance.check_out));
              const isClickable = !isWeekendDay;
              
              return (
                <div
                  key={day.toISOString()}
                  onClick={() => isClickable && handleDayClick(day)}
                  className={cn(
                    "h-24 p-2 rounded-lg border transition-all",
                    status.color,
                    isWeekendDay ? "border-transparent" : "border-border",
                    isClickable && "cursor-pointer hover:ring-2 hover:ring-primary/50",
                    isEmployeePortal && isMissedPunch && "ring-2 ring-orange-500/50",
                    status.pulse && "animate-pulse"
                  )}
                >
                  <div className="flex items-start justify-between">
                    <span className={cn(
                      "text-sm font-medium",
                      status.textColor
                    )}>
                      {format(day, 'd')}
                    </span>
                    {isWeekendDay && (
                      <span className="text-[10px] text-white/80">Weekend</span>
                    )}
                  </div>
                  <div className="mt-2">
                    <p className={cn("text-xs font-medium", status.textColor)}>
                      {status.label}
                    </p>
                    {attendance && !isWeekendDay && status.type !== 'holiday' && (
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {attendance.check_in && format(parseISO(`2000-01-01T${attendance.check_in}`), 'h:mm a')}
                        {attendance.check_in && attendance.check_out && ' - '}
                        {attendance.check_out && format(parseISO(`2000-01-01T${attendance.check_out}`), 'h:mm a')}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Detail Modal for HR */}
      {selectedDate && !isEmployeePortal && (
        <AttendanceDetailModal
          open={showDetailModal}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedDate(null);
          }}
          date={selectedDate}
          attendance={selectedAttendance ? {
            id: selectedAttendance.id,
            date: selectedAttendance.date,
            check_in: selectedAttendance.check_in || null,
            check_out: selectedAttendance.check_out || null,
            status: selectedAttendance.status || null,
            employee_remarks: selectedAttendance.employee_remarks || null,
            admin_remarks: selectedAttendance.admin_remarks || null,
          } : null}
          employeeId={employeeId}
          employeeName={employeeName}
          isHRView={true}
        />
      )}

      {/* Detail Modal for Employee (view only) */}
      {selectedDate && isEmployeePortal && !showAppealModal && (
        <AttendanceDetailModal
          open={showDetailModal}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedDate(null);
          }}
          date={selectedDate}
          attendance={selectedAttendance ? {
            id: selectedAttendance.id,
            date: selectedAttendance.date,
            check_in: selectedAttendance.check_in || null,
            check_out: selectedAttendance.check_out || null,
            status: selectedAttendance.status || null,
            employee_remarks: selectedAttendance.employee_remarks || null,
            admin_remarks: selectedAttendance.admin_remarks || null,
          } : null}
          employeeId={employeeId}
          employeeName={employeeName}
          isHRView={false}
        />
      )}

      {/* Appeal Modal for Employee */}
      {selectedDate && isEmployeePortal && (
        <AttendanceAppealModal
          open={showAppealModal}
          onClose={() => {
            setShowAppealModal(false);
            setSelectedDate(null);
          }}
          date={selectedDate}
          attendance={selectedAttendance ? {
            id: selectedAttendance.id,
            date: selectedAttendance.date,
            check_in: selectedAttendance.check_in || null,
            check_out: selectedAttendance.check_out || null,
            status: selectedAttendance.status || null,
          } : null}
          employeeId={employeeId}
        />
      )}
    </div>
  );
}
