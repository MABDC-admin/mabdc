import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Employee } from '@/types/hr';

export interface DeactivatedEmployee extends Employee {
  deactivated_at?: string;
  deactivation_reason?: string;
  last_working_day?: string;
  deactivated_by?: string;
}

export function useDeactivatedEmployees() {
  return useQuery({
    queryKey: ['deactivated-employees'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .in('status', ['Resigned', 'Terminated'])
        .order('deactivated_at', { ascending: false });
      
      if (error) throw error;
      return data as DeactivatedEmployee[];
    },
  });
}

export function useDeactivateEmployee() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      employeeId,
      status,
      reason,
      lastWorkingDay,
    }: {
      employeeId: string;
      status: 'Resigned' | 'Terminated';
      reason: string;
      lastWorkingDay: string;
    }) => {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      // Update employee status
      const { error } = await supabase
        .from('employees')
        .update({
          status,
          deactivated_at: new Date().toISOString(),
          deactivation_reason: reason,
          last_working_day: lastWorkingDay,
          deactivated_by: user?.id,
        })
        .eq('id', employeeId);
      
      if (error) throw error;

      // Remove employee role if user_id exists
      const { data: employee } = await supabase
        .from('employees')
        .select('user_id')
        .eq('id', employeeId)
        .single();

      if (employee?.user_id) {
        await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', employee.user_id)
          .eq('role', 'employee');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['deactivated-employees'] });
      toast.success('Employee deactivated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to deactivate employee: ${error.message}`);
    },
  });
}

export function useReactivateEmployee() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (employeeId: string) => {
      const { error } = await supabase
        .from('employees')
        .update({
          status: 'Active',
          deactivated_at: null,
          deactivation_reason: null,
          last_working_day: null,
          deactivated_by: null,
        })
        .eq('id', employeeId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['deactivated-employees'] });
      toast.success('Employee reactivated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to reactivate employee: ${error.message}`);
    },
  });
}
