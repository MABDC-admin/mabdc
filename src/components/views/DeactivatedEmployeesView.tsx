import { useState, useMemo } from 'react';
import { useDeactivatedEmployees, useReactivateEmployee } from '@/hooks/useDeactivatedEmployees';
import { useEOSRecords, useMarkEOSPaid } from '@/hooks/useEOSRecords';
import { useHRStore } from '@/store/hrStore';
import { EmployeeProfileModal } from '@/components/modals/EmployeeProfileModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Search, 
  RefreshCw, 
  UserCheck, 
  UserX, 
  Calendar, 
  Archive,
  LayoutGrid,
  List,
  FileText,
  RotateCcw,
  DollarSign,
  CheckCircle2,
  Clock,
  AlertCircle,
  Banknote
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import type { Employee } from '@/types/hr';

export function DeactivatedEmployeesView() {
  const { data: employees = [], isLoading, refetch } = useDeactivatedEmployees();
  const { data: eosRecords = [], isLoading: eosLoading, refetch: refetchEOS } = useEOSRecords();
  const reactivateEmployee = useReactivateEmployee();
  const markEOSPaid = useMarkEOSPaid();
  const { setCurrentEmployee } = useHRStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [reactivateId, setReactivateId] = useState<string | null>(null);
  const [paymentConfirmId, setPaymentConfirmId] = useState<string | null>(null);

  // Map EOS records by employee_id
  const eosMap = useMemo(() => {
    const map: Record<string, typeof eosRecords[0]> = {};
    eosRecords.forEach(eos => {
      map[eos.employee_id] = eos;
    });
    return map;
  }, [eosRecords]);

  // Get unique departments
  const departments = useMemo(() => {
    const depts = new Set(employees.map(e => e.department));
    return Array.from(depts).sort();
  }, [employees]);

  // Filter employees
  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      const matchesSearch = 
        emp.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.hrms_no.includes(searchQuery) ||
        emp.department.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || emp.status === statusFilter;
      const matchesDept = departmentFilter === 'all' || emp.department === departmentFilter;
      
      // Payment filter
      const eosRecord = eosMap[emp.id];
      let matchesPayment = true;
      if (paymentFilter === 'paid') {
        matchesPayment = eosRecord?.paid === true;
      } else if (paymentFilter === 'unpaid') {
        matchesPayment = eosRecord ? eosRecord.paid === false : true;
      } else if (paymentFilter === 'no-eos') {
        matchesPayment = !eosRecord;
      }
      
      return matchesSearch && matchesStatus && matchesDept && matchesPayment;
    });
  }, [employees, searchQuery, statusFilter, departmentFilter, paymentFilter, eosMap]);

  // Statistics with EOS data
  const stats = useMemo(() => {
    const deactivatedEOS = eosRecords.filter(eos => {
      const emp = employees.find(e => e.id === eos.employee_id);
      return emp && (emp.status === 'Resigned' || emp.status === 'Terminated');
    });
    
    const totalGratuity = deactivatedEOS.reduce((sum, eos) => sum + Number(eos.gratuity_amount || 0), 0);
    const paidAmount = deactivatedEOS.filter(eos => eos.paid).reduce((sum, eos) => sum + Number(eos.gratuity_amount || 0), 0);
    const unpaidAmount = totalGratuity - paidAmount;
    const unpaidCount = deactivatedEOS.filter(eos => !eos.paid).length;
    
    return {
      total: employees.length,
      resigned: employees.filter(e => e.status === 'Resigned').length,
      terminated: employees.filter(e => e.status === 'Terminated').length,
      totalGratuity,
      paidAmount,
      unpaidAmount,
      unpaidCount,
      paidCount: deactivatedEOS.filter(eos => eos.paid).length,
    };
  }, [employees, eosRecords]);

  const openProfile = (employee: Employee) => {
    setCurrentEmployee(employee);
    setIsProfileOpen(true);
  };

  const handleReactivate = () => {
    if (reactivateId) {
      reactivateEmployee.mutate(reactivateId);
      setReactivateId(null);
    }
  };

  const handleMarkPaid = () => {
    if (paymentConfirmId) {
      markEOSPaid.mutate({ eosId: paymentConfirmId, paid: true });
      setPaymentConfirmId(null);
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const handleRefresh = () => {
    refetch();
    refetchEOS();
  };

  return (
    <div className="space-y-6 animate-slide-up">
      <section className="glass-card rounded-3xl border border-border p-4 sm:p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-muted">
              <Archive className="w-6 h-6 text-muted-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground">Deactivated Employees</h1>
              <p className="text-xs text-muted-foreground mt-1">
                Archive of resigned and terminated employees with EOS tracking
              </p>
            </div>
          </div>
          <Button 
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="border-border"
          >
            <RefreshCw className={cn("w-4 h-4 mr-2", (isLoading || eosLoading) && "animate-spin")} />
            Refresh
          </Button>
        </div>

        {/* Statistics - Employee Counts */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="glass-card rounded-xl border border-border p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{stats.total}</p>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Archived</p>
          </div>
          <div className="glass-card rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-center">
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.resigned}</p>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Resigned</p>
          </div>
          <div className="glass-card rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-center">
            <p className="text-2xl font-bold text-destructive">{stats.terminated}</p>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Terminated</p>
          </div>
        </div>

        {/* EOS Financial Summary */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="glass-card rounded-xl border border-primary/30 bg-primary/5 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Banknote className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Total EOS Liability</span>
            </div>
            <p className="text-xl font-bold text-primary">AED {stats.totalGratuity.toLocaleString()}</p>
          </div>
          <div className="glass-card rounded-xl border border-green-500/30 bg-green-500/5 p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Paid ({stats.paidCount})</span>
            </div>
            <p className="text-xl font-bold text-green-600">AED {stats.paidAmount.toLocaleString()}</p>
          </div>
          <div className="glass-card rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-amber-600" />
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Unpaid ({stats.unpaidCount})</span>
            </div>
            <p className="text-xl font-bold text-amber-600">AED {stats.unpaidAmount.toLocaleString()}</p>
          </div>
          <div className="glass-card rounded-xl border border-border p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Settlement Rate</span>
            </div>
            <p className="text-xl font-bold text-foreground">
              {stats.totalGratuity > 0 
                ? Math.round((stats.paidAmount / stats.totalGratuity) * 100) 
                : 0}%
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, HRMS, or department..."
              className="pl-10 bg-secondary/50 border-border"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[140px] bg-secondary/50">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="Resigned">Resigned</SelectItem>
              <SelectItem value="Terminated">Terminated</SelectItem>
            </SelectContent>
          </Select>
          <Select value={paymentFilter} onValueChange={setPaymentFilter}>
            <SelectTrigger className="w-full sm:w-[140px] bg-secondary/50">
              <SelectValue placeholder="Payment" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Payments</SelectItem>
              <SelectItem value="unpaid">Unpaid EOS</SelectItem>
              <SelectItem value="paid">Paid EOS</SelectItem>
              <SelectItem value="no-eos">No EOS Record</SelectItem>
            </SelectContent>
          </Select>
          <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
            <SelectTrigger className="w-full sm:w-[160px] bg-secondary/50">
              <SelectValue placeholder="Department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departments.map(dept => (
                <SelectItem key={dept} value={dept}>{dept}</SelectItem>
              ))}
            </SelectContent>
          </Select>
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
        </div>

        {/* Employee List */}
        <ScrollArea className="h-[calc(100vh-580px)]">
          {isLoading || eosLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
              <p className="text-sm">Loading archived employees...</p>
            </div>
          ) : filteredEmployees.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Archive className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No deactivated employees found.</p>
              <p className="text-xs mt-1">Employees who resign or are terminated will appear here.</p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredEmployees.map((emp) => {
                const eosRecord = eosMap[emp.id];
                return (
                  <div 
                    key={emp.id}
                    className="glass-card rounded-2xl border border-border p-4 bg-muted/30 grayscale-[30%] hover:grayscale-0 transition-all cursor-pointer group"
                    onClick={() => openProfile(emp)}
                  >
                    {/* Status Badge */}
                    <div className="flex justify-between items-start mb-3">
                      <Badge 
                        variant={emp.status === 'Resigned' ? 'secondary' : 'destructive'}
                        className={cn(
                          "text-xs",
                          emp.status === 'Resigned' 
                            ? "bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30"
                            : "bg-destructive/20"
                        )}
                      >
                        {emp.status === 'Resigned' ? <UserCheck className="w-3 h-3 mr-1" /> : <UserX className="w-3 h-3 mr-1" />}
                        {emp.status}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => { e.stopPropagation(); setReactivateId(emp.id); }}
                      >
                        <RotateCcw className="w-4 h-4 text-primary" />
                      </Button>
                    </div>

                    {/* Avatar & Info */}
                    <div className="flex flex-col items-center text-center">
                      {emp.photo_url ? (
                        <img 
                          src={emp.photo_url} 
                          alt={emp.full_name}
                          className="w-16 h-16 rounded-2xl object-cover mb-3 ring-2 ring-border opacity-75"
                        />
                      ) : (
                        <span className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center text-xl font-bold text-muted-foreground mb-3">
                          {getInitials(emp.full_name)}
                        </span>
                      )}
                      <h3 className="text-sm font-semibold text-foreground line-clamp-1">{emp.full_name}</h3>
                      <p className="text-xs text-muted-foreground">{emp.hrms_no}</p>
                      <p className="text-xs text-muted-foreground mt-1">{emp.job_position}</p>
                    </div>

                    {/* EOS Info */}
                    {eosRecord && (
                      <div className="mt-4 pt-3 border-t border-border">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-muted-foreground">Gratuity</span>
                          <span className="text-sm font-bold text-primary">
                            AED {Number(eosRecord.gratuity_amount).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Status</span>
                          {eosRecord.paid ? (
                            <Badge className="bg-green-500/20 text-green-600 border-green-500/30 text-[10px]">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Paid
                            </Badge>
                          ) : (
                            <Badge className="bg-amber-500/20 text-amber-600 border-amber-500/30 text-[10px]">
                              <Clock className="w-3 h-3 mr-1" />
                              Unpaid
                            </Badge>
                          )}
                        </div>
                        {!eosRecord.paid && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full mt-3 text-xs border-green-500/50 text-green-600 hover:bg-green-500/10"
                            onClick={(e) => { e.stopPropagation(); setPaymentConfirmId(eosRecord.id); }}
                          >
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Mark as Paid
                          </Button>
                        )}
                      </div>
                    )}

                    {!eosRecord && (
                      <div className="mt-4 pt-3 border-t border-border">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <AlertCircle className="w-3 h-3" />
                          <span>No EOS record</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredEmployees.map((emp) => {
                const eosRecord = eosMap[emp.id];
                return (
                  <div 
                    key={emp.id}
                    className="glass-card rounded-xl border border-border p-4 bg-muted/30 flex items-center gap-4 hover:bg-muted/50 transition-colors cursor-pointer group"
                    onClick={() => openProfile(emp)}
                  >
                    {/* Avatar */}
                    {emp.photo_url ? (
                      <img 
                        src={emp.photo_url} 
                        alt={emp.full_name}
                        className="w-12 h-12 rounded-xl object-cover ring-2 ring-border opacity-75"
                      />
                    ) : (
                      <span className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center text-lg font-bold text-muted-foreground">
                        {getInitials(emp.full_name)}
                      </span>
                    )}

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-foreground truncate">{emp.full_name}</h3>
                        <Badge 
                          variant={emp.status === 'Resigned' ? 'secondary' : 'destructive'}
                          className={cn(
                            "text-[10px] h-5",
                            emp.status === 'Resigned' 
                              ? "bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30"
                              : "bg-destructive/20"
                          )}
                        >
                          {emp.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{emp.hrms_no} • {emp.job_position} • {emp.department}</p>
                    </div>

                    {/* EOS Amount */}
                    <div className="hidden sm:block text-right min-w-[120px]">
                      <p className="text-xs text-muted-foreground">Gratuity</p>
                      {eosRecord ? (
                        <p className="text-sm font-bold text-primary">
                          AED {Number(eosRecord.gratuity_amount).toLocaleString()}
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground">—</p>
                      )}
                    </div>

                    {/* Payment Status */}
                    <div className="hidden md:block min-w-[100px]">
                      {eosRecord ? (
                        eosRecord.paid ? (
                          <Tooltip>
                            <TooltipTrigger>
                              <Badge className="bg-green-500/20 text-green-600 border-green-500/30">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Paid
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>EOS gratuity has been paid</p>
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <Tooltip>
                            <TooltipTrigger>
                              <Badge className="bg-amber-500/20 text-amber-600 border-amber-500/30">
                                <Clock className="w-3 h-3 mr-1" />
                                Unpaid
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>EOS gratuity pending payment</p>
                            </TooltipContent>
                          </Tooltip>
                        )
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          No EOS
                        </Badge>
                      )}
                    </div>

                    {/* Last Working Day */}
                    <div className="hidden lg:block text-right min-w-[100px]">
                      <p className="text-xs text-muted-foreground">Last Day</p>
                      <p className="text-sm font-medium text-foreground">
                        {(emp as any).last_working_day 
                          ? format(parseISO((emp as any).last_working_day), 'MMM dd, yyyy')
                          : '—'}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {eosRecord && !eosRecord.paid && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="opacity-0 group-hover:opacity-100 transition-opacity border-green-500/50 text-green-600 hover:bg-green-500/10"
                          onClick={(e) => { e.stopPropagation(); setPaymentConfirmId(eosRecord.id); }}
                        >
                          <CheckCircle2 className="w-4 h-4 mr-1" />
                          Mark Paid
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="opacity-0 group-hover:opacity-100 transition-opacity border-primary/50 text-primary hover:bg-primary/10"
                        onClick={(e) => { e.stopPropagation(); setReactivateId(emp.id); }}
                      >
                        <RotateCcw className="w-4 h-4 mr-1" />
                        Reactivate
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </section>

      {/* Profile Modal */}
      <EmployeeProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />

      {/* Reactivate Confirmation Dialog */}
      <AlertDialog open={!!reactivateId} onOpenChange={() => setReactivateId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reactivate Employee</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to reactivate this employee? They will be moved back to the active employees list and their status will be set to "Active".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleReactivate} className="bg-primary hover:bg-primary/90">
              Reactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Mark as Paid Confirmation Dialog */}
      <AlertDialog open={!!paymentConfirmId} onOpenChange={() => setPaymentConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              Confirm EOS Payment
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to mark this End of Service gratuity as paid? This action indicates that the employee has received their final settlement.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleMarkPaid} 
              className="bg-green-600 hover:bg-green-700"
              disabled={markEOSPaid.isPending}
            >
              {markEOSPaid.isPending ? 'Processing...' : 'Confirm Payment'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
