import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface EducationDocument {
  id: string;
  employee_id: string;
  name: string;
  file_url: string;
  file_type: string;
  file_size: string | null;
  category: string;
  created_at: string;
}

// Fetch education documents for an employee
export function useEducationDocuments(employeeId: string) {
  return useQuery({
    queryKey: ['education-documents', employeeId],
    queryFn: async () => {
      if (!employeeId) return [];
      
      const { data, error } = await supabase
        .from('employee_documents')
        .select('*')
        .eq('employee_id', employeeId)
        .in('category', ['Education', 'Resume', 'Certificate', 'Diploma', 'Transcript'])
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as EducationDocument[];
    },
    enabled: !!employeeId,
  });
}

// Bulk upload education documents
export function useBulkUploadEducationDocs() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ employeeId, files }: { employeeId: string; files: File[] }) => {
      const uploadedDocs: EducationDocument[] = [];
      const errors: string[] = [];
      
      for (const file of files) {
        try {
          // Validate file size (10MB max)
          if (file.size > 10 * 1024 * 1024) {
            errors.push(`${file.name}: File too large (max 10MB)`);
            continue;
          }
          
          // Validate file type
          const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
          if (!allowedTypes.includes(file.type)) {
            errors.push(`${file.name}: Invalid file type (PDF, JPG, PNG only)`);
            continue;
          }
          
          const timestamp = Date.now();
          const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
          const fileName = `${employeeId}/education/${timestamp}-${safeName}`;
          
          // Upload to storage
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('employee-documents')
            .upload(fileName, file, { upsert: true });
          
          if (uploadError) {
            errors.push(`${file.name}: Upload failed - ${uploadError.message}`);
            continue;
          }
          
          const { data: urlData } = supabase.storage
            .from('employee-documents')
            .getPublicUrl(uploadData.path);
          
          // Determine category based on filename
          const lowerName = file.name.toLowerCase();
          let category = 'Education';
          if (lowerName.includes('resume') || lowerName.includes('cv')) {
            category = 'Resume';
          } else if (lowerName.includes('diploma')) {
            category = 'Diploma';
          } else if (lowerName.includes('certificate') || lowerName.includes('cert')) {
            category = 'Certificate';
          } else if (lowerName.includes('transcript')) {
            category = 'Transcript';
          }
          
          // Create document record
          const { data, error } = await supabase
            .from('employee_documents')
            .insert({
              employee_id: employeeId,
              name: file.name,
              file_url: urlData.publicUrl,
              file_type: file.type,
              file_size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
              category,
            })
            .select()
            .single();
          
          if (error) {
            errors.push(`${file.name}: Database error - ${error.message}`);
            continue;
          }
          
          uploadedDocs.push(data as EducationDocument);
        } catch (err) {
          errors.push(`${file.name}: Unexpected error`);
        }
      }
      
      return { uploadedDocs, errors };
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['education-documents', variables.employeeId] });
      queryClient.invalidateQueries({ queryKey: ['employee-documents', variables.employeeId] });
      
      if (result.uploadedDocs.length > 0) {
        toast.success(`${result.uploadedDocs.length} document(s) uploaded successfully`);
      }
      if (result.errors.length > 0) {
        result.errors.forEach(err => toast.error(err));
      }
    },
    onError: (error: Error) => {
      toast.error(`Failed to upload: ${error.message}`);
    },
  });
}

// Delete education document
export function useDeleteEducationDoc() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, employeeId, fileUrl }: { id: string; employeeId: string; fileUrl: string }) => {
      // Extract file path from URL for storage deletion
      const urlParts = fileUrl.split('/employee-documents/');
      if (urlParts.length > 1) {
        const filePath = urlParts[1];
        await supabase.storage.from('employee-documents').remove([filePath]);
      }
      
      // Delete document record
      const { error } = await supabase
        .from('employee_documents')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return { id, employeeId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['education-documents', data.employeeId] });
      queryClient.invalidateQueries({ queryKey: ['employee-documents', data.employeeId] });
      toast.success('Document deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete: ${error.message}`);
    },
  });
}
