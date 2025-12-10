import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAttendance } from '@/hooks/useAttendance';
import { useLeave, useAddLeave, useLeaveTypes, useLeaveBalances } from '@/hooks/useLeave';
import { useContracts } from '@/hooks/useContracts';
import { useEmployeeHRLetters } from '@/hooks/useHRLetters';
import { useEmployeePerformance, useEmployeeCorrectiveActions } from '@/hooks/usePerformance';
import { useEmployeeDiscipline } from '@/hooks/useDiscipline';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  User, Calendar, FileText, Clock, CheckCircle, XCircle, 
  AlertTriangle, Download, Plus, ArrowLeft, Briefcase, Mail,
  Eye, CreditCard, Home, Car, UserCircle, Cake, Phone, MapPin, Globe, Heart, Baby, Pencil, Save, X, Star, Scale, MessageCircle, Trophy
} from 'lucide-react';
import { ImagePreviewModal } from '@/components/modals/ImagePreviewModal';
import { useEmployeeDocuments } from '@/hooks/useDocuments';
import { EmployeeAttendanceCalendar } from '@/components/attendance/EmployeeAttendanceCalendar';
import { EmployeeGamificationCard } from '@/components/gamification/EmployeeGamificationCard';
import { cn } from '@/lib/utils';
import { format, parseISO, differenceInDays } from 'date-fns';
import { toast } from 'sonner';
import type { Employee } from '@/types/hr';

type TabType = 'overview' | 'attendance' | 'leave' | 'contract' | 'letters' | 'personal' | 'records' | 'gamification';

export default function EmployeePortal() {
  const { employeeId } = useParams<{ employeeId: string }>();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('personal');
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);
  const [isEditingPersonal, setIsEditingPersonal] = useState(false);
  const [personalInfo, setPersonalInfo] = useState({
    gender: '',
    birthday: '',
    personal_email: '',
    personal_phone: '',
    home_address: '',
    place_of_birth: '',
    country_of_birth: '',
    family_status: '',
    number_of_children: 0,
    nationality: '',
  });
  const [savingPersonal, setSavingPersonal] = useState(false);

  // Fetch employee data
  useEffect(() => {
    async function fetchEmployee() {
      if (!employeeId) return;
      
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('id', employeeId)
        .single();
      
      if (error) {
        console.error('Employee not found:', error);
        setLoading(false);
        return;
      }
      
      setEmployee(data as Employee);
      setLoading(false);
    }
    
    fetchEmployee();
  }, [employeeId]);

  // Hooks for data
  const { data: allAttendance = [] } = useAttendance();
  const { data: allLeave = [] } = useLeave();
  const { data: contracts = [] } = useContracts();
  const { data: letters = [] } = useEmployeeHRLetters(employeeId || '');
  const { data: leaveTypes = [] } = useLeaveTypes();
  const { data: leaveBalances = [] } = useLeaveBalances(employeeId || '');
  const addLeave = useAddLeave();
  const { data: documents = [] } = useEmployeeDocuments(employeeId || '');
  const { data: performanceRecords = [] } = useEmployeePerformance(employeeId || '');
  const { data: correctiveActions = [] } = useEmployeeCorrectiveActions(employeeId || '');
  const { data: disciplineRecords = [] } = useEmployeeDiscipline(employeeId || '');

  // Filter data for this employee
  const attendance = allAttendance.filter(a => a.employee_id === employeeId);
  const leaveRecords = allLeave.filter(l => l.employee_id === employeeId);
  const employeeContract = contracts.find(c => c.employee_id === employeeId && c.status === 'Active');

  // Calculate total available leave from leave_balances table
  const totalLeaveBalance = useMemo(() => {
    return leaveBalances.reduce((acc, balance) => {
      const available = (balance.entitled_days + balance.carried_forward_days) - balance.used_days - balance.pending_days;
      return acc + Math.max(0, available);
    }, 0);
  }, [leaveBalances]);

  // Leave request form
  const [leaveForm, setLeaveForm] = useState({
    leave_type: 'Annual',
    start_date: '',
    end_date: '',
    reason: '',
  });

  // Calculate available balance for selected leave type
  const selectedLeaveType = useMemo(() => {
    return leaveTypes.find(lt => lt.name === leaveForm.leave_type);
  }, [leaveTypes, leaveForm.leave_type]);

  const selectedBalance = useMemo(() => {
    if (!selectedLeaveType) return null;
    return leaveBalances.find(lb => lb.leave_type_id === selectedLeaveType.id);
  }, [leaveBalances, selectedLeaveType]);

  const availableDays = useMemo(() => {
    if (!selectedBalance) return 0;
    return (selectedBalance.entitled_days + selectedBalance.carried_forward_days) - 
           selectedBalance.used_days - selectedBalance.pending_days;
  }, [selectedBalance]);

  const requestedDays = useMemo(() => {
    if (!leaveForm.start_date || !leaveForm.end_date) return 0;
    const days = differenceInDays(parseISO(leaveForm.end_date), parseISO(leaveForm.start_date)) + 1;
    return days > 0 ? days : 0;
  }, [leaveForm.start_date, leaveForm.end_date]);

  const hasInsufficientBalance = requestedDays > 0 && availableDays < requestedDays;

  const handleLeaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId) return;
    
    const daysCount = differenceInDays(parseISO(leaveForm.end_date), parseISO(leaveForm.start_date)) + 1;
    
    // Check balance
    if (hasInsufficientBalance) {
      toast.error('Insufficient leave balance. Please contact HR for assistance.');
      return;
    }
    
    addLeave.mutate({
      employee_id: employeeId,
      leave_type: leaveForm.leave_type,
      start_date: leaveForm.start_date,
      end_date: leaveForm.end_date,
      days_count: daysCount,
      reason: leaveForm.reason,
      status: 'Pending',
    }, {
      onSuccess: () => {
        setIsLeaveModalOpen(false);
        setLeaveForm({ leave_type: 'Annual', start_date: '', end_date: '', reason: '' });
        toast.success('Leave request submitted successfully');
      }
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your portal...</p>
        </div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <XCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">Access Denied</h1>
          <p className="text-muted-foreground mb-4">This employee portal link is invalid or has expired.</p>
          <Link to="/">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go to Home
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'personal' as TabType, label: 'Personal Info', icon: UserCircle },
    { id: 'overview' as TabType, label: 'Overview', icon: User },
    { id: 'attendance' as TabType, label: 'Attendance', icon: Clock },
    { id: 'leave' as TabType, label: 'Leave', icon: Calendar },
    { id: 'contract' as TabType, label: 'Contract', icon: FileText },
    { id: 'letters' as TabType, label: 'HR Letters', icon: Mail },
    { id: 'records' as TabType, label: 'Records', icon: Scale },
    { id: 'gamification' as TabType, label: 'Points & Badges', icon: Trophy },
  ];

  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/5">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            {employee.photo_url ? (
              <img src={employee.photo_url} alt={employee.full_name} className="w-14 h-14 rounded-full object-cover" />
            ) : (
              <div className="w-14 h-14 rounded-full avatar-gradient flex items-center justify-center text-lg font-bold text-primary-foreground">
                {getInitials(employee.full_name)}
              </div>
            )}
            <div>
              <h1 className="text-xl font-bold text-foreground">{employee.full_name}</h1>
              <p className="text-sm text-muted-foreground">{employee.job_position} • {employee.department}</p>
            </div>
            <div className="ml-auto">
              <span className={cn(
                "px-3 py-1 rounded-full text-xs font-medium",
                employee.status === 'Active' 
                  ? "bg-primary/20 text-primary" 
                  : "bg-amber-500/20 text-amber-500"
              )}>
                {employee.status || 'Active'}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <nav className="bg-card border-b border-border">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 whitespace-nowrap",
                  activeTab === tab.id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">HRMS No.</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-foreground">{employee.hrms_no}</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Leave Balance</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-primary">
                  {leaveBalances.length > 0 ? `${totalLeaveBalance} days` : 'Not allocated'}
                </p>
                {leaveBalances.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {leaveBalances.slice(0, 3).map((balance) => {
                      const available = (balance.entitled_days + balance.carried_forward_days) - balance.used_days - balance.pending_days;
                      const leaveTypeName = (balance as any).leave_types?.name || 'Leave';
                      return (
                        <div key={balance.id} className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">{leaveTypeName}</span>
                          <span className={cn("font-medium", available <= 0 ? "text-destructive" : "text-foreground")}>
                            {Math.max(0, available)}/{balance.entitled_days}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">This Month Attendance</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-foreground">
                  {attendance.filter(a => a.status === 'Present' || a.status === 'Late').length} days
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Pending Requests</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-amber-500">
                  {leaveRecords.filter(l => l.status === 'Pending').length}
                </p>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="text-sm text-muted-foreground">QUICK ACTIONS</CardTitle>
              </CardHeader>
              <CardContent className="flex gap-3">
                <Dialog open={isLeaveModalOpen} onOpenChange={setIsLeaveModalOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-primary hover:bg-primary/90">
                      <Plus className="w-4 h-4 mr-2" />
                      Request Leave
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Request Leave</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleLeaveSubmit} className="space-y-4 mt-4">
                      <div>
                        <label className="text-xs text-muted-foreground">Leave Type</label>
                        <Select value={leaveForm.leave_type} onValueChange={(v) => setLeaveForm({ ...leaveForm, leave_type: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {leaveTypes.length > 0 ? leaveTypes.map((type) => (
                              <SelectItem key={type.id} value={type.name}>{type.name}</SelectItem>
                            )) : (
                              <>
                                <SelectItem value="Annual">Annual Leave</SelectItem>
                                <SelectItem value="Sick">Sick Leave</SelectItem>
                                <SelectItem value="Maternity">Maternity Leave</SelectItem>
                                <SelectItem value="Emergency">Emergency Leave</SelectItem>
                                <SelectItem value="Unpaid">Unpaid Leave</SelectItem>
                              </>
                            )}
                          </SelectContent>
                        </Select>
                        {selectedBalance && (
                          <div className="mt-2 p-2 rounded-lg bg-secondary/50 border border-border">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">{leaveForm.leave_type} Leave Balance:</span>
                              <span className={cn("font-bold", availableDays <= 0 ? "text-destructive" : "text-primary")}>
                                {Math.max(0, availableDays)} / {selectedBalance.entitled_days + selectedBalance.carried_forward_days} days
                              </span>
                            </div>
                            <div className="flex gap-2 mt-1 text-[10px] text-muted-foreground">
                              <span>Used: {selectedBalance.used_days}</span>
                              <span>•</span>
                              <span>Pending: {selectedBalance.pending_days}</span>
                            </div>
                          </div>
                        )}
                        {!selectedBalance && selectedLeaveType && (
                          <p className="text-xs text-amber-500 mt-1">No {leaveForm.leave_type} leave allocated. Contact HR.</p>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs text-muted-foreground">Start Date</label>
                          <Input type="date" value={leaveForm.start_date} onChange={(e) => setLeaveForm({ ...leaveForm, start_date: e.target.value })} required />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">End Date</label>
                          <Input type="date" value={leaveForm.end_date} onChange={(e) => setLeaveForm({ ...leaveForm, end_date: e.target.value })} required />
                        </div>
                      </div>
                      {requestedDays > 0 && (
                        <div className={cn(
                          "p-3 rounded-lg border",
                          hasInsufficientBalance ? "bg-destructive/10 border-destructive/30" : "bg-primary/10 border-primary/30"
                        )}>
                          <p className={cn("text-sm font-medium", hasInsufficientBalance ? "text-destructive" : "text-primary")}>
                            Duration: {requestedDays} day(s)
                          </p>
                        </div>
                      )}
                      {hasInsufficientBalance && (
                        <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30">
                          <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                          <div className="text-sm text-destructive">
                            <p className="font-medium">Insufficient leave balance</p>
                            <p className="text-xs mt-0.5">Please contact HR for assistance.</p>
                          </div>
                        </div>
                      )}
                      <div>
                        <label className="text-xs text-muted-foreground">Reason</label>
                        <Textarea value={leaveForm.reason} onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })} placeholder="Enter reason..." />
                      </div>
                      <Button type="submit" className="w-full" disabled={addLeave.isPending || hasInsufficientBalance}>
                        {addLeave.isPending ? 'Submitting...' : 'Submit Request'}
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
                <Button variant="outline" onClick={() => setActiveTab('attendance')}>
                  <Clock className="w-4 h-4 mr-2" />
                  View Attendance
                </Button>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="text-sm text-muted-foreground">CONTRACT STATUS</CardTitle>
              </CardHeader>
              <CardContent>
                {employeeContract ? (
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-primary" />
                    <div>
                      <p className="font-medium text-foreground">{employeeContract.contract_type} Contract</p>
                      <p className="text-xs text-muted-foreground">MOHRE: {employeeContract.mohre_contract_no}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                    <p className="text-muted-foreground">No active contract found</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Attendance Tab */}
        {activeTab === 'attendance' && (
          <div className="animate-fade-in">
            <EmployeeAttendanceCalendar
              employeeId={employeeId}
              employeeName={employee.full_name}
              hrmsNo={employee.hrms_no}
              showEmployeeSelector={false}
              showBackButton={false}
              isEmployeePortal={true}
            />
          </div>
        )}

        {/* Leave Tab */}
        {activeTab === 'leave' && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Leave Requests</h2>
              <Dialog open={isLeaveModalOpen} onOpenChange={setIsLeaveModalOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    New Request
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Request Leave</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleLeaveSubmit} className="space-y-4 mt-4">
                    <div>
                      <label className="text-xs text-muted-foreground">Leave Type</label>
                      <Select value={leaveForm.leave_type} onValueChange={(v) => setLeaveForm({ ...leaveForm, leave_type: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {leaveTypes.length > 0 ? leaveTypes.map((type) => (
                            <SelectItem key={type.id} value={type.name}>{type.name}</SelectItem>
                          )) : (
                            <>
                              <SelectItem value="Annual">Annual Leave</SelectItem>
                              <SelectItem value="Sick">Sick Leave</SelectItem>
                              <SelectItem value="Maternity">Maternity Leave</SelectItem>
                              <SelectItem value="Emergency">Emergency Leave</SelectItem>
                              <SelectItem value="Unpaid">Unpaid Leave</SelectItem>
                            </>
                          )}
                        </SelectContent>
                        </Select>
                        {selectedBalance && (
                          <div className="mt-2 p-2 rounded-lg bg-secondary/50 border border-border">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">{leaveForm.leave_type} Leave Balance:</span>
                              <span className={cn("font-bold", availableDays <= 0 ? "text-destructive" : "text-primary")}>
                                {Math.max(0, availableDays)} / {selectedBalance.entitled_days + selectedBalance.carried_forward_days} days
                              </span>
                            </div>
                            <div className="flex gap-2 mt-1 text-[10px] text-muted-foreground">
                              <span>Used: {selectedBalance.used_days}</span>
                              <span>•</span>
                              <span>Pending: {selectedBalance.pending_days}</span>
                            </div>
                          </div>
                        )}
                        {!selectedBalance && selectedLeaveType && (
                          <p className="text-xs text-amber-500 mt-1">No {leaveForm.leave_type} leave allocated. Contact HR.</p>
                        )}
                      </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs text-muted-foreground">Start Date</label>
                        <Input type="date" value={leaveForm.start_date} onChange={(e) => setLeaveForm({ ...leaveForm, start_date: e.target.value })} required />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">End Date</label>
                        <Input type="date" value={leaveForm.end_date} onChange={(e) => setLeaveForm({ ...leaveForm, end_date: e.target.value })} required />
                      </div>
                    </div>
                    {requestedDays > 0 && (
                      <div className={cn(
                        "p-3 rounded-lg border",
                        hasInsufficientBalance ? "bg-destructive/10 border-destructive/30" : "bg-primary/10 border-primary/30"
                      )}>
                        <p className={cn("text-sm font-medium", hasInsufficientBalance ? "text-destructive" : "text-primary")}>
                          Duration: {requestedDays} day(s)
                        </p>
                      </div>
                    )}
                    {hasInsufficientBalance && (
                      <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30">
                        <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                        <div className="text-sm text-destructive">
                          <p className="font-medium">Insufficient leave balance</p>
                          <p className="text-xs mt-0.5">Please contact HR for assistance.</p>
                        </div>
                      </div>
                    )}
                    <div>
                      <label className="text-xs text-muted-foreground">Reason</label>
                      <Textarea value={leaveForm.reason} onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })} placeholder="Enter reason..." />
                    </div>
                    <Button type="submit" className="w-full" disabled={addLeave.isPending || hasInsufficientBalance}>
                      {addLeave.isPending ? 'Submitting...' : 'Submit Request'}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardContent className="p-0">
                {leaveRecords.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No leave requests found</p>
                ) : (
                  <div className="divide-y divide-border">
                    {leaveRecords.map((record) => (
                      <div key={record.id} className="flex items-center justify-between p-4">
                        <div>
                          <p className="font-medium">{record.leave_type} Leave</p>
                          <p className="text-sm text-muted-foreground">
                            {format(parseISO(record.start_date), 'dd MMM')} - {format(parseISO(record.end_date), 'dd MMM yyyy')}
                            <span className="ml-2">({record.days_count} days)</span>
                          </p>
                        </div>
                        <span className={cn(
                          "px-3 py-1 rounded-full text-xs font-medium",
                          record.status === 'Approved' && "bg-primary/20 text-primary",
                          record.status === 'Pending' && "bg-amber-500/20 text-amber-500",
                          record.status === 'Rejected' && "bg-destructive/20 text-destructive"
                        )}>
                          {record.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Contract Tab */}
        {activeTab === 'contract' && (
          <div className="animate-fade-in space-y-6">
            {employeeContract ? (
              <>
                {/* Contract Details */}
                <Card>
                  <CardHeader>
                    <CardTitle>Contract Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <p className="text-xs text-muted-foreground uppercase">Contract Type</p>
                          <p className="text-lg font-semibold">{employeeContract.contract_type}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground uppercase">MOHRE Contract No.</p>
                          <p className="text-lg font-semibold">{employeeContract.mohre_contract_no}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground uppercase">Start Date</p>
                          <p className="text-lg font-semibold">{format(parseISO(employeeContract.start_date), 'dd MMM yyyy')}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground uppercase">End Date</p>
                          <p className="text-lg font-semibold">
                            {employeeContract.end_date ? format(parseISO(employeeContract.end_date), 'dd MMM yyyy') : 'N/A'}
                          </p>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                          <p className="text-xs text-muted-foreground uppercase">Total Salary</p>
                          <p className="text-2xl font-bold text-primary">
                            AED {employeeContract.total_salary?.toLocaleString() || 
                              ((employeeContract.basic_salary || 0) + 
                               (employeeContract.housing_allowance || 0) + 
                               (employeeContract.transportation_allowance || 0)).toLocaleString()}
                          </p>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="p-2 rounded bg-secondary/50 text-center">
                            <p className="text-[10px] text-muted-foreground uppercase">Basic</p>
                            <p className="text-sm font-semibold">AED {employeeContract.basic_salary?.toLocaleString()}</p>
                          </div>
                          <div className="p-2 rounded bg-secondary/50 text-center">
                            <p className="text-[10px] text-muted-foreground uppercase flex items-center justify-center gap-1"><Home className="w-3 h-3" /> Housing</p>
                            <p className="text-sm font-semibold">AED {(employeeContract.housing_allowance || 0).toLocaleString()}</p>
                          </div>
                          <div className="p-2 rounded bg-secondary/50 text-center">
                            <p className="text-[10px] text-muted-foreground uppercase flex items-center justify-center gap-1"><Car className="w-3 h-3" /> Transport</p>
                            <p className="text-sm font-semibold">AED {(employeeContract.transportation_allowance || 0).toLocaleString()}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs text-muted-foreground uppercase">Working Hours</p>
                            <p className="text-lg font-semibold">{employeeContract.working_hours || 48} hrs/week</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground uppercase">Annual Leave</p>
                            <p className="text-lg font-semibold">{employeeContract.annual_leave_days || 30} days</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Contract Documents */}
                {(employeeContract.page1_url || employeeContract.page2_url) && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="w-5 h-5" />
                        Contract Documents
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        {employeeContract.page1_url && (
                          <div 
                            className="relative group cursor-pointer rounded-lg overflow-hidden border border-border hover:border-primary transition-colors"
                            onClick={() => setPreviewImage({ url: employeeContract.page1_url!, title: 'Contract - Page 1' })}
                          >
                            <img 
                              src={employeeContract.page1_url} 
                              alt="Contract Page 1" 
                              className="w-full h-40 object-cover"
                            />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                              <Eye className="w-8 h-8 text-white" />
                            </div>
                            <p className="text-center py-2 text-sm font-medium bg-secondary/50">Page 1</p>
                          </div>
                        )}
                        {employeeContract.page2_url && (
                          <div 
                            className="relative group cursor-pointer rounded-lg overflow-hidden border border-border hover:border-primary transition-colors"
                            onClick={() => setPreviewImage({ url: employeeContract.page2_url!, title: 'Contract - Page 2' })}
                          >
                            <img 
                              src={employeeContract.page2_url} 
                              alt="Contract Page 2" 
                              className="w-full h-40 object-cover"
                            />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                              <Eye className="w-8 h-8 text-white" />
                            </div>
                            <p className="text-center py-2 text-sm font-medium bg-secondary/50">Page 2</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Employee Documents */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="w-5 h-5" />
                      Identity Documents
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(() => {
                      const docCategories = ['Passport', 'Emirates ID', 'Visa', 'Work Permit'];
                      const categoryDocs = docCategories.map(cat => ({
                        category: cat,
                        doc: documents.find(d => d.category === cat)
                      }));
                      
                      const hasAnyDoc = categoryDocs.some(cd => cd.doc);
                      
                      if (!hasAnyDoc) {
                        return (
                          <p className="text-center text-muted-foreground py-6">No identity documents uploaded yet</p>
                        );
                      }
                      
                      return (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {categoryDocs.map(({ category, doc }) => (
                            doc ? (
                              <div 
                                key={category}
                                className="relative group cursor-pointer rounded-lg overflow-hidden border border-border hover:border-primary transition-colors"
                                onClick={() => setPreviewImage({ url: doc.file_url, title: category })}
                              >
                                {doc.file_type?.startsWith('image/') || doc.file_url?.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                                  <img 
                                    src={doc.file_url} 
                                    alt={category} 
                                    className="w-full h-28 object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-28 bg-secondary/50 flex items-center justify-center">
                                    <FileText className="w-12 h-12 text-muted-foreground" />
                                  </div>
                                )}
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                  <Eye className="w-6 h-6 text-white" />
                                </div>
                                <p className="text-center py-2 text-xs font-medium bg-secondary/50">{category}</p>
                              </div>
                            ) : (
                              <div key={category} className="rounded-lg border border-dashed border-border p-4 text-center opacity-50">
                                <FileText className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                                <p className="text-xs text-muted-foreground">{category}</p>
                                <p className="text-[10px] text-muted-foreground">Not uploaded</p>
                              </div>
                            )
                          ))}
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Briefcase className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">No active contract found</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* HR Letters Tab */}
        {activeTab === 'letters' && (
          <div className="animate-fade-in">
            <Card>
              <CardHeader>
                <CardTitle>HR Letters & Documents</CardTitle>
              </CardHeader>
              <CardContent>
                {letters.length === 0 ? (
                  <div className="text-center py-8">
                    <Mail className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground">No HR letters found</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {letters.map((letter) => (
                      <div key={letter.id} className="flex items-center justify-between p-4 rounded-lg bg-secondary/30 border border-border">
                        <div className="flex items-center gap-3">
                          <FileText className="w-5 h-5 text-primary" />
                          <div>
                            <p className="font-medium">{letter.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {letter.letter_type} • Issued: {format(parseISO(letter.issued_date), 'dd MMM yyyy')}
                            </p>
                          </div>
                        </div>
                        {letter.file_url && (
                          <a href={letter.file_url} target="_blank" rel="noopener noreferrer">
                            <Button variant="outline" size="sm">
                              <Download className="w-4 h-4 mr-1" />
                              Download
                            </Button>
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Personal Info Tab */}
        {activeTab === 'personal' && (
          <div className="animate-fade-in space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <UserCircle className="w-5 h-5" />
                  Personal Information
                </CardTitle>
                {!isEditingPersonal ? (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setPersonalInfo({
                        gender: employee.gender || '',
                        birthday: employee.birthday || '',
                        personal_email: employee.personal_email || '',
                        personal_phone: employee.personal_phone || '',
                        home_address: employee.home_address || '',
                        place_of_birth: employee.place_of_birth || '',
                        country_of_birth: employee.country_of_birth || '',
                        family_status: employee.family_status || '',
                        number_of_children: employee.number_of_children || 0,
                        nationality: employee.nationality || '',
                      });
                      setIsEditingPersonal(true);
                    }}
                  >
                    <Pencil className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setIsEditingPersonal(false)}
                      disabled={savingPersonal}
                    >
                      <X className="w-4 h-4 mr-1" />
                      Cancel
                    </Button>
                    <Button 
                      size="sm"
                      onClick={async () => {
                        if (!employeeId) return;
                        setSavingPersonal(true);
                        try {
                          const { error } = await supabase
                            .from('employees')
                            .update({
                              gender: personalInfo.gender || null,
                              birthday: personalInfo.birthday || null,
                              personal_email: personalInfo.personal_email || null,
                              personal_phone: personalInfo.personal_phone || null,
                              home_address: personalInfo.home_address || null,
                              place_of_birth: personalInfo.place_of_birth || null,
                              country_of_birth: personalInfo.country_of_birth || null,
                              family_status: personalInfo.family_status || null,
                              number_of_children: personalInfo.number_of_children,
                              nationality: personalInfo.nationality || null,
                            })
                            .eq('id', employeeId);
                          
                          if (error) throw error;
                          
                          setEmployee(prev => prev ? { ...prev, ...personalInfo } : null);
                          setIsEditingPersonal(false);
                          toast.success('Personal information updated');
                        } catch (err) {
                          console.error('Error updating personal info:', err);
                          toast.error('Failed to update personal information');
                        } finally {
                          setSavingPersonal(false);
                        }
                      }}
                      disabled={savingPersonal}
                    >
                      <Save className="w-4 h-4 mr-1" />
                      {savingPersonal ? 'Saving...' : 'Save'}
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                {isEditingPersonal ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-4">
                      <div>
                        <label className="text-xs text-muted-foreground uppercase">Gender</label>
                        <Select value={personalInfo.gender} onValueChange={(v) => setPersonalInfo({ ...personalInfo, gender: v })}>
                          <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Male">Male</SelectItem>
                            <SelectItem value="Female">Female</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground uppercase">Birthday</label>
                        <Input type="date" value={personalInfo.birthday} onChange={(e) => setPersonalInfo({ ...personalInfo, birthday: e.target.value })} />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground uppercase">Personal Email</label>
                        <Input type="email" value={personalInfo.personal_email} onChange={(e) => setPersonalInfo({ ...personalInfo, personal_email: e.target.value })} placeholder="personal@email.com" />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground uppercase">Personal Phone</label>
                        <Input type="tel" value={personalInfo.personal_phone} onChange={(e) => setPersonalInfo({ ...personalInfo, personal_phone: e.target.value })} placeholder="+971 XX XXX XXXX" />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground uppercase">Home Address</label>
                        <Textarea value={personalInfo.home_address} onChange={(e) => setPersonalInfo({ ...personalInfo, home_address: e.target.value })} placeholder="Enter home address" rows={2} />
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="text-xs text-muted-foreground uppercase">Place of Birth</label>
                        <Input value={personalInfo.place_of_birth} onChange={(e) => setPersonalInfo({ ...personalInfo, place_of_birth: e.target.value })} placeholder="City" />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground uppercase">Country of Birth</label>
                        <Input value={personalInfo.country_of_birth} onChange={(e) => setPersonalInfo({ ...personalInfo, country_of_birth: e.target.value })} placeholder="Country" />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground uppercase">Family Status</label>
                        <Select value={personalInfo.family_status} onValueChange={(v) => setPersonalInfo({ ...personalInfo, family_status: v })}>
                          <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Single">Single</SelectItem>
                            <SelectItem value="Married">Married</SelectItem>
                            <SelectItem value="Divorced">Divorced</SelectItem>
                            <SelectItem value="Widowed">Widowed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground uppercase">Number of Children</label>
                        <Input type="number" min="0" value={personalInfo.number_of_children} onChange={(e) => setPersonalInfo({ ...personalInfo, number_of_children: parseInt(e.target.value) || 0 })} />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground uppercase">Nationality</label>
                        <Input value={personalInfo.nationality} onChange={(e) => setPersonalInfo({ ...personalInfo, nationality: e.target.value })} placeholder="Nationality" />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left Column */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30">
                        <User className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground uppercase">Gender</p>
                          <p className="font-medium">{employee.gender || 'Not specified'}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30">
                        <Cake className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground uppercase">Birthday</p>
                          <p className="font-medium">
                            {employee.birthday ? format(parseISO(employee.birthday), 'dd MMMM yyyy') : 'Not specified'}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30">
                        <Mail className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground uppercase">Personal Email</p>
                          <p className="font-medium">{employee.personal_email || 'Not specified'}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30">
                        <Phone className="w-5 h-5 text-muted-foreground" />
                        <div className="flex-1">
                          <p className="text-xs text-muted-foreground uppercase">Personal Phone</p>
                          <p className="font-medium flex items-center gap-2">
                            {employee.personal_phone || 'Not specified'}
                            {employee.personal_phone && (
                              <button 
                                onClick={() => window.open(`https://wa.me/${employee.personal_phone?.replace(/\D/g, '')}`, '_blank')}
                                className="text-emerald-500 hover:text-emerald-600 transition-colors"
                                title="Send WhatsApp message"
                              >
                                <MessageCircle className="w-4 h-4" />
                              </button>
                            )}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30">
                        <MapPin className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground uppercase">Home Address</p>
                          <p className="font-medium">{employee.home_address || 'Not specified'}</p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Right Column */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30">
                        <Globe className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground uppercase">Place of Birth</p>
                          <p className="font-medium">{employee.place_of_birth || 'Not specified'}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30">
                        <Globe className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground uppercase">Country of Birth</p>
                          <p className="font-medium">{employee.country_of_birth || 'Not specified'}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30">
                        <Heart className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground uppercase">Family Status</p>
                          <p className="font-medium">{employee.family_status || 'Not specified'}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30">
                        <Baby className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground uppercase">Number of Children</p>
                          <p className="font-medium">{employee.number_of_children ?? 0}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30">
                        <Globe className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground uppercase">Nationality</p>
                          <p className="font-medium">{employee.nationality || 'Not specified'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Records Tab - Performance & Discipline */}
        {activeTab === 'records' && (
          <div className="space-y-6 animate-fade-in">
            {/* Performance Reviews */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-primary" />
                  Performance Reviews
                </CardTitle>
              </CardHeader>
              <CardContent>
                {performanceRecords.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">No performance reviews found</p>
                ) : (
                  <div className="space-y-3">
                    {performanceRecords.map((record) => (
                      <div key={record.id} className="p-4 rounded-lg bg-secondary/30 border border-border">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">{record.performance_type}</p>
                            <p className="text-sm text-muted-foreground">Period: {record.review_period}</p>
                          </div>
                          <div className="flex items-center gap-1">
                            {[...Array(5)].map((_, i) => (
                              <Star key={i} className={cn("w-4 h-4", i < record.rating ? "text-primary fill-primary" : "text-muted-foreground/30")} />
                            ))}
                          </div>
                        </div>
                        {record.comments && <p className="text-sm mt-2 text-muted-foreground">{record.comments}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Corrective Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                  Corrective Actions
                </CardTitle>
              </CardHeader>
              <CardContent>
                {correctiveActions.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">No corrective actions</p>
                ) : (
                  <div className="space-y-3">
                    {correctiveActions.map((action) => (
                      <div key={action.id} className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-amber-500/20 text-amber-500">{action.action_type}</span>
                            <p className="text-sm mt-2">{action.reason}</p>
                          </div>
                          {action.document_url && (
                            <a href={action.document_url} target="_blank" rel="noopener noreferrer" className="text-primary text-xs flex items-center gap-1">
                              <Eye className="w-3 h-3" />View Doc
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Discipline Records */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Scale className="w-5 h-5 text-destructive" />
                  Discipline Records
                </CardTitle>
              </CardHeader>
              <CardContent>
                {disciplineRecords.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">No discipline records</p>
                ) : (
                  <div className="space-y-3">
                    {disciplineRecords.map((record) => (
                      <div key={record.id} className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-destructive/20 text-destructive">{record.incident_type}</span>
                            <p className="text-sm mt-2">{record.description}</p>
                            {record.action_taken && <p className="text-xs text-muted-foreground mt-1">Action: {record.action_taken}</p>}
                          </div>
                          {record.document_url && (
                            <a href={record.document_url} target="_blank" rel="noopener noreferrer" className="text-primary text-xs flex items-center gap-1">
                              <Eye className="w-3 h-3" />View Doc
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Gamification Tab */}
        {activeTab === 'gamification' && employeeId && (
          <div className="animate-fade-in">
            <EmployeeGamificationCard employeeId={employeeId} />
          </div>
        )}
      </main>

      {/* Image Preview Modal */}
      <ImagePreviewModal
        isOpen={!!previewImage}
        onClose={() => setPreviewImage(null)}
        imageUrl={previewImage?.url || ''}
        title={previewImage?.title}
      />
    </div>
  );
}
