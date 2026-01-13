import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { extractPdfPagesAsImages, isPdfFile, PdfPageImages } from '@/utils/pdfToImages';
import { ExtractedData, MatchedEmployee, AIExtractionResult, ContractPageImages, generateSmartFilename } from './useSmartDocumentUpload';
import { parseISO, isBefore, startOfDay } from 'date-fns';

export type BulkValidationStatus = 'valid' | 'expired' | 'no_match' | 'error';

export interface BulkDocumentItem {
  id: string;
  file: File;
  status: 'pending' | 'analyzing' | 'complete' | 'error';
  extractionResult?: AIExtractionResult;
  selectedEmployee?: MatchedEmployee;
  previewUrl?: string;
  contractPages?: ContractPageImages;
  error?: string;
  validationStatus: BulkValidationStatus;
  editedData?: ExtractedData;
}

export interface BulkUploadState {
  items: BulkDocumentItem[];
  isProcessing: boolean;
  currentIndex: number;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function isContractDocument(docType: string) {
  return docType?.toLowerCase().includes('contract') || docType?.toLowerCase().includes('employment');
}

function getValidationStatus(result: AIExtractionResult): BulkValidationStatus {
  const data = result.extractedData;
  const today = startOfDay(new Date());

  // Check if expired
  if (isContractDocument(data.documentType)) {
    if (data.endDate && isBefore(parseISO(data.endDate), today)) {
      return 'expired';
    }
  } else if (data.expiryDate && isBefore(parseISO(data.expiryDate), today)) {
    return 'expired';
  }

  // Check if no employee match
  if (!result.matchedEmployee) {
    return 'no_match';
  }

  return 'valid';
}

export function useBulkDocumentUpload() {
  const [items, setItems] = useState<BulkDocumentItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  const addFiles = useCallback((files: File[]) => {
    const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/heic'];
    const maxSize = 10 * 1024 * 1024; // 10MB

    const newItems: BulkDocumentItem[] = files
      .filter(file => {
        if (!validTypes.includes(file.type)) {
          toast.error(`${file.name}: Invalid file type`);
          return false;
        }
        if (file.size > maxSize) {
          toast.error(`${file.name}: File too large (max 10MB)`);
          return false;
        }
        return true;
      })
      .slice(0, 10) // Max 10 files
      .map(file => ({
        id: crypto.randomUUID(),
        file,
        status: 'pending' as const,
        validationStatus: 'valid' as BulkValidationStatus,
      }));

    if (files.length > 10) {
      toast.warning('Maximum 10 files allowed. Only the first 10 were added.');
    }

    setItems(prev => [...prev, ...newItems]);
  }, []);

  const analyzeDocument = async (item: BulkDocumentItem): Promise<Partial<BulkDocumentItem>> => {
    try {
      let fileToAnalyze = item.file;
      let contractPages: ContractPageImages | undefined;
      let previewUrl: string | undefined;

      // Check if it's a PDF and extract pages as images
      if (isPdfFile(item.file)) {
        const pdfPages: PdfPageImages = await extractPdfPagesAsImages(item.file);
        
        const page1Url = URL.createObjectURL(pdfPages.page1);
        const page2Url = pdfPages.page2 ? URL.createObjectURL(pdfPages.page2) : undefined;
        
        contractPages = {
          page1Blob: pdfPages.page1,
          page2Blob: pdfPages.page2,
          page1Url,
          page2Url,
        };
        
        previewUrl = page1Url;
        fileToAnalyze = new File([pdfPages.page1], 'page1.jpg', { type: 'image/jpeg' });
      } else {
        previewUrl = URL.createObjectURL(item.file);
      }

      // Convert file to base64
      const base64 = await fileToBase64(fileToAnalyze);

      // Call edge function
      const { data, error } = await supabase.functions.invoke('ai-document-reader', {
        body: {
          fileBase64: base64,
          fileType: fileToAnalyze.type,
          fileName: item.file.name,
        },
      });

      if (error) {
        // Handle rate limit - retry once after delay
        if (error.message?.includes('429') || error.message?.includes('rate')) {
          await new Promise(resolve => setTimeout(resolve, 2000));
          const { data: retryData, error: retryError } = await supabase.functions.invoke('ai-document-reader', {
            body: {
              fileBase64: base64,
              fileType: fileToAnalyze.type,
              fileName: item.file.name,
            },
          });
          
          if (retryError) {
            throw new Error(retryError.message);
          }
          
          if (retryData && retryData.success) {
            const validationStatus = getValidationStatus(retryData);
            return {
              status: 'complete',
              extractionResult: retryData,
              selectedEmployee: retryData.matchedEmployee,
              previewUrl,
              contractPages,
              validationStatus,
            };
          }
        }
        throw new Error(error.message);
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to analyze document');
      }

      const validationStatus = getValidationStatus(data);

      return {
        status: 'complete',
        extractionResult: data,
        selectedEmployee: data.matchedEmployee,
        previewUrl,
        contractPages,
        validationStatus,
      };
    } catch (error) {
      return {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        validationStatus: 'error',
      };
    }
  };

  const startProcessing = useCallback(async () => {
    setIsProcessing(true);
    setCurrentIndex(0);

    const pendingItems = items.filter(item => item.status === 'pending');
    
    for (let i = 0; i < pendingItems.length; i++) {
      const item = pendingItems[i];
      setCurrentIndex(i);
      
      // Update to analyzing status
      setItems(prev => prev.map(it => 
        it.id === item.id ? { ...it, status: 'analyzing' as const } : it
      ));

      // Analyze the document
      const result = await analyzeDocument(item);

      // Update with results
      setItems(prev => prev.map(it => 
        it.id === item.id ? { ...it, ...result } : it
      ));

      // Small delay between requests to avoid rate limiting
      if (i < pendingItems.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    setIsProcessing(false);
    toast.success('Bulk analysis complete!');
  }, [items]);

  const removeItem = useCallback((id: string) => {
    setItems(prev => {
      const item = prev.find(it => it.id === id);
      if (item?.previewUrl) {
        URL.revokeObjectURL(item.previewUrl);
      }
      if (item?.contractPages) {
        URL.revokeObjectURL(item.contractPages.page1Url);
        if (item.contractPages.page2Url) {
          URL.revokeObjectURL(item.contractPages.page2Url);
        }
      }
      return prev.filter(it => it.id !== id);
    });
  }, []);

  const updateEmployeeSelection = useCallback((id: string, employee: MatchedEmployee) => {
    setItems(prev => prev.map(it => {
      if (it.id !== id) return it;
      
      // Recalculate validation status
      let validationStatus: BulkValidationStatus = 'valid';
      if (it.extractionResult) {
        const data = it.editedData || it.extractionResult.extractedData;
        const today = startOfDay(new Date());
        
        if (isContractDocument(data.documentType)) {
          if (data.endDate && isBefore(parseISO(data.endDate), today)) {
            validationStatus = 'expired';
          }
        } else if (data.expiryDate && isBefore(parseISO(data.expiryDate), today)) {
          validationStatus = 'expired';
        }
      }
      
      return { ...it, selectedEmployee: employee, validationStatus };
    }));
  }, []);

  const saveSingleDocument = async (item: BulkDocumentItem): Promise<boolean> => {
    if (!item.selectedEmployee || !item.extractionResult) return false;
    
    const data = item.editedData || item.extractionResult.extractedData;
    const isContract = isContractDocument(data.documentType);
    
    try {
      if (isContract && item.contractPages) {
        // Save contract
        const page1FileName = `${item.selectedEmployee.id}/${Date.now()}-contract-page1.jpg`;
        const { error: page1Error } = await supabase.storage
          .from('contract-documents')
          .upload(page1FileName, item.contractPages.page1Blob, { contentType: 'image/jpeg' });

        if (page1Error) throw page1Error;

        const { data: page1UrlData } = supabase.storage
          .from('contract-documents')
          .getPublicUrl(page1FileName);

        let page2Url: string | null = null;
        if (item.contractPages.page2Blob) {
          const page2FileName = `${item.selectedEmployee.id}/${Date.now()}-contract-page2.jpg`;
          const { error: page2Error } = await supabase.storage
            .from('contract-documents')
            .upload(page2FileName, item.contractPages.page2Blob, { contentType: 'image/jpeg' });

          if (page2Error) throw page2Error;

          const { data: page2UrlData } = supabase.storage
            .from('contract-documents')
            .getPublicUrl(page2FileName);
          page2Url = page2UrlData.publicUrl;
        }

        const contractData = {
          employee_id: item.selectedEmployee.id,
          mohre_contract_no: data.mohreContractNo || `MOL-${Date.now()}`,
          contract_type: data.contractType || 'Unlimited',
          start_date: data.startDate || new Date().toISOString().split('T')[0],
          end_date: data.endDate || null,
          basic_salary: data.basicSalary || 0,
          housing_allowance: data.housingAllowance || 0,
          transportation_allowance: data.transportationAllowance || 0,
          total_salary: (data.basicSalary || 0) + (data.housingAllowance || 0) + (data.transportationAllowance || 0),
          page1_url: page1UrlData.publicUrl,
          page2_url: page2Url,
          status: 'Active',
        };

        const { error: contractError } = await supabase.from('contracts').insert(contractData);
        if (contractError) throw contractError;
      } else {
        // Save regular document with intelligent filename
        let fileToUpload: Blob = item.file;
        let uploadFileType: string = item.file.type;
        let uploadFileSize: string = formatFileSize(item.file.size);
        let fileExt = item.file.name.split('.').pop() || 'jpg';

        if (isPdfFile(item.file) && item.contractPages?.page1Blob) {
          fileToUpload = item.contractPages.page1Blob;
          uploadFileType = 'image/jpeg';
          uploadFileSize = formatFileSize(item.contractPages.page1Blob.size);
          fileExt = 'jpg';
        }

        // Generate intelligent filename
        const smartFilename = generateSmartFilename(data, item.selectedEmployee.full_name, fileExt);
        const uploadFileName = `${item.selectedEmployee.id}/${Date.now()}-${smartFilename}`;

        const { error: uploadError } = await supabase.storage
          .from('employee-documents')
          .upload(uploadFileName, fileToUpload, { contentType: uploadFileType });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('employee-documents')
          .getPublicUrl(uploadFileName);

        const { error: docError } = await supabase.from('employee_documents').insert({
          employee_id: item.selectedEmployee.id,
          name: smartFilename, // Use intelligent filename
          file_url: urlData.publicUrl,
          file_type: uploadFileType,
          file_size: uploadFileSize,
          category: data.documentType,
          expiry_date: data.expiryDate || null,
        });

        if (docError) throw docError;
      }
      
      return true;
    } catch (error) {
      console.error('Error saving document:', error);
      return false;
    }
  };

  const saveAllValid = useCallback(async () => {
    const validItems = items.filter(it => 
      it.status === 'complete' && 
      it.validationStatus === 'valid' && 
      it.selectedEmployee
    );

    if (validItems.length === 0) {
      toast.error('No valid documents to save');
      return;
    }

    setIsSaving(true);
    let successCount = 0;
    let failCount = 0;

    for (const item of validItems) {
      const success = await saveSingleDocument(item);
      if (success) {
        successCount++;
        removeItem(item.id);
      } else {
        failCount++;
      }
    }

    setIsSaving(false);

    if (successCount > 0) {
      toast.success(`${successCount} document(s) saved successfully!`);
    }
    if (failCount > 0) {
      toast.error(`${failCount} document(s) failed to save`);
    }
  }, [items, removeItem]);

  const reset = useCallback(() => {
    // Clean up preview URLs
    items.forEach(item => {
      if (item.previewUrl) {
        URL.revokeObjectURL(item.previewUrl);
      }
      if (item.contractPages) {
        URL.revokeObjectURL(item.contractPages.page1Url);
        if (item.contractPages.page2Url) {
          URL.revokeObjectURL(item.contractPages.page2Url);
        }
      }
    });
    setItems([]);
    setIsProcessing(false);
    setCurrentIndex(0);
  }, [items]);

  // Calculate summary stats
  const stats = {
    total: items.length,
    valid: items.filter(it => it.status === 'complete' && it.validationStatus === 'valid').length,
    expired: items.filter(it => it.validationStatus === 'expired').length,
    noMatch: items.filter(it => it.validationStatus === 'no_match').length,
    errors: items.filter(it => it.status === 'error').length,
    pending: items.filter(it => it.status === 'pending').length,
    analyzing: items.filter(it => it.status === 'analyzing').length,
  };

  return {
    items,
    isProcessing,
    isSaving,
    currentIndex,
    stats,
    addFiles,
    startProcessing,
    removeItem,
    updateEmployeeSelection,
    saveAllValid,
    reset,
  };
}
