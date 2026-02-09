import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEmployees } from '@/hooks/useEmployees';
import { useHRStore } from '@/store/hrStore';
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { Search } from 'lucide-react';
import type { Employee } from '@/types/hr';

interface UniversalSearchBarProps {
  onEmployeeSelect: (employee: Employee) => void;
}

export function UniversalSearchBar({ onEmployeeSelect }: UniversalSearchBarProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const { data: employees = [] } = useEmployees();

  // Fetch summary counts once and cache
  const { data: leaveCounts = {} } = useQuery({
    queryKey: ['employee-leave-summary'],
    queryFn: async () => {
      const { data } = await supabase
        .from('leave_records')
        .select('employee_id, status')
        .eq('status', 'Pending');
      const counts: Record<string, number> = {};
      data?.forEach(r => {
        counts[r.employee_id] = (counts[r.employee_id] || 0) + 1;
      });
      return counts;
    },
    staleTime: 60000,
  });

  const { data: appealCounts = {} } = useQuery({
    queryKey: ['employee-appeal-summary'],
    queryFn: async () => {
      const { data } = await supabase
        .from('attendance_appeals')
        .select('employee_id, status')
        .eq('status', 'Pending');
      const counts: Record<string, number> = {};
      data?.forEach(r => {
        counts[r.employee_id] = (counts[r.employee_id] || 0) + 1;
      });
      return counts;
    },
    staleTime: 60000,
  });

  const { data: todayAttendance = {} } = useQuery({
    queryKey: ['employee-today-attendance'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const { data } = await supabase
        .from('attendance')
        .select('employee_id, status, check_in')
        .eq('date', today);
      const map: Record<string, { status: string; check_in: string | null }> = {};
      data?.forEach(r => {
        map[r.employee_id] = { status: r.status || '', check_in: r.check_in };
      });
      return map;
    },
    staleTime: 30000,
  });

  // Ctrl+K / Cmd+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(prev => !prev);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return employees.slice(0, 10);
    const q = search.toLowerCase();
    return employees.filter(e =>
      e.full_name.toLowerCase().includes(q) ||
      e.hrms_no.toLowerCase().includes(q) ||
      e.department.toLowerCase().includes(q) ||
      e.job_position.toLowerCase().includes(q) ||
      e.work_email.toLowerCase().includes(q)
    ).slice(0, 15);
  }, [employees, search]);

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

  const handleSelect = useCallback((employee: Employee) => {
    onEmployeeSelect(employee);
    setOpen(false);
    setSearch('');
  }, [onEmployeeSelect]);

  return (
    <div className="relative mb-4">
      {/* Search trigger */}
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl border border-border bg-card/50 text-muted-foreground hover:bg-card hover:border-primary/30 transition-all"
      >
        <Search className="h-4 w-4" />
        <span className="flex-1 text-left text-sm">Search employees...</span>
        <kbd className="hidden sm:inline-flex items-center gap-1 rounded-md border border-border bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
          ⌘K
        </kbd>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-0 left-0 right-0 z-50">
          <div className="fixed inset-0" onClick={() => { setOpen(false); setSearch(''); }} />
          <Command className="relative rounded-xl border border-border bg-popover shadow-xl">
            <CommandInput
              placeholder="Search by name, HRMS#, department, position, email..."
              value={search}
              onValueChange={setSearch}
              autoFocus
            />
            <CommandList>
              <CommandEmpty>No employees found.</CommandEmpty>
              <CommandGroup heading="Employees">
                {filtered.map(emp => {
                  const pendingLeaves = leaveCounts[emp.id] || 0;
                  const pendingAppeals = appealCounts[emp.id] || 0;
                  const attendance = todayAttendance[emp.id];

                  return (
                    <CommandItem
                      key={emp.id}
                      value={`${emp.full_name} ${emp.hrms_no} ${emp.department}`}
                      onSelect={() => handleSelect(emp)}
                      className="flex items-center gap-3 py-3 px-3 cursor-pointer"
                    >
                      {/* Avatar */}
                      {emp.photo_url ? (
                        <img
                          src={emp.photo_url}
                          alt={emp.full_name}
                          className="w-9 h-9 rounded-lg object-cover shrink-0"
                        />
                      ) : (
                        <span className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                          {getInitials(emp.full_name)}
                        </span>
                      )}

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm text-foreground truncate">
                            {emp.full_name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            #{emp.hrms_no}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {emp.job_position} · {emp.department}
                        </div>
                      </div>

                      {/* Badges */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {attendance && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            {attendance.status === 'Present' ? '✓ In' : attendance.status}
                          </Badge>
                        )}
                        {pendingLeaves > 0 && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            {pendingLeaves} leave
                          </Badge>
                        )}
                        {pendingAppeals > 0 && (
                          <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                            {pendingAppeals} appeal
                          </Badge>
                        )}
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </div>
      )}
    </div>
  );
}
