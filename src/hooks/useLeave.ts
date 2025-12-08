import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface LeaveRecord {
  id: string;
  employee_id: string;
  leave_type: string;
  leave_type_id?: string;
  start_date: string;
  end_date: string;
  days_count: number;
  working_days?: number;
  status: 'Pending' | 'Approved' | 'Rejected';
  reason?: string;
  is_emergency?: boolean;
  attachment_url?: string;
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
  created_at?: string;
  employees?: {
    full_name: string;
    hrms_no: string;
    department: string;
  };
}

interface LeaveType {
  id: string;
  code: string;
  name: string;
  name_arabic?: string;
  max_days_per_year: number;
  paid_type: 'Paid' | 'Partially Paid' | 'Unpaid';
  requires_documentation: boolean;
  requires_approval: boolean;
  accrual_type: 'monthly' | 'yearly' | 'immediate';
  carry_forward_allowed: boolean;
  max_carry_forward_days: number;
  gender_specific?: 'Male' | 'Female';
  min_service_months: number;
  description?: string;
  is_active: boolean;
}

interface LeaveBalance {
  id: string;
  employee_id: string;
  leave_type_id: string;
  year: number;
  entitled_days: number;
  used_days: number;
  carried_forward_days: number;
  pending_days: number;
  leave_types?: LeaveType;
}

interface PublicHoliday {
  id: string;
  date: string;
  name: string;
  name_arabic?: string;
  is_half_day: boolean;
  year: number;
}

export function useLeave() {
  return useQuery({
    queryKey: ['leave'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leave_records')
        .select(`
          *,
          employees!leave_records_employee_id_fkey (full_name, hrms_no, department)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as LeaveRecord[];
    },
  });
}

export function useLeaveTypes() {
  return useQuery({
    queryKey: ['leave_types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leave_types')
        .select('*')
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      return data as LeaveType[];
    },
  });
}

export function useLeaveBalances(employeeId?: string) {
  return useQuery({
    queryKey: ['leave_balances', employeeId],
    queryFn: async () => {
      let query = supabase
        .from('leave_balances')
        .select(`
          *,
          leave_types (*)
        `)
        .eq('year', new Date().getFullYear());
      
      if (employeeId) {
        query = query.eq('employee_id', employeeId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as LeaveBalance[];
    },
    enabled: true,
  });
}

export function usePublicHolidays() {
  return useQuery({
    queryKey: ['public_holidays'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('public_holidays')
        .select('*')
        .gte('date', new Date().toISOString().split('T')[0])
        .order('date');
      
      if (error) throw error;
      return data as PublicHoliday[];
    },
  });
}

export function useUpdateLeaveStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, status, rejection_reason }: { id: string; status: 'Approved' | 'Rejected'; rejection_reason?: string }) => {
      // First get the leave record to know days_count and employee_id
      const { data: leaveRecord, error: fetchError } = await supabase
        .from('leave_records')
        .select('employee_id, days_count, leave_type_id')
        .eq('id', id)
        .single();
      
      if (fetchError) throw fetchError;

      const updateData: Record<string, unknown> = { 
        status,
        approved_at: new Date().toISOString(),
      };
      
      if (rejection_reason) {
        updateData.rejection_reason = rejection_reason;
      }
      
      const { data, error } = await supabase
        .from('leave_records')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;

      // If approved, update the leave balance (deduct used_days)
      if (status === 'Approved' && leaveRecord) {
        const currentYear = new Date().getFullYear();
        
        // Try to find existing leave balance for this employee
        const { data: existingBalance } = await supabase
          .from('leave_balances')
          .select('id, used_days')
          .eq('employee_id', leaveRecord.employee_id)
          .eq('year', currentYear)
          .maybeSingle();

        if (existingBalance) {
          // Update existing balance
          await supabase
            .from('leave_balances')
            .update({ 
              used_days: (existingBalance.used_days || 0) + leaveRecord.days_count 
            })
            .eq('id', existingBalance.id);
        }

        // Also update the employee's leave_balance field directly
        const { data: employee } = await supabase
          .from('employees')
          .select('leave_balance')
          .eq('id', leaveRecord.employee_id)
          .single();

        if (employee) {
          await supabase
            .from('employees')
            .update({ 
              leave_balance: Math.max(0, (employee.leave_balance || 30) - leaveRecord.days_count)
            })
            .eq('id', leaveRecord.employee_id);
        }
      }

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['leave'] });
      queryClient.invalidateQueries({ queryKey: ['leave_balances'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success(`Leave request ${variables.status.toLowerCase()}`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to update leave: ${error.message}`);
    },
  });
}

export function useUpdateLeave() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<Omit<LeaveRecord, 'id' | 'created_at' | 'employees'>>) => {
      const { data, error } = await supabase
        .from('leave_records')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave'] });
      queryClient.invalidateQueries({ queryKey: ['leave_balances'] });
      toast.success('Leave request updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update leave: ${error.message}`);
    },
  });
}

export function useDeleteLeave() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('leave_records')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave'] });
      queryClient.invalidateQueries({ queryKey: ['leave_balances'] });
      toast.success('Leave request deleted');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete leave: ${error.message}`);
    },
  });
}

export function useAddLeave() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (leave: Omit<LeaveRecord, 'id' | 'created_at' | 'employees'>) => {
      const { data, error } = await supabase
        .from('leave_records')
        .insert([leave])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave'] });
      queryClient.invalidateQueries({ queryKey: ['leave_balances'] });
      toast.success('Leave request submitted');
    },
    onError: (error: Error) => {
      toast.error(`Failed to submit leave: ${error.message}`);
    },
  });
}

export function useAddPublicHoliday() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (holiday: Omit<PublicHoliday, 'id' | 'year'>) => {
      const { data, error } = await supabase
        .from('public_holidays')
        .insert([holiday])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['public_holidays'] });
      toast.success('Public holiday added');
    },
    onError: (error: Error) => {
      toast.error(`Failed to add holiday: ${error.message}`);
    },
  });
}

export function useAllocateLeave() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (allocation: {
      employee_id: string;
      leave_type_id: string;
      year: number;
      entitled_days: number;
      carried_forward_days?: number;
    }) => {
      // Upsert - update if exists, insert if not
      const { data, error } = await supabase
        .from('leave_balances')
        .upsert([{
          employee_id: allocation.employee_id,
          leave_type_id: allocation.leave_type_id,
          year: allocation.year,
          entitled_days: allocation.entitled_days,
          carried_forward_days: allocation.carried_forward_days || 0,
          used_days: 0,
          pending_days: 0,
        }], {
          onConflict: 'employee_id,leave_type_id,year',
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave_balances'] });
      toast.success('Leave allocated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to allocate leave: ${error.message}`);
    },
  });
}

export function useBulkAllocateLeave() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (allocations: {
      employee_ids: string[];
      leave_type_id: string;
      year: number;
      entitled_days: number;
    }) => {
      const records = allocations.employee_ids.map(employee_id => ({
        employee_id,
        leave_type_id: allocations.leave_type_id,
        year: allocations.year,
        entitled_days: allocations.entitled_days,
        carried_forward_days: 0,
        used_days: 0,
        pending_days: 0,
      }));

      const { data, error } = await supabase
        .from('leave_balances')
        .upsert(records, {
          onConflict: 'employee_id,leave_type_id,year',
        })
        .select();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['leave_balances'] });
      toast.success(`Leave allocated to ${data?.length || 0} employees`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to allocate leave: ${error.message}`);
    },
  });
}

export function useAllLeaveBalances() {
  return useQuery({
    queryKey: ['all_leave_balances'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leave_balances')
        .select(`
          *,
          leave_types (*),
          employees (id, full_name, hrms_no, department)
        `)
        .eq('year', new Date().getFullYear())
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as (LeaveBalance & { employees: { id: string; full_name: string; hrms_no: string; department: string } })[];
    },
  });
}
