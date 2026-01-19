import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMemo } from 'react';

// The 7 required document categories
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

export function useDocumentCompleteness() {
  // Fetch all active (non-renewed) documents for all employees
  const { data: allDocuments = [], isLoading } = useQuery({
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
  }, [allDocuments]);

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
