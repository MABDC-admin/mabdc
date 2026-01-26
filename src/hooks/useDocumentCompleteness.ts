import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMemo } from 'react';

// The 7 required document categories (Contract is checked separately via contracts table)
const REQUIRED_CATEGORIES = [
  'Emirates ID',
  'Visa',
  'Passport',
  'Contract',
  'Work Permit',
  'Medical Insurance',
  'ILOE', // Involuntary Loss of Employment
] as const;

export interface DocumentCompleteness {
  isComplete: boolean;
  uploadedCount: number;
  totalRequired: number;
  missingCategories: string[];
  uploadedCategories: string[];
}

interface Contract {
  id: string;
  employee_id: string;
  status: string;
}

export function useDocumentCompleteness() {
  // Fetch all active (non-renewed) documents for all employees
  const { data: allDocuments = [], isLoading: docsLoading } = useQuery({
    queryKey: ['all-documents-completeness'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_documents')
        .select('id, employee_id, category')
        .or('is_renewed.is.null,is_renewed.eq.false');
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch all active contracts to check "Contract" completeness
  const { data: activeContracts = [], isLoading: contractsLoading } = useQuery({
    queryKey: ['contracts-for-completeness'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contracts')
        .select('id, employee_id, status')
        .eq('status', 'Active');
      
      if (error) throw error;
      return data as Contract[];
    },
  });

  const isLoading = docsLoading || contractsLoading;

  // Calculate completeness per employee
  const completenessMap = useMemo(() => {
    const map: Record<string, DocumentCompleteness> = {};
    
    // Group documents by employee
    const docsByEmployee: Record<string, Set<string>> = {};
    
    allDocuments.forEach(doc => {
      if (!docsByEmployee[doc.employee_id]) {
        docsByEmployee[doc.employee_id] = new Set();
      }
      
      // Normalize category for matching
      const category = doc.category?.trim();
      if (category) {
        // Match against required categories (case-insensitive)
        const matchedCategory = REQUIRED_CATEGORIES.find(
          req => req.toLowerCase() === category.toLowerCase()
        );
        if (matchedCategory) {
          docsByEmployee[doc.employee_id].add(matchedCategory);
        }
      }
    });
    
    // Mark "Contract" as complete for employees with active contracts
    activeContracts.forEach(contract => {
      if (!docsByEmployee[contract.employee_id]) {
        docsByEmployee[contract.employee_id] = new Set();
      }
      docsByEmployee[contract.employee_id].add('Contract');
    });
    
    // Calculate completeness for each employee
    Object.entries(docsByEmployee).forEach(([employeeId, categories]) => {
      const uploadedCategories = Array.from(categories);
      const missingCategories = REQUIRED_CATEGORIES.filter(
        req => !categories.has(req)
      );
      
      map[employeeId] = {
        isComplete: missingCategories.length === 0,
        uploadedCount: uploadedCategories.length,
        totalRequired: REQUIRED_CATEGORIES.length,
        missingCategories,
        uploadedCategories,
      };
    });
    
    return map;
  }, [allDocuments, activeContracts]);

  // Helper to get completeness for a specific employee
  const getCompleteness = (employeeId: string): DocumentCompleteness => {
    return completenessMap[employeeId] || {
      isComplete: false,
      uploadedCount: 0,
      totalRequired: REQUIRED_CATEGORIES.length,
      missingCategories: [...REQUIRED_CATEGORIES],
      uploadedCategories: [],
    };
  };

  return {
    completenessMap,
    getCompleteness,
    isLoading,
    requiredCategories: REQUIRED_CATEGORIES,
  };
}
