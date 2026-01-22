import { useState } from 'react';
import { useEmployees } from '@/hooks/useEmployees';
import { useLeave } from '@/hooks/useLeave';
import { useContracts } from '@/hooks/useContracts';
import { useTodayAttendance, useRealtimeAttendance } from '@/hooks/useAttendance';
import { useCompanySettings } from '@/hooks/useSettings';
import { useHRStore } from '@/store/hrStore';
import { cn } from '@/lib/utils';
import { Users, FileText, Clock, AlertTriangle, TrendingUp, Calendar, ArrowRight, RefreshCw, LogIn, LogOut, CheckCircle, QrCode, Bell, Zap, Cake, Monitor } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { differenceInDays, parseISO, format, isAfter, isBefore, addDays } from 'date-fns';
import { Button } from '@/components/ui/button';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { EmployeeProfileModal } from '@/components/modals/EmployeeProfileModal';
import type { Employee } from '@/types/hr';

interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  subtextColor?: string;
  icon: React.ReactNode;
  trend?: string;
  trendUp?: boolean;
  onClick?: () => void;
}

function StatCard({ label, value, subtext, subtextColor = 'text-[hsl(174_55%_35%)]', icon, trend, trendUp, onClick }: StatCardProps) {
  return (
    <div 
      className={cn(
        "tropical-stat-card p-5 animate-fade-in relative overflow-hidden group",
        onClick && "cursor-pointer"
      )}
      onClick={onClick}
    >
      <div className="absolute top-0 right-0 w-28 h-28 bg-gradient-to-br from-[hsl(174_60%_42%/0.08)] to-transparent rounded-bl-full" />
      <div className="flex items-start justify-between relative z-10">
        <div>
          <p className="text-[11px] uppercase tracking-[0.15em] text-[hsl(180_15%_50%)] dark:text-[hsl(180_15%_60%)] font-medium">{label}</p>
          <p className="text-4xl font-bold mt-2 text-[hsl(180_30%_20%)] dark:text-[hsl(180_15%_95%)] tracking-tight">{value}</p>
          {subtext && (
            <p className={cn("text-xs mt-2 font-medium", subtextColor)}>{subtext}</p>
          )}
          {trend && (
            <div className={cn("flex items-center gap-1 mt-2", trendUp ? "text-[hsl(174_55%_40%)]" : "text-destructive")}>
              <TrendingUp className={cn("w-3 h-3", !trendUp && "rotate-180")} />
              <span className="text-xs font-medium">{trend}</span>
            </div>
          )}
        </div>
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[hsl(174_50%_90%)] to-[hsl(180_45%_85%)] dark:from-[hsl(174_40%_25%)] dark:to-[hsl(180_35%_20%)] flex items-center justify-center text-[hsl(174_55%_40%)] dark:text-[hsl(174_50%_60%)] border-2 border-[hsl(174_45%_80%)] dark:border-[hsl(174_35%_30%)] group-hover:scale-110 transition-transform duration-300">
          {icon}
        </div>
      </div>
      {onClick && (
        <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
          <ArrowRight className="w-4 h-4 text-[hsl(174_55%_40%)]" />
        </div>
      )}
    </div>
  );
}

const CHART_COLORS = ['hsl(152, 100%, 30%)', 'hsl(210, 100%, 35%)', 'hsl(45, 100%, 50%)', 'hsl(355, 78%, 44%)'];

export function DashboardView() {
  const navigate = useNavigate();
  const { setCurrentView, setCurrentEmployee } = useHRStore();
  const { data: employees = [], isLoading: employeesLoading, refetch: refetchEmployees } = useEmployees();
  const { data: leave = [], isLoading: leaveLoading } = useLeave();
  const { data: contracts = [], isLoading: contractsLoading } = useContracts();
  const { data: todayAttendance = [] } = useTodayAttendance();
  const { data: companySettings } = useCompanySettings();
  
  // State for employee profile modal
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  
  // Enable realtime attendance updates
  useRealtimeAttendance();

  // Get configurable expiry notification threshold (default 30 days)
  const expiryThreshold = companySettings?.expiry_notification_days || 30;

  const activeEmployees = employees.filter(e => e.status === 'Active').length;
  const onLeaveEmployees = employees.filter(e => e.status === 'On Leave').length;
  const pendingLeave = leave.filter(l => l.status === 'Pending').length;
  const activeContracts = contracts.filter(c => c.status === 'Active').length;
  // Appealed counts as Present for statistics
  const presentToday = todayAttendance.filter(a => a.status === 'Present' || a.status === 'Appealed').length;
  const lateToday = todayAttendance.filter(a => a.status === 'Late').length;
  
  const expiringVisas = employees.filter(e => {
    if (!e.visa_expiration) return false;
    const days = Math.ceil((new Date(e.visa_expiration).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return days > 0 && days <= expiryThreshold;
  });

  // Contract expiry calculations - uses configurable threshold
  const getContractExpiryStatus = (contract: typeof contracts[0]) => {
    if (contract.status === 'Expired' || contract.status === 'Terminated') return 'expired';
    if (!contract.end_date) return 'active';
    const daysUntilExpiry = differenceInDays(parseISO(contract.end_date), new Date());
    if (daysUntilExpiry < 0) return 'expired';
    if (daysUntilExpiry <= expiryThreshold) return 'expiring';
    if (daysUntilExpiry <= expiryThreshold * 2) return 'nearing';
    return 'active';
  };

  const expiringContracts = contracts.filter(c => getContractExpiryStatus(c) === 'expiring').length;
  const nearingExpiryContracts = contracts.filter(c => getContractExpiryStatus(c) === 'nearing').length;
  const contractAlertsCount = expiringContracts + nearingExpiryContracts;

  const recentEmployees = employees.slice(0, 5);

  // Department distribution data
  const departmentData = employees.reduce((acc, emp) => {
    const dept = emp.department || 'Other';
    acc[dept] = (acc[dept] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const pieData = Object.entries(departmentData).map(([name, value]) => ({ name, value }));

  // Status distribution for bar chart
  const statusData = [
    { name: 'Active', count: activeEmployees, fill: 'hsl(152, 100%, 30%)' },
    { name: 'On Leave', count: onLeaveEmployees, fill: 'hsl(45, 100%, 50%)' },
    { name: 'Contracts', count: activeContracts, fill: 'hsl(210, 100%, 35%)' },
  ];

  // Upcoming birthdays (this month)
  const getUpcomingBirthdays = () => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    return employees.filter(emp => {
      if (!emp.birthday) return false;
      
      const birthday = parseISO(emp.birthday);
      // Check if birthday is in the current month
      return birthday.getMonth() === currentMonth;
    }).map(emp => {
      const birthday = parseISO(emp.birthday!);
      const thisYearBirthday = new Date(currentYear, birthday.getMonth(), birthday.getDate());
      const daysUntil = differenceInDays(thisYearBirthday, today);
      return { ...emp, daysUntil, birthdayDate: thisYearBirthday };
    }).sort((a, b) => a.birthdayDate.getDate() - b.birthdayDate.getDate());
  };

  const upcomingBirthdays = getUpcomingBirthdays();

  const isLoading = employeesLoading || leaveLoading || contractsLoading;

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[hsl(180_30%_20%)] dark:text-[hsl(180_15%_95%)] tracking-tight">Dashboard Overview</h1>
          <p className="text-sm text-[hsl(174_30%_45%)] dark:text-[hsl(174_25%_60%)] mt-1">Welcome to MABDC HR Management System</p>
      </div>

      {/* Contract Expiry Alerts Banner */}
      {contractAlertsCount > 0 && (
        <div 
          className="glass-card rounded-2xl border border-red-500/40 bg-red-500/5 p-4 cursor-pointer hover:bg-red-500/10 transition-colors animate-pulse-alert"
          onClick={() => setCurrentView('contracts')}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center animate-pulse">
                <Bell className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-red-500">Contract Expiry Alerts</h3>
                <p className="text-xs text-muted-foreground">
                  <span className="text-red-500 font-medium">{expiringContracts}</span> contracts expiring soon, <span className="text-red-400">{nearingExpiryContracts}</span> nearing expiry
                </p>
              </div>
            </div>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={(e) => { e.stopPropagation(); setCurrentView('contracts'); }}
              className="border-red-500/40 text-red-500 hover:bg-red-500/10 hover:text-red-400"
            >
              <Zap className="w-4 h-4 mr-1" />
              View
            </Button>
          </div>
        </div>
      )}
        <div className="flex gap-2">
          <Button 
            variant="default" 
            size="sm" 
            onClick={() => navigate('/kiosk')}
            className="gap-2"
          >
            <Monitor className="w-4 h-4" />
            Kiosk Mode
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => refetchEmployees()}
            className="gap-2 border-border hover:bg-secondary"
          >
            <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          label="Active Staff" 
          value={activeEmployees}
          subtext="Current employees"
          icon={<Users className="w-5 h-5" />}
          trend="+2 this month"
          trendUp
          onClick={() => setCurrentView('employees')}
        />
        <StatCard 
          label="Total Employees" 
          value={employees.length}
          subtext="In system"
          icon={<Users className="w-5 h-5" />}
          onClick={() => setCurrentView('employees')}
        />
        <StatCard 
          label="Visa Alerts" 
          value={expiringVisas.length}
          subtext={`Within ${expiryThreshold} days`}
          subtextColor="text-red-500"
          icon={<AlertTriangle className="w-5 h-5" />}
          onClick={() => setCurrentView('employees')}
        />
        <StatCard 
          label="Leave Pending" 
          value={pendingLeave}
          subtext="Awaiting approval"
          subtextColor="text-accent"
          icon={<Clock className="w-5 h-5" />}
          onClick={() => setCurrentView('leave')}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Visa Expiry Alerts - Expanded with Red Pulse Animation */}
        <div className={cn(
          "tropical-card rounded-2xl p-5 lg:col-span-2 transition-all",
          expiringVisas.length > 0 
            ? "border-red-500/50 bg-red-500/5 animate-glow-pulse" 
            : ""
        )}>
          <div className="flex items-center justify-between mb-4">
            <h2 className={cn(
              "text-sm font-semibold flex items-center gap-2",
              expiringVisas.length > 0 ? "text-red-500" : "text-foreground"
            )}>
              <AlertTriangle className={cn(
                "w-4 h-4",
                expiringVisas.length > 0 ? "text-red-500 animate-pulse" : "text-amber-500"
              )} />
              Visa Expiry Alerts
            </h2>
            <Button 
              variant="ghost" 
              size="sm" 
              className={cn(
                "text-xs gap-1",
                expiringVisas.length > 0 
                  ? "text-red-500 hover:text-red-400 hover:bg-red-500/10" 
                  : "text-amber-500 hover:text-amber-400"
              )}
              onClick={() => setCurrentView('renewal')}
            >
              {expiringVisas.length} expiring
              <ArrowRight className="w-3 h-3" />
            </Button>
          </div>
          <div className="h-[280px] overflow-y-auto soft-scroll">
            {expiringVisas.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                <CheckCircle className="w-10 h-10 mb-2 text-primary opacity-50" />
                <p className="text-sm font-medium">All visas valid</p>
                <p className="text-xs opacity-70">No expiring visas in the next {expiryThreshold} days</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {expiringVisas.slice(0, 10).map((emp) => {
                  const days = Math.ceil((new Date(emp.visa_expiration!).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                  const urgency = days <= 7 ? 'critical' : days <= expiryThreshold ? 'warning' : 'caution';
                  return (
                    <div 
                      key={emp.id} 
                      className={cn(
                        "flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all",
                        urgency === 'critical' 
                          ? "bg-red-500/15 border-red-500/40 hover:bg-red-500/25 animate-pulse-alert" 
                          : urgency === 'warning'
                          ? "bg-red-500/10 border-red-500/30 hover:bg-red-500/20"
                          : "bg-red-400/10 border-red-400/30 hover:bg-red-400/20"
                      )}
                      onClick={() => {
                        setCurrentEmployee(emp as Employee);
                        setIsProfileOpen(true);
                      }}
                    >
                      <div className="flex items-center gap-3">
                        {emp.photo_url ? (
                          <img src={emp.photo_url} alt={emp.full_name} className="w-8 h-8 rounded-lg object-cover" />
                        ) : (
                          <div className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold",
                            urgency === 'critical' ? "bg-red-500/30 text-red-500" : 
                            urgency === 'warning' ? "bg-red-500/20 text-red-500" : 
                            "bg-red-400/20 text-red-400"
                          )}>
                            {emp.full_name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{emp.full_name}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{emp.hrms_no} • Exp: {format(parseISO(emp.visa_expiration!), 'dd MMM yyyy')}</p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className={cn(
                          "text-lg font-bold",
                          urgency === 'critical' ? "text-red-500" : 
                          urgency === 'warning' ? "text-red-500" : 
                          "text-red-400"
                        )}>
                          {days}
                        </p>
                        <p className="text-[10px] text-muted-foreground">days</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Today's Late Employees */}
        <div className="tropical-card rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-[hsl(180_30%_25%)] dark:text-[hsl(180_15%_90%)] flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-[hsl(38_80%_50%)]" />
              Today's Late
            </h2>
            <span className="text-xs text-[hsl(38_80%_50%)] font-medium">{lateToday} late</span>
          </div>
          <div className="h-[280px] overflow-y-auto soft-scroll">
            {todayAttendance.filter(a => a.status === 'Late').length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                <CheckCircle className="w-10 h-10 mb-2 text-primary opacity-50" />
                <p className="text-sm font-medium">All on time!</p>
                <p className="text-xs opacity-70">No late arrivals today</p>
              </div>
            ) : (
              <div className="space-y-2">
                {todayAttendance.filter(a => a.status === 'Late').map((record) => (
                  <div key={record.id} className="flex items-center justify-between p-3 rounded-xl bg-[hsl(38_80%_55%/0.1)] border border-[hsl(38_70%_60%/0.3)]">
                    <div className="flex items-center gap-3">
                      {record.employees?.photo_url ? (
                        <img src={record.employees.photo_url} alt={record.employees.full_name} className="w-8 h-8 rounded-full object-cover teal-avatar-ring" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-[hsl(38_70%_85%)] dark:bg-[hsl(38_60%_25%)] flex items-center justify-center text-xs font-bold text-[hsl(38_70%_40%)] dark:text-[hsl(38_70%_70%)]">
                          {record.employees?.full_name?.split(' ').map(n => n[0]).join('').substring(0, 2) || '??'}
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-[hsl(180_25%_20%)] dark:text-[hsl(180_15%_90%)]">{record.employees?.full_name}</p>
                        <p className="text-[10px] text-[hsl(174_25%_50%)] dark:text-[hsl(174_20%_60%)]">Check-in: {record.check_in || '--:--'}</p>
                      </div>
                    </div>
                    <span className="tropical-badge">
                      Late
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Upcoming Birthdays - Compact */}
        <div className="tropical-card rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold text-[hsl(180_30%_25%)] dark:text-[hsl(180_15%_90%)] flex items-center gap-1.5">
              <Cake className="w-3.5 h-3.5 text-pink-500" />
              Birthdays
            </h2>
            <span className="text-[10px] text-pink-500 font-medium">{upcomingBirthdays.length}</span>
          </div>
          <div className="h-[260px] overflow-y-auto soft-scroll">
            {upcomingBirthdays.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                <Cake className="w-8 h-8 mb-2 text-pink-500 opacity-50" />
                <p className="text-xs font-medium">No birthdays</p>
                <p className="text-[10px] opacity-70">This month</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {upcomingBirthdays.map((emp) => (
                  <div 
                    key={emp.id} 
                    className={cn(
                      "flex items-center justify-between p-2 rounded-lg border cursor-pointer transition-colors",
                      emp.daysUntil === 0 
                        ? "bg-pink-500/20 border-pink-500/40 hover:bg-pink-500/30" 
                        : "bg-pink-500/10 border-pink-500/20 hover:bg-pink-500/20"
                    )}
                    onClick={() => setCurrentView('employees')}
                  >
                    <div className="flex items-center gap-2">
                      {emp.photo_url ? (
                        <img src={emp.photo_url} alt={emp.full_name} className="w-6 h-6 rounded-md object-cover" />
                      ) : (
                        <div className="w-6 h-6 rounded-md bg-pink-500/20 flex items-center justify-center text-[10px] font-bold text-pink-500">
                          {emp.full_name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{emp.full_name}</p>
                        <p className="text-[9px] text-muted-foreground">
                          {format(emp.birthdayDate, 'MMM dd')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      {emp.daysUntil === 0 ? (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-pink-500 text-white font-medium">
                          🎂
                        </span>
                      ) : (
                        <p className="text-sm font-bold text-pink-500">{emp.daysUntil}d</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Live Attendance Feed */}
      <div className="tropical-card rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-[hsl(180_30%_25%)] dark:text-[hsl(180_15%_90%)] flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[hsl(174_60%_42%)] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[hsl(174_60%_42%)]"></span>
            </span>
            Live Attendance
          </h2>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1 text-[hsl(174_55%_40%)]">
              <CheckCircle className="w-3 h-3" /> {presentToday} Present
            </span>
            <span className="flex items-center gap-1 text-[hsl(38_80%_50%)]">
              <AlertTriangle className="w-3 h-3" /> {lateToday} Late
            </span>
          </div>
        </div>
        <div className="space-y-2 max-h-48 overflow-y-auto soft-scroll">
          {todayAttendance.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <QrCode className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-xs">No attendance recorded today</p>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-3"
                onClick={() => setCurrentView('attendance')}
              >
                Open Attendance
              </Button>
            </div>
          ) : (
            todayAttendance.slice(0, 6).map((record) => (
              <div key={record.id} className="flex items-center justify-between p-2 rounded-xl bg-[hsl(174_40%_95%)] dark:bg-[hsl(180_25%_15%)] border border-[hsl(174_35%_88%)] dark:border-[hsl(180_20%_22%)] animate-fade-in">
                <div className="flex items-center gap-2">
                  {record.employees?.photo_url ? (
                    <img src={record.employees.photo_url} alt={record.employees.full_name} className="w-8 h-8 rounded-full object-cover teal-avatar-ring" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[hsl(174_50%_85%)] to-[hsl(180_45%_80%)] dark:from-[hsl(174_40%_30%)] dark:to-[hsl(180_35%_25%)] flex items-center justify-center text-xs font-bold text-[hsl(174_55%_35%)] dark:text-[hsl(174_45%_70%)]">
                      {record.employees?.full_name?.split(' ').map(n => n[0]).join('').substring(0, 2) || '??'}
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-medium text-[hsl(180_25%_20%)] dark:text-[hsl(180_15%_90%)]">{record.employees?.full_name}</p>
                    <p className="text-[10px] text-[hsl(174_25%_50%)] dark:text-[hsl(174_20%_60%)] flex items-center gap-2">
                      <span className="flex items-center gap-0.5"><LogIn className="w-2.5 h-2.5" /> {record.check_in || '--:--'}</span>
                      <span className="flex items-center gap-0.5"><LogOut className="w-2.5 h-2.5" /> {record.check_out || '--:--'}</span>
                    </p>
                  </div>
                </div>
                <span className={cn(
                  "tropical-badge",
                  record.status === 'Present' ? "" : "bg-[hsl(38_80%_55%/0.15)] text-[hsl(38_70%_40%)] dark:text-[hsl(38_70%_60%)]"
                )}>
                  {record.status}
                </span>
              </div>
            ))
          )}
        </div>
        {todayAttendance.length > 6 && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full mt-2 text-xs text-[hsl(174_55%_40%)] hover:text-[hsl(174_55%_35%)] hover:bg-[hsl(174_60%_42%/0.1)]"
            onClick={() => setCurrentView('attendance')}
          >
            View all {todayAttendance.length} records
            <ArrowRight className="w-3 h-3 ml-1" />
          </Button>
        )}
      </div>

      {/* Bottom Card - Recent Employees */}
      <div className="tropical-card rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-[hsl(180_30%_25%)] dark:text-[hsl(180_15%_90%)]">Recent Employees</h2>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-xs text-[hsl(174_55%_40%)] hover:text-[hsl(174_55%_35%)] hover:bg-[hsl(174_60%_42%/0.1)]"
            onClick={() => setCurrentView('employees')}
          >
            View All
            <ArrowRight className="w-3 h-3 ml-1" />
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {recentEmployees.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground col-span-full">
              <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-xs">No employees found</p>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-3"
                onClick={() => setCurrentView('employees')}
              >
                Add Employee
              </Button>
            </div>
          ) : (
            recentEmployees.map((emp) => (
              <div key={emp.id} className="p-3 rounded-xl bg-[hsl(174_40%_96%)] dark:bg-[hsl(180_25%_14%)] border border-[hsl(174_35%_88%)] dark:border-[hsl(180_20%_20%)] hover:border-[hsl(174_50%_70%)] transition-colors cursor-pointer group">
                <div className="flex items-center gap-3">
                  {emp.photo_url ? (
                    <img src={emp.photo_url} alt={emp.full_name} className="w-10 h-10 rounded-full object-cover teal-avatar-ring" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[hsl(174_55%_50%)] to-[hsl(180_50%_45%)] flex items-center justify-center text-sm font-bold text-white">
                      {emp.full_name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[hsl(180_25%_20%)] dark:text-[hsl(180_15%_90%)] truncate">{emp.full_name}</p>
                    <p className="text-xs text-[hsl(174_25%_50%)] dark:text-[hsl(174_20%_60%)] truncate">
                      {emp.job_position} • {emp.department}
                    </p>
                  </div>
                  <span className={cn(
                    "tropical-badge",
                    emp.status === 'Active' 
                      ? ""
                      : "bg-[hsl(38_80%_55%/0.15)] text-[hsl(38_70%_40%)]"
                  )}>
                    {emp.status || 'Active'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="tropical-card rounded-2xl p-5">
        <h2 className="text-sm font-semibold text-[hsl(180_30%_25%)] dark:text-[hsl(180_15%_90%)] mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Button 
            variant="outline" 
            className="h-auto py-4 flex-col gap-2 border-[hsl(174_35%_85%)] dark:border-[hsl(180_20%_25%)] hover:border-[hsl(174_50%_60%)] hover:bg-[hsl(174_60%_42%/0.08)] bg-white/50 dark:bg-[hsl(180_25%_12%)]"
            onClick={() => setCurrentView('employees')}
          >
            <Users className="w-5 h-5 text-[hsl(174_55%_40%)]" />
            <span className="text-xs text-[hsl(180_25%_30%)] dark:text-[hsl(180_15%_80%)]">Add Employee</span>
          </Button>
          <Button 
            variant="outline" 
            className="h-auto py-4 flex-col gap-2 border-[hsl(174_35%_85%)] dark:border-[hsl(180_20%_25%)] hover:border-[hsl(174_50%_60%)] hover:bg-[hsl(174_60%_42%/0.08)] bg-white/50 dark:bg-[hsl(180_25%_12%)]"
            onClick={() => setCurrentView('contracts')}
          >
            <FileText className="w-5 h-5 text-[hsl(174_55%_40%)]" />
            <span className="text-xs text-[hsl(180_25%_30%)] dark:text-[hsl(180_15%_80%)]">New Contract</span>
          </Button>
          <Button 
            variant="outline" 
            className="h-auto py-4 flex-col gap-2 border-[hsl(174_35%_85%)] dark:border-[hsl(180_20%_25%)] hover:border-[hsl(174_50%_60%)] hover:bg-[hsl(174_60%_42%/0.08)] bg-white/50 dark:bg-[hsl(180_25%_12%)]"
            onClick={() => setCurrentView('leave')}
          >
            <Calendar className="w-5 h-5 text-[hsl(174_55%_40%)]" />
            <span className="text-xs text-[hsl(180_25%_30%)] dark:text-[hsl(180_15%_80%)]">Leave Requests</span>
          </Button>
          <Button 
            variant="outline" 
            className="h-auto py-4 flex-col gap-2 border-[hsl(174_35%_85%)] dark:border-[hsl(180_20%_25%)] hover:border-[hsl(174_50%_60%)] hover:bg-[hsl(174_60%_42%/0.08)] bg-white/50 dark:bg-[hsl(180_25%_12%)]"
            onClick={() => setCurrentView('payroll')}
          >
            <TrendingUp className="w-5 h-5 text-[hsl(174_55%_40%)]" />
            <span className="text-xs text-[hsl(180_25%_30%)] dark:text-[hsl(180_15%_80%)]">Run Payroll</span>
          </Button>
        </div>
      </div>

      {/* Employee Profile Modal */}
      <EmployeeProfileModal 
        isOpen={isProfileOpen} 
        onClose={() => setIsProfileOpen(false)} 
      />
    </div>
  );
}
