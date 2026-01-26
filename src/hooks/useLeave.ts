import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useEffect } from 'react';

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
    photo_url?: string;
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

export function useLeave(options?: { refetchInterval?: number }) {
  return useQuery({
    queryKey: ['leave'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leave_records')
        .select(`
          *,
          employees!leave_records_employee_id_fkey (full_name, hrms_no, department, photo_url)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as LeaveRecord[];
    },
    refetchInterval: options?.refetchInterval,
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
      const updateData: Record<string, unknown> = { 
        status,
        approved_at: new Date().toISOString(),
      };
      
      if (rejection_reason) {
        updateData.rejection_reason = rejection_reason;
      }
      
      // First, get the leave record details including current status
      const { data: leaveRecord, error: fetchError } = await supabase
        .from('leave_records')
        .select('employee_id, leave_type, days_count, status')
        .eq('id', id)
        .single();
      
      if (fetchError) throw fetchError;
      
      const previousStatus = leaveRecord?.status;
      
      // Update the leave record status
      const { data, error } = await supabase
        .from('leave_records')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      
      // Handle leave balance updates
      if (leaveRecord) {
        // Find leave type - try exact match first, then partial match
        let leaveTypeId: string | null = null;
        
        const { data: exactMatch } = await supabase
          .from('leave_types')
          .select('id')
          .eq('name', leaveRecord.leave_type)
          .maybeSingle();
        
        if (exactMatch) {
          leaveTypeId = exactMatch.id;
        } else {
          // Try partial match (e.g., "Annual" matches "Annual Leave")
          const { data: partialMatch } = await supabase
            .from('leave_types')
            .select('id, name')
            .ilike('name', `%${leaveRecord.leave_type}%`)
            .limit(1)
            .maybeSingle();
          
          if (partialMatch) {
            leaveTypeId = partialMatch.id;
          }
        }
        
        if (leaveTypeId) {
          const currentYear = new Date().getFullYear();
          
          // Try to get existing balance
          let { data: currentBalance } = await supabase
            .from('leave_balances')
            .select('id, used_days, pending_days, entitled_days')
            .eq('employee_id', leaveRecord.employee_id)
            .eq('leave_type_id', leaveTypeId)
            .eq('year', currentYear)
            .maybeSingle();
          
          // If no balance exists and we're approving, create one with tenure-based entitlement
          if (!currentBalance && status === 'Approved') {
            // Fetch employee's joining date for tenure calculation
            const { data: employee } = await supabase
              .from('employees')
              .select('joining_date')
              .eq('id', leaveRecord.employee_id)
              .single();
            
            // Calculate tenure-based entitlement
            let entitledDays = 0;
            if (employee?.joining_date) {
              const joining = new Date(employee.joining_date);
              const now = new Date();
              const totalMonths = (now.getFullYear() * 12 + now.getMonth()) - 
                                  (joining.getFullYear() * 12 + joining.getMonth());
              
              if (totalMonths > 0) {
                // Flat rate: 2.5 days/month from joining date
                entitledDays = totalMonths * 2.5;
              }
            }
            
            const { data: newBalance, error: insertError } = await supabase
              .from('leave_balances')
              .insert({
                employee_id: leaveRecord.employee_id,
                leave_type_id: leaveTypeId,
                year: currentYear,
                entitled_days: entitledDays,
                used_days: 0,
                pending_days: 0,
                carried_forward_days: 0
              })
              .select()
              .single();
            
            if (!insertError && newBalance) {
              currentBalance = newBalance;
            }
          }
          
          if (currentBalance) {
            // If approving (and wasn't previously approved), deduct from balance and decrement pending
            if (status === 'Approved' && previousStatus !== 'Approved') {
              const newPendingDays = Math.max(0, (currentBalance.pending_days || 0) - leaveRecord.days_count);
              await supabase
                .from('leave_balances')
                .update({
                  used_days: (currentBalance.used_days || 0) + leaveRecord.days_count,
                  pending_days: previousStatus === 'Pending' ? newPendingDays : currentBalance.pending_days,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', currentBalance.id);
            }
            // If rejecting and was pending, just decrement pending_days
            else if (status === 'Rejected' && previousStatus === 'Pending') {
              const newPendingDays = Math.max(0, (currentBalance.pending_days || 0) - leaveRecord.days_count);
              await supabase
                .from('leave_balances')
                .update({
                  pending_days: newPendingDays,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', currentBalance.id);
            }
            // If rejecting a previously approved leave, restore used_days
            else if (status === 'Rejected' && previousStatus === 'Approved') {
              const newUsedDays = Math.max(0, (currentBalance.used_days || 0) - leaveRecord.days_count);
              await supabase
                .from('leave_balances')
                .update({
                  used_days: newUsedDays,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', currentBalance.id);
            }
          }
        } else {
          console.warn(`Leave type not found for: ${leaveRecord.leave_type}`);
        }
      }
      
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['leave'] });
      queryClient.invalidateQueries({ queryKey: ['leave_balances'] });
      queryClient.invalidateQueries({ queryKey: ['all_leave_balances'] });
      toast.success(`Leave request ${variables.status.toLowerCase()}`);
      
      // Send email notification to employee
      if (variables.status === 'Approved' || variables.status === 'Rejected') {
        supabase.functions.invoke('send-leave-decision-notification', {
          body: {
            leave_id: variables.id,
            status: variables.status,
            rejection_reason: variables.rejection_reason
          }
        }).catch(err => console.error('Failed to send leave notification:', err));
      }
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
      toast.success('Leave record deleted successfully');
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
      
      // Increment pending_days in leave_balances when a new request is submitted
      if (leave.leave_type && leave.status === 'Pending') {
        // Find leave type
        const { data: leaveType } = await supabase
          .from('leave_types')
          .select('id')
          .eq('name', leave.leave_type)
          .maybeSingle();
        
        if (leaveType) {
          const currentYear = new Date().getFullYear();
          
          // Get or create leave balance
          let { data: balance } = await supabase
            .from('leave_balances')
            .select('id, pending_days')
            .eq('employee_id', leave.employee_id)
            .eq('leave_type_id', leaveType.id)
            .eq('year', currentYear)
            .maybeSingle();
          
          if (balance) {
            // Increment pending_days
            await supabase
              .from('leave_balances')
              .update({
                pending_days: (balance.pending_days || 0) + leave.days_count,
                updated_at: new Date().toISOString(),
              })
              .eq('id', balance.id);
          } else {
            // Fetch employee's joining date for tenure calculation
            const { data: employee } = await supabase
              .from('employees')
              .select('joining_date')
              .eq('id', leave.employee_id)
              .single();
            
            // Calculate tenure-based entitlement
            let entitledDays = 0;
            if (employee?.joining_date) {
              const joining = new Date(employee.joining_date);
              const now = new Date();
              const totalMonths = (now.getFullYear() * 12 + now.getMonth()) - 
                                  (joining.getFullYear() * 12 + joining.getMonth());
              
              if (totalMonths > 0) {
                // Flat rate: 2.5 days/month from joining date
                entitledDays = totalMonths * 2.5;
              }
            }
            
            // Create new balance record with tenure-based entitlement and pending days
            await supabase
              .from('leave_balances')
              .insert({
                employee_id: leave.employee_id,
                leave_type_id: leaveType.id,
                year: currentYear,
                entitled_days: entitledDays,
                used_days: 0,
                pending_days: leave.days_count,
                carried_forward_days: 0
              });
          }
        }
      }
      
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['leave'] });
      queryClient.invalidateQueries({ queryKey: ['leave_balances'] });
      queryClient.invalidateQueries({ queryKey: ['all_leave_balances'] });
      toast.success('Leave request submitted');
      
      // Send email notification to HR about new leave request
      if (data?.id) {
        supabase.functions.invoke('send-leave-request-notification', {
          body: { leave_id: data.id }
        }).catch(err => console.error('Failed to send leave request notification:', err));
      }
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
          employees (id, full_name, hrms_no, department, photo_url)
        `)
        .eq('year', new Date().getFullYear())
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as (LeaveBalance & { employees: { id: string; full_name: string; hrms_no: string; department: string; photo_url?: string } })[];
    },
  });
}

export function useUpdateLeaveBalance() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, entitled_days, carried_forward_days }: { 
      id: string; 
      entitled_days: number;
      carried_forward_days?: number;
    }) => {
      const { data, error } = await supabase
        .from('leave_balances')
        .update({
          entitled_days,
          carried_forward_days: carried_forward_days || 0,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave_balances'] });
      queryClient.invalidateQueries({ queryKey: ['all_leave_balances'] });
      toast.success('Leave allocation updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update allocation: ${error.message}`);
    },
  });
}

// Check for overlapping leaves
export function useCheckOverlappingLeave() {
  return useMutation({
    mutationFn: async ({ employee_id, start_date, end_date, exclude_id }: {
      employee_id: string;
      start_date: string;
      end_date: string;
      exclude_id?: string;
    }) => {
      let query = supabase
        .from('leave_records')
        .select('id, start_date, end_date, leave_type, status')
        .eq('employee_id', employee_id)
        .in('status', ['Pending', 'Approved'])
        .or(`and(start_date.lte.${end_date},end_date.gte.${start_date})`);
      
      if (exclude_id) {
        query = query.neq('id', exclude_id);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data;
    },
  });
}

export function useDeleteLeaveBalance() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('leave_balances')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave_balances'] });
      queryClient.invalidateQueries({ queryKey: ['all_leave_balances'] });
      toast.success('Leave allocation deleted');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete allocation: ${error.message}`);
    },
  });
}

/**
 * Real-time leave updates using Supabase Realtime
 * Automatically syncs leave records when HR approves/rejects requests
 * Eliminates need for polling or manual refresh
 */
export function useRealtimeLeave() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('leave-realtime')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'leave_records'
        },
        (payload) => {
          console.log('📅 Real-time leave update:', payload);
          
          // Invalidate leave queries to trigger refetch
          queryClient.invalidateQueries({ queryKey: ['leave'] });
          queryClient.invalidateQueries({ queryKey: ['leave_balances'] });
          
          // Show toast for status changes
          if (payload.eventType === 'UPDATE') {
            const newData = payload.new as LeaveRecord;
            const oldData = payload.old as LeaveRecord;
            
            // Check if status changed
            if (oldData.status !== newData.status) {
              if (newData.status === 'Approved') {
                toast.success('Leave request approved!', {
                  description: `Your ${newData.leave_type} request has been approved.`,
                });
              } else if (newData.status === 'Rejected') {
                toast.error('Leave request rejected', {
                  description: newData.rejection_reason || 'Your leave request was not approved.',
                });
              }
            }
          } else if (payload.eventType === 'INSERT') {
            toast.info('New leave request submitted');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
