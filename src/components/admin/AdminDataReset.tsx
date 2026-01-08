import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Trash2, AlertTriangle, Clock, Calendar, FileText, Users, DollarSign, CalendarDays } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { DateRange } from 'react-day-picker';

type DataType = 'attendance' | 'attendance_by_date' | 'leave_records' | 'payroll' | 'contracts' | 'employees' | 'all';

export function AdminDataReset() {
  const [confirmType, setConfirmType] = useState<DataType | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const queryClient = useQueryClient();

  const dataTypes = [
    { type: 'attendance' as DataType, label: 'Attendance Records', icon: Clock, description: 'Delete all check-in/check-out records' },
    { type: 'leave_records' as DataType, label: 'Leave Records', icon: Calendar, description: 'Delete all leave requests and balances' },
    { type: 'payroll' as DataType, label: 'Payroll Data', icon: DollarSign, description: 'Delete all payroll records' },
    { type: 'contracts' as DataType, label: 'Contracts', icon: FileText, description: 'Delete all employee contracts' },
    { type: 'employees' as DataType, label: 'Employees', icon: Users, description: 'Delete all employees and related data' },
  ];

  const handleDelete = async (type: DataType) => {
    setIsDeleting(true);
    try {
      if (type === 'all') {
        // Delete in order to respect foreign key constraints
        await supabase.from('attendance_appeals').delete().gte('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('attendance').delete().gte('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('leave_records').delete().gte('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('leave_balances').delete().gte('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('payroll').delete().gte('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('contracts').delete().gte('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('employee_documents').delete().gte('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('employee_education').delete().gte('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('employee_discipline').delete().gte('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('employee_corrective_actions').delete().gte('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('employee_performance').delete().gte('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('employee_face_data').delete().gte('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('employee_shifts').delete().gte('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('employee_badges').delete().gte('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('gamification_points').delete().gte('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('gamification_transactions').delete().gte('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('eos_records').delete().gte('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('hr_letters').delete().gte('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('org_chart_positions').delete().gte('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('employees').delete().gte('id', '00000000-0000-0000-0000-000000000000');
        toast.success('All data deleted successfully');
      } else if (type === 'employees') {
        // Delete all employee-related data first
        await supabase.from('attendance_appeals').delete().gte('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('attendance').delete().gte('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('leave_records').delete().gte('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('leave_balances').delete().gte('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('payroll').delete().gte('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('contracts').delete().gte('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('employee_documents').delete().gte('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('employee_education').delete().gte('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('employee_discipline').delete().gte('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('employee_corrective_actions').delete().gte('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('employee_performance').delete().gte('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('employee_face_data').delete().gte('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('employee_shifts').delete().gte('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('employee_badges').delete().gte('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('gamification_points').delete().gte('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('gamification_transactions').delete().gte('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('eos_records').delete().gte('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('hr_letters').delete().gte('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('org_chart_positions').delete().gte('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('employees').delete().gte('id', '00000000-0000-0000-0000-000000000000');
        toast.success('All employees and related data deleted');
      } else if (type === 'attendance_by_date' && dateRange?.from) {
        const fromStr = format(dateRange.from, 'yyyy-MM-dd');
        const toStr = dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : fromStr;
        
        const { error } = await supabase
          .from('attendance')
          .delete()
          .gte('date', fromStr)
          .lte('date', toStr);
        
        if (error) throw error;
        
        if (dateRange.to && dateRange.from.getTime() !== dateRange.to.getTime()) {
          toast.success(`Attendance records from ${format(dateRange.from, 'MMM d, yyyy')} to ${format(dateRange.to, 'MMM d, yyyy')} deleted successfully`);
        } else {
          toast.success(`Attendance records for ${format(dateRange.from, 'MMM d, yyyy')} deleted successfully`);
        }
        setDateRange(undefined);
      } else if (type !== 'attendance_by_date') {
        const { error } = await supabase.from(type).delete().gte('id', '00000000-0000-0000-0000-000000000000');
        if (error) throw error;
        toast.success(`${type.replace('_', ' ')} deleted successfully`);
      }

      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      queryClient.invalidateQueries({ queryKey: ['leave'] });
      queryClient.invalidateQueries({ queryKey: ['payroll'] });
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete data');
    } finally {
      setIsDeleting(false);
      setConfirmType(null);
    }
  };

  const getDateRangeLabel = () => {
    if (!dateRange?.from) return 'Date Range';
    if (!dateRange.to || dateRange.from.getTime() === dateRange.to.getTime()) {
      return format(dateRange.from, 'MMM d');
    }
    return `${format(dateRange.from, 'MMM d')} - ${format(dateRange.to, 'MMM d')}`;
  };

  const getConfirmationMessage = () => {
    if (confirmType === 'all') {
      return 'This will permanently delete ALL data from the system including employees, attendance, leave records, payroll, and contracts. This action cannot be undone.';
    }
    if (confirmType === 'employees') {
      return 'This will permanently delete all employees and all their related data (attendance, leave, payroll, contracts). This action cannot be undone.';
    }
    if (confirmType === 'attendance_by_date' && dateRange?.from) {
      if (dateRange.to && dateRange.from.getTime() !== dateRange.to.getTime()) {
        return `This will permanently delete all attendance records from ${format(dateRange.from, 'MMMM d, yyyy')} to ${format(dateRange.to, 'MMMM d, yyyy')}. This action cannot be undone.`;
      }
      return `This will permanently delete all attendance records for ${format(dateRange.from, 'MMMM d, yyyy')}. This action cannot be undone.`;
    }
    return `This will permanently delete all ${confirmType?.replace('_', ' ')} from the system. This action cannot be undone.`;
  };

  return (
    <div className="space-y-6">
      <Card className="border-destructive/20 bg-destructive/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle size={20} />
            Danger Zone
          </CardTitle>
          <CardDescription>
            These actions are irreversible. Please proceed with caution.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {dataTypes.map((data) => (
            <div key={data.type} className="flex items-center justify-between p-4 border rounded-lg bg-background">
              <div className="flex items-center gap-3">
                <data.icon className="text-muted-foreground" size={20} />
                <div>
                  <p className="font-medium">{data.label}</p>
                  <p className="text-sm text-muted-foreground">{data.description}</p>
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
                          dateRange?.from && "text-foreground"
                        )}
                      >
                        <CalendarDays size={14} className="mr-1" />
                        {getDateRangeLabel()}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                      <CalendarComponent
                        mode="range"
                        selected={dateRange}
                        onSelect={(range) => {
                          setDateRange(range);
                          // Close picker and trigger confirmation when a complete range is selected
                          if (range?.from && (range?.to || range?.from)) {
                            setDatePickerOpen(false);
                            setConfirmType('attendance_by_date');
                          }
                        }}
                        numberOfMonths={2}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                )}
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setConfirmType(data.type)}
                >
                  <Trash2 size={14} className="mr-1" />
                  Delete All
                </Button>
              </div>
            </div>
          ))}

          {/* Delete All Data */}
          <div className="flex items-center justify-between p-4 border-2 border-destructive rounded-lg bg-destructive/10">
            <div className="flex items-center gap-3">
              <AlertTriangle className="text-destructive" size={20} />
              <div>
                <p className="font-medium text-destructive">Delete All Data</p>
                <p className="text-sm text-muted-foreground">Permanently delete all data from the system</p>
              </div>
            </div>
            <Button
              variant="destructive"
              onClick={() => setConfirmType('all')}
            >
              <Trash2 size={14} className="mr-1" />
              Delete Everything
            </Button>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={confirmType !== null} onOpenChange={(open) => !open && setConfirmType(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="text-destructive" size={20} />
              Confirm Deletion
            </AlertDialogTitle>
            <AlertDialogDescription>
              {getConfirmationMessage()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmType && handleDelete(confirmType)}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete Permanently'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
