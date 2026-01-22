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
  is_renewed: boolean | null;
  renewed_at: string | null;
  renewed_document_id: string | null;
  employees?: {
    full_name: string;
    hrms_no: string;
  };
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
    mutationFn: async ({ id, employeeId, fileUrl, reason }: { id: string; employeeId: string; fileUrl: string; reason?: string }) => {
      // Get document for approval email
      const { data: doc, error: fetchError } = await supabase
        .from('employee_documents')
        .select('*, employees(full_name, hrms_no)')
        .eq('id', id)
        .single();
      
      if (fetchError) throw fetchError;
      
      // Send deletion request for approval
      const { error } = await supabase.functions.invoke('send-deletion-approval', {
        body: {
          recordType: 'document',
          recordId: id,
          recordData: { ...doc, file_url: fileUrl },
          reason,
        },
      });
      
      if (error) throw new Error(error.message || 'Failed to request deletion approval');
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['employee-documents', variables.employeeId] });
      queryClient.invalidateQueries({ queryKey: ['pending-deletions'] });
      toast.info('Deletion request sent for approval');
    },
    onError: (error: Error) => {
      toast.error(`Failed to request deletion: ${error.message}`);
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

// Fetch all documents for admin view with employee info
export function useAllDocuments() {
  return useQuery({
    queryKey: ['all-documents'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_documents')
        .select(`
          *,
          employees (full_name, hrms_no)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as EmployeeDocument[];
    },
  });
}

// Rename a single document
export function useRenameDocument() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, newName, employeeId }: { id: string; newName: string; employeeId: string }) => {
      const { data, error } = await supabase
        .from('employee_documents')
        .update({ name: newName })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['employee-documents', variables.employeeId] });
      queryClient.invalidateQueries({ queryKey: ['all-documents'] });
      toast.success('Document renamed successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to rename document: ${error.message}`);
    },
  });
}

// AI-powered batch rename for existing documents
export function useAIBatchRename() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (documentIds: string[]) => {
      const results: { id: string; oldName: string; newName: string; success: boolean; error?: string }[] = [];
      
      for (const docId of documentIds) {
        try {
          // Fetch document with employee info
          const { data: doc, error: fetchError } = await supabase
            .from('employee_documents')
            .select(`
              *,
              employees (full_name, hrms_no)
            `)
            .eq('id', docId)
            .single();
          
          if (fetchError || !doc) {
            results.push({ id: docId, oldName: '', newName: '', success: false, error: 'Document not found' });
            continue;
          }
          
          // Check if it's an image file that can be analyzed
          const isImage = doc.file_url && /\.(jpg|jpeg|png|gif|webp)$/i.test(doc.file_url);
          
          if (!isImage) {
            results.push({ id: docId, oldName: doc.name, newName: doc.name, success: false, error: 'Only image files can be analyzed' });
            continue;
          }
          
          // Fetch the image and convert to base64
          const response = await fetch(doc.file_url);
          const blob = await response.blob();
          const base64 = await blobToBase64(blob);
          
          // Call AI to analyze the document
          const { data: aiResult, error: aiError } = await supabase.functions.invoke('ai-document-reader', {
            body: {
              fileBase64: base64,
              fileType: doc.file_type,
              fileName: doc.name,
            },
          });
          
          if (aiError || !aiResult?.success) {
            results.push({ id: docId, oldName: doc.name, newName: doc.name, success: false, error: aiError?.message || 'AI analysis failed' });
            continue;
          }
          
          // Generate smart filename
          const employeeName = doc.employees?.full_name || 'Unknown';
          const fileExt = doc.file_url.split('.').pop() || 'jpg';
          const extractedData = aiResult.extractedData;
          
          const docType = extractedData.documentType
            .replace(/\s+/g, '_')
            .replace(/[^a-zA-Z0-9_]/g, '');
          
          const cleanName = employeeName
            .split(' ')
            .slice(0, 2)
            .map((part: string) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
            .join('_')
            .replace(/[^a-zA-Z_]/g, '');
          
          const year = extractedData.expiryDate 
            ? extractedData.expiryDate.split('-')[0] 
            : new Date().getFullYear().toString();
          
          const docNumSuffix = extractedData.documentNumber 
            ? '_' + extractedData.documentNumber.slice(-4).replace(/[^a-zA-Z0-9]/g, '')
            : '';
          
          const newName = `${docType}_${cleanName}_${year}${docNumSuffix}.${fileExt}`;
          
          // Update document name and category
          const { error: updateError } = await supabase
            .from('employee_documents')
            .update({ 
              name: newName,
              category: extractedData.documentType,
              expiry_date: extractedData.expiryDate || doc.expiry_date,
            })
            .eq('id', docId);
          
          if (updateError) {
            results.push({ id: docId, oldName: doc.name, newName: newName, success: false, error: updateError.message });
          } else {
            results.push({ id: docId, oldName: doc.name, newName: newName, success: true });
          }
        } catch (err) {
          results.push({ id: docId, oldName: '', newName: '', success: false, error: err instanceof Error ? err.message : 'Unknown error' });
        }
      }
      
      return results;
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: ['all-documents'] });
      queryClient.invalidateQueries({ queryKey: ['employee-documents'] });
      
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;
      
      if (successful > 0 && failed === 0) {
        toast.success(`Successfully renamed ${successful} document(s)`);
      } else if (successful > 0 && failed > 0) {
        toast.warning(`Renamed ${successful} document(s), ${failed} failed`);
      } else {
        toast.error(`Failed to rename documents`);
      }
    },
    onError: (error: Error) => {
      toast.error(`Batch rename failed: ${error.message}`);
    },
  });
}

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
