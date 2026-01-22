import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Contract {
  id: string;
  employee_id: string;
  mohre_contract_no: string;
  contract_type: 'Unlimited' | 'Limited' | 'Part-time' | 'Temporary';
  status: 'Draft' | 'Submitted' | 'Approved' | 'Active' | 'Expired' | 'Terminated';
  start_date: string;
  end_date?: string;
  basic_salary: number;
  housing_allowance?: number;
  transportation_allowance?: number;
  total_salary?: number;
  work_location?: string;
  job_title_arabic?: string;
  working_hours: number;
  notice_period: number;
  annual_leave_days: number;
  probation_period: number;
  page1_url?: string;
  page2_url?: string;
  created_at?: string;
  employees?: {
    full_name: string;
    photo_url?: string;
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
          employees (full_name, photo_url)
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
      // Archive previous active contracts before inserting new one
      const { archivePreviousContracts } = await import('@/utils/contractArchiver');
      await archivePreviousContracts(contract.employee_id);
      
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

export function useUpdateContract() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<Omit<Contract, 'id' | 'created_at' | 'employees'>>) => {
      const { data, error } = await supabase
        .from('contracts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      toast.success('Contract updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update contract: ${error.message}`);
    },
  });
}

export function useRenewContract() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      oldContractId, 
      newContract 
    }: { 
      oldContractId: string; 
      newContract: Omit<Contract, 'id' | 'created_at' | 'employees'> 
    }) => {
      // Archive ALL previous active contracts for this employee (not just the old one)
      const { archivePreviousContracts } = await import('@/utils/contractArchiver');
      await archivePreviousContracts(newContract.employee_id);

      // Create new contract as Active
      const { data, error } = await supabase
        .from('contracts')
        .insert([{ ...newContract, status: 'Active' }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      toast.success('Contract renewed successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to renew contract: ${error.message}`);
    },
  });
}

export function useCheckContractExpiry() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('check-contract-expiry');
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      if (data?.expiring_contracts > 0 || data?.auto_expired > 0) {
        toast.info(`Found ${data.expiring_contracts} expiring and ${data.auto_expired} expired contracts`);
      } else {
        toast.success('All contracts are up to date');
      }
    },
    onError: (error: Error) => {
      toast.error(`Failed to check contracts: ${error.message}`);
    },
  });
}

export function useDeleteContract() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (contractId: string) => {
      const { error } = await supabase
        .from('contracts')
        .delete()
        .eq('id', contractId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      toast.success('Contract deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete contract: ${error.message}`);
    },
  });
}

export function useUpdateContractImages() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      contractId, 
      page1Url, 
      page2Url 
    }: { 
      contractId: string; 
      page1Url?: string | null; 
      page2Url?: string | null;
    }) => {
      const updates: Record<string, string | null> = {};
      if (page1Url !== undefined) updates.page1_url = page1Url;
      if (page2Url !== undefined) updates.page2_url = page2Url;
      
      const { data, error } = await supabase
        .from('contracts')
        .update(updates)
        .eq('id', contractId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      toast.success('Contract images updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update contract images: ${error.message}`);
    },
  });
}
