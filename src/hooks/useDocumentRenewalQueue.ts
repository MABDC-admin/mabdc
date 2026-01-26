import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { differenceInDays, parseISO } from 'date-fns';

export interface RenewalQueueItem {
  id: string;
  employee_id: string;
  employee_name: string;
  employee_photo: string | null;
  department: string;
  document_type: string;
  document_name: string;
  expiry_date: string;
  days_remaining: number;
  source: 'employee' | 'document' | 'contract';
  source_id: string;
  is_renewed?: boolean;
  renewed_document_id?: string | null;
}

export function useDocumentRenewalQueue(daysThreshold = 30) {
  return useQuery({
    queryKey: ['document-renewal-queue', daysThreshold],
    queryFn: async () => {
      const today = new Date();
      const items: RenewalQueueItem[] = [];
      
      // Fetch employees with their expiry dates
      const { data: employees, error: employeesError } = await supabase
        .from('employees')
        .select('id, full_name, photo_url, department, visa_expiration, emirates_id_expiry, passport_expiry')
        .eq('status', 'Active');
      
      if (employeesError) throw employeesError;
      
      // Fetch documents with expiry dates
      const { data: documents, error: documentsError } = await supabase
        .from('employee_documents')
        .select(`
          id,
          employee_id,
          name,
          category,
          expiry_date,
          is_renewed,
          renewed_document_id,
          employees!inner(full_name, photo_url, department, status)
        `)
        .not('expiry_date', 'is', null)
        .or('is_renewed.is.null,is_renewed.eq.false');
      
      if (documentsError) throw documentsError;
      
      // Fetch active contracts with end dates (only for active employees)
      const { data: contracts, error: contractsError } = await supabase
        .from('contracts')
        .select(`
          id,
          employee_id,
          end_date,
          contract_type,
          employees!inner(full_name, photo_url, department, status)
        `)
        .eq('status', 'Active')
        .eq('employees.status', 'Active')
        .not('end_date', 'is', null);
      
      if (contractsError) throw contractsError;
      
      // Process employee expiry dates (Visa, Emirates ID, Passport)
      employees?.forEach((emp) => {
        if (emp.visa_expiration) {
          const daysRemaining = differenceInDays(parseISO(emp.visa_expiration), today);
          if (daysRemaining <= daysThreshold && daysRemaining >= -30) {
            items.push({
              id: `visa-${emp.id}`,
              employee_id: emp.id,
              employee_name: emp.full_name,
              employee_photo: emp.photo_url,
              department: emp.department,
              document_type: 'Visa',
              document_name: 'UAE Visa',
              expiry_date: emp.visa_expiration,
              days_remaining: daysRemaining,
              source: 'employee',
              source_id: emp.id,
            });
          }
        }
        
        if (emp.emirates_id_expiry) {
          const daysRemaining = differenceInDays(parseISO(emp.emirates_id_expiry), today);
          if (daysRemaining <= daysThreshold && daysRemaining >= -30) {
            items.push({
              id: `eid-${emp.id}`,
              employee_id: emp.id,
              employee_name: emp.full_name,
              employee_photo: emp.photo_url,
              department: emp.department,
              document_type: 'Emirates ID',
              document_name: 'Emirates ID Card',
              expiry_date: emp.emirates_id_expiry,
              days_remaining: daysRemaining,
              source: 'employee',
              source_id: emp.id,
            });
          }
        }
        
        if (emp.passport_expiry) {
          const daysRemaining = differenceInDays(parseISO(emp.passport_expiry), today);
          if (daysRemaining <= daysThreshold && daysRemaining >= -30) {
            items.push({
              id: `passport-${emp.id}`,
              employee_id: emp.id,
              employee_name: emp.full_name,
              employee_photo: emp.photo_url,
              department: emp.department,
              document_type: 'Passport',
              document_name: 'Passport',
              expiry_date: emp.passport_expiry,
              days_remaining: daysRemaining,
              source: 'employee',
              source_id: emp.id,
            });
          }
        }
      });
      
      // Process uploaded documents with expiry dates
      documents?.forEach((doc: any) => {
        if (doc.employees?.status !== 'Active') return;
        const daysRemaining = differenceInDays(parseISO(doc.expiry_date), today);
        if (daysRemaining <= daysThreshold && daysRemaining >= -30) {
          items.push({
            id: doc.id,
            employee_id: doc.employee_id,
            employee_name: doc.employees.full_name,
            employee_photo: doc.employees.photo_url,
            department: doc.employees.department,
            document_type: doc.category || 'Document',
            document_name: doc.name,
            expiry_date: doc.expiry_date,
            days_remaining: daysRemaining,
            source: 'document',
            source_id: doc.id,
            is_renewed: doc.is_renewed || false,
            renewed_document_id: doc.renewed_document_id,
          });
        }
      });
      
      // Process contracts with end dates
      contracts?.forEach((contract: any) => {
        if (contract.employees?.status !== 'Active') return;
        const daysRemaining = differenceInDays(parseISO(contract.end_date), today);
        if (daysRemaining <= daysThreshold && daysRemaining >= -30) {
          items.push({
            id: `contract-${contract.id}`,
            employee_id: contract.employee_id,
            employee_name: contract.employees.full_name,
            employee_photo: contract.employees.photo_url,
            department: contract.employees.department,
            document_type: 'Contract',
            document_name: `${contract.contract_type} Contract`,
            expiry_date: contract.end_date,
            days_remaining: daysRemaining,
            source: 'contract',
            source_id: contract.id,
          });
        }
      });
      
      // Sort by urgency (soonest expiry first)
      items.sort((a, b) => a.days_remaining - b.days_remaining);
      
      return items;
    },
  });
}
