import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ShiftOverride {
  id: string;
  employee_id: string;
  override_date: string; // YYYY-MM-DD
  shift_start_time: string; // HH:MM:SS or HH:MM
  shift_end_time: string; // HH:MM:SS or HH:MM
  reason: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Fetch all shift overrides or filter by date
 */
export function useShiftOverrides(date?: string) {
  return useQuery({
    queryKey: ['shift-overrides', date],
    queryFn: async () => {
      let query = supabase
        .from('employee_shift_overrides' as any)
        .select('*')
        .order('override_date', { ascending: false });
        
      if (date) {
        query = query.eq('override_date', date);
      }
        
      const { data, error } = await query;
        
      if (error) throw error;
      return (data as unknown) as ShiftOverride[];
    },
  });
}

/**
 * Fetch shift override for a specific employee and date
 */
export function useEmployeeShiftOverride(employeeId: string, date: string) {
  return useQuery({
    queryKey: ['shift-override', employeeId, date],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_shift_overrides' as any)
        .select('*')
        .eq('employee_id', employeeId)
        .eq('override_date', date)
        .maybeSingle();
      
      if (error) throw error;
      return (data as unknown) as ShiftOverride | null;
    },
    enabled: !!employeeId && !!date,
  });
}

/**
 * Create a new shift override
 */
export function useCreateShiftOverride() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (override: {
      employee_id: string;
      override_date: string;
      shift_start_time: string;
      shift_end_time: string;
      reason?: string;
    }) => {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('employee_shift_overrides' as any)
        .insert({
          ...override,
          created_by: user?.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['shift-overrides'] });
      queryClient.invalidateQueries({ queryKey: ['shift-override'] });
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      toast.success('Shift override created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create shift override: ${error.message}`);
    },
  });
}

/**
 * Update an existing shift override
 */
export function useUpdateShiftOverride() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      id, 
      shift_start_time, 
      shift_end_time, 
      reason 
    }: {
      id: string;
      shift_start_time?: string;
      shift_end_time?: string;
      reason?: string;
    }) => {
      const { data, error } = await supabase
        .from('employee_shift_overrides' as any)
        .update({
          shift_start_time,
          shift_end_time,
          reason,
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift-overrides'] });
      queryClient.invalidateQueries({ queryKey: ['shift-override'] });
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      toast.success('Shift override updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update shift override: ${error.message}`);
    },
  });
}

/**
 * Delete a shift override
 */
export function useDeleteShiftOverride() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('employee_shift_overrides' as any)
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift-overrides'] });
      queryClient.invalidateQueries({ queryKey: ['shift-override'] });
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      toast.success('Shift override removed');
    },
    onError: (error: Error) => {
      toast.error(`Failed to remove shift override: ${error.message}`);
    },
  });
}

/**
 * Upsert shift override (create or update if exists)
 */
export function useUpsertShiftOverride() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (override: {
      employee_id: string;
      override_date: string;
      shift_start_time: string;
      shift_end_time: string;
      reason?: string;
    }) => {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('employee_shift_overrides' as any)
        .upsert(
          {
            ...override,
            created_by: user?.id,
          },
          { onConflict: 'employee_id,override_date' }
        )
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift-overrides'] });
      queryClient.invalidateQueries({ queryKey: ['shift-override'] });
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      toast.success('Shift override saved successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to save shift override: ${error.message}`);
    },
  });
}
