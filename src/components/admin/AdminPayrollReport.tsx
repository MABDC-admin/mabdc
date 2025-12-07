import { useState, useMemo } from 'react';
import { usePayroll, useGeneratePayroll } from '@/hooks/usePayroll';
import { useEmployees } from '@/hooks/useEmployees';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, DollarSign, Calendar, Users, Plus, CheckCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export function AdminPayrollReport() {
  const { data: payroll = [] } = usePayroll();
  const { data: employees = [] } = useEmployees();
  const generatePayroll = useGeneratePayroll();
  
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(format(currentDate, 'yyyy-MM'));
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [newPayroll, setNewPayroll] = useState({
    employeeId: '',
    month: format(currentDate, 'yyyy-MM'),
    basicSalary: 0,
    allowances: 0,
    deductions: 0,
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

  const handleGeneratePayroll = async () => {
    if (!newPayroll.employeeId) return;
    try {
      await generatePayroll.mutateAsync({
        employeeId: newPayroll.employeeId,
        month: newPayroll.month,
        basicSalary: newPayroll.basicSalary,
        allowances: newPayroll.allowances,
        deductions: newPayroll.deductions,
      });
      setIsGenerateOpen(false);
      setNewPayroll({
        employeeId: '',
        month: format(currentDate, 'yyyy-MM'),
        basicSalary: 0,
        allowances: 0,
        deductions: 0,
      });
    } catch (error) {
      console.error('Failed to generate payroll:', error);
    }
  };

  const handleEmployeeSelect = (employeeId: string) => {
    const employee = employees.find(e => e.id === employeeId);
    setNewPayroll({
      ...newPayroll,
      employeeId,
      basicSalary: employee?.basic_salary || 0,
      allowances: employee?.allowance || 0,
    });
  };

  const downloadCSV = () => {
    const headers = ['HRMS No', 'Employee Name', 'Month', 'Basic Salary', 'Allowances', 'Deductions', 'Net Salary', 'WPS Status'];
    const rows = filteredPayroll.map(p => [
      p.employees?.hrms_no || '',
      p.employees?.full_name || '',
      p.month,
      p.basic_salary,
      p.allowances,
      p.deductions,
      p.net_salary,
      p.wps_processed ? 'Processed' : 'Pending',
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payroll-report-${selectedMonth}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="glass-card rounded-3xl border border-border p-6 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Monthly Payroll Report</h2>
          <p className="text-xs text-muted-foreground">Generate payroll and download reports</p>
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
              <TableHead className="text-center">WPS Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPayroll.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
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
                    <span className={cn(
                      "text-xs px-2 py-1 rounded-full",
                      record.wps_processed 
                        ? "bg-primary/10 text-primary" 
                        : "bg-amber-500/10 text-amber-500"
                    )}>
                      {record.wps_processed ? 'Processed' : 'Pending'}
                    </span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Generate Payroll Dialog */}
      <Dialog open={isGenerateOpen} onOpenChange={setIsGenerateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-primary" />
              Generate Payroll
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
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
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Basic Salary</Label>
                <Input 
                  type="number"
                  value={newPayroll.basicSalary}
                  onChange={(e) => setNewPayroll({...newPayroll, basicSalary: Number(e.target.value)})}
                />
              </div>
              <div className="space-y-2">
                <Label>Allowances</Label>
                <Input 
                  type="number"
                  value={newPayroll.allowances}
                  onChange={(e) => setNewPayroll({...newPayroll, allowances: Number(e.target.value)})}
                />
              </div>
              <div className="space-y-2">
                <Label>Deductions</Label>
                <Input 
                  type="number"
                  value={newPayroll.deductions}
                  onChange={(e) => setNewPayroll({...newPayroll, deductions: Number(e.target.value)})}
                />
              </div>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 border border-border">
              <p className="text-xs text-muted-foreground">Net Salary</p>
              <p className="text-lg font-bold text-foreground">
                AED {(newPayroll.basicSalary + newPayroll.allowances - newPayroll.deductions).toLocaleString()}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsGenerateOpen(false)}>Cancel</Button>
            <Button onClick={handleGeneratePayroll} disabled={generatePayroll.isPending}>
              {generatePayroll.isPending ? 'Generating...' : 'Generate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
