import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAttendance } from '@/hooks/useAttendance';
import { useLeave, useAddLeave, useLeaveTypes } from '@/hooks/useLeave';
import { useContracts } from '@/hooks/useContracts';
import { useEmployeeHRLetters } from '@/hooks/useHRLetters';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  User, Calendar, FileText, Clock, CheckCircle, XCircle, 
  AlertTriangle, Download, Plus, ArrowLeft, Briefcase, Mail
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO, differenceInDays } from 'date-fns';
import { toast } from 'sonner';
import type { Employee } from '@/types/hr';

type TabType = 'overview' | 'attendance' | 'leave' | 'contract' | 'letters';

export default function EmployeePortal() {
  const { employeeId } = useParams<{ employeeId: string }>();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);

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
  const addLeave = useAddLeave();

  // Filter data for this employee
  const attendance = allAttendance.filter(a => a.employee_id === employeeId);
  const leaveRecords = allLeave.filter(l => l.employee_id === employeeId);
  const employeeContract = contracts.find(c => c.employee_id === employeeId && c.status === 'Active');

  // Leave request form
  const [leaveForm, setLeaveForm] = useState({
    leave_type: 'Annual',
    start_date: '',
    end_date: '',
    reason: '',
  });

  const handleLeaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId) return;
    
    const daysCount = differenceInDays(parseISO(leaveForm.end_date), parseISO(leaveForm.start_date)) + 1;
    
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
    { id: 'overview' as TabType, label: 'Overview', icon: User },
    { id: 'attendance' as TabType, label: 'Attendance', icon: Clock },
    { id: 'leave' as TabType, label: 'Leave', icon: Calendar },
    { id: 'contract' as TabType, label: 'Contract', icon: FileText },
    { id: 'letters' as TabType, label: 'HR Letters', icon: Mail },
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
                <p className="text-2xl font-bold text-primary">{employee.leave_balance || 0} days</p>
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
                          <SelectItem value="Annual">Annual Leave</SelectItem>
                          <SelectItem value="Sick">Sick Leave</SelectItem>
                          <SelectItem value="Maternity">Maternity Leave</SelectItem>
                          <SelectItem value="Emergency">Emergency Leave</SelectItem>
                          <SelectItem value="Unpaid">Unpaid Leave</SelectItem>
                        </SelectContent>
                      </Select>
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
                      <div>
                        <label className="text-xs text-muted-foreground">Reason</label>
                        <Textarea value={leaveForm.reason} onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })} placeholder="Enter reason..." />
                      </div>
                      <Button type="submit" className="w-full" disabled={addLeave.isPending}>
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
            <Card>
              <CardHeader>
                <CardTitle>Attendance History</CardTitle>
              </CardHeader>
              <CardContent>
                {attendance.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No attendance records found</p>
                ) : (
                  <div className="space-y-2">
                    {attendance.slice(0, 30).map((record) => (
                      <div key={record.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                        <div className="flex items-center gap-3">
                          <span className={cn(
                            "w-2 h-2 rounded-full",
                            record.status === 'Present' && "bg-primary",
                            record.status === 'Late' && "bg-amber-500",
                            record.status === 'Absent' && "bg-destructive"
                          )} />
                          <span className="font-medium">{format(parseISO(record.date), 'EEE, dd MMM yyyy')}</span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>In: {record.check_in || '-'}</span>
                          <span>Out: {record.check_out || '-'}</span>
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-xs",
                            record.status === 'Present' && "bg-primary/20 text-primary",
                            record.status === 'Late' && "bg-amber-500/20 text-amber-500",
                            record.status === 'Absent' && "bg-destructive/20 text-destructive"
                          )}>
                            {record.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
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
                          <SelectItem value="Annual">Annual Leave</SelectItem>
                          <SelectItem value="Sick">Sick Leave</SelectItem>
                          <SelectItem value="Maternity">Maternity Leave</SelectItem>
                          <SelectItem value="Emergency">Emergency Leave</SelectItem>
                          <SelectItem value="Unpaid">Unpaid Leave</SelectItem>
                        </SelectContent>
                      </Select>
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
                    <div>
                      <label className="text-xs text-muted-foreground">Reason</label>
                      <Textarea value={leaveForm.reason} onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })} placeholder="Enter reason..." />
                    </div>
                    <Button type="submit" className="w-full" disabled={addLeave.isPending}>
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
          <div className="animate-fade-in">
            {employeeContract ? (
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
                      <div>
                        <p className="text-xs text-muted-foreground uppercase">Basic Salary</p>
                        <p className="text-lg font-semibold text-primary">AED {employeeContract.basic_salary?.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground uppercase">Working Hours</p>
                        <p className="text-lg font-semibold">{employeeContract.working_hours || 48} hrs/week</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground uppercase">Annual Leave</p>
                        <p className="text-lg font-semibold">{employeeContract.annual_leave_days || 30} days</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground uppercase">Notice Period</p>
                        <p className="text-lg font-semibold">{employeeContract.notice_period || 30} days</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
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
      </main>
    </div>
  );
}
