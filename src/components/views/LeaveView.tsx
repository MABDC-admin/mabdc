import { useState, useMemo } from 'react';
import { useLeave, useLeaveTypes, usePublicHolidays, useUpdateLeaveStatus, useAddLeave, useAddPublicHoliday, useAllocateLeave, useBulkAllocateLeave, useAllLeaveBalances, useLeaveBalances, useUpdateLeaveBalance, useDeleteLeaveBalance } from '@/hooks/useLeave';
import { useProcessLeaveAccrual, useLeaveAccrualLog, calculateAccrualRate } from '@/hooks/useLeaveAccrual';
import { useEmployees } from '@/hooks/useEmployees';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Check, X, Clock, RefreshCw, Plus, Calendar, FileText, AlertCircle, CalendarDays, Users, Wallet, LayoutGrid, Pencil, CalendarX2, Trash2, Sparkles, History } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, differenceInDays, parseISO } from 'date-fns';
import { Checkbox } from '@/components/ui/checkbox';
import { CalendarView } from '@/components/calendar/CalendarView';
import { toast } from 'sonner';

export function LeaveView() {
  const { data: leave = [], isLoading, refetch } = useLeave();
  const { data: leaveTypes = [] } = useLeaveTypes();
  const { data: holidays = [] } = usePublicHolidays();
  const { data: employees = [] } = useEmployees();
  const { data: allBalances = [], refetch: refetchBalances } = useAllLeaveBalances();
  const updateStatus = useUpdateLeaveStatus();
  const addLeave = useAddLeave();
  const addHoliday = useAddPublicHoliday();
  const allocateLeave = useAllocateLeave();
  const bulkAllocate = useBulkAllocateLeave();
  const updateBalance = useUpdateLeaveBalance();
  const deleteBalance = useDeleteLeaveBalance();
  const processAccrual = useProcessLeaveAccrual();
  const { data: accrualLog = [] } = useLeaveAccrualLog(new Date().getFullYear());

  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [isHolidayModalOpen, setIsHolidayModalOpen] = useState(false);
  const [isAllocateModalOpen, setIsAllocateModalOpen] = useState(false);
  const [isBulkAllocateModalOpen, setIsBulkAllocateModalOpen] = useState(false);
  const [isEditBalanceModalOpen, setIsEditBalanceModalOpen] = useState(false);
  const [isAccrualHistoryOpen, setIsAccrualHistoryOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('requests');
  const [filterEmployee, setFilterEmployee] = useState<string>('all');

  const [leaveForm, setLeaveForm] = useState({
    employee_id: '',
    leave_type: '',
    start_date: '',
    end_date: '',
    reason: '',
    is_emergency: false,
  });

  const [holidayForm, setHolidayForm] = useState({
    date: '',
    name: '',
    name_arabic: '',
    is_half_day: false,
  });

  const [allocateForm, setAllocateForm] = useState({
    employee_id: '',
    leave_type_id: '',
    entitled_days: '',
    carried_forward_days: '',
  });

  const [bulkForm, setBulkForm] = useState({
    leave_type_id: '',
    entitled_days: '',
    selected_employees: [] as string[],
  });

  const [editBalanceForm, setEditBalanceForm] = useState({
    id: '',
    employee_name: '',
    leave_type_name: '',
    entitled_days: '',
    carried_forward_days: '',
    used_days: 0,
    pending_days: 0,
  });

  const currentYear = new Date().getFullYear();

  // Check for overlapping leaves in leave request modal
  const selectedEmployeeLeaves = leave.filter(l => 
    l.employee_id === leaveForm.employee_id && 
    (l.status === 'Pending' || l.status === 'Approved')
  );

  const overlappingLeave = useMemo(() => {
    if (!leaveForm.start_date || !leaveForm.end_date || !leaveForm.employee_id) return null;
    
    const startDate = parseISO(leaveForm.start_date);
    const endDate = parseISO(leaveForm.end_date);
    
    return selectedEmployeeLeaves.find(l => {
      const leaveStart = parseISO(l.start_date);
      const leaveEnd = parseISO(l.end_date);
      return startDate <= leaveEnd && endDate >= leaveStart;
    });
  }, [selectedEmployeeLeaves, leaveForm.start_date, leaveForm.end_date, leaveForm.employee_id]);

  // Get leave balance for selected employee and leave type
  const selectedEmployeeBalance = useMemo(() => {
    if (!leaveForm.employee_id || !leaveForm.leave_type) return null;
    const leaveType = leaveTypes.find(lt => lt.name === leaveForm.leave_type);
    if (!leaveType) return null;
    return allBalances.find(b => 
      b.employee_id === leaveForm.employee_id && 
      b.leave_type_id === leaveType.id
    );
  }, [leaveForm.employee_id, leaveForm.leave_type, leaveTypes, allBalances]);

  const hrAvailableDays = useMemo(() => {
    if (!selectedEmployeeBalance) return 0;
    return (selectedEmployeeBalance.entitled_days + selectedEmployeeBalance.carried_forward_days) - 
           selectedEmployeeBalance.used_days - selectedEmployeeBalance.pending_days;
  }, [selectedEmployeeBalance]);

  const hrRequestedDays = useMemo(() => {
    if (!leaveForm.start_date || !leaveForm.end_date) return 0;
    const days = differenceInDays(parseISO(leaveForm.end_date), parseISO(leaveForm.start_date)) + 1;
    return days > 0 ? days : 0;
  }, [leaveForm.start_date, leaveForm.end_date]);

  const hrHasInsufficientBalance = hrRequestedDays > 0 && hrAvailableDays < hrRequestedDays;
  const hrHasOverlap = !!overlappingLeave;
  const hrCanSubmit = hrRequestedDays > 0 && !hrHasInsufficientBalance && !hrHasOverlap && leaveForm.employee_id && leaveForm.leave_type;

  const handleApprove = (id: string) => {
    updateStatus.mutate({ id, status: 'Approved' });
  };

  const handleReject = (id: string) => {
    updateStatus.mutate({ id, status: 'Rejected' });
  };

  const handleSubmitLeave = (e: React.FormEvent) => {
    e.preventDefault();
    const days = differenceInDays(new Date(leaveForm.end_date), new Date(leaveForm.start_date)) + 1;
    
    // Check for overlap
    if (hrHasOverlap) {
      toast.error('Leave dates overlap with an existing request. Please select different dates.');
      return;
    }

    // Check balance
    if (hrHasInsufficientBalance) {
      toast.error('Insufficient leave balance. Please extend allocation first.');
      return;
    }
    
    addLeave.mutate({
      employee_id: leaveForm.employee_id,
      leave_type: leaveForm.leave_type,
      start_date: leaveForm.start_date,
      end_date: leaveForm.end_date,
      days_count: days,
      reason: leaveForm.reason,
      is_emergency: leaveForm.is_emergency,
      status: 'Pending',
    }, {
      onSuccess: () => {
        setIsRequestModalOpen(false);
        setLeaveForm({ employee_id: '', leave_type: '', start_date: '', end_date: '', reason: '', is_emergency: false });
      }
    });
  };

  const handleSubmitHoliday = (e: React.FormEvent) => {
    e.preventDefault();
    addHoliday.mutate({
      date: holidayForm.date,
      name: holidayForm.name,
      name_arabic: holidayForm.name_arabic || undefined,
      is_half_day: holidayForm.is_half_day,
    }, {
      onSuccess: () => {
        setIsHolidayModalOpen(false);
        setHolidayForm({ date: '', name: '', name_arabic: '', is_half_day: false });
      }
    });
  };

  const handleSubmitAllocate = (e: React.FormEvent) => {
    e.preventDefault();
    allocateLeave.mutate({
      employee_id: allocateForm.employee_id,
      leave_type_id: allocateForm.leave_type_id,
      year: currentYear,
      entitled_days: parseFloat(allocateForm.entitled_days),
      carried_forward_days: parseFloat(allocateForm.carried_forward_days) || 0,
    }, {
      onSuccess: () => {
        setIsAllocateModalOpen(false);
        setAllocateForm({ employee_id: '', leave_type_id: '', entitled_days: '', carried_forward_days: '' });
        refetchBalances();
      }
    });
  };

  const handleBulkAllocate = (e: React.FormEvent) => {
    e.preventDefault();
    bulkAllocate.mutate({
      employee_ids: bulkForm.selected_employees,
      leave_type_id: bulkForm.leave_type_id,
      year: currentYear,
      entitled_days: parseFloat(bulkForm.entitled_days),
    }, {
      onSuccess: () => {
        setIsBulkAllocateModalOpen(false);
        setBulkForm({ leave_type_id: '', entitled_days: '', selected_employees: [] });
        refetchBalances();
      }
    });
  };

  const handleEditBalance = (balance: typeof allBalances[0]) => {
    setEditBalanceForm({
      id: balance.id,
      employee_name: balance.employees?.full_name || 'Unknown',
      leave_type_name: balance.leave_types?.name || 'Unknown',
      entitled_days: balance.entitled_days.toString(),
      carried_forward_days: balance.carried_forward_days.toString(),
      used_days: balance.used_days,
      pending_days: balance.pending_days,
    });
    setIsEditBalanceModalOpen(true);
  };

  const handleUpdateBalance = (e: React.FormEvent) => {
    e.preventDefault();
    updateBalance.mutate({
      id: editBalanceForm.id,
      entitled_days: parseFloat(editBalanceForm.entitled_days),
      carried_forward_days: parseFloat(editBalanceForm.carried_forward_days) || 0,
    }, {
      onSuccess: () => {
        setIsEditBalanceModalOpen(false);
        setEditBalanceForm({
          id: '',
          employee_name: '',
          leave_type_name: '',
          entitled_days: '',
          carried_forward_days: '',
          used_days: 0,
          pending_days: 0,
        });
        refetchBalances();
      }
    });
  };

  const toggleEmployeeSelection = (empId: string) => {
    setBulkForm(prev => ({
      ...prev,
      selected_employees: prev.selected_employees.includes(empId)
        ? prev.selected_employees.filter(id => id !== empId)
        : [...prev.selected_employees, empId]
    }));
  };

  const selectAllEmployees = () => {
    setBulkForm(prev => ({
      ...prev,
      selected_employees: prev.selected_employees.length === employees.length 
        ? [] 
        : employees.map(e => e.id)
    }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Approved': return 'bg-primary/10 text-primary border-primary/30';
      case 'Rejected': return 'bg-destructive/10 text-destructive border-destructive/30';
      default: return 'bg-amber-500/10 text-amber-500 border-amber-500/30';
    }
  };

  const getPaidTypeColor = (type: string) => {
    switch (type) {
      case 'Paid': return 'bg-primary/10 text-primary';
      case 'Partially Paid': return 'bg-amber-500/10 text-amber-500';
      case 'Unpaid': return 'bg-muted text-muted-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const pendingCount = leave.filter(l => l.status === 'Pending').length;
  const approvedCount = leave.filter(l => l.status === 'Approved').length;

  // Group balances by employee
  const balancesByEmployee = allBalances.reduce((acc, balance) => {
    const empId = balance.employee_id;
    if (!acc[empId]) {
      acc[empId] = {
        employee: balance.employees,
        balances: []
      };
    }
    acc[empId].balances.push(balance);
    return acc;
  }, {} as Record<string, { employee: { id: string; full_name: string; hrms_no: string; department: string; photo_url?: string }; balances: typeof allBalances }>);

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Leave Management</h1>
          <p className="text-sm text-muted-foreground mt-1">UAE Labour Law Compliant Leave System</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => { refetch(); refetchBalances(); }} className="border-border">
            <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
          </Button>
          <Button size="sm" onClick={() => setIsRequestModalOpen(true)} className="bg-primary hover:bg-primary/90">
            <Plus className="w-4 h-4 mr-1" /> New Request
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="stat-card rounded-2xl border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{pendingCount}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </div>
          </div>
        </div>
        <div className="stat-card rounded-2xl border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Check className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{approvedCount}</p>
              <p className="text-xs text-muted-foreground">Approved</p>
            </div>
          </div>
        </div>
        <div className="stat-card rounded-2xl border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
              <FileText className="w-5 h-5 text-accent" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{leaveTypes.length}</p>
              <p className="text-xs text-muted-foreground">Leave Types</p>
            </div>
          </div>
        </div>
        <div className="stat-card rounded-2xl border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-uae-blue/10 flex items-center justify-center">
              <CalendarDays className="w-5 h-5 text-uae-blue" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{holidays.length}</p>
              <p className="text-xs text-muted-foreground">Holidays</p>
            </div>
          </div>
        </div>
        <div className="stat-card rounded-2xl border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-uae-green/10 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-uae-green" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{Object.keys(balancesByEmployee).length}</p>
              <p className="text-xs text-muted-foreground">Allocated</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-secondary/50 border border-border flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="requests" className="data-[state=active]:bg-card">
            <Clock className="w-4 h-4 mr-2" /> Requests
          </TabsTrigger>
          <TabsTrigger value="calendar" className="data-[state=active]:bg-card">
            <LayoutGrid className="w-4 h-4 mr-2" /> Calendar
          </TabsTrigger>
          <TabsTrigger value="allocation" className="data-[state=active]:bg-card">
            <Wallet className="w-4 h-4 mr-2" /> Allocation
          </TabsTrigger>
          <TabsTrigger value="types" className="data-[state=active]:bg-card">
            <FileText className="w-4 h-4 mr-2" /> Leave Types
          </TabsTrigger>
          <TabsTrigger value="holidays" className="data-[state=active]:bg-card">
            <Calendar className="w-4 h-4 mr-2" /> Holidays
          </TabsTrigger>
        </TabsList>

        {/* Calendar Tab */}
        <TabsContent value="calendar" className="mt-4">
          <CalendarView />
        </TabsContent>

        {/* Leave Requests Tab */}
        <TabsContent value="requests" className="mt-4">
          <div className="glass-card rounded-2xl border border-border p-4">
            {/* Employee Filter */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground whitespace-nowrap">Filter by Employee:</Label>
                <Select value={filterEmployee} onValueChange={setFilterEmployee}>
                  <SelectTrigger className="w-[200px] h-9 bg-secondary/50">
                    <SelectValue placeholder="All Employees" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Employees</SelectItem>
                    {employees.map(emp => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.full_name} ({emp.hrms_no})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-muted-foreground">
                Showing {filterEmployee === 'all' ? leave.length : leave.filter(l => l.employee_id === filterEmployee).length} requests
              </p>
            </div>
            
            <div className="space-y-3">
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                  <p className="text-sm">Loading...</p>
                </div>
              ) : leave.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="w-10 h-10 mx-auto mb-3 opacity-50" />
                  <p className="text-sm font-medium">No leave requests found</p>
                  <p className="text-xs mt-1">Click "New Request" to submit a leave application</p>
                </div>
              ) : (
                (filterEmployee === 'all' ? leave : leave.filter(l => l.employee_id === filterEmployee)).map((record) => (
                  <div key={record.id} className={cn(
                    "glass-card rounded-xl border border-border p-4 hover:border-primary/30 transition-colors",
                    record.status === 'Pending' && "animate-pulse border-amber-500/50 bg-amber-500/5"
                  )}>
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          {record.employees?.photo_url ? (
                            <img src={record.employees.photo_url} alt={record.employees.full_name} className="w-8 h-8 rounded-lg object-cover" />
                          ) : (
                            <div className="w-8 h-8 rounded-lg avatar-gradient flex items-center justify-center text-xs font-bold text-primary-foreground">
                              {record.employees?.full_name?.split(' ').map(n => n[0]).join('').substring(0, 2) || '??'}
                            </div>
                          )}
                          <div>
                            <h3 className="text-sm font-semibold text-foreground">{record.employees?.full_name || 'Unknown'}</h3>
                            <p className="text-[10px] text-muted-foreground">{record.employees?.hrms_no} • {record.employees?.department}</p>
                          </div>
                          <span className={cn("text-[10px] px-2 py-0.5 rounded-full border ml-auto", getStatusColor(record.status))}>{record.status}</span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-3">
                          <div>
                            <p className="text-[10px] uppercase text-muted-foreground">Type</p>
                            <p className="text-xs font-medium text-foreground">{record.leave_type}</p>
                          </div>
                          <div>
                            <p className="text-[10px] uppercase text-muted-foreground">Start</p>
                            <p className="text-xs text-foreground">{format(new Date(record.start_date), 'dd MMM yyyy')}</p>
                          </div>
                          <div>
                            <p className="text-[10px] uppercase text-muted-foreground">End</p>
                            <p className="text-xs text-foreground">{format(new Date(record.end_date), 'dd MMM yyyy')}</p>
                          </div>
                          <div>
                            <p className="text-[10px] uppercase text-muted-foreground">Days</p>
                            <p className="text-xs font-semibold text-foreground">{record.days_count}</p>
                          </div>
                          {record.is_emergency && (
                            <div className="flex items-center gap-1 text-destructive">
                              <AlertCircle className="w-3 h-3" />
                              <span className="text-[10px] font-medium">Emergency</span>
                            </div>
                          )}
                        </div>
                        {record.reason && (
                          <p className="text-xs text-muted-foreground mt-2 bg-secondary/30 rounded-lg px-3 py-2">
                            <span className="font-medium">Reason:</span> {record.reason}
                          </p>
                        )}
                      </div>
                      {record.status === 'Pending' && (
                        <div className="flex gap-2 lg:flex-col">
                          <Button 
                            size="sm" 
                            onClick={() => handleApprove(record.id)} 
                            disabled={updateStatus.isPending} 
                            className="bg-primary hover:bg-primary/90 text-primary-foreground flex-1"
                          >
                            <Check className="w-4 h-4 mr-1" />Approve
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => handleReject(record.id)} 
                            disabled={updateStatus.isPending} 
                            className="border-destructive text-destructive hover:bg-destructive/10 flex-1"
                          >
                            <X className="w-4 h-4 mr-1" />Reject
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </TabsContent>

        {/* Leave Allocation Tab */}
        <TabsContent value="allocation" className="mt-4">
          <div className="glass-card rounded-2xl border border-border p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div>
                <h2 className="text-sm font-semibold text-foreground">Leave Allocation - {currentYear}</h2>
                <p className="text-xs text-muted-foreground">Assign leave entitlements to employees</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => processAccrual.mutate({})}
                  disabled={processAccrual.isPending}
                  className="border-primary text-primary hover:bg-primary/10"
                >
                  <Sparkles className={cn("w-4 h-4 mr-1", processAccrual.isPending && "animate-spin")} />
                  {processAccrual.isPending ? 'Processing...' : 'Auto Accrue'}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setIsAccrualHistoryOpen(true)} className="border-border">
                  <History className="w-4 h-4 mr-1" /> History
                </Button>
                <Button size="sm" variant="outline" onClick={() => setIsAllocateModalOpen(true)} className="border-border">
                  <Plus className="w-4 h-4 mr-1" /> Individual
                </Button>
                <Button size="sm" onClick={() => setIsBulkAllocateModalOpen(true)} className="bg-primary hover:bg-primary/90">
                  <Users className="w-4 h-4 mr-1" /> Bulk Allocate
                </Button>
              </div>
            </div>

            {/* Auto-Accrual Info Card */}
            <div className="mb-4 p-3 rounded-xl bg-primary/5 border border-primary/20">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-xs font-semibold text-foreground">Automatic Leave Accrual</h3>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Leave is automatically calculated based on employee tenure: <strong>2 days/month</strong> for the first 6 months, 
                    then <strong>2.5 days/month</strong> after 6 months of service.
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Click "Auto Accrue" to process this month's accrual for all active employees.
                  </p>
                </div>
              </div>
            </div>

            {Object.keys(balancesByEmployee).length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Wallet className="w-10 h-10 mx-auto mb-3 opacity-50" />
                <p className="text-sm font-medium">No leave allocated yet</p>
                <p className="text-xs mt-1">Allocate leave entitlements to employees for {currentYear}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {Object.values(balancesByEmployee).map(({ employee, balances }) => (
                  <div key={employee.id} className="glass-card rounded-xl border border-border p-4">
                    <div className="flex items-center gap-3 mb-3">
                      {employee.photo_url ? (
                        <img src={employee.photo_url} alt={employee.full_name} className="w-10 h-10 rounded-lg object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg avatar-gradient flex items-center justify-center text-sm font-bold text-primary-foreground">
                          {employee.full_name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                        </div>
                      )}
                      <div>
                        <h3 className="text-sm font-semibold text-foreground">{employee.full_name}</h3>
                        <p className="text-[10px] text-muted-foreground">{employee.hrms_no} • {employee.department}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                      {balances.map((balance) => {
                        const remaining = Number(balance.entitled_days) + Number(balance.carried_forward_days) - Number(balance.used_days) - Number(balance.pending_days);
                        const percentUsed = ((Number(balance.used_days) + Number(balance.pending_days)) / (Number(balance.entitled_days) + Number(balance.carried_forward_days))) * 100;
                        return (
                          <div 
                            key={balance.id} 
                            className="p-3 rounded-lg bg-secondary/30 border border-border group hover:border-primary/50 cursor-pointer transition-colors relative"
                            onClick={() => handleEditBalance(balance)}
                          >
                            <div className="absolute top-1 right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0"
                                onClick={(e) => { e.stopPropagation(); handleEditBalance(balance); }}
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={(e) => { 
                                  e.stopPropagation(); 
                                  if (confirm(`Delete ${balance.leave_types?.name} allocation for ${employee.full_name}?`)) {
                                    deleteBalance.mutate(balance.id);
                                  }
                                }}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                            <p className="text-[10px] font-medium text-muted-foreground mb-1 truncate">
                              {balance.leave_types?.name || 'Unknown'}
                            </p>
                            <div className="flex items-baseline gap-1">
                              <span className="text-lg font-bold text-foreground">{remaining.toFixed(0)}</span>
                              <span className="text-[10px] text-muted-foreground">/ {(Number(balance.entitled_days) + Number(balance.carried_forward_days)).toFixed(0)}</span>
                            </div>
                            <div className="w-full h-1.5 bg-muted rounded-full mt-2 overflow-hidden">
                              <div 
                                className={cn(
                                  "h-full rounded-full transition-all",
                                  percentUsed > 80 ? "bg-destructive" : percentUsed > 50 ? "bg-amber-500" : "bg-primary"
                                )}
                                style={{ width: `${Math.min(percentUsed, 100)}%` }}
                              />
                            </div>
                            <div className="flex justify-between mt-1 text-[9px] text-muted-foreground">
                              <span>Used: {Number(balance.used_days).toFixed(0)}</span>
                              <span>Pending: {Number(balance.pending_days).toFixed(0)}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Leave Types Tab */}
        <TabsContent value="types" className="mt-4">
          <div className="glass-card rounded-2xl border border-border p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-foreground">UAE Labour Law Leave Entitlements</h2>
              <span className="text-xs text-muted-foreground">Federal Decree-Law No. 33 of 2021</span>
            </div>
            <div className="grid gap-3">
              {leaveTypes.map((type) => (
                <div key={type.id} className="glass-card rounded-xl border border-border p-4 hover:border-primary/30 transition-colors">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-semibold text-foreground">{type.name}</h3>
                        {type.name_arabic && (
                          <span className="text-xs text-muted-foreground" dir="rtl">{type.name_arabic}</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mb-3">{type.description}</p>
                      <div className="flex flex-wrap gap-2">
                        <span className={cn("text-[10px] px-2 py-1 rounded-full font-medium", getPaidTypeColor(type.paid_type))}>
                          {type.paid_type}
                        </span>
                        <span className="text-[10px] px-2 py-1 rounded-full bg-secondary text-secondary-foreground">
                          {type.max_days_per_year} days/year
                        </span>
                        {type.requires_documentation && (
                          <span className="text-[10px] px-2 py-1 rounded-full bg-amber-500/10 text-amber-500">
                            Documentation Required
                          </span>
                        )}
                        {type.carry_forward_allowed && (
                          <span className="text-[10px] px-2 py-1 rounded-full bg-uae-blue/10 text-uae-blue">
                            Carry Forward: {type.max_carry_forward_days} days
                          </span>
                        )}
                        {type.gender_specific && (
                          <span className="text-[10px] px-2 py-1 rounded-full bg-accent/10 text-accent">
                            {type.gender_specific} Only
                          </span>
                        )}
                        {type.min_service_months > 0 && (
                          <span className="text-[10px] px-2 py-1 rounded-full bg-muted text-muted-foreground">
                            Min. {type.min_service_months} months service
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-primary">{type.max_days_per_year}</p>
                      <p className="text-[10px] text-muted-foreground uppercase">Days</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* Public Holidays Tab */}
        <TabsContent value="holidays" className="mt-4">
          <div className="glass-card rounded-2xl border border-border p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-foreground">Public Holidays (UAE)</h2>
              <Button size="sm" variant="outline" onClick={() => setIsHolidayModalOpen(true)} className="border-border">
                <Plus className="w-4 h-4 mr-1" /> Add Holiday
              </Button>
            </div>
            {holidays.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="w-10 h-10 mx-auto mb-3 opacity-50" />
                <p className="text-sm font-medium">No upcoming holidays</p>
                <p className="text-xs mt-1">Add public holidays to exclude them from leave calculations</p>
              </div>
            ) : (
              <div className="grid gap-2">
                {holidays.map((holiday) => (
                  <div key={holiday.id} className="flex items-center justify-between p-3 rounded-xl bg-secondary/30 border border-border">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex flex-col items-center justify-center">
                        <span className="text-[10px] text-primary font-medium">{format(new Date(holiday.date), 'MMM')}</span>
                        <span className="text-sm font-bold text-primary leading-none">{format(new Date(holiday.date), 'd')}</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{holiday.name}</p>
                        {holiday.name_arabic && (
                          <p className="text-xs text-muted-foreground" dir="rtl">{holiday.name_arabic}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {holiday.is_half_day && (
                        <span className="text-[10px] px-2 py-1 rounded-full bg-amber-500/10 text-amber-500">Half Day</span>
                      )}
                      <span className="text-xs text-muted-foreground">{format(new Date(holiday.date), 'EEEE')}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* New Leave Request Modal */}
      <Dialog open={isRequestModalOpen} onOpenChange={setIsRequestModalOpen}>
        <DialogContent className="max-w-lg glass-card border-border">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-foreground">New Leave Request</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmitLeave} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Employee *</Label>
              <Select value={leaveForm.employee_id} onValueChange={(v) => setLeaveForm({ ...leaveForm, employee_id: v })}>
                <SelectTrigger className="bg-secondary/50 border-border">
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>{emp.hrms_no} - {emp.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Leave Type *</Label>
              <Select value={leaveForm.leave_type} onValueChange={(v) => setLeaveForm({ ...leaveForm, leave_type: v })}>
                <SelectTrigger className="bg-secondary/50 border-border">
                  <SelectValue placeholder="Select leave type" />
                </SelectTrigger>
                <SelectContent>
                  {leaveTypes.map((type) => (
                    <SelectItem key={type.id} value={type.name}>
                      {type.name} ({type.max_days_per_year} days - {type.paid_type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Start Date *</Label>
                <Input
                  type="date"
                  required
                  value={leaveForm.start_date}
                  onChange={(e) => setLeaveForm({ ...leaveForm, start_date: e.target.value })}
                  className="bg-secondary/50 border-border"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">End Date *</Label>
                <Input
                  type="date"
                  required
                  value={leaveForm.end_date}
                  onChange={(e) => setLeaveForm({ ...leaveForm, end_date: e.target.value })}
                  className="bg-secondary/50 border-border"
                />
              </div>
            </div>
            {leaveForm.start_date && leaveForm.end_date && (
              <div className={cn("p-3 rounded-lg border", hrHasInsufficientBalance || hrHasOverlap ? "bg-destructive/10 border-destructive/30" : "bg-primary/10 border-primary/20")}>
                <p className={cn("text-sm font-medium", hrHasInsufficientBalance || hrHasOverlap ? "text-destructive" : "text-primary")}>
                  Total: {hrRequestedDays} days
                </p>
                {selectedEmployeeBalance && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Available: {hrAvailableDays} days
                  </p>
                )}
              </div>
            )}

            {hrHasOverlap && overlappingLeave && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                <CalendarX2 className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                <div className="text-sm text-amber-700 dark:text-amber-400">
                  <p className="font-medium">Overlapping Leave Detected</p>
                  <p className="text-xs mt-0.5">
                    Employee has {overlappingLeave.status.toLowerCase()} {overlappingLeave.leave_type} leave from{' '}
                    {format(new Date(overlappingLeave.start_date), 'dd MMM')} to{' '}
                    {format(new Date(overlappingLeave.end_date), 'dd MMM')}.
                  </p>
                </div>
              </div>
            )}

            {hrHasInsufficientBalance && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30">
                <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                <div className="text-sm text-destructive">
                  <p className="font-medium">Insufficient leave balance</p>
                  <p className="text-xs mt-0.5">Available: {hrAvailableDays} days. Requesting: {hrRequestedDays} days. Please extend allocation first.</p>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Reason</Label>
              <Textarea
                value={leaveForm.reason}
                onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                className="bg-secondary/50 border-border min-h-[80px]"
                placeholder="Provide reason for leave request..."
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="emergency"
                checked={leaveForm.is_emergency}
                onCheckedChange={(checked) => setLeaveForm({ ...leaveForm, is_emergency: checked as boolean })}
              />
              <Label htmlFor="emergency" className="text-xs text-muted-foreground cursor-pointer">
                This is an emergency leave request
              </Label>
            </div>
            <div className="flex gap-2 pt-4 border-t border-border">
              <Button type="submit" className="flex-1 bg-primary hover:bg-primary/90" disabled={!hrCanSubmit || addLeave.isPending}>
                {addLeave.isPending ? 'Submitting...' : 'Submit Request'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setIsRequestModalOpen(false)} className="border-border">
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Individual Allocate Modal */}
      <Dialog open={isAllocateModalOpen} onOpenChange={setIsAllocateModalOpen}>
        <DialogContent className="max-w-md glass-card border-border">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-foreground">Allocate Leave - {currentYear}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmitAllocate} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Employee *</Label>
              <Select value={allocateForm.employee_id} onValueChange={(v) => setAllocateForm({ ...allocateForm, employee_id: v })}>
                <SelectTrigger className="bg-secondary/50 border-border">
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>{emp.hrms_no} - {emp.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Leave Type *</Label>
              <Select value={allocateForm.leave_type_id} onValueChange={(v) => setAllocateForm({ ...allocateForm, leave_type_id: v })}>
                <SelectTrigger className="bg-secondary/50 border-border">
                  <SelectValue placeholder="Select leave type" />
                </SelectTrigger>
                <SelectContent>
                  {leaveTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>{type.name} ({type.max_days_per_year} days)</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Entitled Days *</Label>
                <Input
                  type="number"
                  required
                  min="0"
                  step="0.5"
                  value={allocateForm.entitled_days}
                  onChange={(e) => setAllocateForm({ ...allocateForm, entitled_days: e.target.value })}
                  className="bg-secondary/50 border-border"
                  placeholder="30"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Carry Forward</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.5"
                  value={allocateForm.carried_forward_days}
                  onChange={(e) => setAllocateForm({ ...allocateForm, carried_forward_days: e.target.value })}
                  className="bg-secondary/50 border-border"
                  placeholder="0"
                />
              </div>
            </div>
            <div className="flex gap-2 pt-4 border-t border-border">
              <Button type="submit" className="flex-1 bg-primary hover:bg-primary/90" disabled={allocateLeave.isPending}>
                {allocateLeave.isPending ? 'Allocating...' : 'Allocate'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setIsAllocateModalOpen(false)} className="border-border">
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Bulk Allocate Modal */}
      <Dialog open={isBulkAllocateModalOpen} onOpenChange={setIsBulkAllocateModalOpen}>
        <DialogContent className="max-w-lg glass-card border-border max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-foreground">Bulk Allocate Leave - {currentYear}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleBulkAllocate} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Leave Type *</Label>
              <Select value={bulkForm.leave_type_id} onValueChange={(v) => setBulkForm({ ...bulkForm, leave_type_id: v })}>
                <SelectTrigger className="bg-secondary/50 border-border">
                  <SelectValue placeholder="Select leave type" />
                </SelectTrigger>
                <SelectContent>
                  {leaveTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>{type.name} ({type.max_days_per_year} days)</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Entitled Days *</Label>
              <Input
                type="number"
                required
                min="0"
                step="0.5"
                value={bulkForm.entitled_days}
                onChange={(e) => setBulkForm({ ...bulkForm, entitled_days: e.target.value })}
                className="bg-secondary/50 border-border"
                placeholder="30"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">Select Employees *</Label>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm" 
                  onClick={selectAllEmployees}
                  className="text-xs h-auto py-1"
                >
                  {bulkForm.selected_employees.length === employees.length ? 'Deselect All' : 'Select All'}
                </Button>
              </div>
              <div className="max-h-48 overflow-y-auto rounded-lg border border-border p-2 space-y-1 bg-secondary/20">
                {employees.map((emp) => (
                  <div 
                    key={emp.id} 
                    className={cn(
                      "flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors",
                      bulkForm.selected_employees.includes(emp.id) ? "bg-primary/10" : "hover:bg-secondary/50"
                    )}
                    onClick={() => toggleEmployeeSelection(emp.id)}
                  >
                    <Checkbox 
                      checked={bulkForm.selected_employees.includes(emp.id)}
                      onCheckedChange={() => toggleEmployeeSelection(emp.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{emp.full_name}</p>
                      <p className="text-[10px] text-muted-foreground">{emp.hrms_no} • {emp.department}</p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {bulkForm.selected_employees.length} of {employees.length} employees selected
              </p>
            </div>
            <div className="flex gap-2 pt-4 border-t border-border">
              <Button 
                type="submit" 
                className="flex-1 bg-primary hover:bg-primary/90" 
                disabled={bulkAllocate.isPending || bulkForm.selected_employees.length === 0}
              >
                {bulkAllocate.isPending ? 'Allocating...' : `Allocate to ${bulkForm.selected_employees.length} Employees`}
              </Button>
              <Button type="button" variant="outline" onClick={() => setIsBulkAllocateModalOpen(false)} className="border-border">
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Holiday Modal */}
      <Dialog open={isHolidayModalOpen} onOpenChange={setIsHolidayModalOpen}>
        <DialogContent className="max-w-md glass-card border-border">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-foreground">Add Public Holiday</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmitHoliday} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Date *</Label>
              <Input
                type="date"
                required
                value={holidayForm.date}
                onChange={(e) => setHolidayForm({ ...holidayForm, date: e.target.value })}
                className="bg-secondary/50 border-border"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Holiday Name (English) *</Label>
              <Input
                required
                value={holidayForm.name}
                onChange={(e) => setHolidayForm({ ...holidayForm, name: e.target.value })}
                placeholder="e.g., UAE National Day"
                className="bg-secondary/50 border-border"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Holiday Name (Arabic)</Label>
              <Input
                value={holidayForm.name_arabic}
                onChange={(e) => setHolidayForm({ ...holidayForm, name_arabic: e.target.value })}
                placeholder="e.g., اليوم الوطني"
                dir="rtl"
                className="bg-secondary/50 border-border"
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="halfday"
                checked={holidayForm.is_half_day}
                onCheckedChange={(checked) => setHolidayForm({ ...holidayForm, is_half_day: checked as boolean })}
              />
              <Label htmlFor="halfday" className="text-xs text-muted-foreground cursor-pointer">
                This is a half-day holiday
              </Label>
            </div>
            <div className="flex gap-2 pt-4 border-t border-border">
              <Button type="submit" className="flex-1 bg-primary hover:bg-primary/90" disabled={addHoliday.isPending}>
                {addHoliday.isPending ? 'Adding...' : 'Add Holiday'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setIsHolidayModalOpen(false)} className="border-border">
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Leave Balance Modal */}
      <Dialog open={isEditBalanceModalOpen} onOpenChange={setIsEditBalanceModalOpen}>
        <DialogContent className="max-w-md glass-card border-border">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-foreground">Edit Leave Allocation</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateBalance} className="space-y-4">
            <div className="p-3 rounded-lg bg-secondary/30 border border-border">
              <p className="text-sm font-medium text-foreground">{editBalanceForm.employee_name}</p>
              <p className="text-xs text-muted-foreground">{editBalanceForm.leave_type_name} - {currentYear}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Entitled Days *</Label>
                <Input
                  type="number"
                  required
                  min="0"
                  step="0.5"
                  value={editBalanceForm.entitled_days}
                  onChange={(e) => setEditBalanceForm({ ...editBalanceForm, entitled_days: e.target.value })}
                  className="bg-secondary/50 border-border"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Carry Forward</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.5"
                  value={editBalanceForm.carried_forward_days}
                  onChange={(e) => setEditBalanceForm({ ...editBalanceForm, carried_forward_days: e.target.value })}
                  className="bg-secondary/50 border-border"
                />
              </div>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 border border-border">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-muted-foreground">Used:</span> <span className="font-medium">{editBalanceForm.used_days} days</span></div>
                <div><span className="text-muted-foreground">Pending:</span> <span className="font-medium">{editBalanceForm.pending_days} days</span></div>
                <div className="col-span-2">
                  <span className="text-muted-foreground">New Available:</span>{' '}
                  <span className="font-medium text-primary">
                    {Math.max(0, (parseFloat(editBalanceForm.entitled_days) || 0) + (parseFloat(editBalanceForm.carried_forward_days) || 0) - editBalanceForm.used_days - editBalanceForm.pending_days).toFixed(0)} days
                  </span>
                </div>
              </div>
            </div>
            <div className="flex gap-2 pt-4 border-t border-border">
              <Button type="submit" className="flex-1 bg-primary hover:bg-primary/90" disabled={updateBalance.isPending}>
                {updateBalance.isPending ? 'Updating...' : 'Update Allocation'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setIsEditBalanceModalOpen(false)} className="border-border">
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Accrual History Modal */}
      <Dialog open={isAccrualHistoryOpen} onOpenChange={setIsAccrualHistoryOpen}>
        <DialogContent className="max-w-2xl glass-card border-border max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
              <History className="w-5 h-5 text-primary" />
              Leave Accrual History - {currentYear}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto">
            {accrualLog.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Sparkles className="w-10 h-10 mx-auto mb-3 opacity-50" />
                <p className="text-sm font-medium">No accrual history yet</p>
                <p className="text-xs mt-1">Click "Auto Accrue" to process monthly leave accrual</p>
              </div>
            ) : (
              <div className="space-y-2">
                {accrualLog.map((entry) => {
                  const emp = employees.find(e => e.id === entry.employee_id);
                  return (
                    <div key={entry.id} className="p-3 rounded-lg bg-secondary/30 border border-border">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg avatar-gradient flex items-center justify-center text-xs font-bold text-primary-foreground">
                            {emp?.full_name?.split(' ').map(n => n[0]).join('').substring(0, 2) || '??'}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">{emp?.full_name || 'Unknown'}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {entry.accrual_month}/{entry.accrual_year} • {entry.months_of_service} months service
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-primary">+{entry.days_accrued} days</p>
                          <p className="text-[10px] text-muted-foreground">
                            Rate: {entry.accrual_rate} days/mo
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <div className="pt-4 border-t border-border">
            <Button variant="outline" onClick={() => setIsAccrualHistoryOpen(false)} className="w-full border-border">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
