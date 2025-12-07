import { useHRStore } from '@/store/hrStore';
import { Button } from '@/components/ui/button';
import { Plus, Download } from 'lucide-react';

export function PayrollView() {
  const { payroll } = useHRStore();

  return (
    <div className="space-y-6 animate-slide-up">
      <section className="glass-card rounded-3xl border border-border p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Payroll & WPS</h1>
            <p className="text-xs text-muted-foreground mt-1">Salary processing and WPS generation</p>
          </div>
          <div className="flex gap-2">
            <Button className="bg-amber-600 hover:bg-amber-700 text-foreground rounded-full">
              <Download className="w-4 h-4 mr-2" />
              Generate WPS
            </Button>
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full">
              <Plus className="w-4 h-4 mr-2" />
              Process Payroll
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          {payroll.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm text-muted-foreground">No payroll records found.</p>
              <p className="text-xs text-muted-foreground mt-1">Process payroll to see records here.</p>
            </div>
          ) : (
            payroll.map((pay) => (
              <div 
                key={pay.id} 
                className="glass-card rounded-2xl border border-border p-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">
                      {pay.employees?.full_name || 'Unknown'}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {pay.month} | HRMS: {pay.employees?.hrms_no || 'N/A'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-primary">
                      AED {Number(pay.net_salary).toLocaleString()}
                    </p>
                    {pay.wps_processed ? (
                      <span className="text-xs text-primary">✓ WPS Processed</span>
                    ) : (
                      <span className="text-xs text-amber-400">Pending</span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
