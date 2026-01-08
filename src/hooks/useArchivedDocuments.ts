import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ArchivedDocument {
  id: string;
  employee_id: string;
  employee_name: string;
  employee_photo: string | null;
  department: string;
  name: string;
  category: string;
  file_url: string;
  expiry_date: string | null;
  renewed_at: string;
  renewed_document_id: string | null;
  // Version chain info
  new_document?: {
    id: string;
    name: string;
    expiry_date: string | null;
    file_url: string;
  } | null;
}

export interface ArchivedContract {
  id: string;
  employee_id: string;
  employee_name: string;
  employee_photo: string | null;
  department: string;
  mohre_contract_no: string;
  contract_type: string;
  start_date: string;
  end_date: string | null;
  status: string;
  notes: string | null;
  page1_url: string | null;
  page2_url: string | null;
}

export function useArchivedDocuments() {
  return useQuery({
    queryKey: ['archived-documents'],
    queryFn: async () => {
      // Fetch documents that have been renewed
      const { data: documents, error: docsError } = await supabase
        .from('employee_documents')
        .select(`
          id,
          employee_id,
          name,
          category,
          file_url,
          expiry_date,
          renewed_at,
          renewed_document_id,
          employees!inner(full_name, photo_url, department)
        `)
        .eq('is_renewed', true)
        .order('renewed_at', { ascending: false });

      if (docsError) throw docsError;

      // Get the new document info for each archived document
      const archivedDocs: ArchivedDocument[] = [];

      for (const doc of documents || []) {
        let newDocument = null;

        if (doc.renewed_document_id) {
          const { data: newDoc } = await supabase
            .from('employee_documents')
            .select('id, name, expiry_date, file_url')
            .eq('id', doc.renewed_document_id)
            .single();

          if (newDoc) {
            newDocument = newDoc;
          }
        }

        archivedDocs.push({
          id: doc.id,
          employee_id: doc.employee_id,
          employee_name: (doc.employees as any).full_name,
          employee_photo: (doc.employees as any).photo_url,
          department: (doc.employees as any).department,
          name: doc.name,
          category: doc.category || 'Document',
          file_url: doc.file_url,
          expiry_date: doc.expiry_date,
          renewed_at: doc.renewed_at!,
          renewed_document_id: doc.renewed_document_id,
          new_document: newDocument,
        });
      }

      return archivedDocs;
    },
  });
}

export function useArchivedContracts() {
  return useQuery({
    queryKey: ['archived-contracts'],
    queryFn: async () => {
      const { data: contracts, error } = await supabase
        .from('contracts')
        .select(`
          id,
          employee_id,
          mohre_contract_no,
          contract_type,
          start_date,
          end_date,
          status,
          notes,
          page1_url,
          page2_url,
          employees!inner(full_name, photo_url, department)
        `)
        .in('status', ['Expired', 'Terminated'])
        .order('updated_at', { ascending: false });

      if (error) throw error;

      const archivedContracts: ArchivedContract[] = (contracts || []).map((contract: any) => ({
        id: contract.id,
        employee_id: contract.employee_id,
        employee_name: contract.employees.full_name,
        employee_photo: contract.employees.photo_url,
        department: contract.employees.department,
        mohre_contract_no: contract.mohre_contract_no,
        contract_type: contract.contract_type,
        start_date: contract.start_date,
        end_date: contract.end_date,
        status: contract.status,
        notes: contract.notes,
        page1_url: contract.page1_url,
        page2_url: contract.page2_url,
      }));

      return archivedContracts;
    },
  });
}
