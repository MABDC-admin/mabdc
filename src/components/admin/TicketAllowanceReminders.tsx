import { useState } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { Plane, Check, X, Eye, AlertCircle, RefreshCw, CheckCheck, Trash2, Mail, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  useTicketAllowanceReminders,
  useApproveTicketAllowance,
  useCancelTicketAllowance,
  useDismissTicketReminder,
  useCheckTicketEligibility,
  useBulkAutoApproveTicketAllowances,
  useDeleteTicketAllowance,
  usePastPendingCount,
} from '@/hooks/useTicketAllowance';
import { useEmployees } from '@/hooks/useEmployees';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function TicketAllowanceReminders() {
  const { data: reminders, isLoading } = useTicketAllowanceReminders();
  const { data: employees } = useEmployees();
  const { data: pastPendingCount } = usePastPendingCount();
  const approveAllowance = useApproveTicketAllowance();
  const cancelAllowance = useCancelTicketAllowance();
  const dismissReminder = useDismissTicketReminder();
  const checkEligibility = useCheckTicketEligibility();
  const bulkAutoApprove = useBulkAutoApproveTicketAllowances();
  const deleteAllowance = useDeleteTicketAllowance();

  const [selectedReminder, setSelectedReminder] = useState<typeof reminders extends (infer T)[] ? T : never | null>(null);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [autoApproveDialogOpen, setAutoApproveDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [defaultAmount, setDefaultAmount] = useState('3000');
  const [deleteReason, setDeleteReason] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);

  const handleCheckEligibility = () => {
    if (employees) {
      checkEligibility.mutate(
        employees.map((e) => ({
          id: e.id,
          joining_date: e.joining_date,
          full_name: e.full_name,
        }))
      );
    }
  };

  const handleApprove = () => {
    if (selectedReminder && amount) {
      approveAllowance.mutate(
        {
          id: selectedReminder.id,
          amount: parseFloat(amount),
          notes: notes || undefined,
        },
        {
          onSuccess: () => {
            setApproveDialogOpen(false);
            setSelectedReminder(null);
            setAmount('');
            setNotes('');
          },
        }
      );
    }
  };

  const handleCancel = () => {
    if (selectedReminder && cancelReason) {
      cancelAllowance.mutate(
        { id: selectedReminder.id, reason: cancelReason },
        {
          onSuccess: () => {
            setCancelDialogOpen(false);
            setSelectedReminder(null);
            setCancelReason('');
          },
        }
      );
    }
  };

  const handleDismiss = (id: string) => {
    dismissReminder.mutate(id);
  };

  const handleBulkAutoApprove = () => {
    if (defaultAmount) {
      bulkAutoApprove.mutate(
        { defaultAmount: parseFloat(defaultAmount) },
        {
          onSuccess: () => {
            setAutoApproveDialogOpen(false);
            setDefaultAmount('3000');
          },
        }
      );
    }
  };

  const handleDelete = () => {
    if (selectedReminder) {
      deleteAllowance.mutate(
        selectedReminder.id,
        {
          onSuccess: () => {
            setDeleteDialogOpen(false);
            setSelectedReminder(null);
            setDeleteReason('');
          },
        }
      );
    }
  };

  const handleSendHRReminder = async () => {
    setSendingEmail(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-ticket-allowance-notification', {
        body: { daysThreshold: 30 },
      });
      
      if (error) throw error;
      
      if (data?.success) {
        if (data.count > 0) {
          toast.success(`Email sent to HR with ${data.count} employee(s) approaching eligibility`);
        } else {
          toast.info('No employees with upcoming eligibility within 30 days');
        }
      } else {
        throw new Error(data?.error || 'Failed to send email');
      }
    } catch (error: any) {
      console.error('Error sending HR reminder:', error);
      toast.error(error.message || 'Failed to send HR reminder email');
    } finally {
      setSendingEmail(false);
    }
  };

  if (isLoading) {
    return null;
  }

  if (!reminders?.length && !pastPendingCount) {
    return null;
  }

  return (
    <>
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <Plane className="h-5 w-5" />
              Ticket Allowance Reminders
              <Badge variant="secondary" className="ml-2">
                {reminders.length}
              </Badge>
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSendHRReminder}
                disabled={sendingEmail}
                className="text-blue-600 border-blue-300 hover:bg-blue-50 dark:text-blue-400 dark:border-blue-700 dark:hover:bg-blue-950"
              >
                <Mail className={`h-4 w-4 mr-2 ${sendingEmail ? 'animate-pulse' : ''}`} />
                {sendingEmail ? 'Sending...' : 'Send HR Reminder'}
              </Button>
              {(pastPendingCount ?? 0) > 0 && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setAutoApproveDialogOpen(true)}
                  disabled={bulkAutoApprove.isPending}
                >
                  <CheckCheck className={`h-4 w-4 mr-2 ${bulkAutoApprove.isPending ? 'animate-spin' : ''}`} />
                  Auto-Approve Past ({pastPendingCount})
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleCheckEligibility}
                disabled={checkEligibility.isPending}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${checkEligibility.isPending ? 'animate-spin' : ''}`} />
                Check Eligibility
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {reminders.map((reminder) => (
            <div
              key={reminder.id}
              className="flex items-center justify-between p-3 rounded-lg bg-background border"
            >
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={reminder.employees?.photo_url || undefined} />
                  <AvatarFallback>
                    {reminder.employees?.full_name
                      ?.split(' ')
                      .map((n) => n[0])
                      .join('')
                      .toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{reminder.employees?.full_name}</p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{reminder.employees?.hrms_no}</span>
                    <span>•</span>
                    <span>{reminder.employees?.department}</span>
                  </div>
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                    Eligible since {format(new Date(reminder.eligibility_start_date), 'MMM yyyy')} •{' '}
                    {formatDistanceToNow(new Date(reminder.eligibility_start_date), { addSuffix: true })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    setSelectedReminder(reminder);
                    setApproveDialogOpen(true);
                  }}
                >
                  <Check className="h-4 w-4 mr-1" />
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSelectedReminder(reminder);
                    setCancelDialogOpen(true);
                  }}
                >
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDismiss(reminder.id)}
                  title="Dismiss reminder (will reappear next check)"
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={() => {
                    setSelectedReminder(reminder);
                    setDeleteDialogOpen(true);
                  }}
                  title="Delete record"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Approve Dialog */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Ticket Allowance</DialogTitle>
            <DialogDescription>
              Approve ticket allowance for {selectedReminder?.employees?.full_name} for{' '}
              {selectedReminder?.eligibility_year}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Ticket Allowance Amount (AED)</Label>
              <Input
                id="amount"
                type="number"
                placeholder="e.g., 3500"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Any additional notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
            <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
              <AlertCircle className="h-4 w-4 text-blue-500 mt-0.5" />
              <p className="text-sm text-blue-700 dark:text-blue-400">
                Once approved, this ticket allowance will be available for inclusion in the next
                payroll for this employee.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleApprove} disabled={!amount || approveAllowance.isPending}>
              {approveAllowance.isPending ? 'Approving...' : 'Approve'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Ticket Allowance</DialogTitle>
            <DialogDescription>
              Cancel ticket allowance for {selectedReminder?.employees?.full_name} for{' '}
              {selectedReminder?.eligibility_year}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="cancelReason">Reason for Cancellation *</Label>
              <Textarea
                id="cancelReason"
                placeholder="Please provide a reason for cancellation..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>
              Back
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancel}
              disabled={!cancelReason || cancelAllowance.isPending}
            >
              {cancelAllowance.isPending ? 'Cancelling...' : 'Cancel Allowance'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Auto-Approve Past Dialog */}
      <Dialog open={autoApproveDialogOpen} onOpenChange={setAutoApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Auto-Approve Past Ticket Allowances</DialogTitle>
            <DialogDescription>
              This will approve all pending ticket allowances where the eligibility date has already
              passed.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="defaultAmount">Default Amount (AED)</Label>
              <Input
                id="defaultAmount"
                type="number"
                placeholder="e.g., 3000"
                value={defaultAmount}
                onChange={(e) => setDefaultAmount(e.target.value)}
              />
            </div>
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
              <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5" />
              <p className="text-sm text-amber-700 dark:text-amber-400">
                <strong>{pastPendingCount}</strong> records will be auto-approved with this amount.
                This action cannot be undone.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAutoApproveDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleBulkAutoApprove}
              disabled={!defaultAmount || bulkAutoApprove.isPending}
            >
              {bulkAutoApprove.isPending ? 'Approving...' : `Auto-Approve ${pastPendingCount} Records`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Ticket Allowance Record</DialogTitle>
            <DialogDescription>
              Delete ticket allowance for {selectedReminder?.employees?.full_name} for{' '}
              {selectedReminder?.eligibility_year}. This action will be logged for audit purposes.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="deleteReason">Reason for Deletion *</Label>
              <Textarea
                id="deleteReason"
                placeholder="e.g., Duplicate entry, incorrect eligibility calculation..."
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                required
              />
            </div>
            <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30">
              <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
              <p className="text-sm text-destructive">
                This will permanently delete this ticket allowance record. The deletion will be
                logged in the audit trail.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={!deleteReason || deleteAllowance.isPending}
            >
              {deleteAllowance.isPending ? 'Deleting...' : 'Delete Record'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
