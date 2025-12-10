import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, parseISO, isSameMonth, isSameDay, isWeekend } from 'date-fns';
import { useAttendance } from '@/hooks/useAttendance';
import { useEmployees } from '@/hooks/useEmployees';

interface EmployeeAttendanceCalendarProps {
  employeeId?: string;
  employeeName?: string;
  hrmsNo?: string;
  onBack?: () => void;
  showEmployeeSelector?: boolean;
  showBackButton?: boolean;
}

interface PublicHoliday {
  id: string;
  name: string;
  date: string;
}

export function EmployeeAttendanceCalendar({
  employeeId: propEmployeeId,
  employeeName: propEmployeeName,
  hrmsNo: propHrmsNo,
  onBack,
  showEmployeeSelector = false,
  showBackButton = true,
}: EmployeeAttendanceCalendarProps) {
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth());
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(propEmployeeId || '');
  
  const { data: allAttendance = [] } = useAttendance();
  const { data: employees = [] } = useEmployees();

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
    let holidays = 0;

    monthAttendance.forEach(record => {
      if (record.status === 'Present') present++;
      else if (record.status === 'Late' || record.status === 'Late | Undertime') late++;
      else if (record.status === 'Absent') absent++;
    });

    return { present, late, absent, holidays };
  }, [monthAttendance]);

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(new Date(selectedYear, selectedMonth));
    const monthEnd = endOfMonth(monthStart);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    
    // Get day of week for first day (0 = Sunday)
    const startDay = getDay(monthStart);
    
    // Add empty slots for days before start of month
    const emptySlots: null[] = Array(startDay).fill(null);
    
    return [...emptySlots, ...days];
  }, [selectedMonth, selectedYear]);

  const getAttendanceForDay = (date: Date) => {
    return monthAttendance.find(a => isSameDay(parseISO(a.date), date));
  };

  const getDayStatus = (date: Date) => {
    const attendance = getAttendanceForDay(date);
    const dayOfWeek = getDay(date);
    const isSat = dayOfWeek === 6;
    const isSun = dayOfWeek === 0;
    
    if (isSat || isSun) {
      return { type: 'weekend', label: 'Weekend', color: 'bg-muted/50' };
    }
    
    if (!attendance) {
      return { type: 'no-record', label: 'No record', color: 'bg-card' };
    }
    
    if (attendance.status === 'Present') {
      return { type: 'present', label: 'Status: Present', color: 'bg-primary/20 border-primary' };
    }
    
    if (attendance.status === 'Late' || attendance.status === 'Late | Undertime') {
      return { type: 'late', label: `Status: ${attendance.status}`, color: 'bg-amber-500/20 border-amber-500' };
    }
    
    if (attendance.status === 'Absent') {
      return { type: 'absent', label: 'Status: Absent', color: 'bg-destructive/20 border-destructive' };
    }
    
    return { type: 'present', label: `Status: ${attendance.status}`, color: 'bg-primary/20 border-primary' };
  };

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const handleApply = () => {
    // Stats are already updated reactively
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Attendance Management</h1>
          <p className="text-sm text-muted-foreground">
            TAMS-style calendar – <span className="text-destructive">Absent</span>, <span className="text-amber-500">Late</span>, <span className="text-primary">Holiday</span>. Sat/Sun grey.
          </p>
        </div>
        {showBackButton && onBack && (
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Present</p>
            <p className="text-3xl font-bold text-foreground">{stats.present}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Late</p>
            <p className="text-3xl font-bold text-amber-500">{stats.late}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Absent</p>
            <p className="text-3xl font-bold text-destructive">{stats.absent}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Holidays</p>
            <p className="text-3xl font-bold text-primary">{stats.holidays}</p>
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
        
        <Button onClick={handleApply}>Apply</Button>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-primary"></span>
          <span>Present</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-amber-500"></span>
          <span>Late</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-destructive"></span>
          <span>Absent</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-primary"></span>
          <span>Holiday</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-muted"></span>
          <span>Saturday / Sunday</span>
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
              
              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    "h-24 p-2 rounded-lg border transition-colors",
                    status.color,
                    isWeekendDay ? "bg-muted/30 border-muted" : "border-border"
                  )}
                >
                  <div className="flex items-start justify-between">
                    <span className={cn(
                      "text-sm font-medium",
                      isWeekendDay ? "text-muted-foreground" : "text-foreground"
                    )}>
                      {format(day, 'd')}
                    </span>
                    {isWeekendDay && (
                      <span className="text-[10px] text-muted-foreground">Weekend</span>
                    )}
                  </div>
                  <div className="mt-2">
                    <p className={cn(
                      "text-xs",
                      status.type === 'present' && "text-primary",
                      status.type === 'late' && "text-amber-500",
                      status.type === 'absent' && "text-destructive",
                      status.type === 'weekend' && "text-muted-foreground",
                      status.type === 'no-record' && "text-muted-foreground"
                    )}>
                      {status.label}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
