import { useHRStore } from '@/store/hrStore';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

export function LeaveView() {
  const { leave } = useHRStore();

  return (
    <div className="space-y-6 animate-slide-up">
      <section className="glass-card rounded-3xl border border-border p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Leave Management</h1>
            <p className="text-xs text-muted-foreground mt-1">Annual, sick, and maternity leave</p>
          </div>
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full">
            <Plus className="w-4 h-4 mr-2" />
            Request Leave
          </Button>
        </div>

        <div className="space-y-3">
          {leave.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm text-muted-foreground">No leave records found.</p>
              <p className="text-xs text-muted-foreground mt-1">Create a leave request to get started.</p>
            </div>
          ) : (
            leave.map((record) => (
              <div 
                key={record.id} 
                className="glass-card rounded-2xl border border-border p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">
                      {record.employees?.full_name || 'Unknown'}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {record.leave_type} Leave - {record.days_count} days
                    </p>
                  </div>
                  <span className={cn(
                    "text-xs px-2 py-1 rounded-full",
                    record.status === 'Approved' 
                      ? 'bg-primary/20 text-primary' 
                      : record.status === 'Pending' 
                      ? 'bg-amber-500/20 text-amber-400' 
                      : 'bg-destructive/20 text-destructive'
                  )}>
                    {record.status}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {new Date(record.start_date).toLocaleDateString('en-GB')} - {new Date(record.end_date).toLocaleDateString('en-GB')}
                </p>
                {record.reason && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Reason: {record.reason}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
