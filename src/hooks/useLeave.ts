import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface LeaveRecord {
  id: string;
  employee_id: string;
  leave_type: 'Annual' | 'Sick' | 'Maternity' | 'Emergency' | 'Unpaid';
  start_date: string;
  end_date: string;
  days_count: number;
  status: 'Pending' | 'Approved' | 'Rejected';
  reason?: string;
  created_at?: string;
  employees?: {
    full_name: string;
  };
}

export function useLeave() {
  return useQuery({
    queryKey: ['leave'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leave_records')
        .select(`
          *,
          employees (full_name)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as LeaveRecord[];
    },
  });
}

export function useUpdateLeaveStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'Approved' | 'Rejected' }) => {
      const { data, error } = await supabase
        .from('leave_records')
        .update({ status })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['leave'] });
      toast.success(`Leave request ${variables.status.toLowerCase()}`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to update leave: ${error.message}`);
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
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave'] });
      toast.success('Leave request submitted');
    },
    onError: (error: Error) => {
      toast.error(`Failed to submit leave: ${error.message}`);
    },
  });
}
