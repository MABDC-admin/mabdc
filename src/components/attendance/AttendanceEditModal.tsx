import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Clock, MessageSquare, Save } from 'lucide-react';

interface AttendanceRecord {
  id: string;
  employee_id: string;
  date: string;
  check_in?: string;
  check_out?: string;
  status: string;
  employee_remarks?: string;
  admin_remarks?: string;
  employees?: {
    full_name: string;
    hrms_no: string;
  };
}

interface AttendanceEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: AttendanceRecord | null;
  onSave: (data: {
    id: string;
    check_in?: string;
    check_out?: string;
    status?: string;
    employee_remarks?: string;
    admin_remarks?: string;
  }) => void;
  isAdmin?: boolean;
}

export function AttendanceEditModal({ 
  isOpen, 
  onClose, 
  record, 
  onSave,
  isAdmin = true 
}: AttendanceEditModalProps) {
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [status, setStatus] = useState('');
  const [employeeRemarks, setEmployeeRemarks] = useState('');
  const [adminRemarks, setAdminRemarks] = useState('');

  useEffect(() => {
    if (record) {
      setCheckIn(record.check_in || '');
      setCheckOut(record.check_out || '');
      setStatus(record.status || 'Present');
      setEmployeeRemarks(record.employee_remarks || '');
      setAdminRemarks(record.admin_remarks || '');
    }
  }, [record]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!record) return;

    onSave({
      id: record.id,
      check_in: checkIn || undefined,
      check_out: checkOut || undefined,
      status: status,
      employee_remarks: employeeRemarks || undefined,
      admin_remarks: adminRemarks || undefined,
    });
    onClose();
  };

  if (!record) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="glass-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            {isAdmin ? 'Edit Attendance' : 'Add Remark'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-3 rounded-lg bg-secondary/30 border border-border">
            <p className="text-sm font-medium text-foreground">{record.employees?.full_name}</p>
            <p className="text-xs text-muted-foreground">
              {record.employees?.hrms_no} • {new Date(record.date).toLocaleDateString('en-GB')}
            </p>
          </div>

          {isAdmin && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Check In</Label>
                  <Input
                    type="time"
                    value={checkIn}
                    onChange={(e) => setCheckIn(e.target.value)}
                    className="bg-secondary/50 border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Check Out</Label>
                  <Input
                    type="time"
                    value={checkOut}
                    onChange={(e) => setCheckOut(e.target.value)}
                    className="bg-secondary/50 border-border"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full p-2 rounded-lg bg-secondary/50 border border-border text-foreground"
                >
                  <option value="Present">Present</option>
                  <option value="Late">Late</option>
                  <option value="Absent">Absent</option>
                  <option value="Half Day">Half Day</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-primary" />
                  Admin Remarks
                </Label>
                <Textarea
                  value={adminRemarks}
                  onChange={(e) => setAdminRemarks(e.target.value)}
                  placeholder="Add admin remarks (e.g., approved time correction)..."
                  className="bg-secondary/50 border-border min-h-[80px]"
                />
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-accent" />
              Employee Remarks
            </Label>
            <Textarea
              value={employeeRemarks}
              onChange={(e) => setEmployeeRemarks(e.target.value)}
              placeholder="Add reason for missed punch or time correction..."
              className="bg-secondary/50 border-border min-h-[80px]"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" className="flex-1 bg-primary hover:bg-primary/90">
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
