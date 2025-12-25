import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface EmployeeDocument {
  id: string;
  employee_id: string;
  name: string;
  file_type: string;
  file_url: string;
  file_size: string | null;
  category: string | null;
  expiry_date: string | null;
  document_type_id: string | null;
  created_at: string;
}

export function useEmployeeDocuments(employeeId: string) {
  return useQuery({
    queryKey: ['employee-documents', employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_documents')
        .select('*')
        .eq('employee_id', employeeId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as EmployeeDocument[];
    },
    enabled: !!employeeId,
  });
}

export function useUploadDocument() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      file, 
      employeeId, 
      category = 'Other',
      expiryDate,
    }: { 
      file: File; 
      employeeId: string; 
      category?: string;
      expiryDate?: string;
    }) => {
      // Upload file to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${employeeId}/${Date.now()}-${file.name}`;
      
      const { error: uploadError } = await supabase.storage
        .from('employee-documents')
        .upload(fileName, file);
      
      if (uploadError) throw uploadError;
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('employee-documents')
        .getPublicUrl(fileName);
      
      // Save document record
      const { data, error } = await supabase
        .from('employee_documents')
        .insert([{
          employee_id: employeeId,
          name: file.name,
          file_type: file.type || fileExt || 'unknown',
          file_url: publicUrl,
          file_size: formatFileSize(file.size),
          category,
          expiry_date: expiryDate || null,
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['employee-documents', variables.employeeId] });
      toast.success('Document uploaded successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to upload document: ${error.message}`);
    },
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, employeeId, fileUrl }: { id: string; employeeId: string; fileUrl: string }) => {
      // Extract file path from URL
      const urlParts = fileUrl.split('/employee-documents/');
      if (urlParts.length > 1) {
        const filePath = urlParts[1];
        await supabase.storage.from('employee-documents').remove([filePath]);
      }
      
      const { error } = await supabase
        .from('employee_documents')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['employee-documents', variables.employeeId] });
      toast.success('Document deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete document: ${error.message}`);
    },
  });
}

export function useUploadEmployeePhoto() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ file, employeeId }: { file: File; employeeId: string }) => {
      const fileExt = file.name.split('.').pop();
      const fileName = `photos/${employeeId}.${fileExt}`;
      
      // Upload photo
      const { error: uploadError } = await supabase.storage
        .from('employee-documents')
        .upload(fileName, file, { upsert: true });
      
      if (uploadError) throw uploadError;
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('employee-documents')
        .getPublicUrl(fileName);
      
      // Update employee record
      const { error } = await supabase
        .from('employees')
        .update({ photo_url: publicUrl })
        .eq('id', employeeId);
      
      if (error) throw error;
      return publicUrl;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success('Photo updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to upload photo: ${error.message}`);
    },
  });
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function useRenewDocument() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      oldDocumentId, 
      newDocument 
    }: { 
      oldDocumentId: string; 
      newDocument: {
        employee_id: string;
        name: string;
        file_type: string;
        file_url: string;
        file_size?: string;
        expiry_date?: string;
        document_type_id?: string;
        category?: string;
      }
    }) => {
      // Create new document with reference to old one
      const { data: newDoc, error: insertError } = await supabase
        .from('employee_documents')
        .insert([{
          ...newDocument,
          previous_document_id: oldDocumentId,
        }])
        .select()
        .single();
      
      if (insertError) throw insertError;

      // Mark old document as renewed
      const { error: updateError } = await supabase
        .from('employee_documents')
        .update({ 
          is_renewed: true, 
          renewed_at: new Date().toISOString(),
          renewed_document_id: newDoc.id,
        })
        .eq('id', oldDocumentId);
      
      if (updateError) throw updateError;
      
      return newDoc;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['employee-documents', variables.newDocument.employee_id] });
      queryClient.invalidateQueries({ queryKey: ['document-renewal-queue'] });
      toast.success('Document renewed successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to renew document: ${error.message}`);
    },
  });
}
