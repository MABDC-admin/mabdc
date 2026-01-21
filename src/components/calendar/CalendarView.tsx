import { useState, useMemo } from 'react';
import { useLeave, usePublicHolidays } from '@/hooks/useLeave';
import { useEvents, useAddEvent, useDeleteEvent } from '@/hooks/useSettings';
import { useEmployees } from '@/hooks/useEmployees';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { ChevronLeft, ChevronRight, Plus, Search, X, Cake, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, isToday, parseISO, startOfWeek, endOfWeek, isWeekend, isSameMonth } from 'date-fns';

interface CalendarViewProps {
  className?: string;
}

export function CalendarView({ className }: CalendarViewProps) {
  const { data: leave = [] } = useLeave();
  const { data: holidays = [] } = usePublicHolidays();
  const { data: events = [] } = useEvents();
  const { data: employees = [] } = useEmployees();
  const addEvent = useAddEvent();
  const deleteEvent = useDeleteEvent();

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [viewMode, setViewMode] = useState<'matrix' | 'calendar' | 'birthdays' | 'leave-overview'>('calendar');
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [leaveTypeFilter, setLeaveTypeFilter] = useState<string>('all');
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    event_type: 'General' as const,
    start_date: '',
    end_date: '',
    is_all_day: true,
    color: '#7c3aed',
  });

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  
  // Get all weeks in the month for calendar view
  const weeks = useMemo(() => {
    const firstWeekStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const lastWeekEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    const allDays = eachDayOfInterval({ start: firstWeekStart, end: lastWeekEnd });
    
    const weeksArray: Date[][] = [];
    for (let i = 0; i < allDays.length; i += 7) {
      weeksArray.push(allDays.slice(i, i + 7));
    }
    return weeksArray;
  }, [currentMonth]);

  const approvedLeave = leave.filter(l => l.status === 'Approved');
  
  // Get unique departments for filter
  const departments = useMemo(() => {
    const depts = [...new Set(employees.map(e => e.department).filter(Boolean))];
    return depts.sort();
  }, [employees]);

  // Get unique leave types for filter
  const leaveTypes = useMemo(() => {
    const types = [...new Set(approvedLeave.map(l => l.leave_type).filter(Boolean))];
    return types.sort();
  }, [approvedLeave]);

  // Filter employees based on search and department
  const filteredEmployees = useMemo(() => {
    let filtered = employees.filter(e => e.status === 'Active');
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(e => 
        e.full_name?.toLowerCase().includes(query) ||
        e.hrms_no?.toLowerCase().includes(query) ||
        e.job_position?.toLowerCase().includes(query)
      );
    }
    
    if (departmentFilter !== 'all') {
      filtered = filtered.filter(e => e.department === departmentFilter);
    }
    
    return filtered;
  }, [employees, searchQuery, departmentFilter]);

  const activeEmployees = employees.filter(e => e.status === 'Active');

  const getEventsForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    
    const leaveItems = approvedLeave.filter(l => {
      const start = parseISO(l.start_date);
      const end = parseISO(l.end_date);
      return date >= start && date <= end;
    });

    const holidayItems = holidays.filter(h => h.date === dateStr);
    
    const eventItems = events.filter(e => {
      const start = parseISO(e.start_date);
      const end = e.end_date ? parseISO(e.end_date) : start;
      return date >= start && date <= end;
    });

    return { leaveItems, holidayItems, eventItems };
  };

  const getEmployeeLeaveForDate = (employeeId: string, date: Date) => {
    return approvedLeave.find(l => {
      if (l.employee_id !== employeeId) return false;
      const start = parseISO(l.start_date);
      const end = parseISO(l.end_date);
      return date >= start && date <= end;
    });
  };

  const getHolidayForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return holidays.find(h => h.date === dateStr);
  };

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const handleToday = () => setCurrentMonth(new Date());

  const handleSubmitEvent = (e: React.FormEvent) => {
    e.preventDefault();
    addEvent.mutate({
      title: eventForm.title,
      description: eventForm.description || undefined,
      event_type: eventForm.event_type,
      start_date: eventForm.start_date,
      end_date: eventForm.end_date || undefined,
      is_all_day: eventForm.is_all_day,
      color: eventForm.color,
    }, {
      onSuccess: () => {
        setIsEventModalOpen(false);
        setEventForm({
          title: '',
          description: '',
          event_type: 'General',
          start_date: '',
          end_date: '',
          is_all_day: true,
          color: '#7c3aed',
        });
      }
    });
  };

  const getEmployeeById = (id: string) => employees.find(e => e.id === id);

  const leaveTypeColors: Record<string, { bg: string; text: string }> = {
    'Annual': { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300' },
    'Sick': { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-300' },
    'Emergency': { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300' },
    'Maternity': { bg: 'bg-pink-100 dark:bg-pink-900/30', text: 'text-pink-700 dark:text-pink-300' },
    'Paternity': { bg: 'bg-indigo-100 dark:bg-indigo-900/30', text: 'text-indigo-700 dark:text-indigo-300' },
    'Bereavement': { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-700 dark:text-gray-300' },
    'Unpaid': { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-700 dark:text-slate-300' },
    'WFH': { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300' },
  };

  const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

  return (
    <div className={cn("space-y-4", className)}>
      {/* Calendar Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className="text-xl font-bold text-foreground">Calendar</h2>
        
        <div className="flex items-center gap-3 flex-wrap">
          {/* View Toggle */}
          <div className="inline-flex rounded-lg border border-border bg-secondary/30 p-1">
            <button
              onClick={() => setViewMode('leave-overview')}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1",
                viewMode === 'leave-overview' 
                  ? "bg-blue-500 text-white shadow-sm" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Users className="w-3 h-3" />
              Leave
            </button>
            <button
              onClick={() => setViewMode('matrix')}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                viewMode === 'matrix' 
                  ? "bg-primary text-primary-foreground shadow-sm" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Matrix
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                viewMode === 'calendar' 
                  ? "bg-primary text-primary-foreground shadow-sm" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Calendar
            </button>
            <button
              onClick={() => setViewMode('birthdays')}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1",
                viewMode === 'birthdays' 
                  ? "bg-pink-500 text-white shadow-sm" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Cake className="w-3 h-3" />
              Birthdays
            </button>
          </div>

          {/* Month Navigation */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground min-w-[120px]">
              {format(currentMonth, 'MMMM yyyy')}
            </span>
            <Button variant="ghost" size="icon" onClick={handlePrevMonth} className="h-7 w-7">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleNextMonth} className="h-7 w-7">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          <Button variant="outline" size="sm" onClick={handleToday} className="text-xs border-border">
            Today
          </Button>

          <Button size="sm" onClick={() => setIsEventModalOpen(true)} className="bg-primary hover:bg-primary/90 text-xs">
            <Plus className="w-3 h-3 mr-1" /> Add Event
          </Button>
        </div>
      </div>

      {/* Leave Overview View */}
      {viewMode === 'leave-overview' && (
        <div className="space-y-4">
          {/* Leave Type Legend & Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
            {Object.entries(leaveTypeColors).map(([type, colors]) => {
              const count = approvedLeave.filter(l => {
                if (l.leave_type !== type) return false;
                const start = parseISO(l.start_date);
                const end = parseISO(l.end_date);
                return (isSameMonth(start, currentMonth) || isSameMonth(end, currentMonth) ||
                  (start < monthStart && end > monthEnd));
              }).length;
              
              return (
                <div 
                  key={type} 
                  className={cn(
                    "p-3 rounded-lg border border-border",
                    colors.bg
                  )}
                >
                  <div className={cn("text-lg font-bold", colors.text)}>{count}</div>
                  <div className={cn("text-xs font-medium", colors.text)}>{type}</div>
                </div>
              );
            })}
          </div>

          {/* Calendar Grid with Leave Focus */}
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            {/* Day Headers */}
            <div className="grid grid-cols-7 border-b border-border bg-muted/30">
              {dayNames.map((day, idx) => (
                <div 
                  key={day} 
                  className={cn(
                    "py-3 text-center text-xs font-semibold border-r border-border last:border-r-0",
                    idx === 0 || idx === 6 ? "text-muted-foreground/70" : "text-foreground"
                  )}
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Weeks */}
            {weeks.map((week, weekIndex) => (
              <div key={weekIndex} className="grid grid-cols-7 border-b border-border last:border-b-0">
                {week.map((day, dayIndex) => {
                  const { leaveItems, holidayItems } = getEventsForDate(day);
                  const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
                  const isTodayDate = isToday(day);
                  const isWeekendDay = isWeekend(day);

                  // Group employees on leave by leave type
                  const leaveByType: Record<string, { employee: typeof employees[0]; leave: typeof leaveItems[0] }[]> = {};
                  leaveItems.forEach(l => {
                    const employee = getEmployeeById(l.employee_id);
                    if (employee) {
                      const type = l.leave_type;
                      if (!leaveByType[type]) leaveByType[type] = [];
                      leaveByType[type].push({ employee, leave: l });
                    }
                  });

                  const totalOnLeave = leaveItems.length;

                  return (
                    <div
                      key={day.toISOString()}
                      className={cn(
                        "min-h-[140px] p-2 border-r border-border last:border-r-0 transition-colors",
                        !isCurrentMonth && "bg-muted/20",
                        isCurrentMonth && "bg-card",
                        isWeekendDay && isCurrentMonth && "bg-muted/10",
                        isTodayDate && "bg-primary/5 ring-1 ring-inset ring-primary/20",
                        holidayItems.length > 0 && "bg-destructive/5"
                      )}
                    >
                      {/* Day Header */}
                      <div className="flex items-center justify-between mb-2">
                        <span className={cn(
                          "text-sm font-semibold",
                          !isCurrentMonth && "text-muted-foreground/40",
                          isCurrentMonth && "text-foreground",
                          isTodayDate && "bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs"
                        )}>
                          {format(day, 'd')}
                        </span>
                        {totalOnLeave > 0 && isCurrentMonth && (
                          <span className="text-[10px] font-medium text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 px-1.5 py-0.5 rounded-full">
                            {totalOnLeave} on leave
                          </span>
                        )}
                      </div>

                      {/* Holiday */}
                      {holidayItems.map(holiday => (
                        <div 
                          key={holiday.id} 
                          className="mb-2 p-1.5 rounded bg-destructive/10 border border-destructive/20"
                        >
                          <span className="text-[10px] font-semibold text-destructive">
                            🏖️ {holiday.name}
                          </span>
                        </div>
                      ))}

                      {/* Leave Items by Type */}
                      {isCurrentMonth && (
                        <div className="space-y-1.5">
                          {Object.entries(leaveByType).map(([type, items]) => {
                            const colors = leaveTypeColors[type] || leaveTypeColors['Annual'];
                            return (
                              <div key={type} className={cn("rounded p-1.5", colors.bg)}>
                                <div className="flex items-center justify-between mb-1">
                                  <span className={cn("text-[9px] font-bold uppercase", colors.text)}>
                                    {type}
                                  </span>
                                  <span className={cn("text-[9px] font-medium", colors.text)}>
                                    ({items.length})
                                  </span>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {items.slice(0, 3).map(({ employee }) => (
                                    <div 
                                      key={employee.id}
                                      className="flex items-center gap-1 bg-white/50 dark:bg-black/20 rounded px-1 py-0.5"
                                      title={`${employee.full_name} - ${employee.department}`}
                                    >
                                      <Avatar className="w-4 h-4 border border-white/50">
                                        <AvatarImage src={employee.photo_url || ''} />
                                        <AvatarFallback className="text-[7px] bg-secondary">
                                          {employee.full_name?.charAt(0)}
                                        </AvatarFallback>
                                      </Avatar>
                                      <span className={cn("text-[8px] font-medium truncate max-w-[50px]", colors.text)}>
                                        {employee.full_name.split(' ')[0]}
                                      </span>
                                    </div>
                                  ))}
                                  {items.length > 3 && (
                                    <span className={cn("text-[8px] font-medium px-1", colors.text)}>
                                      +{items.length - 3}
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Leave Summary for Current Month */}
          <div className="bg-card rounded-xl border border-border p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-500" />
              All Leaves in {format(currentMonth, 'MMMM yyyy')}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {approvedLeave
                .filter(l => {
                  const start = parseISO(l.start_date);
                  const end = parseISO(l.end_date);
                  return (isSameMonth(start, currentMonth) || isSameMonth(end, currentMonth) ||
                    (start < monthStart && end > monthEnd));
                })
                .sort((a, b) => parseISO(a.start_date).getTime() - parseISO(b.start_date).getTime())
                .map(l => {
                  const employee = getEmployeeById(l.employee_id);
                  const colors = leaveTypeColors[l.leave_type] || leaveTypeColors['Annual'];
                  const start = parseISO(l.start_date);
                  const end = parseISO(l.end_date);
                  
                  return (
                    <div 
                      key={l.id} 
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg border transition-colors",
                        colors.bg,
                        "border-border/50"
                      )}
                    >
                      <Avatar className="w-10 h-10 border-2 border-white/50">
                        <AvatarImage src={employee?.photo_url || ''} />
                        <AvatarFallback className="text-sm bg-secondary">
                          {employee?.full_name?.split(' ').map(n => n[0]).join('').substring(0, 2) || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-sm font-medium truncate", colors.text)}>
                          {employee?.full_name || 'Unknown'}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {employee?.department}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className={cn(
                          "text-[10px] font-bold uppercase px-2 py-0.5 rounded-full",
                          colors.bg, colors.text, "border border-current/20"
                        )}>
                          {l.leave_type}
                        </span>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {format(start, 'MMM d')} - {format(end, 'MMM d')}
                        </p>
                        <p className="text-[10px] font-medium text-foreground">
                          {l.days_count} days
                        </p>
                      </div>
                    </div>
                  );
                })}
              {approvedLeave.filter(l => {
                const start = parseISO(l.start_date);
                const end = parseISO(l.end_date);
                return (isSameMonth(start, currentMonth) || isSameMonth(end, currentMonth) ||
                  (start < monthStart && end > monthEnd));
              }).length === 0 && (
                <div className="col-span-full text-center py-8 text-muted-foreground">
                  <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No approved leaves in {format(currentMonth, 'MMMM')}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Matrix View */}
      {viewMode === 'matrix' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 p-4 bg-card rounded-xl border border-border">
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search employees..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-8 h-9 bg-secondary/50 border-border"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="w-[160px] h-9 bg-secondary/50 border-border">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map(dept => (
                  <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={leaveTypeFilter} onValueChange={setLeaveTypeFilter}>
              <SelectTrigger className="w-[140px] h-9 bg-secondary/50 border-border">
                <SelectValue placeholder="Leave Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Leave Types</SelectItem>
                {leaveTypes.map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {(searchQuery || departmentFilter !== 'all' || leaveTypeFilter !== 'all') && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setSearchQuery('');
                  setDepartmentFilter('all');
                  setLeaveTypeFilter('all');
                }}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Clear filters
              </Button>
            )}

            <span className="text-xs text-muted-foreground ml-auto">
              {filteredEmployees.length} of {activeEmployees.length} employees
            </span>
          </div>

          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <ScrollArea className="w-full">
              <div className="min-w-[900px]">
                {/* Header Row - Dates */}
                <div className="flex border-b border-border bg-muted/30">
                  <div className="w-48 min-w-[192px] p-3 border-r border-border sticky left-0 bg-muted/50 z-10">
                  <span className="text-xs font-semibold text-muted-foreground">EMPLOYEE</span>
                </div>
                <div className="flex flex-1">
                  {daysInMonth.map(day => {
                    const holiday = getHolidayForDate(day);
                    const isTodayDate = isToday(day);
                    const isWeekendDay = isWeekend(day);
                    
                    return (
                      <div 
                        key={day.toISOString()} 
                        className={cn(
                          "flex-1 min-w-[40px] p-2 text-center border-r border-border last:border-r-0",
                          isWeekendDay && "bg-muted/20",
                          holiday && "bg-destructive/5"
                        )}
                      >
                        <div className={cn(
                          "text-[10px] font-medium text-muted-foreground",
                          isWeekendDay && "text-destructive/70"
                        )}>
                          {format(day, 'EEE')}
                        </div>
                        <div className={cn(
                          "text-sm font-semibold",
                          isTodayDate && "bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center mx-auto",
                          !isTodayDate && "text-foreground"
                        )}>
                          {format(day, 'd')}
                        </div>
                        {holiday && (
                          <div className="text-[8px] text-destructive truncate mt-0.5" title={holiday.name}>
                            {holiday.name}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Employee Rows */}
              {filteredEmployees.map(employee => {
                // Check if employee has any leave matching the filter
                const hasMatchingLeave = leaveTypeFilter === 'all' || 
                  daysInMonth.some(day => {
                    const leaveRecord = getEmployeeLeaveForDate(employee.id, day);
                    return leaveRecord && leaveRecord.leave_type === leaveTypeFilter;
                  });

                if (leaveTypeFilter !== 'all' && !hasMatchingLeave) return null;

                return (
                  <div key={employee.id} className="flex border-b border-border last:border-b-0 hover:bg-muted/10 transition-colors">
                    {/* Employee Info - Sticky */}
                    <div className="w-48 min-w-[192px] p-2 border-r border-border sticky left-0 bg-card z-10 flex items-center gap-2">
                      <Avatar className="w-7 h-7 border border-border">
                        <AvatarImage src={employee.photo_url || ''} />
                        <AvatarFallback className="text-[10px] bg-secondary">
                          {employee.full_name?.charAt(0) || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{employee.full_name}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{employee.job_position}</p>
                      </div>
                    </div>

                    {/* Leave Cells */}
                    <div className="flex flex-1">
                      {daysInMonth.map(day => {
                        const leaveRecord = getEmployeeLeaveForDate(employee.id, day);
                        const holiday = getHolidayForDate(day);
                        const isWeekendDay = isWeekend(day);
                        const colors = leaveRecord ? leaveTypeColors[leaveRecord.leave_type] || leaveTypeColors['Annual'] : null;
                        
                        // Hide leave that doesn't match filter
                        const showLeave = leaveRecord && (leaveTypeFilter === 'all' || leaveRecord.leave_type === leaveTypeFilter);

                        return (
                          <div 
                            key={day.toISOString()} 
                            className={cn(
                              "flex-1 min-w-[40px] p-1 border-r border-border last:border-r-0 flex items-center justify-center",
                              isWeekendDay && "bg-muted/20",
                              holiday && "bg-destructive/5"
                            )}
                          >
                            {showLeave && (
                              <div 
                                className={cn(
                                  "w-full h-6 rounded text-[9px] font-medium flex items-center justify-center truncate px-0.5",
                                  colors?.bg,
                                  colors?.text
                                )}
                                title={`${leaveRecord.leave_type} Leave`}
                              >
                                {leaveRecord.leave_type.substring(0, 3)}
                              </div>
                            )}
                            {holiday && !showLeave && (
                              <div className="w-2 h-2 rounded-full bg-destructive/50" title={holiday.name} />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {filteredEmployees.length === 0 && (
                <div className="p-8 text-center text-muted-foreground text-sm">
                  No employees found matching your filters
                </div>
              )}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>
      </div>
      )}

      {/* Calendar View */}
      {viewMode === 'calendar' && (
        <>
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            {/* Day Headers */}
            <div className="grid grid-cols-7 border-b border-border">
              {dayNames.map((day, idx) => (
                <div 
                  key={day} 
                  className={cn(
                    "py-3 text-center text-xs font-medium text-muted-foreground border-r border-border last:border-r-0",
                    idx === 0 && "text-destructive/70"
                  )}
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Weeks */}
            {weeks.map((week, weekIndex) => (
              <div key={weekIndex} className="grid grid-cols-7 border-b border-border last:border-b-0">
                {week.map((day, dayIndex) => {
                  const { leaveItems, holidayItems, eventItems } = getEventsForDate(day);
                  const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
                  const isTodayDate = isToday(day);

                  // Group leave by type for display
                  const leaveByType: Record<string, typeof leaveItems> = {};
                  leaveItems.forEach(l => {
                    const type = l.leave_type;
                    if (!leaveByType[type]) leaveByType[type] = [];
                    leaveByType[type].push(l);
                  });

                  return (
                    <div
                      key={day.toISOString()}
                      className={cn(
                        "min-h-[120px] p-2 border-r border-border last:border-r-0 transition-colors",
                        !isCurrentMonth && "bg-muted/30",
                        isTodayDate && "bg-primary/5"
                      )}
                    >
                      {/* Day Number */}
                      <div className="flex items-start justify-between mb-1">
                        <span className={cn(
                          "text-xs font-medium uppercase text-muted-foreground",
                          dayIndex === 0 && "text-destructive/70"
                        )}>
                          {dayNames[dayIndex]}
                        </span>
                        <span className={cn(
                          "text-lg font-semibold",
                          !isCurrentMonth && "text-muted-foreground/50",
                          isCurrentMonth && "text-foreground",
                          isTodayDate && "bg-primary text-primary-foreground rounded-full w-7 h-7 flex items-center justify-center text-sm"
                        )}>
                          {format(day, 'd')}
                        </span>
                      </div>

                      {/* Events Container */}
                      <div className="space-y-1 mt-1">
                        {/* Holidays */}
                        {holidayItems.map(holiday => (
                          <div key={holiday.id} className="text-xs">
                            <span className="text-destructive font-medium">{holiday.name}</span>
                            <p className="text-[10px] text-muted-foreground">All employees</p>
                          </div>
                        ))}

                        {/* Leave by type with avatars */}
                        {Object.entries(leaveByType).map(([type, items]) => {
                          const colors = leaveTypeColors[type] || leaveTypeColors['Annual'];
                          return (
                            <div key={type} className="space-y-0.5">
                              <span className={cn("text-[11px] font-medium", colors.text)}>
                                {type} Leave
                              </span>
                              <div className="flex -space-x-1.5">
                                {items.slice(0, 4).map(l => {
                                  const employee = getEmployeeById(l.employee_id);
                                  return (
                                    <Avatar key={l.id} className="w-5 h-5 border border-background">
                                      <AvatarImage src={employee?.photo_url || ''} />
                                      <AvatarFallback className="text-[8px] bg-secondary">
                                        {employee?.full_name?.charAt(0) || '?'}
                                      </AvatarFallback>
                                    </Avatar>
                                  );
                                })}
                                {items.length > 4 && (
                                  <div className="w-5 h-5 rounded-full bg-muted border border-background flex items-center justify-center">
                                    <span className="text-[8px] text-muted-foreground">+{items.length - 4}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}

                        {/* Custom Events */}
                        {eventItems.map(event => (
                          <div key={event.id} className="text-[10px] text-primary font-medium truncate">
                            {event.title}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-6 pt-2 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="w-2.5 h-2.5 rounded-full bg-destructive" />
              <span>Holiday</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
              <span>Sick Leave</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              <span>Annual Leave</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="w-2.5 h-2.5 rounded-full bg-gray-500" />
              <span>Bereavement</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
              <span>WFH</span>
            </div>
          </div>
        </>
      )}

      {/* Matrix View Legend */}
      {viewMode === 'matrix' && (
        <div className="flex items-center gap-4 pt-2 flex-wrap">
          {Object.entries(leaveTypeColors).map(([type, colors]) => (
            <div key={type} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className={cn("w-6 h-4 rounded text-[8px] font-medium flex items-center justify-center", colors.bg, colors.text)}>
                {type.substring(0, 3)}
              </span>
              <span>{type}</span>
            </div>
          ))}
        </div>
      )}

      {/* Birthdays View */}
      {viewMode === 'birthdays' && (
        <div className="space-y-4">
          {/* Birthday Calendar Grid */}
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-7 border-b border-border">
              {dayNames.map(day => (
                <div key={day} className="p-3 text-center">
                  <span className="text-xs font-semibold text-muted-foreground">{day}</span>
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            {weeks.map((week, weekIdx) => (
              <div key={weekIdx} className="grid grid-cols-7 border-b border-border last:border-b-0">
                {week.map(day => {
                  const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
                  const isTodayDate = isToday(day);
                  const dayOfMonth = day.getDate();
                  const monthOfDay = day.getMonth();
                  
                  // Find employees with birthdays on this day (any year)
                  const birthdayEmployees = employees.filter(emp => {
                    if (!emp.birthday) return false;
                    const birthday = parseISO(emp.birthday);
                    return birthday.getDate() === dayOfMonth && birthday.getMonth() === monthOfDay;
                  });

                  return (
                    <div 
                      key={day.toISOString()} 
                      className={cn(
                        "min-h-[100px] p-2 border-r border-border last:border-r-0 transition-colors",
                        !isCurrentMonth && "bg-muted/30",
                        isCurrentMonth && "bg-card",
                        isTodayDate && "bg-primary/5",
                        birthdayEmployees.length > 0 && isCurrentMonth && "bg-pink-500/5"
                      )}
                    >
                      {/* Day Number */}
                      <div className="flex items-center justify-between mb-1">
                        <span className={cn(
                          "text-sm font-medium",
                          !isCurrentMonth && "text-muted-foreground/50",
                          isCurrentMonth && "text-foreground",
                          isTodayDate && "bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs"
                        )}>
                          {format(day, 'd')}
                        </span>
                        {birthdayEmployees.length > 0 && isCurrentMonth && (
                          <Cake className="w-3 h-3 text-pink-500" />
                        )}
                      </div>

                      {/* Birthday Employees */}
                      {isCurrentMonth && birthdayEmployees.length > 0 && (
                        <div className="space-y-1">
                          {birthdayEmployees.slice(0, 3).map(emp => (
                            <div 
                              key={emp.id} 
                              className="flex items-center gap-1 p-1 rounded bg-pink-500/10 border border-pink-500/20"
                              title={`${emp.full_name}'s Birthday`}
                            >
                              {emp.photo_url ? (
                                <img src={emp.photo_url} alt={emp.full_name} className="w-4 h-4 rounded-full object-cover" />
                              ) : (
                                <div className="w-4 h-4 rounded-full bg-pink-500/30 flex items-center justify-center text-[8px] font-bold text-pink-600">
                                  {emp.full_name.charAt(0)}
                                </div>
                              )}
                              <span className="text-[9px] font-medium text-pink-600 dark:text-pink-400 truncate flex-1">
                                {emp.full_name.split(' ')[0]}
                              </span>
                            </div>
                          ))}
                          {birthdayEmployees.length > 3 && (
                            <span className="text-[9px] text-pink-500 font-medium">
                              +{birthdayEmployees.length - 3} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Birthday List for Current Month */}
          <div className="bg-card rounded-xl border border-border p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Cake className="w-4 h-4 text-pink-500" />
              Birthdays in {format(currentMonth, 'MMMM')}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {employees
                .filter(emp => {
                  if (!emp.birthday) return false;
                  const birthday = parseISO(emp.birthday);
                  return birthday.getMonth() === currentMonth.getMonth();
                })
                .sort((a, b) => {
                  const dayA = parseISO(a.birthday!).getDate();
                  const dayB = parseISO(b.birthday!).getDate();
                  return dayA - dayB;
                })
                .map(emp => {
                  const birthday = parseISO(emp.birthday!);
                  const isTodayBirthday = isToday(new Date(currentMonth.getFullYear(), birthday.getMonth(), birthday.getDate()));
                  
                  return (
                    <div 
                      key={emp.id} 
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg border transition-colors",
                        isTodayBirthday 
                          ? "bg-pink-500/20 border-pink-500/40" 
                          : "bg-secondary/30 border-border hover:bg-secondary/50"
                      )}
                    >
                      {emp.photo_url ? (
                        <img src={emp.photo_url} alt={emp.full_name} className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-pink-500/20 flex items-center justify-center text-sm font-bold text-pink-500">
                          {emp.full_name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{emp.full_name}</p>
                        <p className="text-xs text-muted-foreground">{emp.department}</p>
                      </div>
                      <div className="text-right">
                        <p className={cn(
                          "text-sm font-bold",
                          isTodayBirthday ? "text-pink-500" : "text-foreground"
                        )}>
                          {format(birthday, 'MMM d')}
                        </p>
                        {isTodayBirthday && (
                          <span className="text-[10px] text-pink-500 font-medium">🎂 Today!</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              {employees.filter(emp => {
                if (!emp.birthday) return false;
                const birthday = parseISO(emp.birthday);
                return birthday.getMonth() === currentMonth.getMonth();
              }).length === 0 && (
                <div className="col-span-full text-center py-8 text-muted-foreground">
                  <Cake className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No birthdays in {format(currentMonth, 'MMMM')}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Event Modal */}
      <Dialog open={isEventModalOpen} onOpenChange={setIsEventModalOpen}>
        <DialogContent className="max-w-md glass-card border-border">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-foreground">Add Event</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmitEvent} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Event Title *</Label>
              <Input
                required
                value={eventForm.title}
                onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                className="bg-secondary/50 border-border"
                placeholder="Team Meeting"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Event Type</Label>
              <Select 
                value={eventForm.event_type} 
                onValueChange={(v) => setEventForm({ ...eventForm, event_type: v as typeof eventForm.event_type })}
              >
                <SelectTrigger className="bg-secondary/50 border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="General">General</SelectItem>
                  <SelectItem value="Meeting">Meeting</SelectItem>
                  <SelectItem value="Training">Training</SelectItem>
                  <SelectItem value="Holiday">Holiday</SelectItem>
                  <SelectItem value="Company">Company Event</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Start Date *</Label>
                <Input
                  type="date"
                  required
                  value={eventForm.start_date}
                  onChange={(e) => setEventForm({ ...eventForm, start_date: e.target.value })}
                  className="bg-secondary/50 border-border"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">End Date</Label>
                <Input
                  type="date"
                  value={eventForm.end_date}
                  onChange={(e) => setEventForm({ ...eventForm, end_date: e.target.value })}
                  className="bg-secondary/50 border-border"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Description</Label>
              <Textarea
                value={eventForm.description}
                onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                className="bg-secondary/50 border-border min-h-[60px]"
                placeholder="Event details..."
              />
            </div>
            <div className="flex gap-2 pt-4 border-t border-border">
              <Button type="submit" className="flex-1 bg-primary hover:bg-primary/90" disabled={addEvent.isPending}>
                {addEvent.isPending ? 'Adding...' : 'Add Event'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setIsEventModalOpen(false)} className="border-border">
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
