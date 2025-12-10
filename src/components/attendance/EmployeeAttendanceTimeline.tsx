import { useState, useMemo } from 'react';
import { useAttendance } from '@/hooks/useAttendance';
import { useEmployees } from '@/hooks/useEmployees';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Search, ChevronLeft, ChevronRight, LogIn, LogOut, Clock, 
  AlertTriangle, CheckCircle, Calendar, Phone, User, Briefcase, MessageCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isWeekend, differenceInMinutes, isSameMonth, subMonths, addMonths } from 'date-fns';

interface TimelineEntry {
  id: string;
  date: string;
  check_in?: string;
  check_out?: string;
  status: string;
  employee_remarks?: string;
  admin_remarks?: string;
}

export function EmployeeAttendanceTimeline() {
  const { data: allAttendance = [] } = useAttendance();
  const { data: employees = [] } = useEmployees();
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const selectedEmployee = employees.find(e => e.id === selectedEmployeeId);

  // Filter employees by search
  const filteredEmployees = employees.filter(e => 
    e.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.hrms_no.includes(searchQuery)
  );

  // Get attendance for selected employee in current month
  const employeeAttendance = useMemo(() => {
    if (!selectedEmployeeId) return [];
    
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    
    return allAttendance
      .filter(a => {
        const attendanceDate = parseISO(a.date);
        return a.employee_id === selectedEmployeeId && 
               isSameMonth(attendanceDate, currentMonth);
      })
      .filter(a => statusFilter === 'all' || a.status === statusFilter)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [allAttendance, selectedEmployeeId, currentMonth, statusFilter]);

  // Calculate stats for the month
  const monthlyStats = useMemo(() => {
    if (!selectedEmployeeId) return { present: 0, late: 0, lateClockOut: 0, noClockOut: 0, absent: 0, dayOff: 0 };
    
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
    
    const workDays = daysInMonth.filter(d => !isWeekend(d) && d <= new Date());
    const attendanceMap = new Map(employeeAttendance.map(a => [a.date, a]));
    
    let present = 0, late = 0, noClockOut = 0, dayOff = 0, absent = 0;
    
    workDays.forEach(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const record = attendanceMap.get(dateStr);
      
      if (!record) {
        absent++;
      } else if (record.status === 'Late') {
        late++;
      } else if (record.status === 'Present') {
        present++;
      }
      
      if (record && !record.check_out) {
        noClockOut++;
      }
    });

    // Count weekends as day off
    dayOff = daysInMonth.filter(d => isWeekend(d) && d <= new Date()).length;
    
    return { present, late, lateClockOut: 0, noClockOut, absent, dayOff };
  }, [employeeAttendance, selectedEmployeeId, currentMonth]);

  // Calculate working duration
  const calculateDuration = (checkIn?: string, checkOut?: string) => {
    if (!checkIn || !checkOut) return null;
    
    const [inHours, inMins] = checkIn.split(':').map(Number);
    const [outHours, outMins] = checkOut.split(':').map(Number);
    
    const totalMins = (outHours * 60 + outMins) - (inHours * 60 + inMins);
    const hours = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    
    return `${hours}h ${mins}m`;
  };

  // Generate timeline bar percentage
  const getTimelinePosition = (time: string) => {
    const [hours, mins] = time.split(':').map(Number);
    const totalMins = hours * 60 + mins;
    // Timeline from 06:00 (360) to 24:00 (1440)
    const startMins = 360;
    const endMins = 1440;
    return ((totalMins - startMins) / (endMins - startMins)) * 100;
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1));
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  return (
    <section className="glass-card rounded-3xl border border-border p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Employee Attendance Timeline
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            View detailed attendance history per employee
          </p>
        </div>
        
        {/* Employee Selector */}
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search employee..."
              className="pl-9 w-48 bg-secondary/50 border-border"
            />
          </div>
          <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
            <SelectTrigger className="w-56 bg-secondary/50 border-border">
              <SelectValue placeholder="Select employee" />
            </SelectTrigger>
            <SelectContent>
              {filteredEmployees.map((emp) => (
                <SelectItem key={emp.id} value={emp.id}>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{emp.full_name}</span>
                    <span className="text-xs text-muted-foreground">#{emp.hrms_no}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {selectedEmployee ? (
        <>
          {/* Employee Header Card */}
          <div className="rounded-2xl border border-border bg-secondary/20 p-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <Avatar className="w-16 h-16 ring-2 ring-primary/20">
                  <AvatarImage src={selectedEmployee.photo_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-lg">
                    {getInitials(selectedEmployee.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-bold text-foreground">{selectedEmployee.full_name}</h3>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                    <span className="flex items-center gap-1">
                      <Briefcase className="w-3 h-3" />
                      {selectedEmployee.job_position}
                    </span>
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      #{selectedEmployee.hrms_no}
                    </span>
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      {selectedEmployee.work_phone}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mt-4 pt-4 border-t border-border">
              <div className="text-center p-2 rounded-lg bg-background/50">
                <p className="text-xl font-bold text-foreground">{monthlyStats.dayOff}</p>
                <p className="text-[10px] uppercase text-muted-foreground">Day Off</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-background/50">
                <p className="text-xl font-bold text-amber-500">{monthlyStats.late}</p>
                <p className="text-[10px] uppercase text-muted-foreground">Late In</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-background/50">
                <p className="text-xl font-bold text-orange-500">{monthlyStats.lateClockOut}</p>
                <p className="text-[10px] uppercase text-muted-foreground">Late Out</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-background/50">
                <p className="text-xl font-bold text-red-500">{monthlyStats.noClockOut}</p>
                <p className="text-[10px] uppercase text-muted-foreground">No Out</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-background/50">
                <p className="text-xl font-bold text-primary">{monthlyStats.present}</p>
                <p className="text-[10px] uppercase text-muted-foreground">Present</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-background/50">
                <p className="text-xl font-bold text-destructive">{monthlyStats.absent}</p>
                <p className="text-[10px] uppercase text-muted-foreground">Absent</p>
              </div>
            </div>
          </div>

          {/* Month Navigation & Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => navigateMonth('prev')}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="font-semibold text-foreground min-w-32 text-center">
                {format(currentMonth, 'MMMM yyyy')}
              </span>
              <Button variant="ghost" size="icon" onClick={() => navigateMonth('next')}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36 bg-secondary/50 border-border">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Present">Present</SelectItem>
                <SelectItem value="Late">Late</SelectItem>
                <SelectItem value="Absent">Absent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Timeline Header */}
          <div className="hidden md:grid grid-cols-12 gap-2 text-[10px] text-muted-foreground px-4">
            <div className="col-span-2">Date</div>
            <div className="col-span-1">Clock-in</div>
            <div className="col-span-6">
              <div className="flex justify-between px-2">
                {['06:00', '09:00', '12:00', '15:00', '18:00', '21:00', '24:00'].map(t => (
                  <span key={t}>{t}</span>
                ))}
              </div>
            </div>
            <div className="col-span-1">Clock-out</div>
            <div className="col-span-1">Duration</div>
            <div className="col-span-1">Status</div>
          </div>

          {/* Timeline Entries */}
          <div className="space-y-2 max-h-96 overflow-y-auto soft-scroll">
            {employeeAttendance.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No attendance records for this month</p>
              </div>
            ) : (
              employeeAttendance.map((record) => {
                const duration = calculateDuration(record.check_in, record.check_out);
                const isLate = record.status === 'Late';
                
                return (
                  <div 
                    key={record.id} 
                    className="rounded-xl border border-border bg-secondary/20 p-3 hover:bg-secondary/40 transition-colors"
                  >
                    {/* Mobile Layout */}
                    <div className="md:hidden space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-foreground">
                          {format(parseISO(record.date), 'EEEE, dd')}
                        </span>
                        <span className={cn(
                          "text-xs px-2 py-1 rounded-full",
                          record.status === 'Present' && "bg-primary/10 text-primary",
                          record.status === 'Late' && "bg-amber-500/10 text-amber-500",
                          record.status === 'Absent' && "bg-destructive/10 text-destructive"
                        )}>
                          {record.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <LogIn className="w-3 h-3" /> {record.check_in || '--:--'}
                        </span>
                        <span className="flex items-center gap-1">
                          <LogOut className="w-3 h-3" /> {record.check_out || '--:--'}
                        </span>
                        {duration && <span>{duration}</span>}
                      </div>
                    </div>

                    {/* Desktop Layout */}
                    <div className="hidden md:grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-2">
                        <p className="font-medium text-foreground">{format(parseISO(record.date), 'EEEE, dd')}</p>
                      </div>
                      <div className="col-span-1 text-sm text-muted-foreground">
                        {record.check_in || '--:--'}
                      </div>
                      <div className="col-span-6">
                        {/* Timeline Bar */}
                        <div className="relative h-8 bg-secondary/50 rounded-lg overflow-hidden">
                          {record.check_in && (
                            <div 
                              className={cn(
                                "absolute h-full rounded transition-all",
                                isLate ? "bg-gradient-to-r from-amber-500 to-amber-400" : "bg-gradient-to-r from-primary to-primary/70"
                              )}
                              style={{
                                left: `${Math.max(0, getTimelinePosition(record.check_in))}%`,
                                width: record.check_out 
                                  ? `${Math.max(5, getTimelinePosition(record.check_out) - getTimelinePosition(record.check_in))}%`
                                  : '10%'
                              }}
                            >
                              <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-[10px] text-white font-medium truncate px-1">
                                  Working
                                </span>
                              </div>
                            </div>
                          )}
                          
                          {/* Break indicator (mock - 12:00-13:00) */}
                          {record.check_in && record.check_out && (
                            <div 
                              className="absolute h-full bg-secondary/80 rounded"
                              style={{
                                left: `${getTimelinePosition('12:00')}%`,
                                width: `${getTimelinePosition('13:00') - getTimelinePosition('12:00')}%`
                              }}
                            >
                              <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-[9px] text-muted-foreground">Break</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="col-span-1 text-sm text-muted-foreground">
                        {record.check_out || '--:--'}
                      </div>
                      <div className="col-span-1 text-sm font-medium text-foreground">
                        {duration || '-'}
                      </div>
                      <div className="col-span-1">
                        <span className={cn(
                          "inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full",
                          record.status === 'Present' && "bg-primary/10 text-primary",
                          record.status === 'Late' && "bg-amber-500/10 text-amber-500",
                          record.status === 'Absent' && "bg-destructive/10 text-destructive"
                        )}>
                          {record.status === 'Present' && <CheckCircle className="w-3 h-3" />}
                          {record.status === 'Late' && <AlertTriangle className="w-3 h-3" />}
                          {record.status}
                        </span>
                      </div>
                    </div>

                    {/* Remarks */}
                    {(record.employee_remarks || record.admin_remarks) && (
                      <div className="mt-2 pt-2 border-t border-border text-xs text-muted-foreground flex items-start gap-1">
                        <MessageCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                        <span>{record.admin_remarks || record.employee_remarks}</span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <User className="w-16 h-16 mx-auto mb-4 opacity-20" />
          <p className="text-lg font-medium">Select an Employee</p>
          <p className="text-sm mt-1">Choose an employee from the dropdown to view their attendance timeline</p>
        </div>
      )}
    </section>
  );
}
