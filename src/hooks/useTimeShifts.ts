import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type ShiftType = 'morning' | 'afternoon' | 'flexible';

export interface EmployeeShift {
  id: string;
  employee_id: string;
  shift_type: ShiftType;
  created_at: string;
  updated_at: string;
}

// Standard shift times for each shift type
export const SHIFT_DEFINITIONS = {
  morning: { label: 'Morning Shift', start: '08:00', end: '17:00' },
  afternoon: { label: 'Afternoon Shift', start: '09:00', end: '18:00' },
  flexible: { label: 'Flexible Shift', start: null, end: null }, // Custom per employee per date
} as const;

export function useTimeShifts() {
  return useQuery({
    queryKey: ['employee-shifts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_shifts')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return (data || []).map(d => ({
        ...d,
        shift_type: d.shift_type as ShiftType
      })) as EmployeeShift[];
    },
  });
}

export function useAssignShift() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ employeeId, shiftType }: { employeeId: string; shiftType: ShiftType }) => {
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
    mutationFn: async ({ employeeIds, shiftType }: { employeeIds: string[]; shiftType: ShiftType }) => {
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
