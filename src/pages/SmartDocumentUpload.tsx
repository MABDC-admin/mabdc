import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, Sparkles, FileText, User, Calendar, Hash, Building, Loader2, Check, AlertCircle, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useSmartDocumentUpload, ExtractedData, MatchedEmployee } from '@/hooks/useSmartDocumentUpload';
import { useEmployees } from '@/hooks/useEmployees';
import { cn } from '@/lib/utils';

export default function SmartDocumentUpload() {
  const navigate = useNavigate();
  const { data: employees } = useEmployees();
  const {
    isAnalyzing,
    isSaving,
    extractionResult,
    selectedEmployee,
    setSelectedEmployee,
    previewUrl,
    analyzeDocument,
    saveDocument,
    reset,
  } = useSmartDocumentUpload();

  const [isDragging, setIsDragging] = useState(false);
  const [updateEmployeeRecord, setUpdateEmployeeRecord] = useState(true);
  const [editedData, setEditedData] = useState<ExtractedData | null>(null);
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [showAlternatives, setShowAlternatives] = useState(false);

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
      processFile(file);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = async (file: File) => {
    // Validate file type
    const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/heic'];
    if (!validTypes.includes(file.type)) {
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      return;
    }

    setCurrentFile(file);
    setEditedData(null);
    await analyzeDocument(file);
  };

  const handleSave = async () => {
    if (!currentFile || !selectedEmployee || !extractionResult) return;

    const dataToSave = editedData || extractionResult.extractedData;
    const success = await saveDocument(currentFile, dataToSave, selectedEmployee.id, updateEmployeeRecord);

    if (success) {
      handleReset();
    }
  };

  const handleReset = () => {
    reset();
    setCurrentFile(null);
    setEditedData(null);
    setShowAlternatives(false);
  };

  const handleDataEdit = (field: keyof ExtractedData, value: string) => {
    setEditedData((prev) => ({
      ...(prev || extractionResult?.extractedData || {} as ExtractedData),
      [field]: value,
    }));
  };

  const displayData = editedData || extractionResult?.extractedData;

  return (
    <div className="min-h-screen bg-background p-4 lg:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Smart Document Upload</h1>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Upload & Preview */}
          <div className="space-y-6">
            {/* Upload Dropzone */}
            {!extractionResult && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="h-5 w-5" />
                    Upload Document
                  </CardTitle>
                  <CardDescription>
                    Drop any employee document here. AI will automatically detect the type and extract information.
                  </CardDescription>
                </CardHeader>
                <CardContent>
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
                    onClick={() => document.getElementById('file-input')?.click()}
                  >
                    <input
                      id="file-input"
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.heic"
                      className="hidden"
                      onChange={handleFileSelect}
                    />
                    
                    {isAnalyzing ? (
                      <div className="space-y-4">
                        <Loader2 className="h-12 w-12 mx-auto text-primary animate-spin" />
                        <p className="text-muted-foreground">Analyzing document with AI...</p>
                      </div>
                    ) : (
                      <>
                        <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-lg font-medium mb-2">Drop document here or click to browse</p>
                        <p className="text-sm text-muted-foreground">
                          Passport • Visa • Emirates ID • Work Permit • Insurance • Contract
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          PDF, JPG, PNG (max 10MB)
                        </p>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Document Preview */}
            {previewUrl && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Document Preview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {currentFile?.type === 'application/pdf' ? (
                    <div className="bg-muted rounded-lg p-8 text-center">
                      <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">{currentFile.name}</p>
                    </div>
                  ) : (
                    <img
                      src={previewUrl}
                      alt="Document preview"
                      className="w-full rounded-lg border"
                    />
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Extracted Data */}
          {extractionResult && displayData && (
            <div className="space-y-6">
              {/* Extracted Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    AI Extraction Results
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Document Type */}
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-base px-3 py-1">
                      {displayData.documentType}
                    </Badge>
                  </div>

                  {/* Fields Grid */}
                  <div className="grid gap-4">
                    {/* Name */}
                    <div className="space-y-1.5">
                      <Label className="flex items-center gap-2 text-muted-foreground">
                        <User className="h-4 w-4" />
                        Name
                      </Label>
                      <Input
                        value={displayData.name || ''}
                        onChange={(e) => handleDataEdit('name', e.target.value)}
                      />
                      {displayData.nameArabic && (
                        <p className="text-sm text-muted-foreground">{displayData.nameArabic}</p>
                      )}
                    </div>

                    {/* Document Number */}
                    <div className="space-y-1.5">
                      <Label className="flex items-center gap-2 text-muted-foreground">
                        <Hash className="h-4 w-4" />
                        Document Number
                      </Label>
                      <Input
                        value={displayData.documentNumber || ''}
                        onChange={(e) => handleDataEdit('documentNumber', e.target.value)}
                      />
                    </div>

                    {/* Dates */}
                    <div className="grid grid-cols-2 gap-4">
                      {displayData.expiryDate && (
                        <div className="space-y-1.5">
                          <Label className="flex items-center gap-2 text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            Expiry Date
                          </Label>
                          <Input
                            type="date"
                            value={displayData.expiryDate}
                            onChange={(e) => handleDataEdit('expiryDate', e.target.value)}
                          />
                        </div>
                      )}
                      {displayData.issueDate && (
                        <div className="space-y-1.5">
                          <Label className="flex items-center gap-2 text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            Issue Date
                          </Label>
                          <Input
                            type="date"
                            value={displayData.issueDate}
                            onChange={(e) => handleDataEdit('issueDate', e.target.value)}
                          />
                        </div>
                      )}
                    </div>

                    {/* Additional fields based on document type */}
                    {displayData.nationality && (
                      <div className="space-y-1.5">
                        <Label className="text-muted-foreground">Nationality</Label>
                        <Input
                          value={displayData.nationality}
                          onChange={(e) => handleDataEdit('nationality', e.target.value)}
                        />
                      </div>
                    )}

                    {displayData.jobTitle && (
                      <div className="space-y-1.5">
                        <Label className="flex items-center gap-2 text-muted-foreground">
                          <Building className="h-4 w-4" />
                          Job Title
                        </Label>
                        <Input
                          value={displayData.jobTitle}
                          onChange={(e) => handleDataEdit('jobTitle', e.target.value)}
                        />
                      </div>
                    )}

                    {displayData.basicSalary && (
                      <div className="space-y-1.5">
                        <Label className="text-muted-foreground">Basic Salary</Label>
                        <Input
                          type="number"
                          value={displayData.basicSalary}
                          onChange={(e) => handleDataEdit('basicSalary', e.target.value)}
                        />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Employee Match */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Matched Employee
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedEmployee ? (
                    <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/50">
                      <div>
                        <p className="font-medium">{selectedEmployee.full_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {selectedEmployee.hrms_no} • {selectedEmployee.department}
                        </p>
                      </div>
                      <Badge
                        variant={selectedEmployee.confidence >= 80 ? 'default' : 'secondary'}
                        className={cn(
                          selectedEmployee.confidence >= 80 && 'bg-green-500'
                        )}
                      >
                        <Check className="h-3 w-3 mr-1" />
                        {selectedEmployee.confidence}%
                      </Badge>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 p-3 border rounded-lg border-yellow-500/50 bg-yellow-500/10">
                      <AlertCircle className="h-5 w-5 text-yellow-500" />
                      <p className="text-sm">No automatic match found. Please select an employee.</p>
                    </div>
                  )}

                  {/* Alternative Matches */}
                  {extractionResult.alternativeMatches.length > 0 && (
                    <Collapsible open={showAlternatives} onOpenChange={setShowAlternatives}>
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="w-full">
                          <ChevronDown className={cn("h-4 w-4 mr-2 transition-transform", showAlternatives && "rotate-180")} />
                          Other possible matches ({extractionResult.alternativeMatches.length})
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="space-y-2 pt-2">
                        {extractionResult.alternativeMatches.map((match) => (
                          <button
                            key={match.id}
                            onClick={() => setSelectedEmployee(match)}
                            className="w-full flex items-center justify-between p-2 border rounded-lg hover:bg-muted/50 transition-colors"
                          >
                            <div className="text-left">
                              <p className="font-medium text-sm">{match.full_name}</p>
                              <p className="text-xs text-muted-foreground">{match.department}</p>
                            </div>
                            <Badge variant="outline">{match.confidence}%</Badge>
                          </button>
                        ))}
                      </CollapsibleContent>
                    </Collapsible>
                  )}

                  {/* Manual Selection */}
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Or select manually:</Label>
                    <Select
                      value={selectedEmployee?.id || ''}
                      onValueChange={(id) => {
                        const emp = employees?.find((e) => e.id === id);
                        if (emp) {
                          setSelectedEmployee({
                            id: emp.id,
                            full_name: emp.full_name,
                            hrms_no: emp.hrms_no,
                            department: emp.department,
                            confidence: 100,
                          });
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select employee" />
                      </SelectTrigger>
                      <SelectContent>
                        {employees?.filter(e => e.status === 'Active').map((emp) => (
                          <SelectItem key={emp.id} value={emp.id}>
                            {emp.full_name} ({emp.hrms_no})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Update Options & Actions */}
              <Card>
                <CardContent className="pt-6 space-y-4">
                  {/* Update checkbox */}
                  {shouldShowUpdateOption(displayData.documentType) && (
                    <div className="flex items-start gap-3 p-3 border rounded-lg bg-muted/50">
                      <Checkbox
                        id="update-employee"
                        checked={updateEmployeeRecord}
                        onCheckedChange={(checked) => setUpdateEmployeeRecord(checked as boolean)}
                      />
                      <div className="space-y-1">
                        <Label htmlFor="update-employee" className="font-medium cursor-pointer">
                          Update employee record with extracted data
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          {getUpdateDescription(displayData.documentType)}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <Button variant="outline" onClick={handleReset} className="flex-1">
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSave}
                      disabled={!selectedEmployee || isSaving}
                      className="flex-1"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Check className="h-4 w-4 mr-2" />
                          Save Document
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function shouldShowUpdateOption(documentType: string): boolean {
  const updateableTypes = ['passport', 'emirates id', 'visa'];
  return updateableTypes.includes(documentType.toLowerCase());
}

function getUpdateDescription(documentType: string): string {
  const type = documentType.toLowerCase();
  if (type === 'passport') {
    return 'Will update passport number, expiry date, and nationality in employee profile';
  }
  if (type === 'emirates id') {
    return 'Will update Emirates ID number and expiry date in employee profile';
  }
  if (type === 'visa' || type.includes('visa')) {
    return 'Will update visa number and expiry date in employee profile';
  }
  return '';
}
