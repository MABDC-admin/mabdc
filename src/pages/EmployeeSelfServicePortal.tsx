import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useAttendance, useRealtimeAttendance } from '@/hooks/useAttendance';
import { useLeave, useLeaveTypes, useLeaveBalances, useRealtimeLeave } from '@/hooks/useLeave';
import { useContracts } from '@/hooks/useContracts';
import { useEmployeeHRLetters } from '@/hooks/useHRLetters';
import { usePerformance } from '@/hooks/usePerformance';
import { useDiscipline } from '@/hooks/useDiscipline';
import { useEmployeeGamification, useEmployeeBadges } from '@/hooks/useGamification';
import { useEmployeeDocuments } from '@/hooks/useDocuments';
import { useCapacitorNotifications } from '@/hooks/useCapacitorNotifications';
import { useNativeBiometric } from '@/hooks/useNativeBiometric';
import { EmployeeAttendanceCalendar } from '@/components/attendance/EmployeeAttendanceCalendar';
import { EmployeeGamificationCard } from '@/components/gamification/EmployeeGamificationCard';
import { LeaveRequestModal } from '@/components/modals/LeaveRequestModal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  User, Calendar, FileText, Award, Clock, LogOut, 
  Briefcase, Mail, Phone, MapPin, Building2, 
  CalendarDays, TrendingUp, AlertTriangle, FileCheck,
  Loader2, Plus, Star, Shield, Image as ImageIcon, CreditCard,
  BookOpen, Plane, HeartPulse, UserCircle, Eye
} from 'lucide-react';
import { ImagePreviewModal } from '@/components/modals/ImagePreviewModal';
import { PasskeyManagement } from '@/components/PasskeyManagement';
import { NotificationSettings } from '@/components/NotificationSettings';
import { NotificationBell } from '@/components/NotificationBell';
import { HRAssistantChat } from '@/components/admin/HRAssistantChat';
import { toast } from 'sonner';
import { format, parseISO, differenceInDays, addMonths } from 'date-fns';
import { useUpdateEmployee } from '@/hooks/useEmployees';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Edit } from 'lucide-react';

interface Employee {
  id: string;
  hrms_no: string;
  full_name: string;
  job_position: string;
  department: string;
  work_email: string;
  work_phone: string;
  photo_url: string | null;
  status: string;
  joining_date: string;
  leave_balance: number;
  nationality: string | null;
  emirates_id: string | null;
  passport_no: string | null;
  visa_expiration: string | null;
  user_id: string | null;
}

export default function EmployeeSelfServicePortal() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading, signOut, hasRole, roles } = useAuth();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    personal_phone: '',
    personal_email: '',
    current_address: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    emergency_contact_relationship: '',
  });
  
  const updateEmployee = useUpdateEmployee();

  // Initialize push notifications for native app
  const { isSupported: isPushSupported, isRegistered: isPushRegistered, fcmToken } = useCapacitorNotifications({ autoInitialize: true });
  
  // Initialize native biometric authentication
  const { 
    isAvailable: isBiometricAvailable, 
    biometryType, 
    registerBiometric, 
    clearBiometric,
    isRegistered: isBiometricRegistered 
  } = useNativeBiometric();

  // Enable realtime subscriptions for instant updates (WebSocket - no polling)
  useRealtimeAttendance();
  useRealtimeLeave();

  // Data hooks - attendance and leave use realtime, others use standard fetch
  const attendanceQuery = useAttendance();
  const leaveQuery = useLeave();
  const contractsQuery = useContracts();
  const performanceQuery = usePerformance();
  const disciplineQuery = useDiscipline();
  
  // Employee-specific hooks
  const { data: hrLetters = [] } = useEmployeeHRLetters(employee?.id || '');
  const { data: gamification } = useEmployeeGamification(employee?.id || '');
  const { data: earnedBadges = [] } = useEmployeeBadges(employee?.id || '');
  const { data: documents = [] } = useEmployeeDocuments(employee?.id || '');
  const { data: leaveBalances = [] } = useLeaveBalances(employee?.id);

  // Fetch employee data based on logged-in user
  useEffect(() => {
    const fetchEmployee = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('employees')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (error) {
          if (error.code === 'PGRST116') {
            toast.error('No employee record linked to your account. Contact HR.');
            navigate('/employee-auth');
          } else {
            throw error;
          }
        } else {
          setEmployee(data);
        }
      } catch (error) {
        console.error('Error fetching employee:', error);
        toast.error('Failed to load your profile');
      } finally {
        setIsLoading(false);
      }
    };

    // CRITICAL: Wait for both auth AND roles to finish loading before checking
    // This prevents redirect loops when roles are still being fetched
    if (!authLoading && user) {
      // Check if roles have been loaded by checking if roles array has data
      // OR if we've confirmed there are no roles (length is 0 but auth finished)
      const rolesLoaded = roles.length > 0;
      
      // Only redirect if we're SURE roles are loaded and user doesn't have employee role
      if (rolesLoaded && !hasRole('employee')) {
        toast.error('Access denied. Employee role required.');
        navigate('/employee-auth');
        return;
      }
      
      // Only fetch employee data if we have the employee role
      // This ensures we don't try to fetch before role verification
      if (hasRole('employee') && !employee) {
        fetchEmployee();
      }
    } else if (!authLoading && !user) {
      navigate('/employee-auth');
    }
  }, [user, authLoading, roles, hasRole, navigate, employee]);

  // Filter data for this employee
  const employeeAttendance = useMemo(() => 
    attendanceQuery.data?.filter(a => a.employee_id === employee?.id) || [],
    [attendanceQuery.data, employee?.id]
  );

  const employeeLeave = useMemo(() => 
    leaveQuery.data?.filter(l => l.employee_id === employee?.id) || [],
    [leaveQuery.data, employee?.id]
  );

  const employeeContracts = useMemo(() => 
    contractsQuery.data?.filter(c => c.employee_id === employee?.id) || [],
    [contractsQuery.data, employee?.id]
  );

  const employeePerformance = useMemo(() => 
    performanceQuery.data?.filter(p => p.employee_id === employee?.id) || [],
    [performanceQuery.data, employee?.id]
  );

  const employeeDiscipline = useMemo(() => 
    disciplineQuery.data?.filter(d => d.employee_id === employee?.id) || [],
    [disciplineQuery.data, employee?.id]
  );

  const activeContract = employeeContracts.find(c => c.status === 'Active');

  // Calculate Annual Leave balance only (linked to employee via leave_balances table)
  const annualLeaveBalance = useMemo(() => {
    const annualLeave = leaveBalances.find(lb => 
      lb.leave_types?.name === 'Annual Leave'
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

  // Calculate stats
  const pendingLeave = employeeLeave.filter(l => l.status === 'Pending').length;
  const thisMonthAttendance = employeeAttendance.filter(a => {
    const date = parseISO(a.date);
    const now = new Date();
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  });
  const presentDays = thisMonthAttendance.filter(a => a.status === 'Present' || a.status === 'Late').length;
  const lateDaysThisMonth = thisMonthAttendance.filter(a => a.status === 'Late' || a.status === 'Late | Undertime').length;

  const handleSignOut = async () => {
    await signOut();
    navigate('/employee-auth');
    toast.success('Signed out successfully');
  };

  const handleOpenEditProfile = () => {
    setProfileForm({
      personal_phone: (employee as any)?.personal_phone || '',
      personal_email: (employee as any)?.personal_email || '',
      current_address: (employee as any)?.current_address || '',
      emergency_contact_name: (employee as any)?.emergency_contact_name || '',
      emergency_contact_phone: (employee as any)?.emergency_contact_phone || '',
      emergency_contact_relationship: (employee as any)?.emergency_contact_relationship || '',
    });
    setIsEditingProfile(true);
  };

  const handleSaveProfile = async () => {
    if (!employee) return;
    
    try {
      await updateEmployee.mutateAsync({
        id: employee.id,
        personal_phone: profileForm.personal_phone,
        personal_email: profileForm.personal_email,
        current_address: profileForm.current_address,
        emergency_contact_name: profileForm.emergency_contact_name,
        emergency_contact_phone: profileForm.emergency_contact_phone,
        emergency_contact_relationship: profileForm.emergency_contact_relationship,
      } as any);
      
      // Update local state
      setEmployee(prev => prev ? { ...prev, ...profileForm } as Employee : null);
      setIsEditingProfile(false);
      toast.success('Profile updated successfully');
    } catch (error) {
      toast.error('Failed to update profile');
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Loading your portal...</p>
        </div>
      </div>
    );
  }

  if (!employee) {
    return null;
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: User },
    { id: 'attendance', label: 'Attendance', icon: Clock },
    { id: 'leave', label: 'Leave', icon: CalendarDays },
    { id: 'contract', label: 'Contract', icon: FileText },
    { id: 'documents', label: 'Documents', icon: FileCheck },
    { id: 'performance', label: 'Performance', icon: TrendingUp },
    { id: 'achievements', label: 'Achievements', icon: Award },
    { id: 'security', label: 'Security', icon: Shield },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-primary/5 dark:from-slate-950 dark:via-background dark:to-primary/10">
      {/* Header - Enhanced Glassmorphism */}
      <header className="sticky top-0 z-50 bg-gradient-to-r from-primary/95 via-primary/90 to-accent/90 dark:from-primary/80 dark:via-primary/70 dark:to-accent/80 backdrop-blur-xl shadow-lg shadow-primary/20">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="absolute -inset-1 bg-white/30 rounded-full blur-sm" />
              <Avatar className="h-12 w-12 ring-2 ring-white/50 shadow-lg relative">
                <AvatarImage src={employee.photo_url || undefined} />
                <AvatarFallback className="bg-white/20 text-white font-bold text-lg">
                  {employee.full_name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
            </div>
            <div>
              <h1 className="font-bold text-lg text-white drop-shadow-sm">{employee.full_name}</h1>
              <p className="text-sm text-white/80 font-medium">{employee.job_position}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <NotificationBell />
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleSignOut}
              className="text-white hover:bg-white/20 hover:text-white border border-white/20"
            >
              <LogOut className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Sign Out</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Quick Stats - Premium Card Design */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {/* Annual Leave Card */}
          <Card className="relative overflow-hidden border-0 shadow-lg shadow-primary/10 bg-gradient-to-br from-white to-primary/5 dark:from-card dark:to-primary/10 group hover:shadow-xl hover:shadow-primary/20 transition-all duration-300 hover:-translate-y-1">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-primary/20 to-transparent rounded-bl-full" />
            <CardContent className="pt-5 pb-4 relative">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-3xl md:text-4xl font-black text-primary tracking-tight">{annualLeaveBalance}</p>
                  <p className="text-xs md:text-sm font-semibold text-muted-foreground uppercase tracking-wide">Annual Leave</p>
                </div>
                <div className="p-3 bg-gradient-to-br from-primary to-primary/80 rounded-xl shadow-lg shadow-primary/30 group-hover:scale-110 transition-transform duration-300">
                  <CalendarDays className="w-5 h-5 md:w-6 md:h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Attendance Card */}
          <Card className="relative overflow-hidden border-0 shadow-lg shadow-emerald-500/10 bg-gradient-to-br from-white to-emerald-50 dark:from-card dark:to-emerald-950/30 group hover:shadow-xl hover:shadow-emerald-500/20 transition-all duration-300 hover:-translate-y-1">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-emerald-500/20 to-transparent rounded-bl-full" />
            <CardContent className="pt-5 pb-4 relative">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-3xl md:text-4xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">{presentDays}</p>
                  <p className="text-xs md:text-sm font-semibold text-muted-foreground uppercase tracking-wide">Days Present</p>
                </div>
                <div className="p-3 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl shadow-lg shadow-emerald-500/30 group-hover:scale-110 transition-transform duration-300">
                  <Clock className="w-5 h-5 md:w-6 md:h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Pending Requests Card */}
          <Card className="relative overflow-hidden border-0 shadow-lg shadow-amber-500/10 bg-gradient-to-br from-white to-amber-50 dark:from-card dark:to-amber-950/30 group hover:shadow-xl hover:shadow-amber-500/20 transition-all duration-300 hover:-translate-y-1">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-amber-500/20 to-transparent rounded-bl-full" />
            <CardContent className="pt-5 pb-4 relative">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-3xl md:text-4xl font-black text-amber-600 dark:text-amber-400 tracking-tight">{pendingLeave}</p>
                  <p className="text-xs md:text-sm font-semibold text-muted-foreground uppercase tracking-wide">Pending</p>
                </div>
                <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl shadow-lg shadow-amber-500/30 group-hover:scale-110 transition-transform duration-300">
                  <FileText className="w-5 h-5 md:w-6 md:h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Late Card */}
          <Card className="relative overflow-hidden border-0 shadow-lg shadow-rose-500/10 bg-gradient-to-br from-white to-rose-50 dark:from-card dark:to-rose-950/30 group hover:shadow-xl hover:shadow-rose-500/20 transition-all duration-300 hover:-translate-y-1">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-rose-500/20 to-transparent rounded-bl-full" />
            <CardContent className="pt-5 pb-4 relative">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-3xl md:text-4xl font-black text-rose-600 dark:text-rose-400 tracking-tight">{lateDaysThisMonth}</p>
                  <p className="text-xs md:text-sm font-semibold text-muted-foreground uppercase tracking-wide">Late</p>
                </div>
                <div className="p-3 bg-gradient-to-br from-rose-500 to-red-600 rounded-xl shadow-lg shadow-rose-500/30 group-hover:scale-110 transition-transform duration-300">
                  <AlertTriangle className="w-5 h-5 md:w-6 md:h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Probation Card - Only shows if on probation */}
          {probationStatus?.isOnProbation && (
            <Card className="relative overflow-hidden border-0 shadow-lg shadow-blue-500/10 bg-gradient-to-br from-white to-blue-50 dark:from-card dark:to-blue-950/30 group hover:shadow-xl hover:shadow-blue-500/20 transition-all duration-300 hover:-translate-y-1 col-span-2 lg:col-span-1">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-blue-500/20 to-transparent rounded-bl-full" />
              <CardContent className="pt-5 pb-4 relative">
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <p className="text-3xl md:text-4xl font-black text-blue-600 dark:text-blue-400 tracking-tight">{probationStatus.daysRemaining}</p>
                    <p className="text-xs md:text-sm font-semibold text-muted-foreground uppercase tracking-wide">Probation Days Left</p>
                    {/* Progress bar */}
                    <div className="w-full bg-blue-100 dark:bg-blue-900/30 rounded-full h-1.5 mt-2">
                      <div 
                        className="bg-gradient-to-r from-blue-500 to-blue-600 h-1.5 rounded-full transition-all duration-500" 
                        style={{ width: `${probationStatus.percentComplete}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Ends: {format(probationStatus.endDate, 'MMM dd, yyyy')}
                    </p>
                  </div>
                  <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg shadow-blue-500/30 group-hover:scale-110 transition-transform duration-300">
                    <Briefcase className="w-5 h-5 md:w-6 md:h-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Quick Actions - Enhanced Button */}
        <div className="flex flex-wrap gap-3">
          <Button 
            onClick={() => setShowLeaveModal(true)} 
            size="lg"
            className="shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300 font-semibold"
          >
            <Plus className="w-5 h-5 mr-2" />
            Request Leave
          </Button>
        </div>

        {/* Tabs - Enhanced Pill Navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex flex-wrap h-auto gap-1.5 p-1.5 bg-muted/50 border border-border/50 rounded-xl shadow-inner">
            {tabs.map(tab => (
              <TabsTrigger 
                key={tab.id} 
                value={tab.id} 
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all duration-200 data-[state=active]:bg-background data-[state=active]:shadow-md data-[state=active]:text-primary"
              >
                <tab.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="overview" className="mt-8 space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Personal Info - Enhanced */}
              <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-slate-50 dark:from-card dark:to-muted/20 overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-primary/5 to-accent/5 border-b border-border/50 flex flex-row items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                    Personal Information
                  </CardTitle>
                  <Button variant="outline" size="sm" onClick={handleOpenEditProfile}>
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  <InfoItem icon={User} label="HRMS No" value={employee.hrms_no} />
                  <InfoItem icon={Building2} label="Department" value={employee.department} />
                  <InfoItem icon={Briefcase} label="Position" value={employee.job_position} />
                  <InfoItem icon={Mail} label="Work Email" value={employee.work_email} />
                  <InfoItem icon={Phone} label="Work Phone" value={employee.work_phone} />
                  <InfoItem icon={Phone} label="Personal Phone" value={(employee as any)?.personal_phone || 'Not set'} />
                  <InfoItem icon={Mail} label="Personal Email" value={(employee as any)?.personal_email || 'Not set'} />
                  <InfoItem icon={MapPin} label="Nationality" value={employee.nationality || 'Not set'} />
                  <InfoItem icon={MapPin} label="Home Address" value={(employee as any)?.home_address || 'Not set'} />
                  <InfoItem icon={Calendar} label="Joining Date" value={format(parseISO(employee.joining_date), 'dd MMM yyyy')} />
                </CardContent>
              </Card>

              {/* Recent Activity - Enhanced */}
              <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-slate-50 dark:from-card dark:to-muted/20 overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-accent/5 to-primary/5 border-b border-border/50">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <div className="p-2 bg-accent/10 rounded-lg">
                      <CalendarDays className="w-4 h-4 text-accent-foreground" />
                    </div>
                    Recent Leave Requests
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  {employeeLeave.length === 0 ? (
                    <div className="text-center py-8">
                      <CalendarDays className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground">No leave requests yet</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {employeeLeave.slice(0, 5).map(leave => (
                        <div 
                          key={leave.id} 
                          className="flex items-center justify-between p-4 bg-gradient-to-r from-muted/50 to-muted/30 rounded-xl border border-border/50 hover:border-primary/30 hover:shadow-md transition-all duration-200"
                        >
                          <div>
                            <p className="font-semibold text-sm">{leave.leave_type}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {format(parseISO(leave.start_date), 'dd MMM')} - {format(parseISO(leave.end_date), 'dd MMM yyyy')}
                            </p>
                          </div>
                          <Badge 
                            variant={leave.status === 'Approved' ? 'default' : leave.status === 'Rejected' ? 'destructive' : 'secondary'}
                            className={`font-semibold ${
                              leave.status === 'Approved' ? 'bg-emerald-500 hover:bg-emerald-600' : 
                              leave.status === 'Pending' ? 'bg-amber-500 hover:bg-amber-600 text-white' : ''
                            }`}
                          >
                            {leave.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="attendance" className="mt-8">
            <Card className="border-0 shadow-lg overflow-hidden">
              <EmployeeAttendanceCalendar
                employeeId={employee.id}
                employeeName={employee.full_name}
                hrmsNo={employee.hrms_no}
                showBackButton={false}
                isEmployeePortal={true}
              />
            </Card>
          </TabsContent>

          <TabsContent value="leave" className="mt-8">
            <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-slate-50 dark:from-card dark:to-muted/20 overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between bg-gradient-to-r from-primary/5 to-accent/5 border-b border-border/50">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <CalendarDays className="w-4 h-4 text-primary" />
                    </div>
                    Leave History
                  </CardTitle>
                  <CardDescription className="mt-2">Your leave requests and balance</CardDescription>
                </div>
                <Button onClick={() => setShowLeaveModal(true)} className="shadow-md">
                  <Plus className="w-4 h-4 mr-2" />
                  New Request
                </Button>
              </CardHeader>
              <CardContent className="pt-6">
                {employeeLeave.length === 0 ? (
                  <div className="text-center py-12">
                    <CalendarDays className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
                    <p className="text-muted-foreground font-medium">No leave records found</p>
                    <p className="text-sm text-muted-foreground/60 mt-1">Your leave history will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {employeeLeave.map(leave => (
                      <div 
                        key={leave.id} 
                        className="flex items-center justify-between p-5 bg-gradient-to-r from-muted/40 to-muted/20 rounded-xl border border-border/50 hover:border-primary/30 hover:shadow-lg transition-all duration-300 group"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-foreground">{leave.leave_type}</span>
                            <Badge 
                              variant={leave.status === 'Approved' ? 'default' : leave.status === 'Rejected' ? 'destructive' : 'secondary'}
                              className={`font-semibold shadow-sm ${
                                leave.status === 'Approved' ? 'bg-emerald-500 hover:bg-emerald-600' : 
                                leave.status === 'Pending' ? 'bg-amber-500 hover:bg-amber-600 text-white' : ''
                              }`}
                            >
                              {leave.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {format(parseISO(leave.start_date), 'dd MMM yyyy')} - {format(parseISO(leave.end_date), 'dd MMM yyyy')}
                          </p>
                          {leave.reason && (
                            <p className="text-sm text-muted-foreground/80 italic">{leave.reason}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-black text-primary">{leave.days_count}</p>
                          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">days</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="contract" className="mt-8">
            <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-slate-50 dark:from-card dark:to-muted/20 overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-primary/5 to-accent/5 border-b border-border/50">
                <CardTitle className="flex items-center gap-2">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <FileText className="w-4 h-4 text-primary" />
                  </div>
                  Contract Details
                </CardTitle>
                <CardDescription className="mt-2">Your current employment contract</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                {activeContract ? (
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <InfoItem icon={FileText} label="Contract No" value={activeContract.mohre_contract_no} />
                      <InfoItem icon={Briefcase} label="Contract Type" value={activeContract.contract_type} />
                      <InfoItem icon={Calendar} label="Start Date" value={format(parseISO(activeContract.start_date), 'dd MMM yyyy')} />
                      {activeContract.end_date && (
                        <InfoItem icon={Calendar} label="End Date" value={format(parseISO(activeContract.end_date), 'dd MMM yyyy')} />
                      )}
                    </div>
                    <div className="space-y-3">
                      <InfoItem icon={Clock} label="Working Hours" value={`${activeContract.working_hours || 48} hrs/week`} />
                      <InfoItem icon={CalendarDays} label="Annual Leave" value={`${activeContract.annual_leave_days || 30} days`} />
                      <InfoItem icon={FileText} label="Notice Period" value={`${activeContract.notice_period || 30} days`} />
                      <InfoItem icon={FileText} label="Probation" value={`${activeContract.probation_period || 6} months`} />
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <FileText className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
                    <p className="text-muted-foreground font-medium">No active contract found</p>
                    <p className="text-sm text-muted-foreground/60 mt-1">Contact HR for contract details</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents" className="mt-8 space-y-6">
            {/* Key Documents Grid - Mobile Optimized */}
            <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-slate-50 dark:from-card dark:to-muted/20 overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-primary/5 to-accent/5 border-b border-border/50">
                <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <CreditCard className="w-4 h-4 text-primary" />
                  </div>
                  Identity & Key Documents
                </CardTitle>
                <CardDescription className="mt-2">Your important identity documents</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
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
                                loading="lazy"
                              />
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-lg flex items-center justify-center">
                                <Eye className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                              </div>
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
                    const isExpired = doc?.expiry_date && differenceInDays(parseISO(doc.expiry_date), new Date()) < 0;
                    const isExpiring = doc?.expiry_date && differenceInDays(parseISO(doc.expiry_date), new Date()) <= 30 && differenceInDays(parseISO(doc.expiry_date), new Date()) >= 0;
                    return (
                      <div className="group relative rounded-xl border-2 border-dashed border-border bg-gradient-to-br from-primary/5 to-accent/5 hover:border-primary/50 transition-all overflow-hidden">
                        {isExpired && <div className="absolute top-1 right-1 z-10"><Badge variant="destructive" className="text-[9px] px-1.5 py-0">Expired</Badge></div>}
                        {isExpiring && <div className="absolute top-1 right-1 z-10"><Badge variant="secondary" className="text-[9px] px-1.5 py-0 bg-amber-500/20 text-amber-600">Expiring</Badge></div>}
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
                                  loading="lazy"
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-lg flex items-center justify-center">
                                  <Eye className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
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
                    const isExpired = doc?.expiry_date && differenceInDays(parseISO(doc.expiry_date), new Date()) < 0;
                    const isExpiring = doc?.expiry_date && differenceInDays(parseISO(doc.expiry_date), new Date()) <= 30 && differenceInDays(parseISO(doc.expiry_date), new Date()) >= 0;
                    return (
                      <div className="group relative rounded-xl border-2 border-dashed border-border bg-gradient-to-br from-blue-500/5 to-indigo-500/5 hover:border-blue-500/50 transition-all overflow-hidden">
                        {isExpired && <div className="absolute top-1 right-1 z-10"><Badge variant="destructive" className="text-[9px] px-1.5 py-0">Expired</Badge></div>}
                        {isExpiring && <div className="absolute top-1 right-1 z-10"><Badge variant="secondary" className="text-[9px] px-1.5 py-0 bg-amber-500/20 text-amber-600">Expiring</Badge></div>}
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
                                  loading="lazy"
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-lg flex items-center justify-center">
                                  <Eye className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
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
                    const isExpired = doc?.expiry_date && differenceInDays(parseISO(doc.expiry_date), new Date()) < 0;
                    const isExpiring = doc?.expiry_date && differenceInDays(parseISO(doc.expiry_date), new Date()) <= 30 && differenceInDays(parseISO(doc.expiry_date), new Date()) >= 0;
                    return (
                      <div className="group relative rounded-xl border-2 border-dashed border-border bg-gradient-to-br from-accent/5 to-primary/5 hover:border-accent/50 transition-all overflow-hidden">
                        {isExpired && <div className="absolute top-1 right-1 z-10"><Badge variant="destructive" className="text-[9px] px-1.5 py-0">Expired</Badge></div>}
                        {isExpiring && <div className="absolute top-1 right-1 z-10"><Badge variant="secondary" className="text-[9px] px-1.5 py-0 bg-amber-500/20 text-amber-600">Expiring</Badge></div>}
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
                                  loading="lazy"
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-lg flex items-center justify-center">
                                  <Eye className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
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
                    const isExpired = doc?.expiry_date && differenceInDays(parseISO(doc.expiry_date), new Date()) < 0;
                    const isExpiring = doc?.expiry_date && differenceInDays(parseISO(doc.expiry_date), new Date()) <= 30 && differenceInDays(parseISO(doc.expiry_date), new Date()) >= 0;
                    return (
                      <div className="group relative rounded-xl border-2 border-dashed border-border bg-gradient-to-br from-emerald-500/5 to-teal-500/5 hover:border-emerald-500/50 transition-all overflow-hidden">
                        {isExpired && <div className="absolute top-1 right-1 z-10"><Badge variant="destructive" className="text-[9px] px-1.5 py-0">Expired</Badge></div>}
                        {isExpiring && <div className="absolute top-1 right-1 z-10"><Badge variant="secondary" className="text-[9px] px-1.5 py-0 bg-amber-500/20 text-amber-600">Expiring</Badge></div>}
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
                                  loading="lazy"
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-lg flex items-center justify-center">
                                  <Eye className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                              </div>
                            ) : (
                              <div className="w-16 h-16 rounded-xl bg-emerald-500/20 flex items-center justify-center group-hover:scale-105 transition-transform">
                                <Briefcase className="w-8 h-8 text-emerald-500" />
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
                    const isExpired = doc?.expiry_date && differenceInDays(parseISO(doc.expiry_date), new Date()) < 0;
                    const isExpiring = doc?.expiry_date && differenceInDays(parseISO(doc.expiry_date), new Date()) <= 30 && differenceInDays(parseISO(doc.expiry_date), new Date()) >= 0;
                    return (
                      <div className="group relative rounded-xl border-2 border-dashed border-border bg-gradient-to-br from-rose-500/5 to-pink-500/5 hover:border-rose-500/50 transition-all overflow-hidden">
                        {isExpired && <div className="absolute top-1 right-1 z-10"><Badge variant="destructive" className="text-[9px] px-1.5 py-0">Expired</Badge></div>}
                        {isExpiring && <div className="absolute top-1 right-1 z-10"><Badge variant="secondary" className="text-[9px] px-1.5 py-0 bg-amber-500/20 text-amber-600">Expiring</Badge></div>}
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
                                  loading="lazy"
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-lg flex items-center justify-center">
                                  <Eye className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
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
                          <p className="text-[11px] font-semibold text-center text-foreground">Insurance</p>
                          {doc?.expiry_date && (
                            <p className="text-[9px] text-center text-muted-foreground mt-0.5">
                              Exp: {format(parseISO(doc.expiry_date), 'MMM yyyy')}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </CardContent>
            </Card>

            {/* Other Documents */}
            <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-slate-50 dark:from-card dark:to-muted/20 overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-accent/5 to-primary/5 border-b border-border/50">
                <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                  <div className="p-2 bg-accent/10 rounded-lg">
                    <FileCheck className="w-4 h-4 text-accent-foreground" />
                  </div>
                  Other Documents
                </CardTitle>
                <CardDescription className="mt-2">Additional uploaded documents and certificates</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                {(() => {
                  const keyCategories = ['Emirates ID', 'Passport', 'Visa', 'Work Permit', 'Medical Insurance', 'Contract', 'ILOE'];
                  const otherDocs = documents.filter(d => !keyCategories.includes(d.category || '') && !d.is_renewed);
                  
                  if (otherDocs.length === 0) {
                    return (
                      <div className="text-center py-12">
                        <FileCheck className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
                        <p className="text-muted-foreground font-medium">No additional documents</p>
                        <p className="text-sm text-muted-foreground/60 mt-1">Other documents will appear here</p>
                      </div>
                    );
                  }
                  
                  return (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-5">
                      {otherDocs.map(doc => {
                        const isImage = doc.file_url && /\.(jpg|jpeg|png|gif|webp)$/i.test(doc.file_url);
                        const isExpired = doc.expiry_date && differenceInDays(parseISO(doc.expiry_date), new Date()) < 0;
                        const isExpiring = doc.expiry_date && differenceInDays(parseISO(doc.expiry_date), new Date()) <= 30 && differenceInDays(parseISO(doc.expiry_date), new Date()) >= 0;
                        
                        return (
                          <div 
                            key={doc.id}
                            className="group relative rounded-xl border border-border bg-card hover:border-primary/50 hover:shadow-lg transition-all overflow-hidden cursor-pointer"
                            onClick={() => {
                              if (isImage) {
                                setPreviewImage({ url: doc.file_url, title: doc.name });
                              } else {
                                window.open(doc.file_url, '_blank');
                              }
                            }}
                          >
                            {isExpired && <div className="absolute top-1 right-1 z-10"><Badge variant="destructive" className="text-[9px] px-1.5 py-0">Expired</Badge></div>}
                            {isExpiring && <div className="absolute top-1 right-1 z-10"><Badge variant="secondary" className="text-[9px] px-1.5 py-0 bg-amber-500/20 text-amber-600">Expiring</Badge></div>}
                            <div className="aspect-square flex items-center justify-center p-2 bg-muted/30">
                              {isImage ? (
                                <div className="relative w-full h-full">
                                  <img
                                    src={doc.file_url}
                                    alt={doc.name}
                                    className="w-full h-full rounded-lg object-cover group-hover:scale-105 transition-transform duration-300"
                                    loading="lazy"
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement;
                                      target.style.display = 'none';
                                      const parent = target.parentElement;
                                      if (parent) {
                                        parent.innerHTML = `<div class="flex flex-col items-center justify-center gap-2 text-muted-foreground w-full h-full"><svg class="w-10 h-10 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg></div>`;
                                      }
                                    }}
                                  />
                                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-lg flex items-center justify-center">
                                    <Eye className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                  </div>
                                </div>
                              ) : (
                                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:scale-105 transition-transform">
                                  <FileCheck className="w-6 h-6 text-primary" />
                                </div>
                              )}
                            </div>
                            <div className="p-2 space-y-1">
                              <p className="text-[11px] font-semibold text-foreground line-clamp-1">{doc.name}</p>
                              {doc.category && (
                                <p className="text-[9px] text-muted-foreground">{doc.category}</p>
                              )}
                              {doc.expiry_date && (
                                <p className="text-[9px] text-muted-foreground">
                                  Exp: {format(parseISO(doc.expiry_date), 'MMM yyyy')}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="performance" className="mt-8">
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-slate-50 dark:from-card dark:to-muted/20 overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-amber-500/5 to-orange-500/5 border-b border-border/50">
                  <CardTitle className="flex items-center gap-2">
                    <div className="p-2 bg-amber-500/10 rounded-lg">
                      <Star className="w-4 h-4 text-amber-500" />
                    </div>
                    Performance Reviews
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  {employeePerformance.length === 0 ? (
                    <div className="text-center py-12">
                      <Star className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
                      <p className="text-muted-foreground font-medium">No performance reviews yet</p>
                      <p className="text-sm text-muted-foreground/60 mt-1">Your reviews will appear here</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {employeePerformance.map(perf => (
                        <div 
                          key={perf.id} 
                          className="p-5 bg-gradient-to-r from-muted/40 to-muted/20 rounded-xl border border-border/50 hover:border-amber-500/30 hover:shadow-md transition-all duration-200 space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-foreground">{perf.review_period}</span>
                            <div className="flex items-center gap-1">
                              {[1, 2, 3, 4, 5].map(star => (
                                <Star
                                  key={star}
                                  className={`w-5 h-5 transition-colors ${star <= (perf.rating || 0) ? 'text-amber-500 fill-amber-500' : 'text-muted-foreground/30'}`}
                                />
                              ))}
                            </div>
                          </div>
                          <Badge variant="secondary" className="font-medium">{perf.performance_type}</Badge>
                          {perf.comments && (
                            <p className="text-sm text-muted-foreground italic">{perf.comments}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-slate-50 dark:from-card dark:to-muted/20 overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-red-500/5 to-orange-500/5 border-b border-border/50">
                  <CardTitle className="flex items-center gap-2">
                    <div className="p-2 bg-amber-500/10 rounded-lg">
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                    </div>
                    Discipline Records
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  {employeeDiscipline.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Award className="w-8 h-8 text-emerald-500" />
                      </div>
                      <p className="text-emerald-600 dark:text-emerald-400 font-semibold">No discipline records</p>
                      <p className="text-sm text-muted-foreground/60 mt-1">Great job! Keep it up!</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {employeeDiscipline.map(disc => (
                        <div 
                          key={disc.id} 
                          className="p-5 bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950/30 dark:to-orange-950/30 rounded-xl border border-red-200/50 dark:border-red-800/30 space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <Badge variant="destructive" className="font-semibold shadow-sm">{disc.incident_type}</Badge>
                            <span className="text-xs text-muted-foreground font-medium">
                              {format(parseISO(disc.incident_date), 'dd MMM yyyy')}
                            </span>
                          </div>
                          <p className="text-sm text-foreground">{disc.description}</p>
                          {disc.action_taken && (
                            <p className="text-xs text-muted-foreground bg-background/50 p-2 rounded-lg">
                              <span className="font-semibold">Action:</span> {disc.action_taken}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="achievements" className="mt-8">
            {employee && (
              <Card className="border-0 shadow-lg overflow-hidden">
                <EmployeeGamificationCard employeeId={employee.id} />
              </Card>
            )}
          </TabsContent>

          <TabsContent value="security" className="mt-8 space-y-6">
            {/* Native Biometric Authentication */}
            <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-slate-50 dark:from-card dark:to-muted/20 overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-primary/5 to-accent/5 border-b border-border/50">
                <CardTitle className="flex items-center gap-2">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Shield className="w-4 h-4 text-primary" />
                  </div>
                  Biometric Login
                </CardTitle>
                <CardDescription className="mt-2">
                  Use fingerprint or face recognition to quickly sign in
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                {!isBiometricAvailable ? (
                  <div className="flex items-start gap-3 p-4 bg-muted rounded-lg">
                    <AlertTriangle className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">Not Supported</p>
                      <p className="text-sm text-muted-foreground">
                        Biometric authentication is not available on this device or browser
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                      <div className="flex items-start gap-3">
                        <Shield className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5" />
                        <div>
                          <p className="font-medium text-sm text-green-900 dark:text-green-100">
                            Available
                          </p>
                          <p className="text-sm text-green-700 dark:text-green-300">
                            {biometryType === 1 && 'Fingerprint authentication available'}
                            {biometryType === 2 && 'Face recognition available'}
                            {biometryType === 3 && 'Iris scanner available'}
                            {!biometryType && 'Biometric authentication available'}
                          </p>
                        </div>
                      </div>
                      {user && isBiometricRegistered(user.email || '') ? (
                        <Badge variant="outline" className="bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700">
                          Registered
                        </Badge>
                      ) : (
                        <Badge variant="outline">Not Registered</Badge>
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                      {user && !isBiometricRegistered(user.email || '') ? (
                        <Button 
                          onClick={async () => {
                            const success = await registerBiometric(user.email || '');
                            if (success) {
                              toast.success('You can now sign in with biometrics!');
                            }
                          }}
                          className="flex-1"
                        >
                          Register Biometric Login
                        </Button>
                      ) : (
                        <Button 
                          onClick={() => {
                            clearBiometric();
                            toast.info('Biometric login has been disabled');
                          }}
                          variant="outline"
                          className="flex-1"
                        >
                          Disable Biometric Login
                        </Button>
                      )}
                    </div>
                    
                    <p className="text-xs text-muted-foreground">
                      After registering, you can use biometrics to sign in instead of typing your password.
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Push Notifications */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="w-5 h-5" />
                  Push Notifications
                </CardTitle>
                <CardDescription>
                  Receive instant notifications for important updates
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!isPushSupported ? (
                  <div className="flex items-start gap-3 p-4 bg-muted rounded-lg">
                    <AlertTriangle className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">Not Supported</p>
                      <p className="text-sm text-muted-foreground">
                        Push notifications are not available on this device or browser
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                      <div className="flex items-start gap-3">
                        <Mail className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5" />
                        <div>
                          <p className="font-medium text-sm text-green-900 dark:text-green-100">
                            Supported
                          </p>
                          <p className="text-sm text-green-700 dark:text-green-300">
                            Push notifications are enabled on this device
                          </p>
                        </div>
                      </div>
                      {isPushRegistered ? (
                        <Badge variant="outline" className="bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700">
                          Pending
                        </Badge>
                      )}
                    </div>
                    
                    {fcmToken && (
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">Device Token (FCM):</p>
                        <p className="text-xs font-mono break-all">{fcmToken.substring(0, 60)}...</p>
                      </div>
                    )}
                    
                    <p className="text-xs text-muted-foreground">
                      You will receive notifications for leave approvals, attendance reminders, and important announcements.
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Image Preview Modal */}
      <ImagePreviewModal
        isOpen={!!previewImage}
        onClose={() => setPreviewImage(null)}
        imageUrl={previewImage?.url || ''}
        title={previewImage?.title}
      />

      {/* Modals */}
      <LeaveRequestModal
        isOpen={showLeaveModal}
        onClose={() => setShowLeaveModal(false)}
        employeeId={employee.id}
        employeeName={employee.full_name}
        employeeGender={(employee as any)?.gender}
      />

      {/* HR Assistant Chat - Floating */}
      <HRAssistantChat />

      {/* Edit Profile Dialog */}
      <Dialog open={isEditingProfile} onOpenChange={setIsEditingProfile}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5 text-primary" />
              Edit Personal Information
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="personal_phone">Personal Phone</Label>
              <Input
                id="personal_phone"
                placeholder="Enter your personal phone"
                value={profileForm.personal_phone}
                onChange={(e) => setProfileForm({ ...profileForm, personal_phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="personal_email">Personal Email</Label>
              <Input
                id="personal_email"
                type="email"
                placeholder="Enter your personal email"
                value={profileForm.personal_email}
                onChange={(e) => setProfileForm({ ...profileForm, personal_email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="current_address">Current Address</Label>
              <Textarea
                id="current_address"
                placeholder="Enter your current address"
                value={profileForm.current_address}
                onChange={(e) => setProfileForm({ ...profileForm, current_address: e.target.value })}
                rows={3}
              />
            </div>
            
            {/* Emergency Contact Section */}
            <div className="pt-4 border-t">
              <p className="text-sm font-semibold text-destructive mb-3 flex items-center gap-2">
                Emergency Contact
              </p>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="emergency_name">Contact Name</Label>
                  <Input
                    id="emergency_name"
                    placeholder="Enter emergency contact name"
                    value={profileForm.emergency_contact_name}
                    onChange={(e) => setProfileForm({ ...profileForm, emergency_contact_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emergency_phone">Phone Number</Label>
                  <Input
                    id="emergency_phone"
                    placeholder="Enter emergency contact phone"
                    value={profileForm.emergency_contact_phone}
                    onChange={(e) => setProfileForm({ ...profileForm, emergency_contact_phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emergency_relationship">Relationship</Label>
                  <select
                    id="emergency_relationship"
                    value={profileForm.emergency_contact_relationship}
                    onChange={(e) => setProfileForm({ ...profileForm, emergency_contact_relationship: e.target.value })}
                    className="w-full p-2 rounded-lg bg-background border border-input text-foreground"
                  >
                    <option value="">Select relationship...</option>
                    <option value="Spouse">Spouse</option>
                    <option value="Parent">Parent</option>
                    <option value="Sibling">Sibling</option>
                    <option value="Child">Child</option>
                    <option value="Friend">Friend</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
            </div>
            
            <p className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
              Note: Work email, department, position, and other HR-managed fields cannot be edited. Please contact HR for any changes.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditingProfile(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveProfile} disabled={updateEmployee.isPending}>
              {updateEmployee.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InfoItem({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center gap-4 p-3 rounded-xl bg-gradient-to-r from-muted/30 to-transparent hover:from-muted/50 transition-colors duration-200 group">
      <div className="p-2.5 bg-primary/10 rounded-lg group-hover:bg-primary/15 transition-colors duration-200">
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className="text-sm font-semibold text-foreground truncate mt-0.5">{value}</p>
      </div>
    </div>
  );
}
