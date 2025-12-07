import { useEmployees } from '@/hooks/useEmployees';
import { useLeave } from '@/hooks/useLeave';
import { useContracts } from '@/hooks/useContracts';
import { useHRStore } from '@/store/hrStore';
import { cn } from '@/lib/utils';
import { Users, FileText, Clock, AlertTriangle, TrendingUp, Calendar, ArrowRight, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';

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

function StatCard({ label, value, subtext, subtextColor = 'text-primary', icon, trend, trendUp, onClick }: StatCardProps) {
  return (
    <div 
      className={cn(
        "stat-card rounded-2xl border border-border p-5 animate-fade-in relative overflow-hidden group",
        onClick && "cursor-pointer hover:border-primary/50 transition-all duration-300"
      )}
      onClick={onClick}
    >
      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-primary/10 to-transparent rounded-bl-full" />
      <div className="flex items-start justify-between relative z-10">
        <div>
          <p className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground font-medium">{label}</p>
          <p className="text-4xl font-bold mt-2 text-foreground tracking-tight">{value}</p>
          {subtext && (
            <p className={cn("text-xs mt-2 font-medium", subtextColor)}>{subtext}</p>
          )}
          {trend && (
            <div className={cn("flex items-center gap-1 mt-2", trendUp ? "text-primary" : "text-destructive")}>
              <TrendingUp className={cn("w-3 h-3", !trendUp && "rotate-180")} />
              <span className="text-xs font-medium">{trend}</span>
            </div>
          )}
        </div>
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
          {icon}
        </div>
      </div>
      {onClick && (
        <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
          <ArrowRight className="w-4 h-4 text-primary" />
        </div>
      )}
    </div>
  );
}

const CHART_COLORS = ['hsl(152, 100%, 30%)', 'hsl(210, 100%, 35%)', 'hsl(45, 100%, 50%)', 'hsl(355, 78%, 44%)'];

export function DashboardView() {
  const { setCurrentView } = useHRStore();
  const { data: employees = [], isLoading: employeesLoading, refetch: refetchEmployees } = useEmployees();
  const { data: leave = [], isLoading: leaveLoading } = useLeave();
  const { data: contracts = [], isLoading: contractsLoading } = useContracts();

  const activeEmployees = employees.filter(e => e.status === 'Active').length;
  const onLeaveEmployees = employees.filter(e => e.status === 'On Leave').length;
  const pendingLeave = leave.filter(l => l.status === 'Pending').length;
  const activeContracts = contracts.filter(c => c.status === 'Active').length;
  
  const expiringVisas = employees.filter(e => {
    if (!e.visa_expiration) return false;
    const days = Math.ceil((new Date(e.visa_expiration).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return days > 0 && days <= 60;
  });

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

  const isLoading = employeesLoading || leaveLoading || contractsLoading;

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Dashboard Overview</h1>
          <p className="text-sm text-muted-foreground mt-1">Welcome to MABDC HR Management System</p>
        </div>
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
          subtext="Within 60 days"
          subtextColor="text-amber-400"
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Department Distribution */}
        <div className="glass-card rounded-2xl border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-foreground">Department Distribution</h2>
            <span className="text-xs text-muted-foreground">{employees.length} total</span>
          </div>
          <div className="h-[200px]">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(222, 47%, 6%)', 
                      border: '1px solid hsl(217, 33%, 17%)',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend 
                    wrapperStyle={{ fontSize: '11px' }}
                    formatter={(value) => <span className="text-muted-foreground">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                No department data available
              </div>
            )}
          </div>
        </div>

        {/* Status Overview */}
        <div className="glass-card rounded-2xl border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-foreground">Status Overview</h2>
            <Calendar className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusData} layout="vertical">
                <XAxis type="number" hide />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false}
                  tick={{ fill: 'hsl(215, 20%, 65%)', fontSize: 11 }}
                  width={80}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(222, 47%, 6%)', 
                    border: '1px solid hsl(217, 33%, 17%)',
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Employees */}
        <div className="glass-card rounded-2xl border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-foreground">Recent Employees</h2>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs text-primary hover:text-primary/80"
              onClick={() => setCurrentView('employees')}
            >
              View All
              <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </div>
          <div className="space-y-3">
            {recentEmployees.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
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
                <div key={emp.id} className="p-3 rounded-xl bg-secondary/30 border border-border hover:border-primary/30 transition-colors cursor-pointer group">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg avatar-gradient flex items-center justify-center text-sm font-bold text-primary-foreground">
                      {emp.full_name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{emp.full_name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {emp.job_position} • {emp.department}
                      </p>
                    </div>
                    <span className={cn(
                      "text-[10px] px-2 py-1 rounded-full font-medium",
                      emp.status === 'Active' 
                        ? "bg-primary/10 text-primary border border-primary/30"
                        : "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                    )}>
                      {emp.status || 'Active'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Visa Expiry Alerts */}
        <div className="glass-card rounded-2xl border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              Visa Expiry Alerts
            </h2>
            <span className="text-xs text-amber-400 font-medium">{expiringVisas.length} expiring</span>
          </div>
          <div className="space-y-3">
            {expiringVisas.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-xs">No visa expiry alerts</p>
                <p className="text-[10px] mt-1 opacity-70">All visas are valid for more than 60 days</p>
              </div>
            ) : (
              expiringVisas.map((emp) => {
                const days = Math.ceil((new Date(emp.visa_expiration!).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                return (
                  <div key={emp.id} className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-amber-200">{emp.full_name}</p>
                        <p className="text-xs text-foreground mt-1">HRMS: {emp.hrms_no}</p>
                      </div>
                      <div className="text-right">
                        <span className={cn(
                          "text-lg font-bold",
                          days <= 30 ? "text-destructive" : "text-amber-400"
                        )}>
                          {days}
                        </span>
                        <p className="text-[10px] text-muted-foreground">days left</p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="glass-card rounded-2xl border border-border p-5">
        <h2 className="text-sm font-semibold text-foreground mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Button 
            variant="outline" 
            className="h-auto py-4 flex-col gap-2 border-border hover:border-primary/50 hover:bg-primary/5"
            onClick={() => setCurrentView('employees')}
          >
            <Users className="w-5 h-5 text-primary" />
            <span className="text-xs">Add Employee</span>
          </Button>
          <Button 
            variant="outline" 
            className="h-auto py-4 flex-col gap-2 border-border hover:border-primary/50 hover:bg-primary/5"
            onClick={() => setCurrentView('contracts')}
          >
            <FileText className="w-5 h-5 text-primary" />
            <span className="text-xs">New Contract</span>
          </Button>
          <Button 
            variant="outline" 
            className="h-auto py-4 flex-col gap-2 border-border hover:border-primary/50 hover:bg-primary/5"
            onClick={() => setCurrentView('leave')}
          >
            <Calendar className="w-5 h-5 text-primary" />
            <span className="text-xs">Leave Requests</span>
          </Button>
          <Button 
            variant="outline" 
            className="h-auto py-4 flex-col gap-2 border-border hover:border-primary/50 hover:bg-primary/5"
            onClick={() => setCurrentView('payroll')}
          >
            <TrendingUp className="w-5 h-5 text-primary" />
            <span className="text-xs">Run Payroll</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
