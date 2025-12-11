import { useState, useMemo } from 'react';
import { useEmployees, useDeleteEmployee } from '@/hooks/useEmployees';
import { useLeave, useAllLeaveBalances, useLeaveTypes } from '@/hooks/useLeave';
import { useContracts } from '@/hooks/useContracts';
import { useHRStore } from '@/store/hrStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EmployeeProfileModal } from '@/components/modals/EmployeeProfileModal';
import { AddEmployeeModal } from '@/components/modals/AddEmployeeModal';
import { Search, Plus, Trash2, RefreshCw, Link2, Clock, LayoutGrid, List, FileWarning, FilePlus, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Employee } from '@/types/hr';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { differenceInDays, parseISO } from 'date-fns';
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export function EmployeesView() {
  const { data: employees = [], isLoading, refetch } = useEmployees();
  const { data: leaveRecords = [] } = useLeave();
  const { data: contracts = [] } = useContracts();
  const { data: allLeaveBalances = [] } = useAllLeaveBalances();
  const { data: leaveTypes = [] } = useLeaveTypes();

  // Find Annual Leave type ID
  const annualLeaveType = useMemo(() => {
    return leaveTypes.find(lt => lt.code === 'AL' || lt.name.toLowerCase().includes('annual'));
  }, [leaveTypes]);

  // Calculate Annual Leave balance only per employee from leave_balances table
  const employeeLeaveBalances = useMemo(() => {
    const balanceMap: Record<string, number> = {};
    if (!annualLeaveType) return balanceMap;
    
    allLeaveBalances
      .filter(balance => balance.leave_type_id === annualLeaveType.id)
      .forEach((balance) => {
        const available = (balance.entitled_days || 0) + (balance.carried_forward_days || 0) - (balance.used_days || 0) - (balance.pending_days || 0);
        balanceMap[balance.employee_id] = Math.max(0, available);
      });
    return balanceMap;
  }, [allLeaveBalances, annualLeaveType]);

  const getEmployeeLeaveBalance = (employeeId: string) => {
    return employeeLeaveBalances[employeeId] ?? 0;
  };

  const openWhatsApp = (phone: string, e: React.MouseEvent) => {
    e.stopPropagation();
    // Clean phone number and format for WhatsApp
    const cleanPhone = phone.replace(/\D/g, '');
    window.open(`https://wa.me/${cleanPhone}`, '_blank');
  };
  const deleteEmployee = useDeleteEmployee();
  const { setCurrentEmployee, setCurrentView } = useHRStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Get employees with pending leave requests
  const employeesWithPendingLeave = new Set(
    leaveRecords
      .filter(l => l.status === 'Pending')
      .map(l => l.employee_id)
  );

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

  // Check if employee has an expired or no active contract
  const getContractStatus = (employeeId: string) => {
    const employeeContracts = contracts.filter(c => c.employee_id === employeeId);
    
    if (employeeContracts.length === 0) {
      return { hasContract: false, isExpired: false, status: 'no-contract' as const };
    }
    
    // Find active or most recent contract
    const activeContract = employeeContracts.find(c => 
      c.status === 'Active' || c.status === 'Approved' || c.status === 'Draft'
    );
    
    if (!activeContract) {
      return { hasContract: true, isExpired: true, status: 'expired' as const };
    }
    
    // Check if contract is expired based on end_date
    if (activeContract.end_date) {
      const endDate = parseISO(activeContract.end_date);
      const daysUntilExpiry = differenceInDays(endDate, new Date());
      
      if (daysUntilExpiry < 0) {
        return { hasContract: true, isExpired: true, status: 'expired' as const };
      } else if (daysUntilExpiry <= 30) {
        return { hasContract: true, isExpired: false, status: 'expiring-soon' as const, daysLeft: daysUntilExpiry };
      }
    }
    
    return { hasContract: true, isExpired: false, status: 'active' as const };
  };

  const copyPortalLink = (employeeId: string) => {
    const link = `${window.location.origin}/employee/${employeeId}`;
    navigator.clipboard.writeText(link);
    toast.success('Portal link copied to clipboard!');
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
            <div className="flex border border-border rounded-lg overflow-hidden">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="rounded-none"
              >
                <LayoutGrid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="rounded-none"
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
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

        <ScrollArea className="h-[calc(100vh-280px)]">
          <div className={cn(
            viewMode === 'grid' 
              ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
              : "space-y-3"
          )}>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground col-span-full">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
              <p className="text-sm">Loading employees...</p>
            </div>
          ) : filteredEmployees.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground col-span-full">
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
          ) : viewMode === 'grid' ? (
            filteredEmployees.map((emp) => {
              const visaDays = getVisaDaysRemaining(emp);
              const hasPendingLeave = employeesWithPendingLeave.has(emp.id);
              const contractStatus = getContractStatus(emp.id);
              const isContractExpired = contractStatus.isExpired || !contractStatus.hasContract;
              
              return (
                <div 
                  key={emp.id} 
                  className={cn(
                    "rounded-2xl border p-4 transition-all hover:shadow-lg relative group cursor-pointer overflow-hidden",
                    isContractExpired 
                      ? "bg-muted/50 border-muted grayscale-[50%] opacity-80"
                      : hasPendingLeave 
                        ? "animate-pulse border-amber-500/50 bg-gradient-to-br from-amber-500/10 via-background to-orange-500/10"
                        : "bg-gradient-to-br from-primary/5 via-background to-accent/10 border-border hover:border-primary/30"
                  )}
                  onClick={() => openProfile(emp)}
                >
                  {/* Contract Expired Badge */}
                  {isContractExpired && (
                    <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-full bg-destructive/20 text-destructive text-[10px] font-medium z-10 animate-pulse">
                      <FileWarning className="w-3 h-3" />
                      {contractStatus.hasContract ? 'Contract Expired' : 'No Contract'}
                    </div>
                  )}
                  
                  {/* Contract Expiring Soon Badge */}
                  {contractStatus.status === 'expiring-soon' && (
                    <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 text-[10px] font-medium z-10">
                      <Clock className="w-3 h-3" />
                      Contract: {(contractStatus as any).daysLeft}d
                    </div>
                  )}
                  
                  {hasPendingLeave && !isContractExpired && contractStatus.status !== 'expiring-soon' && (
                    <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 text-[10px] font-medium z-10">
                      <Clock className="w-3 h-3" />
                      Pending
                    </div>
                  )}
                  
                  {/* Quick Actions - show on hover */}
                  <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 z-10">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant="secondary"
                          size="icon"
                          className="h-7 w-7"
                          onClick={(e) => { e.stopPropagation(); copyPortalLink(emp.id); }}
                        >
                          <Link2 className="w-3 h-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Copy portal link</TooltipContent>
                    </Tooltip>
                    <Button 
                      variant="secondary"
                      size="icon"
                      className="h-7 w-7 hover:bg-destructive/20 hover:text-destructive"
                      onClick={(e) => { e.stopPropagation(); setDeleteId(emp.id); }}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>

                  {/* Avatar */}
                  <div className="flex flex-col items-center text-center mb-4">
                    {emp.photo_url ? (
                      <img 
                        src={emp.photo_url} 
                        alt={emp.full_name}
                        className="w-20 h-20 rounded-2xl object-cover mb-3 ring-2 ring-border"
                      />
                    ) : (
                      <span className="w-20 h-20 rounded-2xl avatar-gradient flex items-center justify-center text-2xl font-bold text-primary-foreground mb-3 ring-2 ring-primary/20">
                        {getInitials(emp.full_name)}
                      </span>
                    )}
                    <h3 className="text-sm font-semibold text-foreground line-clamp-1">{emp.full_name}</h3>
                    <p className="text-xs text-muted-foreground">{emp.hrms_no}</p>
                  </div>

                  {/* Info */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-center gap-2 flex-wrap">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/30">
                        {emp.job_position}
                      </span>
                      <span className={cn(
                        "text-[10px] px-2 py-0.5 rounded-full",
                        emp.status === 'Active' 
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                          : emp.status === 'On Leave'
                          ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                          : "bg-destructive/10 text-destructive border border-destructive/30"
                      )}>
                        {emp.status || 'Active'}
                      </span>
                    </div>
                    
                    <div className="text-center">
                      <p className="text-[10px] text-muted-foreground">{emp.department}</p>
                    </div>

                    {visaDays && (
                      <div className="text-center">
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                          Visa: {visaDays}d remaining
                        </span>
                      </div>
                    )}

                    {/* Add Contract Button for expired/missing contracts */}
                    {isContractExpired && (
                      <div className="mt-2">
                        <Button 
                          size="sm"
                          variant="outline"
                          className="w-full border-primary/50 text-primary hover:bg-primary/10 text-xs"
                          onClick={(e) => { e.stopPropagation(); setCurrentView('contracts'); }}
                        >
                          <FilePlus className="w-3 h-3 mr-1" />
                          Add Contract
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Footer Stats */}
                  <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-border">
                    <div className="text-center">
                      <p className="text-[10px] uppercase text-muted-foreground">Joined</p>
                      <p className="text-xs text-foreground font-medium">
                        {new Date(emp.joining_date).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] uppercase text-muted-foreground">Birthday</p>
                      <p className="text-xs text-foreground font-medium">
                        {emp.birthday 
                          ? new Date(emp.birthday).toLocaleDateString('en-US', { month: 'short', day: '2-digit' })
                          : '—'}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] uppercase text-muted-foreground">Leave</p>
                      <p className="text-xs text-foreground font-medium">{getEmployeeLeaveBalance(emp.id)}d</p>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            // List View
            filteredEmployees.map((emp) => {
              const visaDays = getVisaDaysRemaining(emp);
              const hasPendingLeave = employeesWithPendingLeave.has(emp.id);
              const contractStatus = getContractStatus(emp.id);
              const isContractExpired = contractStatus.isExpired || !contractStatus.hasContract;
              
              return (
                <div 
                  key={emp.id} 
                  className={cn(
                    "rounded-2xl border p-4 transition-colors overflow-hidden",
                    isContractExpired 
                      ? "bg-muted/50 border-muted grayscale-[50%] opacity-80"
                      : hasPendingLeave 
                        ? "animate-pulse border-amber-500/50 bg-gradient-to-r from-amber-500/10 via-background to-orange-500/10"
                        : "bg-gradient-to-r from-primary/5 via-background to-accent/10 border-border hover:border-primary/30"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      {emp.photo_url ? (
                        <img 
                          src={emp.photo_url} 
                          alt={emp.full_name}
                          className="w-14 h-14 rounded-xl object-cover flex-shrink-0"
                        />
                      ) : (
                        <span className="w-14 h-14 rounded-xl avatar-gradient flex items-center justify-center text-lg font-bold text-primary-foreground flex-shrink-0">
                          {getInitials(emp.full_name)}
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <h3 className="text-base font-semibold text-foreground">{emp.full_name}</h3>
                        <p className="text-xs text-muted-foreground">{emp.hrms_no} • {emp.department}</p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary border border-primary/30">
                            {emp.job_position}
                          </span>
                          <span className={cn(
                            "text-xs px-2 py-1 rounded-full",
                            emp.status === 'Active' 
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                              : emp.status === 'On Leave'
                              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                              : "bg-destructive/10 text-destructive border border-destructive/30"
                          )}>
                            {emp.status || 'Active'}
                          </span>
                          {/* Contract Status Badges - inline with other badges */}
                          {isContractExpired && (
                            <span className="text-xs px-2 py-1 rounded-full bg-destructive/10 text-destructive border border-destructive/30 animate-pulse flex items-center gap-1">
                              <FileWarning className="w-3 h-3" />
                              {contractStatus.hasContract ? 'Contract Expired' : 'No Contract'}
                            </span>
                          )}
                          {contractStatus.status === 'expiring-soon' && (
                            <span className="text-xs px-2 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Contract: {(contractStatus as any).daysLeft}d left
                            </span>
                          )}
                          {hasPendingLeave && !isContractExpired && contractStatus.status !== 'expiring-soon' && (
                            <span className="text-xs px-2 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Pending Leave
                            </span>
                          )}
                          {visaDays && (
                            <span className="text-xs px-2 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                              Visa: {visaDays}d
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="ghost"
                            size="sm"
                            onClick={() => copyPortalLink(emp.id)}
                            className="text-muted-foreground hover:text-primary"
                          >
                            <Link2 className="w-4 h-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Copy employee portal link</TooltipContent>
                      </Tooltip>
                      {isContractExpired && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              size="sm"
                              variant="outline"
                              className="border-primary/50 text-primary hover:bg-primary/10"
                              onClick={() => setCurrentView('contracts')}
                            >
                              <FilePlus className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Add Contract</TooltipContent>
                        </Tooltip>
                      )}
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

                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4 pt-4 border-t border-border">
                    <div>
                      <p className="text-[10px] uppercase text-muted-foreground">Joining Date</p>
                      <p className="text-xs text-foreground">
                        {new Date(emp.joining_date).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase text-muted-foreground">Birthday</p>
                      <p className="text-xs text-foreground">
                        {emp.birthday 
                          ? new Date(emp.birthday).toLocaleDateString('en-US', { month: 'short', day: '2-digit' })
                          : '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase text-muted-foreground">Phone</p>
                      <p className="text-xs text-foreground flex items-center gap-1">
                        {emp.work_phone}
                        {emp.work_phone && (
                          <button 
                            onClick={(e) => openWhatsApp(emp.work_phone, e)}
                            className="text-emerald-500 hover:text-emerald-600 transition-colors"
                            title="Send WhatsApp message"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase text-muted-foreground">Nationality</p>
                      <p className="text-xs text-foreground">{emp.nationality || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase text-muted-foreground">Leave Balance</p>
                      <p className="text-xs text-foreground">{getEmployeeLeaveBalance(emp.id)} days</p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          </div>
        </ScrollArea>
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
