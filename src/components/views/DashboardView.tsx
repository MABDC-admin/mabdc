import { useHRStore } from '@/store/hrStore';
import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  subtextColor?: string;
}

function StatCard({ label, value, subtext, subtextColor = 'text-primary' }: StatCardProps) {
  return (
    <div className="stat-card rounded-2xl border border-border p-4 animate-fade-in">
      <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">{label}</p>
      <p className="text-3xl font-semibold mt-2 text-foreground">{value}</p>
      {subtext && (
        <p className={cn("text-xs mt-1", subtextColor)}>{subtext}</p>
      )}
    </div>
  );
}

export function DashboardView() {
  const { employees, leave } = useHRStore();

  const activeEmployees = employees.filter(e => e.status === 'Active').length;
  const pendingLeave = leave.filter(l => l.status === 'Pending').length;
  
  const expiringVisas = employees.filter(e => {
    if (!e.visa_expiration) return false;
    const days = Math.ceil((new Date(e.visa_expiration).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return days > 0 && days <= 60;
  });

  const recentEmployees = employees.slice(0, 4);

  return (
    <div className="space-y-6 animate-slide-up">
      <section className="glass-card rounded-3xl border border-border p-4 sm:p-6">
        <h1 className="text-xl font-semibold text-foreground mb-1">Dashboard Overview</h1>
        <p className="text-sm text-muted-foreground mb-6">Welcome to MABDC HR Management System</p>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <StatCard 
            label="Active Staff" 
            value={activeEmployees}
            subtext="Current employees"
          />
          <StatCard 
            label="Total Employees" 
            value={employees.length}
            subtext="In system"
          />
          <StatCard 
            label="Visa Alerts" 
            value={expiringVisas.length}
            subtext="Within 60 days"
            subtextColor="text-amber-400"
          />
          <StatCard 
            label="Leave Pending" 
            value={pendingLeave}
            subtext="Awaiting approval"
            subtextColor="text-accent"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="glass-card rounded-2xl border border-border p-4">
            <h2 className="text-sm font-semibold text-foreground mb-3">Recent Employees</h2>
            <div className="space-y-2">
              {recentEmployees.length === 0 ? (
                <p className="text-xs text-muted-foreground">No employees found</p>
              ) : (
                recentEmployees.map((emp) => (
                  <div key={emp.id} className="p-3 rounded-xl bg-secondary/30 border border-border">
                    <p className="text-sm font-semibold text-foreground">{emp.full_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {emp.job_position} • {emp.department}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="glass-card rounded-2xl border border-border p-4">
            <h2 className="text-sm font-semibold text-foreground mb-3">Visa Expiry Alerts</h2>
            <div className="space-y-2">
              {expiringVisas.length === 0 ? (
                <p className="text-xs text-muted-foreground">No visa expiry alerts</p>
              ) : (
                expiringVisas.map((emp) => {
                  const days = Math.ceil((new Date(emp.visa_expiration!).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                  return (
                    <div key={emp.id} className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
                      <p className="text-sm font-semibold text-amber-200">{emp.full_name}</p>
                      <p className="text-xs text-foreground mt-1">Visa expires in {days} days</p>
                      <p className="text-xs text-amber-400 mt-1">HRMS: {emp.hrms_no}</p>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
