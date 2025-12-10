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
import { ChevronLeft, ChevronRight, Plus, LayoutGrid, Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, isToday, parseISO, startOfWeek, endOfWeek, addWeeks, getWeeksInMonth } from 'date-fns';

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
  const [viewMode, setViewMode] = useState<'matrix' | 'calendar'>('calendar');
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
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
  
  // Get all weeks in the month
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

  const leaveTypeColors: Record<string, string> = {
    'Annual': 'text-blue-600',
    'Sick': 'text-orange-600',
    'Emergency': 'text-red-600',
    'Maternity': 'text-pink-600',
    'Paternity': 'text-indigo-600',
    'Bereavement': 'text-gray-600',
    'Unpaid': 'text-slate-600',
    'WFH': 'text-green-600',
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
              onClick={() => setViewMode('matrix')}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                viewMode === 'matrix' 
                  ? "bg-background text-foreground shadow-sm" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Matrix view
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
              Calendar view
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

      {/* Calendar Grid */}
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
                    {Object.entries(leaveByType).map(([type, items]) => (
                      <div key={type} className="space-y-0.5">
                        <span className={cn(
                          "text-[11px] font-medium",
                          leaveTypeColors[type] || "text-foreground"
                        )}>
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
                    ))}

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
      <div className="flex items-center gap-6 pt-2">
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
