import { useState, useCallback } from 'react';
import { Upload, X, File, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useDocumentTypes } from '@/hooks/useDocumentTypes';

interface DocumentUploadDropzoneProps {
  onUpload: (file: File, category: string, expiryDate?: string) => Promise<void>;
  isUploading?: boolean;
  className?: string;
}

export function DocumentUploadDropzone({ onUpload, isUploading, className }: DocumentUploadDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [category, setCategory] = useState('Other');
  const [expiryDate, setExpiryDate] = useState('');
  const { data: documentTypes = [] } = useDocumentTypes();

  const selectedType = documentTypes.find(t => t.name === category);
  const requiresExpiry = selectedType?.requires_expiry ?? false;

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
    
    const file = e.dataTransfer.files[0];
    if (file) {
      setSelectedFile(file);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    
    if (requiresExpiry && !expiryDate) {
      return; // Expiry date is required
    }
    
    await onUpload(selectedFile, category, expiryDate || undefined);
    setSelectedFile(null);
    setCategory('Other');
    setExpiryDate('');
  };

  const handleClear = () => {
    setSelectedFile(null);
    setExpiryDate('');
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "relative border-2 border-dashed rounded-xl p-6 transition-all duration-200 text-center cursor-pointer",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50 hover:bg-secondary/30",
          selectedFile && "border-primary/50 bg-primary/5"
        )}
        onClick={() => document.getElementById('doc-upload-input')?.click()}
      >
        <input
          type="file"
          id="doc-upload-input"
          className="hidden"
          onChange={handleFileSelect}
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif"
        />
        
        {selectedFile ? (
          <div className="flex items-center justify-center gap-3">
            <File className="w-8 h-8 text-primary" />
            <div className="text-left">
              <p className="font-medium text-foreground">{selectedFile.name}</p>
              <p className="text-xs text-muted-foreground">
                {(selectedFile.size / 1024).toFixed(1)} KB
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="ml-2"
              onClick={(e) => {
                e.stopPropagation();
                handleClear();
              }}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <>
            <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground">
              Drag & drop a file here
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              or click to browse (PDF, DOC, Images)
            </p>
          </>
        )}
      </div>

      {/* Options */}
      {selectedFile && (
        <div className="space-y-3 animate-fade-in">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Document Type</label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {documentTypes.map((type) => (
                  <SelectItem key={type.id} value={type.name}>
                    {type.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {requiresExpiry && (
            <div>
              <label className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Expiry Date <span className="text-destructive">*</span>
              </label>
              <Input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                required
              />
            </div>
          )}
          
          <Button 
            onClick={handleUpload} 
            disabled={isUploading || (requiresExpiry && !expiryDate)}
            className="w-full"
          >
            {isUploading ? 'Uploading...' : 'Upload Document'}
          </Button>
        </div>
      )}
    </div>
  );
}
