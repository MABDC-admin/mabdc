import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface AccrualLogEntry {
  id: string;
  employee_id: string;
  leave_balance_id: string;
  accrual_date: string;
  accrual_month: number;
  accrual_year: number;
  months_of_service: number;
  accrual_rate: number;
  days_accrued: number;
  joining_date: string;
  created_at: string;
}

export interface AccrualResult {
  employee_id: string;
  employee_name: string;
  joining_date: string;
  months_of_service: number;
  accrual_rate: number;
  days_accrued: number;
  new_entitled_days: number;
  status: string;
}

export interface AccrualSummary {
  success: boolean;
  month: number;
  year: number;
  total_employees: number;
  processed_count: number;
  already_processed_count: number;
  not_started_count: number;
  results: AccrualResult[];
}

// Fetch accrual history log
export function useLeaveAccrualLog(year?: number) {
  return useQuery({
    queryKey: ['leave-accrual-log', year],
    queryFn: async () => {
      let query = supabase
        .from('leave_accrual_log')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (year) {
        query = query.eq('accrual_year', year);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as AccrualLogEntry[];
    },
  });
}

// Process monthly leave accrual
export function useProcessLeaveAccrual() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ month, year }: { month?: number; year?: number } = {}) => {
      const { data, error } = await supabase.functions.invoke('process-leave-accrual', {
        body: { month, year }
      });
      
      if (error) throw error;
      return data as AccrualSummary;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['leave-balances'] });
      queryClient.invalidateQueries({ queryKey: ['leave-accrual-log'] });
      
      if (data.processed_count > 0) {
        toast.success(
          `Leave accrual processed for ${data.processed_count} employee(s)`,
          {
            description: `Month: ${data.month}/${data.year}`
          }
        );
      } else if (data.already_processed_count > 0) {
        toast.info(
          'Accrual already processed for this month',
          {
            description: `${data.already_processed_count} employee(s) were already processed`
          }
        );
      } else {
        toast.info('No employees to process');
      }
    },
    onError: (error: Error) => {
      toast.error(`Failed to process leave accrual: ${error.message}`);
    },
  });
}

// Get accrual rate info for an employee based on their tenure
export function calculateAccrualRate(joiningDate: string): { rate: number; monthsOfService: number } {
  const joining = new Date(joiningDate);
  const now = new Date();
  
  const monthsOfService = (now.getFullYear() * 12 + now.getMonth()) - 
                          (joining.getFullYear() * 12 + joining.getMonth());
  
  // Flat rate: 2.5 days/month from joining date
  const rate = 2.5;
  
  return { rate, monthsOfService: Math.max(0, monthsOfService) };
}
