import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PayrollEarning {
  id: string;
  earning_type: string;
  description?: string;
  amount: number;
}

interface PayrollDeduction {
  id: string;
  deduction_type: string;
  reason: string;
  amount: number;
  days?: number;
}

interface Payroll {
  id: string;
  employee_id: string;
  month: string;
  basic_salary: number;
  housing_allowance?: number;
  transportation_allowance?: number;
  ticket_allowance?: number;
  other_allowances?: number;
  allowances: number;
  deductions: number;
  deduction_reason?: string;
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
    work_email?: string;
    joining_date?: string;
    birthday?: string;
  };
  payroll_earnings?: PayrollEarning[];
  payroll_deductions?: PayrollDeduction[];
  ticket_allowance_status?: 'eligible' | 'not_eligible' | 'processed' | 'pending';
}

export function usePayroll() {
  return useQuery({
    queryKey: ['payroll'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payroll')
        .select(`
          *,
          employees (
            full_name, hrms_no, bank_name, iban, bank_account_no, 
            department, job_position, photo_url, work_email, joining_date, birthday
          ),
          payroll_earnings (id, earning_type, description, amount),
          payroll_deductions (id, deduction_type, reason, amount, days)
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
    mutationFn: async ({ 
      employeeId, 
      month, 
      basicSalary,
      housingAllowance = 0,
      transportationAllowance = 0,
      ticketAllowance = 0,
      otherAllowances = 0,
      deductions,
      deductionReason = ''
    }: {
      employeeId: string;
      month: string;
      basicSalary: number;
      housingAllowance?: number;
      transportationAllowance?: number;
      ticketAllowance?: number;
      otherAllowances?: number;
      deductions: number;
      deductionReason?: string;
    }) => {
      const totalAllowances = housingAllowance + transportationAllowance + ticketAllowance + otherAllowances;
      const netSalary = basicSalary + totalAllowances - deductions;
      
      // Insert main payroll record
      const { data: payrollData, error: payrollError } = await supabase
        .from('payroll')
        .insert([{
          employee_id: employeeId,
          month,
          basic_salary: basicSalary,
          housing_allowance: housingAllowance,
          transportation_allowance: transportationAllowance,
          ticket_allowance: ticketAllowance,
          other_allowances: otherAllowances,
          allowances: totalAllowances,
          deductions,
          deduction_reason: deductionReason,
          net_salary: netSalary,
          wps_processed: false
        }])
        .select()
        .single();
      
      if (payrollError) throw payrollError;
      
      // Insert itemized earnings
      const earnings = [
        { payroll_id: payrollData.id, earning_type: 'basic_salary', description: 'Basic Salary', amount: basicSalary },
        { payroll_id: payrollData.id, earning_type: 'housing_allowance', description: 'Housing Rental Allowance', amount: housingAllowance },
        { payroll_id: payrollData.id, earning_type: 'transport_allowance', description: 'Transportation Allowance', amount: transportationAllowance },
        { payroll_id: payrollData.id, earning_type: 'ticket_allowance', description: 'Ticket Allowance', amount: ticketAllowance },
        { payroll_id: payrollData.id, earning_type: 'other_allowances', description: 'Other Allowances', amount: otherAllowances },
      ].filter(e => e.amount > 0);
      
      if (earnings.length > 0) {
        const { error: earningsError } = await supabase
          .from('payroll_earnings')
          .insert(earnings);
        
        if (earningsError) console.error('Failed to insert earnings:', earningsError);
      }
      
      // Insert itemized deductions if any
      if (deductions > 0 && deductionReason) {
        const { error: deductionsError } = await supabase
          .from('payroll_deductions')
          .insert({
            payroll_id: payrollData.id,
            deduction_type: 'custom',
            reason: deductionReason,
            amount: deductions
          });
        
        if (deductionsError) console.error('Failed to insert deduction:', deductionsError);
      }
      
      return payrollData;
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
