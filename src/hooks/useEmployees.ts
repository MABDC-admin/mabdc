import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Employee } from '@/types/hr';

export function useEmployees() {
  return useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .not('status', 'in', '("Resigned","Terminated")')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Employee[];
    },
  });
}

export function useAddEmployee() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (employee: Omit<Employee, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('employees')
        .insert([employee])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success('Employee added successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to add employee: ${error.message}`);
    },
  });
}

export function useUpdateEmployee() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (employee: Partial<Employee> & { id: string }) => {
      const { id, ...updateData } = employee;
      const { data, error } = await supabase
        .from('employees')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success('Employee updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update employee: ${error.message}`);
    },
  });
}

export function useDeleteEmployee() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      // Get employee data for the approval email
      const { data: employee, error: fetchError } = await supabase
        .from('employees')
        .select('*')
        .eq('id', id)
        .single();
      
      if (fetchError) throw fetchError;
      
      // Send deletion request for approval
      const { error } = await supabase.functions.invoke('send-deletion-approval', {
        body: {
          recordType: 'employee',
          recordId: id,
          recordData: employee,
          reason,
        },
      });
      
      if (error) throw new Error(error.message || 'Failed to request deletion approval');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-deletions'] });
      toast.info('Deletion request sent for approval', {
        description: 'An email has been sent to the administrator.',
      });
    },
    onError: (error: Error) => {
      toast.error(`Failed to request deletion: ${error.message}`);
    },
  });
}
