import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface EmployeeFaceData {
  id: string;
  employee_id: string;
  face_descriptor: number[];
  photo_url: string | null;
  created_at: string;
}

export function useEmployeeFaceData() {
  return useQuery({
    queryKey: ['employee-face-data'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_face_data')
        .select('*, employees(full_name, hrms_no, photo_url)');
      
      if (error) throw error;
      return data as (EmployeeFaceData & { employees: { full_name: string; hrms_no: string; photo_url: string | null } })[];
    },
  });
}

export function useEnrollFace() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      employeeId, 
      faceDescriptor, 
      photoUrl 
    }: { 
      employeeId: string; 
      faceDescriptor: number[]; 
      photoUrl?: string;
    }) => {
      // Check if employee already has face data
      const { data: existing } = await supabase
        .from('employee_face_data')
        .select('id')
        .eq('employee_id', employeeId)
        .single();
      
      if (existing) {
        // Update existing
        const { error } = await supabase
          .from('employee_face_data')
          .update({
            face_descriptor: faceDescriptor,
            photo_url: photoUrl,
          })
          .eq('employee_id', employeeId);
        
        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from('employee_face_data')
          .insert([{
            employee_id: employeeId,
            face_descriptor: faceDescriptor,
            photo_url: photoUrl,
          }]);
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-face-data'] });
      toast.success('Face enrolled successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to enroll face: ${error.message}`);
    },
  });
}

export function useDeleteFaceData() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (employeeId: string) => {
      const { error } = await supabase
        .from('employee_face_data')
        .delete()
        .eq('employee_id', employeeId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-face-data'] });
      toast.success('Face data deleted');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete face data: ${error.message}`);
    },
  });
}
