import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface CompanyFolder {
  id: string;
  name: string;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CompanyFile {
  id: string;
  name: string;
  file_url: string;
  file_type: string;
  file_size: string | null;
  folder_id: string | null;
  created_at: string;
  updated_at: string;
}

export function useCompanyFolders() {
  return useQuery({
    queryKey: ['company-folders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('company_folders')
        .select('*')
        .order('name', { ascending: true });
      
      if (error) throw error;
      return data as CompanyFolder[];
    },
  });
}

export function useCompanyFiles(folderId: string | null) {
  return useQuery({
    queryKey: ['company-files', folderId],
    queryFn: async () => {
      let query = supabase
        .from('company_files')
        .select('*')
        .order('name', { ascending: true });
      
      if (folderId === null) {
        query = query.is('folder_id', null);
      } else {
        query = query.eq('folder_id', folderId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as CompanyFile[];
    },
  });
}

export function useSubFolders(parentId: string | null) {
  return useQuery({
    queryKey: ['company-subfolders', parentId],
    queryFn: async () => {
      let query = supabase
        .from('company_folders')
        .select('*')
        .order('name', { ascending: true });
      
      if (parentId === null) {
        query = query.is('parent_id', null);
      } else {
        query = query.eq('parent_id', parentId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as CompanyFolder[];
    },
  });
}

export function useCreateFolder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ name, parentId }: { name: string; parentId: string | null }) => {
      const { data, error } = await supabase
        .from('company_folders')
        .insert([{ name, parent_id: parentId }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-folders'] });
      queryClient.invalidateQueries({ queryKey: ['company-subfolders'] });
      toast.success('Folder created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create folder: ${error.message}`);
    },
  });
}

export function useRenameFolder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase
        .from('company_folders')
        .update({ name, updated_at: new Date().toISOString() })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-folders'] });
      queryClient.invalidateQueries({ queryKey: ['company-subfolders'] });
      toast.success('Folder renamed successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to rename folder: ${error.message}`);
    },
  });
}

export function useDeleteFolder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('company_folders')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-folders'] });
      queryClient.invalidateQueries({ queryKey: ['company-subfolders'] });
      toast.success('Folder deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete folder: ${error.message}`);
    },
  });
}

export function useMoveFolder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, parentId }: { id: string; parentId: string | null }) => {
      const { error } = await supabase
        .from('company_folders')
        .update({ parent_id: parentId, updated_at: new Date().toISOString() })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-folders'] });
      queryClient.invalidateQueries({ queryKey: ['company-subfolders'] });
      toast.success('Folder moved successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to move folder: ${error.message}`);
    },
  });
}

export function useUploadCompanyFile() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ file, folderId }: { file: File; folderId: string | null }) => {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${file.name}`;
      
      const { error: uploadError } = await supabase.storage
        .from('company-documents')
        .upload(fileName, file);
      
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage
        .from('company-documents')
        .getPublicUrl(fileName);
      
      const { data, error } = await supabase
        .from('company_files')
        .insert([{
          name: file.name,
          file_url: publicUrl,
          file_type: file.type || fileExt || 'unknown',
          file_size: formatFileSize(file.size),
          folder_id: folderId,
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-files'] });
      toast.success('File uploaded successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to upload file: ${error.message}`);
    },
  });
}

export function useRenameFile() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase
        .from('company_files')
        .update({ name, updated_at: new Date().toISOString() })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-files'] });
      toast.success('File renamed successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to rename file: ${error.message}`);
    },
  });
}

export function useDeleteFile() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, fileUrl }: { id: string; fileUrl: string }) => {
      // Extract file path from URL
      const urlParts = fileUrl.split('/company-documents/');
      if (urlParts.length > 1) {
        const filePath = urlParts[1];
        await supabase.storage.from('company-documents').remove([filePath]);
      }
      
      const { error } = await supabase
        .from('company_files')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-files'] });
      toast.success('File deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete file: ${error.message}`);
    },
  });
}

export function useMoveFile() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, folderId }: { id: string; folderId: string | null }) => {
      const { error } = await supabase
        .from('company_files')
        .update({ folder_id: folderId, updated_at: new Date().toISOString() })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-files'] });
      toast.success('File moved successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to move file: ${error.message}`);
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
