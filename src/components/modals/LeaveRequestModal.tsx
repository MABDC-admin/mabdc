import { useState, useMemo } from 'react';
import { useAddLeave, useLeaveTypes, useLeaveBalances } from '@/hooks/useLeave';
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
import { AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface LeaveRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId: string;
  employeeName: string;
}

export function LeaveRequestModal({ isOpen, onClose, employeeId, employeeName }: LeaveRequestModalProps) {
  const addLeave = useAddLeave();
  const { data: leaveTypes = [] } = useLeaveTypes();
  const { data: leaveBalances = [] } = useLeaveBalances(employeeId);
  const [formData, setFormData] = useState({
    leave_type: 'Annual',
    start_date: '',
    end_date: '',
    reason: '',
  });

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
  const hasInsufficientBalance = requestedDays > 0 && availableDays < requestedDays;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const daysCount = calculateDays();
    
    if (daysCount <= 0) {
      return;
    }

    // Check if balance is insufficient
    if (hasInsufficientBalance) {
      toast.error(
        'Insufficient leave balance. Please contact HR for assistance.',
        { duration: 5000 }
      );
      return;
    }

    addLeave.mutate({
      employee_id: employeeId,
      leave_type: formData.leave_type,
      start_date: formData.start_date,
      end_date: formData.end_date,
      days_count: daysCount,
      reason: formData.reason || undefined,
      status: 'Pending',
    }, {
      onSuccess: () => {
        onClose();
        setFormData({
          leave_type: 'Annual',
          start_date: '',
          end_date: '',
          reason: '',
        });
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
                {leaveTypes.length > 0 ? (
                  leaveTypes.map((type) => (
                    <SelectItem key={type.id} value={type.name}>{type.name}</SelectItem>
                  ))
                ) : (
                  <>
                    <SelectItem value="Annual">Annual Leave</SelectItem>
                    <SelectItem value="Sick">Sick Leave</SelectItem>
                    <SelectItem value="Emergency">Emergency Leave</SelectItem>
                    <SelectItem value="Unpaid">Unpaid Leave</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
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

          {hasInsufficientBalance && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30">
              <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
              <div className="text-sm text-destructive">
                <p className="font-medium">Insufficient leave balance</p>
                <p className="text-xs mt-0.5">You have {availableDays} day(s) available but requesting {requestedDays} day(s). Please contact HR for assistance.</p>
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

          <div className="flex gap-2 pt-2">
            <Button 
              type="submit" 
              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
              disabled={addLeave.isPending || calculateDays() <= 0}
            >
              {addLeave.isPending ? 'Submitting...' : 'Submit Request'}
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
