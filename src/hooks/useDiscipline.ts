import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface DisciplineRecord {
  id: string;
  employee_id: string;
  incident_type: 'Misconduct' | 'Policy Violation' | 'Written Warning' | 'Suspension' | 'Final Warning' | 'Termination';
  incident_date: string;
  description: string;
  action_taken: string | null;
  issued_by: string | null;
  document_url: string | null;
  document_name: string | null;
  suspension_start_date: string | null;
  suspension_end_date: string | null;
  status: 'Active' | 'Resolved' | 'Under Review' | 'Appealed';
  created_at: string;
  employees?: { full_name: string; hrms_no: string };
}

export function useDiscipline() {
  return useQuery({
    queryKey: ['employee-discipline'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_discipline')
        .select('*, employees(full_name, hrms_no)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as DisciplineRecord[];
    },
  });
}

export function useEmployeeDiscipline(employeeId: string) {
  return useQuery({
    queryKey: ['employee-discipline', employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_discipline')
        .select('*')
        .eq('employee_id', employeeId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as DisciplineRecord[];
    },
    enabled: !!employeeId,
  });
}

export function useAddDiscipline() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (record: Omit<DisciplineRecord, 'id' | 'created_at' | 'employees'>) => {
      const { data, error } = await supabase
        .from('employee_discipline')
        .insert([record])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-discipline'] });
      toast.success('Discipline record added');
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useUpdateDiscipline() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<DisciplineRecord> & { id: string }) => {
      const { data, error } = await supabase
        .from('employee_discipline')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-discipline'] });
      toast.success('Discipline record updated');
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useDeleteDiscipline() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      // Get discipline record for the approval email
      const { data: discipline, error: fetchError } = await supabase
        .from('employee_discipline')
        .select('*')
        .eq('id', id)
        .single();
      
      if (fetchError) throw fetchError;
      
      // Send deletion request for approval
      const { error } = await supabase.functions.invoke('send-deletion-approval', {
        body: {
          recordType: 'discipline',
          recordId: id,
          recordData: discipline,
          reason,
        },
      });
      
      if (error) throw new Error(error.message || 'Failed to request deletion approval');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-deletions'] });
      toast.info('Deletion request sent for approval');
    },
    onError: (error: Error) => toast.error(error.message),
  });
}
