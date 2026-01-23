import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { 
  Clock, Trash2, Edit, User, Calendar, AlertTriangle, 
  Search, Filter, CalendarIcon
} from 'lucide-react';
import { format, parseISO, isToday, isThisWeek, isThisMonth, startOfDay, endOfDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { useAttendanceAppeals, useUpdateAttendanceAppeal, useDeleteAttendanceAppeal } from '@/hooks/useAttendanceAppeals';
import { useEmployees } from '@/hooks/useEmployees';
import { toast } from 'sonner';
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
import { Label } from '@/components/ui/label';

export function AdminAppealsSection() {
  const { data: appeals = [], isLoading } = useAttendanceAppeals();
  const { data: employees = [] } = useEmployees();
  const updateAppeal = useUpdateAttendanceAppeal();
  const deleteAppeal = useDeleteAttendanceAppeal();
  
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [customDateRange, setCustomDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({ from: undefined, to: undefined });
  const [searchQuery, setSearchQuery] = useState('');
  const [editAppeal, setEditAppeal] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  const [editForm, setEditForm] = useState({
    appeal_date: '',
    requested_check_in: '',
    requested_check_out: '',
    appeal_message: '',
    status: '',
    rejection_reason: '',
  });

  const getEmployeeName = (employeeId: string) => {
    const emp = employees.find(e => e.id === employeeId);
    return emp?.full_name || 'Unknown Employee';
  };

  const getEmployeePhoto = (employeeId: string) => {
    const emp = employees.find(e => e.id === employeeId);
    return emp?.photo_url;
  };

  const filteredAppeals = appeals.filter(appeal => {
    const matchesStatus = statusFilter === 'all' || appeal.status === statusFilter;
    const employeeName = getEmployeeName(appeal.employee_id).toLowerCase();
    const matchesSearch = employeeName.includes(searchQuery.toLowerCase()) ||
      appeal.appeal_message.toLowerCase().includes(searchQuery.toLowerCase());
    
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
    
    return matchesStatus && matchesSearch && matchesDate;
  });

  const handleEdit = (appeal: any) => {
    setEditAppeal(appeal);
    setEditForm({
      appeal_date: appeal.appeal_date,
      requested_check_in: appeal.requested_check_in || '',
      requested_check_out: appeal.requested_check_out || '',
      appeal_message: appeal.appeal_message,
      status: appeal.status,
      rejection_reason: appeal.rejection_reason || '',
    });
  };

  const handleSaveEdit = async () => {
    if (!editAppeal) return;
    
    try {
      await updateAppeal.mutateAsync({
        id: editAppeal.id,
        appeal_date: editForm.appeal_date,
        requested_check_in: editForm.requested_check_in || null,
        requested_check_out: editForm.requested_check_out || null,
        appeal_message: editForm.appeal_message,
        status: editForm.status,
        rejection_reason: editForm.status === 'Rejected' ? editForm.rejection_reason : null,
        reviewed_by: editForm.status !== 'Pending' ? 'Admin' : null,
        reviewed_at: editForm.status !== 'Pending' ? new Date().toISOString() : null,
      });
      toast.success('Appeal updated successfully');
      setEditAppeal(null);
    } catch (error) {
      toast.error('Failed to update appeal');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    
    try {
      await deleteAppeal.mutateAsync(deleteId);
      setDeleteId(null);
    } catch (error) {
      toast.error('Failed to delete appeal');
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Attendance Appeals Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by employee or message..."
                className="pl-10"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Filter status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Approved">Approved</SelectItem>
                  <SelectItem value="Rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
              <Select value={dateFilter} onValueChange={(v) => {
                setDateFilter(v);
                if (v !== 'custom') {
                  setCustomDateRange({ from: undefined, to: undefined });
                }
              }}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Date range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
              {dateFilter === 'custom' && (
                <>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-1 h-9">
                        <CalendarIcon className="w-3 h-3" />
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
                      <Button variant="outline" size="sm" className="gap-1 h-9">
                        <CalendarIcon className="w-3 h-3" />
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
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg bg-muted/50 border border-border">
              <p className="text-2xl font-bold text-foreground">{appeals.length}</p>
              <p className="text-xs text-muted-foreground">Total Appeals</p>
            </div>
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
              <p className="text-2xl font-bold text-amber-500">{appeals.filter(a => a.status === 'Pending').length}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </div>
            <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30">
              <p className="text-2xl font-bold text-green-500">{appeals.filter(a => a.status === 'Approved').length}</p>
              <p className="text-xs text-muted-foreground">Approved</p>
            </div>
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
              <p className="text-2xl font-bold text-red-500">{appeals.filter(a => a.status === 'Rejected').length}</p>
              <p className="text-xs text-muted-foreground">Rejected</p>
            </div>
          </div>

          {/* Appeals List */}
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
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {filteredAppeals.map((appeal) => {
                const employeePhoto = getEmployeePhoto(appeal.employee_id);
                const employeeName = getEmployeeName(appeal.employee_id);
                
                return (
                  <div
                    key={appeal.id}
                    className={cn(
                      "p-4 rounded-lg border transition-all",
                      appeal.status === 'Pending' && "bg-amber-500/5 border-amber-500/30",
                      appeal.status === 'Approved' && "bg-green-500/5 border-green-500/30",
                      appeal.status === 'Rejected' && "bg-red-500/5 border-red-500/30"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1">
                        {employeePhoto ? (
                          <img src={employeePhoto} alt={employeeName} className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                            <User className="w-5 h-5 text-primary" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-foreground">{employeeName}</p>
                            <Badge className={cn(
                              "text-[10px]",
                              appeal.status === 'Pending' && "bg-amber-500/20 text-amber-500",
                              appeal.status === 'Approved' && "bg-green-500/20 text-green-500",
                              appeal.status === 'Rejected' && "bg-red-500/20 text-red-500"
                            )}>
                              {appeal.status}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                            <Calendar className="w-3 h-3" />
                            <span>{format(parseISO(appeal.appeal_date), 'dd MMM yyyy')}</span>
                            {appeal.requested_check_in && (
                              <span className="text-xs">• {appeal.requested_check_in} - {appeal.requested_check_out || 'N/A'}</span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">"{appeal.appeal_message}"</p>
                          {appeal.rejection_reason && (
                            <p className="text-xs text-red-500 mt-1">Reason: {appeal.rejection_reason}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={() => handleEdit(appeal)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setDeleteId(appeal.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editAppeal} onOpenChange={() => setEditAppeal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Appeal</DialogTitle>
          </DialogHeader>
          
          {editAppeal && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                {getEmployeePhoto(editAppeal.employee_id) ? (
                  <img 
                    src={getEmployeePhoto(editAppeal.employee_id)} 
                    alt={getEmployeeName(editAppeal.employee_id)} 
                    className="w-10 h-10 rounded-full object-cover" 
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                )}
                <div>
                  <p className="font-medium">{getEmployeeName(editAppeal.employee_id)}</p>
                  <p className="text-xs text-muted-foreground">Created: {format(parseISO(editAppeal.created_at), 'dd MMM yyyy HH:mm')}</p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <Label>Appeal Date</Label>
                  <Input
                    type="date"
                    value={editForm.appeal_date}
                    onChange={(e) => setEditForm({ ...editForm, appeal_date: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Requested Check In</Label>
                    <Input
                      type="time"
                      value={editForm.requested_check_in}
                      onChange={(e) => setEditForm({ ...editForm, requested_check_in: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Requested Check Out</Label>
                    <Input
                      type="time"
                      value={editForm.requested_check_out}
                      onChange={(e) => setEditForm({ ...editForm, requested_check_out: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <Label>Appeal Message</Label>
                  <Textarea
                    value={editForm.appeal_message}
                    onChange={(e) => setEditForm({ ...editForm, appeal_message: e.target.value })}
                    rows={3}
                  />
                </div>

                <div>
                  <Label>Status</Label>
                  <Select value={editForm.status} onValueChange={(v) => setEditForm({ ...editForm, status: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pending">Pending</SelectItem>
                      <SelectItem value="Approved">Approved</SelectItem>
                      <SelectItem value="Rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {editForm.status === 'Rejected' && (
                  <div>
                    <Label>Rejection Reason</Label>
                    <Textarea
                      value={editForm.rejection_reason}
                      onChange={(e) => setEditForm({ ...editForm, rejection_reason: e.target.value })}
                      placeholder="Enter reason for rejection..."
                      rows={2}
                    />
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setEditAppeal(null)}>Cancel</Button>
                <Button onClick={handleSaveEdit} disabled={updateAppeal.isPending}>
                  {updateAppeal.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Appeal</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this appeal? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}