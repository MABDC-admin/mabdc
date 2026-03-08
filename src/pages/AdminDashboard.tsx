import { useState, useEffect } from 'react';
import { 
  Shield, Users, Calendar, FileText, DollarSign, ClipboardList, 
  Trash2, Edit, Plus, Download, RefreshCw, Database, BarChart3,
  ChevronDown, AlertTriangle, Star, Scale, LogOut, MessageSquare, FileSignature, UserCog, Megaphone,
  Lock, KeyRound, Mail, CalendarClock, HardDrive
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { useEmployees } from '@/hooks/useEmployees';
import { useLeave, useDeleteLeave, useAddLeave, useUpdateLeave } from '@/hooks/useLeave';
import { useAttendance } from '@/hooks/useAttendance';
import { usePayroll, useGeneratePayroll } from '@/hooks/usePayroll';
import { useContracts } from '@/hooks/useContracts';
import { useAttendanceAppeals } from '@/hooks/useAttendanceAppeals';
import { AdminEmployeeSection } from '@/components/admin/AdminEmployeeSection';
import { AdminLeaveSection } from '@/components/admin/AdminLeaveSection';
import { AdminAttendanceReport } from '@/components/admin/AdminAttendanceReport';
import { AdminPayrollReport } from '@/components/admin/AdminPayrollReport';
import { AdminDataReset } from '@/components/admin/AdminDataReset';
import { AdminPerformanceSection } from '@/components/admin/AdminPerformanceSection';
import { AdminDisciplineSection } from '@/components/admin/AdminDisciplineSection';
import { AdminAppealsSection } from '@/components/admin/AdminAppealsSection';
import { AdminContractsSection } from '@/components/admin/AdminContractsSection';
import { AdminUserAccountsSection } from '@/components/admin/AdminUserAccountsSection';
import { AdminAnnouncementsSection } from '@/components/admin/AdminAnnouncementsSection';
import { HRAssistantChat } from '@/components/admin/HRAssistantChat';
import { EmailHistorySection } from '@/components/admin/EmailHistorySection';
import { AdminBulkAttendanceEditor } from '@/components/admin/AdminBulkAttendanceEditor';
import { AdminStorageBackup } from '@/components/admin/AdminStorageBackup';
import { useAnnouncements } from '@/hooks/useAnnouncements';
import { useEmailHistory } from '@/hooks/useEmailHistory';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const ADMIN_PINCODE = '192168';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [isPincodeVerified, setIsPincodeVerified] = useState(false);
  const [pincodeInput, setPincodeInput] = useState('');
  const [pincodeError, setPincodeError] = useState('');
  
  const { data: employees = [] } = useEmployees();
  const { data: leaveRecords = [] } = useLeave();
  const { data: attendance = [] } = useAttendance();
  const { data: payroll = [] } = usePayroll();
  const { data: contracts = [] } = useContracts();
  const { data: appeals = [] } = useAttendanceAppeals();
  const { data: announcements = [] } = useAnnouncements();
  const { data: emailHistory = [] } = useEmailHistory();
  const { user, signOut } = useAuth();

  // Check sessionStorage for pincode verification on mount
  useEffect(() => {
    const verified = sessionStorage.getItem('admin_pincode_verified');
    if (verified === 'true') {
      setIsPincodeVerified(true);
    }
  }, []);

  const handlePincodeSubmit = () => {
    if (pincodeInput === ADMIN_PINCODE) {
      setIsPincodeVerified(true);
      sessionStorage.setItem('admin_pincode_verified', 'true');
      setPincodeError('');
      toast.success('Access granted');
    } else {
      setPincodeError('Invalid pincode. Please try again.');
      setPincodeInput('');
    }
  };

  const handleLogout = async () => {
    sessionStorage.removeItem('admin_pincode_verified');
    await signOut();
    toast.success('Logged out successfully');
    window.location.href = '/auth?portal=admin';
  };

  const pendingAppeals = appeals.filter(a => a.status === 'Pending').length;

  // Pincode verification screen
  if (!isPincodeVerified) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="glass-card rounded-3xl border border-border/50 p-8 w-full max-w-md space-y-6 bg-card/80 backdrop-blur-xl shadow-2xl">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg">
              <Lock className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Admin Access</h1>
            <p className="text-sm text-muted-foreground">Enter your 6-digit security pincode</p>
          </div>
          
          <div className="space-y-4">
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="password"
                inputMode="numeric"
                maxLength={6}
                placeholder="Enter pincode"
                value={pincodeInput}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '');
                  setPincodeInput(value);
                  setPincodeError('');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && pincodeInput.length === 6) {
                    handlePincodeSubmit();
                  }
                }}
                className="pl-10 text-center text-2xl tracking-[0.5em] font-mono h-14 border-2 focus:border-primary"
              />
            </div>
            
            {pincodeError && (
              <p className="text-sm text-destructive text-center animate-shake">{pincodeError}</p>
            )}
            
            <Button 
              onClick={handlePincodeSubmit}
              disabled={pincodeInput.length !== 6}
              className="w-full h-12 text-lg font-semibold"
            >
              <Shield className="w-5 h-5 mr-2" />
              Verify Access
            </Button>
          </div>
          
          <p className="text-xs text-center text-muted-foreground">
            This area is restricted to authorized administrators only
          </p>
        </div>
      </div>
    );
  }

  const stats = [
    { label: 'Employees', value: employees.length, icon: Users, color: 'text-primary' },
    { label: 'Contracts', value: contracts.length, icon: FileSignature, color: 'text-violet-500' },
    { label: 'Leave Records', value: leaveRecords.length, icon: Calendar, color: 'text-emerald-500' },
    { label: 'Attendance Records', value: attendance.length, icon: ClipboardList, color: 'text-blue-500' },
    { label: 'Announcements', value: announcements.length, icon: Megaphone, color: 'text-orange-500' },
    { label: 'Appeals', value: appeals.length, icon: MessageSquare, color: 'text-purple-500', pending: pendingAppeals },
    { label: 'Emails Sent', value: emailHistory.length, icon: Mail, color: 'text-cyan-500' },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Admin Dashboard</h1>
                <p className="text-xs text-muted-foreground">System Management & Reports</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground hidden sm:block">{user?.email}</span>
              <Button variant="outline" size="sm" onClick={() => window.location.href = '/'}>
                Back to HR System
              </Button>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          {stats.map((stat) => (
            <div key={stat.label} className="glass-card rounded-2xl border border-border p-4 relative">
              <div className="flex items-center gap-2 mb-2">
                <stat.icon className={cn("w-4 h-4", stat.color)} />
                <span className="text-xs text-muted-foreground">{stat.label}</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              {(stat as any).pending > 0 && (
                <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-medium animate-pulse">
                  {(stat as any).pending} pending
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-muted/50 border border-border p-1 rounded-xl flex-wrap h-auto gap-1">
            <TabsTrigger value="overview" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <BarChart3 className="w-4 h-4 mr-2" />Overview
            </TabsTrigger>
            <TabsTrigger value="employees" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Users className="w-4 h-4 mr-2" />Employees
            </TabsTrigger>
            <TabsTrigger value="contracts" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <FileSignature className="w-4 h-4 mr-2" />Contracts
            </TabsTrigger>
            <TabsTrigger value="leave" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Calendar className="w-4 h-4 mr-2" />Leave History
            </TabsTrigger>
            <TabsTrigger value="attendance-report" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <ClipboardList className="w-4 h-4 mr-2" />Attendance Report
            </TabsTrigger>
            <TabsTrigger value="bulk-attendance" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <CalendarClock className="w-4 h-4 mr-2" />Bulk Attendance
            </TabsTrigger>
            <TabsTrigger value="payroll-report" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <DollarSign className="w-4 h-4 mr-2" />Payroll Report
            </TabsTrigger>
            <TabsTrigger value="performance" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Star className="w-4 h-4 mr-2" />Performance
            </TabsTrigger>
            <TabsTrigger value="discipline" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Scale className="w-4 h-4 mr-2" />Discipline
            </TabsTrigger>
            <TabsTrigger value="appeals" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground relative">
              <MessageSquare className="w-4 h-4 mr-2" />Appeals
              {pendingAppeals > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] flex items-center justify-center animate-pulse">
                  {pendingAppeals}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="user-accounts" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <UserCog className="w-4 h-4 mr-2" />User Accounts
            </TabsTrigger>
            <TabsTrigger value="announcements" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Megaphone className="w-4 h-4 mr-2" />Announcements
            </TabsTrigger>
            <TabsTrigger value="email-history" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Mail className="w-4 h-4 mr-2" />Email History
            </TabsTrigger>
            <TabsTrigger value="storage-backup" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <HardDrive className="w-4 h-4 mr-2" />Storage Backup
            </TabsTrigger>
            <TabsTrigger value="data-reset" className="rounded-lg data-[state=active]:bg-destructive data-[state=active]:text-destructive-foreground">
              <Database className="w-4 h-4 mr-2" />Data Management
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="glass-card rounded-3xl border border-border p-6">
              <h2 className="text-lg font-semibold mb-4 text-foreground">System Overview</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-muted-foreground">Quick Actions</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={() => setActiveTab('attendance-report')}>
                      <Download className="w-5 h-5" />
                      <span className="text-xs">Attendance Report</span>
                    </Button>
                    <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={() => setActiveTab('payroll-report')}>
                      <Download className="w-5 h-5" />
                      <span className="text-xs">Payroll Report</span>
                    </Button>
                    <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={() => setActiveTab('leave')}>
                      <Edit className="w-5 h-5" />
                      <span className="text-xs">Edit Leave</span>
                    </Button>
                    <Button variant="outline" className="h-auto py-4 flex-col gap-2 text-destructive hover:text-destructive" onClick={() => setActiveTab('data-reset')}>
                      <Trash2 className="w-5 h-5" />
                      <span className="text-xs">Data Reset</span>
                    </Button>
                  </div>
                </div>
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-muted-foreground">Recent Activity</h3>
                  <div className="space-y-2">
                    {leaveRecords.slice(0, 3).map((leave) => (
                      <div key={leave.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border">
                        <div>
                          <p className="text-sm font-medium text-foreground">{leave.employees?.full_name}</p>
                          <p className="text-xs text-muted-foreground">{leave.leave_type} - {leave.status}</p>
                        </div>
                        <span className="text-xs text-muted-foreground">{leave.days_count} days</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="employees">
            <AdminEmployeeSection />
          </TabsContent>

          <TabsContent value="contracts">
            <AdminContractsSection />
          </TabsContent>

          <TabsContent value="leave">
            <AdminLeaveSection />
          </TabsContent>

          <TabsContent value="attendance-report">
            <AdminAttendanceReport />
          </TabsContent>

          <TabsContent value="bulk-attendance">
            <AdminBulkAttendanceEditor />
          </TabsContent>

          <TabsContent value="payroll-report">
            <AdminPayrollReport />
          </TabsContent>

          <TabsContent value="performance">
            <AdminPerformanceSection />
          </TabsContent>

          <TabsContent value="discipline">
            <AdminDisciplineSection />
          </TabsContent>

          <TabsContent value="appeals">
            <AdminAppealsSection />
          </TabsContent>

          <TabsContent value="user-accounts">
            <AdminUserAccountsSection />
          </TabsContent>

          <TabsContent value="announcements">
            <AdminAnnouncementsSection />
          </TabsContent>

          <TabsContent value="email-history">
            <div className="glass-card rounded-3xl border border-border p-6">
              <EmailHistorySection maxHeight="600px" />
            </div>
          </TabsContent>

          <TabsContent value="storage-backup">
            <AdminStorageBackup />
          </TabsContent>

          <TabsContent value="data-reset">
            <AdminDataReset />
          </TabsContent>
        </Tabs>
      </main>

      {/* HR Assistant Chat - Floating */}
      <HRAssistantChat />
    </div>
  );
}
