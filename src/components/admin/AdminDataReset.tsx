import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Trash2, AlertTriangle, Clock, Calendar, FileText, Users, DollarSign, CalendarDays, Filter, Eye, ChevronDown, RotateCcw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { useEmployees } from '@/hooks/useEmployees';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { DateRange } from 'react-day-picker';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

type DataType = 'attendance' | 'attendance_filtered' | 'leave_records' | 'leave_records_filtered' | 'payroll' | 'payroll_filtered' | 'contracts' | 'contracts_filtered' | 'employees' | 'all';
type ClearPunchType = 'check_in' | 'check_out' | 'both';

export function AdminDataReset() {
  const [confirmType, setConfirmType] = useState<DataType | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const queryClient = useQueryClient();
  const { data: employees = [] } = useEmployees();

  // Date ranges for each module
  const [attendanceDateRange, setAttendanceDateRange] = useState<DateRange | undefined>(undefined);
  const [leaveDateRange, setLeaveDateRange] = useState<DateRange | undefined>(undefined);
  const [payrollMonth, setPayrollMonth] = useState<string>('');
  const [contractsDateRange, setContractsDateRange] = useState<DateRange | undefined>(undefined);

  // Employee filters for each module
  const [attendanceEmployees, setAttendanceEmployees] = useState<string[]>([]);
  const [leaveEmployees, setLeaveEmployees] = useState<string[]>([]);
  const [payrollEmployees, setPayrollEmployees] = useState<string[]>([]);
  const [contractsEmployees, setContractsEmployees] = useState<string[]>([]);

  // Popover states
  const [attendanceDateOpen, setAttendanceDateOpen] = useState(false);
  const [leaveDateOpen, setLeaveDateOpen] = useState(false);
  const [contractsDateOpen, setContractsDateOpen] = useState(false);

  // Preview states
  const [showAttendancePreview, setShowAttendancePreview] = useState(false);
  const [showLeavePreview, setShowLeavePreview] = useState(false);
  const [showPayrollPreview, setShowPayrollPreview] = useState(false);
  const [showContractsPreview, setShowContractsPreview] = useState(false);

  // Clear punch states (for re-testing check-in/out)
  const [clearPunchDate, setClearPunchDate] = useState<Date | undefined>(new Date());
  const [clearPunchEmployees, setClearPunchEmployees] = useState<string[]>([]);
  const [clearPunchType, setClearPunchType] = useState<ClearPunchType>('check_out');
  const [clearPunchDateOpen, setClearPunchDateOpen] = useState(false);
  const [showClearPunchPreview, setShowClearPunchPreview] = useState(false);
  const [isClearingPunch, setIsClearingPunch] = useState(false);
  const [confirmClearPunch, setConfirmClearPunch] = useState(false);

  // Preview queries - only fetch when preview is open and has filters
  const hasAttendanceFilters = attendanceEmployees.length > 0 || !!attendanceDateRange?.from;
  const hasLeaveFilters = leaveEmployees.length > 0 || !!leaveDateRange?.from;
  const hasPayrollFilters = payrollEmployees.length > 0 || !!payrollMonth;
  const hasContractsFilters = contractsEmployees.length > 0 || !!contractsDateRange?.from;
  const hasClearPunchFilters = clearPunchEmployees.length > 0 && !!clearPunchDate;

  // Clear punch preview query
  const { data: clearPunchPreview = [], isLoading: clearPunchPreviewLoading, refetch: refetchClearPunchPreview } = useQuery({
    queryKey: ['clear-punch-preview', clearPunchDate, clearPunchEmployees],
    queryFn: async () => {
      if (!clearPunchDate || clearPunchEmployees.length === 0) return [];
      const dateStr = format(clearPunchDate, 'yyyy-MM-dd');
      const { data } = await supabase
        .from('attendance')
        .select('*, employees(full_name)')
        .eq('date', dateStr)
        .in('employee_id', clearPunchEmployees)
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: showClearPunchPreview && hasClearPunchFilters,
  });

  // Handle clear punch (for re-testing)
  const handleClearPunch = async () => {
    if (!clearPunchDate || clearPunchEmployees.length === 0) {
      toast.error('Please select date and employees');
      return;
    }

    setIsClearingPunch(true);
    try {
      const dateStr = format(clearPunchDate, 'yyyy-MM-dd');

      if (clearPunchType === 'both') {
        // Delete the entire attendance record
        const { error } = await supabase
          .from('attendance')
          .delete()
          .eq('date', dateStr)
          .in('employee_id', clearPunchEmployees);
        if (error) throw error;
        toast.success(`Deleted attendance records for ${clearPunchEmployees.length} employee(s) on ${format(clearPunchDate, 'MMM d, yyyy')}`);
      } else {
        // Clear only check_in or check_out
        const updateData: { check_in?: null; check_out?: null; status?: string } = {};
        if (clearPunchType === 'check_in') {
          updateData.check_in = null;
          updateData.status = 'Miss Punch In';
        } else {
          updateData.check_out = null;
        }

        const { error } = await supabase
          .from('attendance')
          .update(updateData)
          .eq('date', dateStr)
          .in('employee_id', clearPunchEmployees);
        if (error) throw error;
        toast.success(`Cleared ${clearPunchType.replace('_', '-')} for ${clearPunchEmployees.length} employee(s) on ${format(clearPunchDate, 'MMM d, yyyy')}`);
      }

      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      queryClient.invalidateQueries({ queryKey: ['clear-punch-preview'] });
      setClearPunchEmployees([]);
      setConfirmClearPunch(false);
    } catch (error) {
      console.error('Clear punch error:', error);
      toast.error('Failed to clear attendance punch');
    } finally {
      setIsClearingPunch(false);
    }
  };

  const { data: attendancePreview = [], isLoading: attendancePreviewLoading } = useQuery({
    queryKey: ['attendance-preview', attendanceDateRange, attendanceEmployees],
    queryFn: async () => {
      let query = supabase.from('attendance').select('*, employees(full_name)');
      if (attendanceEmployees.length > 0) {
        query = query.in('employee_id', attendanceEmployees);
      }
      if (attendanceDateRange?.from) {
        query = query.gte('date', format(attendanceDateRange.from, 'yyyy-MM-dd'));
      }
      if (attendanceDateRange?.to) {
        query = query.lte('date', format(attendanceDateRange.to, 'yyyy-MM-dd'));
      }
      const { data } = await query.order('date', { ascending: false }).limit(50);
      return data || [];
    },
    enabled: showAttendancePreview && hasAttendanceFilters,
  });

  const { data: leavePreview = [], isLoading: leavePreviewLoading } = useQuery({
    queryKey: ['leave-preview', leaveDateRange, leaveEmployees],
    queryFn: async () => {
      let query = supabase.from('leave_records').select('*, employees(full_name)');
      if (leaveEmployees.length > 0) {
        query = query.in('employee_id', leaveEmployees);
      }
      if (leaveDateRange?.from) {
        query = query.gte('start_date', format(leaveDateRange.from, 'yyyy-MM-dd'));
      }
      if (leaveDateRange?.to) {
        query = query.lte('start_date', format(leaveDateRange.to, 'yyyy-MM-dd'));
      }
      const { data } = await query.order('start_date', { ascending: false }).limit(50);
      return data || [];
    },
    enabled: showLeavePreview && hasLeaveFilters,
  });

  const { data: payrollPreview = [], isLoading: payrollPreviewLoading } = useQuery({
    queryKey: ['payroll-preview', payrollMonth, payrollEmployees],
    queryFn: async () => {
      let query = supabase.from('payroll').select('*, employees(full_name)');
      if (payrollEmployees.length > 0) {
        query = query.in('employee_id', payrollEmployees);
      }
      if (payrollMonth) {
        query = query.eq('month', payrollMonth);
      }
      const { data } = await query.order('created_at', { ascending: false }).limit(50);
      return data || [];
    },
    enabled: showPayrollPreview && hasPayrollFilters,
  });

  const { data: contractsPreview = [], isLoading: contractsPreviewLoading } = useQuery({
    queryKey: ['contracts-preview', contractsDateRange, contractsEmployees],
    queryFn: async () => {
      let query = supabase.from('contracts').select('*, employees(full_name)');
      if (contractsEmployees.length > 0) {
        query = query.in('employee_id', contractsEmployees);
      }
      if (contractsDateRange?.from) {
        query = query.gte('start_date', format(contractsDateRange.from, 'yyyy-MM-dd'));
      }
      if (contractsDateRange?.to) {
        query = query.lte('start_date', format(contractsDateRange.to, 'yyyy-MM-dd'));
      }
      const { data } = await query.order('start_date', { ascending: false }).limit(50);
      return data || [];
    },
    enabled: showContractsPreview && hasContractsFilters,
  });

  const dataTypes = [
    { type: 'attendance' as DataType, filteredType: 'attendance_filtered' as DataType, label: 'Attendance Records', icon: Clock, description: 'Delete check-in/check-out records', hasDateRange: true, hasEmployeeFilter: true },
    { type: 'leave_records' as DataType, filteredType: 'leave_records_filtered' as DataType, label: 'Leave Records', icon: Calendar, description: 'Delete leave requests', hasDateRange: true, hasEmployeeFilter: true },
    { type: 'payroll' as DataType, filteredType: 'payroll_filtered' as DataType, label: 'Payroll Data', icon: DollarSign, description: 'Delete payroll records', hasDateRange: false, hasMonthFilter: true, hasEmployeeFilter: true },
    { type: 'contracts' as DataType, filteredType: 'contracts_filtered' as DataType, label: 'Contracts', icon: FileText, description: 'Delete employee contracts', hasDateRange: true, hasEmployeeFilter: true },
    { type: 'employees' as DataType, label: 'Employees', icon: Users, description: 'Delete all employees and related data' },
  ];

  const toggleEmployee = (employeeId: string, list: string[], setList: (ids: string[]) => void) => {
    if (list.includes(employeeId)) {
      setList(list.filter(id => id !== employeeId));
    } else {
      setList([...list, employeeId]);
    }
  };

  const getEmployeeList = (type: string) => {
    switch (type) {
      case 'attendance': return { list: attendanceEmployees, setList: setAttendanceEmployees };
      case 'leave_records': return { list: leaveEmployees, setList: setLeaveEmployees };
      case 'payroll': return { list: payrollEmployees, setList: setPayrollEmployees };
      case 'contracts': return { list: contractsEmployees, setList: setContractsEmployees };
      default: return { list: [], setList: () => {} };
    }
  };

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
      } else if (type === 'attendance_filtered') {
        let query = supabase.from('attendance').delete();
        
        if (attendanceEmployees.length > 0) {
          query = query.in('employee_id', attendanceEmployees);
        } else {
          query = query.gte('id', '00000000-0000-0000-0000-000000000000');
        }
        
        if (attendanceDateRange?.from) {
          query = query.gte('date', format(attendanceDateRange.from, 'yyyy-MM-dd'));
        }
        if (attendanceDateRange?.to) {
          query = query.lte('date', format(attendanceDateRange.to, 'yyyy-MM-dd'));
        }
        
        const { error } = await query;
        if (error) throw error;
        
        toast.success('Attendance records deleted successfully');
        setAttendanceDateRange(undefined);
        setAttendanceEmployees([]);
      } else if (type === 'leave_records_filtered') {
        let query = supabase.from('leave_records').delete();
        
        if (leaveEmployees.length > 0) {
          query = query.in('employee_id', leaveEmployees);
        } else {
          query = query.gte('id', '00000000-0000-0000-0000-000000000000');
        }
        
        if (leaveDateRange?.from) {
          query = query.gte('start_date', format(leaveDateRange.from, 'yyyy-MM-dd'));
        }
        if (leaveDateRange?.to) {
          query = query.lte('start_date', format(leaveDateRange.to, 'yyyy-MM-dd'));
        }
        
        const { error } = await query;
        if (error) throw error;
        
        toast.success('Leave records deleted successfully');
        setLeaveDateRange(undefined);
        setLeaveEmployees([]);
      } else if (type === 'payroll_filtered') {
        let query = supabase.from('payroll').delete();
        
        if (payrollEmployees.length > 0) {
          query = query.in('employee_id', payrollEmployees);
        } else {
          query = query.gte('id', '00000000-0000-0000-0000-000000000000');
        }
        
        if (payrollMonth) {
          query = query.eq('month', payrollMonth);
        }
        
        const { error } = await query;
        if (error) throw error;
        
        toast.success('Payroll records deleted successfully');
        setPayrollMonth('');
        setPayrollEmployees([]);
      } else if (type === 'contracts_filtered') {
        let query = supabase.from('contracts').delete();
        
        if (contractsEmployees.length > 0) {
          query = query.in('employee_id', contractsEmployees);
        } else {
          query = query.gte('id', '00000000-0000-0000-0000-000000000000');
        }
        
        if (contractsDateRange?.from) {
          query = query.gte('start_date', format(contractsDateRange.from, 'yyyy-MM-dd'));
        }
        if (contractsDateRange?.to) {
          query = query.lte('start_date', format(contractsDateRange.to, 'yyyy-MM-dd'));
        }
        
        const { error } = await query;
        if (error) throw error;
        
        toast.success('Contracts deleted successfully');
        setContractsDateRange(undefined);
        setContractsEmployees([]);
      } else if (type === 'attendance') {
        const { error } = await supabase.from('attendance').delete().gte('id', '00000000-0000-0000-0000-000000000000');
        if (error) throw error;
        toast.success('All attendance records deleted');
      } else if (type === 'leave_records') {
        const { error } = await supabase.from('leave_records').delete().gte('id', '00000000-0000-0000-0000-000000000000');
        if (error) throw error;
        toast.success('All leave records deleted');
      } else if (type === 'payroll') {
        const { error } = await supabase.from('payroll').delete().gte('id', '00000000-0000-0000-0000-000000000000');
        if (error) throw error;
        toast.success('All payroll records deleted');
      } else if (type === 'contracts') {
        const { error } = await supabase.from('contracts').delete().gte('id', '00000000-0000-0000-0000-000000000000');
        if (error) throw error;
        toast.success('All contracts deleted');
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

  const getDateRangeLabel = (range: DateRange | undefined) => {
    if (!range?.from) return 'Select Date Range';
    if (!range.to || range.from.getTime() === range.to.getTime()) {
      return format(range.from, 'MMM d');
    }
    return `${format(range.from, 'MMM d')} - ${format(range.to, 'MMM d')}`;
  };

  const getConfirmationMessage = () => {
    if (confirmType === 'all') {
      return 'This will permanently delete ALL data from the system including employees, attendance, leave records, payroll, and contracts. This action cannot be undone.';
    }
    if (confirmType === 'employees') {
      return 'This will permanently delete all employees and all their related data (attendance, leave, payroll, contracts). This action cannot be undone.';
    }
    if (confirmType === 'attendance_filtered') {
      const empCount = attendanceEmployees.length;
      const dateStr = attendanceDateRange?.from 
        ? ` from ${format(attendanceDateRange.from, 'MMM d')}${attendanceDateRange.to ? ` to ${format(attendanceDateRange.to, 'MMM d')}` : ''}`
        : '';
      return `This will delete attendance records${empCount > 0 ? ` for ${empCount} selected employee(s)` : ''}${dateStr}. This action cannot be undone.`;
    }
    if (confirmType === 'leave_records_filtered') {
      const empCount = leaveEmployees.length;
      const dateStr = leaveDateRange?.from 
        ? ` from ${format(leaveDateRange.from, 'MMM d')}${leaveDateRange.to ? ` to ${format(leaveDateRange.to, 'MMM d')}` : ''}`
        : '';
      return `This will delete leave records${empCount > 0 ? ` for ${empCount} selected employee(s)` : ''}${dateStr}. This action cannot be undone.`;
    }
    if (confirmType === 'payroll_filtered') {
      const empCount = payrollEmployees.length;
      return `This will delete payroll records${empCount > 0 ? ` for ${empCount} selected employee(s)` : ''}${payrollMonth ? ` for ${payrollMonth}` : ''}. This action cannot be undone.`;
    }
    if (confirmType === 'contracts_filtered') {
      const empCount = contractsEmployees.length;
      const dateStr = contractsDateRange?.from 
        ? ` from ${format(contractsDateRange.from, 'MMM d')}${contractsDateRange.to ? ` to ${format(contractsDateRange.to, 'MMM d')}` : ''}`
        : '';
      return `This will delete contracts${empCount > 0 ? ` for ${empCount} selected employee(s)` : ''}${dateStr}. This action cannot be undone.`;
    }
    return `This will permanently delete all ${confirmType?.replace('_', ' ')} from the system. This action cannot be undone.`;
  };

  const EmployeeSelector = ({ list, setList, label }: { list: string[], setList: (ids: string[]) => void, label: string }) => (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="text-xs">
          <Filter className="w-3 h-3 mr-1" />
          {list.length > 0 ? `${list.length} Selected` : 'Filter Employees'}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="end">
        <div className="space-y-2">
          <div className="flex items-center justify-between px-2 py-1">
            <span className="text-xs font-medium text-muted-foreground">{label}</span>
            {list.length > 0 && (
              <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setList([])}>
                Clear
              </Button>
            )}
          </div>
          <ScrollArea className="h-[200px]">
            <div className="space-y-1">
              {employees.map(emp => (
                <div
                  key={emp.id}
                  className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer"
                  onClick={() => toggleEmployee(emp.id, list, setList)}
                >
                  <Checkbox checked={list.includes(emp.id)} />
                  <span className="text-sm truncate">{emp.full_name}</span>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </PopoverContent>
    </Popover>
  );

  return (
    <div className="space-y-6">
      <Card className="border-destructive/20 bg-destructive/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle size={20} />
            Danger Zone
          </CardTitle>
          <CardDescription>
            These actions are irreversible. Use filters for targeted deletions.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {dataTypes.map((data) => {
            const { list, setList } = getEmployeeList(data.type.replace('_filtered', '') as string);
            const hasFilters = data.hasDateRange || data.hasMonthFilter || data.hasEmployeeFilter;
            
            return (
              <div key={data.type} className="p-4 border rounded-lg bg-background space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <data.icon className="text-muted-foreground" size={20} />
                    <div>
                      <p className="font-medium">{data.label}</p>
                      <p className="text-sm text-muted-foreground">{data.description}</p>
                    </div>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setConfirmType(data.type)}
                  >
                    <Trash2 size={14} className="mr-1" />
                    Delete All
                  </Button>
                </div>
                
                {hasFilters && (
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/50">
                    <span className="text-xs text-muted-foreground">Filtered Delete:</span>
                    
                    {/* Date Range Filter */}
                    {data.hasDateRange && data.type === 'attendance' && (
                      <Popover open={attendanceDateOpen} onOpenChange={setAttendanceDateOpen}>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm" className={cn("text-xs", attendanceDateRange?.from && "border-primary")}>
                            <CalendarDays size={12} className="mr-1" />
                            {getDateRangeLabel(attendanceDateRange)}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="range"
                            selected={attendanceDateRange}
                            onSelect={setAttendanceDateRange}
                            numberOfMonths={2}
                          />
                        </PopoverContent>
                      </Popover>
                    )}
                    
                    {data.hasDateRange && data.type === 'leave_records' && (
                      <Popover open={leaveDateOpen} onOpenChange={setLeaveDateOpen}>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm" className={cn("text-xs", leaveDateRange?.from && "border-primary")}>
                            <CalendarDays size={12} className="mr-1" />
                            {getDateRangeLabel(leaveDateRange)}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="range"
                            selected={leaveDateRange}
                            onSelect={setLeaveDateRange}
                            numberOfMonths={2}
                          />
                        </PopoverContent>
                      </Popover>
                    )}
                    
                    {data.hasDateRange && data.type === 'contracts' && (
                      <Popover open={contractsDateOpen} onOpenChange={setContractsDateOpen}>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm" className={cn("text-xs", contractsDateRange?.from && "border-primary")}>
                            <CalendarDays size={12} className="mr-1" />
                            {getDateRangeLabel(contractsDateRange)}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="range"
                            selected={contractsDateRange}
                            onSelect={setContractsDateRange}
                            numberOfMonths={2}
                          />
                        </PopoverContent>
                      </Popover>
                    )}
                    
                    {/* Month Filter for Payroll */}
                    {data.hasMonthFilter && (
                      <Select value={payrollMonth || 'all'} onValueChange={(val) => setPayrollMonth(val === 'all' ? '' : val)}>
                        <SelectTrigger className="w-[140px] h-8 text-xs">
                          <SelectValue placeholder="Select Month" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Months</SelectItem>
                          {Array.from({ length: 12 }, (_, i) => {
                            const month = format(new Date(2024, i, 1), 'MMMM yyyy');
                            return <SelectItem key={i} value={month}>{month}</SelectItem>;
                          })}
                        </SelectContent>
                      </Select>
                    )}
                    
                    {/* Employee Filter */}
                    {data.hasEmployeeFilter && (
                      <EmployeeSelector list={list} setList={setList} label={`Filter ${data.label}`} />
                    )}
                    
                    {/* Preview Button */}
                    {data.type === 'attendance' && hasAttendanceFilters && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs gap-1"
                        onClick={() => setShowAttendancePreview(!showAttendancePreview)}
                      >
                        <Eye size={12} />
                        Preview
                        <ChevronDown size={12} className={cn("transition-transform", showAttendancePreview && "rotate-180")} />
                      </Button>
                    )}
                    {data.type === 'leave_records' && hasLeaveFilters && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs gap-1"
                        onClick={() => setShowLeavePreview(!showLeavePreview)}
                      >
                        <Eye size={12} />
                        Preview
                        <ChevronDown size={12} className={cn("transition-transform", showLeavePreview && "rotate-180")} />
                      </Button>
                    )}
                    {data.type === 'payroll' && hasPayrollFilters && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs gap-1"
                        onClick={() => setShowPayrollPreview(!showPayrollPreview)}
                      >
                        <Eye size={12} />
                        Preview
                        <ChevronDown size={12} className={cn("transition-transform", showPayrollPreview && "rotate-180")} />
                      </Button>
                    )}
                    {data.type === 'contracts' && hasContractsFilters && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs gap-1"
                        onClick={() => setShowContractsPreview(!showContractsPreview)}
                      >
                        <Eye size={12} />
                        Preview
                        <ChevronDown size={12} className={cn("transition-transform", showContractsPreview && "rotate-180")} />
                      </Button>
                    )}
                    
                    {/* Delete with Filters button */}
                    {data.filteredType && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs border-destructive/50 text-destructive hover:bg-destructive/10"
                        onClick={() => setConfirmType(data.filteredType)}
                      >
                        <Trash2 size={12} className="mr-1" />
                        Delete Filtered
                      </Button>
                    )}
                  </div>
                )}
                
                {/* Preview Tables - Outside hasFilters block */}
                {data.type === 'attendance' && showAttendancePreview && hasAttendanceFilters && (
                    <div className="border rounded-lg bg-muted/30 overflow-hidden">
                      <ScrollArea className="max-h-[200px]">
                        {attendancePreviewLoading ? (
                          <p className="text-xs text-muted-foreground text-center py-4">Loading preview...</p>
                        ) : attendancePreview.length === 0 ? (
                          <p className="text-xs text-muted-foreground text-center py-4">No records match the filters</p>
                        ) : (
                          <Table>
                            <TableHeader>
                              <TableRow className="hover:bg-transparent">
                                <TableHead className="text-xs h-8">Employee</TableHead>
                                <TableHead className="text-xs h-8">Date</TableHead>
                                <TableHead className="text-xs h-8">Status</TableHead>
                                <TableHead className="text-xs h-8">Check In</TableHead>
                                <TableHead className="text-xs h-8">Check Out</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {attendancePreview.map((record: any) => (
                                <TableRow key={record.id} className="hover:bg-muted/50">
                                  <TableCell className="text-xs py-1.5">{record.employees?.full_name || '-'}</TableCell>
                                  <TableCell className="text-xs py-1.5">{record.date ? format(parseISO(record.date), 'MMM d, yyyy') : '-'}</TableCell>
                                  <TableCell className="text-xs py-1.5">{record.status || '-'}</TableCell>
                                  <TableCell className="text-xs py-1.5">{record.check_in || '-'}</TableCell>
                                  <TableCell className="text-xs py-1.5">{record.check_out || '-'}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}
                        {attendancePreview.length >= 50 && (
                          <p className="text-xs text-muted-foreground text-center py-2 border-t">Showing first 50 records...</p>
                        )}
                      </ScrollArea>
                    </div>
                  )}
                  
                  {data.type === 'leave_records' && showLeavePreview && hasLeaveFilters && (
                    <div className="border rounded-lg bg-muted/30 overflow-hidden">
                      <ScrollArea className="max-h-[200px]">
                        {leavePreviewLoading ? (
                          <p className="text-xs text-muted-foreground text-center py-4">Loading preview...</p>
                        ) : leavePreview.length === 0 ? (
                          <p className="text-xs text-muted-foreground text-center py-4">No records match the filters</p>
                        ) : (
                          <Table>
                            <TableHeader>
                              <TableRow className="hover:bg-transparent">
                                <TableHead className="text-xs h-8">Employee</TableHead>
                                <TableHead className="text-xs h-8">Leave Type</TableHead>
                                <TableHead className="text-xs h-8">Start Date</TableHead>
                                <TableHead className="text-xs h-8">End Date</TableHead>
                                <TableHead className="text-xs h-8">Status</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {leavePreview.map((record: any) => (
                                <TableRow key={record.id} className="hover:bg-muted/50">
                                  <TableCell className="text-xs py-1.5">{record.employees?.full_name || '-'}</TableCell>
                                  <TableCell className="text-xs py-1.5">{record.leave_type || '-'}</TableCell>
                                  <TableCell className="text-xs py-1.5">{record.start_date ? format(parseISO(record.start_date), 'MMM d, yyyy') : '-'}</TableCell>
                                  <TableCell className="text-xs py-1.5">{record.end_date ? format(parseISO(record.end_date), 'MMM d, yyyy') : '-'}</TableCell>
                                  <TableCell className="text-xs py-1.5">{record.status || '-'}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}
                        {leavePreview.length >= 50 && (
                          <p className="text-xs text-muted-foreground text-center py-2 border-t">Showing first 50 records...</p>
                        )}
                      </ScrollArea>
                    </div>
                  )}
                  
                  {data.type === 'payroll' && showPayrollPreview && hasPayrollFilters && (
                    <div className="border rounded-lg bg-muted/30 overflow-hidden">
                      <ScrollArea className="max-h-[200px]">
                        {payrollPreviewLoading ? (
                          <p className="text-xs text-muted-foreground text-center py-4">Loading preview...</p>
                        ) : payrollPreview.length === 0 ? (
                          <p className="text-xs text-muted-foreground text-center py-4">No records match the filters</p>
                        ) : (
                          <Table>
                            <TableHeader>
                              <TableRow className="hover:bg-transparent">
                                <TableHead className="text-xs h-8">Employee</TableHead>
                                <TableHead className="text-xs h-8">Month</TableHead>
                                <TableHead className="text-xs h-8">Basic Salary</TableHead>
                                <TableHead className="text-xs h-8">Net Salary</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {payrollPreview.map((record: any) => (
                                <TableRow key={record.id} className="hover:bg-muted/50">
                                  <TableCell className="text-xs py-1.5">{record.employees?.full_name || '-'}</TableCell>
                                  <TableCell className="text-xs py-1.5">{record.month || '-'}</TableCell>
                                  <TableCell className="text-xs py-1.5">{record.basic_salary?.toLocaleString() || '-'}</TableCell>
                                  <TableCell className="text-xs py-1.5">{record.net_salary?.toLocaleString() || '-'}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}
                        {payrollPreview.length >= 50 && (
                          <p className="text-xs text-muted-foreground text-center py-2 border-t">Showing first 50 records...</p>
                        )}
                      </ScrollArea>
                    </div>
                  )}
                  
                  {data.type === 'contracts' && showContractsPreview && hasContractsFilters && (
                    <div className="border rounded-lg bg-muted/30 overflow-hidden">
                      <ScrollArea className="max-h-[200px]">
                        {contractsPreviewLoading ? (
                          <p className="text-xs text-muted-foreground text-center py-4">Loading preview...</p>
                        ) : contractsPreview.length === 0 ? (
                          <p className="text-xs text-muted-foreground text-center py-4">No records match the filters</p>
                        ) : (
                          <Table>
                            <TableHeader>
                              <TableRow className="hover:bg-transparent">
                                <TableHead className="text-xs h-8">Employee</TableHead>
                                <TableHead className="text-xs h-8">Start Date</TableHead>
                                <TableHead className="text-xs h-8">End Date</TableHead>
                                <TableHead className="text-xs h-8">Status</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {contractsPreview.map((record: any) => (
                                <TableRow key={record.id} className="hover:bg-muted/50">
                                  <TableCell className="text-xs py-1.5">{record.employees?.full_name || '-'}</TableCell>
                                  <TableCell className="text-xs py-1.5">{record.start_date ? format(parseISO(record.start_date), 'MMM d, yyyy') : '-'}</TableCell>
                                  <TableCell className="text-xs py-1.5">{record.end_date ? format(parseISO(record.end_date), 'MMM d, yyyy') : '-'}</TableCell>
                                  <TableCell className="text-xs py-1.5">{record.status || '-'}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}
                        {contractsPreview.length >= 50 && (
                          <p className="text-xs text-muted-foreground text-center py-2 border-t">Showing first 50 records...</p>
                        )}
                      </ScrollArea>
                    </div>
                  )}
              </div>
            );
          })}

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

      {/* Clear Check-In/Out for Re-Testing */}
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
            <RotateCcw size={20} />
            Reset Attendance Punch (For Testing)
          </CardTitle>
          <CardDescription>
            Clear check-in or check-out times so employees can re-test punch. Useful for testing shift rules.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Date Picker */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Date</Label>
              <Popover open={clearPunchDateOpen} onOpenChange={setClearPunchDateOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !clearPunchDate && "text-muted-foreground")}>
                    <CalendarDays className="mr-2 h-4 w-4" />
                    {clearPunchDate ? format(clearPunchDate, 'PPP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={clearPunchDate}
                    onSelect={(date) => {
                      setClearPunchDate(date);
                      setClearPunchDateOpen(false);
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Employee Selector */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Employees</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start">
                    <Filter className="mr-2 h-4 w-4" />
                    {clearPunchEmployees.length > 0 ? `${clearPunchEmployees.length} Selected` : 'Select Employees'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-2" align="start">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between px-2 py-1">
                      <span className="text-xs font-medium text-muted-foreground">Select Employees</span>
                      {clearPunchEmployees.length > 0 && (
                        <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setClearPunchEmployees([])}>
                          Clear
                        </Button>
                      )}
                    </div>
                    <ScrollArea className="h-[200px]">
                      <div className="space-y-1">
                        {employees.map(emp => (
                          <div
                            key={emp.id}
                            className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer"
                            onClick={() => toggleEmployee(emp.id, clearPunchEmployees, setClearPunchEmployees)}
                          >
                            <Checkbox checked={clearPunchEmployees.includes(emp.id)} />
                            <span className="text-sm truncate">{emp.full_name}</span>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Clear Type */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">What to Clear</Label>
              <RadioGroup value={clearPunchType} onValueChange={(val) => setClearPunchType(val as ClearPunchType)} className="flex gap-3">
                <div className="flex items-center space-x-1">
                  <RadioGroupItem value="check_out" id="clear_out" />
                  <Label htmlFor="clear_out" className="text-sm cursor-pointer">Check-Out</Label>
                </div>
                <div className="flex items-center space-x-1">
                  <RadioGroupItem value="check_in" id="clear_in" />
                  <Label htmlFor="clear_in" className="text-sm cursor-pointer">Check-In</Label>
                </div>
                <div className="flex items-center space-x-1">
                  <RadioGroupItem value="both" id="clear_both" />
                  <Label htmlFor="clear_both" className="text-sm cursor-pointer">Both</Label>
                </div>
              </RadioGroup>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 flex flex-col justify-end">
              <div className="flex gap-2">
                {hasClearPunchFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs gap-1"
                    onClick={() => {
                      setShowClearPunchPreview(!showClearPunchPreview);
                      if (!showClearPunchPreview) refetchClearPunchPreview();
                    }}
                  >
                    <Eye size={12} />
                    Preview
                    <ChevronDown size={12} className={cn("transition-transform", showClearPunchPreview && "rotate-180")} />
                  </Button>
                )}
                <Button
                  variant="outline"
                  className="border-amber-500/50 text-amber-600 hover:bg-amber-500/10"
                  disabled={!hasClearPunchFilters}
                  onClick={() => setConfirmClearPunch(true)}
                >
                  <RotateCcw size={14} className="mr-1" />
                  Clear Punch
                </Button>
              </div>
            </div>
          </div>

          {/* Preview Table */}
          {showClearPunchPreview && hasClearPunchFilters && (
            <div className="border rounded-lg bg-muted/30 overflow-hidden mt-4">
              <ScrollArea className="max-h-[200px]">
                {clearPunchPreviewLoading ? (
                  <p className="text-xs text-muted-foreground text-center py-4">Loading preview...</p>
                ) : clearPunchPreview.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">No attendance records found for selected employees on this date</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="text-xs h-8">Employee</TableHead>
                        <TableHead className="text-xs h-8">Date</TableHead>
                        <TableHead className="text-xs h-8">Check In</TableHead>
                        <TableHead className="text-xs h-8">Check Out</TableHead>
                        <TableHead className="text-xs h-8">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {clearPunchPreview.map((record: any) => (
                        <TableRow key={record.id} className="hover:bg-muted/50">
                          <TableCell className="text-xs py-1.5">{record.employees?.full_name || '-'}</TableCell>
                          <TableCell className="text-xs py-1.5">{record.date ? format(parseISO(record.date), 'MMM d, yyyy') : '-'}</TableCell>
                          <TableCell className="text-xs py-1.5">
                            {record.check_in || '-'}
                            {clearPunchType === 'check_in' || clearPunchType === 'both' ? (
                              <Badge variant="outline" className="ml-2 text-[10px] text-amber-600 border-amber-500/50">Will Clear</Badge>
                            ) : null}
                          </TableCell>
                          <TableCell className="text-xs py-1.5">
                            {record.check_out || '-'}
                            {clearPunchType === 'check_out' || clearPunchType === 'both' ? (
                              <Badge variant="outline" className="ml-2 text-[10px] text-amber-600 border-amber-500/50">Will Clear</Badge>
                            ) : null}
                          </TableCell>
                          <TableCell className="text-xs py-1.5">{record.status || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </ScrollArea>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirm Clear Punch Dialog */}
      <AlertDialog open={confirmClearPunch} onOpenChange={setConfirmClearPunch}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <RotateCcw className="text-amber-600" size={20} />
              Confirm Clear Punch
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will clear the <strong>{clearPunchType === 'both' ? 'check-in AND check-out' : clearPunchType.replace('_', '-')}</strong> for{' '}
              <strong>{clearPunchEmployees.length} employee(s)</strong> on{' '}
              <strong>{clearPunchDate ? format(clearPunchDate, 'MMM d, yyyy') : ''}</strong>.
              {clearPunchType === 'both' && ' The attendance record will be deleted entirely.'}
              {' '}Employees can then re-test their punch.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isClearingPunch}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearPunch}
              disabled={isClearingPunch}
              className="bg-amber-600 text-white hover:bg-amber-700"
            >
              {isClearingPunch ? 'Clearing...' : 'Clear Punch'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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