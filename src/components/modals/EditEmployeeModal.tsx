import { useState, useEffect } from 'react';
import { useUpdateEmployee } from '@/hooks/useEmployees';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, AlertTriangle, RefreshCw, Mail, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { Employee } from '@/types/hr';

interface EditEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee;
}

export function EditEmployeeModal({ isOpen, onClose, employee }: EditEmployeeModalProps) {
  const updateEmployee = useUpdateEmployee();
  const [formData, setFormData] = useState({
    hrms_no: '',
    full_name: '',
    job_position: '',
    department: '',
    joining_date: '',
    manager: '',
    work_email: '',
    work_phone: '',
    nationality: '',
    basic_salary: '',
    allowance: '',
    status: 'Active' as 'Active' | 'On Leave' | 'Terminated',
    contract_type: 'Unlimited',
    visa_no: '',
    visa_expiration: '',
    emirates_id: '',
    emirates_id_expiry: '',
    passport_no: '',
    passport_expiry: '',
    bank_name: '',
    iban: '',
    bank_account_no: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    emergency_contact_relationship: '',
  });

  // Email change detection state
  const [showEmailChangeDialog, setShowEmailChangeDialog] = useState(false);
  const [emailChangeAction, setEmailChangeAction] = useState<'sync' | 'reset' | 'skip' | null>(null);
  const [isProcessingEmail, setIsProcessingEmail] = useState(false);
  const [pendingSubmit, setPendingSubmit] = useState(false);

  useEffect(() => {
    if (employee) {
      setFormData({
        hrms_no: employee.hrms_no || '',
        full_name: employee.full_name || '',
        job_position: employee.job_position || '',
        department: employee.department || '',
        joining_date: employee.joining_date || '',
        manager: employee.manager || '',
        work_email: employee.work_email || '',
        work_phone: employee.work_phone || '',
        nationality: employee.nationality || '',
        basic_salary: employee.basic_salary?.toString() || '',
        allowance: employee.allowance?.toString() || '',
        status: (employee.status as 'Active' | 'On Leave' | 'Terminated') || 'Active',
        contract_type: employee.contract_type || 'Unlimited',
        visa_no: employee.visa_no || '',
        visa_expiration: employee.visa_expiration || '',
        emirates_id: employee.emirates_id || '',
        emirates_id_expiry: employee.emirates_id_expiry || '',
        passport_no: employee.passport_no || '',
        passport_expiry: employee.passport_expiry || '',
        bank_name: (employee as any).bank_name || '',
        iban: (employee as any).iban || '',
        bank_account_no: (employee as any).bank_account_no || '',
        emergency_contact_name: (employee as any).emergency_contact_name || '',
        emergency_contact_phone: (employee as any).emergency_contact_phone || '',
        emergency_contact_relationship: (employee as any).emergency_contact_relationship || '',
      });
    }
  }, [employee]);

  const hasEmailChanged = () => {
    return formData.work_email.toLowerCase() !== (employee.work_email || '').toLowerCase();
  };

  const hasLinkedAccount = () => {
    return !!(employee as any).user_id;
  };

  const handleSyncEmail = async () => {
    setIsProcessingEmail(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update-employee-email`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ 
            employeeId: employee.id, 
            newEmail: formData.work_email 
          }),
        }
      );

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to sync email');
      }

      toast.success('Email synced with login account');
      return true;
    } catch (error) {
      console.error('Error syncing email:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to sync email');
      return false;
    } finally {
      setIsProcessingEmail(false);
    }
  };

  const handleResetAccount = async () => {
    setIsProcessingEmail(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reset-employee-account`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ employeeId: employee.id }),
        }
      );

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to reset account');
      }

      toast.success('Account reset. You can now generate a new account.');
      return true;
    } catch (error) {
      console.error('Error resetting account:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to reset account');
      return false;
    } finally {
      setIsProcessingEmail(false);
    }
  };

  const performUpdate = () => {
    updateEmployee.mutate({
      id: employee.id,
      hrms_no: formData.hrms_no,
      full_name: formData.full_name,
      job_position: formData.job_position,
      department: formData.department,
      joining_date: formData.joining_date,
      manager: formData.manager || undefined,
      work_email: formData.work_email,
      work_phone: formData.work_phone,
      nationality: formData.nationality || undefined,
      basic_salary: parseFloat(formData.basic_salary) || undefined,
      allowance: parseFloat(formData.allowance) || undefined,
      status: formData.status,
      contract_type: formData.contract_type,
      visa_no: formData.visa_no || undefined,
      visa_expiration: formData.visa_expiration || undefined,
      emirates_id: formData.emirates_id || undefined,
      emirates_id_expiry: formData.emirates_id_expiry || undefined,
      passport_no: formData.passport_no || undefined,
      passport_expiry: formData.passport_expiry || undefined,
      bank_name: formData.bank_name || undefined,
      iban: formData.iban || undefined,
      bank_account_no: formData.bank_account_no || undefined,
      emergency_contact_name: formData.emergency_contact_name || undefined,
      emergency_contact_phone: formData.emergency_contact_phone || undefined,
      emergency_contact_relationship: formData.emergency_contact_relationship || undefined,
    } as any, {
      onSuccess: () => {
        onClose();
      }
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Check if email changed and employee has linked account
    if (hasEmailChanged() && hasLinkedAccount()) {
      setPendingSubmit(true);
      setShowEmailChangeDialog(true);
      return;
    }

    // No email change or no linked account - proceed directly
    performUpdate();
  };

  const handleEmailDialogAction = async (action: 'sync' | 'reset' | 'skip') => {
    setEmailChangeAction(action);
    
    if (action === 'sync') {
      const success = await handleSyncEmail();
      if (success) {
        setShowEmailChangeDialog(false);
        performUpdate();
      }
    } else if (action === 'reset') {
      const success = await handleResetAccount();
      if (success) {
        setShowEmailChangeDialog(false);
        performUpdate();
      }
    } else {
      // Skip - just update employee record without syncing auth
      setShowEmailChangeDialog(false);
      performUpdate();
    }
    
    setPendingSubmit(false);
    setEmailChangeAction(null);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto glass-card border-border soft-scroll">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-foreground">Edit Employee</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">HRMS No *</Label>
                <Input
                  required
                  value={formData.hrms_no}
                  onChange={(e) => setFormData({ ...formData, hrms_no: e.target.value })}
                  className="bg-secondary/50 border-border"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Full Name *</Label>
                <Input
                  required
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="bg-secondary/50 border-border"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Job Position *</Label>
                <Input
                  required
                  value={formData.job_position}
                  onChange={(e) => setFormData({ ...formData, job_position: e.target.value })}
                  className="bg-secondary/50 border-border"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Department *</Label>
                <Input
                  required
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="bg-secondary/50 border-border"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Joining Date *</Label>
                <Input
                  type="date"
                  required
                  value={formData.joining_date}
                  onChange={(e) => setFormData({ ...formData, joining_date: e.target.value })}
                  className="bg-secondary/50 border-border"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Manager</Label>
                <Input
                  value={formData.manager}
                  onChange={(e) => setFormData({ ...formData, manager: e.target.value })}
                  className="bg-secondary/50 border-border"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground flex items-center gap-2">
                  Work Email *
                  {hasLinkedAccount() && hasEmailChanged() && (
                    <span className="text-amber-500 text-[10px] flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Account linked - email change requires sync
                    </span>
                  )}
                </Label>
                <Input
                  type="email"
                  required
                  value={formData.work_email}
                  onChange={(e) => setFormData({ ...formData, work_email: e.target.value })}
                  className="bg-secondary/50 border-border"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Work Phone *</Label>
                <Input
                  required
                  value={formData.work_phone}
                  onChange={(e) => setFormData({ ...formData, work_phone: e.target.value })}
                  className="bg-secondary/50 border-border"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Nationality</Label>
                <Input
                  value={formData.nationality}
                  onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                  className="bg-secondary/50 border-border"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: 'Active' | 'On Leave' | 'Terminated') => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger className="bg-secondary/50 border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="On Leave">On Leave</SelectItem>
                    <SelectItem value="Terminated">Terminated</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Contract Type</Label>
                <Select
                  value={formData.contract_type}
                  onValueChange={(value) => setFormData({ ...formData, contract_type: value })}
                >
                  <SelectTrigger className="bg-secondary/50 border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Unlimited">Unlimited</SelectItem>
                    <SelectItem value="Limited">Limited</SelectItem>
                    <SelectItem value="Part-time">Part-time</SelectItem>
                    <SelectItem value="Temporary">Temporary</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="pt-4 border-t border-border">
              <h3 className="text-sm font-semibold text-foreground mb-3">Salary & Benefits</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Basic Salary (AED)</Label>
                  <Input
                    type="number"
                    value={formData.basic_salary}
                    onChange={(e) => setFormData({ ...formData, basic_salary: e.target.value })}
                    className="bg-secondary/50 border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Allowance (AED)</Label>
                  <Input
                    type="number"
                    value={formData.allowance}
                    onChange={(e) => setFormData({ ...formData, allowance: e.target.value })}
                    className="bg-secondary/50 border-border"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-border">
              <h3 className="text-sm font-semibold text-foreground mb-3">Visa & ID</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Visa No</Label>
                  <Input
                    value={formData.visa_no}
                    onChange={(e) => setFormData({ ...formData, visa_no: e.target.value })}
                    className="bg-secondary/50 border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Visa Expiration</Label>
                  <Input
                    type="date"
                    value={formData.visa_expiration}
                    onChange={(e) => setFormData({ ...formData, visa_expiration: e.target.value })}
                    className="bg-secondary/50 border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Emirates ID</Label>
                  <Input
                    value={formData.emirates_id}
                    onChange={(e) => setFormData({ ...formData, emirates_id: e.target.value })}
                    className="bg-secondary/50 border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Emirates ID Expiry</Label>
                  <Input
                    type="date"
                    value={formData.emirates_id_expiry}
                    onChange={(e) => setFormData({ ...formData, emirates_id_expiry: e.target.value })}
                    className="bg-secondary/50 border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Passport No</Label>
                  <Input
                    value={formData.passport_no}
                    onChange={(e) => setFormData({ ...formData, passport_no: e.target.value })}
                    className="bg-secondary/50 border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Passport Expiry</Label>
                  <Input
                    type="date"
                    value={formData.passport_expiry}
                    onChange={(e) => setFormData({ ...formData, passport_expiry: e.target.value })}
                    className="bg-secondary/50 border-border"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-border">
              <h3 className="text-sm font-semibold text-foreground mb-3">Bank Details (WPS)</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Bank Name</Label>
                  <Input
                    value={formData.bank_name}
                    onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                    placeholder="Emirates NBD"
                    className="bg-secondary/50 border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">IBAN</Label>
                  <Input
                    value={formData.iban}
                    onChange={(e) => setFormData({ ...formData, iban: e.target.value })}
                    placeholder="AE070331234567890123456"
                    className="bg-secondary/50 border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Account Number</Label>
                  <Input
                    value={formData.bank_account_no}
                    onChange={(e) => setFormData({ ...formData, bank_account_no: e.target.value })}
                    placeholder="1234567890123"
                    className="bg-secondary/50 border-border"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-border">
              <h3 className="text-sm font-semibold text-destructive mb-3">Emergency Contact</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Contact Name</Label>
                  <Input
                    value={formData.emergency_contact_name}
                    onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })}
                    placeholder="John Doe"
                    className="bg-secondary/50 border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Phone Number</Label>
                  <Input
                    value={formData.emergency_contact_phone}
                    onChange={(e) => setFormData({ ...formData, emergency_contact_phone: e.target.value })}
                    placeholder="+971 50 XXX XXXX"
                    className="bg-secondary/50 border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Relationship</Label>
                  <Select
                    value={formData.emergency_contact_relationship}
                    onValueChange={(value) => setFormData({ ...formData, emergency_contact_relationship: value })}
                  >
                    <SelectTrigger className="bg-secondary/50 border-border">
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Spouse">Spouse</SelectItem>
                      <SelectItem value="Parent">Parent</SelectItem>
                      <SelectItem value="Sibling">Sibling</SelectItem>
                      <SelectItem value="Child">Child</SelectItem>
                      <SelectItem value="Friend">Friend</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-4 border-t border-border">
              <Button 
                type="submit" 
                className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
                disabled={updateEmployee.isPending}
              >
                {updateEmployee.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save Changes
              </Button>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Email Change Confirmation Dialog */}
      <AlertDialog open={showEmailChangeDialog} onOpenChange={setShowEmailChangeDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-amber-500">
              <AlertTriangle className="w-5 h-5" />
              Email Change Detected
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>This employee has a linked login account. The email is changing:</p>
                <div className="bg-muted p-3 rounded-lg text-sm space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Old:</span>
                    <span className="font-mono text-foreground">{employee.work_email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">New:</span>
                    <span className="font-mono text-foreground">{formData.work_email}</span>
                  </div>
                </div>
                <p className="text-muted-foreground">How would you like to proceed?</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => handleEmailDialogAction('skip')}
              disabled={isProcessingEmail}
              className="w-full sm:w-auto"
            >
              <X className="w-4 h-4 mr-2" />
              Skip (Keep old login)
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleEmailDialogAction('reset')}
              disabled={isProcessingEmail}
              className="w-full sm:w-auto"
            >
              {isProcessingEmail && emailChangeAction === 'reset' ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Reset Account
            </Button>
            <Button
              onClick={() => handleEmailDialogAction('sync')}
              disabled={isProcessingEmail}
              className="w-full sm:w-auto"
            >
              {isProcessingEmail && emailChangeAction === 'sync' ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Mail className="w-4 h-4 mr-2" />
              )}
              Sync Email
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
