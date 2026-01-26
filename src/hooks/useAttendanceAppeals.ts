import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface AttendanceAppeal {
  id: string;
  attendance_id: string | null;
  employee_id: string;
  appeal_date: string;
  requested_check_in: string | null;
  requested_check_out: string | null;
  appeal_message: string;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  created_at: string;
}

export function useAttendanceAppeals() {
  return useQuery({
    queryKey: ['attendance_appeals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attendance_appeals')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as AttendanceAppeal[];
    },
  });
}

export function useEmployeeAppeals(employeeId: string) {
  return useQuery({
    queryKey: ['attendance_appeals', employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attendance_appeals')
        .select('*')
        .eq('employee_id', employeeId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as AttendanceAppeal[];
    },
    enabled: !!employeeId,
  });
}

export function useAddAttendanceAppeal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (appeal: Omit<AttendanceAppeal, 'id' | 'created_at' | 'status' | 'reviewed_by' | 'reviewed_at' | 'rejection_reason'>) => {
      const { data, error } = await supabase
        .from('attendance_appeals')
        .insert([{ ...appeal, status: 'Pending' }])
        .select()
        .single();
      if (error) throw error;
      
      // MANDATORY: Send email notification to HR about new appeal
      if (data?.id) {
        try {
          console.log('[APPEAL NOTIFICATION] Starting notification for appeal_id:', data.id);
          
          const { data: invokeData, error: notifyError } = await supabase.functions.invoke('send-appeal-request-notification', {
            body: { appeal_id: data.id }
          });
          
          if (notifyError) {
            console.error('[APPEAL NOTIFICATION] Edge function error:', notifyError);
          } else {
            console.log('[APPEAL NOTIFICATION] Success:', invokeData);
          }
        } catch (err) {
          console.error('[APPEAL NOTIFICATION] Exception caught:', err);
        }
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance_appeals'] });
      toast.success('Appeal submitted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to submit appeal: ${error.message}`);
    },
  });
}

export function useUpdateAttendanceAppeal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<AttendanceAppeal> & { id: string }) => {
      const { data, error } = await supabase
        .from('attendance_appeals')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['attendance_appeals'] });
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      
      // Send email notification to employee
      if (data.status === 'Approved' || data.status === 'Rejected') {
        supabase.functions.invoke('send-appeal-decision-notification', {
          body: {
            appeal_id: data.id,
            status: data.status,
            rejection_reason: data.rejection_reason
          }
        }).catch(err => console.error('Failed to send appeal notification:', err));
      }
    },
    onError: (error: Error) => {
      toast.error(`Failed to update appeal: ${error.message}`);
    },
  });
}

export function useDeleteAttendanceAppeal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('attendance_appeals')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance_appeals'] });
      toast.success('Appeal deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete appeal: ${error.message}`);
    },
  });
}
