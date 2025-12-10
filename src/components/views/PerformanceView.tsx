import { AdminPerformanceSection } from '@/components/admin/AdminPerformanceSection';

export function PerformanceView() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Employee Performance</h1>
        <p className="text-muted-foreground">Manage performance reviews and corrective actions</p>
      </div>
      <AdminPerformanceSection />
    </div>
  );
}
