import { useCallback, useState } from 'react';
import { Upload, FileText, Files } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface BulkUploadDropzoneProps {
  onFilesSelected: (files: File[]) => void;
  fileCount: number;
}

export function BulkUploadDropzone({ onFilesSelected, fileCount }: BulkUploadDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      onFilesSelected(files);
    }
  }, [onFilesSelected]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      onFilesSelected(files);
    }
    // Reset input
    e.target.value = '';
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        "border-2 border-dashed rounded-lg p-8 text-center transition-all cursor-pointer",
        isDragging
          ? "border-primary bg-primary/5"
          : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50"
      )}
      onClick={() => document.getElementById('bulk-file-input')?.click()}
    >
      <input
        id="bulk-file-input"
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.heic"
        multiple
        className="hidden"
        onChange={handleFileSelect}
      />
      
      <Files className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
      <p className="text-lg font-medium mb-2">Drop multiple documents here</p>
      <p className="text-sm text-muted-foreground mb-4">
        Or click to browse • Up to 10 files at once
      </p>
      
      {fileCount > 0 && (
        <div className="flex items-center justify-center gap-2 text-primary">
          <FileText className="h-4 w-4" />
          <span className="font-medium">{fileCount} file(s) selected</span>
        </div>
      )}
      
      <p className="text-xs text-muted-foreground mt-4">
        Passport • Visa • Emirates ID • Contract • PDF, JPG, PNG (max 10MB each)
      </p>
    </div>
  );
}
