import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
  company?: string;
  sponsor?: string;
  policyNumber?: string;
  insuranceCompany?: string;
  contractType?: string;
  basicSalary?: number;
  housingAllowance?: number;
  transportationAllowance?: number;
  mohreContractNo?: string;
  startDate?: string;
  endDate?: string;
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

export function useSmartDocumentUpload() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [extractionResult, setExtractionResult] = useState<AIExtractionResult | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<MatchedEmployee | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const analyzeDocument = async (file: File) => {
    setIsAnalyzing(true);
    setExtractionResult(null);
    setSelectedEmployee(null);

    try {
      // Create preview URL
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);

      // Convert file to base64
      const base64 = await fileToBase64(file);

      // Call edge function
      const { data, error } = await supabase.functions.invoke('ai-document-reader', {
        body: {
          fileBase64: base64,
          fileType: file.type,
          fileName: file.name,
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
    } finally {
      setIsAnalyzing(false);
    }
  };

  const saveDocument = async (
    file: File,
    extractedData: ExtractedData,
    employeeId: string,
    updateEmployeeRecord: boolean
  ) => {
    setIsSaving(true);

    try {
      // 1. Upload file to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${employeeId}/${Date.now()}-${extractedData.documentType.toLowerCase().replace(/\s+/g, '-')}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('employee-documents')
        .upload(fileName, file);

      if (uploadError) {
        throw new Error('Failed to upload file: ' + uploadError.message);
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('employee-documents')
        .getPublicUrl(fileName);

      const fileUrl = urlData.publicUrl;

      // 2. Save to employee_documents table
      const { error: docError } = await supabase
        .from('employee_documents')
        .insert({
          employee_id: employeeId,
          name: file.name,
          file_url: fileUrl,
          file_type: file.type,
          file_size: formatFileSize(file.size),
          category: extractedData.documentType,
          expiry_date: extractedData.expiryDate || null,
        });

      if (docError) {
        throw new Error('Failed to save document record: ' + docError.message);
      }

      // 3. Update employee record if requested
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
        } else if (docType === 'visa' || docType.includes('visa')) {
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

      toast.success('Document saved successfully!');
      return true;
    } catch (error) {
      console.error('Error saving document:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save document');
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const reset = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setExtractionResult(null);
    setSelectedEmployee(null);
    setPreviewUrl(null);
  };

  return {
    isAnalyzing,
    isSaving,
    extractionResult,
    selectedEmployee,
    setSelectedEmployee,
    previewUrl,
    analyzeDocument,
    saveDocument,
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

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
