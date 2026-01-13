import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Employee shift assignment interface
export interface EmployeeShift {
  id: string;
  employee_id: string;
  shift_type: string;
  created_at: string;
  updated_at: string;
}

// Time shift definition interface
export interface TimeShift {
  id: string;
  name: string;
  shift_key: string;
  start_time: string;
  end_time: string;
  is_active: boolean | null;
  created_at: string;
  updated_at: string;
}

export interface CreateTimeShiftData {
  name: string;
  shift_key: string;
  start_time: string;
  end_time: string;
  is_active?: boolean;
}

export interface UpdateTimeShiftData {
  name?: string;
  shift_key?: string;
  start_time?: string;
  end_time?: string;
  is_active?: boolean;
}

// ==================== TIME SHIFT DEFINITIONS CRUD ====================

// READ: Fetch all time shift definitions
export function useShiftDefinitions() {
  return useQuery({
    queryKey: ['time-shifts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('time_shifts')
        .select('*')
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data as TimeShift[];
    },
  });
}

// CREATE: Add new time shift definition
export function useCreateShiftDefinition() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (shiftData: CreateTimeShiftData) => {
      const { data, error } = await supabase
        .from('time_shifts')
        .insert(shiftData)
        .select()
        .single();
      
      if (error) throw error;
      return data as TimeShift;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-shifts'] });
      toast.success('Time shift created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create time shift: ${error.message}`);
    },
  });
}

// UPDATE: Modify existing time shift definition
export function useUpdateShiftDefinition() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateTimeShiftData }) => {
      const { data: updatedData, error } = await supabase
        .from('time_shifts')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return updatedData as TimeShift;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-shifts'] });
      toast.success('Time shift updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update time shift: ${error.message}`);
    },
  });
}

// DELETE: Remove time shift definition
export function useDeleteShiftDefinition() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('time_shifts')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-shifts'] });
      toast.success('Time shift deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete time shift: ${error.message}`);
    },
  });
}

// ==================== EMPLOYEE SHIFT ASSIGNMENTS ====================

// READ: Fetch all employee shift assignments
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
    mutationFn: async ({ employeeId, shiftType }: { employeeId: string; shiftType: string }) => {
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
    mutationFn: async ({ employeeIds, shiftType }: { employeeIds: string[]; shiftType: string }) => {
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
