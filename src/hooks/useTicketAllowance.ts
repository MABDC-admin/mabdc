import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TicketAllowanceRecord {
  id: string;
  employee_id: string;
  eligibility_year: number;
  eligibility_start_date: string;
  amount: number | null;
  status: 'pending' | 'approved' | 'processed' | 'cancelled';
  reminder_active: boolean;
  approved_by: string | null;
  approved_at: string | null;
  processed_in_payroll_id: string | null;
  processed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  employees?: {
    full_name: string;
    hrms_no: string;
    department: string;
    joining_date: string;
    photo_url: string | null;
  };
}

interface TicketAllowanceAuditLog {
  id: string;
  ticket_allowance_id: string;
  action: string;
  performed_by: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

// Calculate ticket allowance eligibility date (2 years from joining, then Jan 1st of that year)
export function calculateTicketEligibilityDate(joiningDate: Date): Date {
  const eligibilityDate = new Date(joiningDate);
  eligibilityDate.setFullYear(eligibilityDate.getFullYear() + 2);
  // Return January 1st of the eligibility year
  return new Date(eligibilityDate.getFullYear(), 0, 1);
}

// Check if employee is eligible for ticket allowance
export function isEligibleForTicketAllowance(joiningDate: Date): boolean {
  const today = new Date();
  const eligibilityDate = calculateTicketEligibilityDate(joiningDate);
  return today >= eligibilityDate;
}

// Get current eligibility year for an employee
export function getEligibilityYear(joiningDate: Date): number | null {
  if (!isEligibleForTicketAllowance(joiningDate)) return null;
  
  const today = new Date();
  const twoYearsFromJoining = new Date(joiningDate);
  twoYearsFromJoining.setFullYear(twoYearsFromJoining.getFullYear() + 2);
  
  // The eligibility year is the year that starts on Jan 1st after completing 2 years
  return twoYearsFromJoining.getFullYear();
}

// Fetch all pending ticket allowance reminders (for HR dashboard)
export function useTicketAllowanceReminders() {
  return useQuery({
    queryKey: ['ticket-allowance-reminders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ticket_allowance_records')
        .select(`
          *,
          employees(full_name, hrms_no, department, joining_date, photo_url)
        `)
        .eq('reminder_active', true)
        .eq('status', 'pending')
        .order('eligibility_start_date', { ascending: true });
      
      if (error) throw error;
      return data as TicketAllowanceRecord[];
    },
  });
}

// Fetch all ticket allowance records
export function useTicketAllowanceRecords(status?: string) {
  return useQuery({
    queryKey: ['ticket-allowance-records', status],
    queryFn: async () => {
      let query = supabase
        .from('ticket_allowance_records')
        .select(`
          *,
          employees(full_name, hrms_no, department, joining_date, photo_url)
        `)
        .order('created_at', { ascending: false });
      
      if (status) {
        query = query.eq('status', status);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as TicketAllowanceRecord[];
    },
  });
}

// Fetch ticket allowance records for a specific employee
export function useEmployeeTicketAllowance(employeeId: string) {
  return useQuery({
    queryKey: ['employee-ticket-allowance', employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ticket_allowance_records')
        .select('*')
        .eq('employee_id', employeeId)
        .order('eligibility_year', { ascending: false });
      
      if (error) throw error;
      return data as TicketAllowanceRecord[];
    },
    enabled: !!employeeId,
  });
}

// Fetch approved but not processed ticket allowances (for payroll)
export function useApprovedTicketAllowances() {
  return useQuery({
    queryKey: ['approved-ticket-allowances'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ticket_allowance_records')
        .select(`
          *,
          employees(full_name, hrms_no, department)
        `)
        .eq('status', 'approved')
        .is('processed_in_payroll_id', null)
        .order('eligibility_start_date', { ascending: true });
      
      if (error) throw error;
      return data as TicketAllowanceRecord[];
    },
  });
}

// Create a new ticket allowance record
export function useCreateTicketAllowance() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (record: {
      employee_id: string;
      eligibility_year: number;
      eligibility_start_date: string;
      amount?: number;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from('ticket_allowance_records')
        .insert([{
          ...record,
          status: 'pending',
          reminder_active: true,
        }])
        .select()
        .single();
      
      if (error) throw error;
      
      // Create audit log
      const { data: userData } = await supabase.auth.getUser();
      await supabase.from('ticket_allowance_audit_log').insert({
        ticket_allowance_id: data.id,
        action: 'created',
        performed_by: userData.user?.id,
        details: { eligibility_year: record.eligibility_year },
      });
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-allowance-reminders'] });
      queryClient.invalidateQueries({ queryKey: ['ticket-allowance-records'] });
      toast.success('Ticket allowance record created');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create ticket allowance: ${error.message}`);
    },
  });
}

// Approve a ticket allowance
export function useApproveTicketAllowance() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, amount, notes }: { id: string; amount: number; notes?: string }) => {
      const { data: userData } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('ticket_allowance_records')
        .update({
          status: 'approved',
          amount,
          notes,
          approved_by: userData.user?.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', id);
      
      if (error) throw error;
      
      // Create audit log
      await supabase.from('ticket_allowance_audit_log').insert({
        ticket_allowance_id: id,
        action: 'approved',
        performed_by: userData.user?.id,
        details: { amount, notes },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-allowance-reminders'] });
      queryClient.invalidateQueries({ queryKey: ['ticket-allowance-records'] });
      queryClient.invalidateQueries({ queryKey: ['approved-ticket-allowances'] });
      toast.success('Ticket allowance approved');
    },
    onError: (error: Error) => {
      toast.error(`Failed to approve ticket allowance: ${error.message}`);
    },
  });
}

// Process ticket allowance into payroll
export function useProcessTicketAllowance() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, payrollId }: { id: string; payrollId: string }) => {
      const { data: userData } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('ticket_allowance_records')
        .update({
          status: 'processed',
          processed_in_payroll_id: payrollId,
          processed_at: new Date().toISOString(),
          reminder_active: false,
        })
        .eq('id', id);
      
      if (error) throw error;
      
      // Create audit log
      await supabase.from('ticket_allowance_audit_log').insert({
        ticket_allowance_id: id,
        action: 'processed',
        performed_by: userData.user?.id,
        details: { payroll_id: payrollId },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-allowance-reminders'] });
      queryClient.invalidateQueries({ queryKey: ['ticket-allowance-records'] });
      queryClient.invalidateQueries({ queryKey: ['approved-ticket-allowances'] });
      toast.success('Ticket allowance processed into payroll');
    },
    onError: (error: Error) => {
      toast.error(`Failed to process ticket allowance: ${error.message}`);
    },
  });
}

// Cancel a ticket allowance
export function useCancelTicketAllowance() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { data: userData } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('ticket_allowance_records')
        .update({
          status: 'cancelled',
          reminder_active: false,
          notes: reason,
        })
        .eq('id', id);
      
      if (error) throw error;
      
      // Create audit log
      await supabase.from('ticket_allowance_audit_log').insert({
        ticket_allowance_id: id,
        action: 'cancelled',
        performed_by: userData.user?.id,
        details: { reason },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-allowance-reminders'] });
      queryClient.invalidateQueries({ queryKey: ['ticket-allowance-records'] });
      toast.success('Ticket allowance cancelled');
    },
    onError: (error: Error) => {
      toast.error(`Failed to cancel ticket allowance: ${error.message}`);
    },
  });
}

// Dismiss reminder (without cancelling)
export function useDismissTicketReminder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { data: userData } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('ticket_allowance_records')
        .update({
          reminder_active: false,
        })
        .eq('id', id);
      
      if (error) throw error;
      
      // Create audit log
      await supabase.from('ticket_allowance_audit_log').insert({
        ticket_allowance_id: id,
        action: 'reminder_dismissed',
        performed_by: userData.user?.id,
        details: {},
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-allowance-reminders'] });
      toast.success('Reminder dismissed');
    },
    onError: (error: Error) => {
      toast.error(`Failed to dismiss reminder: ${error.message}`);
    },
  });
}

// Fetch audit logs for a ticket allowance
export function useTicketAllowanceAuditLog(ticketAllowanceId: string) {
  return useQuery({
    queryKey: ['ticket-allowance-audit-log', ticketAllowanceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ticket_allowance_audit_log')
        .select('*')
        .eq('ticket_allowance_id', ticketAllowanceId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as TicketAllowanceAuditLog[];
    },
    enabled: !!ticketAllowanceId,
  });
}

// Check and create ticket allowance records for eligible employees
export function useCheckTicketEligibility() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (employees: Array<{ id: string; joining_date: string; full_name: string }>) => {
      const currentYear = new Date().getFullYear();
      const results: { created: number; skipped: number } = { created: 0, skipped: 0 };
      
      for (const employee of employees) {
        const joiningDate = new Date(employee.joining_date);
        
        if (isEligibleForTicketAllowance(joiningDate)) {
          const eligibilityYear = getEligibilityYear(joiningDate);
          
          if (eligibilityYear && eligibilityYear <= currentYear) {
            // Check if record already exists for this year
            const { data: existing } = await supabase
              .from('ticket_allowance_records')
              .select('id')
              .eq('employee_id', employee.id)
              .eq('eligibility_year', eligibilityYear)
              .single();
            
            if (!existing) {
              // Create new record
              await supabase
                .from('ticket_allowance_records')
                .insert({
                  employee_id: employee.id,
                  eligibility_year: eligibilityYear,
                  eligibility_start_date: `${eligibilityYear}-01-01`,
                  status: 'pending',
                  reminder_active: true,
                });
              
              results.created++;
            } else {
              results.skipped++;
            }
          }
        }
      }
      
      return results;
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: ['ticket-allowance-reminders'] });
      queryClient.invalidateQueries({ queryKey: ['ticket-allowance-records'] });
      if (results.created > 0) {
        toast.success(`Created ${results.created} ticket allowance reminder(s)`);
      } else {
        toast.info('No new eligible employees found');
      }
    },
    onError: (error: Error) => {
      toast.error(`Failed to check eligibility: ${error.message}`);
    },
  });
}
