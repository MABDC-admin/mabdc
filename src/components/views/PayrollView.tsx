import { useState, useMemo } from 'react';
import { usePayroll, useProcessWPS, useGeneratePayroll, useDeletePayroll, useUpdatePayroll } from '@/hooks/usePayroll';
import { useEmployees } from '@/hooks/useEmployees';
import { useContracts } from '@/hooks/useContracts';
import { useCompanySettings } from '@/hooks/useSettings';
import { useApprovedTicketAllowances } from '@/hooks/useTicketAllowance';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { DollarSign, RefreshCw, CheckCircle, Plus, Trash2, Edit2, Download, Printer, CreditCard, Users, FileSpreadsheet, Plane } from 'lucide-react';
import { cn } from '@/lib/utils';
import { generatePayslipPDF, generateBulkPayrollPDF } from '@/utils/payrollPdf';
import { toast } from 'sonner';
import { TicketAllowanceReminders } from '@/components/admin/TicketAllowanceReminders';

export function PayrollView() {
  const { data: payroll = [], isLoading, refetch } = usePayroll();
  const { data: employees = [] } = useEmployees();
  const { data: contracts = [] } = useContracts();
  const { data: settings } = useCompanySettings();
  const { data: approvedTicketAllowances = [] } = useApprovedTicketAllowances();
  const processWPS = useProcessWPS();
  const generatePayroll = useGeneratePayroll();
  const deletePayroll = useDeletePayroll();
  const updatePayroll = useUpdatePayroll();

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [isBulkGenerateOpen, setIsBulkGenerateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingPayroll, setEditingPayroll] = useState<any>(null);
  const [bulkGenerating, setBulkGenerating] = useState(false);

  const [newPayroll, setNewPayroll] = useState({
    employeeId: '',
    month: selectedMonth,
    basicSalary: 0,
    housingAllowance: 0,
    transportAllowance: 0,
    ticketAllowance: 0,
    otherAllowances: 0,
    deductions: 0,
    deductionReason: '',
    includeTicketAllowance: false,
  });

  const months = useMemo(() => {
    const result = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      result.push({
        value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        label: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      });
    }
    return result;
  }, []);

  const filteredPayroll = useMemo(() => {
    return payroll.filter(p => p.month.startsWith(selectedMonth));
  }, [payroll, selectedMonth]);

  const stats = useMemo(() => ({
    totalPayroll: filteredPayroll.reduce((sum, p) => sum + (p.net_salary || 0), 0),
    totalBasic: filteredPayroll.reduce((sum, p) => sum + (p.basic_salary || 0), 0),
    totalAllowances: filteredPayroll.reduce((sum, p) => sum + (p.allowances || 0), 0),
    totalDeductions: filteredPayroll.reduce((sum, p) => sum + (p.deductions || 0), 0),
    wpsProcessed: filteredPayroll.filter(p => p.wps_processed).length,
    pending: filteredPayroll.filter(p => !p.wps_processed).length,
  }), [filteredPayroll]);

  // Get employees who don't have payroll for selected month
  const employeesWithoutPayroll = useMemo(() => {
    const payrollEmployeeIds = filteredPayroll.map(p => p.employee_id);
    return employees.filter(e => 
      e.status === 'Active' && !payrollEmployeeIds.includes(e.id)
    );
  }, [employees, filteredPayroll]);

  const handleEmployeeSelect = (employeeId: string) => {
    const contract = contracts.find(c => c.employee_id === employeeId && c.status === 'Active');
    // Check if employee has an approved ticket allowance
    const ticketAllowance = approvedTicketAllowances.find(t => t.employee_id === employeeId);
    
    if (contract) {
      setNewPayroll({
        ...newPayroll,
        employeeId,
        basicSalary: contract.basic_salary || 0,
        housingAllowance: contract.housing_allowance || 0,
        transportAllowance: contract.transportation_allowance || 0,
        ticketAllowance: ticketAllowance?.amount || 0,
        otherAllowances: 0,
        deductions: 0,
        deductionReason: '',
        includeTicketAllowance: !!ticketAllowance,
      });
    } else {
      const emp = employees.find(e => e.id === employeeId);
      setNewPayroll({
        ...newPayroll,
        employeeId,
        basicSalary: emp?.basic_salary || 0,
        housingAllowance: 0,
        transportAllowance: 0,
        ticketAllowance: ticketAllowance?.amount || 0,
        otherAllowances: emp?.allowance || 0,
        deductions: 0,
        deductionReason: '',
        includeTicketAllowance: !!ticketAllowance,
      });
    }
  };

  const handleGeneratePayroll = async () => {
    if (!newPayroll.employeeId) return;
    const ticketAmount = newPayroll.includeTicketAllowance ? newPayroll.ticketAllowance : 0;
    
    try {
      await generatePayroll.mutateAsync({
        employeeId: newPayroll.employeeId,
        month: newPayroll.month,
        basicSalary: newPayroll.basicSalary,
        housingAllowance: newPayroll.housingAllowance,
        transportationAllowance: newPayroll.transportAllowance,
        ticketAllowance: ticketAmount,
        otherAllowances: newPayroll.otherAllowances,
        deductions: newPayroll.deductions,
        deductionReason: newPayroll.deductionReason,
      });
      setIsGenerateOpen(false);
      setNewPayroll({
        employeeId: '',
        month: selectedMonth,
        basicSalary: 0,
        housingAllowance: 0,
        transportAllowance: 0,
        ticketAllowance: 0,
        otherAllowances: 0,
        deductions: 0,
        deductionReason: '',
        includeTicketAllowance: false,
      });
    } catch (error) {
      console.error('Failed to generate payroll:', error);
    }
  };

  const handleBulkGenerate = async () => {
    if (employeesWithoutPayroll.length === 0) {
      toast.info('All active employees already have payroll for this month');
      return;
    }

    setBulkGenerating(true);
    let successCount = 0;
    let errorCount = 0;

    for (const emp of employeesWithoutPayroll) {
      const contract = contracts.find(c => c.employee_id === emp.id && c.status === 'Active');
      const basicSalary = contract?.basic_salary || emp.basic_salary || 0;
      const housingAllowance = contract?.housing_allowance || 0;
      const transportAllowance = contract?.transportation_allowance || 0;
      const otherAllowances = emp.allowance || 0;

      try {
        await generatePayroll.mutateAsync({
          employeeId: emp.id,
          month: selectedMonth,
          basicSalary,
          housingAllowance,
          transportationAllowance: transportAllowance,
          otherAllowances,
          deductions: 0,
          deductionReason: '',
        });
        successCount++;
      } catch (error) {
        console.error(`Failed to generate payroll for ${emp.full_name}:`, error);
        errorCount++;
      }
    }

    setBulkGenerating(false);
    setIsBulkGenerateOpen(false);
    
    if (successCount > 0) {
      toast.success(`Generated payroll for ${successCount} employees. You can now edit each record to add deductions.`);
    }
    if (errorCount > 0) {
      toast.error(`Failed to generate payroll for ${errorCount} employees`);
    }
  };

  const handleEditPayroll = async () => {
    if (!editingPayroll) return;
    try {
      await updatePayroll.mutateAsync({
        id: editingPayroll.id,
        basicSalary: editingPayroll.basic_salary,
        allowances: editingPayroll.allowances,
        deductions: editingPayroll.deductions,
      });
      setIsEditOpen(false);
      setEditingPayroll(null);
    } catch (error) {
      console.error('Failed to update payroll:', error);
    }
  };

  const handlePrintPayslip = (record: any) => {
    generatePayslipPDF(record, settings);
  };

  const handleExportAll = () => {
    if (filteredPayroll.length === 0) return;
    generateBulkPayrollPDF(filteredPayroll, selectedMonth, settings);
  };

  const totalNet = newPayroll.basicSalary + newPayroll.housingAllowance + newPayroll.transportAllowance + newPayroll.otherAllowances - newPayroll.deductions;

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <div className="stat-card rounded-2xl border border-border p-4">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Total Payroll</p>
          <p className="text-2xl font-bold mt-1 text-foreground">AED {stats.totalPayroll.toLocaleString()}</p>
        </div>
        <div className="stat-card rounded-2xl border border-border p-4">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Basic Salaries</p>
          <p className="text-2xl font-bold mt-1 text-muted-foreground">AED {stats.totalBasic.toLocaleString()}</p>
        </div>
        <div className="stat-card rounded-2xl border border-border p-4">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Allowances</p>
          <p className="text-2xl font-bold mt-1 text-primary">+{stats.totalAllowances.toLocaleString()}</p>
        </div>
        <div className="stat-card rounded-2xl border border-border p-4">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Deductions</p>
          <p className="text-2xl font-bold mt-1 text-destructive">-{stats.totalDeductions.toLocaleString()}</p>
        </div>
        <div className="stat-card rounded-2xl border border-border p-4">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Paid</p>
          <p className="text-2xl font-bold mt-1 text-primary">{stats.wpsProcessed}</p>
        </div>
        <div className="stat-card rounded-2xl border border-border p-4">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Pending</p>
          <p className="text-2xl font-bold mt-1 text-amber-400">{stats.pending}</p>
        </div>
      </div>

      {/* Main Section */}
      <section className="glass-card rounded-3xl border border-border p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Payroll & WPS Management</h1>
            <p className="text-xs text-muted-foreground mt-1">UAE WPS compliant salary processing</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {months.map(m => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="border-border">
              <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportAll} disabled={filteredPayroll.length === 0} className="border-border">
              <Download className="w-4 h-4 mr-1" /> Export PDF
            </Button>
            
            {/* Bulk Generate Button */}
            <Dialog open={isBulkGenerateOpen} onOpenChange={setIsBulkGenerateOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="border-primary text-primary hover:bg-primary/10">
                  <Users className="w-4 h-4 mr-1" /> Bulk Generate
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5" />
                    Bulk Generate Payroll
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div className="bg-secondary/50 rounded-lg p-4">
                    <p className="text-sm text-foreground mb-2">
                      Generate payroll for all active employees for <strong>{months.find(m => m.value === selectedMonth)?.label}</strong>
                    </p>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Employees without payroll:</span>
                      <span className="font-bold text-primary">{employeesWithoutPayroll.length}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm mt-1">
                      <span className="text-muted-foreground">Already generated:</span>
                      <span className="text-muted-foreground">{filteredPayroll.length}</span>
                    </div>
                  </div>
                  
                  {employeesWithoutPayroll.length > 0 && (
                    <div className="max-h-48 overflow-y-auto border border-border rounded-lg">
                      <div className="p-2 bg-muted/50 border-b border-border text-xs font-medium text-muted-foreground">
                        Employees to generate payroll for:
                      </div>
                      {employeesWithoutPayroll.map(emp => {
                        const contract = contracts.find(c => c.employee_id === emp.id && c.status === 'Active');
                        const salary = contract?.basic_salary || emp.basic_salary || 0;
                        return (
                          <div key={emp.id} className="p-2 border-b border-border last:border-0 flex justify-between items-center text-sm">
                            <span>{emp.full_name} ({emp.hrms_no})</span>
                            <span className="text-muted-foreground">AED {salary.toLocaleString()}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                    <p className="text-xs text-amber-600">
                      <strong>Note:</strong> Payroll will be generated with 0 deductions. You can edit each record after generation to add deductions if needed.
                    </p>
                  </div>
                  
                  <Button 
                    onClick={handleBulkGenerate} 
                    disabled={bulkGenerating || employeesWithoutPayroll.length === 0} 
                    className="w-full"
                  >
                    {bulkGenerating ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Users className="w-4 h-4 mr-2" />
                        Generate for {employeesWithoutPayroll.length} Employees
                      </>
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Single Generate Button */}
            <Dialog open={isGenerateOpen} onOpenChange={setIsGenerateOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                  <Plus className="w-4 h-4 mr-1" /> Generate Payroll
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Generate Payroll</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <Label>Employee</Label>
                    <Select value={newPayroll.employeeId} onValueChange={handleEmployeeSelect}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select employee" />
                      </SelectTrigger>
                      <SelectContent>
                        {employees.filter(e => e.status === 'Active').map(emp => (
                          <SelectItem key={emp.id} value={emp.id}>
                            {emp.full_name} ({emp.hrms_no})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Month</Label>
                    <Select value={newPayroll.month} onValueChange={(v) => setNewPayroll({...newPayroll, month: v})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {months.map(m => (
                          <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Basic Salary (AED)</Label>
                      <Input
                        type="number"
                        value={newPayroll.basicSalary}
                        onChange={(e) => setNewPayroll({...newPayroll, basicSalary: Number(e.target.value)})}
                      />
                    </div>
                    <div>
                      <Label>Housing Allowance</Label>
                      <Input
                        type="number"
                        value={newPayroll.housingAllowance}
                        onChange={(e) => setNewPayroll({...newPayroll, housingAllowance: Number(e.target.value)})}
                      />
                    </div>
                    <div>
                      <Label>Transport Allowance</Label>
                      <Input
                        type="number"
                        value={newPayroll.transportAllowance}
                        onChange={(e) => setNewPayroll({...newPayroll, transportAllowance: Number(e.target.value)})}
                      />
                    </div>
                    <div>
                      <Label>Other Allowances</Label>
                      <Input
                        type="number"
                        value={newPayroll.otherAllowances}
                        onChange={(e) => setNewPayroll({...newPayroll, otherAllowances: Number(e.target.value)})}
                      />
                    </div>
                  </div>
                  <div className="border-t border-border pt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Deductions (AED)</Label>
                        <Input
                          type="number"
                          value={newPayroll.deductions}
                          onChange={(e) => setNewPayroll({...newPayroll, deductions: Number(e.target.value)})}
                        />
                      </div>
                      <div>
                        <Label>Deduction Reason</Label>
                        <Input
                          value={newPayroll.deductionReason}
                          onChange={(e) => setNewPayroll({...newPayroll, deductionReason: e.target.value})}
                          placeholder="e.g., Absence, Loan repayment"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="bg-secondary/50 rounded-lg p-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Gross Salary:</span>
                      <span className="font-medium">AED {(newPayroll.basicSalary + newPayroll.housingAllowance + newPayroll.transportAllowance + newPayroll.otherAllowances).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm mt-1">
                      <span className="text-muted-foreground">Total Deductions:</span>
                      <span className="text-destructive">-AED {newPayroll.deductions.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold mt-2 pt-2 border-t border-border">
                      <span>Net Salary:</span>
                      <span className="text-primary">AED {totalNet.toLocaleString()}</span>
                    </div>
                  </div>
                  <Button onClick={handleGeneratePayroll} disabled={generatePayroll.isPending || !newPayroll.employeeId} className="w-full">
                    {generatePayroll.isPending ? 'Generating...' : 'Generate Payroll'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Payroll List */}
        <div className="space-y-3">
          {isLoading ? (
            <div className="text-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-muted-foreground" />
            </div>
          ) : filteredPayroll.length === 0 ? (
            <div className="text-center py-12">
              <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-30 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No payroll records for this month</p>
              <p className="text-xs text-muted-foreground mt-1">Click "Bulk Generate" or "Generate Payroll" to create records</p>
            </div>
          ) : (
            filteredPayroll.map((record) => (
              <div key={record.id} className="glass-card rounded-2xl border border-border p-4 hover:border-primary/30 transition-colors">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      {record.employees?.photo_url ? (
                        <img src={record.employees.photo_url} alt={record.employees.full_name} className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-bold text-primary">
                            {record.employees?.full_name?.charAt(0) || '?'}
                          </span>
                        </div>
                      )}
                      <div>
                        <h3 className="text-base font-semibold text-foreground">{record.employees?.full_name || 'Unknown'}</h3>
                        <p className="text-xs text-muted-foreground">{record.employees?.hrms_no} • {record.employees?.job_position}</p>
                      </div>
                      <span className={cn(
                        "ml-auto lg:ml-0 text-xs px-3 py-1 rounded-full border font-medium",
                        record.wps_processed 
                          ? "bg-primary/10 text-primary border-primary/30" 
                          : "bg-amber-500/10 text-amber-500 border-amber-500/30"
                      )}>
                        {record.wps_processed ? 'Paid' : 'Pending'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      <div>
                        <p className="text-[10px] uppercase text-muted-foreground">Basic Salary</p>
                        <p className="text-sm font-medium text-foreground">AED {record.basic_salary?.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase text-muted-foreground">Allowances</p>
                        <p className="text-sm font-medium text-primary">+{record.allowances?.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase text-muted-foreground">Deductions</p>
                        <p className="text-sm font-medium text-destructive">-{record.deductions?.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase text-muted-foreground">Net Salary</p>
                        <p className="text-lg font-bold text-foreground">AED {record.net_salary?.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase text-muted-foreground">Bank Details</p>
                        <div className="flex items-center gap-1">
                          <CreditCard className="w-3 h-3 text-muted-foreground" />
                          <p className="text-xs text-muted-foreground truncate">{record.employees?.bank_name || 'Not set'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap lg:flex-nowrap">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handlePrintPayslip(record)}
                      className="border-border"
                    >
                      <Printer className="w-4 h-4 mr-1" /> Payslip
                    </Button>
                    {!record.wps_processed && (
                      <>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setEditingPayroll(record);
                            setIsEditOpen(true);
                          }}
                          className="border-border"
                          title="Edit to add deductions"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" className="border-destructive/30 text-destructive hover:bg-destructive/10">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Payroll Record</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete the payroll record for {record.employees?.full_name}. This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => deletePayroll.mutate(record.id)}
                                className="bg-destructive hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                        <Button 
                          size="sm" 
                          onClick={() => processWPS.mutate(record.id)} 
                          disabled={processWPS.isPending}
                          className="bg-primary hover:bg-primary/90 text-primary-foreground"
                        >
                          <CheckCircle className="w-4 h-4 mr-1" /> Mark as Paid
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Payroll - Add Deductions</DialogTitle>
          </DialogHeader>
          {editingPayroll && (
            <div className="space-y-4 mt-4">
              <div className="bg-secondary/30 rounded-lg p-3">
                <p className="text-sm font-medium">{editingPayroll.employees?.full_name}</p>
                <p className="text-xs text-muted-foreground">{editingPayroll.employees?.hrms_no} • {editingPayroll.employees?.department}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Basic Salary (AED)</Label>
                  <Input
                    type="number"
                    value={editingPayroll.basic_salary}
                    onChange={(e) => setEditingPayroll({...editingPayroll, basic_salary: Number(e.target.value)})}
                  />
                </div>
                <div>
                  <Label>Allowances (AED)</Label>
                  <Input
                    type="number"
                    value={editingPayroll.allowances}
                    onChange={(e) => setEditingPayroll({...editingPayroll, allowances: Number(e.target.value)})}
                  />
                </div>
              </div>
              <div className="border-t border-border pt-4">
                <Label className="text-destructive">Deductions (AED)</Label>
                <Input
                  type="number"
                  value={editingPayroll.deductions}
                  onChange={(e) => setEditingPayroll({...editingPayroll, deductions: Number(e.target.value)})}
                  className="border-destructive/30"
                />
                <p className="text-xs text-muted-foreground mt-1">Add absences, loan repayments, or other deductions</p>
              </div>
              <div className="bg-secondary/50 rounded-lg p-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Gross Salary:</span>
                  <span className="font-medium">AED {(editingPayroll.basic_salary + editingPayroll.allowances).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-muted-foreground">Deductions:</span>
                  <span className="text-destructive">-AED {editingPayroll.deductions?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-lg font-bold mt-2 pt-2 border-t border-border">
                  <span>Net Salary:</span>
                  <span className="text-primary">
                    AED {(editingPayroll.basic_salary + editingPayroll.allowances - editingPayroll.deductions).toLocaleString()}
                  </span>
                </div>
              </div>
              <Button onClick={handleEditPayroll} disabled={updatePayroll.isPending} className="w-full">
                {updatePayroll.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
