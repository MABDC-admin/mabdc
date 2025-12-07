import { useHRStore } from '@/store/hrStore';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export function AttendanceView() {
  const { attendance } = useHRStore();

  return (
    <div className="space-y-6 animate-slide-up">
      <section className="glass-card rounded-3xl border border-border p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Attendance Tracking</h1>
            <p className="text-xs text-muted-foreground mt-1">Daily attendance records</p>
          </div>
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full">
            <Plus className="w-4 h-4 mr-2" />
            Mark Attendance
          </Button>
        </div>

        <div className="space-y-3">
          {attendance.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm text-muted-foreground">No attendance records found.</p>
              <p className="text-xs text-muted-foreground mt-1">Start marking attendance to see records here.</p>
            </div>
          ) : (
            attendance.map((att) => (
              <div 
                key={att.id} 
                className="glass-card rounded-2xl border border-border p-3 flex items-center justify-between"
              >
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {att.employees?.full_name || 'Unknown'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(att.date).toLocaleDateString('en-GB')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-foreground">
                    {att.check_in || 'N/A'} - {att.check_out || 'N/A'}
                  </p>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    att.status === 'Present' 
                      ? 'bg-primary/20 text-primary' 
                      : att.status === 'Absent' 
                      ? 'bg-destructive/20 text-destructive' 
                      : 'bg-secondary text-muted-foreground'
                  }`}>
                    {att.status}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
