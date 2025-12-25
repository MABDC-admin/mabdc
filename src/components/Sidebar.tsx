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
  Calendar,
  QrCode,
  Star,
  Scale,
  Network,
  LogOut,
  FolderOpen,
  ChevronDown,
  ChevronRight,
  UserCheck,
  AlertCircle,
  Timer,
  Eye,
  Gamepad2,
  Trophy
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useHRStore } from '@/store/hrStore';
import type { ViewType } from '@/types/hr';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ThemeSelector } from './ThemeSelector';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/useAuth';
import { useAttendanceAppeals } from '@/hooks/useAttendanceAppeals';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

interface NavItem {
  id: ViewType;
  label: string;
  icon: React.ReactNode;
  subItems?: { id: ViewType; label: string; icon: React.ReactNode; badge?: number }[];
}

const navItems: NavItem[] = [
  { 
    id: 'dashboard', 
    label: 'Dashboard', 
    icon: <LayoutDashboard className="w-5 h-5" />,
    subItems: [
      { id: 'dashboard', label: 'Overview', icon: <LayoutDashboard className="w-4 h-4" /> },
      { id: 'gamification', label: 'Gamification', icon: <Gamepad2 className="w-4 h-4" /> }
    ]
  },
  { 
    id: 'employees', 
    label: 'Employees', 
    icon: <Users className="w-5 h-5" />,
    subItems: [
      { id: 'employees', label: 'All Employees', icon: <Users className="w-4 h-4" /> },
      { id: 'time-shift', label: 'Time Shift', icon: <Timer className="w-4 h-4" /> },
      { id: 'time-clock', label: 'Time Clock', icon: <Clock className="w-4 h-4" /> },
      { id: 'e-portal', label: 'E-Portal', icon: <Eye className="w-4 h-4" /> }
    ]
  },
  { 
    id: 'contracts', 
    label: 'Contracts', 
    icon: <FileText className="w-5 h-5" />,
    subItems: [
      { id: 'contracts', label: 'All Contracts', icon: <FileText className="w-4 h-4" /> },
      { id: 'renewal', label: 'Renewal', icon: <Clock className="w-4 h-4" /> }
    ]
  },
  { 
    id: 'attendance', 
    label: 'Attendance', 
    icon: <Clock className="w-5 h-5" />,
    subItems: [
      { id: 'employee-attendance', label: 'Employee Attendance', icon: <UserCheck className="w-4 h-4" /> },
      { id: 'attendance-appeals', label: 'Appeals', icon: <AlertCircle className="w-4 h-4" /> }
    ]
  },
  { id: 'leave', label: 'Leave', icon: <CalendarDays className="w-5 h-5" /> },
  { id: 'payroll', label: 'Payroll & WPS', icon: <DollarSign className="w-5 h-5" /> },
  { id: 'eos', label: 'EOS Calculator', icon: <Calculator className="w-5 h-5" /> },
  { id: 'calendar', label: 'Calendar', icon: <Calendar className="w-5 h-5" /> },
  { id: 'performance', label: 'Performance', icon: <Star className="w-5 h-5" /> },
  { id: 'discipline', label: 'Discipline', icon: <Scale className="w-5 h-5" /> },
  { id: 'orgchart', label: 'Hierarchy', icon: <Network className="w-5 h-5" /> },
  { id: 'company-docs', label: 'Company Docs', icon: <FolderOpen className="w-5 h-5" /> },
  { id: 'reports', label: 'Reports', icon: <FileText className="w-5 h-5" /> },
  { id: 'settings', label: 'Settings', icon: <Settings className="w-5 h-5" /> },
];

export function Sidebar() {
  const { currentView, setCurrentView } = useHRStore();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<string[]>(['attendance', 'employees', 'dashboard', 'contracts']);
  const { signOut, user } = useAuth();
  const { data: appeals = [] } = useAttendanceAppeals();
  const navigate = useNavigate();
  
  // Get pending appeals count
  const pendingAppealsCount = appeals.filter(a => a.status === 'Pending').length;
  
  // Initialize theme on mount
  useTheme();

  const handleLogout = async () => {
    const { error } = await signOut();
    if (error) {
      toast.error('Failed to sign out');
    } else {
      toast.success('Signed out successfully');
      navigate('/auth?portal=hr');
    }
  };

  const toggleExpanded = (id: string) => {
    setExpandedMenus(prev => 
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  const isSubItemActive = (item: NavItem) => {
    return item.subItems?.some(sub => sub.id === currentView);
  };

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
        <div className="flex items-center justify-between px-4 py-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl uae-gradient flex items-center justify-center">
              <span className="text-lg font-bold text-primary-foreground">M</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">MABDC</h1>
              <p className="text-xs text-muted-foreground">HR Management</p>
            </div>
          </div>
          <ThemeSelector />
        </div>

        <nav className="space-y-1">
          {navItems.map((item) => (
            <div key={item.id}>
              {item.subItems ? (
                <>
                  {/* Parent menu with submenu */}
                  <button
                    onClick={() => {
                      setCurrentView(item.id);
                      toggleExpanded(item.id);
                      setIsMobileOpen(false);
                    }}
                    className={cn(
                      "nav-item w-full text-left text-muted-foreground flex items-center justify-between",
                      (currentView === item.id || isSubItemActive(item)) && "active text-primary"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      {item.icon}
                      <span>{item.label}</span>
                    </div>
                    {expandedMenus.includes(item.id) ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>
                  
                  {/* Submenu items */}
                  {expandedMenus.includes(item.id) && (
                    <div className="ml-4 pl-4 border-l border-border space-y-1 mt-1">
                      {item.subItems.map((subItem) => {
                        const badgeCount = subItem.id === 'attendance-appeals' ? pendingAppealsCount : 0;
                        return (
                          <button
                            key={subItem.id}
                            onClick={() => {
                              setCurrentView(subItem.id);
                              setIsMobileOpen(false);
                            }}
                            className={cn(
                              "nav-item w-full text-left text-muted-foreground text-sm py-2 flex items-center justify-between",
                              currentView === subItem.id && "active text-primary"
                            )}
                          >
                            <div className="flex items-center gap-2">
                              {subItem.icon}
                              <span>{subItem.label}</span>
                            </div>
                            {badgeCount > 0 && (
                              <Badge variant="destructive" className="animate-pulse text-[10px] px-1.5 py-0 h-5">
                                {badgeCount}
                              </Badge>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </>
              ) : (
                <button
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
              )}
            </div>
          ))}
          
          {/* Attendance Scanner Link */}
          <Link
            to="/attendance-scanner"
            className="nav-item w-full text-left text-muted-foreground flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-secondary transition-colors"
          >
            <QrCode className="w-5 h-5" />
            <span>QR Scanner</span>
          </Link>
        </nav>

        <div className="absolute bottom-4 left-4 right-4 space-y-3">
          {user && (
            <div className="glass-card rounded-xl border border-border p-3">
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              <button
                onClick={handleLogout}
                className="mt-2 w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors text-sm font-medium"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          )}
          <div className="glass-card rounded-xl border border-border p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-xs text-muted-foreground">System Status</span>
            </div>
            <p className="text-sm font-medium text-foreground">Connected</p>
          </div>
        </div>
      </aside>
    </>
  );
}
