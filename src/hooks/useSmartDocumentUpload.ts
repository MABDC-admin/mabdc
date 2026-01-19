import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { extractPdfPagesAsImages, isPdfFile, PdfPageImages } from '@/utils/pdfToImages';

export interface ExtractedData {
  documentType: string;
  name: string;
  nameArabic?: string;
  documentNumber: string;
  expiryDate?: string;
  issueDate?: string;
  nationality?: string;
  dateOfBirth?: string;
  placeOfIssue?: string;
  jobTitle?: string;
  jobTitleArabic?: string;
  company?: string;
  sponsor?: string;
  policyNumber?: string;
  insuranceCompany?: string;
  contractType?: string;
  basicSalary?: number;
  housingAllowance?: number;
  transportationAllowance?: number;
  totalSalary?: number;
  mohreContractNo?: string;
  startDate?: string;
  endDate?: string;
  workLocation?: string;
  workingHours?: number;
  probationPeriod?: number;
  noticePeriod?: number;
  annualLeaveDays?: number;
  additionalInfo?: Record<string, string>;
}

export interface MatchedEmployee {
  id: string;
  full_name: string;
  hrms_no: string;
  department: string;
  confidence: number;
}

export interface AIExtractionResult {
  success: boolean;
  extractedData: ExtractedData;
  matchedEmployee: MatchedEmployee | null;
  alternativeMatches: MatchedEmployee[];
}

export interface ContractPageImages {
  page1Blob: Blob;
  page2Blob?: Blob;
  page1Url: string;
  page2Url?: string;
}

export function useSmartDocumentUpload() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [extractionResult, setExtractionResult] = useState<AIExtractionResult | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<MatchedEmployee | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [contractPages, setContractPages] = useState<ContractPageImages | null>(null);
  const [isPdf, setIsPdf] = useState(false);

  const analyzeDocument = async (file: File) => {
    setIsAnalyzing(true);
    setExtractionResult(null);
    setSelectedEmployee(null);
    setContractPages(null);
    setIsPdf(false);

    try {
      let fileToAnalyze = file;
      let pdfPages: PdfPageImages | null = null;

      // Check if it's a PDF and extract pages as images
      if (isPdfFile(file)) {
        setIsPdf(true);
        console.log('PDF detected, extracting pages as images...');
        pdfPages = await extractPdfPagesAsImages(file);
        console.log(`Extracted ${pdfPages.totalPages} pages from PDF`);

        // Create preview URLs for the PDF pages
        const page1Url = URL.createObjectURL(pdfPages.page1);
        const page2Url = pdfPages.page2 ? URL.createObjectURL(pdfPages.page2) : undefined;
        
        setContractPages({
          page1Blob: pdfPages.page1,
          page2Blob: pdfPages.page2,
          page1Url,
          page2Url,
        });
        
        setPreviewUrl(page1Url);

        // Convert the first page image to a file for AI analysis
        fileToAnalyze = new File([pdfPages.page1], 'page1.jpg', { type: 'image/jpeg' });
      } else {
        // Create preview URL for regular images
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
      }

      // Convert file to base64
      const base64 = await fileToBase64(fileToAnalyze);

      // Convert additional pages to base64 for multi-page analysis
      const additionalImages: string[] = [];
      if (pdfPages?.page2) {
        console.log('Converting page 2 to base64 for multi-page analysis...');
        const page2Base64 = await blobToBase64(pdfPages.page2);
        additionalImages.push(page2Base64);
        console.log('Page 2 converted, total pages to analyze:', additionalImages.length + 1);
      }

      // Call edge function with all pages
      const { data, error } = await supabase.functions.invoke('ai-document-reader', {
        body: {
          fileBase64: base64,
          fileType: fileToAnalyze.type,
          fileName: file.name,
          additionalImages: additionalImages.length > 0 ? additionalImages : undefined,
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to analyze document');
      }

      setExtractionResult(data);
      setSelectedEmployee(data.matchedEmployee);

      if (data.matchedEmployee) {
        toast.success(`Document analyzed! Matched to ${data.matchedEmployee.full_name} (${data.matchedEmployee.confidence}% confidence)`);
      } else {
        toast.warning('Document analyzed but no employee match found. Please select an employee manually.');
      }
    } catch (error) {
      console.error('Error analyzing document:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to analyze document');
      setPreviewUrl(null);
      setContractPages(null);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const archiveExpiredDocuments = async (
    employeeId: string,
    category: string,
    newDocumentId: string
  ): Promise<number> => {
    const today = new Date().toISOString().split('T')[0];

    // Find existing documents of same type that are expired and not already renewed
    const { data: expiredDocs, error: fetchError } = await supabase
      .from('employee_documents')
      .select('id')
      .eq('employee_id', employeeId)
      .eq('category', category)
      .lte('expiry_date', today)
      .or('is_renewed.is.null,is_renewed.eq.false');

    if (fetchError || !expiredDocs || expiredDocs.length === 0) {
      return 0;
    }

    // Mark all as renewed and link to new document
    const { error: updateError } = await supabase
      .from('employee_documents')
      .update({
        is_renewed: true,
        renewed_at: new Date().toISOString(),
        renewed_document_id: newDocumentId,
      })
      .in('id', expiredDocs.map((d) => d.id));

    if (updateError) {
      console.error('Failed to archive expired documents:', updateError);
      return 0;
    }

    return expiredDocs.length;
  };

  const archivePreviousContracts = async (
    employeeId: string
  ): Promise<number> => {
    // Find ALL existing contracts that are not already archived/terminated/expired
    const { data: existingContracts, error: fetchError } = await supabase
      .from('contracts')
      .select('id, end_date')
      .eq('employee_id', employeeId)
      .not('status', 'in', '("Terminated","Expired","Archived")');

    if (fetchError || !existingContracts || existingContracts.length === 0) {
      return 0;
    }

    const today = new Date().toISOString().split('T')[0];

    // Determine appropriate status for each contract:
    // - If end_date has passed → "Expired"
    // - If end_date is still in future → "Archived" (superseded by new contract)
    const expiredIds = existingContracts
      .filter(c => c.end_date && c.end_date <= today)
      .map(c => c.id);
    
    const archivedIds = existingContracts
      .filter(c => !c.end_date || c.end_date > today)
      .map(c => c.id);

    let totalArchived = 0;

    // Mark expired contracts
    if (expiredIds.length > 0) {
      const { error } = await supabase
        .from('contracts')
        .update({
          status: 'Expired',
          updated_at: new Date().toISOString(),
        })
        .in('id', expiredIds);
      
      if (!error) totalArchived += expiredIds.length;
    }

    // Archive still-active contracts (superseded by new contract)
    if (archivedIds.length > 0) {
      const { error } = await supabase
        .from('contracts')
        .update({
          status: 'Archived',
          updated_at: new Date().toISOString(),
        })
        .in('id', archivedIds);
      
      if (!error) totalArchived += archivedIds.length;
    }

    return totalArchived;
  };

  const saveDocument = async (
    file: File,
    extractedData: ExtractedData,
    employeeId: string,
    updateEmployeeRecord: boolean,
    employeeName?: string
  ) => {
    setIsSaving(true);

    try {
      // Get employee name if not provided
      let empName = employeeName;
      if (!empName) {
        const { data: emp } = await supabase
          .from('employees')
          .select('full_name')
          .eq('id', employeeId)
          .single();
        empName = emp?.full_name || 'Unknown';
      }

      let fileToUpload: Blob = file;
      let uploadFileType: string = file.type;
      let uploadFileSize: string = formatFileSize(file.size);
      let fileExt = file.name.split('.').pop() || 'jpg';

      // If this is a PDF and we have extracted page images, use the first page JPEG instead
      if (isPdfFile(file) && contractPages?.page1Blob) {
        fileToUpload = contractPages.page1Blob;
        uploadFileType = 'image/jpeg';
        uploadFileSize = formatFileSize(contractPages.page1Blob.size);
        fileExt = 'jpg';
      }

      // Generate intelligent filename
      const smartFilename = generateSmartFilename(extractedData, empName, fileExt);
      const uploadFileName = `${employeeId}/${Date.now()}-${smartFilename}`;

      // 1. Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from('employee-documents')
        .upload(uploadFileName, fileToUpload, { contentType: uploadFileType });

      if (uploadError) {
        throw new Error('Failed to upload file: ' + uploadError.message);
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('employee-documents')
        .getPublicUrl(uploadFileName);

      const fileUrl = urlData.publicUrl;

      // 2. Save to employee_documents table with intelligent filename
      const { data: newDoc, error: docError } = await supabase
        .from('employee_documents')
        .insert({
          employee_id: employeeId,
          name: smartFilename, // Use intelligent filename
          file_url: fileUrl,
          file_type: uploadFileType,
          file_size: uploadFileSize,
          category: extractedData.documentType,
          expiry_date: extractedData.expiryDate || null,
        })
        .select('id')
        .single();

      if (docError) {
        throw new Error('Failed to save document record: ' + docError.message);
      }

      // 3. Archive any expired documents of the same type
      const archivedCount = await archiveExpiredDocuments(
        employeeId,
        extractedData.documentType,
        newDoc.id
      );

      // 4. Update employee record if requested
      if (updateEmployeeRecord) {
        const updates: Record<string, any> = {};
        const docType = extractedData.documentType.toLowerCase();

        if (docType === 'passport') {
          if (extractedData.documentNumber) updates.passport_no = extractedData.documentNumber;
          if (extractedData.expiryDate) updates.passport_expiry = extractedData.expiryDate;
          if (extractedData.nationality) updates.nationality = extractedData.nationality;
          if (extractedData.placeOfIssue) updates.place_of_birth = extractedData.placeOfIssue;
        } else if (docType === 'emirates id') {
          if (extractedData.documentNumber) updates.emirates_id = extractedData.documentNumber;
          if (extractedData.expiryDate) updates.emirates_id_expiry = extractedData.expiryDate;
        } else if (
          docType === 'visa' || 
          docType.includes('visa') || 
          docType.includes('residency') ||
          docType.includes('residence')
        ) {
          if (extractedData.documentNumber) updates.visa_no = extractedData.documentNumber;
          if (extractedData.expiryDate) updates.visa_expiration = extractedData.expiryDate;
        }

        if (Object.keys(updates).length > 0) {
          updates.updated_at = new Date().toISOString();

          const { error: updateError } = await supabase
            .from('employees')
            .update(updates)
            .eq('id', employeeId);

          if (updateError) {
            console.error('Failed to update employee record:', updateError);
            toast.warning('Document saved but failed to update employee record');
          }
        }
      }

      const archiveMsg = archivedCount > 0 ? ` ${archivedCount} expired document(s) archived.` : '';
      toast.success(`Document saved successfully!${archiveMsg}`);
      return true;
    } catch (error) {
      console.error('Error saving document:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save document');
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const saveContract = async (
    extractedData: ExtractedData,
    employeeId: string,
    autoActivate: boolean
  ): Promise<boolean> => {
    if (!contractPages) {
      toast.error('No contract pages available');
      return false;
    }

    setIsSaving(true);

    try {
      // 1. Archive any previous contracts first (both expired and still-active)
      const archivedCount = await archivePreviousContracts(employeeId);

      // 2. Upload page 1 to contract-documents bucket
      const page1FileName = `${employeeId}/${Date.now()}-contract-page1.jpg`;
      const { error: page1Error } = await supabase.storage
        .from('contract-documents')
        .upload(page1FileName, contractPages.page1Blob, { contentType: 'image/jpeg' });

      if (page1Error) {
        throw new Error('Failed to upload page 1: ' + page1Error.message);
      }

      const { data: page1UrlData } = supabase.storage
        .from('contract-documents')
        .getPublicUrl(page1FileName);
      const page1Url = page1UrlData.publicUrl;

      // 3. Upload page 2 if exists
      let page2Url: string | null = null;
      if (contractPages.page2Blob) {
        const page2FileName = `${employeeId}/${Date.now()}-contract-page2.jpg`;
        const { error: page2Error } = await supabase.storage
          .from('contract-documents')
          .upload(page2FileName, contractPages.page2Blob, { contentType: 'image/jpeg' });

        if (page2Error) {
          throw new Error('Failed to upload page 2: ' + page2Error.message);
        }

        const { data: page2UrlData } = supabase.storage
          .from('contract-documents')
          .getPublicUrl(page2FileName);
        page2Url = page2UrlData.publicUrl;
      }

      // 4. Create contract record
      const contractData = {
        employee_id: employeeId,
        mohre_contract_no: extractedData.mohreContractNo || `MOL-${Date.now()}`,
        contract_type: extractedData.contractType || 'Unlimited',
        start_date: extractedData.startDate || new Date().toISOString().split('T')[0],
        end_date: extractedData.endDate || null,
        basic_salary: extractedData.basicSalary || 0,
        housing_allowance: extractedData.housingAllowance || 0,
        transportation_allowance: extractedData.transportationAllowance || 0,
        total_salary: extractedData.totalSalary || (
          (extractedData.basicSalary || 0) + 
          (extractedData.housingAllowance || 0) + 
          (extractedData.transportationAllowance || 0)
        ),
        job_title_arabic: extractedData.jobTitleArabic || null,
        work_location: extractedData.workLocation || 'Abu Dhabi',
        working_hours: extractedData.workingHours || 8,
        probation_period: extractedData.probationPeriod || 6,
        notice_period: extractedData.noticePeriod || 30,
        annual_leave_days: extractedData.annualLeaveDays || 30,
        page1_url: page1Url,
        page2_url: page2Url,
        status: autoActivate ? 'Active' : 'Draft',
      };

      const { error: contractError } = await supabase
        .from('contracts')
        .insert(contractData);

      if (contractError) {
        throw new Error('Failed to create contract: ' + contractError.message);
      }

      // The database trigger will automatically sync salary to employee when status is 'Active'
      
      const archiveMsg = archivedCount > 0 ? ` ${archivedCount} expired contract(s) archived.` : '';
      toast.success(
        autoActivate 
          ? `Contract created and activated! Salary synced to employee.${archiveMsg}` 
          : `Contract created as draft.${archiveMsg}`
      );
      return true;
    } catch (error) {
      console.error('Error saving contract:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save contract');
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const reset = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    if (contractPages) {
      URL.revokeObjectURL(contractPages.page1Url);
      if (contractPages.page2Url) {
        URL.revokeObjectURL(contractPages.page2Url);
      }
    }
    setExtractionResult(null);
    setSelectedEmployee(null);
    setPreviewUrl(null);
    setContractPages(null);
    setIsPdf(false);
  };

  return {
    isAnalyzing,
    isSaving,
    extractionResult,
    selectedEmployee,
    setSelectedEmployee,
    previewUrl,
    contractPages,
    isPdf,
    analyzeDocument,
    saveDocument,
    saveContract,
    reset,
  };
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data URL prefix
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data URL prefix
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Generate an intelligent filename based on document type and extracted data
 * Format: DocumentType_EmployeeName_Year.ext
 * Example: Emirates_ID_John_Smith_2024.jpg
 */
export function generateSmartFilename(
  extractedData: ExtractedData,
  employeeName: string,
  fileExtension: string
): string {
  // Clean and format document type
  const docType = extractedData.documentType
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_]/g, '');
  
  // Clean and format employee name (FirstName_LastName)
  const cleanName = employeeName
    .split(' ')
    .slice(0, 2) // Take first two parts of name
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join('_')
    .replace(/[^a-zA-Z_]/g, '');
  
  // Get year from expiry date or current year
  const year = extractedData.expiryDate 
    ? extractedData.expiryDate.split('-')[0] 
    : new Date().getFullYear().toString();
  
  // Add document number suffix if available (last 4 chars)
  const docNumSuffix = extractedData.documentNumber 
    ? '_' + extractedData.documentNumber.slice(-4).replace(/[^a-zA-Z0-9]/g, '')
    : '';
  
  return `${docType}_${cleanName}_${year}${docNumSuffix}.${fileExtension}`;
}
