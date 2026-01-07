import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Database, Trash2, RefreshCw, Users, Calendar, Clock, DollarSign, FileText, CalendarDays } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useQueryClient } from '@tanstack/react-query';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

type DataType = 'attendance' | 'attendance_by_date' | 'leave_records' | 'payroll' | 'contracts' | 'employees' | 'all';

export function AdminDataReset() {
  const [confirmType, setConfirmType] = useState<DataType | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const queryClient = useQueryClient();

  const dataTypes = [
    { type: 'attendance' as DataType, label: 'Attendance Records', icon: Clock, description: 'Delete all check-in/check-out records' },
    { type: 'leave_records' as DataType, label: 'Leave Records', icon: Calendar, description: 'Delete all leave requests and history' },
    { type: 'payroll' as DataType, label: 'Payroll Records', icon: DollarSign, description: 'Delete all payroll and WPS records' },
    { type: 'contracts' as DataType, label: 'Contracts', icon: FileText, description: 'Delete all employee contracts' },
    { type: 'employees' as DataType, label: 'All Employees', icon: Users, description: 'Delete all employees and related data' },
  ];

  const handleDelete = async (type: DataType) => {
    setIsDeleting(true);
    try {
      if (type === 'all') {
        // Delete in correct order due to foreign key constraints
        await supabase.from('attendance').delete().gte('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('leave_records').delete().gte('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('payroll').delete().gte('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('contracts').delete().gte('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('eos_records').delete().gte('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('hr_letters').delete().gte('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('employee_documents').delete().gte('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('leave_balances').delete().gte('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('employees').delete().gte('id', '00000000-0000-0000-0000-000000000000');
        toast.success('All data has been deleted');
      } else if (type === 'employees') {
        // Delete employees and all related data
        await supabase.from('attendance').delete().gte('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('leave_records').delete().gte('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('payroll').delete().gte('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('contracts').delete().gte('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('eos_records').delete().gte('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('hr_letters').delete().gte('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('employee_documents').delete().gte('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('leave_balances').delete().gte('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('employees').delete().gte('id', '00000000-0000-0000-0000-000000000000');
        toast.success('All employees and related data deleted');
      } else if (type === 'attendance_by_date' && selectedDate) {
        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        const { error } = await supabase.from('attendance').delete().eq('date', dateStr);
        if (error) throw error;
        toast.success(`Attendance records for ${format(selectedDate, 'MMM d, yyyy')} deleted successfully`);
        setSelectedDate(undefined);
      } else if (type !== 'attendance_by_date') {
        const { error } = await supabase.from(type).delete().gte('id', '00000000-0000-0000-0000-000000000000');
        if (error) throw error;
        toast.success(`${type.replace('_', ' ')} deleted successfully`);
      }

      // Invalidate all queries to refresh data
      queryClient.invalidateQueries();
    } catch (error: any) {
      console.error('Delete error:', error);
      toast.error(`Failed to delete: ${error.message}`);
    } finally {
      setIsDeleting(false);
      setConfirmType(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Warning Banner */}
      <div className="glass-card rounded-3xl border border-destructive/30 bg-destructive/5 p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-6 h-6 text-destructive" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-destructive">Danger Zone</h2>
            <p className="text-sm text-muted-foreground mt-1">
              These actions are irreversible. All deleted data cannot be recovered. Please proceed with extreme caution.
            </p>
          </div>
        </div>
      </div>

      {/* Data Reset Options */}
      <div className="glass-card rounded-3xl border border-border p-6 space-y-4">
        <div className="flex items-center gap-3 mb-4">
          <Database className="w-5 h-5 text-muted-foreground" />
          <div>
            <h3 className="text-lg font-semibold text-foreground">Reset Specific Data</h3>
            <p className="text-xs text-muted-foreground">Select which data type to delete</p>
          </div>
        </div>

        <div className="grid gap-3">
          {dataTypes.map((data) => (
            <div 
              key={data.type}
              className="flex items-center justify-between p-4 rounded-xl border border-border bg-muted/20 hover:bg-muted/40 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                  <data.icon className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{data.label}</p>
                  <p className="text-xs text-muted-foreground">{data.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {data.type === 'attendance' && (
                  <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className={cn(
                          "text-muted-foreground border-border hover:bg-muted/40",
                          selectedDate && "text-foreground"
                        )}
                      >
                        <CalendarDays size={14} className="mr-1" />
                        {selectedDate ? format(selectedDate, 'MMM d') : 'By Date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                      <CalendarComponent
                        mode="single"
                        selected={selectedDate}
                        onSelect={(date) => {
                          setSelectedDate(date);
                          setDatePickerOpen(false);
                          if (date) {
                            setConfirmType('attendance_by_date');
                          }
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                )}
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setConfirmType(data.type)}
                  className="text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 size={14} className="mr-1" /> Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Full Reset */}
      <div className="glass-card rounded-3xl border border-destructive/30 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
              <RefreshCw className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Full System Reset</p>
              <p className="text-xs text-muted-foreground">Delete ALL data from the system</p>
            </div>
          </div>
          <Button 
            onClick={() => setConfirmType('all')}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            <Trash2 size={14} className="mr-1" /> Reset Everything
          </Button>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={!!confirmType} onOpenChange={() => setConfirmType(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Confirm Deletion
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmType === 'all' 
                ? 'This will permanently delete ALL data from the system including employees, attendance, leave records, payroll, and contracts. This action cannot be undone.'
                : confirmType === 'employees'
                ? 'This will permanently delete all employees and all their related data (attendance, leave, payroll, contracts). This action cannot be undone.'
                : confirmType === 'attendance_by_date' && selectedDate
                ? `This will permanently delete all attendance records for ${format(selectedDate, 'MMMM d, yyyy')}. This action cannot be undone.`
                : `This will permanently delete all ${confirmType?.replace('_', ' ')} from the system. This action cannot be undone.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => confirmType && handleDelete(confirmType)}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Yes, Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
