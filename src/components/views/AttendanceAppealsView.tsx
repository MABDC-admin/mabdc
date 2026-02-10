import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { 
  Clock, CheckCircle, XCircle, AlertTriangle, 
  User, Calendar, MessageSquare, Filter, CalendarIcon
} from 'lucide-react';
import { format, parseISO, isToday, isThisWeek, isThisMonth, startOfDay, endOfDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { useAttendanceAppeals, useUpdateAttendanceAppeal } from '@/hooks/useAttendanceAppeals';
import { useEmployees } from '@/hooks/useEmployees';
import { useUpdateAttendance, useCreateAttendance } from '@/hooks/useAttendance';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getEmployeeShiftTimes, computeAttendanceStatus } from '@/utils/shiftValidation';

export function AttendanceAppealsView() {
  const { data: appeals = [], isLoading } = useAttendanceAppeals();
  const { data: employees = [] } = useEmployees();
  const updateAppeal = useUpdateAttendanceAppeal();
  const updateAttendance = useUpdateAttendance();
  const createAttendance = useCreateAttendance();
  
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [employeeFilter, setEmployeeFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [customDateRange, setCustomDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({ from: undefined, to: undefined });
  const [selectedAppeal, setSelectedAppeal] = useState<any>(null);
  const [reviewForm, setReviewForm] = useState({ action: '', reason: '' });

  const filteredAppeals = appeals.filter(appeal => {
    const matchesStatus = statusFilter === 'all' || appeal.status === statusFilter;
    const matchesEmployee = employeeFilter === 'all' || appeal.employee_id === employeeFilter;
    
    // Date filter logic
    const appealDate = parseISO(appeal.appeal_date);
    let matchesDate = true;
    if (dateFilter === 'today') {
      matchesDate = isToday(appealDate);
    } else if (dateFilter === 'week') {
      matchesDate = isThisWeek(appealDate, { weekStartsOn: 1 });
    } else if (dateFilter === 'month') {
      matchesDate = isThisMonth(appealDate);
    } else if (dateFilter === 'custom' && customDateRange.from) {
      const fromDate = startOfDay(customDateRange.from);
      const toDate = customDateRange.to ? endOfDay(customDateRange.to) : endOfDay(customDateRange.from);
      matchesDate = appealDate >= fromDate && appealDate <= toDate;
    }
    
    return matchesStatus && matchesEmployee && matchesDate;
  });

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
        // Determine final check-in/check-out times
        let finalCheckIn = selectedAppeal.requested_check_in;
        let finalCheckOut = selectedAppeal.requested_check_out;

        if (selectedAppeal.attendance_id) {
          const { data: originalAttendance } = await supabase
            .from('attendance')
            .select('check_in, check_out')
            .eq('id', selectedAppeal.attendance_id)
            .single();

          finalCheckIn = finalCheckIn || originalAttendance?.check_in;
          finalCheckOut = finalCheckOut || originalAttendance?.check_out;
        }

        // Compute real status based on shift times
        const shiftTimes = await getEmployeeShiftTimes(selectedAppeal.employee_id, selectedAppeal.appeal_date);
        const computedStatus = computeAttendanceStatus(finalCheckIn, finalCheckOut, shiftTimes.start, shiftTimes.end);

        const remarks = `[Appeal Approved] Time corrected: ${selectedAppeal.appeal_message}`;

        if (selectedAppeal.attendance_id) {
          await updateAttendance.mutateAsync({
            id: selectedAppeal.attendance_id,
            check_in: finalCheckIn,
            check_out: finalCheckOut,
            status: computedStatus,
            admin_remarks: remarks,
          });
        } else {
          await createAttendance.mutateAsync({
            employee_id: selectedAppeal.employee_id,
            date: selectedAppeal.appeal_date,
            check_in: finalCheckIn,
            check_out: finalCheckOut,
            status: computedStatus,
            admin_remarks: remarks,
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
      <div className="flex flex-wrap items-center gap-4">
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
        <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by employee" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Employees</SelectItem>
            {employees.map(emp => (
              <SelectItem key={emp.id} value={emp.id}>{emp.full_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={dateFilter} onValueChange={(v) => {
          setDateFilter(v);
          if (v !== 'custom') {
            setCustomDateRange({ from: undefined, to: undefined });
          }
        }}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Date range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Time</SelectItem>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
            <SelectItem value="custom">Custom Range</SelectItem>
          </SelectContent>
        </Select>
        {dateFilter === 'custom' && (
          <>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <CalendarIcon className="w-4 h-4" />
                  {customDateRange.from ? format(customDateRange.from, 'dd MMM') : 'From'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 z-50 bg-popover" align="start">
                <CalendarComponent
                  mode="single"
                  selected={customDateRange.from}
                  onSelect={(date) => setCustomDateRange(prev => ({ ...prev, from: date }))}
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <CalendarIcon className="w-4 h-4" />
                  {customDateRange.to ? format(customDateRange.to, 'dd MMM') : 'To'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 z-50 bg-popover" align="start">
                <CalendarComponent
                  mode="single"
                  selected={customDateRange.to}
                  onSelect={(date) => setCustomDateRange(prev => ({ ...prev, to: date }))}
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </>
        )}
      </div>

      {/* Appeals List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Appeals List</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
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
            <>
              {/* Column Headers */}
              <div className="flex items-center gap-3 px-4 py-2 text-xs font-medium text-muted-foreground border-b bg-muted/30 sticky top-0">
                <div className="w-7 flex-shrink-0" />
                <div className="w-28 flex-shrink-0">Employee</div>
                <div className="w-24 flex-shrink-0">Date</div>
                <div className="w-28 flex-shrink-0">Time Request</div>
                <div className="flex-1 min-w-0">Message</div>
                <div className="w-20 flex-shrink-0 text-center">Status</div>
                <div className="w-16 flex-shrink-0 text-center">Action</div>
              </div>
              
              {/* Scrollable List */}
              <ScrollArea className="h-[420px]">
                <div className="space-y-1 p-2">
                  <TooltipProvider>
                    {filteredAppeals.map((appeal) => {
                      const employeePhoto = getEmployeePhoto(appeal.employee_id);
                      const employeeName = getEmployeeName(appeal.employee_id);
                      
                      return (
                        <div
                          key={appeal.id}
                          onClick={() => appeal.status === 'Pending' && setSelectedAppeal(appeal)}
                          className={cn(
                            "flex items-center gap-3 px-3 py-2 rounded-md border-l-2 transition-all",
                            appeal.status === 'Pending' 
                              ? "bg-amber-500/5 border-l-amber-500 cursor-pointer hover:bg-amber-500/10" 
                              : appeal.status === 'Approved'
                              ? "bg-green-500/5 border-l-green-500"
                              : "bg-red-500/5 border-l-red-500"
                          )}
                        >
                          {/* Compact Avatar */}
                          <div className="flex-shrink-0">
                            {employeePhoto ? (
                              <img src={employeePhoto} alt={employeeName} className="w-7 h-7 rounded-full object-cover" />
                            ) : (
                              <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center">
                                <User className="w-3.5 h-3.5 text-primary" />
                              </div>
                            )}
                          </div>

                          {/* Name */}
                          <div className="w-28 flex-shrink-0 truncate text-sm font-medium text-foreground">
                            {employeeName}
                          </div>

                          {/* Date */}
                          <div className="w-24 flex-shrink-0 text-xs text-muted-foreground">
                            {format(parseISO(appeal.appeal_date), 'dd MMM yyyy')}
                          </div>

                          {/* Time Request */}
                          <div className="w-28 flex-shrink-0 text-xs font-mono">
                            {appeal.requested_check_in || 'N/A'} → {appeal.requested_check_out || 'N/A'}
                          </div>

                          {/* Message with Tooltip */}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex-1 min-w-0 text-xs text-muted-foreground truncate cursor-default">
                                {appeal.appeal_message}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs">
                              <p className="text-sm">{appeal.appeal_message}</p>
                              {appeal.status !== 'Pending' && appeal.reviewed_at && (
                                <div className="mt-2 pt-2 border-t border-border text-xs text-muted-foreground">
                                  <p>Reviewed by {appeal.reviewed_by}</p>
                                  <p>{format(parseISO(appeal.reviewed_at), 'dd MMM yyyy HH:mm')}</p>
                                  {appeal.rejection_reason && (
                                    <p className="text-red-500 mt-1">Reason: {appeal.rejection_reason}</p>
                                  )}
                                </div>
                              )}
                            </TooltipContent>
                          </Tooltip>

                          {/* Status Badge - Compact */}
                          <div className="w-20 flex-shrink-0 flex justify-center">
                            <Badge className={cn(
                              "text-xs px-2 py-0.5",
                              appeal.status === 'Pending' && "bg-amber-500/20 text-amber-500",
                              appeal.status === 'Approved' && "bg-green-500/20 text-green-500",
                              appeal.status === 'Rejected' && "bg-red-500/20 text-red-500"
                            )}>
                              {appeal.status}
                            </Badge>
                          </div>

                          {/* Review Button (pending only) */}
                          <div className="w-16 flex-shrink-0 flex justify-center">
                            {appeal.status === 'Pending' ? (
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="h-7 px-2 text-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedAppeal(appeal);
                                }}
                              >
                                Review
                              </Button>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </TooltipProvider>
                </div>
              </ScrollArea>
            </>
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
