import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { 
  Clock, CheckCircle, XCircle, AlertTriangle, 
  User, Calendar, MessageSquare, Filter
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { useAttendanceAppeals, useUpdateAttendanceAppeal } from '@/hooks/useAttendanceAppeals';
import { useEmployees } from '@/hooks/useEmployees';
import { useUpdateAttendance, useCreateAttendance } from '@/hooks/useAttendance';
import { toast } from 'sonner';

export function AttendanceAppealsView() {
  const { data: appeals = [], isLoading } = useAttendanceAppeals();
  const { data: employees = [] } = useEmployees();
  const updateAppeal = useUpdateAttendanceAppeal();
  const updateAttendance = useUpdateAttendance();
  const createAttendance = useCreateAttendance();
  
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedAppeal, setSelectedAppeal] = useState<any>(null);
  const [reviewForm, setReviewForm] = useState({ action: '', reason: '' });

  const filteredAppeals = appeals.filter(appeal => 
    statusFilter === 'all' || appeal.status === statusFilter
  );

  const getEmployeeName = (employeeId: string) => {
    const emp = employees.find(e => e.id === employeeId);
    return emp?.full_name || 'Unknown Employee';
  };

  const getEmployeePhoto = (employeeId: string) => {
    const emp = employees.find(e => e.id === employeeId);
    return emp?.photo_url;
  };

  const [confirmReject, setConfirmReject] = useState(false);

  const handleReview = async (action: 'approve' | 'reject') => {
    if (!selectedAppeal) return;
    
    if (action === 'reject') {
      if (!reviewForm.reason.trim()) {
        toast.error('Please provide a reason for rejection');
        return;
      }
      // Show confirmation for rejection
      if (!confirmReject) {
        setConfirmReject(true);
        return;
      }
    }

    try {
      // Update appeal status
      await updateAppeal.mutateAsync({
        id: selectedAppeal.id,
        status: action === 'approve' ? 'Approved' : 'Rejected',
        reviewed_by: 'HR',
        reviewed_at: new Date().toISOString(),
        rejection_reason: action === 'reject' ? reviewForm.reason : null,
      });

      // If approved, update or create the attendance record with "Appealed" status
      if (action === 'approve') {
        if (selectedAppeal.attendance_id) {
          // Update existing attendance record
          await updateAttendance.mutateAsync({
            id: selectedAppeal.attendance_id,
            check_in: selectedAppeal.requested_check_in,
            check_out: selectedAppeal.requested_check_out,
            status: 'Appealed',
            admin_remarks: `[Appeal Approved] Time corrected: ${selectedAppeal.appeal_message}`,
          });
        } else {
          // Create new attendance record if none exists
          await createAttendance.mutateAsync({
            employee_id: selectedAppeal.employee_id,
            date: selectedAppeal.appeal_date,
            check_in: selectedAppeal.requested_check_in,
            check_out: selectedAppeal.requested_check_out,
            status: 'Appealed',
            admin_remarks: `[Appeal Approved] Time corrected: ${selectedAppeal.appeal_message}`,
          });
        }
      }

      setSelectedAppeal(null);
      setReviewForm({ action: '', reason: '' });
      setConfirmReject(false);
      toast.success(`Appeal ${action === 'approve' ? 'approved' : 'rejected'} successfully`);
    } catch (error) {
      toast.error('Failed to process appeal');
    }
  };

  const pendingCount = appeals.filter(a => a.status === 'Pending').length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Attendance Appeals</h1>
          <p className="text-sm text-muted-foreground">
            Review and manage employee time correction requests
          </p>
        </div>
        {pendingCount > 0 && (
          <Badge variant="destructive" className="animate-pulse">
            {pendingCount} Pending
          </Badge>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/20">
                <Clock className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-500">
                  {appeals.filter(a => a.status === 'Pending').length}
                </p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/20">
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-500">
                  {appeals.filter(a => a.status === 'Approved').length}
                </p>
                <p className="text-xs text-muted-foreground">Approved</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/20">
                <XCircle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-500">
                  {appeals.filter(a => a.status === 'Rejected').length}
                </p>
                <p className="text-xs text-muted-foreground">Rejected</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/20">
                <MessageSquare className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-primary">{appeals.length}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <Filter className="w-4 h-4 text-muted-foreground" />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Appeals</SelectItem>
            <SelectItem value="Pending">Pending</SelectItem>
            <SelectItem value="Approved">Approved</SelectItem>
            <SelectItem value="Rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Appeals List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Appeals List</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-muted-foreground">Loading appeals...</p>
            </div>
          ) : filteredAppeals.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertTriangle className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No appeals found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAppeals.map((appeal) => {
                const employeePhoto = getEmployeePhoto(appeal.employee_id);
                const employeeName = getEmployeeName(appeal.employee_id);
                
                return (
                  <div
                    key={appeal.id}
                    onClick={() => appeal.status === 'Pending' && setSelectedAppeal(appeal)}
                    className={cn(
                      "p-4 rounded-lg border transition-all",
                      appeal.status === 'Pending' 
                        ? "bg-amber-500/5 border-amber-500/30 cursor-pointer hover:bg-amber-500/10" 
                        : appeal.status === 'Approved'
                        ? "bg-green-500/5 border-green-500/30"
                        : "bg-red-500/5 border-red-500/30"
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        {employeePhoto ? (
                          <img src={employeePhoto} alt={employeeName} className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                            <User className="w-5 h-5 text-primary" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-foreground">{employeeName}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                            <Calendar className="w-3 h-3" />
                            <span>{format(parseISO(appeal.appeal_date), 'dd MMM yyyy')}</span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                            "{appeal.appeal_message}"
                          </p>
                          {appeal.requested_check_in && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Requested: {appeal.requested_check_in} - {appeal.requested_check_out || 'N/A'}
                            </p>
                          )}
                        </div>
                      </div>
                      <Badge className={cn(
                        appeal.status === 'Pending' && "bg-amber-500/20 text-amber-500 animate-pulse",
                        appeal.status === 'Approved' && "bg-green-500/20 text-green-500",
                        appeal.status === 'Rejected' && "bg-red-500/20 text-red-500"
                      )}>
                        {appeal.status}
                      </Badge>
                    </div>
                    
                    {appeal.status !== 'Pending' && appeal.reviewed_at && (
                      <div className="mt-3 pt-3 border-t border-border">
                        <p className="text-xs text-muted-foreground">
                          Reviewed by {appeal.reviewed_by} on {format(parseISO(appeal.reviewed_at), 'dd MMM yyyy HH:mm')}
                        </p>
                        {appeal.rejection_reason && (
                          <p className="text-xs text-red-500 mt-1">Reason: {appeal.rejection_reason}</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Review Dialog */}
      <Dialog open={!!selectedAppeal} onOpenChange={(open) => {
        if (!open) {
          setSelectedAppeal(null);
          setConfirmReject(false);
          setReviewForm({ action: '', reason: '' });
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{confirmReject ? 'Confirm Rejection' : 'Review Appeal'}</DialogTitle>
          </DialogHeader>
          
          {selectedAppeal && (
            <div className="space-y-4 mt-4">
              {confirmReject ? (
                // Rejection confirmation view
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30">
                    <p className="text-sm text-center text-red-500 font-medium">
                      Are you sure you want to reject this appeal?
                    </p>
                    <p className="text-xs text-center text-muted-foreground mt-2">
                      Employee: {getEmployeeName(selectedAppeal.employee_id)}
                    </p>
                    <p className="text-xs text-center text-muted-foreground">
                      Date: {format(parseISO(selectedAppeal.appeal_date), 'dd MMM yyyy')}
                    </p>
                  </div>
                  
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground mb-1">Your Rejection Reason:</p>
                    <p className="text-sm font-medium text-red-500">{reviewForm.reason}</p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setConfirmReject(false)}
                      disabled={updateAppeal.isPending}
                      className="flex-1"
                    >
                      Back
                    </Button>
                    <Button
                      onClick={() => handleReview('reject')}
                      disabled={updateAppeal.isPending}
                      className="flex-1 bg-red-500 hover:bg-red-600"
                    >
                      {updateAppeal.isPending ? 'Rejecting...' : 'Confirm Rejection'}
                    </Button>
                  </div>
                </div>
              ) : (
                // Normal review view
                <>
                  <div className="p-4 rounded-lg bg-secondary/50 border border-border">
                    <div className="flex items-center gap-3 mb-3">
                      {getEmployeePhoto(selectedAppeal.employee_id) ? (
                        <img 
                          src={getEmployeePhoto(selectedAppeal.employee_id)} 
                          alt={getEmployeeName(selectedAppeal.employee_id)} 
                          className="w-12 h-12 rounded-full object-cover" 
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                          <User className="w-6 h-6 text-primary" />
                        </div>
                      )}
                      <div>
                        <p className="font-semibold">{getEmployeeName(selectedAppeal.employee_id)}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(parseISO(selectedAppeal.appeal_date), 'EEEE, dd MMM yyyy')}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Requested Check In:</span>
                        <span className="font-medium">{selectedAppeal.requested_check_in || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Requested Check Out:</span>
                        <span className="font-medium">{selectedAppeal.requested_check_out || 'N/A'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground mb-1">Appeal Message:</p>
                    <p className="text-sm">{selectedAppeal.appeal_message}</p>
                  </div>

                  <div>
                    <label className="text-xs text-muted-foreground">Rejection Reason (required for rejection)</label>
                    <Textarea
                      value={reviewForm.reason}
                      onChange={(e) => setReviewForm({ ...reviewForm, reason: e.target.value })}
                      placeholder="Enter reason if rejecting..."
                      rows={3}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => handleReview('reject')}
                      disabled={updateAppeal.isPending}
                      className="flex-1 border-red-500/50 text-red-500 hover:bg-red-500/10"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Reject
                    </Button>
                    <Button
                      onClick={() => handleReview('approve')}
                      disabled={updateAppeal.isPending}
                      className="flex-1 bg-green-500 hover:bg-green-600"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      {updateAppeal.isPending ? 'Approving...' : 'Approve'}
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
