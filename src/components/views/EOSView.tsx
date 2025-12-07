import { useHRStore } from '@/store/hrStore';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export function EOSView() {
  const { eos } = useHRStore();

  return (
    <div className="space-y-6 animate-slide-up">
      <section className="glass-card rounded-3xl border border-border p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-semibold text-foreground">End of Service Calculator</h1>
            <p className="text-xs text-muted-foreground mt-1">Gratuity calculations per UAE Labour Law</p>
          </div>
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full">
            <Plus className="w-4 h-4 mr-2" />
            Calculate EOS
          </Button>
        </div>

        <div className="glass-card rounded-2xl border border-border p-4 mb-4">
          <h3 className="text-sm font-semibold text-foreground mb-2">UAE Gratuity Calculation Rules</h3>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• First 5 years: 21 days per year of basic salary.</li>
            <li>• After 5 years: 30 days per year (if applicable).</li>
            <li>• Exact entitlement depends on termination reason and UAE labour law.</li>
          </ul>
        </div>

        <div className="space-y-3">
          {eos.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm text-muted-foreground">No EOS records found.</p>
              <p className="text-xs text-muted-foreground mt-1">Calculate end of service gratuity for employees.</p>
            </div>
          ) : (
            eos.map((record) => (
              <div 
                key={record.id} 
                className="glass-card rounded-2xl border border-border p-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">
                      {record.employees?.full_name || 'Unknown'}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {record.years_of_service} years • {record.reason || 'Resignation'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-primary">
                      AED {Number(record.gratuity_amount).toLocaleString()}
                    </p>
                    {record.paid ? (
                      <span className="text-xs text-primary">✓ Paid</span>
                    ) : (
                      <span className="text-xs text-amber-400">Unpaid</span>
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
