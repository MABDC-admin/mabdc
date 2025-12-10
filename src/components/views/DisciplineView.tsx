import { AdminDisciplineSection } from '@/components/admin/AdminDisciplineSection';

export function DisciplineView() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Employee Discipline</h1>
        <p className="text-muted-foreground">Track misconduct, violations, and disciplinary actions</p>
      </div>
      <AdminDisciplineSection />
    </div>
  );
}
