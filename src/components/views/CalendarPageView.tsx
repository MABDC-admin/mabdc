import { CalendarView } from '@/components/calendar/CalendarView';

export function CalendarPageView() {
  return (
    <div className="space-y-6 animate-slide-up">
      <section className="glass-card rounded-3xl border border-border p-4 sm:p-6">
        <div className="mb-4">
          <h1 className="text-xl font-semibold text-foreground">Company Calendar</h1>
          <p className="text-xs text-muted-foreground mt-1">Events, leaves, and public holidays</p>
        </div>
        <CalendarView />
      </section>
    </div>
  );
}
