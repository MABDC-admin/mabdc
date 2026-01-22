import { useState, useMemo, useEffect } from 'react';
import { useAddLeave, useLeaveTypes, useLeaveBalances, useLeave } from '@/hooks/useLeave';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { differenceInDays, parseISO } from 'date-fns';
import { AlertCircle, CalendarX2, Camera, Upload, X, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

// Leave types visible to employees (gender-filtered)
const EMPLOYEE_VISIBLE_CODES = ['ANNUAL', 'LOP', 'SICK', 'MATERNITY', 'PATERNITY'];

interface LeaveRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId: string;
  employeeName: string;
  employeeGender?: string | null;
}

export function LeaveRequestModal({ isOpen, onClose, employeeId, employeeName, employeeGender }: LeaveRequestModalProps) {
  const addLeave = useAddLeave();
  const { data: leaveTypes = [] } = useLeaveTypes();
  const { data: leaveBalances = [] } = useLeaveBalances(employeeId);
  const { data: allLeave = [] } = useLeave();

  // Filter leave types for employees - only show allowed types with gender filtering
  const filteredLeaveTypes = useMemo(() => {
    return leaveTypes.filter(type => {
      // Only show allowed types
      if (!EMPLOYEE_VISIBLE_CODES.includes(type.code)) return false;
      // Gender-specific filtering
      if (type.code === 'MATERNITY' && employeeGender !== 'Female') return false;
      if (type.code === 'PATERNITY' && employeeGender !== 'Male') return false;
      return true;
    });
  }, [leaveTypes, employeeGender]);

  // Set default leave type based on filtered types
  const defaultLeaveType = filteredLeaveTypes.length > 0 ? filteredLeaveTypes[0].name : 'Annual Leave';

  const [formData, setFormData] = useState({
    leave_type: defaultLeaveType,
    start_date: '',
    end_date: '',
    reason: '',
  });

  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Reset form when modal opens with correct default type
  useEffect(() => {
    if (isOpen && filteredLeaveTypes.length > 0) {
      setFormData(prev => ({
        ...prev,
        leave_type: filteredLeaveTypes[0].name,
      }));
      // Reset attachment state when modal opens
      setAttachmentFile(null);
      setAttachmentPreview(null);
    }
  }, [isOpen, filteredLeaveTypes]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size must be less than 10MB');
        return;
      }
      setAttachmentFile(file);
      // Create preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => setAttachmentPreview(e.target?.result as string);
        reader.readAsDataURL(file);
      } else {
        setAttachmentPreview(null);
      }
    }
  };

  const clearAttachment = () => {
    setAttachmentFile(null);
    setAttachmentPreview(null);
  };

  // Check for overlapping leaves
  const overlappingLeave = useMemo(() => {
    if (!formData.start_date || !formData.end_date) return null;
    const employeeLeaves = allLeave.filter(l => 
      l.employee_id === employeeId && 
      (l.status === 'Pending' || l.status === 'Approved')
    );
    
    const startDate = parseISO(formData.start_date);
    const endDate = parseISO(formData.end_date);
    
    return employeeLeaves.find(leave => {
      const leaveStart = parseISO(leave.start_date);
      const leaveEnd = parseISO(leave.end_date);
      return startDate <= leaveEnd && endDate >= leaveStart;
    });
  }, [allLeave, employeeId, formData.start_date, formData.end_date]);

  const calculateDays = () => {
    if (!formData.start_date || !formData.end_date) return 0;
    const days = differenceInDays(parseISO(formData.end_date), parseISO(formData.start_date)) + 1;
    return days > 0 ? days : 0;
  };

  // Find the selected leave type's balance
  const selectedLeaveType = useMemo(() => {
    return leaveTypes.find(lt => lt.name === formData.leave_type);
  }, [leaveTypes, formData.leave_type]);

  const selectedBalance = useMemo(() => {
    if (!selectedLeaveType) return null;
    return leaveBalances.find(lb => lb.leave_type_id === selectedLeaveType.id);
  }, [leaveBalances, selectedLeaveType]);

  const availableDays = useMemo(() => {
    if (!selectedBalance) return 0;
    return (selectedBalance.entitled_days + selectedBalance.carried_forward_days) - 
           selectedBalance.used_days - selectedBalance.pending_days;
  }, [selectedBalance]);

  const requestedDays = calculateDays();
  const isLOPLeave = selectedLeaveType?.code === 'LOP' || selectedLeaveType?.paid_type === 'Unpaid';
  // Skip balance validation for LOP leave type
  const hasInsufficientBalance = !isLOPLeave && requestedDays > 0 && availableDays < requestedDays;
  const hasOverlap = !!overlappingLeave;
  const canSubmit = requestedDays > 0 && !hasInsufficientBalance && !hasOverlap && !addLeave.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const daysCount = calculateDays();
    
    if (daysCount <= 0) {
      return;
    }

    // Check for overlap
    if (hasOverlap) {
      toast.error('Leave dates overlap with an existing request. Please select different dates.');
      return;
    }

    // Check if balance is insufficient
    if (hasInsufficientBalance) {
      toast.error(
        'Insufficient leave balance. Please contact HR to extend your allocation.',
        { duration: 5000 }
      );
      return;
    }

    let attachmentUrl: string | undefined;

    // Upload attachment if present
    if (attachmentFile) {
      setIsUploading(true);
      try {
        const fileName = `${employeeId}/${Date.now()}-${attachmentFile.name}`;
        
        const { error: uploadError } = await supabase.storage
          .from('leave-attachments')
          .upload(fileName, attachmentFile);
        
        if (uploadError) {
          toast.error('Failed to upload attachment: ' + uploadError.message);
          setIsUploading(false);
          return;
        }
        
        const { data: { publicUrl } } = supabase.storage
          .from('leave-attachments')
          .getPublicUrl(fileName);
        
        attachmentUrl = publicUrl;
      } catch (error) {
        toast.error('Failed to upload attachment');
        setIsUploading(false);
        return;
      }
      setIsUploading(false);
    }

    addLeave.mutate({
      employee_id: employeeId,
      leave_type: formData.leave_type,
      start_date: formData.start_date,
      end_date: formData.end_date,
      days_count: daysCount,
      reason: formData.reason || undefined,
      status: 'Pending',
      attachment_url: attachmentUrl,
    }, {
      onSuccess: () => {
        onClose();
        setFormData({
          leave_type: 'Annual',
          start_date: '',
          end_date: '',
          reason: '',
        });
        clearAttachment();
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md glass-card border-border">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-foreground">
            Leave Request for {employeeName}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Leave Type</Label>
            <Select
              value={formData.leave_type}
              onValueChange={(value) => setFormData({ ...formData, leave_type: value })}
            >
              <SelectTrigger className="bg-secondary/50 border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {filteredLeaveTypes.length > 0 ? (
                  filteredLeaveTypes.map((type) => (
                    <SelectItem key={type.id} value={type.name}>{type.name}</SelectItem>
                  ))
                ) : (
                  <SelectItem value="Annual Leave">Annual Leave</SelectItem>
                )}
              </SelectContent>
            </Select>
            {selectedBalance && (
              <div className="mt-2 p-2 rounded-lg bg-secondary/50 border border-border">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{formData.leave_type} Leave Balance:</span>
                  <span className={`font-bold ${availableDays <= 0 ? 'text-destructive' : 'text-primary'}`}>
                    {Math.max(0, availableDays)} / {(selectedBalance.entitled_days + selectedBalance.carried_forward_days)} days
                  </span>
                </div>
                <div className="flex gap-2 mt-1 text-[10px] text-muted-foreground">
                  <span>Used: {selectedBalance.used_days}</span>
                  <span>•</span>
                  <span>Pending: {selectedBalance.pending_days}</span>
                </div>
              </div>
            )}
            {!selectedBalance && selectedLeaveType && (
              <p className="text-xs text-amber-500 mt-1">No {formData.leave_type} leave allocated. Contact HR.</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Start Date</Label>
              <Input
                type="date"
                required
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="bg-secondary/50 border-border"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">End Date</Label>
              <Input
                type="date"
                required
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                className="bg-secondary/50 border-border"
              />
            </div>
          </div>

          {formData.start_date && formData.end_date && (
            <div className={`p-3 rounded-lg border ${hasInsufficientBalance ? 'bg-destructive/10 border-destructive/30' : 'bg-primary/10 border-primary/30'}`}>
              <p className={`text-sm font-medium ${hasInsufficientBalance ? 'text-destructive' : 'text-primary'}`}>
                Duration: {calculateDays()} day(s)
              </p>
              {selectedBalance && (
                <p className="text-xs text-muted-foreground mt-1">
                  Available balance: {availableDays} day(s)
                </p>
              )}
            </div>
          )}

          {/* LOP Warning */}
          {isLOPLeave && requestedDays > 0 && (
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
              <p className="text-sm font-medium text-amber-600">
                ⚠️ Loss of Pay Leave
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                These {requestedDays} day(s) will be deducted from your salary. LOP is calculated at (Basic Salary ÷ 30) per day.
              </p>
            </div>
          )}
          {hasOverlap && overlappingLeave && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
              <CalendarX2 className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
              <div className="text-sm text-amber-700 dark:text-amber-400">
                <p className="font-medium">Overlapping Leave Detected</p>
                <p className="text-xs mt-0.5">
                  You have {overlappingLeave.status.toLowerCase()} {overlappingLeave.leave_type} leave from{' '}
                  {new Date(overlappingLeave.start_date).toLocaleDateString()} to{' '}
                  {new Date(overlappingLeave.end_date).toLocaleDateString()}. Please select different dates.
                </p>
              </div>
            </div>
          )}

          {hasInsufficientBalance && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30">
              <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
              <div className="text-sm text-destructive">
                <p className="font-medium">Insufficient leave balance</p>
                <p className="text-xs mt-0.5">You have {availableDays} day(s) available but requesting {requestedDays} day(s). Please contact HR to extend your allocation.</p>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Reason (Optional)</Label>
            <Textarea
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              placeholder="Enter reason for leave..."
              className="bg-secondary/50 border-border min-h-[80px]"
            />
          </div>

          {/* Attachment Section */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">
              Supporting Document (Optional)
            </Label>
            
            {!attachmentFile ? (
              <div className="flex gap-2">
                {/* File Upload Button */}
                <label className="flex-1 cursor-pointer">
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*,.pdf,.doc,.docx"
                    onChange={handleFileSelect}
                  />
                  <div className="flex items-center justify-center gap-2 p-3 border border-dashed border-border rounded-lg hover:bg-secondary/50 transition-colors">
                    <Upload className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Upload File</span>
                  </div>
                </label>
                
                {/* Camera Capture Button */}
                <label className="shrink-0 cursor-pointer">
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileSelect}
                  />
                  <div className="flex items-center justify-center gap-2 p-3 border border-border rounded-lg hover:bg-secondary/50 transition-colors">
                    <Camera className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Camera</span>
                  </div>
                </label>
              </div>
            ) : (
              /* Attachment Preview */
              <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg border border-border">
                {attachmentPreview ? (
                  <img 
                    src={attachmentPreview} 
                    alt="Preview" 
                    className="w-12 h-12 object-cover rounded"
                  />
                ) : (
                  <div className="w-12 h-12 rounded bg-primary/10 flex items-center justify-center">
                    <FileText className="w-6 h-6 text-primary" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate text-foreground">{attachmentFile.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(attachmentFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={clearAttachment}
                  className="shrink-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}
            <p className="text-[10px] text-muted-foreground">
              Accepted: Images, PDF, DOC (max 10MB)
            </p>
          </div>

          <div className="flex gap-2 pt-2">
            <Button 
              type="submit" 
              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
              disabled={!canSubmit || isUploading}
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : addLeave.isPending ? (
                'Submitting...'
              ) : (
                'Submit Request'
              )}
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              className="bg-secondary hover:bg-secondary/80 text-secondary-foreground border-border"
            >
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
