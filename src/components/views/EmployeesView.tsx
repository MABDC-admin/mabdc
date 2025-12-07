import { useState } from 'react';
import { useEmployees, useDeleteEmployee } from '@/hooks/useEmployees';
import { useHRStore } from '@/store/hrStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EmployeeProfileModal } from '@/components/modals/EmployeeProfileModal';
import { AddEmployeeModal } from '@/components/modals/AddEmployeeModal';
import { Search, Plus, Trash2, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Employee } from '@/types/hr';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export function EmployeesView() {
  const { data: employees = [], isLoading, refetch } = useEmployees();
  const deleteEmployee = useDeleteEmployee();
  const { setCurrentEmployee } = useHRStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filteredEmployees = employees.filter(emp =>
    emp.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.hrms_no.includes(searchQuery) ||
    emp.job_position.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const openProfile = (employee: Employee) => {
    setCurrentEmployee(employee);
    setIsProfileOpen(true);
  };

  const handleDelete = () => {
    if (deleteId) {
      deleteEmployee.mutate(deleteId);
      setDeleteId(null);
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const getVisaDaysRemaining = (employee: Employee) => {
    if (!employee.visa_expiration) return null;
    const days = Math.ceil((new Date(employee.visa_expiration).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return days > 0 && days <= 60 ? days : null;
  };

  return (
    <div className="space-y-6 animate-slide-up">
      <section className="glass-card rounded-3xl border border-border p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Employee Management</h1>
            <p className="text-xs text-muted-foreground mt-1">{employees.length} employees in system</p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="border-border"
            >
              <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
            </Button>
            <Button 
              onClick={() => setIsAddOpen(true)}
              className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Employee
            </Button>
          </div>
        </div>

        <div className="mb-4 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search employees..."
            className="pl-10 bg-secondary/50 border-border"
          />
        </div>

        <div className="space-y-3">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
              <p className="text-sm">Loading employees...</p>
            </div>
          ) : filteredEmployees.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">No employees found.</p>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-3"
                onClick={() => setIsAddOpen(true)}
              >
                Add your first employee
              </Button>
            </div>
          ) : (
            filteredEmployees.map((emp) => {
              const visaDays = getVisaDaysRemaining(emp);
              return (
                <div 
                  key={emp.id} 
                  className="glass-card rounded-2xl border border-border p-4 hover:border-muted-foreground/30 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <span className="w-14 h-14 rounded-xl avatar-gradient flex items-center justify-center text-lg font-bold text-primary-foreground">
                        {getInitials(emp.full_name)}
                      </span>
                      <div>
                        <h3 className="text-base font-semibold text-foreground">{emp.full_name}</h3>
                        <p className="text-xs text-muted-foreground">{emp.hrms_no} • {emp.department}</p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary border border-primary/30">
                            {emp.job_position}
                          </span>
                          <span className={cn(
                            "text-xs px-2 py-1 rounded-full",
                            emp.status === 'Active' 
                              ? "bg-primary/10 text-primary border border-primary/30"
                              : emp.status === 'On Leave'
                              ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                              : "bg-destructive/10 text-destructive border border-destructive/30"
                          )}>
                            {emp.status || 'Active'}
                          </span>
                          {visaDays && (
                            <span className="text-xs px-2 py-1 rounded-full bg-amber-500/10 text-amber-200 border border-amber-500/30">
                              Visa: {visaDays}d
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        onClick={() => openProfile(emp)}
                        className="bg-accent hover:bg-accent/90 text-accent-foreground rounded-full text-xs"
                        size="sm"
                      >
                        View Profile
                      </Button>
                      <Button 
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteId(emp.id)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 pt-4 border-t border-border">
                    <div>
                      <p className="text-[10px] uppercase text-muted-foreground">Joining Date</p>
                      <p className="text-xs text-foreground">
                        {new Date(emp.joining_date).toLocaleDateString('en-GB')}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase text-muted-foreground">Phone</p>
                      <p className="text-xs text-foreground">{emp.work_phone}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase text-muted-foreground">Nationality</p>
                      <p className="text-xs text-foreground">{emp.nationality || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase text-muted-foreground">Leave Balance</p>
                      <p className="text-xs text-foreground">{emp.leave_balance || 0} days</p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      <EmployeeProfileModal 
        isOpen={isProfileOpen} 
        onClose={() => setIsProfileOpen(false)} 
      />
      <AddEmployeeModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="glass-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Employee</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this employee? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
