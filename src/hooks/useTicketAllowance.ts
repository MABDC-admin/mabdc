import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface TicketAllowanceRecord {
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

// Ticket Cycle interface for UI
export interface TicketCycle {
  cycleNumber: number; // 1st, 2nd, 3rd...
  eligibilityDate: Date;
  eligibilityYear: number;
  isPast: boolean; // Has the eligibility date passed?
  record: TicketAllowanceRecord | null;
  status: 'processed' | 'approved' | 'pending' | 'cancelled' | 'missing' | 'not_yet_eligible';
}

// Calculate the exact eligibility date for a specific cycle (1st, 2nd, 3rd...)
// 1st cycle = joining + 2 years, 2nd cycle = joining + 4 years, etc.
export function getTicketEligibilityDate(joiningDate: Date, cycleNumber: number): Date {
  const eligibilityDate = new Date(joiningDate);
  eligibilityDate.setFullYear(eligibilityDate.getFullYear() + (cycleNumber * 2));
  return eligibilityDate;
}

// Get all ticket cycles for an employee (past + 1 future)
export function getAllTicketCycles(
  joiningDate: Date, 
  records: TicketAllowanceRecord[]
): TicketCycle[] {
  const cycles: TicketCycle[] = [];
  const today = new Date();
  let cycleNumber = 1;
  
  // Create a map of records by eligibility_year for quick lookup
  const recordsByYear = new Map<number, TicketAllowanceRecord>();
  records.forEach(r => recordsByYear.set(r.eligibility_year, r));
  
  while (true) {
    const eligibilityDate = getTicketEligibilityDate(joiningDate, cycleNumber);
    const eligibilityYear = eligibilityDate.getFullYear();
    const isPast = eligibilityDate <= today;
    
    // Find matching record
    const record = recordsByYear.get(eligibilityYear) || null;
    
    // Determine status
    let status: TicketCycle['status'];
    if (!isPast) {
      status = 'not_yet_eligible';
    } else if (!record) {
      status = 'missing';
    } else {
      status = record.status;
    }
    
    cycles.push({
      cycleNumber,
      eligibilityDate,
      eligibilityYear,
      isPast,
      record,
      status,
    });
    
    // Stop after adding one future cycle
    if (!isPast) {
      break;
    }
    
    cycleNumber++;
    
    // Safety limit to prevent infinite loops
    if (cycleNumber > 25) break;
  }
  
  return cycles;
}

// Get the next upcoming eligibility date
export function getNextTicketEligibilityDate(
  joiningDate: Date, 
  records: TicketAllowanceRecord[]
): { cycleNumber: number; date: Date; year: number } | null {
  const cycles = getAllTicketCycles(joiningDate, records);
  const nextCycle = cycles.find(c => !c.isPast);
  
  if (nextCycle) {
    return {
      cycleNumber: nextCycle.cycleNumber,
      date: nextCycle.eligibilityDate,
      year: nextCycle.eligibilityYear,
    };
  }
  
  return null;
}

// Check if employee is currently eligible for ticket allowance (has at least 2 years of service)
export function isEligibleForTicketAllowance(joiningDate: Date): boolean {
  const today = new Date();
  const firstEligibilityDate = getTicketEligibilityDate(joiningDate, 1);
  return today >= firstEligibilityDate;
}

// Calculate years of service from joining date
export function calculateYearsOfService(joiningDate: Date): { years: number; months: number } {
  const today = new Date();
  let years = today.getFullYear() - joiningDate.getFullYear();
  let months = today.getMonth() - joiningDate.getMonth();
  
  if (months < 0) {
    years--;
    months += 12;
  }
  
  // Adjust for day of month
  if (today.getDate() < joiningDate.getDate()) {
    months--;
    if (months < 0) {
      years--;
      months += 12;
    }
  }
  
  return { years, months };
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
// Only returns records where eligibility date has passed
export function useApprovedTicketAllowances() {
  return useQuery({
    queryKey: ['approved-ticket-allowances'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('ticket_allowance_records')
        .select(`
          *,
          employees(full_name, hrms_no, department)
        `)
        .eq('status', 'approved')
        .is('processed_in_payroll_id', null)
        .lte('eligibility_start_date', today) // Only past/current eligibility
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
      queryClient.invalidateQueries({ queryKey: ['employee-ticket-allowance'] });
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
      queryClient.invalidateQueries({ queryKey: ['employee-ticket-allowance'] });
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
      queryClient.invalidateQueries({ queryKey: ['employee-ticket-allowance'] });
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
      queryClient.invalidateQueries({ queryKey: ['employee-ticket-allowance'] });
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

// Check and create ticket allowance records for ALL eligible cycles for employees
export function useCheckTicketEligibility() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (employees: Array<{ id: string; joining_date: string; full_name: string }>) => {
      const today = new Date();
      const results: { created: number; skipped: number } = { created: 0, skipped: 0 };
      
      for (const employee of employees) {
        const joiningDate = new Date(employee.joining_date);
        
        // Get existing records for this employee
        const { data: existingRecords } = await supabase
          .from('ticket_allowance_records')
          .select('eligibility_year')
          .eq('employee_id', employee.id);
        
        const existingYears = new Set((existingRecords || []).map(r => r.eligibility_year));
        
        // Calculate all cycles
        const cycles = getAllTicketCycles(joiningDate, []);
        
        // Create records for all past cycles that are missing
        for (const cycle of cycles) {
          if (!cycle.isPast) continue; // Skip future cycles
          
          if (existingYears.has(cycle.eligibilityYear)) {
            results.skipped++;
            continue;
          }
          
          // Format the eligibility date correctly
          const eligibilityDateStr = cycle.eligibilityDate.toISOString().split('T')[0];
          
          // Create new record with exact anniversary date
          const { error } = await supabase
            .from('ticket_allowance_records')
            .insert({
              employee_id: employee.id,
              eligibility_year: cycle.eligibilityYear,
              eligibility_start_date: eligibilityDateStr,
              status: 'pending',
              reminder_active: true,
            });
          
          if (!error) {
            results.created++;
          }
        }
      }
      
      return results;
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: ['ticket-allowance-reminders'] });
      queryClient.invalidateQueries({ queryKey: ['ticket-allowance-records'] });
      queryClient.invalidateQueries({ queryKey: ['employee-ticket-allowance'] });
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

// Bulk auto-approve all past pending ticket allowances
export function useBulkAutoApproveTicketAllowances() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ defaultAmount }: { defaultAmount: number }) => {
      const { data: userData } = await supabase.auth.getUser();
      const today = new Date().toISOString().split('T')[0];

      // Get all past pending records
      const { data: pendingRecords, error: fetchError } = await supabase
        .from('ticket_allowance_records')
        .select('id, employee_id, eligibility_year')
        .eq('status', 'pending')
        .lt('eligibility_start_date', today);

      if (fetchError) throw fetchError;
      if (!pendingRecords?.length) return { approved: 0 };

      // Update all to approved
      const { error: updateError } = await supabase
        .from('ticket_allowance_records')
        .update({
          status: 'approved',
          amount: defaultAmount,
          approved_by: userData.user?.id,
          approved_at: new Date().toISOString(),
          notes: 'Auto-approved (past eligibility)',
        })
        .eq('status', 'pending')
        .lt('eligibility_start_date', today);

      if (updateError) throw updateError;

      // Create audit logs for each
      for (const record of pendingRecords) {
        await supabase.from('ticket_allowance_audit_log').insert({
          ticket_allowance_id: record.id,
          action: 'auto_approved',
          performed_by: userData.user?.id,
          details: { amount: defaultAmount, reason: 'Bulk auto-approve past eligibility' },
        });
      }

      return { approved: pendingRecords.length };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['ticket-allowance-reminders'] });
      queryClient.invalidateQueries({ queryKey: ['ticket-allowance-records'] });
      queryClient.invalidateQueries({ queryKey: ['approved-ticket-allowances'] });
      queryClient.invalidateQueries({ queryKey: ['employee-ticket-allowance'] });
      toast.success(`Auto-approved ${data.approved} ticket allowances`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to auto-approve: ${error.message}`);
    },
  });
}

// Delete a ticket allowance record (admin only)
export function useDeleteTicketAllowance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('ticket_allowance_records')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-allowance-reminders'] });
      queryClient.invalidateQueries({ queryKey: ['ticket-allowance-records'] });
      queryClient.invalidateQueries({ queryKey: ['approved-ticket-allowances'] });
      queryClient.invalidateQueries({ queryKey: ['employee-ticket-allowance'] });
      toast.success('Ticket allowance record deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete: ${error.message}`);
    },
  });
}

// Get count of past pending ticket allowances
export function usePastPendingCount() {
  return useQuery({
    queryKey: ['past-pending-ticket-count'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const { count, error } = await supabase
        .from('ticket_allowance_records')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')
        .lt('eligibility_start_date', today);

      if (error) throw error;
      return count || 0;
    },
  });
}
