import { useContracts, useUpdateContractStatus } from '@/hooks/useContracts';
import { Button } from '@/components/ui/button';
import { FileText, RefreshCw, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ContractsView() {
  const { data: contracts = [], isLoading, refetch } = useContracts();
  const updateStatus = useUpdateContractStatus();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-primary/10 text-primary border-primary/30';
      case 'Approved': return 'bg-accent/10 text-accent border-accent/30';
      case 'Expired': case 'Terminated': return 'bg-destructive/10 text-destructive border-destructive/30';
      default: return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
    }
  };

  return (
    <div className="space-y-6 animate-slide-up">
      <section className="glass-card rounded-3xl border border-border p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Contract Management</h1>
            <p className="text-xs text-muted-foreground mt-1">MOHRE registered contracts</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="border-border">
            <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
          </Button>
        </div>
        <div className="space-y-3">
          {isLoading ? (
            <div className="text-center py-8"><RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-muted-foreground" /><p className="text-sm text-muted-foreground">Loading...</p></div>
          ) : contracts.length === 0 ? (
            <div className="text-center py-8"><FileText className="w-8 h-8 mx-auto mb-2 opacity-50 text-muted-foreground" /><p className="text-sm text-muted-foreground">No contracts found</p><p className="text-xs text-muted-foreground mt-1">Contracts will appear here when added</p></div>
          ) : (
            contracts.map((contract) => (
              <div key={contract.id} className="glass-card rounded-2xl border border-border p-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-base font-semibold text-foreground">{contract.employees?.full_name || 'Unknown'}</h3>
                      <span className={cn("text-xs px-2 py-1 rounded-full border", getStatusColor(contract.status))}>{contract.status}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">Contract: {contract.mohre_contract_no}</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div><p className="text-[10px] uppercase text-muted-foreground">Type</p><p className="text-xs text-foreground">{contract.contract_type}</p></div>
                      <div><p className="text-[10px] uppercase text-muted-foreground">Start</p><p className="text-xs text-foreground">{new Date(contract.start_date).toLocaleDateString('en-GB')}</p></div>
                      <div><p className="text-[10px] uppercase text-muted-foreground">Basic</p><p className="text-xs text-foreground">AED {contract.basic_salary?.toLocaleString()}</p></div>
                      <div><p className="text-[10px] uppercase text-muted-foreground">Total</p><p className="text-xs text-foreground">AED {contract.total_salary?.toLocaleString() || 'N/A'}</p></div>
                    </div>
                  </div>
                  {(contract.status === 'Draft' || contract.status === 'Approved') && (
                    <Button size="sm" onClick={() => updateStatus.mutate({ id: contract.id, status: 'Active' })} disabled={updateStatus.isPending} className="bg-primary hover:bg-primary/90 text-primary-foreground"><CheckCircle className="w-4 h-4 mr-1" />Activate</Button>
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
