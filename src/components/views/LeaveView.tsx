import { useLeave, useUpdateLeaveStatus } from '@/hooks/useLeave';
import { Button } from '@/components/ui/button';
import { Check, X, Clock, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

export function LeaveView() {
  const { data: leave = [], isLoading, refetch } = useLeave();
  const updateStatus = useUpdateLeaveStatus();

  const handleApprove = (id: string) => {
    updateStatus.mutate({ id, status: 'Approved' });
  };

  const handleReject = (id: string) => {
    updateStatus.mutate({ id, status: 'Rejected' });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Approved': return 'bg-primary/10 text-primary border-primary/30';
      case 'Rejected': return 'bg-destructive/10 text-destructive border-destructive/30';
      default: return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
    }
  };

  return (
    <div className="space-y-6 animate-slide-up">
      <section className="glass-card rounded-3xl border border-border p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Leave Management</h1>
            <p className="text-xs text-muted-foreground mt-1">Manage employee leave requests</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="border-border">
            <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
          </Button>
        </div>
        <div className="space-y-3">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
              <p className="text-sm">Loading...</p>
            </div>
          ) : leave.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No leave requests found</p>
              <p className="text-xs mt-1">Leave requests will appear here when employees submit them</p>
            </div>
          ) : (
            leave.map((record) => (
              <div key={record.id} className="glass-card rounded-2xl border border-border p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-base font-semibold text-foreground">{record.employees?.full_name || 'Unknown'}</h3>
                      <span className={cn("text-xs px-2 py-1 rounded-full border", getStatusColor(record.status))}>{record.status}</span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div><p className="text-[10px] uppercase text-muted-foreground">Type</p><p className="text-xs text-foreground">{record.leave_type}</p></div>
                      <div><p className="text-[10px] uppercase text-muted-foreground">Start</p><p className="text-xs text-foreground">{new Date(record.start_date).toLocaleDateString('en-GB')}</p></div>
                      <div><p className="text-[10px] uppercase text-muted-foreground">End</p><p className="text-xs text-foreground">{new Date(record.end_date).toLocaleDateString('en-GB')}</p></div>
                      <div><p className="text-[10px] uppercase text-muted-foreground">Days</p><p className="text-xs text-foreground">{record.days_count}</p></div>
                    </div>
                    {record.reason && (
                      <p className="text-xs text-muted-foreground mt-2">Reason: {record.reason}</p>
                    )}
                  </div>
                  {record.status === 'Pending' && (
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleApprove(record.id)} disabled={updateStatus.isPending} className="bg-primary hover:bg-primary/90 text-primary-foreground"><Check className="w-4 h-4 mr-1" />Approve</Button>
                      <Button size="sm" variant="outline" onClick={() => handleReject(record.id)} disabled={updateStatus.isPending} className="border-destructive text-destructive hover:bg-destructive/10"><X className="w-4 h-4 mr-1" />Reject</Button>
                    </div>
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
