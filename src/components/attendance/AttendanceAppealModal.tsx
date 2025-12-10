import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Clock, AlertTriangle, Send } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { useAddAttendanceAppeal } from '@/hooks/useAttendanceAppeals';

interface AttendanceRecord {
  id: string;
  date: string;
  check_in: string | null;
  check_out: string | null;
  status: string | null;
}

interface AttendanceAppealModalProps {
  open: boolean;
  onClose: () => void;
  date: Date;
  attendance: AttendanceRecord | null;
  employeeId: string;
}

export function AttendanceAppealModal({
  open,
  onClose,
  date,
  attendance,
  employeeId,
}: AttendanceAppealModalProps) {
  const addAppeal = useAddAttendanceAppeal();
  const [appealForm, setAppealForm] = useState({
    check_in: attendance?.check_in || '',
    check_out: attendance?.check_out || '',
    message: '',
  });

  const isMissedPunch = attendance && (!attendance.check_in || !attendance.check_out);

  const handleSubmit = () => {
    if (!appealForm.message.trim()) {
      return;
    }

    addAppeal.mutate({
      attendance_id: attendance?.id || null,
      employee_id: employeeId,
      appeal_date: format(date, 'yyyy-MM-dd'),
      requested_check_in: appealForm.check_in || null,
      requested_check_out: appealForm.check_out || null,
      appeal_message: appealForm.message,
    }, {
      onSuccess: () => {
        setAppealForm({ check_in: '', check_out: '', message: '' });
        onClose();
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            Submit Time Correction Appeal
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="p-3 rounded-lg bg-secondary/50 border border-border">
            <p className="text-sm text-muted-foreground">
              Date: <span className="font-medium text-foreground">{format(date, 'EEEE, MMMM d, yyyy')}</span>
            </p>
            {attendance && (
              <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Current Check In: </span>
                  <span className={cn(!attendance.check_in && "text-orange-500")}>
                    {attendance.check_in ? format(parseISO(`2000-01-01T${attendance.check_in}`), 'hh:mm a') : 'Missing'}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Current Check Out: </span>
                  <span className={cn(!attendance.check_out && "text-orange-500")}>
                    {attendance.check_out ? format(parseISO(`2000-01-01T${attendance.check_out}`), 'hh:mm a') : 'Missing'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {isMissedPunch && (
            <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/30">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-500" />
                <span className="text-sm text-orange-500 font-medium">Missed Punch Detected</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Please enter the correct time and provide a reason for the missed punch.
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" /> Corrected Check In
              </label>
              <Input
                type="time"
                value={appealForm.check_in}
                onChange={(e) => setAppealForm({ ...appealForm, check_in: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" /> Corrected Check Out
              </label>
              <Input
                type="time"
                value={appealForm.check_out}
                onChange={(e) => setAppealForm({ ...appealForm, check_out: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground">Appeal Message *</label>
            <Textarea
              value={appealForm.message}
              onChange={(e) => setAppealForm({ ...appealForm, message: e.target.value })}
              placeholder="Please explain why you need this time correction..."
              rows={4}
              required
            />
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={!appealForm.message.trim() || addAppeal.isPending}
              className="flex-1"
            >
              <Send className="w-4 h-4 mr-2" />
              {addAppeal.isPending ? 'Submitting...' : 'Submit Appeal'}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Your appeal will be reviewed by HR. You'll be notified once it's processed.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
