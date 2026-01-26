import { useState, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { usePayroll, useProcessWPS, useGeneratePayroll, useDeletePayroll, useUpdatePayroll } from '@/hooks/usePayroll';
import { useEmployees } from '@/hooks/useEmployees';
import { useContracts } from '@/hooks/useContracts';
import { useCompanySettings } from '@/hooks/useSettings';
import { useApprovedTicketAllowances } from '@/hooks/useTicketAllowance';
import { usePayslipEmailHistory } from '@/hooks/useEmailHistory';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { DollarSign, RefreshCw, CheckCircle, Plus, Trash2, Edit2, Download, Printer, CreditCard, Users, FileSpreadsheet, Plane, Mail, Loader2, MailCheck, MailX, Clock, Bell } from 'lucide-react';
import { useProcessTicketAllowance } from '@/hooks/useTicketAllowance';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { generatePayslipPDF, generateBulkPayrollPDF } from '@/utils/payrollPdf';
import { toast } from 'sonner';
import { TicketAllowanceReminders } from '@/components/admin/TicketAllowanceReminders';

export function PayrollView() {
  const queryClient = useQueryClient();
  
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const { data: payroll = [], isLoading, refetch } = usePayroll();
  const { data: employees = [] } = useEmployees();
  const { data: contracts = [] } = useContracts();
  const { data: settings } = useCompanySettings();
  const { data: approvedTicketAllowances = [] } = useApprovedTicketAllowances(selectedMonth);
  const processWPS = useProcessWPS();
  const generatePayroll = useGeneratePayroll();
  const deletePayroll = useDeletePayroll();
  const updatePayroll = useUpdatePayroll();

  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [isBulkGenerateOpen, setIsBulkGenerateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingPayroll, setEditingPayroll] = useState<any>(null);
  const [sendingEmailId, setSendingEmailId] = useState<string | null>(null);
  const [bulkGenerating, setBulkGenerating] = useState(false);
  const [isBulkEmailOpen, setIsBulkEmailOpen] = useState(false);
  const [bulkEmailSending, setBulkEmailSending] = useState(false);
  const [bulkEmailProgress, setBulkEmailProgress] = useState({ current: 0, total: 0, success: 0, failed: 0 });
  const [includeTicketInBulk, setIncludeTicketInBulk] = useState(false);
  const [editTicketIncluded, setEditTicketIncluded] = useState(false);
  const [editTicketAmount, setEditTicketAmount] = useState(0);
  
  const processTicketAllowance = useProcessTicketAllowance();

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

  // Email history for the selected month
  const { data: emailHistory = [], refetch: refetchEmailHistory } = usePayslipEmailHistory(selectedMonth);
  
  // Create lookup map for quick email status access with send count
  const emailStatusMap = useMemo(() => {
    const map = new Map<string, { status: string; sentAt: string; error?: string; sendCount: number }>();
    const countMap = new Map<string, number>();
    
    emailHistory.forEach(email => {
      if (email.employee_id) {
        // Count total emails per employee
        const currentCount = countMap.get(email.employee_id) || 0;
        countMap.set(email.employee_id, currentCount + 1);
        
        // Store latest status (first in list since ordered by created_at desc)
        if (!map.has(email.employee_id)) {
          map.set(email.employee_id, { 
            status: email.status, 
            sentAt: email.created_at,
            error: email.error_message || undefined,
            sendCount: 1
          });
        }
      }
    });
    
    // Update with actual counts
    countMap.forEach((count, employeeId) => {
      const existing = map.get(employeeId);
      if (existing) {
        map.set(employeeId, { ...existing, sendCount: count });
      }
    });
    
    return map;
  }, [emailHistory]);

  // Create ticket eligibility lookup - employees with approved ticket allowance NOT yet in payroll
  const ticketEligibilityMap = useMemo(() => {
    const map = new Map<string, { amount: number; recordId: string }>();
    
    approvedTicketAllowances.forEach(ticket => {
      // Find the payroll record for this employee in current month
      const payrollRecord = filteredPayroll.find(p => p.employee_id === ticket.employee_id);
      
      // If payroll exists but no ticket allowance included, mark as eligible
      if (payrollRecord && (payrollRecord.ticket_allowance || 0) === 0) {
        map.set(ticket.employee_id, {
          amount: ticket.amount || 0,
          recordId: ticket.id
        });
      }
    });
    
    return map;
  }, [approvedTicketAllowances, filteredPayroll]);

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
    let ticketIncludedCount = 0;

    for (const emp of employeesWithoutPayroll) {
      const contract = contracts.find(c => c.employee_id === emp.id && c.status === 'Active');
      
      const basicSalary = contract?.basic_salary || emp.basic_salary || 0;
      const housingAllowance = contract?.housing_allowance || 0;
      const transportAllowance = contract?.transportation_allowance || 0;
      
      // FIX: Only use other_allowances as fallback when NO contract exists
      const otherAllowances = contract ? 0 : (emp.allowance || 0);
      
      // FIX: Ticket allowance only included if checkbox is checked (optional)
      const ticketAmount = includeTicketInBulk 
        ? (approvedTicketAllowances.find(t => t.employee_id === emp.id)?.amount || 0) 
        : 0;

      try {
        await generatePayroll.mutateAsync({
          employeeId: emp.id,
          month: selectedMonth,
          basicSalary,
          housingAllowance,
          transportationAllowance: transportAllowance,
          ticketAllowance: ticketAmount,
          otherAllowances,
          deductions: 0,
          deductionReason: '',
        });
        successCount++;
        if (ticketAmount > 0) {
          ticketIncludedCount++;
        }
      } catch (error) {
        console.error(`Failed to generate payroll for ${emp.full_name}:`, error);
        errorCount++;
      }
    }

    setBulkGenerating(false);
    setIsBulkGenerateOpen(false);
    
    if (successCount > 0) {
      const ticketMsg = ticketIncludedCount > 0 ? ` (${ticketIncludedCount} with ticket allowance)` : '';
      toast.success(`Generated payroll for ${successCount} employees${ticketMsg}. You can now edit each record to add deductions.`);
    }
    if (errorCount > 0) {
      toast.error(`Failed to generate payroll for ${errorCount} employees`);
    }
  };

  const handleEditPayroll = async () => {
    if (!editingPayroll) return;
    
    const ticketAmount = editTicketIncluded ? editTicketAmount : 0;
    
    try {
      await updatePayroll.mutateAsync({
        id: editingPayroll.id,
        basicSalary: editingPayroll.basic_salary,
        housingAllowance: editingPayroll.housing_allowance || 0,
        transportationAllowance: editingPayroll.transportation_allowance || 0,
        ticketAllowance: ticketAmount,
        otherAllowances: editingPayroll.other_allowances || 0,
        deductions: editingPayroll.deductions || 0,
      });
      
      // If ticket was newly included, mark the ticket allowance record as processed
      if (editTicketIncluded && ticketEligibilityMap.has(editingPayroll.employee_id)) {
        const ticketRecord = ticketEligibilityMap.get(editingPayroll.employee_id);
        if (ticketRecord) {
          await processTicketAllowance.mutateAsync({
            id: ticketRecord.recordId,
            payrollId: editingPayroll.id
          });
        }
      }
      
      setIsEditOpen(false);
      setEditingPayroll(null);
      setEditTicketIncluded(false);
      setEditTicketAmount(0);
    } catch (error) {
      console.error('Failed to update payroll:', error);
    }
  };

  const handlePrintPayslip = async (record: any) => {
    await generatePayslipPDF(record, settings);
    const hrmsNo = record.employees?.hrms_no || '';
    const last4Hrms = hrmsNo.slice(-4) || '0000';
    toast.info(`Password: Last 4 HRMS (${last4Hrms}) + Birth Year`, {
      duration: 10000,
      description: 'Example: 00011990 (if HRMS ends in 0001 and born 1990)'
    });
  };

  const handleExportAll = () => {
    if (filteredPayroll.length === 0) return;
    generateBulkPayrollPDF(filteredPayroll, selectedMonth, settings);
  };

  const handleEmailPayslip = async (record: any) => {
    const workEmail = record.employees?.work_email;
    if (!workEmail) {
      toast.error('Employee does not have a work email configured');
      return;
    }

    setSendingEmailId(record.id);
    const toastId = toast.loading(`Sending payslip to ${workEmail}...`);

    try {
      // Generate PDF and get base64 with compression (skip logo to reduce size)
      const pdfDoc = await generatePayslipPDF(record, settings, true, true);
      if (!pdfDoc) {
        throw new Error('Failed to generate PDF');
      }
      // Use arraybuffer output and compress to reduce size
      const pdfArrayBuffer = pdfDoc.output('arraybuffer');
      const pdfBytes = new Uint8Array(pdfArrayBuffer);
      
      // Convert to base64 in chunks to avoid memory issues
      let binary = '';
      const chunkSize = 8192;
      for (let i = 0; i < pdfBytes.length; i += chunkSize) {
        const chunk = pdfBytes.subarray(i, i + chunkSize);
        binary += String.fromCharCode.apply(null, Array.from(chunk));
      }
      const pdfBase64 = btoa(binary);

      // Format month for display
      const [year, monthNum] = record.month.split('-');
      const monthDate = new Date(parseInt(year), parseInt(monthNum) - 1);
      const formattedMonth = monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

      // Call edge function with HR Manager info
      const { data, error } = await supabase.functions.invoke('send-payslip-email', {
        body: {
          employeeName: record.employees?.full_name || 'Employee',
          employeeEmail: workEmail,
          employeeId: record.employee_id,
          employeeHrmsNo: record.employees?.hrms_no || '',
          month: formattedMonth,
          pdfBase64,
          companyName: settings?.company_name || 'M.A Brain Development Center',
          hrManagerName: 'Myranel D. Plaza',
          hrManagerTitle: 'Human Resource Manager',
        }
      });

      if (error) throw error;

      toast.success(`Payslip sent to ${workEmail}`, { id: toastId });
      // Refresh email history to update badges
      refetchEmailHistory();
    } catch (error: any) {
      console.error('Failed to send payslip email:', error);
      toast.error(`Failed to send email: ${error.message}`, { id: toastId });
      refetchEmailHistory();
    } finally {
      setSendingEmailId(null);
    }
  };

  // Bulk Email All Payslips
  const recordsWithEmail = useMemo(() => 
    filteredPayroll.filter(r => r.employees?.work_email), 
    [filteredPayroll]
  );
  
  const recordsWithoutEmail = useMemo(() => 
    filteredPayroll.filter(r => !r.employees?.work_email), 
    [filteredPayroll]
  );

  const handleBulkEmailPayslips = async () => {
    if (recordsWithEmail.length === 0) {
      toast.error('No employees with work email in this month');
      return;
    }

    setIsBulkEmailOpen(false);
    setBulkEmailSending(true);
    setBulkEmailProgress({ current: 0, total: recordsWithEmail.length, success: 0, failed: 0 });

    let successCount = 0;
    let failedCount = 0;

    for (const record of recordsWithEmail) {
      try {
        // Generate PDF for each employee
        const pdfDoc = await generatePayslipPDF(record, settings, true, true);
        if (!pdfDoc) {
          throw new Error('Failed to generate PDF');
        }

        const pdfArrayBuffer = pdfDoc.output('arraybuffer');
        const pdfBytes = new Uint8Array(pdfArrayBuffer);
        
        let binary = '';
        const chunkSize = 8192;
        for (let i = 0; i < pdfBytes.length; i += chunkSize) {
          const chunk = pdfBytes.subarray(i, i + chunkSize);
          binary += String.fromCharCode.apply(null, Array.from(chunk));
        }
        const pdfBase64 = btoa(binary);

        const [year, monthNum] = record.month.split('-');
        const monthDate = new Date(parseInt(year), parseInt(monthNum) - 1);
        const formattedMonth = monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

        const { error } = await supabase.functions.invoke('send-payslip-email', {
          body: {
            employeeName: record.employees?.full_name || 'Employee',
            employeeEmail: record.employees?.work_email,
            employeeId: record.employee_id,
            employeeHrmsNo: record.employees?.hrms_no || '',
            month: formattedMonth,
            pdfBase64,
            companyName: settings?.company_name || 'M.A Brain Development Center',
            hrManagerName: 'Myranel D. Plaza',
            hrManagerTitle: 'Human Resource Manager',
          }
        });

        if (error) throw error;

        successCount++;
        setBulkEmailProgress(prev => ({ 
          ...prev, 
          current: prev.current + 1,
          success: prev.success + 1 
        }));
      } catch (error) {
        console.error(`Failed to send payslip to ${record.employees?.full_name}:`, error);
        failedCount++;
        setBulkEmailProgress(prev => ({ 
          ...prev, 
          current: prev.current + 1,
          failed: prev.failed + 1 
        }));
      }
    }

    setBulkEmailSending(false);
    // Refresh email history to update badges
    refetchEmailHistory();
    
    if (successCount > 0 && failedCount === 0) {
      toast.success(`✅ All ${successCount} payslips sent successfully!`);
    } else if (successCount > 0 && failedCount > 0) {
      toast.warning(`Sent ${successCount} payslips, ${failedCount} failed`);
    } else {
      toast.error(`Failed to send all ${failedCount} payslips`);
    }
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

            {/* Bulk Email Button */}
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setIsBulkEmailOpen(true)}
              disabled={bulkEmailSending || filteredPayroll.length === 0}
              className="border-primary text-primary hover:bg-primary/10"
            >
              {bulkEmailSending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  Sending {bulkEmailProgress.current}/{bulkEmailProgress.total}...
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4 mr-1" />
                  Email All
                </>
              )}
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
                  
                  {/* Optional: Include Ticket Allowance */}
                  {approvedTicketAllowances.length > 0 && (
                    <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <Checkbox 
                        id="includeTicket"
                        checked={includeTicketInBulk}
                        onCheckedChange={(checked) => setIncludeTicketInBulk(!!checked)}
                      />
                      <label htmlFor="includeTicket" className="flex-1 text-sm cursor-pointer">
                        <div className="flex items-center gap-2">
                          <Plane className="w-4 h-4 text-blue-500" />
                          <span className="font-medium">Include Ticket Allowance</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {approvedTicketAllowances.filter(t => 
                            employeesWithoutPayroll.some(e => e.id === t.employee_id)
                          ).length} employees eligible for ticket allowance this month
                        </p>
                      </label>
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
                      <div className="flex items-center gap-2 ml-auto lg:ml-0 flex-wrap">
                        {/* Payment Status Badge */}
                        <span className={cn(
                          "text-xs px-3 py-1 rounded-full border font-medium",
                          record.wps_processed 
                            ? "bg-primary/10 text-primary border-primary/30" 
                            : "bg-amber-500/10 text-amber-500 border-amber-500/30"
                        )}>
                          {record.wps_processed ? 'Paid' : 'Pending'}
                        </span>
                        
                        {/* Email Status Badge */}
                        {emailStatusMap.has(record.employee_id) ? (
                          <span 
                            className={cn(
                              "text-xs px-3 py-1 rounded-full border font-medium flex items-center gap-1",
                              emailStatusMap.get(record.employee_id)?.status === 'sent'
                                ? "bg-green-500/10 text-green-600 border-green-500/30"
                                : emailStatusMap.get(record.employee_id)?.status === 'failed'
                                ? "bg-destructive/10 text-destructive border-destructive/30"
                                : "bg-yellow-500/10 text-yellow-600 border-yellow-500/30"
                            )}
                            title={emailStatusMap.get(record.employee_id)?.error || undefined}
                          >
                            {emailStatusMap.get(record.employee_id)?.status === 'sent' ? (
                              <><MailCheck className="w-3 h-3" /> Emailed</>
                            ) : emailStatusMap.get(record.employee_id)?.status === 'failed' ? (
                              <><MailX className="w-3 h-3" /> Failed</>
                            ) : (
                              <><Clock className="w-3 h-3" /> Pending</>
                            )}
                          </span>
                        ) : (
                          <span className="text-xs px-3 py-1 rounded-full border font-medium bg-muted/50 text-muted-foreground border-border flex items-center gap-1">
                            <Mail className="w-3 h-3" /> Not Emailed
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      <div>
                        <p className="text-[10px] uppercase text-muted-foreground">Basic Salary</p>
                        <p className="text-sm font-medium text-foreground">AED {record.basic_salary?.toLocaleString()}</p>
                      </div>
                      <div className="group relative">
                        <p className="text-[10px] uppercase text-muted-foreground">Allowances</p>
                        <p className="text-sm font-medium text-primary cursor-help">+{record.allowances?.toLocaleString()}</p>
                        {/* Allowance Breakdown Tooltip */}
                        <div className="absolute z-20 hidden group-hover:block bg-popover border border-border rounded-lg p-3 shadow-lg text-xs w-52 top-full left-0 mt-1">
                          <p className="font-semibold text-foreground mb-2 border-b border-border pb-1">Allowance Breakdown</p>
                          <div className="space-y-1.5">
                            <p className="flex justify-between"><span className="text-muted-foreground">Housing:</span> <span className="font-medium">AED {(record.housing_allowance || 0).toLocaleString()}</span></p>
                            <p className="flex justify-between"><span className="text-muted-foreground">Transport:</span> <span className="font-medium">AED {(record.transportation_allowance || 0).toLocaleString()}</span></p>
                            {(record.ticket_allowance || 0) > 0 && (
                              <p className="flex justify-between text-blue-600"><span>Ticket:</span> <span className="font-medium">AED {record.ticket_allowance?.toLocaleString()}</span></p>
                            )}
                            {(record.other_allowances || 0) > 0 && (
                              <p className="flex justify-between"><span className="text-muted-foreground">Other:</span> <span className="font-medium">AED {record.other_allowances?.toLocaleString()}</span></p>
                            )}
                          </div>
                        </div>
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
                    {/* Ticket Allowance Badge */}
                    {(record.ticket_allowance || 0) > 0 && (
                      <div className="mt-2">
                        <span className="text-xs px-2 py-1 rounded-full bg-blue-500/10 text-blue-600 border border-blue-500/30 inline-flex items-center gap-1">
                          <Plane className="w-3 h-3" /> Ticket Allowance +AED {record.ticket_allowance?.toLocaleString()}
                        </span>
                      </div>
                    )}
                    
                    {/* Ticket Eligibility Indicator - Pulsing Bell */}
                    {ticketEligibilityMap.has(record.employee_id) && (record.ticket_allowance || 0) === 0 && (
                      <div className="mt-2 flex items-center gap-1.5 animate-pulse">
                        <Bell className="w-4 h-4 text-amber-500" />
                        <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                          Ticket Eligible: AED {ticketEligibilityMap.get(record.employee_id)?.amount.toLocaleString()}
                        </span>
                      </div>
                    )}
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
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleEmailPayslip(record)}
                      disabled={
                        !record.employees?.work_email || 
                        sendingEmailId === record.id
                      }
                      className={cn(
                        "border-border relative",
                        emailStatusMap.get(record.employee_id)?.status === 'sent' && 
                          "border-green-300 dark:border-green-800"
                      )}
                      title={
                        record.employees?.work_email 
                          ? `Send to ${record.employees.work_email}` 
                          : 'No work email configured'
                      }
                    >
                      {sendingEmailId === record.id ? (
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      ) : emailStatusMap.get(record.employee_id)?.status === 'sent' ? (
                        <MailCheck className="w-4 h-4 mr-1 text-green-600" />
                      ) : emailStatusMap.get(record.employee_id)?.status === 'failed' ? (
                        <MailX className="w-4 h-4 mr-1 text-red-500" />
                      ) : (
                        <Mail className="w-4 h-4 mr-1" />
                      )}
                      {emailStatusMap.get(record.employee_id)?.status === 'sent' ? 'Resend' : 'Email'}
                      
                      {/* Badge Counter */}
                      {(emailStatusMap.get(record.employee_id)?.sendCount || 0) > 0 && (
                        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold rounded-full bg-green-500 text-white">
                          {emailStatusMap.get(record.employee_id)?.sendCount}
                        </span>
                      )}
                    </Button>
                    {!record.wps_processed && (
                      <>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            const ticketEligible = ticketEligibilityMap.get(record.employee_id);
                            const hasTicketAlready = (record.ticket_allowance || 0) > 0;
                            
                            setEditingPayroll({
                              ...record,
                              housing_allowance: record.housing_allowance || 0,
                              transportation_allowance: record.transportation_allowance || 0,
                              ticket_allowance: record.ticket_allowance || 0,
                              other_allowances: record.other_allowances || 0,
                            });
                            setEditTicketIncluded(hasTicketAlready);
                            setEditTicketAmount(hasTicketAlready ? (record.ticket_allowance || 0) : (ticketEligible?.amount || 0));
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
        <DialogContent className="max-w-md">
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
                  <Label>Housing (AED)</Label>
                  <Input
                    type="number"
                    value={editingPayroll.housing_allowance}
                    onChange={(e) => setEditingPayroll({...editingPayroll, housing_allowance: Number(e.target.value)})}
                  />
                </div>
                <div>
                  <Label>Transport (AED)</Label>
                  <Input
                    type="number"
                    value={editingPayroll.transportation_allowance}
                    onChange={(e) => setEditingPayroll({...editingPayroll, transportation_allowance: Number(e.target.value)})}
                  />
                </div>
                <div>
                  <Label>Other Allowances (AED)</Label>
                  <Input
                    type="number"
                    value={editingPayroll.other_allowances}
                    onChange={(e) => setEditingPayroll({...editingPayroll, other_allowances: Number(e.target.value)})}
                  />
                </div>
              </div>
              
              {/* Ticket Allowance Option */}
              {(ticketEligibilityMap.has(editingPayroll.employee_id) || (editingPayroll.ticket_allowance || 0) > 0) && editTicketAmount > 0 && (
                <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <Checkbox 
                    id="editTicketAllowance"
                    checked={editTicketIncluded}
                    onCheckedChange={(checked) => setEditTicketIncluded(!!checked)}
                  />
                  <label htmlFor="editTicketAllowance" className="flex-1 text-sm cursor-pointer">
                    <div className="flex items-center gap-2">
                      <Plane className="w-4 h-4 text-blue-500" />
                      <span className="font-medium">Include Ticket Allowance</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Add AED {editTicketAmount.toLocaleString()} for biennial ticket allowance
                    </p>
                  </label>
                </div>
              )}
              
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
                  <span className="font-medium">AED {(
                    editingPayroll.basic_salary + 
                    (editingPayroll.housing_allowance || 0) + 
                    (editingPayroll.transportation_allowance || 0) + 
                    (editTicketIncluded ? editTicketAmount : 0) + 
                    (editingPayroll.other_allowances || 0)
                  ).toLocaleString()}</span>
                </div>
                {editTicketIncluded && (
                  <div className="flex justify-between text-sm mt-1 text-blue-600">
                    <span>+ Ticket Allowance:</span>
                    <span className="font-medium">AED {editTicketAmount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-muted-foreground">Deductions:</span>
                  <span className="text-destructive">-AED {(editingPayroll.deductions || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-lg font-bold mt-2 pt-2 border-t border-border">
                  <span>Net Salary:</span>
                  <span className="text-primary">
                    AED {(
                      editingPayroll.basic_salary + 
                      (editingPayroll.housing_allowance || 0) + 
                      (editingPayroll.transportation_allowance || 0) + 
                      (editTicketIncluded ? editTicketAmount : 0) + 
                      (editingPayroll.other_allowances || 0) - 
                      (editingPayroll.deductions || 0)
                    ).toLocaleString()}
                  </span>
                </div>
              </div>
              
              <Button onClick={handleEditPayroll} disabled={updatePayroll.isPending || processTicketAllowance.isPending} className="w-full">
                {(updatePayroll.isPending || processTicketAllowance.isPending) ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Bulk Email Confirmation Dialog */}
      <AlertDialog open={isBulkEmailOpen} onOpenChange={setIsBulkEmailOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-primary" />
              Send All Payslips via Email
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  This will send password-protected payslip PDFs to all employees with email addresses for <strong>{months.find(m => m.value === selectedMonth)?.label}</strong>.
                </p>
                <div className="bg-secondary/50 rounded-lg p-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Employees with email:</span>
                    <span className="font-bold text-primary">{recordsWithEmail.length}</span>
                  </div>
                  {recordsWithoutEmail.length > 0 && (
                    <div className="flex justify-between text-sm text-amber-600">
                      <span>⚠️ Missing work email:</span>
                      <span className="font-medium">{recordsWithoutEmail.length}</span>
                    </div>
                  )}
                </div>
                {recordsWithoutEmail.length > 0 && (
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-2 text-xs text-amber-700">
                    The following employees will be skipped: {recordsWithoutEmail.map(r => r.employees?.full_name).join(', ')}
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleBulkEmailPayslips}
              disabled={recordsWithEmail.length === 0}
              className="bg-primary hover:bg-primary/90"
            >
              <Mail className="w-4 h-4 mr-1" />
              Send {recordsWithEmail.length} Emails
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
