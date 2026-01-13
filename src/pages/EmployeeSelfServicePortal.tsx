import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useAttendance } from '@/hooks/useAttendance';
import { useLeave, useLeaveTypes, useLeaveBalances } from '@/hooks/useLeave';
import { useContracts } from '@/hooks/useContracts';
import { useEmployeeHRLetters } from '@/hooks/useHRLetters';
import { usePerformance } from '@/hooks/usePerformance';
import { useDiscipline } from '@/hooks/useDiscipline';
import { useEmployeeGamification, useEmployeeBadges } from '@/hooks/useGamification';
import { useEmployeeDocuments } from '@/hooks/useDocuments';
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
  Loader2, Plus, Star, Shield
} from 'lucide-react';
import { PasskeyManagement } from '@/components/PasskeyManagement';
import { NotificationSettings } from '@/components/NotificationSettings';
import { NotificationBell } from '@/components/NotificationBell';
import { toast } from 'sonner';
import { format, parseISO, differenceInDays } from 'date-fns';

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
  const { user, isLoading: authLoading, signOut, hasRole } = useAuth();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [showLeaveModal, setShowLeaveModal] = useState(false);

  // Data hooks - use query results properly
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

    if (!authLoading && user) {
      if (!hasRole('employee')) {
        toast.error('Access denied. Employee role required.');
        navigate('/employee-auth');
        return;
      }
      fetchEmployee();
    } else if (!authLoading && !user) {
      navigate('/employee-auth');
    }
  }, [user, authLoading, hasRole, navigate]);

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

  // Calculate stats
  const pendingLeave = employeeLeave.filter(l => l.status === 'Pending').length;
  const thisMonthAttendance = employeeAttendance.filter(a => {
    const date = parseISO(a.date);
    const now = new Date();
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  });
  const presentDays = thisMonthAttendance.filter(a => a.status === 'Present' || a.status === 'Late').length;

  const handleSignOut = async () => {
    await signOut();
    navigate('/employee-auth');
    toast.success('Signed out successfully');
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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={employee.photo_url || undefined} />
              <AvatarFallback>{employee.full_name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
            </Avatar>
            <div>
              <h1 className="font-semibold">{employee.full_name}</h1>
              <p className="text-xs text-muted-foreground">{employee.job_position}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <CalendarDays className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{employee.leave_balance || 0}</p>
                  <p className="text-xs text-muted-foreground">Leave Balance</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <Clock className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{presentDays}</p>
                  <p className="text-xs text-muted-foreground">Days This Month</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/10 rounded-lg">
                  <FileText className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{pendingLeave}</p>
                  <p className="text-xs text-muted-foreground">Pending Requests</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <Award className="w-5 h-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{gamification?.points || 0}</p>
                  <p className="text-xs text-muted-foreground">Total Points</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setShowLeaveModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Request Leave
          </Button>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex flex-wrap h-auto gap-1">
            {tabs.map(tab => (
              <TabsTrigger key={tab.id} value={tab.id} className="flex items-center gap-2">
                <tab.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="overview" className="mt-6 space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Personal Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Personal Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <InfoItem icon={User} label="HRMS No" value={employee.hrms_no} />
                  <InfoItem icon={Building2} label="Department" value={employee.department} />
                  <InfoItem icon={Briefcase} label="Position" value={employee.job_position} />
                  <InfoItem icon={Mail} label="Work Email" value={employee.work_email} />
                  <InfoItem icon={Phone} label="Work Phone" value={employee.work_phone} />
                  <InfoItem icon={MapPin} label="Nationality" value={employee.nationality || 'Not set'} />
                  <InfoItem icon={Calendar} label="Joining Date" value={format(parseISO(employee.joining_date), 'dd MMM yyyy')} />
                </CardContent>
              </Card>

              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Recent Leave Requests</CardTitle>
                </CardHeader>
                <CardContent>
                  {employeeLeave.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No leave requests yet</p>
                  ) : (
                    <div className="space-y-3">
                      {employeeLeave.slice(0, 5).map(leave => (
                        <div key={leave.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                          <div>
                            <p className="font-medium text-sm">{leave.leave_type}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(parseISO(leave.start_date), 'dd MMM')} - {format(parseISO(leave.end_date), 'dd MMM yyyy')}
                            </p>
                          </div>
                          <Badge variant={
                            leave.status === 'Approved' ? 'default' :
                            leave.status === 'Rejected' ? 'destructive' : 'secondary'
                          }>
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

          <TabsContent value="attendance" className="mt-6">
            <EmployeeAttendanceCalendar
              employeeId={employee.id}
              employeeName={employee.full_name}
              hrmsNo={employee.hrms_no}
              showBackButton={false}
              isEmployeePortal={true}
            />
          </TabsContent>

          <TabsContent value="leave" className="mt-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Leave History</CardTitle>
                  <CardDescription>Your leave requests and balance</CardDescription>
                </div>
                <Button onClick={() => setShowLeaveModal(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  New Request
                </Button>
              </CardHeader>
              <CardContent>
                {employeeLeave.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No leave records found</p>
                ) : (
                  <div className="space-y-3">
                    {employeeLeave.map(leave => (
                      <div key={leave.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{leave.leave_type}</span>
                            <Badge variant={
                              leave.status === 'Approved' ? 'default' :
                              leave.status === 'Rejected' ? 'destructive' : 'secondary'
                            }>
                              {leave.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {format(parseISO(leave.start_date), 'dd MMM yyyy')} - {format(parseISO(leave.end_date), 'dd MMM yyyy')}
                          </p>
                          {leave.reason && (
                            <p className="text-sm">{leave.reason}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{leave.days_count} days</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="contract" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Contract Details</CardTitle>
                <CardDescription>Your current employment contract</CardDescription>
              </CardHeader>
              <CardContent>
                {activeContract ? (
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <InfoItem icon={FileText} label="Contract No" value={activeContract.mohre_contract_no} />
                      <InfoItem icon={Briefcase} label="Contract Type" value={activeContract.contract_type} />
                      <InfoItem icon={Calendar} label="Start Date" value={format(parseISO(activeContract.start_date), 'dd MMM yyyy')} />
                      {activeContract.end_date && (
                        <InfoItem icon={Calendar} label="End Date" value={format(parseISO(activeContract.end_date), 'dd MMM yyyy')} />
                      )}
                    </div>
                    <div className="space-y-4">
                      <InfoItem icon={Clock} label="Working Hours" value={`${activeContract.working_hours || 48} hrs/week`} />
                      <InfoItem icon={CalendarDays} label="Annual Leave" value={`${activeContract.annual_leave_days || 30} days`} />
                      <InfoItem icon={FileText} label="Notice Period" value={`${activeContract.notice_period || 30} days`} />
                      <InfoItem icon={FileText} label="Probation" value={`${activeContract.probation_period || 6} months`} />
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">No active contract found</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>My Documents</CardTitle>
                <CardDescription>Your uploaded documents and certificates</CardDescription>
              </CardHeader>
              <CardContent>
                {documents.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No documents found</p>
                ) : (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {documents.map(doc => (
                      <div key={doc.id} className="p-4 border rounded-lg space-y-2">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <FileCheck className="w-5 h-5 text-primary" />
                            <span className="font-medium text-sm">{doc.name}</span>
                          </div>
                        </div>
                        {doc.expiry_date && (
                          <div className="flex items-center gap-2 text-xs">
                            <Calendar className="w-3 h-3" />
                            <span className={
                              differenceInDays(parseISO(doc.expiry_date), new Date()) < 30 
                                ? 'text-destructive' 
                                : 'text-muted-foreground'
                            }>
                              Expires: {format(parseISO(doc.expiry_date), 'dd MMM yyyy')}
                            </span>
                          </div>
                        )}
                        <Button variant="outline" size="sm" className="w-full" asChild>
                          <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                            View Document
                          </a>
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="performance" className="mt-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Performance Reviews</CardTitle>
                </CardHeader>
                <CardContent>
                  {employeePerformance.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">No performance reviews yet</p>
                  ) : (
                    <div className="space-y-4">
                      {employeePerformance.map(perf => (
                        <div key={perf.id} className="p-4 border rounded-lg space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{perf.review_period}</span>
                            <div className="flex items-center gap-1">
                              {[1, 2, 3, 4, 5].map(star => (
                                <Star
                                  key={star}
                                  className={`w-4 h-4 ${star <= (perf.rating || 0) ? 'text-amber-500 fill-amber-500' : 'text-muted'}`}
                                />
                              ))}
                            </div>
                          </div>
                          <Badge variant="secondary">{perf.performance_type}</Badge>
                          {perf.comments && (
                            <p className="text-sm text-muted-foreground">{perf.comments}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                    Discipline Records
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {employeeDiscipline.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">No discipline records - Great job!</p>
                  ) : (
                    <div className="space-y-4">
                      {employeeDiscipline.map(disc => (
                        <div key={disc.id} className="p-4 border rounded-lg space-y-2">
                          <div className="flex items-center justify-between">
                            <Badge variant="destructive">{disc.incident_type}</Badge>
                            <span className="text-xs text-muted-foreground">
                              {format(parseISO(disc.incident_date), 'dd MMM yyyy')}
                            </span>
                          </div>
                          <p className="text-sm">{disc.description}</p>
                          {disc.action_taken && (
                            <p className="text-xs text-muted-foreground">Action: {disc.action_taken}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="achievements" className="mt-6">
            {employee && (
              <EmployeeGamificationCard employeeId={employee.id} />
            )}
          </TabsContent>

          <TabsContent value="security" className="mt-6 space-y-6">
            <PasskeyManagement />
            <NotificationSettings />
          </TabsContent>
        </Tabs>
      </main>

      {/* Modals */}
      <LeaveRequestModal
        isOpen={showLeaveModal}
        onClose={() => setShowLeaveModal(false)}
        employeeId={employee.id}
        employeeName={employee.full_name}
      />
    </div>
  );
}

function InfoItem({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="w-4 h-4 text-muted-foreground" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}
