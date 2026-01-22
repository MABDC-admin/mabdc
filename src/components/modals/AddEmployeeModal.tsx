import { useState } from 'react';
import { useAddEmployee } from '@/hooks/useEmployees';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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

interface AddEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AddEmployeeModal({ isOpen, onClose }: AddEmployeeModalProps) {
  const addEmployee = useAddEmployee();
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
    status: 'Active' as const,
    contract_type: 'Unlimited',
    visa_no: '',
    visa_expiration: '',
    emirates_id: '',
    bank_name: '',
    iban: '',
    bank_account_no: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    emergency_contact_relationship: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    addEmployee.mutate({
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
      bank_name: formData.bank_name || undefined,
      iban: formData.iban || undefined,
      bank_account_no: formData.bank_account_no || undefined,
      emergency_contact_name: formData.emergency_contact_name || undefined,
      emergency_contact_phone: formData.emergency_contact_phone || undefined,
      emergency_contact_relationship: formData.emergency_contact_relationship || undefined,
    }, {
      onSuccess: () => {
        onClose();
        setFormData({
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
          status: 'Active',
          contract_type: 'Unlimited',
          visa_no: '',
          visa_expiration: '',
          emirates_id: '',
          bank_name: '',
          iban: '',
          bank_account_no: '',
          emergency_contact_name: '',
          emergency_contact_phone: '',
          emergency_contact_relationship: '',
        });
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto glass-card border-border soft-scroll">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-foreground">Add New Employee</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">HRMS No *</Label>
              <Input
                required
                value={formData.hrms_no}
                onChange={(e) => setFormData({ ...formData, hrms_no: e.target.value })}
                placeholder="0001"
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
              <Label className="text-xs text-muted-foreground">Work Email *</Label>
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
                placeholder="+971 50 123 4567"
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  placeholder="784-xxxx-xxxxxxx-x"
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
              disabled={addEmployee.isPending}
            >
              {addEmployee.isPending ? 'Adding...' : 'Add Employee'}
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
