import { supabase } from '@/integrations/supabase/client';

/**
 * Archives all previous active contracts for an employee when a new contract is uploaded.
 * - Contracts past their end_date are marked as 'Expired'
 * - Contracts still valid are marked as 'Archived' (superseded by new contract)
 * 
 * @param employeeId - The employee's UUID
 * @param excludeContractId - Optional contract ID to exclude from archiving (the new contract)
 * @returns Number of contracts archived
 */
export async function archivePreviousContracts(
  employeeId: string, 
  excludeContractId?: string
): Promise<number> {
  const today = new Date().toISOString().split('T')[0];
  
  // Fetch all active contracts for this employee
  let query = supabase
    .from('contracts')
    .select('id, end_date')
    .eq('employee_id', employeeId)
    .eq('status', 'Active');
  
  if (excludeContractId) {
    query = query.neq('id', excludeContractId);
  }
  
  const { data: existingContracts, error: fetchError } = await query;
  
  if (fetchError) {
    console.error('Error fetching contracts to archive:', fetchError);
    return 0;
  }
  
  if (!existingContracts?.length) return 0;
  
  // Separate expired vs archived based on end_date
  const expiredIds = existingContracts
    .filter(c => c.end_date && c.end_date <= today)
    .map(c => c.id);
  
  const archivedIds = existingContracts
    .filter(c => !c.end_date || c.end_date > today)
    .map(c => c.id);
  
  let totalArchived = 0;
  
  // Mark expired contracts
  if (expiredIds.length > 0) {
    const { error: expireError } = await supabase
      .from('contracts')
      .update({ status: 'Expired', updated_at: new Date().toISOString() })
      .in('id', expiredIds);
    
    if (!expireError) {
      totalArchived += expiredIds.length;
    } else {
      console.error('Error marking contracts as expired:', expireError);
    }
  }
  
  // Mark archived (superseded) contracts
  if (archivedIds.length > 0) {
    const { error: archiveError } = await supabase
      .from('contracts')
      .update({ status: 'Archived', updated_at: new Date().toISOString() })
      .in('id', archivedIds);
    
    if (!archiveError) {
      totalArchived += archivedIds.length;
    } else {
      console.error('Error marking contracts as archived:', archiveError);
    }
  }
  
  return totalArchived;
}

/**
 * Gets the newest active contract for an employee.
 * Sorts by end_date DESC (null = unlimited = highest priority), then by created_at DESC.
 */
export function getNewestActiveContract<T extends { 
  employee_id: string; 
  status?: string | null; 
  end_date?: string | null; 
  created_at?: string | null;
}>(contracts: T[], employeeId: string): T | undefined {
  return contracts
    .filter(c => c.employee_id === employeeId && c.status === 'Active')
    .sort((a, b) => {
      // Unlimited contracts (no end_date) come first
      const dateA = a.end_date ? new Date(a.end_date).getTime() : Infinity;
      const dateB = b.end_date ? new Date(b.end_date).getTime() : Infinity;
      
      if (dateB !== dateA) return dateB - dateA; // Latest expiry first
      
      // If same end_date, sort by created_at (newest first)
      const createdA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const createdB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return createdB - createdA;
    })[0];
}
