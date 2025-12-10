import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Education {
  id: string;
  employee_id: string;
  certificate_level: string;
  field_of_study?: string;
  school?: string;
  graduation_year?: number;
  created_at?: string;
}

export function useEmployeeEducation(employeeId: string) {
  return useQuery({
    queryKey: ['education', employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_education')
        .select('*')
        .eq('employee_id', employeeId)
        .order('graduation_year', { ascending: false });
      
      if (error) throw error;
      return data as Education[];
    },
    enabled: !!employeeId,
  });
}

export function useAddEducation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (education: Omit<Education, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('employee_education')
        .insert([education])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['education', variables.employee_id] });
      toast.success('Education record added');
    },
    onError: (error: Error) => {
      toast.error(`Failed to add education: ${error.message}`);
    },
  });
}

export function useUpdateEducation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (education: Partial<Education> & { id: string; employee_id: string }) => {
      const { id, employee_id, ...updateData } = education;
      const { data, error } = await supabase
        .from('employee_education')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return { ...data, employee_id };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['education', data.employee_id] });
      toast.success('Education record updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update education: ${error.message}`);
    },
  });
}

export function useDeleteEducation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, employeeId }: { id: string; employeeId: string }) => {
      const { error } = await supabase
        .from('employee_education')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return { employeeId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['education', data.employeeId] });
      toast.success('Education record deleted');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete education: ${error.message}`);
    },
  });
}
