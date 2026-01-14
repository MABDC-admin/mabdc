import { useState } from 'react';
import { format } from 'date-fns';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  useShiftOverrides, 
  useUpsertShiftOverride, 
  useDeleteShiftOverride,
  ShiftOverride 
} from '@/hooks/useShiftOverrides';
import { useEmployees } from '@/hooks/useEmployees';
import { Clock, Plus, Trash2, CalendarIcon, User } from 'lucide-react';
import { toast } from 'sonner';

interface ShiftOverrideDialogProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: string; // YYYY-MM-DD
}

export function ShiftOverrideDialog({ isOpen, onClose, selectedDate }: ShiftOverrideDialogProps) {
  const { data: employees = [] } = useEmployees();
  const { data: overrides = [] } = useShiftOverrides(selectedDate);
  const upsertOverride = useUpsertShiftOverride();
  const deleteOverride = useDeleteShiftOverride();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    employee_id: '',
    override_date: selectedDate,
    shift_start_time: '08:00',
    shift_end_time: '17:00',
    reason: ''
  });

  const handleCreate = async () => {
    if (!formData.employee_id) {
      toast.error('Please select an employee');
      return;
    }
    
    if (formData.shift_start_time >= formData.shift_end_time) {
      toast.error('End time must be after start time');
      return;
    }

    try {
      await upsertOverride.mutateAsync(formData);
      setFormData({
        employee_id: '',
        override_date: selectedDate,
        shift_start_time: '08:00',
        shift_end_time: '17:00',
        reason: ''
      });
      setShowCreateForm(false);
    } catch (error) {
      console.error('Error creating override:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to remove this shift override?')) {
      await deleteOverride.mutateAsync(id);
    }
  };

  const getEmployeeName = (employeeId: string) => {
    const employee = employees.find(e => e.id === employeeId);
    return employee ? `${employee.full_name} (${employee.hrms_no})` : 'Unknown Employee';
  };

  const activeEmployees = employees.filter(e => e.status === 'Active');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Manage Shift Overrides - {format(new Date(selectedDate), 'MMMM dd, yyyy')}
          </DialogTitle>
          <DialogDescription>
            Create flexible/custom schedules for employees on this specific date. These override their regular shift assignments.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Existing Overrides List */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">Active Overrides ({overrides.length})</h3>
              <Button 
                size="sm" 
                onClick={() => setShowCreateForm(!showCreateForm)}
                variant={showCreateForm ? "outline" : "default"}
              >
                {showCreateForm ? 'Cancel' : (
                  <>
                    <Plus className="w-4 h-4 mr-1" />
                    Add Override
                  </>
                )}
              </Button>
            </div>

            {showCreateForm && (
              <div className="p-4 mb-4 rounded-lg border bg-muted/50 space-y-3">
                <h4 className="text-sm font-medium">Create New Shift Override</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="employee">Employee</Label>
                    <Select 
                      value={formData.employee_id}
                      onValueChange={(v) => setFormData({ ...formData, employee_id: v })}
                    >
                      <SelectTrigger id="employee">
                        <SelectValue placeholder="Select employee" />
                      </SelectTrigger>
                      <SelectContent>
                        <ScrollArea className="h-64">
                          {activeEmployees.map((emp) => (
                            <SelectItem key={emp.id} value={emp.id}>
                              <div className="flex items-center gap-2">
                                <User className="w-3 h-3" />
                                {emp.full_name} ({emp.hrms_no})
                              </div>
                            </SelectItem>
                          ))}
                        </ScrollArea>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="date">Date</Label>
                    <div className="relative">
                      <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="date"
                        type="date"
                        className="pl-10"
                        value={formData.override_date}
                        onChange={(e) => setFormData({ ...formData, override_date: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="start-time">Shift Start</Label>
                    <Input
                      id="start-time"
                      type="time"
                      value={formData.shift_start_time}
                      onChange={(e) => setFormData({ ...formData, shift_start_time: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end-time">Shift End</Label>
                    <Input
                      id="end-time"
                      type="time"
                      value={formData.shift_end_time}
                      onChange={(e) => setFormData({ ...formData, shift_end_time: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reason">Reason (Optional)</Label>
                  <Textarea
                    id="reason"
                    placeholder="e.g., Doctor appointment, Flexible hours approved, Training session"
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    rows={2}
                  />
                </div>

                <Button 
                  onClick={handleCreate}
                  disabled={upsertOverride.isPending}
                  className="w-full"
                >
                  {upsertOverride.isPending ? 'Creating...' : 'Create Override'}
                </Button>
              </div>
            )}

            <ScrollArea className="h-[300px] pr-4">
              {overrides.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No shift overrides for this date</p>
                  <p className="text-sm">Click "Add Override" to create one</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {overrides.map((override) => (
                    <div 
                      key={override.id}
                      className="p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-primary" />
                            <span className="font-medium text-sm">
                              {getEmployeeName(override.employee_id)}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-3 text-sm">
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                              <Clock className="w-3 h-3 mr-1" />
                              {override.shift_start_time.substring(0, 5)} - {override.shift_end_time.substring(0, 5)}
                            </Badge>
                            
                            {override.reason && (
                              <span className="text-xs text-muted-foreground italic">
                                {override.reason}
                              </span>
                            )}
                          </div>

                          <div className="text-xs text-muted-foreground">
                            Created: {format(new Date(override.created_at), 'PPp')}
                          </div>
                        </div>

                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDelete(override.id)}
                          disabled={deleteOverride.isPending}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
