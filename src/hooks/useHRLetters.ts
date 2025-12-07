import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface HRLetter {
  id: string;
  employee_id: string;
  title: string;
  letter_type: string;
  content: string | null;
  file_url: string | null;
  status: string;
  issued_date: string;
  created_at: string;
}

export function useEmployeeHRLetters(employeeId: string) {
  return useQuery({
    queryKey: ['hr-letters', employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hr_letters')
        .select('*')
        .eq('employee_id', employeeId)
        .order('issued_date', { ascending: false });
      
      if (error) throw error;
      return data as HRLetter[];
    },
    enabled: !!employeeId,
  });
}
