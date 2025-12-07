import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useEffect } from 'react';

export interface Attendance {
  id: string;
  employee_id: string;
  date: string;
  check_in?: string;
  check_out?: string;
  status: 'Present' | 'Absent' | 'Late' | 'Half Day';
  created_at?: string;
  employees?: {
    full_name: string;
    hrms_no: string;
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
          employees (full_name, hrms_no)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Attendance[];
    },
  });
}

export function useTodayAttendance() {
  const today = new Date().toISOString().split('T')[0];
  
  return useQuery({
    queryKey: ['attendance', 'today'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attendance')
        .select(`
          *,
          employees (full_name, hrms_no)
        `)
        .eq('date', today)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Attendance[];
    },
  });
}

export function useRealtimeAttendance() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('attendance-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'attendance'
        },
        (payload) => {
          console.log('Realtime attendance update:', payload);
          queryClient.invalidateQueries({ queryKey: ['attendance'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}

export function useCheckInByHRMS() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (hrmsNo: string) => {
      // First find the employee by HRMS number
      const { data: employee, error: empError } = await supabase
        .from('employees')
        .select('id, full_name, photo_url, department, job_position')
        .eq('hrms_no', hrmsNo)
        .maybeSingle();
      
      if (empError) throw empError;
      if (!employee) throw new Error(`Employee not found: ${hrmsNo}`);
      
      const today = new Date().toISOString().split('T')[0];
      const now = new Date();
      const checkInTime = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
      
      // Check if already checked in today
      const { data: existing } = await supabase
        .from('attendance')
        .select('id, check_out')
        .eq('employee_id', employee.id)
        .eq('date', today)
        .maybeSingle();
      
      if (existing) {
        if (!existing.check_out) {
          throw new Error(`${employee.full_name} already checked in today`);
        } else {
          throw new Error(`${employee.full_name} already checked out today`);
        }
      }
      
      // Work hours: 8:00 AM to 5:00 PM, Monday to Friday
      // Late if check-in after 8:00 AM
      const hour = now.getHours();
      const minutes = now.getMinutes();
      const isLate = hour > 8 || (hour === 8 && minutes > 0);
      const status = isLate ? 'Late' : 'Present';
      
      const { data, error } = await supabase
        .from('attendance')
        .insert([{
          employee_id: employee.id,
          date: today,
          check_in: checkInTime,
          status
        }])
        .select(`*, employees (full_name, hrms_no, photo_url)`)
        .single();
      
      if (error) throw error;
      return { 
        ...data, 
        employeeName: employee.full_name, 
        employeePhoto: employee.photo_url,
        department: employee.department,
        jobPosition: employee.job_position,
        status,
        checkInTime
      };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      const statusText = data.status === 'Late' ? '(Late)' : '';
      toast.success(`${data.employeeName} checked in successfully ${statusText}`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useCheckOutByHRMS() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (hrmsNo: string) => {
      // First find the employee by HRMS number
      const { data: employee, error: empError } = await supabase
        .from('employees')
        .select('id, full_name, photo_url, department, job_position')
        .eq('hrms_no', hrmsNo)
        .maybeSingle();
      
      if (empError) throw empError;
      if (!employee) throw new Error(`Employee not found: ${hrmsNo}`);
      
      const today = new Date().toISOString().split('T')[0];
      const checkOutTime = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
      
      // Find today's attendance record
      const { data: attendance, error: attError } = await supabase
        .from('attendance')
        .select('id, check_out, check_in, status')
        .eq('employee_id', employee.id)
        .eq('date', today)
        .maybeSingle();
      
      if (attError) throw attError;
      if (!attendance) throw new Error(`${employee.full_name} hasn't checked in today`);
      if (attendance.check_out) throw new Error(`${employee.full_name} already checked out`);
      
      const { data, error } = await supabase
        .from('attendance')
        .update({ check_out: checkOutTime })
        .eq('id', attendance.id)
        .select()
        .single();
      
      if (error) throw error;
      return { 
        ...data, 
        employeeName: employee.full_name,
        employeePhoto: employee.photo_url,
        department: employee.department,
        jobPosition: employee.job_position,
        checkInTime: attendance.check_in,
        checkOutTime,
        status: attendance.status
      };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      toast.success(`${data.employeeName} checked out successfully`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
