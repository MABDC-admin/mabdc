import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Payroll {
  id: string;
  employee_id: string;
  month: string;
  basic_salary: number;
  allowances: number;
  deductions: number;
  net_salary: number;
  wps_processed: boolean;
  created_at?: string;
  employees?: {
    full_name: string;
    hrms_no: string;
    bank_name: string | null;
    iban: string | null;
    bank_account_no: string | null;
    department: string;
    job_position: string;
    photo_url?: string;
  };
}

export function usePayroll() {
  return useQuery({
    queryKey: ['payroll'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payroll')
        .select(`
          *,
          employees (full_name, hrms_no, bank_name, iban, bank_account_no, department, job_position, photo_url)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Payroll[];
    },
  });
}

export function useGeneratePayroll() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ employeeId, month, basicSalary, allowances, deductions }: {
      employeeId: string;
      month: string;
      basicSalary: number;
      allowances: number;
      deductions: number;
    }) => {
      const netSalary = basicSalary + allowances - deductions;
      
      const { data, error } = await supabase
        .from('payroll')
        .insert([{
          employee_id: employeeId,
          month,
          basic_salary: basicSalary,
          allowances,
          deductions,
          net_salary: netSalary,
          wps_processed: false
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll'] });
      toast.success('Payroll generated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to generate payroll: ${error.message}`);
    },
  });
}

export function useProcessWPS() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (payrollId: string) => {
      const { data, error } = await supabase
        .from('payroll')
        .update({ wps_processed: true })
        .eq('id', payrollId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll'] });
      toast.success('Marked as Paid / WPS Processed');
    },
    onError: (error: Error) => {
      toast.error(`Failed to process: ${error.message}`);
    },
  });
}

export function useDeletePayroll() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (payrollId: string) => {
      const { error } = await supabase
        .from('payroll')
        .delete()
        .eq('id', payrollId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll'] });
      toast.success('Payroll record deleted');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete: ${error.message}`);
    },
  });
}

export function useUpdatePayroll() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, basicSalary, allowances, deductions }: {
      id: string;
      basicSalary: number;
      allowances: number;
      deductions: number;
    }) => {
      const netSalary = basicSalary + allowances - deductions;
      
      const { data, error } = await supabase
        .from('payroll')
        .update({
          basic_salary: basicSalary,
          allowances,
          deductions,
          net_salary: netSalary,
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll'] });
      toast.success('Payroll updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update payroll: ${error.message}`);
    },
  });
}
