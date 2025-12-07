import { useState } from 'react';
import { useContracts, useUpdateContractStatus, useAddContract, useRenewContract, useCheckContractExpiry } from '@/hooks/useContracts';
import { useEmployees } from '@/hooks/useEmployees';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { FileText, RefreshCw, CheckCircle, Plus, AlertTriangle, Clock, XCircle, RotateCcw, Bell, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { differenceInDays, parseISO, format, addYears } from 'date-fns';

export function ContractsView() {
  const { data: contracts = [], isLoading, refetch } = useContracts();
  const { data: employees = [] } = useEmployees();
  const updateStatus = useUpdateContractStatus();
  const addContract = useAddContract();
  const renewContract = useRenewContract();
  const checkExpiry = useCheckContractExpiry();
  const [isOpen, setIsOpen] = useState(false);
  const [isRenewOpen, setIsRenewOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState<typeof contracts[0] | null>(null);
  const [filter, setFilter] = useState<string>('all');

  const [formData, setFormData] = useState({
    employee_id: '',
    mohre_contract_no: '',
    contract_type: 'Unlimited' as const,
    start_date: '',
    end_date: '',
    basic_salary: '',
    housing_allowance: '',
    transportation_allowance: '',
    total_salary: '',
    work_location: 'Abu Dhabi',
    job_title_arabic: '',
    working_hours: '48',
    notice_period: '30',
    annual_leave_days: '30',
    probation_period: '6',
  });

  const [renewFormData, setRenewFormData] = useState({
    mohre_contract_no: '',
    start_date: '',
    end_date: '',
    basic_salary: '',
    housing_allowance: '',
    transportation_allowance: '',
    total_salary: '',
  });

  const getContractExpiryStatus = (contract: typeof contracts[0]) => {
    if (contract.status === 'Expired') {
      return { status: 'expired', label: 'Expired', icon: XCircle, color: 'bg-destructive/10 text-destructive border-destructive/30' };
    }
    
    if (contract.status === 'Terminated') {
      return { status: 'terminated', label: 'Terminated', icon: XCircle, color: 'bg-muted/50 text-muted-foreground border-border' };
    }

    if (contract.contract_type === 'Unlimited') {
      return { status: 'active', label: 'Active', icon: CheckCircle, color: 'bg-primary/10 text-primary border-primary/30' };
    }
    
    if (!contract.end_date) {
      return { status: 'active', label: 'Active', icon: CheckCircle, color: 'bg-primary/10 text-primary border-primary/30' };
    }

    const endDate = parseISO(contract.end_date);
    const today = new Date();
    const daysUntilExpiry = differenceInDays(endDate, today);

    if (daysUntilExpiry < 0) {
      return { status: 'expired', label: 'Expired', icon: XCircle, color: 'bg-destructive/10 text-destructive border-destructive/30' };
    } else if (daysUntilExpiry <= 30) {
      return { status: 'expiring', label: `Expires in ${daysUntilExpiry} days`, icon: AlertTriangle, color: 'bg-amber-500/10 text-amber-400 border-amber-500/30' };
    } else if (daysUntilExpiry <= 90) {
      return { status: 'nearing', label: `${daysUntilExpiry} days left`, icon: Clock, color: 'bg-accent/10 text-accent border-accent/30' };
    }
    return { status: 'active', label: 'Active', icon: CheckCircle, color: 'bg-primary/10 text-primary border-primary/30' };
  };

  const filteredContracts = contracts.filter(contract => {
    if (filter === 'all') return true;
    const expiryStatus = getContractExpiryStatus(contract);
    return expiryStatus.status === filter;
  });

  const statusCounts = {
    all: contracts.length,
    active: contracts.filter(c => getContractExpiryStatus(c).status === 'active').length,
    nearing: contracts.filter(c => getContractExpiryStatus(c).status === 'nearing').length,
    expiring: contracts.filter(c => getContractExpiryStatus(c).status === 'expiring').length,
    expired: contracts.filter(c => getContractExpiryStatus(c).status === 'expired').length,
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addContract.mutate({
      employee_id: formData.employee_id,
      mohre_contract_no: formData.mohre_contract_no,
      contract_type: formData.contract_type,
      start_date: formData.start_date,
      end_date: formData.end_date || undefined,
      basic_salary: parseFloat(formData.basic_salary),
      housing_allowance: formData.housing_allowance ? parseFloat(formData.housing_allowance) : 0,
      transportation_allowance: formData.transportation_allowance ? parseFloat(formData.transportation_allowance) : 0,
      total_salary: formData.total_salary ? parseFloat(formData.total_salary) : undefined,
      work_location: formData.work_location,
      job_title_arabic: formData.job_title_arabic,
      working_hours: parseInt(formData.working_hours),
      notice_period: parseInt(formData.notice_period),
      annual_leave_days: parseInt(formData.annual_leave_days),
      probation_period: parseInt(formData.probation_period),
      status: 'Draft',
    } as any);
    setIsOpen(false);
    resetFormData();
  };

  const resetFormData = () => {
    setFormData({
      employee_id: '',
      mohre_contract_no: '',
      contract_type: 'Unlimited',
      start_date: '',
      end_date: '',
      basic_salary: '',
      housing_allowance: '',
      transportation_allowance: '',
      total_salary: '',
      work_location: 'Abu Dhabi',
      job_title_arabic: '',
      working_hours: '48',
      notice_period: '30',
      annual_leave_days: '30',
      probation_period: '6',
    });
  };

  const handleOpenRenewal = (contract: typeof contracts[0]) => {
    setSelectedContract(contract);
    const newStartDate = contract.end_date ? format(parseISO(contract.end_date), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');
    const newEndDate = contract.end_date ? format(addYears(parseISO(contract.end_date), 2), 'yyyy-MM-dd') : format(addYears(new Date(), 2), 'yyyy-MM-dd');
    
    setRenewFormData({
      mohre_contract_no: '',
      start_date: newStartDate,
      end_date: newEndDate,
      basic_salary: contract.basic_salary?.toString() || '',
      housing_allowance: (contract as any).housing_allowance?.toString() || '',
      transportation_allowance: (contract as any).transportation_allowance?.toString() || '',
      total_salary: contract.total_salary?.toString() || '',
    });
    setIsRenewOpen(true);
  };

  const handleRenewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContract) return;

    renewContract.mutate({
      oldContractId: selectedContract.id,
      newContract: {
        employee_id: selectedContract.employee_id,
        mohre_contract_no: renewFormData.mohre_contract_no,
        contract_type: selectedContract.contract_type,
        start_date: renewFormData.start_date,
        end_date: renewFormData.end_date || undefined,
        basic_salary: parseFloat(renewFormData.basic_salary),
        housing_allowance: renewFormData.housing_allowance ? parseFloat(renewFormData.housing_allowance) : 0,
        transportation_allowance: renewFormData.transportation_allowance ? parseFloat(renewFormData.transportation_allowance) : 0,
        total_salary: renewFormData.total_salary ? parseFloat(renewFormData.total_salary) : undefined,
        work_location: selectedContract.work_location,
        job_title_arabic: selectedContract.job_title_arabic,
        working_hours: selectedContract.working_hours,
        notice_period: selectedContract.notice_period,
        annual_leave_days: selectedContract.annual_leave_days,
        probation_period: selectedContract.probation_period,
        status: 'Draft',
      } as any,
    }, {
      onSuccess: () => {
        setIsRenewOpen(false);
        setSelectedContract(null);
      }
    });
  };

  const alertsCount = statusCounts.expiring + statusCounts.nearing;

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Alerts Banner */}
      {alertsCount > 0 && (
        <div className="glass-card rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                <Bell className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Contract Expiry Alerts</h3>
                <p className="text-xs text-muted-foreground">
                  {statusCounts.expiring} contracts expiring soon, {statusCounts.nearing} nearing expiry
                </p>
              </div>
            </div>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => checkExpiry.mutate()}
              disabled={checkExpiry.isPending}
              className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
            >
              <Zap className={cn("w-4 h-4 mr-1", checkExpiry.isPending && "animate-spin")} />
              {checkExpiry.isPending ? 'Checking...' : 'Run Check'}
            </Button>
          </div>
        </div>
      )}

      <section className="glass-card rounded-3xl border border-border p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Contract Management</h1>
            <p className="text-xs text-muted-foreground mt-1">MOHRE registered employment contracts</p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => checkExpiry.mutate()} 
              disabled={checkExpiry.isPending}
              className="border-border"
              title="Check for expiring contracts"
            >
              <Zap className={cn("w-4 h-4", checkExpiry.isPending && "animate-spin")} />
            </Button>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="border-border">
              <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
            </Button>
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                  <Plus className="w-4 h-4 mr-1" />Add Contract
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add New MOHRE Contract</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="text-xs text-muted-foreground">Employee</label>
                      <Select value={formData.employee_id} onValueChange={(v) => setFormData({ ...formData, employee_id: v })}>
                        <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                        <SelectContent>
                          {employees.map((emp) => (
                            <SelectItem key={emp.id} value={emp.id}>{emp.full_name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">MOHRE Contract No.</label>
                      <Input value={formData.mohre_contract_no} onChange={(e) => setFormData({ ...formData, mohre_contract_no: e.target.value })} placeholder="MB302614729AE" required />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Contract Type</label>
                      <Select value={formData.contract_type} onValueChange={(v: any) => setFormData({ ...formData, contract_type: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Unlimited">Unlimited</SelectItem>
                          <SelectItem value="Limited">Limited (Fixed Term)</SelectItem>
                          <SelectItem value="Part-time">Part-time</SelectItem>
                          <SelectItem value="Temporary">Temporary</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Start Date</label>
                      <Input type="date" value={formData.start_date} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} required />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">End Date (Limited contracts)</label>
                      <Input type="date" value={formData.end_date} onChange={(e) => setFormData({ ...formData, end_date: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Basic Salary (AED)</label>
                      <Input type="number" value={formData.basic_salary} onChange={(e) => setFormData({ ...formData, basic_salary: e.target.value })} placeholder="1800" required />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Housing Allowance (AED)</label>
                      <Input type="number" value={formData.housing_allowance} onChange={(e) => setFormData({ ...formData, housing_allowance: e.target.value })} placeholder="500" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Transportation Allowance (AED)</label>
                      <Input type="number" value={formData.transportation_allowance} onChange={(e) => setFormData({ ...formData, transportation_allowance: e.target.value })} placeholder="300" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Total Salary (AED)</label>
                      <Input type="number" value={formData.total_salary} onChange={(e) => setFormData({ ...formData, total_salary: e.target.value })} placeholder="3500" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Work Location</label>
                      <Select value={formData.work_location} onValueChange={(v) => setFormData({ ...formData, work_location: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Abu Dhabi">Abu Dhabi</SelectItem>
                          <SelectItem value="Dubai">Dubai</SelectItem>
                          <SelectItem value="Sharjah">Sharjah</SelectItem>
                          <SelectItem value="Ajman">Ajman</SelectItem>
                          <SelectItem value="Ras Al Khaimah">Ras Al Khaimah</SelectItem>
                          <SelectItem value="Fujairah">Fujairah</SelectItem>
                          <SelectItem value="Umm Al Quwain">Umm Al Quwain</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Job Title</label>
                      <Input value={formData.job_title_arabic} onChange={(e) => setFormData({ ...formData, job_title_arabic: e.target.value })} placeholder="Project Manager" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Working Hours/Week</label>
                      <Input type="number" value={formData.working_hours} onChange={(e) => setFormData({ ...formData, working_hours: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Notice Period (days)</label>
                      <Input type="number" value={formData.notice_period} onChange={(e) => setFormData({ ...formData, notice_period: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Annual Leave (days)</label>
                      <Input type="number" value={formData.annual_leave_days} onChange={(e) => setFormData({ ...formData, annual_leave_days: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Probation (months)</label>
                      <Input type="number" value={formData.probation_period} onChange={(e) => setFormData({ ...formData, probation_period: e.target.value })} />
                    </div>
                  </div>
                  <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" disabled={addContract.isPending}>
                    {addContract.isPending ? 'Adding...' : 'Add Contract'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Status Filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          {[
            { key: 'all', label: 'All', count: statusCounts.all },
            { key: 'active', label: 'Active', count: statusCounts.active },
            { key: 'nearing', label: 'Nearing Expiry', count: statusCounts.nearing },
            { key: 'expiring', label: 'Expiring Soon', count: statusCounts.expiring },
            { key: 'expired', label: 'Expired', count: statusCounts.expired },
          ].map((item) => (
            <button
              key={item.key}
              onClick={() => setFilter(item.key)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium transition-colors border",
                filter === item.key
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted/50 text-muted-foreground border-border hover:bg-muted"
              )}
            >
              {item.label} ({item.count})
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {isLoading ? (
            <div className="text-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Loading contracts...</p>
            </div>
          ) : filteredContracts.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-50 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No contracts found</p>
              <p className="text-xs text-muted-foreground mt-1">Add MOHRE contracts for your employees</p>
            </div>
          ) : (
            filteredContracts.map((contract) => {
              const expiryStatus = getContractExpiryStatus(contract);
              const StatusIcon = expiryStatus.icon;
              const canRenew = expiryStatus.status === 'expired' || expiryStatus.status === 'expiring' || expiryStatus.status === 'nearing';
              
              return (
                <div key={contract.id} className="glass-card rounded-2xl border border-border p-4 hover:border-primary/30 transition-colors">
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <h3 className="text-base font-semibold text-foreground">{contract.employees?.full_name || 'Unknown Employee'}</h3>
                        <span className={cn("text-xs px-2 py-1 rounded-full border flex items-center gap-1", expiryStatus.color)}>
                          <StatusIcon className="w-3 h-3" />
                          {expiryStatus.label}
                        </span>
                        {contract.status !== 'Active' && contract.status !== 'Expired' && (
                          <span className="text-xs px-2 py-1 rounded-full border bg-muted/50 text-muted-foreground border-border">
                            {contract.status}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground mb-3">
                        <span className="font-mono">{contract.mohre_contract_no}</span>
                        <span>•</span>
                        <span>{contract.contract_type} Contract</span>
                        {contract.work_location && (
                          <>
                            <span>•</span>
                            <span>{contract.work_location}</span>
                          </>
                        )}
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                        <div>
                          <p className="text-[10px] uppercase text-muted-foreground">Start Date</p>
                          <p className="text-xs text-foreground">{format(parseISO(contract.start_date), 'dd/MM/yyyy')}</p>
                        </div>
                        {contract.end_date && (
                          <div>
                            <p className="text-[10px] uppercase text-muted-foreground">End Date</p>
                            <p className="text-xs text-foreground">{format(parseISO(contract.end_date), 'dd/MM/yyyy')}</p>
                          </div>
                        )}
                        <div>
                          <p className="text-[10px] uppercase text-muted-foreground">Basic Salary</p>
                          <p className="text-xs text-foreground">AED {contract.basic_salary?.toLocaleString()}</p>
                        </div>
                        {contract.total_salary && (
                          <div>
                            <p className="text-[10px] uppercase text-muted-foreground">Total Salary</p>
                            <p className="text-xs text-foreground">AED {contract.total_salary?.toLocaleString()}</p>
                          </div>
                        )}
                        <div>
                          <p className="text-[10px] uppercase text-muted-foreground">Working Hours</p>
                          <p className="text-xs text-foreground">{contract.working_hours}hrs/week</p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase text-muted-foreground">Annual Leave</p>
                          <p className="text-xs text-foreground">{contract.annual_leave_days} days</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {canRenew && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleOpenRenewal(contract)} 
                          className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                        >
                          <RotateCcw className="w-4 h-4 mr-1" />Renew
                        </Button>
                      )}
                      {(contract.status === 'Draft' || contract.status === 'Approved') && (
                        <Button 
                          size="sm" 
                          onClick={() => updateStatus.mutate({ id: contract.id, status: 'Active' })} 
                          disabled={updateStatus.isPending}
                          className="bg-primary hover:bg-primary/90 text-primary-foreground"
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />Activate
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* Renewal Modal */}
      <Dialog open={isRenewOpen} onOpenChange={setIsRenewOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Renew Contract</DialogTitle>
          </DialogHeader>
          {selectedContract && (
            <form onSubmit={handleRenewSubmit} className="space-y-4 mt-4">
              <div className="p-3 rounded-lg bg-secondary/50 border border-border">
                <p className="text-sm font-medium text-foreground">{selectedContract.employees?.full_name}</p>
                <p className="text-xs text-muted-foreground">Previous: {selectedContract.mohre_contract_no}</p>
              </div>

              <div>
                <label className="text-xs text-muted-foreground">New MOHRE Contract No. *</label>
                <Input 
                  value={renewFormData.mohre_contract_no} 
                  onChange={(e) => setRenewFormData({ ...renewFormData, mohre_contract_no: e.target.value })} 
                  placeholder="Enter new contract number" 
                  required 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground">New Start Date</label>
                  <Input 
                    type="date" 
                    value={renewFormData.start_date} 
                    onChange={(e) => setRenewFormData({ ...renewFormData, start_date: e.target.value })} 
                    required 
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">New End Date</label>
                  <Input 
                    type="date" 
                    value={renewFormData.end_date} 
                    onChange={(e) => setRenewFormData({ ...renewFormData, end_date: e.target.value })} 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground">Basic Salary (AED)</label>
                  <Input 
                    type="number" 
                    value={renewFormData.basic_salary} 
                    onChange={(e) => setRenewFormData({ ...renewFormData, basic_salary: e.target.value })} 
                    required 
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Total Salary (AED)</label>
                  <Input 
                    type="number" 
                    value={renewFormData.total_salary} 
                    onChange={(e) => setRenewFormData({ ...renewFormData, total_salary: e.target.value })} 
                  />
                </div>
              </div>

              <div className="text-xs text-muted-foreground p-2 rounded bg-muted/30">
                The old contract will be marked as "Terminated" and a new draft contract will be created.
              </div>

              <div className="flex gap-2">
                <Button 
                  type="submit" 
                  className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground" 
                  disabled={renewContract.isPending}
                >
                  {renewContract.isPending ? 'Renewing...' : 'Create Renewal'}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsRenewOpen(false)}
                  className="border-border"
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
