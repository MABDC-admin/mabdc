import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Clock, Calendar, Plus, AlertTriangle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

interface AttendanceRecord {
  id: string;
  date: string;
  check_in: string | null;
  check_out: string | null;
  status: string | null;
  employee_remarks: string | null;
  admin_remarks: string | null;
}

interface AttendanceDetailModalProps {
  open: boolean;
  onClose: () => void;
  date: Date;
  attendance: AttendanceRecord | null;
  employeeId: string;
  employeeName: string;
  isHRView?: boolean;
  onRequestAppeal?: () => void;
}

export function AttendanceDetailModal({
  open,
  onClose,
  date,
  attendance,
  employeeId,
  employeeName,
  isHRView = true,
  onRequestAppeal,
}: AttendanceDetailModalProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('details');
  const [eventForm, setEventForm] = useState({
    title: '',
    event_type: 'Holiday',
    description: '',
  });
  const [saving, setSaving] = useState(false);

  const handleAddEvent = async () => {
    if (!eventForm.title.trim()) {
      toast.error('Please enter event title');
      return;
    }

    setSaving(true);
    try {
      if (eventForm.event_type === 'Holiday') {
        // Add to public_holidays table
        const { error } = await supabase.from('public_holidays').insert([{
          name: eventForm.title,
          date: format(date, 'yyyy-MM-dd'),
          year: date.getFullYear(),
        }]);
        if (error) throw error;
        queryClient.invalidateQueries({ queryKey: ['public_holidays'] });
        toast.success('Holiday added successfully');
      } else {
        // Add to events table
        const { error } = await supabase.from('events').insert([{
          title: eventForm.title,
          event_type: eventForm.event_type,
          description: eventForm.description,
          start_date: format(date, 'yyyy-MM-dd'),
        }]);
        if (error) throw error;
        queryClient.invalidateQueries({ queryKey: ['events'] });
        toast.success('Event added successfully');
      }
      setEventForm({ title: '', event_type: 'Holiday', description: '' });
      onClose();
    } catch (error: any) {
      toast.error(`Failed to add: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'Present':
        return 'text-green-500';
      case 'Late':
      case 'Late | Undertime':
        return 'text-yellow-500';
      case 'Absent':
        return 'text-red-500';
      default:
        return 'text-muted-foreground';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            {format(date, 'EEEE, MMMM d, yyyy')}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details">Attendance</TabsTrigger>
            {isHRView && <TabsTrigger value="event">Add Event</TabsTrigger>}
          </TabsList>

          <TabsContent value="details" className="space-y-4 mt-4">
            <div className="text-sm text-muted-foreground mb-2">
              Employee: <span className="font-medium text-foreground">{employeeName}</span>
            </div>

            {attendance ? (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-secondary/50 border border-border">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-muted-foreground">Status</span>
                    <span className={cn("font-semibold", getStatusColor(attendance.status))}>
                      {attendance.status || 'Unknown'}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-green-500" />
                      <div>
                        <p className="text-xs text-muted-foreground">Check In</p>
                        <p className="font-medium">
                          {attendance.check_in ? format(parseISO(`2000-01-01T${attendance.check_in}`), 'hh:mm a') : '-'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-red-500" />
                      <div>
                        <p className="text-xs text-muted-foreground">Check Out</p>
                        <p className="font-medium">
                          {attendance.check_out ? format(parseISO(`2000-01-01T${attendance.check_out}`), 'hh:mm a') : '-'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Missed punch warning */}
                  {attendance.check_in && !attendance.check_out && (
                    <div className="mt-3 p-2 rounded bg-orange-500/10 border border-orange-500/30 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-orange-500" />
                      <span className="text-xs text-orange-500 font-medium">Missed Punch - No Check Out</span>
                    </div>
                  )}
                  {!attendance.check_in && attendance.check_out && (
                    <div className="mt-3 p-2 rounded bg-orange-500/10 border border-orange-500/30 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-orange-500" />
                      <span className="text-xs text-orange-500 font-medium">Missed Punch - No Check In</span>
                    </div>
                  )}
                </div>

                {attendance.employee_remarks && (
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground mb-1">Employee Remarks</p>
                    <p className="text-sm">{attendance.employee_remarks}</p>
                  </div>
                )}

                {attendance.admin_remarks && (
                  <div className="p-3 rounded-lg bg-primary/10">
                    <p className="text-xs text-muted-foreground mb-1">Admin Remarks</p>
                    <p className="text-sm">{attendance.admin_remarks}</p>
                  </div>
                )}

                {/* Request Time Correction button for employees */}
                {onRequestAppeal && (
                  <Button 
                    variant="outline" 
                    className="w-full mt-4 border-orange-500/50 text-orange-600 hover:bg-orange-50 hover:text-orange-700"
                    onClick={onRequestAppeal}
                  >
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    Request Time Correction
                  </Button>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No attendance record for this date</p>
                
                {/* Request Time Correction button for employees with no record */}
                {onRequestAppeal && (
                  <Button 
                    variant="outline" 
                    className="mt-4 border-orange-500/50 text-orange-600 hover:bg-orange-50 hover:text-orange-700"
                    onClick={onRequestAppeal}
                  >
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    Request Time Correction
                  </Button>
                )}
              </div>
            )}
          </TabsContent>

          {isHRView && (
            <TabsContent value="event" className="space-y-4 mt-4">
              <div>
                <label className="text-xs text-muted-foreground">Event Type</label>
                <Select value={eventForm.event_type} onValueChange={(v) => setEventForm({ ...eventForm, event_type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Holiday">Public Holiday</SelectItem>
                    <SelectItem value="Company Event">Company Event</SelectItem>
                    <SelectItem value="Meeting">Meeting</SelectItem>
                    <SelectItem value="Training">Training</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs text-muted-foreground">Title</label>
                <Input
                  value={eventForm.title}
                  onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                  placeholder={eventForm.event_type === 'Holiday' ? 'e.g., National Day' : 'Event title'}
                />
              </div>

              {eventForm.event_type !== 'Holiday' && (
                <div>
                  <label className="text-xs text-muted-foreground">Description (Optional)</label>
                  <Textarea
                    value={eventForm.description}
                    onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                    placeholder="Event description..."
                    rows={3}
                  />
                </div>
              )}

              <Button onClick={handleAddEvent} disabled={saving} className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                {saving ? 'Adding...' : `Add ${eventForm.event_type}`}
              </Button>
            </TabsContent>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
