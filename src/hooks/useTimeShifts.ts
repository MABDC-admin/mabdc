import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface EmployeeShift {
  id: string;
  employee_id: string;
  shift_type: 'morning' | 'afternoon';
  created_at: string;
  updated_at: string;
}

export function useTimeShifts() {
  return useQuery({
    queryKey: ['employee-shifts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_shifts')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as EmployeeShift[];
    },
  });
}

export function useAssignShift() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ employeeId, shiftType }: { employeeId: string; shiftType: 'morning' | 'afternoon' }) => {
      // Upsert - insert or update if exists
      const { data, error } = await supabase
        .from('employee_shifts')
        .upsert(
          { employee_id: employeeId, shift_type: shiftType },
          { onConflict: 'employee_id' }
        )
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-shifts'] });
      toast.success('Shift assigned successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to assign shift: ${error.message}`);
    },
  });
}

export function useBulkAssignShift() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ employeeIds, shiftType }: { employeeIds: string[]; shiftType: 'morning' | 'afternoon' }) => {
      const records = employeeIds.map(employeeId => ({
        employee_id: employeeId,
        shift_type: shiftType,
      }));
      
      const { data, error } = await supabase
        .from('employee_shifts')
        .upsert(records, { onConflict: 'employee_id' })
        .select();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['employee-shifts'] });
      toast.success(`${variables.employeeIds.length} employees assigned to shift`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to assign shifts: ${error.message}`);
    },
  });
}

export function useRemoveShift() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (employeeId: string) => {
      const { error } = await supabase
        .from('employee_shifts')
        .delete()
        .eq('employee_id', employeeId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-shifts'] });
      toast.success('Shift removed');
    },
    onError: (error: Error) => {
      toast.error(`Failed to remove shift: ${error.message}`);
    },
  });
}
