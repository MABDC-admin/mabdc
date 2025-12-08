import { useState, useMemo, useRef } from 'react';
import { usePayroll, useGeneratePayroll, useUpdatePayroll, useDeletePayroll, useProcessWPS } from '@/hooks/usePayroll';
import { useEmployees } from '@/hooks/useEmployees';
import { useContracts } from '@/hooks/useContracts';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, DollarSign, Calendar, Users, Plus, CheckCircle, Pencil, Trash2, Eye, Printer, X, FileText } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// UAE Payroll deduction types
const DEDUCTION_TYPES = [
  { id: 'absence', label: 'Absence Deduction', description: 'Unpaid leave or absence' },
  { id: 'late', label: 'Late Deduction', description: 'Late arrival penalties' },
  { id: 'loan', label: 'Loan Repayment', description: 'Employee loan deduction' },
  { id: 'advance', label: 'Salary Advance', description: 'Advance salary recovery' },
  { id: 'penalty', label: 'Penalty', description: 'Disciplinary penalty' },
  { id: 'other', label: 'Other Deduction', description: 'Miscellaneous deductions' },
];

interface DeductionItem {
  type: string;
  amount: number;
  description?: string;
}

export function AdminPayrollReport() {
  const { data: payroll = [] } = usePayroll();
  const { data: employees = [] } = useEmployees();
  const { data: contracts = [] } = useContracts();
  const generatePayroll = useGeneratePayroll();
  const updatePayroll = useUpdatePayroll();
  const deletePayroll = useDeletePayroll();
  const processWPS = useProcessWPS();
  const printRef = useRef<HTMLDivElement>(null);
  
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(format(currentDate, 'yyyy-MM'));
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedPayroll, setSelectedPayroll] = useState<typeof payroll[0] | null>(null);
  const [deductions, setDeductions] = useState<DeductionItem[]>([]);
  const [newPayroll, setNewPayroll] = useState({
    employeeId: '',
    month: format(currentDate, 'yyyy-MM'),
    basicSalary: 0,
    housingAllowance: 0,
    transportAllowance: 0,
    otherAllowance: 0,
  });

  const months = useMemo(() => {
    const result = [];
    for (let i = 0; i < 12; i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      result.push({
        value: format(date, 'yyyy-MM'),
        label: format(date, 'MMMM yyyy'),
      });
    }
    return result;
  }, []);

  const filteredPayroll = useMemo(() => {
    return payroll.filter(p => p.month.startsWith(selectedMonth));
  }, [payroll, selectedMonth]);

  const totals = useMemo(() => {
    return {
      totalBasic: filteredPayroll.reduce((sum, p) => sum + (p.basic_salary || 0), 0),
      totalAllowances: filteredPayroll.reduce((sum, p) => sum + (p.allowances || 0), 0),
      totalDeductions: filteredPayroll.reduce((sum, p) => sum + (p.deductions || 0), 0),
      totalNet: filteredPayroll.reduce((sum, p) => sum + (p.net_salary || 0), 0),
      wpsProcessed: filteredPayroll.filter(p => p.wps_processed).length,
      pending: filteredPayroll.filter(p => !p.wps_processed).length,
    };
  }, [filteredPayroll]);

  const totalDeductionsAmount = useMemo(() => {
    return deductions.reduce((sum, d) => sum + d.amount, 0);
  }, [deductions]);

  const totalAllowances = useMemo(() => {
    return newPayroll.housingAllowance + newPayroll.transportAllowance + newPayroll.otherAllowance;
  }, [newPayroll]);

  const handleGeneratePayroll = async () => {
    if (!newPayroll.employeeId) return;
    try {
      await generatePayroll.mutateAsync({
        employeeId: newPayroll.employeeId,
        month: newPayroll.month,
        basicSalary: newPayroll.basicSalary,
        allowances: totalAllowances,
        deductions: totalDeductionsAmount,
      });
      setIsGenerateOpen(false);
      resetForm();
    } catch (error) {
      console.error('Failed to generate payroll:', error);
    }
  };

  const resetForm = () => {
    setNewPayroll({
      employeeId: '',
      month: format(currentDate, 'yyyy-MM'),
      basicSalary: 0,
      housingAllowance: 0,
      transportAllowance: 0,
      otherAllowance: 0,
    });
    setDeductions([]);
  };

  const handleEmployeeSelect = (employeeId: string) => {
    const employee = employees.find(e => e.id === employeeId);
    const contract = contracts.find(c => c.employee_id === employeeId && c.status === 'Active');
    
    setNewPayroll({
      ...newPayroll,
      employeeId,
      basicSalary: contract?.basic_salary || employee?.basic_salary || 0,
      housingAllowance: (contract as any)?.housing_allowance || 0,
      transportAllowance: (contract as any)?.transportation_allowance || 0,
      otherAllowance: employee?.allowance || 0,
    });
  };

  const addDeduction = () => {
    setDeductions([...deductions, { type: 'other', amount: 0, description: '' }]);
  };

  const removeDeduction = (index: number) => {
    setDeductions(deductions.filter((_, i) => i !== index));
  };

  const updateDeduction = (index: number, field: keyof DeductionItem, value: string | number) => {
    const updated = [...deductions];
    updated[index] = { ...updated[index], [field]: value };
    setDeductions(updated);
  };

  const handleView = (record: typeof payroll[0]) => {
    setSelectedPayroll(record);
    setIsViewOpen(true);
  };

  const handleEdit = (record: typeof payroll[0]) => {
    setSelectedPayroll(record);
    setNewPayroll({
      employeeId: record.employee_id,
      month: record.month,
      basicSalary: record.basic_salary,
      housingAllowance: 0,
      transportAllowance: 0,
      otherAllowance: record.allowances || 0,
    });
    setDeductions([{ type: 'other', amount: record.deductions || 0, description: 'Previous deductions' }]);
    setIsEditOpen(true);
  };

  const handleUpdatePayroll = async () => {
    if (!selectedPayroll) return;
    try {
      await updatePayroll.mutateAsync({
        id: selectedPayroll.id,
        basicSalary: newPayroll.basicSalary,
        allowances: totalAllowances,
        deductions: totalDeductionsAmount,
      });
      setIsEditOpen(false);
      setSelectedPayroll(null);
      resetForm();
    } catch (error) {
      console.error('Failed to update payroll:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this payroll record?')) {
      await deletePayroll.mutateAsync(id);
    }
  };

  const downloadCSV = () => {
    const headers = ['HRMS No', 'Employee Name', 'Department', 'Month', 'Basic Salary', 'Allowances', 'Deductions', 'Net Salary', 'Bank Name', 'IBAN', 'WPS Status'];
    const rows = filteredPayroll.map(p => [
      p.employees?.hrms_no || '',
      p.employees?.full_name || '',
      p.employees?.department || '',
      p.month,
      p.basic_salary,
      p.allowances,
      p.deductions,
      p.net_salary,
      p.employees?.bank_name || '',
      p.employees?.iban || '',
      p.wps_processed ? 'Processed' : 'Pending',
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `uae-payroll-report-${selectedMonth}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const printPayslip = () => {
    if (!selectedPayroll) return;
    
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Payslip - ${selectedPayroll.employees?.full_name}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
          .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
          .company-name { font-size: 24px; font-weight: bold; color: #1a1a1a; }
          .payslip-title { font-size: 18px; color: #666; margin-top: 10px; }
          .employee-info { display: flex; justify-content: space-between; margin-bottom: 30px; }
          .info-block { flex: 1; }
          .info-label { font-size: 11px; color: #888; text-transform: uppercase; margin-bottom: 4px; }
          .info-value { font-size: 14px; font-weight: 600; margin-bottom: 12px; }
          .earnings-deductions { display: flex; gap: 40px; margin-bottom: 30px; }
          .section { flex: 1; }
          .section-title { font-size: 14px; font-weight: bold; border-bottom: 1px solid #ddd; padding-bottom: 8px; margin-bottom: 12px; }
          .line-item { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; }
          .total-section { background: #f5f5f5; padding: 20px; border-radius: 8px; margin-top: 20px; }
          .net-pay { font-size: 24px; font-weight: bold; color: #22c55e; }
          .footer { text-align: center; margin-top: 40px; font-size: 11px; color: #888; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company-name">MABDC</div>
          <div class="payslip-title">UAE WPS Compliant Payslip</div>
          <div style="margin-top: 10px; font-size: 14px;">Period: ${format(new Date(selectedPayroll.month + '-01'), 'MMMM yyyy')}</div>
        </div>
        
        <div class="employee-info">
          <div class="info-block">
            <div class="info-label">Employee Name</div>
            <div class="info-value">${selectedPayroll.employees?.full_name || 'N/A'}</div>
            <div class="info-label">HRMS Number</div>
            <div class="info-value">${selectedPayroll.employees?.hrms_no || 'N/A'}</div>
            <div class="info-label">Department</div>
            <div class="info-value">${selectedPayroll.employees?.department || 'N/A'}</div>
          </div>
          <div class="info-block">
            <div class="info-label">Bank Name</div>
            <div class="info-value">${selectedPayroll.employees?.bank_name || 'N/A'}</div>
            <div class="info-label">IBAN</div>
            <div class="info-value">${selectedPayroll.employees?.iban || 'N/A'}</div>
            <div class="info-label">WPS Status</div>
            <div class="info-value">${selectedPayroll.wps_processed ? '✓ Processed' : 'Pending'}</div>
          </div>
        </div>

        <div class="earnings-deductions">
          <div class="section">
            <div class="section-title">Earnings</div>
            <div class="line-item"><span>Basic Salary</span><span>AED ${selectedPayroll.basic_salary?.toLocaleString()}</span></div>
            <div class="line-item"><span>Allowances</span><span>AED ${selectedPayroll.allowances?.toLocaleString()}</span></div>
            <div class="line-item" style="border-top: 1px solid #ddd; padding-top: 8px; font-weight: bold;">
              <span>Gross Salary</span>
              <span>AED ${((selectedPayroll.basic_salary || 0) + (selectedPayroll.allowances || 0)).toLocaleString()}</span>
            </div>
          </div>
          <div class="section">
            <div class="section-title">Deductions</div>
            <div class="line-item"><span>Total Deductions</span><span>AED ${selectedPayroll.deductions?.toLocaleString()}</span></div>
            <div class="line-item" style="color: #888; font-size: 11px;"><span>(No social security in UAE)</span><span>-</span></div>
          </div>
        </div>

        <div class="total-section">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <div class="info-label">Net Salary Payable</div>
              <div class="net-pay">AED ${selectedPayroll.net_salary?.toLocaleString()}</div>
            </div>
            <div style="text-align: right;">
              <div class="info-label">Payment Method</div>
              <div class="info-value">WPS Bank Transfer</div>
            </div>
          </div>
        </div>

        <div class="footer">
          <p>This is a computer-generated payslip and does not require a signature.</p>
          <p>Generated on ${format(new Date(), 'dd MMM yyyy HH:mm')}</p>
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  };

  return (
    <div className="glass-card rounded-3xl border border-border p-6 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">UAE Payroll Management</h2>
          <p className="text-xs text-muted-foreground">WPS compliant payroll with deductions</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-48">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {months.map((month) => (
                <SelectItem key={month.value} value={month.value}>{month.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => setIsGenerateOpen(true)}>
            <Plus size={16} className="mr-1" /> Generate Payroll
          </Button>
          <Button onClick={downloadCSV} className="bg-primary text-primary-foreground">
            <Download size={16} className="mr-2" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border p-4 bg-muted/30">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground">Total Basic</span>
          </div>
          <p className="text-xl font-bold text-foreground">AED {totals.totalBasic.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-border p-4 bg-muted/30">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-4 h-4 text-emerald-500" />
            <span className="text-xs text-muted-foreground">Total Net</span>
          </div>
          <p className="text-xl font-bold text-foreground">AED {totals.totalNet.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-border p-4 bg-muted/30">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground">WPS Processed</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{totals.wpsProcessed}</p>
        </div>
        <div className="rounded-xl border border-border p-4 bg-muted/30">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-amber-500" />
            <span className="text-xs text-muted-foreground">Pending</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{totals.pending}</p>
        </div>
      </div>

      {/* Report Table */}
      <div className="rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>HRMS No</TableHead>
              <TableHead>Employee</TableHead>
              <TableHead className="text-right">Basic</TableHead>
              <TableHead className="text-right">Allowances</TableHead>
              <TableHead className="text-right">Deductions</TableHead>
              <TableHead className="text-right">Net Salary</TableHead>
              <TableHead className="text-center">WPS</TableHead>
              <TableHead className="text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPayroll.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No payroll records for this month
                </TableCell>
              </TableRow>
            ) : (
              filteredPayroll.map((record) => (
                <TableRow key={record.id}>
                  <TableCell className="text-xs font-mono">{record.employees?.hrms_no}</TableCell>
                  <TableCell className="text-sm font-medium">{record.employees?.full_name}</TableCell>
                  <TableCell className="text-right text-sm">AED {record.basic_salary?.toLocaleString()}</TableCell>
                  <TableCell className="text-right text-sm text-emerald-500">+{record.allowances?.toLocaleString()}</TableCell>
                  <TableCell className="text-right text-sm text-destructive">-{record.deductions?.toLocaleString()}</TableCell>
                  <TableCell className="text-right text-sm font-bold">AED {record.net_salary?.toLocaleString()}</TableCell>
                  <TableCell className="text-center">
                    {record.wps_processed ? (
                      <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">Processed</span>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => processWPS.mutate(record.id)}
                        disabled={processWPS.isPending}
                      >
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Process
                      </Button>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleView(record)}>
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(record)} disabled={record.wps_processed}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(record.id)} disabled={record.wps_processed}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Generate Payroll Dialog */}
      <Dialog open={isGenerateOpen} onOpenChange={setIsGenerateOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-primary" />
              Generate UAE Payroll
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Employee</Label>
                <Select value={newPayroll.employeeId} onValueChange={handleEmployeeSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>{emp.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Month</Label>
                <Select value={newPayroll.month} onValueChange={(v) => setNewPayroll({...newPayroll, month: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((month) => (
                      <SelectItem key={month.value} value={month.value}>{month.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Earnings Section */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-foreground">Earnings</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Basic Salary (AED)</Label>
                  <Input 
                    type="number"
                    value={newPayroll.basicSalary}
                    onChange={(e) => setNewPayroll({...newPayroll, basicSalary: Number(e.target.value)})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Housing Allowance (AED)</Label>
                  <Input 
                    type="number"
                    value={newPayroll.housingAllowance}
                    onChange={(e) => setNewPayroll({...newPayroll, housingAllowance: Number(e.target.value)})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Transport Allowance (AED)</Label>
                  <Input 
                    type="number"
                    value={newPayroll.transportAllowance}
                    onChange={(e) => setNewPayroll({...newPayroll, transportAllowance: Number(e.target.value)})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Other Allowance (AED)</Label>
                  <Input 
                    type="number"
                    value={newPayroll.otherAllowance}
                    onChange={(e) => setNewPayroll({...newPayroll, otherAllowance: Number(e.target.value)})}
                  />
                </div>
              </div>
            </div>

            {/* Deductions Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-foreground">Deductions</h4>
                <Button variant="outline" size="sm" onClick={addDeduction}>
                  <Plus className="w-3 h-3 mr-1" /> Add Deduction
                </Button>
              </div>
              {deductions.length === 0 ? (
                <p className="text-xs text-muted-foreground">No deductions added</p>
              ) : (
                <div className="space-y-2">
                  {deductions.map((deduction, index) => (
                    <div key={index} className="flex items-center gap-2 p-3 rounded-lg bg-muted/30 border border-border">
                      <Select value={deduction.type} onValueChange={(v) => updateDeduction(index, 'type', v)}>
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DEDUCTION_TYPES.map((type) => (
                            <SelectItem key={type.id} value={type.id}>{type.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input 
                        type="number"
                        placeholder="Amount"
                        className="w-28"
                        value={deduction.amount}
                        onChange={(e) => updateDeduction(index, 'amount', Number(e.target.value))}
                      />
                      <Input 
                        placeholder="Description (optional)"
                        className="flex-1"
                        value={deduction.description}
                        onChange={(e) => updateDeduction(index, 'description', e.target.value)}
                      />
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeDeduction(index)}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Summary */}
            <div className="p-4 rounded-lg bg-muted/50 border border-border space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Basic Salary</span>
                <span className="text-foreground">AED {newPayroll.basicSalary.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Allowances</span>
                <span className="text-emerald-500">+AED {totalAllowances.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Deductions</span>
                <span className="text-destructive">-AED {totalDeductionsAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-base font-bold border-t border-border pt-2 mt-2">
                <span className="text-foreground">Net Salary</span>
                <span className="text-primary">AED {(newPayroll.basicSalary + totalAllowances - totalDeductionsAmount).toLocaleString()}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsGenerateOpen(false); resetForm(); }}>Cancel</Button>
            <Button onClick={handleGeneratePayroll} disabled={generatePayroll.isPending || !newPayroll.employeeId}>
              {generatePayroll.isPending ? 'Generating...' : 'Generate Payroll'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Payslip Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Payslip Details
            </DialogTitle>
          </DialogHeader>
          {selectedPayroll && (
            <div ref={printRef} className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Employee</p>
                  <p className="text-sm font-semibold text-foreground">{selectedPayroll.employees?.full_name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">HRMS No</p>
                  <p className="text-sm font-mono text-foreground">{selectedPayroll.employees?.hrms_no}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Period</p>
                  <p className="text-sm text-foreground">{format(new Date(selectedPayroll.month + '-01'), 'MMMM yyyy')}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">WPS Status</p>
                  <span className={cn(
                    "text-xs px-2 py-1 rounded-full",
                    selectedPayroll.wps_processed ? "bg-primary/10 text-primary" : "bg-amber-500/10 text-amber-500"
                  )}>
                    {selectedPayroll.wps_processed ? 'Processed' : 'Pending'}
                  </span>
                </div>
              </div>

              <div className="border-t border-border pt-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Basic Salary</span>
                  <span className="text-sm font-medium text-foreground">AED {selectedPayroll.basic_salary?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Allowances</span>
                  <span className="text-sm font-medium text-emerald-500">+AED {selectedPayroll.allowances?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Deductions</span>
                  <span className="text-sm font-medium text-destructive">-AED {selectedPayroll.deductions?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-t border-border pt-2 mt-2">
                  <span className="text-base font-bold text-foreground">Net Salary</span>
                  <span className="text-base font-bold text-primary">AED {selectedPayroll.net_salary?.toLocaleString()}</span>
                </div>
              </div>

              <div className="border-t border-border pt-4">
                <p className="text-xs text-muted-foreground mb-2">Bank Details</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Bank: </span>
                    <span className="text-foreground">{selectedPayroll.employees?.bank_name || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">IBAN: </span>
                    <span className="text-foreground font-mono text-xs">{selectedPayroll.employees?.iban || 'N/A'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewOpen(false)}>Close</Button>
            <Button onClick={printPayslip} className="bg-primary text-primary-foreground">
              <Printer className="w-4 h-4 mr-2" /> Print PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Payroll Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-5 h-5 text-primary" />
              Edit Payroll
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-3 rounded-lg bg-muted/30 border border-border">
              <p className="text-sm font-medium text-foreground">{selectedPayroll?.employees?.full_name}</p>
              <p className="text-xs text-muted-foreground">{format(new Date((selectedPayroll?.month || '') + '-01'), 'MMMM yyyy')}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Basic Salary (AED)</Label>
                <Input 
                  type="number"
                  value={newPayroll.basicSalary}
                  onChange={(e) => setNewPayroll({...newPayroll, basicSalary: Number(e.target.value)})}
                />
              </div>
              <div className="space-y-2">
                <Label>Total Allowances (AED)</Label>
                <Input 
                  type="number"
                  value={newPayroll.otherAllowance}
                  onChange={(e) => setNewPayroll({...newPayroll, otherAllowance: Number(e.target.value), housingAllowance: 0, transportAllowance: 0})}
                />
              </div>
            </div>

            {/* Deductions Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-foreground">Deductions</h4>
                <Button variant="outline" size="sm" onClick={addDeduction}>
                  <Plus className="w-3 h-3 mr-1" /> Add
                </Button>
              </div>
              {deductions.map((deduction, index) => (
                <div key={index} className="flex items-center gap-2 p-3 rounded-lg bg-muted/30 border border-border">
                  <Select value={deduction.type} onValueChange={(v) => updateDeduction(index, 'type', v)}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DEDUCTION_TYPES.map((type) => (
                        <SelectItem key={type.id} value={type.id}>{type.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input 
                    type="number"
                    className="w-28"
                    value={deduction.amount}
                    onChange={(e) => updateDeduction(index, 'amount', Number(e.target.value))}
                  />
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeDeduction(index)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="p-4 rounded-lg bg-muted/50 border border-border">
              <div className="flex justify-between text-base font-bold">
                <span className="text-foreground">Net Salary</span>
                <span className="text-primary">AED {(newPayroll.basicSalary + newPayroll.otherAllowance - totalDeductionsAmount).toLocaleString()}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsEditOpen(false); setSelectedPayroll(null); resetForm(); }}>Cancel</Button>
            <Button onClick={handleUpdatePayroll} disabled={updatePayroll.isPending}>
              {updatePayroll.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
