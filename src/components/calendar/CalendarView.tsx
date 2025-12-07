import { useState, useMemo } from 'react';
import { useLeave, usePublicHolidays } from '@/hooks/useLeave';
import { useEvents, useAddEvent, useDeleteEvent } from '@/hooks/useSettings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ChevronLeft, ChevronRight, Plus, Trash2, CalendarDays, Users, Flag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isToday, parseISO } from 'date-fns';

interface CalendarViewProps {
  className?: string;
}

export function CalendarView({ className }: CalendarViewProps) {
  const { data: leave = [] } = useLeave();
  const { data: holidays = [] } = usePublicHolidays();
  const { data: events = [] } = useEvents();
  const addEvent = useAddEvent();
  const deleteEvent = useDeleteEvent();

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
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
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Get day of week for first day (0 = Sunday)
  const startDayOfWeek = monthStart.getDay();
  const paddingDays = Array(startDayOfWeek).fill(null);

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

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setEventForm(prev => ({
      ...prev,
      start_date: format(date, 'yyyy-MM-dd'),
      end_date: format(date, 'yyyy-MM-dd'),
    }));
  };

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

  const selectedDateEvents = selectedDate ? getEventsForDate(selectedDate) : null;

  const eventColors: Record<string, string> = {
    General: 'bg-primary',
    Meeting: 'bg-uae-blue',
    Training: 'bg-uae-green',
    Holiday: 'bg-destructive',
    Company: 'bg-accent',
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Calendar Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handlePrevMonth} className="h-8 w-8 border-border">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h2 className="text-lg font-semibold text-foreground min-w-[160px] text-center">
            {format(currentMonth, 'MMMM yyyy')}
          </h2>
          <Button variant="outline" size="icon" onClick={handleNextMonth} className="h-8 w-8 border-border">
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        <Button size="sm" onClick={() => setIsEventModalOpen(true)} className="bg-primary hover:bg-primary/90">
          <Plus className="w-4 h-4 mr-1" /> Add Event
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Calendar Grid */}
        <div className="lg:col-span-3 glass-card rounded-2xl border border-border p-4">
          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-1">
            {paddingDays.map((_, i) => (
              <div key={`padding-${i}`} className="aspect-square" />
            ))}
            {daysInMonth.map(day => {
              const { leaveItems, holidayItems, eventItems } = getEventsForDate(day);
              const hasEvents = leaveItems.length > 0 || holidayItems.length > 0 || eventItems.length > 0;
              const isSelected = selectedDate && isSameDay(day, selectedDate);

              return (
                <button
                  key={day.toISOString()}
                  onClick={() => handleDateClick(day)}
                  className={cn(
                    "aspect-square p-1 rounded-lg transition-all relative group",
                    "hover:bg-secondary/50",
                    isToday(day) && "ring-2 ring-primary",
                    isSelected && "bg-primary/10",
                    !isSameMonth(day, currentMonth) && "opacity-50"
                  )}
                >
                  <span className={cn(
                    "text-sm font-medium",
                    isToday(day) && "text-primary font-bold",
                    isSelected && "text-primary"
                  )}>
                    {format(day, 'd')}
                  </span>
                  
                  {hasEvents && (
                    <div className="absolute bottom-1 left-1 right-1 flex gap-0.5 justify-center">
                      {holidayItems.length > 0 && (
                        <span className="w-1.5 h-1.5 rounded-full bg-destructive" />
                      )}
                      {leaveItems.length > 0 && (
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      )}
                      {eventItems.length > 0 && (
                        <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="w-2.5 h-2.5 rounded-full bg-destructive" />
              <span>Holiday</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span>Leave</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="w-2.5 h-2.5 rounded-full bg-primary" />
              <span>Event</span>
            </div>
          </div>
        </div>

        {/* Selected Date Events */}
        <div className="glass-card rounded-2xl border border-border p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">
            {selectedDate ? format(selectedDate, 'EEEE, MMMM d') : 'Select a date'}
          </h3>
          
          {selectedDate && selectedDateEvents ? (
            <div className="space-y-2 max-h-80 overflow-y-auto soft-scroll">
              {selectedDateEvents.holidayItems.length === 0 && 
               selectedDateEvents.leaveItems.length === 0 && 
               selectedDateEvents.eventItems.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">No events on this day</p>
              ) : (
                <>
                  {selectedDateEvents.holidayItems.map(holiday => (
                    <div key={holiday.id} className="p-2 rounded-lg bg-destructive/10 border border-destructive/20">
                      <div className="flex items-center gap-2">
                        <Flag className="w-3 h-3 text-destructive" />
                        <span className="text-xs font-medium text-foreground">{holiday.name}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Public Holiday</p>
                    </div>
                  ))}
                  
                  {selectedDateEvents.leaveItems.map(leaveItem => (
                    <div key={leaveItem.id} className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                      <div className="flex items-center gap-2">
                        <Users className="w-3 h-3 text-amber-500" />
                        <span className="text-xs font-medium text-foreground">{leaveItem.employees?.full_name}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{leaveItem.leave_type} Leave</p>
                    </div>
                  ))}
                  
                  {selectedDateEvents.eventItems.map(event => (
                    <div 
                      key={event.id} 
                      className="p-2 rounded-lg bg-primary/10 border border-primary/20 group"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CalendarDays className="w-3 h-3 text-primary" />
                          <span className="text-xs font-medium text-foreground">{event.title}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => deleteEvent.mutate(event.id)}
                        >
                          <Trash2 className="w-3 h-3 text-destructive" />
                        </Button>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{event.event_type}</p>
                    </div>
                  ))}
                </>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground py-4 text-center">Click a date to see events</p>
          )}
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
