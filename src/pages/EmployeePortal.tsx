import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAttendance, useRealtimeAttendance } from '@/hooks/useAttendance';
import { useLeave, useAddLeave, useLeaveTypes, useLeaveBalances, useRealtimeLeave } from '@/hooks/useLeave';
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
  Eye, CreditCard, Home, Car, UserCircle, Cake, Phone, MapPin, Globe, Heart, Baby, Pencil, Save, X, Star, Scale, MessageCircle, Trophy,
  BookOpen, Plane, HeartPulse, Loader2, Image as ImageIcon, Bell
} from 'lucide-react';
import { ImagePreviewModal } from '@/components/modals/ImagePreviewModal';
import { useEmployeeDocuments } from '@/hooks/useDocuments';
import { EmployeeAttendanceCalendar } from '@/components/attendance/EmployeeAttendanceCalendar';
import { EmployeeGamificationCard } from '@/components/gamification/EmployeeGamificationCard';
import { cn } from '@/lib/utils';
import { format, parseISO, differenceInDays, addMonths } from 'date-fns';
import { toast } from 'sonner';
import type { Employee } from '@/types/hr';

type TabType = 'overview' | 'attendance' | 'leave' | 'contract' | 'letters' | 'personal' | 'records' | 'gamification' | 'documents';

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
    current_address: '',
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

  // Enable realtime subscriptions for instant updates (WebSocket - no polling)
  useRealtimeAttendance();
  useRealtimeLeave();

  // Hooks for data - attendance and leave use realtime, others use standard fetch
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

  // Calculate Annual Leave balance only (to match card view consistency)
  const annualLeaveBalance = useMemo(() => {
    const annualLeave = leaveBalances.find(lb => 
      (lb as any).leave_types?.code === 'ANNUAL' || (lb as any).leave_types?.name === 'Annual Leave'
    );
    if (!annualLeave) return 0;
    const available = (annualLeave.entitled_days || 0) + 
                      (annualLeave.carried_forward_days || 0) - 
                      (annualLeave.used_days || 0) - 
                      (annualLeave.pending_days || 0);
    return Math.max(0, available);
  }, [leaveBalances]);

  // Calculate probation status (6 months from joining date)
  const probationStatus = useMemo(() => {
    if (!employee?.joining_date) return null;
    
    const joiningDate = parseISO(employee.joining_date);
    const now = new Date();
    const probationEndDate = addMonths(joiningDate, 6);
    
    const daysRemaining = differenceInDays(probationEndDate, now);
    
    // If probation has ended (passed 6 months)
    if (daysRemaining <= 0) {
      return { isOnProbation: false, daysRemaining: 0, percentComplete: 100, endDate: probationEndDate };
    }
    
    // Calculate progress percentage
    const totalProbationDays = differenceInDays(probationEndDate, joiningDate);
    const daysElapsed = differenceInDays(now, joiningDate);
    const percentComplete = Math.round((daysElapsed / totalProbationDays) * 100);
    
    return { 
      isOnProbation: true, 
      daysRemaining, 
      percentComplete,
      endDate: probationEndDate 
    };
  }, [employee?.joining_date]);

  // Employee visible leave types only (5 core types with gender filtering)
  const EMPLOYEE_VISIBLE_CODES = ['ANNUAL', 'LOP', 'SICK', 'MATERNITY', 'PATERNITY'];
  const filteredLeaveTypes = useMemo(() => {
    return leaveTypes.filter(type => {
      if (!EMPLOYEE_VISIBLE_CODES.includes(type.code)) return false;
      if (type.code === 'MATERNITY' && employee?.gender !== 'Female') return false;
      if (type.code === 'PATERNITY' && employee?.gender !== 'Male') return false;
      return true;
    });
  }, [leaveTypes, employee?.gender]);

  const defaultLeaveType = filteredLeaveTypes.length > 0 ? filteredLeaveTypes[0].name : 'Annual Leave';

  // Leave request form
  const [leaveForm, setLeaveForm] = useState({
    leave_type: 'Annual Leave',
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
    { id: 'documents' as TabType, label: 'Documents', icon: ImageIcon },
    { id: 'letters' as TabType, label: 'HR Letters', icon: Mail },
    { id: 'records' as TabType, label: 'Records', icon: Scale },
    { id: 'gamification' as TabType, label: 'Points & Badges', icon: Trophy },
  ];

  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

  return (
    <div className="min-h-screen japanese-bg pb-20">
      {/* Wooden Top Frame Header */}
      <header className="wooden-top-bar sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Profile Section */}
            <div className="flex items-center gap-3">
              {employee.photo_url ? (
                <div className="w-14 h-14 rounded-full border-3 border-white shadow-lg overflow-hidden">
                  <img src={employee.photo_url} alt={employee.full_name} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-14 h-14 rounded-full border-3 border-white shadow-lg avatar-gradient flex items-center justify-center text-lg font-bold text-white">
                  {getInitials(employee.full_name)}
                </div>
              )}
              <div>
                <h1 className="text-lg font-bold text-[#2d2416]">{employee.full_name}</h1>
                <p className="text-sm text-[#5d4a36]">{employee.job_position}</p>
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex items-center gap-3">
              <button className="p-2 rounded-full hover:bg-white/30 transition-colors">
                <Bell className="w-5 h-5 text-[#5d4a36]" />
              </button>
              <button className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/30 hover:bg-white/50 transition-colors">
                <ArrowLeft className="w-4 h-4 text-[#5d4a36]" />
                <span className="text-sm font-medium text-[#2d2416]">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6 animate-fade-in">
            {/* Stats Cards - Japanese Style */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Leave Balance Card */}
              <div className="cream-card cream-card-hover p-4">
                <div className="flex items-start gap-3">
                  <div className="stat-icon-bg">
                    <Calendar className="w-6 h-6 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-4xl font-bold text-purple-600">
                      {leaveBalances.length > 0 ? annualLeaveBalance : '0'}
                    </p>
                    <p className="text-sm text-[#5d4a36] mt-1">Annual Leave Balance</p>
                  </div>
                </div>
              </div>

              {/* Days This Month Card */}
              <div className="cream-card cream-card-hover p-4">
                <div className="flex items-start gap-3">
                  <div className="stat-icon-bg">
                    <Clock className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-4xl font-bold text-[#2d2416]">0</p>
                    <p className="text-sm text-[#5d4a36] mt-1">Days This Month</p>
                  </div>
                </div>
              </div>

              {/* Pending Requests Card */}
              <div className="cream-card cream-card-hover p-4">
                <div className="flex items-start gap-3">
                  <div className="stat-icon-bg">
                    <FileText className="w-6 h-6 text-amber-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-4xl font-bold text-[#2d2416]">
                      {leaveRecords.filter(l => l.status === 'Pending').length}
                    </p>
                    <p className="text-sm text-[#5d4a36] mt-1">Pending Requests</p>
                  </div>
                </div>
              </div>

              {/* Total Points Card */}
              <div className="cream-card cream-card-hover p-4">
                <div className="flex items-start gap-3">
                  <div className="stat-icon-bg">
                    <Trophy className="w-6 h-6 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-4xl font-bold text-[#2d2416]">0</p>
                    <p className="text-sm text-[#5d4a36] mt-1">Total Points</p>
                  </div>
                </div>
              </div>

              {/* Probation Card - Only shows if on probation */}
              {probationStatus?.isOnProbation && (
                <div className="cream-card cream-card-hover p-4">
                  <div className="flex items-start gap-3">
                    <div className="stat-icon-bg">
                      <Briefcase className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-4xl font-bold text-blue-600">{probationStatus.daysRemaining}</p>
                      <p className="text-sm text-[#5d4a36] mt-1">Probation Days Left</p>
                      {/* Progress bar */}
                      <div className="w-full bg-blue-100 rounded-full h-1.5 mt-2">
                        <div 
                          className="bg-blue-500 h-1.5 rounded-full transition-all duration-500" 
                          style={{ width: `${probationStatus.percentComplete}%` }}
                        />
                      </div>
                      <p className="text-xs text-[#5d4a36] mt-1">
                        Ends: {format(probationStatus.endDate, 'MMM dd, yyyy')}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Request Leave Button - Purple Gradient */}
            <div>
              <Dialog open={isLeaveModalOpen} onOpenChange={setIsLeaveModalOpen}>
                <DialogTrigger asChild>
                  <button className="purple-gradient-btn text-white font-semibold px-6 py-3 rounded-xl flex items-center gap-2 text-base">
                    <Plus className="w-5 h-5" />
                    Request Leave
                  </button>
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
                          {filteredLeaveTypes.length > 0 ? filteredLeaveTypes.map((type) => (
                            <SelectItem key={type.id} value={type.name}>{type.name}</SelectItem>
                          )) : (
                            <SelectItem value="Annual Leave">Annual Leave</SelectItem>
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
          <div className="space-y-6 animate-fade-in japanese-scenic min-h-[70vh] rounded-2xl p-6">
            {/* Leave History Header */}
            <div>
              <h2 className="text-2xl font-bold text-[#2d2416] mb-1">Leave History</h2>
              <p className="text-sm text-[#5d4a36]">Your leave requests and balance</p>
            </div>

            {/* Leave Records */}
            {leaveRecords.length === 0 ? (
              <div className="cream-card p-8 text-center">
                <Calendar className="w-12 h-12 mx-auto mb-3 text-[#8b6f47] opacity-40" />
                <p className="text-muted-foreground">No leave requests found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {leaveRecords.map((record) => (
                  <div key={record.id} className="leave-history-card">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-[#2d2416]">{record.leave_type} Leave</h3>
                          <span className={cn(
                            record.status === 'Approved' && "approved-badge",
                            record.status === 'Pending' && "pending-badge",
                            record.status === 'Rejected' && "rejected-badge"
                          )}>
                            {record.status}
                          </span>
                        </div>
                        <p className="text-sm text-[#5d4a36]">
                          {format(parseISO(record.start_date), 'dd MMM yyyy')} – {format(parseISO(record.end_date), 'dd MMM yyyy')}
                        </p>
                        {record.reason && (
                          <p className="text-xs text-[#5d4a36] mt-1 italic">{record.reason}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-[#2d2416]">{record.days_count}</p>
                        <p className="text-xs text-[#5d4a36]">days</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Request Leave Button */}
            <Dialog open={isLeaveModalOpen} onOpenChange={setIsLeaveModalOpen}>
              <DialogTrigger asChild>
                <button className="purple-gradient-btn text-white font-semibold px-6 py-3 rounded-xl flex items-center gap-2 text-base w-full justify-center">
                  <Plus className="w-5 h-5" />
                  Request Leave
                </button>
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
          <div className="animate-fade-in space-y-4">
            <div className="cream-card p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-[#2d2416]">Personal Information</h2>
                {!isEditingPersonal ? (
                  <button 
                    onClick={() => {
                      setPersonalInfo({
                        gender: employee.gender || '',
                        birthday: employee.birthday || '',
                        personal_email: employee.personal_email || '',
                        personal_phone: employee.personal_phone || '',
                        current_address: (employee as any).current_address || '',
                        place_of_birth: employee.place_of_birth || '',
                        country_of_birth: employee.country_of_birth || '',
                        family_status: employee.family_status || '',
                        number_of_children: employee.number_of_children || 0,
                        nationality: employee.nationality || '',
                      });
                      setIsEditingPersonal(true);
                    }}
                    className="px-4 py-2 rounded-lg bg-white hover:bg-gray-50 transition-colors border border-[#e8dcc8] text-[#2d2416] font-medium text-sm flex items-center gap-2"
                  >
                    <Pencil className="w-4 h-4" />
                    Edit
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setIsEditingPersonal(false)}
                      disabled={savingPersonal}
                      className="px-4 py-2 rounded-lg bg-white hover:bg-gray-50 transition-colors border border-[#e8dcc8] text-[#5d4a36] font-medium text-sm flex items-center gap-2"
                    >
                      <X className="w-4 h-4" />
                      Cancel
                    </button>
                    <button 
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
                              current_address: personalInfo.current_address || null,
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
                      className="purple-gradient-btn px-4 py-2 rounded-lg text-white font-medium text-sm flex items-center gap-2"
                    >
                      <Save className="w-4 h-4" />
                      {savingPersonal ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                )}
              </div>

              {isEditingPersonal ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs text-[#5d4a36] uppercase font-medium">Gender</label>
                      <Select value={personalInfo.gender} onValueChange={(v) => setPersonalInfo({ ...personalInfo, gender: v })}>
                        <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Male">Male</SelectItem>
                          <SelectItem value="Female">Female</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs text-[#5d4a36] uppercase font-medium">Birthday</label>
                      <Input type="date" value={personalInfo.birthday} onChange={(e) => setPersonalInfo({ ...personalInfo, birthday: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-xs text-[#5d4a36] uppercase font-medium">Personal Email</label>
                      <Input type="email" value={personalInfo.personal_email} onChange={(e) => setPersonalInfo({ ...personalInfo, personal_email: e.target.value })} placeholder="personal@email.com" />
                    </div>
                    <div>
                      <label className="text-xs text-[#5d4a36] uppercase font-medium">Personal Phone</label>
                      <Input type="tel" value={personalInfo.personal_phone} onChange={(e) => setPersonalInfo({ ...personalInfo, personal_phone: e.target.value })} placeholder="+971 XX XXX XXXX" />
                    </div>
                    <div>
                      <label className="text-xs text-[#5d4a36] uppercase font-medium">Current Address</label>
                      <Textarea value={personalInfo.current_address} onChange={(e) => setPersonalInfo({ ...personalInfo, current_address: e.target.value })} placeholder="Enter current address" rows={2} />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs text-[#5d4a36] uppercase font-medium">Place of Birth</label>
                      <Input value={personalInfo.place_of_birth} onChange={(e) => setPersonalInfo({ ...personalInfo, place_of_birth: e.target.value })} placeholder="City" />
                    </div>
                    <div>
                      <label className="text-xs text-[#5d4a36] uppercase font-medium">Country of Birth</label>
                      <Input value={personalInfo.country_of_birth} onChange={(e) => setPersonalInfo({ ...personalInfo, country_of_birth: e.target.value })} placeholder="Country" />
                    </div>
                    <div>
                      <label className="text-xs text-[#5d4a36] uppercase font-medium">Family Status</label>
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
                      <label className="text-xs text-[#5d4a36] uppercase font-medium">Number of Children</label>
                      <Input type="number" min="0" value={personalInfo.number_of_children} onChange={(e) => setPersonalInfo({ ...personalInfo, number_of_children: parseInt(e.target.value) || 0 })} />
                    </div>
                    <div>
                      <label className="text-xs text-[#5d4a36] uppercase font-medium">Nationality</label>
                      <Input value={personalInfo.nationality} onChange={(e) => setPersonalInfo({ ...personalInfo, nationality: e.target.value })} placeholder="Nationality" />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Left Column */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-white/60 border border-[#e8dcc8]">
                      <User className="w-5 h-5 text-[#8b6f47]" />
                      <div>
                        <p className="text-xs text-[#5d4a36] uppercase font-medium">Gender</p>
                        <p className="font-semibold text-[#2d2416]">{employee.gender || 'Not specified'}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-white/60 border border-[#e8dcc8]">
                      <Cake className="w-5 h-5 text-[#8b6f47]" />
                      <div>
                        <p className="text-xs text-[#5d4a36] uppercase font-medium">Birthday</p>
                        <p className="font-semibold text-[#2d2416]">
                          {employee.birthday ? format(parseISO(employee.birthday), 'dd MMMM yyyy') : 'Not specified'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-white/60 border border-[#e8dcc8]">
                      <Mail className="w-5 h-5 text-[#8b6f47]" />
                      <div>
                        <p className="text-xs text-[#5d4a36] uppercase font-medium">Personal Email</p>
                        <p className="font-semibold text-[#2d2416]">{employee.personal_email || 'Not specified'}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-white/60 border border-[#e8dcc8]">
                      <Phone className="w-5 h-5 text-[#8b6f47]" />
                      <div className="flex-1">
                        <p className="text-xs text-[#5d4a36] uppercase font-medium">Personal Phone</p>
                        <p className="font-semibold text-[#2d2416] flex items-center gap-2">
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
                    
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-white/60 border border-[#e8dcc8]">
                      <MapPin className="w-5 h-5 text-[#8b6f47]" />
                      <div>
                        <p className="text-xs text-[#5d4a36] uppercase font-medium">Current Address</p>
                        <p className="font-semibold text-[#2d2416]">{(employee as any).current_address || 'Not specified'}</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Right Column */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-white/60 border border-[#e8dcc8]">
                      <Globe className="w-5 h-5 text-[#8b6f47]" />
                      <div>
                        <p className="text-xs text-[#5d4a36] uppercase font-medium">Place of Birth</p>
                        <p className="font-semibold text-[#2d2416]">{employee.place_of_birth || 'Not specified'}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-white/60 border border-[#e8dcc8]">
                      <Globe className="w-5 h-5 text-[#8b6f47]" />
                      <div>
                        <p className="text-xs text-[#5d4a36] uppercase font-medium">Country of Birth</p>
                        <p className="font-semibold text-[#2d2416]">{employee.country_of_birth || 'Not specified'}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-white/60 border border-[#e8dcc8]">
                      <Heart className="w-5 h-5 text-[#8b6f47]" />
                      <div>
                        <p className="text-xs text-[#5d4a36] uppercase font-medium">Family Status</p>
                        <p className="font-semibold text-[#2d2416]">{employee.family_status || 'Not specified'}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-white/60 border border-[#e8dcc8]">
                      <Baby className="w-5 h-5 text-[#8b6f47]" />
                      <div>
                        <p className="text-xs text-[#5d4a36] uppercase font-medium">Number of Children</p>
                        <p className="font-semibold text-[#2d2416]">{employee.number_of_children ?? 0}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-white/60 border border-[#e8dcc8]">
                      <Globe className="w-5 h-5 text-[#8b6f47]" />
                      <div>
                        <p className="text-xs text-[#5d4a36] uppercase font-medium">Nationality</p>
                        <p className="font-semibold text-[#2d2416]">{employee.nationality || 'Not specified'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
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

        {/* Documents Tab */}
        {activeTab === 'documents' && (
          <div className="space-y-4 animate-fade-in">
            {/* Key Documents Grid - Mobile Optimized */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                  <CreditCard className="w-5 h-5 text-primary" />
                  Identity & Key Documents
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
                  {/* Photo */}
                  {(() => {
                    return (
                      <div className="group relative rounded-xl border-2 border-dashed border-border bg-gradient-to-br from-pink-500/5 to-purple-500/5 hover:border-pink-500/50 transition-all overflow-hidden">
                        <div className="aspect-square flex items-center justify-center p-3">
                          {employee.photo_url ? (
                            <div 
                              className="relative w-full h-full cursor-pointer"
                              onClick={() => setPreviewImage({ url: employee.photo_url!, title: 'Employee Photo' })}
                            >
                              <img
                                src={employee.photo_url}
                                alt="Photo"
                                className="w-full h-full rounded-lg object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-lg" />
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                              <UserCircle className="w-12 h-12 opacity-40" />
                              <span className="text-[10px] font-medium">No Photo</span>
                            </div>
                          )}
                        </div>
                        <div className="px-2 py-1.5 bg-gradient-to-t from-background/80 to-transparent">
                          <p className="text-[11px] font-semibold text-center text-foreground">Photo</p>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Emirates ID */}
                  {(() => {
                    const doc = documents.find(d => d.category === 'Emirates ID' && !d.is_renewed);
                    const isImage = doc?.file_url && /\.(jpg|jpeg|png|gif|webp)$/i.test(doc.file_url);
                    return (
                      <div className="group relative rounded-xl border-2 border-dashed border-border bg-gradient-to-br from-primary/5 to-accent/5 hover:border-primary/50 transition-all overflow-hidden">
                        <div 
                          className="aspect-square flex items-center justify-center p-3 cursor-pointer"
                          onClick={() => {
                            if (doc) {
                              if (isImage) {
                                setPreviewImage({ url: doc.file_url, title: 'Emirates ID' });
                              } else {
                                window.open(doc.file_url, '_blank');
                              }
                            }
                          }}
                        >
                          {doc ? (
                            isImage ? (
                              <div className="relative w-full h-full">
                                <img
                                  src={doc.file_url}
                                  alt="Emirates ID"
                                  className="w-full h-full rounded-lg object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-lg" />
                              </div>
                            ) : (
                              <div className="w-16 h-16 rounded-xl bg-primary/20 flex items-center justify-center group-hover:scale-105 transition-transform">
                                <CreditCard className="w-8 h-8 text-primary" />
                              </div>
                            )
                          ) : (
                            <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                              <CreditCard className="w-12 h-12 opacity-40" />
                              <span className="text-[10px] font-medium">Not uploaded</span>
                            </div>
                          )}
                        </div>
                        <div className="px-2 py-1.5 bg-gradient-to-t from-background/80 to-transparent">
                          <p className="text-[11px] font-semibold text-center text-foreground">Emirates ID</p>
                          {doc?.expiry_date && (
                            <p className="text-[9px] text-center text-muted-foreground mt-0.5">
                              Exp: {format(parseISO(doc.expiry_date), 'MMM yyyy')}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Passport */}
                  {(() => {
                    const doc = documents.find(d => d.category === 'Passport' && !d.is_renewed);
                    const isImage = doc?.file_url && /\.(jpg|jpeg|png|gif|webp)$/i.test(doc.file_url);
                    return (
                      <div className="group relative rounded-xl border-2 border-dashed border-border bg-gradient-to-br from-blue-500/5 to-indigo-500/5 hover:border-blue-500/50 transition-all overflow-hidden">
                        <div 
                          className="aspect-square flex items-center justify-center p-3 cursor-pointer"
                          onClick={() => {
                            if (doc) {
                              if (isImage) {
                                setPreviewImage({ url: doc.file_url, title: 'Passport' });
                              } else {
                                window.open(doc.file_url, '_blank');
                              }
                            }
                          }}
                        >
                          {doc ? (
                            isImage ? (
                              <div className="relative w-full h-full">
                                <img
                                  src={doc.file_url}
                                  alt="Passport"
                                  className="w-full h-full rounded-lg object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-lg" />
                              </div>
                            ) : (
                              <div className="w-16 h-16 rounded-xl bg-blue-500/20 flex items-center justify-center group-hover:scale-105 transition-transform">
                                <BookOpen className="w-8 h-8 text-blue-500" />
                              </div>
                            )
                          ) : (
                            <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                              <BookOpen className="w-12 h-12 opacity-40" />
                              <span className="text-[10px] font-medium">Not uploaded</span>
                            </div>
                          )}
                        </div>
                        <div className="px-2 py-1.5 bg-gradient-to-t from-background/80 to-transparent">
                          <p className="text-[11px] font-semibold text-center text-foreground">Passport</p>
                          {doc?.expiry_date && (
                            <p className="text-[9px] text-center text-muted-foreground mt-0.5">
                              Exp: {format(parseISO(doc.expiry_date), 'MMM yyyy')}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Visa */}
                  {(() => {
                    const doc = documents.find(d => d.category === 'Visa' && !d.is_renewed);
                    const isImage = doc?.file_url && /\.(jpg|jpeg|png|gif|webp)$/i.test(doc.file_url);
                    return (
                      <div className="group relative rounded-xl border-2 border-dashed border-border bg-gradient-to-br from-accent/5 to-primary/5 hover:border-accent/50 transition-all overflow-hidden">
                        <div 
                          className="aspect-square flex items-center justify-center p-3 cursor-pointer"
                          onClick={() => {
                            if (doc) {
                              if (isImage) {
                                setPreviewImage({ url: doc.file_url, title: 'Visa' });
                              } else {
                                window.open(doc.file_url, '_blank');
                              }
                            }
                          }}
                        >
                          {doc ? (
                            isImage ? (
                              <div className="relative w-full h-full">
                                <img
                                  src={doc.file_url}
                                  alt="Visa"
                                  className="w-full h-full rounded-lg object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-lg" />
                              </div>
                            ) : (
                              <div className="w-16 h-16 rounded-xl bg-accent/20 flex items-center justify-center group-hover:scale-105 transition-transform">
                                <Plane className="w-8 h-8 text-accent-foreground" />
                              </div>
                            )
                          ) : (
                            <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                              <Plane className="w-12 h-12 opacity-40" />
                              <span className="text-[10px] font-medium">Not uploaded</span>
                            </div>
                          )}
                        </div>
                        <div className="px-2 py-1.5 bg-gradient-to-t from-background/80 to-transparent">
                          <p className="text-[11px] font-semibold text-center text-foreground">Visa</p>
                          {doc?.expiry_date && (
                            <p className="text-[9px] text-center text-muted-foreground mt-0.5">
                              Exp: {format(parseISO(doc.expiry_date), 'MMM yyyy')}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Work Permit */}
                  {(() => {
                    const doc = documents.find(d => d.category === 'Work Permit' && !d.is_renewed);
                    const isImage = doc?.file_url && /\.(jpg|jpeg|png|gif|webp)$/i.test(doc.file_url);
                    return (
                      <div className="group relative rounded-xl border-2 border-dashed border-border bg-gradient-to-br from-orange-500/5 to-amber-500/5 hover:border-orange-500/50 transition-all overflow-hidden">
                        <div 
                          className="aspect-square flex items-center justify-center p-3 cursor-pointer"
                          onClick={() => {
                            if (doc) {
                              if (isImage) {
                                setPreviewImage({ url: doc.file_url, title: 'Work Permit' });
                              } else {
                                window.open(doc.file_url, '_blank');
                              }
                            }
                          }}
                        >
                          {doc ? (
                            isImage ? (
                              <div className="relative w-full h-full">
                                <img
                                  src={doc.file_url}
                                  alt="Work Permit"
                                  className="w-full h-full rounded-lg object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-lg" />
                              </div>
                            ) : (
                              <div className="w-16 h-16 rounded-xl bg-orange-500/20 flex items-center justify-center group-hover:scale-105 transition-transform">
                                <Briefcase className="w-8 h-8 text-orange-500" />
                              </div>
                            )
                          ) : (
                            <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                              <Briefcase className="w-12 h-12 opacity-40" />
                              <span className="text-[10px] font-medium">Not uploaded</span>
                            </div>
                          )}
                        </div>
                        <div className="px-2 py-1.5 bg-gradient-to-t from-background/80 to-transparent">
                          <p className="text-[11px] font-semibold text-center text-foreground">Work Permit</p>
                          {doc?.expiry_date && (
                            <p className="text-[9px] text-center text-muted-foreground mt-0.5">
                              Exp: {format(parseISO(doc.expiry_date), 'MMM yyyy')}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Medical Insurance */}
                  {(() => {
                    const doc = documents.find(d => d.category === 'Medical Insurance' && !d.is_renewed);
                    const isImage = doc?.file_url && /\.(jpg|jpeg|png|gif|webp)$/i.test(doc.file_url);
                    return (
                      <div className="group relative rounded-xl border-2 border-dashed border-border bg-gradient-to-br from-rose-500/5 to-pink-500/5 hover:border-rose-500/50 transition-all overflow-hidden">
                        <div 
                          className="aspect-square flex items-center justify-center p-3 cursor-pointer"
                          onClick={() => {
                            if (doc) {
                              if (isImage) {
                                setPreviewImage({ url: doc.file_url, title: 'Medical Insurance' });
                              } else {
                                window.open(doc.file_url, '_blank');
                              }
                            }
                          }}
                        >
                          {doc ? (
                            isImage ? (
                              <div className="relative w-full h-full">
                                <img
                                  src={doc.file_url}
                                  alt="Medical Insurance"
                                  className="w-full h-full rounded-lg object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-lg" />
                              </div>
                            ) : (
                              <div className="w-16 h-16 rounded-xl bg-rose-500/20 flex items-center justify-center group-hover:scale-105 transition-transform">
                                <HeartPulse className="w-8 h-8 text-rose-500" />
                              </div>
                            )
                          ) : (
                            <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                              <HeartPulse className="w-12 h-12 opacity-40" />
                              <span className="text-[10px] font-medium">Not uploaded</span>
                            </div>
                          )}
                        </div>
                        <div className="px-2 py-1.5 bg-gradient-to-t from-background/80 to-transparent">
                          <p className="text-[11px] font-semibold text-center text-foreground">Medical</p>
                          {doc?.expiry_date && (
                            <p className="text-[9px] text-center text-muted-foreground mt-0.5">
                              Exp: {format(parseISO(doc.expiry_date), 'MMM yyyy')}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Contract */}
                  {(() => {
                    const doc = documents.find(d => d.category === 'Contract' && !d.is_renewed);
                    const isImage = doc?.file_url && /\.(jpg|jpeg|png|gif|webp)$/i.test(doc.file_url);
                    return (
                      <div className="group relative rounded-xl border-2 border-dashed border-border bg-gradient-to-br from-green-500/5 to-emerald-500/5 hover:border-green-500/50 transition-all overflow-hidden">
                        <div 
                          className="aspect-square flex items-center justify-center p-3 cursor-pointer"
                          onClick={() => {
                            if (doc) {
                              if (isImage) {
                                setPreviewImage({ url: doc.file_url, title: 'Contract' });
                              } else {
                                window.open(doc.file_url, '_blank');
                              }
                            }
                          }}
                        >
                          {doc ? (
                            isImage ? (
                              <div className="relative w-full h-full">
                                <img
                                  src={doc.file_url}
                                  alt="Contract"
                                  className="w-full h-full rounded-lg object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-lg" />
                              </div>
                            ) : (
                              <div className="w-16 h-16 rounded-xl bg-green-500/20 flex items-center justify-center group-hover:scale-105 transition-transform">
                                <FileText className="w-8 h-8 text-green-500" />
                              </div>
                            )
                          ) : (
                            <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                              <FileText className="w-12 h-12 opacity-40" />
                              <span className="text-[10px] font-medium">Not uploaded</span>
                            </div>
                          )}
                        </div>
                        <div className="px-2 py-1.5 bg-gradient-to-t from-background/80 to-transparent">
                          <p className="text-[11px] font-semibold text-center text-foreground">Contract</p>
                        </div>
                      </div>
                    );
                  })()}

                  {/* ILOE */}
                  {(() => {
                    const doc = documents.find(d => d.category === 'ILOE' && !d.is_renewed);
                    const isImage = doc?.file_url && /\.(jpg|jpeg|png|gif|webp)$/i.test(doc.file_url);
                    return (
                      <div className="group relative rounded-xl border-2 border-dashed border-border bg-gradient-to-br from-cyan-500/5 to-teal-500/5 hover:border-cyan-500/50 transition-all overflow-hidden">
                        <div 
                          className="aspect-square flex items-center justify-center p-3 cursor-pointer"
                          onClick={() => {
                            if (doc) {
                              if (isImage) {
                                setPreviewImage({ url: doc.file_url, title: 'ILOE' });
                              } else {
                                window.open(doc.file_url, '_blank');
                              }
                            }
                          }}
                        >
                          {doc ? (
                            isImage ? (
                              <div className="relative w-full h-full">
                                <img
                                  src={doc.file_url}
                                  alt="ILOE"
                                  className="w-full h-full rounded-lg object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-lg" />
                              </div>
                            ) : (
                              <div className="w-16 h-16 rounded-xl bg-cyan-500/20 flex items-center justify-center group-hover:scale-105 transition-transform">
                                <FileText className="w-8 h-8 text-cyan-500" />
                              </div>
                            )
                          ) : (
                            <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                              <FileText className="w-12 h-12 opacity-40" />
                              <span className="text-[10px] font-medium">Not uploaded</span>
                            </div>
                          )}
                        </div>
                        <div className="px-2 py-1.5 bg-gradient-to-t from-background/80 to-transparent">
                          <p className="text-[11px] font-semibold text-center text-foreground">ILOE</p>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </CardContent>
            </Card>

            {/* Other Documents - Modern Grid Layout */}
            {documents.filter(d => !['Photo', 'Emirates ID', 'Visa', 'Passport', 'Contract', 'Work Permit', 'Medical Insurance', 'ILOE'].includes(d.category || '') && !d.is_renewed).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                    <FileText className="w-5 h-5 text-primary" />
                    Other Documents ({documents.filter(d => !['Photo', 'Emirates ID', 'Visa', 'Passport', 'Contract', 'Work Permit', 'Medical Insurance', 'ILOE'].includes(d.category || '') && !d.is_renewed).length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
                    {documents
                      .filter(d => !['Photo', 'Emirates ID', 'Visa', 'Passport', 'Contract', 'Work Permit', 'Medical Insurance', 'ILOE'].includes(d.category || '') && !d.is_renewed)
                      .map((doc) => {
                        const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(doc.file_url);
                        const isPdf = /\.pdf$/i.test(doc.file_url);
                        const hasExpiry = doc.expiry_date;
                        const expiryDate = hasExpiry ? parseISO(doc.expiry_date!) : null;
                        const daysUntilExpiry = expiryDate ? differenceInDays(expiryDate, new Date()) : null;
                        const isExpired = daysUntilExpiry !== null && daysUntilExpiry < 0;
                        const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry >= 0 && daysUntilExpiry <= 30;

                        return (
                          <div
                            key={doc.id}
                            className="group relative rounded-xl border border-border bg-card overflow-hidden hover:shadow-lg hover:border-primary/40 transition-all duration-300"
                          >
                            {/* Thumbnail Area */}
                            <div
                              className="aspect-square bg-gradient-to-br from-muted/30 to-muted/10 flex items-center justify-center cursor-pointer overflow-hidden relative"
                              onClick={() => {
                                if (isImage) {
                                  setPreviewImage({ url: doc.file_url, title: doc.name });
                                } else {
                                  window.open(doc.file_url, '_blank');
                                }
                              }}
                            >
                              {isImage ? (
                                <>
                                  <img
                                    src={doc.file_url}
                                    alt={doc.name}
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                    loading="lazy"
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement;
                                      target.style.display = 'none';
                                      const parent = target.parentElement;
                                      if (parent) {
                                        parent.innerHTML = `
                                          <div class="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                                            <svg class="w-12 h-12 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                            </svg>
                                            <span class="text-[10px] font-medium">Failed to load</span>
                                          </div>
                                        `;
                                      }
                                    }}
                                  />
                                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                    <Eye className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                  </div>
                                </>
                              ) : isPdf ? (
                                <div className="flex flex-col items-center justify-center gap-2 p-4">
                                  <div className="w-14 h-14 rounded-xl bg-red-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <FileText className="w-7 h-7 text-red-500" />
                                  </div>
                                  <span className="text-[10px] font-semibold text-red-500 uppercase tracking-wider">PDF</span>
                                </div>
                              ) : (
                                <div className="flex flex-col items-center justify-center gap-2 p-4">
                                  <div className="w-14 h-14 rounded-xl bg-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <FileText className="w-7 h-7 text-primary" />
                                  </div>
                                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                                    {doc.file_url.split('.').pop()?.toUpperCase() || 'FILE'}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Status Badge */}
                            {hasExpiry && (
                              <div
                                className={cn(
                                  'absolute top-2 right-2 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide shadow-lg backdrop-blur-sm',
                                  isExpired
                                    ? 'bg-destructive/90 text-destructive-foreground'
                                    : isExpiringSoon
                                    ? 'bg-amber-500/90 text-white'
                                    : 'bg-emerald-500/90 text-white'
                                )}
                              >
                                {isExpired ? '⚠ Expired' : isExpiringSoon ? `${daysUntilExpiry}d left` : '✓ Valid'}
                              </div>
                            )}

                            {/* Category Badge */}
                            {doc.category && (
                              <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-primary/90 text-primary-foreground text-[9px] font-bold uppercase tracking-wide shadow-lg backdrop-blur-sm max-w-[70%] truncate">
                                {doc.category}
                              </div>
                            )}

                            {/* Document Info Footer */}
                            <div className="p-2.5 bg-gradient-to-t from-muted/50 to-transparent">
                              <p className="text-xs font-semibold text-foreground truncate mb-0.5" title={doc.name}>
                                {doc.name}
                              </p>
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[10px] text-muted-foreground">{doc.file_size}</span>
                                {hasExpiry && expiryDate && (
                                  <span className="text-[10px] text-muted-foreground">
                                    {format(expiryDate, 'MMM yyyy')}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Quick Actions Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-12 gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (isImage) {
                                    setPreviewImage({ url: doc.file_url, title: doc.name });
                                  } else {
                                    window.open(doc.file_url, '_blank');
                                  }
                                }}
                                className="p-2 rounded-full bg-white/90 hover:bg-white transition-colors shadow-lg"
                                title="View"
                              >
                                <Eye className="w-4 h-4 text-gray-900" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.open(doc.file_url, '_blank');
                                }}
                                className="p-2 rounded-full bg-white/90 hover:bg-white transition-colors shadow-lg"
                                title="Download"
                              >
                                <Download className="w-4 h-4 text-gray-900" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Empty State */}
            {documents.length === 0 && (
              <Card>
                <CardContent className="py-12 text-center">
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-20 h-20 rounded-full bg-muted/30 flex items-center justify-center">
                      <FileText className="w-10 h-10 text-muted-foreground/50" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-foreground mb-1">No Documents Yet</h3>
                      <p className="text-sm text-muted-foreground">Your documents will appear here once uploaded by HR</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
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

      {/* Bottom Navigation Bar - Japanese Style */}
      <nav className="fixed bottom-0 left-0 right-0 bottom-nav-bar z-30">
        <div className="max-w-6xl mx-auto px-2 py-2">
          <div className="flex items-center justify-around">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "nav-icon-btn",
                  activeTab === tab.id && "active"
                )}
              >
                <tab.icon className={cn(
                  "w-6 h-6",
                  activeTab === tab.id ? "text-white" : "text-[#5d4a36]"
                )} />
                <span className={cn(
                  "text-xs font-medium",
                  activeTab === tab.id ? "text-white" : "text-[#2d2416]"
                )}>
                  {tab.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </nav>
    </div>
  );
}
