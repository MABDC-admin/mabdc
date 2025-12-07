import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  Clock, 
  CalendarDays, 
  DollarSign, 
  Calculator,
  Menu,
  X,
  Settings,
  Calendar
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useHRStore } from '@/store/hrStore';
import type { ViewType } from '@/types/hr';
import { useState } from 'react';

const navItems: { id: ViewType; label: string; icon: React.ReactNode }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
  { id: 'employees', label: 'Employees', icon: <Users className="w-5 h-5" /> },
  { id: 'contracts', label: 'Contracts', icon: <FileText className="w-5 h-5" /> },
  { id: 'attendance', label: 'Attendance', icon: <Clock className="w-5 h-5" /> },
  { id: 'leave', label: 'Leave', icon: <CalendarDays className="w-5 h-5" /> },
  { id: 'payroll', label: 'Payroll & WPS', icon: <DollarSign className="w-5 h-5" /> },
  { id: 'eos', label: 'EOS Calculator', icon: <Calculator className="w-5 h-5" /> },
  { id: 'calendar', label: 'Calendar', icon: <Calendar className="w-5 h-5" /> },
  { id: 'settings', label: 'Settings', icon: <Settings className="w-5 h-5" /> },
];

export function Sidebar() {
  const { currentView, setCurrentView } = useHRStore();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-card border border-border"
      >
        {isMobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Mobile overlay */}
      {isMobileOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed lg:static inset-y-0 left-0 z-40 w-64 glass-card border-r border-border p-4 transition-transform duration-300",
        isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        <div className="flex items-center gap-3 px-4 py-4 mb-6">
          <div className="w-10 h-10 rounded-xl uae-gradient flex items-center justify-center">
            <span className="text-lg font-bold text-primary-foreground">M</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">MABDC</h1>
            <p className="text-xs text-muted-foreground">HR Management</p>
          </div>
        </div>

        <nav className="space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setCurrentView(item.id);
                setIsMobileOpen(false);
              }}
              className={cn(
                "nav-item w-full text-left text-muted-foreground",
                currentView === item.id && "active text-primary"
              )}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="absolute bottom-4 left-4 right-4">
          <div className="glass-card rounded-xl border border-border p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-xs text-muted-foreground">System Status</span>
            </div>
            <p className="text-sm font-medium text-foreground">Connected</p>
            <p className="text-xs text-muted-foreground mt-1">Demo Mode Active</p>
          </div>
        </div>
      </aside>
    </>
  );
}
