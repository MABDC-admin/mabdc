import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface PerformanceRecord {
  id: string;
  employee_id: string;
  performance_type: 'Task' | 'Behavioral' | 'Competency' | 'Result KPI' | 'Adaptive/Teamwork';
  rating: number;
  review_period: string;
  reviewer: string | null;
  comments: string | null;
  created_at: string;
  updated_at: string;
  employees?: { full_name: string; hrms_no: string };
}

export interface CorrectiveAction {
  id: string;
  employee_id: string;
  action_type: 'Verbal Warning' | 'Written Warning' | 'PIP' | 'Final Warning';
  reason: string;
  issued_date: string;
  issued_by: string | null;
  document_url: string | null;
  document_name: string | null;
  status: 'Active' | 'Resolved' | 'Escalated';
  notes: string | null;
  created_at: string;
  employees?: { full_name: string; hrms_no: string };
}

// Performance Records
export function usePerformance() {
  return useQuery({
    queryKey: ['employee-performance'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_performance')
        .select('*, employees(full_name, hrms_no)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as PerformanceRecord[];
    },
  });
}

export function useEmployeePerformance(employeeId: string) {
  return useQuery({
    queryKey: ['employee-performance', employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_performance')
        .select('*')
        .eq('employee_id', employeeId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as PerformanceRecord[];
    },
    enabled: !!employeeId,
  });
}

export function useAddPerformance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (record: Omit<PerformanceRecord, 'id' | 'created_at' | 'updated_at' | 'employees'>) => {
      const { data, error } = await supabase
        .from('employee_performance')
        .insert([record])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-performance'] });
      toast.success('Performance record added');
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useDeletePerformance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('employee_performance')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-performance'] });
      toast.success('Performance record deleted successfully');
    },
    onError: (error: Error) => toast.error(`Failed to delete: ${error.message}`),
  });
}

// Corrective Actions
export function useCorrectiveActions() {
  return useQuery({
    queryKey: ['corrective-actions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_corrective_actions')
        .select('*, employees(full_name, hrms_no)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as CorrectiveAction[];
    },
  });
}

export function useEmployeeCorrectiveActions(employeeId: string) {
  return useQuery({
    queryKey: ['corrective-actions', employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_corrective_actions')
        .select('*')
        .eq('employee_id', employeeId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as CorrectiveAction[];
    },
    enabled: !!employeeId,
  });
}

export function useAddCorrectiveAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (record: Omit<CorrectiveAction, 'id' | 'created_at' | 'employees'>) => {
      const { data, error } = await supabase
        .from('employee_corrective_actions')
        .insert([record])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['corrective-actions'] });
      toast.success('Corrective action added');
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useDeleteCorrectiveAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('employee_corrective_actions')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['corrective-actions'] });
      toast.success('Corrective action deleted successfully');
    },
    onError: (error: Error) => toast.error(`Failed to delete: ${error.message}`),
  });
}
