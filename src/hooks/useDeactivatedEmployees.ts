import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Employee } from '@/types/hr';
import { calculateGratuity } from '@/utils/gratuityCalculation';

export interface DeactivatedEmployee extends Employee {
  deactivated_at?: string;
  deactivation_reason?: string;
  last_working_day?: string;
  deactivated_by?: string;
}

export function useDeactivatedEmployees() {
  return useQuery({
    queryKey: ['deactivated-employees'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .in('status', ['Resigned', 'Terminated'])
        .order('deactivated_at', { ascending: false });
      
      if (error) throw error;
      return data as DeactivatedEmployee[];
    },
  });
}

export function useDeactivateEmployee() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      employeeId,
      status,
      reason,
      lastWorkingDay,
      customGratuity,
      gratuityAdjustmentReason,
    }: {
      employeeId: string;
      status: 'Resigned' | 'Terminated';
      reason: string;
      lastWorkingDay: string;
      customGratuity?: number;
      gratuityAdjustmentReason?: string;
    }) => {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      // Fetch employee details for EOS calculation
      const { data: employee, error: fetchError } = await supabase
        .from('employees')
        .select('*')
        .eq('id', employeeId)
        .single();
      
      if (fetchError || !employee) {
        throw new Error('Failed to fetch employee details');
      }
      
      // Update employee status
      const { error } = await supabase
        .from('employees')
        .update({
          status,
          deactivated_at: new Date().toISOString(),
          deactivation_reason: reason,
          last_working_day: lastWorkingDay,
          deactivated_by: user?.id,
        })
        .eq('id', employeeId);
      
      if (error) throw error;

      // Calculate and create/update EOS record automatically
      const basicSalary = employee.basic_salary || 0;
      const joiningDate = employee.joining_date;
      
      if (joiningDate && basicSalary > 0) {
        const { yearsOfService, gratuityAmount } = calculateGratuity(
          joiningDate,
          lastWorkingDay,
          basicSalary
        );
        
        // Use custom gratuity if provided, otherwise use calculated amount
        const finalGratuity = customGratuity !== undefined ? customGratuity : gratuityAmount;
        
        // Create EOS record with adjustment reason if provided
        const eosReason = customGratuity !== undefined 
          ? `${status}: ${reason} | Gratuity Adjustment: ${gratuityAdjustmentReason || 'No reason provided'}`
          : `${status}: ${reason}`;
        
        // Check if EOS record already exists for this employee
        const { data: existingEOS } = await supabase
          .from('eos_records')
          .select('id')
          .eq('employee_id', employeeId)
          .maybeSingle();
        
        if (existingEOS) {
          // Update existing EOS record instead of creating duplicate
          const { error: eosError } = await supabase
            .from('eos_records')
            .update({
              years_of_service: yearsOfService,
              basic_salary: basicSalary,
              gratuity_amount: finalGratuity,
              reason: eosReason,
              paid: false,
            })
            .eq('id', existingEOS.id);
          
          if (eosError) {
            console.error('Failed to update EOS record:', eosError);
          }
        } else {
          // Create new EOS record
          const { error: eosError } = await supabase
            .from('eos_records')
            .insert({
              employee_id: employeeId,
              years_of_service: yearsOfService,
              basic_salary: basicSalary,
              gratuity_amount: finalGratuity,
              reason: eosReason,
              paid: false,
            });
          
          if (eosError) {
            console.error('Failed to create EOS record:', eosError);
          }
        }
      }

      // Remove employee role if user_id exists
      if (employee?.user_id) {
        await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', employee.user_id)
          .eq('role', 'employee');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['deactivated-employees'] });
      queryClient.invalidateQueries({ queryKey: ['eos-records'] });
      toast.success('Employee deactivated and EOS record created');
    },
    onError: (error: Error) => {
      toast.error(`Failed to deactivate employee: ${error.message}`);
    },
  });
}

export function useReactivateEmployee() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (employeeId: string) => {
      const { error } = await supabase
        .from('employees')
        .update({
          status: 'Active',
          deactivated_at: null,
          deactivation_reason: null,
          last_working_day: null,
          deactivated_by: null,
        })
        .eq('id', employeeId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['deactivated-employees'] });
      toast.success('Employee reactivated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to reactivate employee: ${error.message}`);
    },
  });
}
