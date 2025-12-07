import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Contract {
  id: string;
  employee_id: string;
  mohre_contract_no: string;
  contract_type: 'Unlimited' | 'Limited' | 'Part-time' | 'Temporary';
  status: 'Draft' | 'Submitted' | 'Approved' | 'Active' | 'Expired' | 'Terminated';
  start_date: string;
  end_date?: string;
  basic_salary: number;
  total_salary?: number;
  work_location?: string;
  job_title_arabic?: string;
  working_hours: number;
  notice_period: number;
  annual_leave_days: number;
  probation_period: number;
  created_at?: string;
  employees?: {
    full_name: string;
  };
}

export function useContracts() {
  return useQuery({
    queryKey: ['contracts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contracts')
        .select(`
          *,
          employees (full_name)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Contract[];
    },
  });
}

export function useAddContract() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (contract: Omit<Contract, 'id' | 'created_at' | 'employees'>) => {
      const { data, error } = await supabase
        .from('contracts')
        .insert([contract])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      toast.success('Contract added successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to add contract: ${error.message}`);
    },
  });
}

export function useUpdateContractStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Contract['status'] }) => {
      const { data, error } = await supabase
        .from('contracts')
        .update({ status })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      toast.success('Contract status updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update contract: ${error.message}`);
    },
  });
}
