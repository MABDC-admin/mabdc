import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface DocumentType {
  id: string;
  name: string;
  name_arabic: string | null;
  requires_expiry: boolean;
  icon: string;
  is_system: boolean;
  is_active: boolean;
  created_at: string;
}

export function useDocumentTypes() {
  return useQuery({
    queryKey: ['document-types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('document_types')
        .select('*')
        .eq('is_active', true)
        .order('is_system', { ascending: false })
        .order('name', { ascending: true });
      
      if (error) throw error;
      return data as DocumentType[];
    },
  });
}

export function useAddDocumentType() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: { name: string; name_arabic?: string; requires_expiry?: boolean; icon?: string }) => {
      const { data: result, error } = await supabase
        .from('document_types')
        .insert([{
          name: data.name,
          name_arabic: data.name_arabic || null,
          requires_expiry: data.requires_expiry ?? true,
          icon: data.icon || 'file',
          is_system: false,
          is_active: true,
        }])
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-types'] });
      toast.success('Document type added successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to add document type: ${error.message}`);
    },
  });
}

export function useUpdateDocumentType() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; name?: string; name_arabic?: string; requires_expiry?: boolean; icon?: string }) => {
      const { error } = await supabase
        .from('document_types')
        .update(data)
        .eq('id', id)
        .eq('is_system', false); // Can only update non-system types
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-types'] });
      toast.success('Document type updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update document type: ${error.message}`);
    },
  });
}

export function useDeleteDocumentType() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('document_types')
        .update({ is_active: false })
        .eq('id', id)
        .eq('is_system', false); // Can only delete non-system types
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-types'] });
      toast.success('Document type deleted');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete document type: ${error.message}`);
    },
  });
}
