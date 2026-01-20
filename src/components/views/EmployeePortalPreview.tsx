import { useState, useMemo, useEffect } from 'react';
import { useEmployees } from '@/hooks/useEmployees';
import { useAttendance } from '@/hooks/useAttendance';
import { useLeave, useLeaveTypes, useLeaveBalances } from '@/hooks/useLeave';
import { useContracts } from '@/hooks/useContracts';
import { useEmployeeHRLetters } from '@/hooks/useHRLetters';
import { useEmployeePerformance, useEmployeeCorrectiveActions } from '@/hooks/usePerformance';
import { useEmployeeDiscipline } from '@/hooks/useDiscipline';
import { useEmployeeDocuments } from '@/hooks/useDocuments';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { EmployeeAttendanceCalendar } from '@/components/attendance/EmployeeAttendanceCalendar';
import { EmployeeGamificationCard } from '@/components/gamification/EmployeeGamificationCard';
import { 
  User, Calendar, FileText, Clock, CheckCircle, XCircle, 
  AlertTriangle, Briefcase, Mail, Eye, CreditCard, Home, Car, 
  UserCircle, Cake, Phone, MapPin, Globe, Heart, Baby, Star, Scale, Trophy
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO, differenceInYears, differenceInDays, addMonths } from 'date-fns';
import type { Employee } from '@/types/hr';

type TabType = 'overview' | 'attendance' | 'leave' | 'contract' | 'letters' | 'personal' | 'records' | 'gamification';

export function EmployeePortalPreview() {
  const { data: employees = [] } = useEmployees();
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<TabType>('personal');
  
  // Set default to Myranel when employees load
  useEffect(() => {
    if (employees.length > 0 && !selectedEmployeeId) {
      const myranel = employees.find(e => e.full_name.toLowerCase().includes('myranel'));
      if (myranel) {
        setSelectedEmployeeId(myranel.id);
      }
    }
  }, [employees, selectedEmployeeId]);

  const selectedEmployee = employees.find(e => e.id === selectedEmployeeId);

  // Hooks for data
  const { data: allAttendance = [] } = useAttendance();
  const { data: allLeave = [] } = useLeave();
  const { data: contracts = [] } = useContracts();
  const { data: letters = [] } = useEmployeeHRLetters(selectedEmployeeId || '');
  const { data: leaveTypes = [] } = useLeaveTypes();
  const { data: leaveBalances = [] } = useLeaveBalances(selectedEmployeeId || '');
  const { data: documents = [] } = useEmployeeDocuments(selectedEmployeeId || '');
  const { data: performanceRecords = [] } = useEmployeePerformance(selectedEmployeeId || '');
  const { data: correctiveActions = [] } = useEmployeeCorrectiveActions(selectedEmployeeId || '');
  const { data: disciplineRecords = [] } = useEmployeeDiscipline(selectedEmployeeId || '');

  // Filter data for selected employee
  const attendance = allAttendance.filter(a => a.employee_id === selectedEmployeeId);
  const leaveRecords = allLeave.filter(l => l.employee_id === selectedEmployeeId);
  const employeeContract = contracts.find(c => c.employee_id === selectedEmployeeId && c.status === 'Active');

  // Calculate Annual Leave balance only (linked to employee via leave_balances table)
  const annualLeaveBalance = useMemo(() => {
    const annualLeave = leaveBalances.find(lb => 
      lb.leave_types?.name === 'Annual Leave'
    );
    if (!annualLeave) return 0;
    const available = (annualLeave.entitled_days + annualLeave.carried_forward_days) - 
                      annualLeave.used_days - annualLeave.pending_days;
    return Math.max(0, available);
  }, [leaveBalances]);

  // Calculate probation status (6 months from joining date)
  const probationStatus = useMemo(() => {
    if (!selectedEmployee?.joining_date) return null;
    
    const joiningDate = parseISO(selectedEmployee.joining_date);
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
  }, [selectedEmployee?.joining_date]);

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
    <div className="space-y-6 animate-fade-in">
      {/* Employee Selector */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            Employee Portal Preview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1 max-w-md">
              <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an employee to preview their portal..." />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      <div className="flex items-center gap-2">
                        {emp.photo_url ? (
                          <img src={emp.photo_url} className="w-6 h-6 rounded-full object-cover" />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold">
                            {getInitials(emp.full_name)}
                          </div>
                        )}
                        <span>{emp.full_name}</span>
                        <span className="text-muted-foreground text-xs">({emp.hrms_no})</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedEmployee && (
              <Badge variant="outline" className="text-xs">
                Live Preview Mode
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Portal Preview */}
      {selectedEmployee ? (
        <div className="border-2 border-dashed border-primary/30 rounded-xl overflow-hidden bg-gradient-to-br from-background via-primary/5 to-accent/5">
          {/* Preview Header */}
          <div className="bg-primary/10 px-4 py-2 text-xs text-primary font-medium flex items-center gap-2 border-b border-primary/20">
            <Eye className="w-3 h-3" />
            Viewing as: {selectedEmployee.full_name}'s Employee Portal
          </div>

          {/* Portal Header */}
          <header className="bg-card border-b border-border">
            <div className="max-w-6xl mx-auto px-4 py-4">
              <div className="flex items-center gap-4">
                {selectedEmployee.photo_url ? (
                  <img src={selectedEmployee.photo_url} alt={selectedEmployee.full_name} className="w-14 h-14 rounded-full object-cover" />
                ) : (
                  <div className="w-14 h-14 rounded-full avatar-gradient flex items-center justify-center text-lg font-bold text-primary-foreground">
                    {getInitials(selectedEmployee.full_name)}
                  </div>
                )}
                <div>
                  <h1 className="text-xl font-bold text-foreground">{selectedEmployee.full_name}</h1>
                  <p className="text-sm text-muted-foreground">{selectedEmployee.job_position} • {selectedEmployee.department}</p>
                </div>
                <div className="ml-auto">
                  <span className={cn(
                    "px-3 py-1 rounded-full text-xs font-medium",
                    selectedEmployee.status === 'Active' 
                      ? "bg-primary/20 text-primary" 
                      : "bg-amber-500/20 text-amber-500"
                  )}>
                    {selectedEmployee.status || 'Active'}
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
            {/* Personal Info Tab */}
            {activeTab === 'personal' && (
              <div className="space-y-6 animate-fade-in">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <UserCircle className="w-5 h-5" />
                      Personal Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      <InfoItem icon={User} label="Gender" value={selectedEmployee.gender || 'Not set'} />
                      <InfoItem icon={Cake} label="Birthday" value={selectedEmployee.birthday ? format(parseISO(selectedEmployee.birthday), 'MMMM dd, yyyy') : 'Not set'} />
                      <InfoItem icon={Mail} label="Personal Email" value={selectedEmployee.personal_email || 'Not set'} />
                      <InfoItem icon={Phone} label="Phone" value={selectedEmployee.personal_phone || 'Not set'} />
                      <InfoItem icon={MapPin} label="Home Address" value={selectedEmployee.home_address || 'Not set'} />
                      <InfoItem icon={Globe} label="Place of Birth" value={selectedEmployee.place_of_birth || 'Not set'} />
                      <InfoItem icon={Globe} label="Country of Birth" value={selectedEmployee.country_of_birth || 'Not set'} />
                      <InfoItem icon={Globe} label="Nationality" value={selectedEmployee.nationality || 'Not set'} />
                      <InfoItem icon={Heart} label="Family Status" value={selectedEmployee.family_status || 'Not set'} />
                      <InfoItem icon={Baby} label="Children" value={selectedEmployee.number_of_children?.toString() || '0'} />
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">HRMS No.</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-foreground">{selectedEmployee.hrms_no}</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">Annual Leave Balance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-primary">
                      {leaveBalances.length > 0 ? `${annualLeaveBalance} days` : 'Not allocated'}
                    </p>
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

                {/* Probation Card - Only shows if on probation */}
                {probationStatus?.isOnProbation && (
                  <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/30">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-blue-600 dark:text-blue-400">Probation Days Left</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {probationStatus.daysRemaining}
                      </p>
                      {/* Progress bar */}
                      <div className="w-full bg-blue-100 dark:bg-blue-900/30 rounded-full h-1.5 mt-2">
                        <div 
                          className="bg-blue-500 h-1.5 rounded-full transition-all duration-500" 
                          style={{ width: `${probationStatus.percentComplete}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Ends: {format(probationStatus.endDate, 'MMM dd, yyyy')}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Attendance Tab */}
            {activeTab === 'attendance' && selectedEmployee && (
              <div className="animate-fade-in">
                <EmployeeAttendanceCalendar 
                  employeeId={selectedEmployeeId} 
                  isEmployeePortal={true}
                />
              </div>
            )}

            {/* Leave Tab */}
            {activeTab === 'leave' && (
              <div className="space-y-4 animate-fade-in">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="w-5 h-5" />
                      Leave Records
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {leaveRecords.length > 0 ? (
                      <div className="space-y-2">
                        {leaveRecords.map((record) => (
                          <div key={record.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border">
                            <div>
                              <span className="font-medium">{record.leave_type}</span>
                              <p className="text-sm text-muted-foreground">
                                {format(parseISO(record.start_date), 'MMM dd')} - {format(parseISO(record.end_date), 'MMM dd, yyyy')}
                              </p>
                            </div>
                            <Badge variant={record.status === 'Approved' ? 'default' : record.status === 'Pending' ? 'secondary' : 'destructive'}>
                              {record.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-center py-8">No leave records found</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Contract Tab */}
            {activeTab === 'contract' && (
              <div className="space-y-4 animate-fade-in">
                {employeeContract ? (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="w-5 h-5" />
                        Current Contract
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <InfoItem icon={Briefcase} label="Contract Type" value={employeeContract.contract_type} />
                        <InfoItem icon={FileText} label="MOHRE No." value={employeeContract.mohre_contract_no} />
                        <InfoItem icon={Calendar} label="Start Date" value={format(parseISO(employeeContract.start_date), 'MMM dd, yyyy')} />
                        <InfoItem icon={Calendar} label="End Date" value={employeeContract.end_date ? format(parseISO(employeeContract.end_date), 'MMM dd, yyyy') : 'Unlimited'} />
                        <InfoItem icon={CreditCard} label="Basic Salary" value={`AED ${employeeContract.basic_salary?.toLocaleString() || 0}`} />
                        <InfoItem icon={Home} label="Housing" value={`AED ${employeeContract.housing_allowance?.toLocaleString() || 0}`} />
                        <InfoItem icon={Car} label="Transportation" value={`AED ${employeeContract.transportation_allowance?.toLocaleString() || 0}`} />
                        <InfoItem icon={CreditCard} label="Total Salary" value={`AED ${employeeContract.total_salary?.toLocaleString() || 0}`} />
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="py-8 text-center text-muted-foreground">
                      No active contract found
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Letters Tab */}
            {activeTab === 'letters' && (
              <div className="space-y-4 animate-fade-in">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Mail className="w-5 h-5" />
                      HR Letters
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {letters.length > 0 ? (
                      <div className="space-y-2">
                        {letters.map((letter) => (
                          <div key={letter.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border">
                            <div>
                              <span className="font-medium">{letter.title}</span>
                              <p className="text-sm text-muted-foreground">{letter.letter_type} • {format(parseISO(letter.issued_date), 'MMM dd, yyyy')}</p>
                            </div>
                            <Badge>{letter.status}</Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-center py-8">No HR letters found</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Records Tab */}
            {activeTab === 'records' && (
              <div className="space-y-4 animate-fade-in">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Star className="w-5 h-5" />
                      Performance Records
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {performanceRecords.length > 0 ? (
                      <div className="space-y-2">
                        {performanceRecords.map((record) => (
                          <div key={record.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border">
                            <div>
                              <span className="font-medium">{record.performance_type}</span>
                              <p className="text-sm text-muted-foreground">{record.review_period}</p>
                            </div>
                            <div className="flex items-center gap-1">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star key={star} className={cn("w-4 h-4", star <= (record.rating || 0) ? "fill-amber-400 text-amber-400" : "text-muted")} />
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-center py-8">No performance records found</p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Scale className="w-5 h-5" />
                      Discipline Records
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {disciplineRecords.length > 0 ? (
                      <div className="space-y-2">
                        {disciplineRecords.map((record) => (
                          <div key={record.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border">
                            <div>
                              <span className="font-medium">{record.incident_type}</span>
                              <p className="text-sm text-muted-foreground">{format(parseISO(record.incident_date), 'MMM dd, yyyy')}</p>
                            </div>
                            <Badge variant={record.status === 'Resolved' ? 'default' : 'destructive'}>{record.status}</Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-center py-8">No discipline records found</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Gamification Tab */}
            {activeTab === 'gamification' && selectedEmployee && (
              <div className="animate-fade-in">
                <EmployeeGamificationCard employeeId={selectedEmployeeId} />
              </div>
            )}
          </main>
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <Eye className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">Select an Employee</h3>
            <p className="text-muted-foreground">Choose an employee from the dropdown above to preview their portal view</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function InfoItem({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium text-foreground">{value}</p>
      </div>
    </div>
  );
}
