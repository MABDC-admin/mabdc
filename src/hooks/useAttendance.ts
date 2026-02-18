import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useEffect } from 'react';
import { 
  getEmployeeShiftTimes, 
  isWithinCheckInWindow, 
  formatShiftEndForDisplay,
  isLateForShift,
  isUndertimeForShift 
} from '@/utils/shiftValidation';

export interface Attendance {
  id: string;
  employee_id: string;
  date: string;
  check_in?: string;
  check_out?: string;
  status: string; // 'Present' | 'Absent' | 'Late' | 'Undertime' | 'Late | Undertime' | 'Half Day'
  employee_remarks?: string;
  admin_remarks?: string;
  modified_by?: string;
  modified_at?: string;
  created_at?: string;
  employees?: {
    full_name: string;
    hrms_no: string;
    photo_url?: string;
  };
}

export function useAttendance(options?: { refetchInterval?: number }) {
  return useQuery({
    queryKey: ['attendance'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attendance')
        .select(`
          *,
          employees (full_name, hrms_no, photo_url)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Attendance[];
    },
    refetchInterval: options?.refetchInterval,
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
          employees (full_name, hrms_no, photo_url)
        `)
        .eq('date', today)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Attendance[];
    },
  });
}

export function useAttendanceByDate(date: string) {
  return useQuery({
    queryKey: ['attendance', 'date', date],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attendance')
        .select(`
          *,
          employees (full_name, hrms_no, photo_url)
        `)
        .eq('date', date)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Attendance[];
    },
    enabled: !!date,
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

export function useUpdateAttendance() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: {
      id: string;
      check_in?: string;
      check_out?: string;
      status?: string;
      employee_remarks?: string;
      admin_remarks?: string;
    }) => {
      const { id, ...updateData } = data;
      
      const { data: result, error } = await supabase
        .from('attendance')
        .update({
          ...updateData,
          modified_at: new Date().toISOString(),
          modified_by: 'Admin',
        })
        .eq('id', id)
        .select(`*, employees (full_name, hrms_no)`)
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      toast.success('Attendance updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update attendance: ${error.message}`);
    },
  });
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
      
      // Run shift lookup and attendance check in parallel for better performance
      const [shiftTimes, existingResult] = await Promise.all([
        getEmployeeShiftTimes(employee.id, today),
        supabase
          .from('attendance')
          .select('id, check_out')
          .eq('employee_id', employee.id)
          .eq('date', today)
          .maybeSingle()
      ]);
      
      const existing = existingResult.data;
      
      // Validate check-in is within allowed window (before shift end time)
      if (!isWithinCheckInWindow(now, shiftTimes.end)) {
        const endTimeFormatted = formatShiftEndForDisplay(shiftTimes.end);
        throw new Error(
          `Check-in blocked: Your shift ended at ${endTimeFormatted}. ` +
          `Please contact HR if you need to record attendance for today.`
        );
      }
      
      if (existing) {
        if (!existing.check_out) {
          throw new Error(`${employee.full_name} already checked in today`);
        } else {
          throw new Error(`${employee.full_name} already checked out today`);
        }
      }
      
      // Late calculation based on employee's shift start time
      const isLate = isLateForShift(now, shiftTimes.start);
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
        employeeId: employee.id,
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
      const now = new Date();
      const checkOutTime = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
      
      // Run attendance lookup and shift times check in parallel for better performance
      const [attendanceResult, shiftTimes] = await Promise.all([
        supabase
          .from('attendance')
          .select('id, check_out, check_in, status')
          .eq('employee_id', employee.id)
          .eq('date', today)
          .maybeSingle(),
        getEmployeeShiftTimes(employee.id, today)
      ]);
      
      const { data: attendance, error: attError } = attendanceResult;
      if (attError) throw attError;
      
      // If already checked out, prevent double checkout
      if (attendance?.check_out) throw new Error(`${employee.full_name} already checked out`);
      
      // Check if undertime based on shift end time — use checkOutTime string for timezone safety
      const isUndertime = isUndertimeForShift(checkOutTime, shiftTimes.end);
      
      // If no attendance record exists (no check-in), create one with miss_punch_in status
      if (!attendance) {
        const status = isUndertime ? 'Miss Punch In | Undertime' : 'Miss Punch In';
        
        const { data, error } = await supabase
          .from('attendance')
          .insert([{
            employee_id: employee.id,
            date: today,
            check_in: null,
            check_out: checkOutTime,
            status
          }])
          .select()
          .single();
        
        if (error) throw error;
        return { 
          ...data, 
          employeeName: employee.full_name,
          employeePhoto: employee.photo_url,
          department: employee.department,
          jobPosition: employee.job_position,
          checkInTime: null,
          checkOutTime,
          status,
          isUndertime,
          isMissPunch: true,
          shiftEndTime: shiftTimes.end,
        };
      }
      
      // Normal checkout - has check-in record
      const wasLate = String(attendance.status).includes('Late');
      
      // Determine combined status
      let newStatus = attendance.status;
      if (isUndertime && wasLate) {
        newStatus = 'Late | Undertime';
      } else if (isUndertime) {
        newStatus = 'Undertime';
      }
      
      const { data, error } = await supabase
        .from('attendance')
        .update({ 
          check_out: checkOutTime,
          status: newStatus
        })
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
        status: newStatus,
        shiftEndTime: shiftTimes.end,
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

export function useCheckInById() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (employeeId: string) => {
      // Get employee details
      const { data: employee, error: empError } = await supabase
        .from('employees')
        .select('id, full_name, photo_url, department, job_position, hrms_no')
        .eq('id', employeeId)
        .single();
      
      if (empError) throw empError;
      if (!employee) throw new Error('Employee not found');
      
      const today = new Date().toISOString().split('T')[0];
      const now = new Date();
      const checkInTime = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
      
      // Get employee's assigned shift times
      const shiftTimes = await getEmployeeShiftTimes(employee.id, today);
      
      // Validate check-in is within allowed window (before shift end time)
      if (!isWithinCheckInWindow(now, shiftTimes.end)) {
        const endTimeFormatted = formatShiftEndForDisplay(shiftTimes.end);
        throw new Error(
          `Check-in blocked: Your shift ended at ${endTimeFormatted}. ` +
          `Please contact HR if you need to record attendance for today.`
        );
      }
      
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
      
      // Late calculation based on employee's shift start time
      const isLate = isLateForShift(now, shiftTimes.start);
      const status = isLate ? 'Late' : 'Present';
      
      const { data, error } = await supabase
        .from('attendance')
        .insert([{
          employee_id: employee.id,
          date: today,
          check_in: checkInTime,
          status
        }])
        .select()
        .single();
      
      if (error) throw error;
      return { 
        ...data, 
        employeeId: employee.id,
        employeeName: employee.full_name, 
        employeePhoto: employee.photo_url,
        department: employee.department,
        jobPosition: employee.job_position,
        hrmsNo: employee.hrms_no,
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

export function useCheckOutById() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (employeeId: string) => {
      // Get employee details
      const { data: employee, error: empError } = await supabase
        .from('employees')
        .select('id, full_name, photo_url, department, job_position')
        .eq('id', employeeId)
        .single();
      
      if (empError) throw empError;
      if (!employee) throw new Error('Employee not found');
      
      const today = new Date().toISOString().split('T')[0];
      const now = new Date();
      const checkOutTime = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
      
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
      
      // Get employee's shift end time for today and check if undertime — use string for timezone safety
      const shiftTimes = await getEmployeeShiftTimes(employee.id, today);
      const isUndertime = isUndertimeForShift(checkOutTime, shiftTimes.end);
      const wasLate = String(attendance.status).includes('Late');
      
      // Determine combined status
      let newStatus = attendance.status;
      if (isUndertime && wasLate) {
        newStatus = 'Late | Undertime';
      } else if (isUndertime) {
        newStatus = 'Undertime';
      }
      
      const { data, error } = await supabase
        .from('attendance')
        .update({ 
          check_out: checkOutTime,
          status: newStatus
        })
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
        status: newStatus,
        shiftEndTime: shiftTimes.end,
      };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      const undertimeText = data.status?.includes('Undertime') ? ' (Undertime)' : '';
      toast.success(`${data.employeeName} checked out successfully${undertimeText}`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteAttendance() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('attendance')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      toast.success('Attendance record deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete attendance: ${error.message}`);
    },
  });
}

export function useCreateAttendance() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: {
      employee_id: string;
      date: string;
      check_in?: string | null;
      check_out?: string | null;
      status?: string;
      admin_remarks?: string;
    }) => {
      const { data: result, error } = await supabase
        .from('attendance')
        .insert([{
          employee_id: data.employee_id,
          date: data.date,
          check_in: data.check_in || null,
          check_out: data.check_out || null,
          status: data.status || 'Present',
          admin_remarks: data.admin_remarks || null,
        }])
        .select(`*, employees (full_name, hrms_no, photo_url)`)
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to create attendance: ${error.message}`);
    },
  });
}

export function useEmployeeMonthlyLates(employeeId: string) {
  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
  
  return useQuery({
    queryKey: ['attendance', 'monthly-lates', employeeId, currentMonth],
    queryFn: async () => {
      const startOfMonth = `${currentMonth}-01`;
      const endOfMonth = new Date(new Date(startOfMonth).getFullYear(), new Date(startOfMonth).getMonth() + 1, 0).toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('attendance')
        .select('id')
        .eq('employee_id', employeeId)
        .eq('status', 'Late')
        .gte('date', startOfMonth)
        .lte('date', endOfMonth);
      
      if (error) throw error;
      return data?.length || 0;
    },
    enabled: !!employeeId,
  });
}
