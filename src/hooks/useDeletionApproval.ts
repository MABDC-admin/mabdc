import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface PendingDeletion {
  id: string;
  record_type: string;
  record_id: string;
  record_data: Record<string, unknown>;
  requested_by: string | null;
  requested_by_email: string | null;
  requested_at: string;
  reason: string | null;
  status: 'pending' | 'approved' | 'rejected';
  processed_at: string | null;
  processed_by: string | null;
}

export type DeletableRecordType = 
  | 'employee' 
  | 'payroll' 
  | 'attendance' 
  | 'leave' 
  | 'contract' 
  | 'document' 
  | 'ticket_allowance'
  | 'discipline'
  | 'performance'
  | 'corrective_action';

interface RequestDeletionParams {
  recordType: DeletableRecordType;
  recordId: string;
  recordData: Record<string, unknown>;
  reason?: string;
}

export function useRequestDeletionApproval() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ recordType, recordId, recordData, reason }: RequestDeletionParams) => {
      console.log(`Requesting deletion approval for ${recordType}:`, recordId);
      
      const { data, error } = await supabase.functions.invoke('send-deletion-approval', {
        body: {
          recordType,
          recordId,
          recordData,
          reason,
        },
      });

      if (error) {
        console.error('Error requesting deletion approval:', error);
        throw new Error(error.message || 'Failed to request deletion approval');
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-deletions'] });
      toast.success('Deletion request sent for approval', {
        description: 'An email has been sent to the administrator for approval.',
      });
    },
    onError: (error: Error) => {
      toast.error(`Failed to request deletion: ${error.message}`);
    },
  });
}

export function usePendingDeletions(status?: 'pending' | 'approved' | 'rejected') {
  return useQuery({
    queryKey: ['pending-deletions', status],
    queryFn: async () => {
      let query = supabase
        .from('pending_deletions')
        .select('*')
        .order('requested_at', { ascending: false });
      
      if (status) {
        query = query.eq('status', status);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as PendingDeletion[];
    },
  });
}

export function usePendingDeletionCount() {
  return useQuery({
    queryKey: ['pending-deletions-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('pending_deletions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');
      
      if (error) throw error;
      return count || 0;
    },
  });
}
