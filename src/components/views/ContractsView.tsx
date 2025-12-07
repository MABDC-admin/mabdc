import { useHRStore } from '@/store/hrStore';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export function ContractsView() {
  const { contracts } = useHRStore();

  return (
    <div className="space-y-6 animate-slide-up">
      <section className="glass-card rounded-3xl border border-border p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Labour Contracts</h1>
            <p className="text-xs text-muted-foreground mt-1">MOHRE contract management</p>
          </div>
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full">
            <Plus className="w-4 h-4 mr-2" />
            New Contract
          </Button>
        </div>

        <div className="space-y-3">
          {contracts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No contracts found.</p>
          ) : (
            contracts.map((contract) => (
              <div 
                key={contract.id} 
                className="glass-card rounded-2xl border border-border p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">
                      {contract.employees?.full_name || 'Unknown Employee'}
                    </h3>
                    <p className="text-xs text-muted-foreground">{contract.contract_type} Contract</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    contract.status === 'Active' 
                      ? 'bg-primary/20 text-primary' 
                      : 'bg-secondary text-muted-foreground'
                  }`}>
                    {contract.status}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Basic Salary:</span>
                    <span className="text-foreground ml-1">AED {Number(contract.basic_salary).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Start Date:</span>
                    <span className="text-foreground ml-1">{new Date(contract.start_date).toLocaleDateString('en-GB')}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">MOHRE No:</span>
                    <span className="text-foreground ml-1">{contract.mohre_contract_no || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Location:</span>
                    <span className="text-foreground ml-1">{contract.work_location || 'N/A'}</span>
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
