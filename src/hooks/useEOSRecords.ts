import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { EOSRecord } from '@/types/hr';

export interface EOSRecordWithEmployee extends EOSRecord {
  employees?: {
    full_name: string;
    hrms_no: string;
    department: string;
    photo_url: string | null;
    status: string;
  };
}

export function useEOSRecords() {
  return useQuery({
    queryKey: ['eos-records'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('eos_records')
        .select(`
          *,
          employees(full_name, hrms_no, department, photo_url, status)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as EOSRecordWithEmployee[];
    },
  });
}

export function useDeactivatedEOSRecords() {
  return useQuery({
    queryKey: ['deactivated-eos-records'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('eos_records')
        .select(`
          *,
          employees!inner(full_name, hrms_no, department, photo_url, status)
        `)
        .in('employees.status', ['Resigned', 'Terminated'])
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as EOSRecordWithEmployee[];
    },
  });
}

export function useMarkEOSPaid() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      eosId, 
      paid,
      paidAt 
    }: { 
      eosId: string; 
      paid: boolean;
      paidAt?: string;
    }) => {
      const { error } = await supabase
        .from('eos_records')
        .update({ 
          paid,
          // We'll update reason to include payment date info
        })
        .eq('id', eosId);
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['eos-records'] });
      queryClient.invalidateQueries({ queryKey: ['deactivated-eos-records'] });
      toast.success(variables.paid ? 'EOS marked as paid' : 'EOS marked as unpaid');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update payment status: ${error.message}`);
    },
  });
}
