import { usePayroll, useProcessWPS } from '@/hooks/usePayroll';
import { Button } from '@/components/ui/button';
import { DollarSign, RefreshCw, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export function PayrollView() {
  const { data: payroll = [], isLoading, refetch } = usePayroll();
  const processWPS = useProcessWPS();

  const totalPayroll = payroll.reduce((sum, p) => sum + (p.net_salary || 0), 0);

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="stat-card rounded-2xl border border-border p-5">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Total Payroll</p>
          <p className="text-3xl font-bold mt-2 text-foreground">AED {totalPayroll.toLocaleString()}</p>
        </div>
        <div className="stat-card rounded-2xl border border-border p-5">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">WPS Processed</p>
          <p className="text-3xl font-bold mt-2 text-primary">{payroll.filter(p => p.wps_processed).length}</p>
        </div>
        <div className="stat-card rounded-2xl border border-border p-5">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Pending</p>
          <p className="text-3xl font-bold mt-2 text-amber-400">{payroll.filter(p => !p.wps_processed).length}</p>
        </div>
      </div>
      <section className="glass-card rounded-3xl border border-border p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Payroll Management</h1>
            <p className="text-xs text-muted-foreground mt-1">WPS compliant salary processing</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="border-border">
            <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
          </Button>
        </div>
        <div className="space-y-3">
          {isLoading ? (
            <div className="text-center py-8"><RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-muted-foreground" /></div>
          ) : payroll.length === 0 ? (
            <div className="text-center py-8"><DollarSign className="w-8 h-8 mx-auto mb-2 opacity-50 text-muted-foreground" /><p className="text-sm text-muted-foreground">No payroll records</p><p className="text-xs text-muted-foreground mt-1">Payroll records will appear here when processed</p></div>
          ) : (
            payroll.map((record) => (
              <div key={record.id} className="glass-card rounded-2xl border border-border p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-base font-semibold text-foreground">{record.employees?.full_name || 'Unknown'}</h3>
                      <span className={cn("text-xs px-2 py-1 rounded-full border", record.wps_processed ? "bg-primary/10 text-primary border-primary/30" : "bg-amber-500/10 text-amber-400 border-amber-500/30")}>{record.wps_processed ? 'Processed' : 'Pending'}</span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div><p className="text-[10px] uppercase text-muted-foreground">Month</p><p className="text-xs text-foreground">{record.month}</p></div>
                      <div><p className="text-[10px] uppercase text-muted-foreground">Basic</p><p className="text-xs text-foreground">AED {record.basic_salary?.toLocaleString()}</p></div>
                      <div><p className="text-[10px] uppercase text-muted-foreground">Allowances</p><p className="text-xs text-primary">+{record.allowances?.toLocaleString()}</p></div>
                      <div><p className="text-[10px] uppercase text-muted-foreground">Net</p><p className="text-sm font-bold text-foreground">AED {record.net_salary?.toLocaleString()}</p></div>
                    </div>
                  </div>
                  {!record.wps_processed && (
                    <Button size="sm" onClick={() => processWPS.mutate(record.id)} disabled={processWPS.isPending} className="bg-primary hover:bg-primary/90 text-primary-foreground"><CheckCircle className="w-4 h-4 mr-1" />Process WPS</Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
