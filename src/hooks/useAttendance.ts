import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Attendance {
  id: string;
  employee_id: string;
  date: string;
  check_in?: string;
  check_out?: string;
  status: 'Present' | 'Absent' | 'Late' | 'Half Day';
  created_at?: string;
  employees?: {
    full_name: string;
  };
}

export function useAttendance() {
  return useQuery({
    queryKey: ['attendance'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attendance')
        .select(`
          *,
          employees (full_name)
        `)
        .order('date', { ascending: false });
      
      if (error) throw error;
      return data as Attendance[];
    },
  });
}

export function useAddAttendance() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (attendance: Omit<Attendance, 'id' | 'created_at' | 'employees'>) => {
      const { data, error } = await supabase
        .from('attendance')
        .insert([attendance])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      toast.success('Attendance recorded');
    },
    onError: (error: Error) => {
      toast.error(`Failed to record attendance: ${error.message}`);
    },
  });
}

export function useCheckIn() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (employeeId: string) => {
      const today = new Date().toISOString().split('T')[0];
      const now = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
      
      const { data, error } = await supabase
        .from('attendance')
        .insert([{
          employee_id: employeeId,
          date: today,
          check_in: now,
          status: 'Present'
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      toast.success('Checked in successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to check in: ${error.message}`);
    },
  });
}

export function useCheckOut() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (attendanceId: string) => {
      const now = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
      
      const { data, error } = await supabase
        .from('attendance')
        .update({ check_out: now })
        .eq('id', attendanceId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      toast.success('Checked out successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to check out: ${error.message}`);
    },
  });
}
