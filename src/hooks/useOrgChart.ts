import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface OrgChartPosition {
  id: string;
  title: string;
  holder_name: string | null;
  employee_id: string | null;
  parent_id: string | null;
  sort_order: number;
  level: number;
  created_at?: string;
  updated_at?: string;
  employees?: {
    full_name: string;
    photo_url: string | null;
    job_position: string;
  } | null;
}

export function useOrgChart() {
  return useQuery({
    queryKey: ['org-chart'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('org_chart_positions')
        .select(`
          *,
          employees (full_name, photo_url, job_position)
        `)
        .order('level', { ascending: true })
        .order('sort_order', { ascending: true });
      
      if (error) throw error;
      return data as OrgChartPosition[];
    },
  });
}

export function useUpdateOrgPosition() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<OrgChartPosition> & { id: string }) => {
      const { data, error } = await supabase
        .from('org_chart_positions')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-chart'] });
    },
    onError: (error) => {
      toast.error('Failed to update position');
      console.error(error);
    },
  });
}

export function useAddOrgPosition() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (position: Omit<OrgChartPosition, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('org_chart_positions')
        .insert(position)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-chart'] });
      toast.success('Position added');
    },
    onError: (error) => {
      toast.error('Failed to add position');
      console.error(error);
    },
  });
}

export function useDeleteOrgPosition() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('org_chart_positions')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-chart'] });
      toast.success('Position deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete position');
      console.error(error);
    },
  });
}
