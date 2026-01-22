import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface PayrollEarning {
  id: string;
  earning_type: string;
  description?: string;
  amount: number;
}

interface PayrollDeduction {
  id: string;
  deduction_type: string;
  reason: string;
  amount: number;
  days?: number;
}

interface PayrollRecord {
  id: string;
  employee_id: string;
  month: string;
  basic_salary: number;
  housing_allowance?: number;
  transportation_allowance?: number;
  ticket_allowance?: number;
  other_allowances?: number;
  allowances: number;
  deductions: number;
  deduction_reason?: string;
  net_salary: number;
  wps_processed: boolean;
  created_at?: string;
  employees?: {
    full_name: string;
    hrms_no: string;
    bank_name: string | null;
    iban: string | null;
    bank_account_no: string | null;
    department: string;
    job_position: string;
    work_email?: string;
    joining_date?: string;
    contract_type?: string;
    photo_url?: string;
  };
  payroll_earnings?: PayrollEarning[];
  payroll_deductions?: PayrollDeduction[];
  ticket_allowance_status?: 'eligible' | 'not_eligible' | 'processed' | 'pending';
}

interface CompanySettings {
  company_name?: string;
  company_name_arabic?: string;
  address?: string;
  city?: string;
  emirate?: string;
  country?: string;
  phone?: string;
  email?: string;
  website?: string;
  logo_url?: string;
  work_hours_per_day?: number;
  currency?: string;
}

// Color palette
const COLORS = {
  primary: [45, 90, 69] as [number, number, number],
  primaryLight: [240, 248, 243] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  text: [60, 60, 60] as [number, number, number],
  textLight: [120, 120, 120] as [number, number, number],
  deduction: [220, 53, 53] as [number, number, number],
  netPayBg: [45, 90, 69] as [number, number, number],
  ticketIcon: [59, 130, 246] as [number, number, number],
};

export async function generatePayslipPDF(record: PayrollRecord, settings?: CompanySettings | null, returnDoc: boolean = false, skipLogo: boolean = false): Promise<jsPDF | void> {
  // Employee's HRMS number as password for security
  const userPassword = record.employees?.hrms_no || 'payslip';
  
  const doc = new jsPDF({ 
    compress: true,
    encryption: {
      userPassword: userPassword,
      ownerPassword: 'MABDC_HR_2024_ADMIN',
      userPermissions: ['print'] // Only allow printing, no copy/edit
    }
  });
  
  // Set document metadata for audit trail
  const companyName = settings?.company_name || 'MABDC';
  const employeeName = record.employees?.full_name || 'Employee';
  const monthData = formatMonthData(record.month);
  
  doc.setProperties({
    title: `Payslip - ${employeeName} - ${monthData.monthName} ${monthData.year}`,
    subject: 'Monthly Payslip - Confidential',
    author: companyName,
    keywords: 'payslip, confidential, salary',
    creator: 'MABDC HRMS'
  });
  
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  
  // Company info (use already declared companyName)
  const companyAddress = settings?.address || 'Al Salam St. Al Ferdous Tower';
  const companyCity = settings?.city || settings?.emirate || 'Abu Dhabi';
  const companyCountry = settings?.country || 'United Arab Emirates';
  const companyPhone = settings?.phone || '';
  const companyEmail = settings?.email || '';
  const currency = settings?.currency || 'AED';
  
  // ============ HEADER SECTION ============
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  // Company logo - try to load from URL, fallback to initials
  // Skip logo loading for email to reduce PDF size
  const logoUrl = settings?.logo_url;
  let logoLoaded = false;
  
  if (logoUrl && !skipLogo) {
    try {
      const response = await fetch(logoUrl);
      const blob = await response.blob();
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      
      // Add logo image (20x20 size, positioned in header)
      doc.addImage(base64, 'PNG', margin + 2, 10, 20, 20);
      logoLoaded = true;
    } catch (error) {
      console.warn('Failed to load company logo:', error);
    }
  }
  
  // Fallback to initials if logo didn't load
  if (!logoLoaded) {
    const initials = companyName.split(' ').map(w => w[0]).join('').substring(0, 3);
    doc.setFillColor(...COLORS.white);
    doc.circle(margin + 12, 20, 10, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.primary);
    doc.text(initials, margin + 12, 22, { align: 'center' });
  }
  
  // Company info on right
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(companyName.toUpperCase(), pageWidth - margin, 15, { align: 'right' });
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(companyAddress, pageWidth - margin, 24, { align: 'right' });
  doc.text(`${companyCity}, ${companyCountry}`, pageWidth - margin, 29, { align: 'right' });
  
  if (companyPhone || companyEmail) {
    const contactInfo = [companyPhone, companyEmail].filter(Boolean).join(' | ');
    doc.setFontSize(7);
    doc.text(contactInfo, pageWidth - margin, 35, { align: 'right' });
  }
  
  // ============ PAYSLIP TITLE ============
  doc.setFillColor(...COLORS.primaryLight);
  doc.rect(0, 40, pageWidth, 18, 'F');
  
  doc.setTextColor(...COLORS.primary);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('PAYSLIP', pageWidth / 2, 50, { align: 'center' });
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Pay Period: ${monthData.startDate} - ${monthData.endDate}`, pageWidth / 2, 55, { align: 'center' });
  
  // Currency indicator
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.textLight);
  doc.text(`Currency: ${currency}`, pageWidth - margin, 50, { align: 'right' });
  
  // ============ EMPLOYEE & PAYMENT INFO (TWO COLUMNS) ============
  const infoStartY = 65;
  const colWidth = (pageWidth - margin * 3) / 2;
  
  // Left Column - Employee Information
  doc.setFillColor(...COLORS.primaryLight);
  doc.roundedRect(margin, infoStartY, colWidth, 50, 2, 2, 'F');
  doc.setDrawColor(...COLORS.primary);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, infoStartY, colWidth, 50, 2, 2, 'S');
  
  // Header bar
  doc.setFillColor(...COLORS.primary);
  doc.rect(margin, infoStartY, colWidth, 8, 'F');
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('EMPLOYEE INFORMATION', margin + colWidth / 2, infoStartY + 5.5, { align: 'center' });
  
  // Employee details
  doc.setTextColor(...COLORS.text);
  doc.setFontSize(8);
  let leftY = infoStartY + 16;
  const lineHeight = 7;
  const leftLabelX = margin + 4;
  const leftValueX = margin + 35;
  
  const drawInfoRow = (label: string, value: string, y: number, leftX: number, valueX: number) => {
    doc.setFont('helvetica', 'bold');
    doc.text(label, leftX, y);
    doc.setFont('helvetica', 'normal');
    doc.text(value || 'N/A', valueX, y);
  };
  
  drawInfoRow('Name:', record.employees?.full_name || 'N/A', leftY, leftLabelX, leftValueX);
  leftY += lineHeight;
  drawInfoRow('Employee ID:', record.employees?.hrms_no || 'N/A', leftY, leftLabelX, leftValueX);
  leftY += lineHeight;
  drawInfoRow('Position:', record.employees?.job_position || 'N/A', leftY, leftLabelX, leftValueX);
  leftY += lineHeight;
  drawInfoRow('Department:', record.employees?.department || 'N/A', leftY, leftLabelX, leftValueX);
  leftY += lineHeight;
  
  const joiningDate = record.employees?.joining_date 
    ? new Date(record.employees.joining_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : 'N/A';
  drawInfoRow('Joined:', joiningDate, leftY, leftLabelX, leftValueX);
  
  // Right Column - Payment Details
  const rightX = margin * 2 + colWidth;
  doc.setFillColor(...COLORS.primaryLight);
  doc.roundedRect(rightX, infoStartY, colWidth, 50, 2, 2, 'F');
  doc.setDrawColor(...COLORS.primary);
  doc.roundedRect(rightX, infoStartY, colWidth, 50, 2, 2, 'S');
  
  // Header bar
  doc.setFillColor(...COLORS.primary);
  doc.rect(rightX, infoStartY, colWidth, 8, 'F');
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('PAYMENT DETAILS', rightX + colWidth / 2, infoStartY + 5.5, { align: 'center' });
  
  // Payment details
  doc.setTextColor(...COLORS.text);
  let rightY = infoStartY + 16;
  const rightLabelX = rightX + 4;
  const rightValueX = rightX + 38;
  
  const payDate = record.created_at 
    ? new Date(record.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  
  drawInfoRow('Pay Date:', payDate, rightY, rightLabelX, rightValueX);
  rightY += lineHeight;
  drawInfoRow('Pay Period:', `${monthData.monthName} ${monthData.year}`, rightY, rightLabelX, rightValueX);
  rightY += lineHeight;
  
  // WPS Status with color
  doc.setFont('helvetica', 'bold');
  doc.text('Status:', rightLabelX, rightY);
  doc.setFont('helvetica', 'bold');
  if (record.wps_processed) {
    doc.setTextColor(...COLORS.primary);
    doc.text('WPS Processed', rightValueX, rightY);
    // Add a small green circle indicator instead of checkmark
    doc.setFillColor(...COLORS.primary);
    doc.circle(rightValueX + 36, rightY - 1.5, 2, 'F');
  } else {
    doc.setTextColor(245, 158, 11);
    doc.text('Pending', rightValueX, rightY);
  }
  
  rightY += lineHeight;
  doc.setTextColor(...COLORS.text);
  drawInfoRow('Bank:', record.employees?.bank_name || 'Not specified', rightY, rightLabelX, rightValueX);
  rightY += lineHeight;
  
  const ibanDisplay = record.employees?.iban 
    ? `${record.employees.iban.substring(0, 8)}...` 
    : 'N/A';
  drawInfoRow('IBAN:', ibanDisplay, rightY, rightLabelX, rightValueX);
  
  // ============ EARNINGS TABLE ============
  const earningsStartY = infoStartY + 58;
  
  // Get itemized earnings or calculate from record
  const earnings = getEarningsBreakdown(record);
  const grossEarnings = earnings.reduce((sum, e) => sum + e.amount, 0);
  
  const earningsBody: (string | { content: string; styles?: Record<string, unknown> })[][] = earnings.map(e => [
    e.label,
    formatCurrency(e.amount, currency)
  ]);
  
  autoTable(doc, {
    startY: earningsStartY,
    head: [['EARNINGS', 'AMOUNT']],
    body: earningsBody,
    foot: [['GROSS EARNINGS', formatCurrency(grossEarnings, currency)]],
    theme: 'grid',
    headStyles: { 
      fillColor: COLORS.primary,
      textColor: COLORS.white,
      fontStyle: 'bold',
      fontSize: 9,
      halign: 'left'
    },
    footStyles: {
      fillColor: COLORS.primaryLight,
      textColor: COLORS.primary,
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: {
      fontSize: 9,
      textColor: COLORS.text,
    },
    columnStyles: {
      0: { cellWidth: pageWidth - margin * 2 - 50, halign: 'left' },
      1: { cellWidth: 50, halign: 'right' }
    },
    margin: { left: margin, right: margin },
  });
  
  // ============ DEDUCTIONS TABLE ============
  const deductionsStartY = (doc as any).lastAutoTable.finalY + 5;
  
  const deductions = getDeductionsBreakdown(record);
  const totalDeductions = deductions.reduce((sum, d) => sum + d.amount, 0);
  
  if (deductions.length > 0 || record.deductions > 0) {
    const deductionsBody: string[][] = deductions.length > 0 
      ? deductions.map(d => [
          d.label + (d.days ? ` (${d.days} day${d.days > 1 ? 's' : ''})` : ''),
          `-${formatCurrency(d.amount, currency)}`
        ])
      : [[
          record.deduction_reason || 'Deductions',
          `-${formatCurrency(record.deductions, currency)}`
        ]];
    
    autoTable(doc, {
      startY: deductionsStartY,
      head: [['DEDUCTIONS', 'AMOUNT']],
      body: deductionsBody,
      foot: [['TOTAL DEDUCTIONS', `-${formatCurrency(totalDeductions > 0 ? totalDeductions : record.deductions, currency)}`]],
      theme: 'grid',
      headStyles: { 
        fillColor: COLORS.primary,
        textColor: COLORS.white,
        fontStyle: 'bold',
        fontSize: 9,
        halign: 'left'
      },
      footStyles: {
        fillColor: COLORS.primaryLight,
        textColor: COLORS.deduction,
        fontStyle: 'bold',
        fontSize: 9,
      },
      bodyStyles: {
        fontSize: 9,
        textColor: COLORS.deduction,
      },
      columnStyles: {
        0: { cellWidth: pageWidth - margin * 2 - 50, halign: 'left', textColor: COLORS.text },
        1: { cellWidth: 50, halign: 'right' }
      },
      margin: { left: margin, right: margin },
    });
  }
  
  // ============ NET PAY SECTION ============
  const netPayY = (doc as any).lastAutoTable.finalY + 8;
  
  // Net pay box with prominent styling
  doc.setFillColor(...COLORS.netPayBg);
  doc.roundedRect(margin, netPayY, pageWidth - margin * 2, 16, 3, 3, 'F');
  
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('NET PAY', margin + 8, netPayY + 10);
  
  doc.setFontSize(14);
  doc.text(`${currency} ${record.net_salary?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, pageWidth - margin - 8, netPayY + 10, { align: 'right' });
  
  // ============ TICKET ALLOWANCE STATUS ============
  const ticketStatusY = netPayY + 24;
  
  if (record.ticket_allowance_status) {
    doc.setFillColor(240, 249, 255);
    doc.roundedRect(margin, ticketStatusY, pageWidth - margin * 2, 12, 2, 2, 'F');
    doc.setDrawColor(...COLORS.ticketIcon);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, ticketStatusY, pageWidth - margin * 2, 12, 2, 2, 'S');
    
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.ticketIcon);
    doc.setFont('helvetica', 'bold');
    // Use text label instead of plane emoji (Unicode not supported by jsPDF default fonts)
    doc.text('[FLIGHT]', margin + 4, ticketStatusY + 7.5);
    doc.text('Ticket Allowance Status:', margin + 22, ticketStatusY + 7.5);
    
    let statusText = '';
    switch (record.ticket_allowance_status) {
      case 'processed':
        statusText = 'PROCESSED IN THIS PAYSLIP';
        doc.setTextColor(...COLORS.primary);
        break;
      case 'eligible':
        statusText = 'ELIGIBLE - PENDING APPROVAL';
        doc.setTextColor(245, 158, 11);
        break;
      case 'pending':
        statusText = 'PENDING PROCESSING';
        doc.setTextColor(245, 158, 11);
        break;
      default:
        statusText = 'NOT YET ELIGIBLE';
        doc.setTextColor(...COLORS.textLight);
    }
    doc.text(statusText, margin + 58, ticketStatusY + 7.5);
  }
  
  // ============ WATERMARK ============
  // Add semi-transparent diagonal watermark with employee name
  doc.saveGraphicsState();
  const gState = new (doc as any).GState({ opacity: 0.06 });
  doc.setGState(gState);
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(45);
  doc.setFont('helvetica', 'bold');
  
  const watermarkText = (record.employees?.full_name || 'CONFIDENTIAL').toUpperCase();
  // Position watermark diagonally across the page
  const centerX = pageWidth / 2;
  const centerY = pageHeight / 2;
  doc.text(watermarkText, centerX, centerY, { 
    align: 'center',
    angle: 45
  });
  doc.restoreGraphicsState();
  
  // ============ FOOTER ============
  const footerY = pageHeight - 25;
  
  // Divider line
  doc.setDrawColor(...COLORS.textLight);
  doc.setLineWidth(0.2);
  doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);
  
  // Disclaimer
  doc.setFontSize(7);
  doc.setTextColor(...COLORS.textLight);
  doc.setFont('helvetica', 'italic');
  doc.text('This is a system-generated payslip. No signature required.', pageWidth / 2, footerY, { align: 'center' });
  doc.text('Confidential - For employee use only. Password protected.', pageWidth / 2, footerY + 4, { align: 'center' });
  
  // WPS compliance and timestamp
  doc.setFont('helvetica', 'normal');
  doc.text('UAE WPS Compliant | Encrypted', margin, footerY + 10);
  doc.text(`Generated: ${new Date().toLocaleString('en-GB')}`, pageWidth - margin, footerY + 10, { align: 'right' });
  
  // Return or save
  if (returnDoc) {
    return doc;
  }
  
  const fileName = `payslip-${record.employees?.hrms_no || 'employee'}-${record.month}.pdf`;
  doc.save(fileName);
}

export function generateBulkPayrollPDF(records: PayrollRecord[], month: string, settings?: CompanySettings | null) {
  const doc = new jsPDF('landscape');
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  
  const companyName = settings?.company_name || 'MABDC';
  const currency = settings?.currency || 'AED';
  const monthData = formatMonthData(month);
  
  // Header
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, pageWidth, 28, 'F');
  
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(`${companyName} - Monthly Payroll Report`, margin, 16);
  
  doc.setFontSize(11);
  doc.text(`${monthData.monthName} ${monthData.year}`, pageWidth - margin, 16, { align: 'right' });
  
  // Summary Stats
  doc.setTextColor(...COLORS.text);
  doc.setFontSize(9);
  const totalBasic = records.reduce((sum, r) => sum + (r.basic_salary || 0), 0);
  const totalAllowances = records.reduce((sum, r) => sum + (r.allowances || 0), 0);
  const totalDeductions = records.reduce((sum, r) => sum + (r.deductions || 0), 0);
  const totalNet = records.reduce((sum, r) => sum + (r.net_salary || 0), 0);
  const paidCount = records.filter(r => r.wps_processed).length;
  
  doc.text(`Total Employees: ${records.length}  |  Paid: ${paidCount}  |  Pending: ${records.length - paidCount}  |  Total Net: ${currency} ${totalNet.toLocaleString()}`, margin, 38);
  
  // Table
  const tableData: (string | { content: string; styles?: Record<string, unknown> })[][] = records.map(r => [
    r.employees?.hrms_no || '',
    r.employees?.full_name || '',
    r.employees?.department || '',
    formatCurrency(r.basic_salary, currency),
    formatCurrency(r.allowances, currency),
    formatCurrency(r.deductions, currency),
    formatCurrency(r.net_salary, currency),
    r.wps_processed ? 'Paid' : 'Pending',
    r.employees?.bank_name || '-'
  ]);
  
  autoTable(doc, {
    startY: 45,
    head: [['HRMS', 'Employee Name', 'Department', 'Basic Salary', 'Allowances', 'Deductions', 'Net Salary', 'Status', 'Bank']],
    body: tableData,
    foot: [[
      '', 
      'TOTAL',
      '',
      formatCurrency(totalBasic, currency),
      formatCurrency(totalAllowances, currency),
      formatCurrency(totalDeductions, currency),
      formatCurrency(totalNet, currency),
      '', ''
    ]],
    theme: 'grid',
    headStyles: { 
      fillColor: COLORS.primary,
      textColor: COLORS.white,
      fontStyle: 'bold',
      fontSize: 8
    },
    footStyles: {
      fillColor: COLORS.primaryLight,
      textColor: COLORS.primary,
      fontStyle: 'bold',
      fontSize: 8
    },
    bodyStyles: {
      fontSize: 8
    },
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: 45 },
      2: { cellWidth: 30 },
      3: { cellWidth: 30, halign: 'right' },
      4: { cellWidth: 28, halign: 'right' },
      5: { cellWidth: 28, halign: 'right' },
      6: { cellWidth: 32, halign: 'right' },
      7: { cellWidth: 22, halign: 'center' },
      8: { cellWidth: 35 }
    },
    margin: { left: margin, right: margin },
    didParseCell: function(data) {
      // Style status column
      if (data.column.index === 7 && data.section === 'body') {
        if (data.cell.raw === 'Paid') {
          data.cell.styles.textColor = COLORS.primary;
        } else {
          data.cell.styles.textColor = [245, 158, 11];
        }
      }
    }
  });
  
  // Footer
  const finalY = (doc as any).lastAutoTable.finalY + 12;
  doc.setFontSize(7);
  doc.setTextColor(...COLORS.textLight);
  doc.text(`Generated: ${new Date().toLocaleString('en-GB')}`, margin, finalY);
  doc.text('UAE WPS Compliant Report | Confidential', pageWidth - margin, finalY, { align: 'right' });
  
  // Save
  doc.save(`payroll-report-${month}.pdf`);
}

// Helper functions
function formatMonthData(month: string) {
  const [year, monthNum] = month.split('-');
  const date = new Date(parseInt(year), parseInt(monthNum) - 1);
  const lastDay = new Date(parseInt(year), parseInt(monthNum), 0).getDate();
  
  return {
    year,
    monthNum,
    monthName: date.toLocaleDateString('en-US', { month: 'long' }),
    startDate: `01 ${date.toLocaleDateString('en-US', { month: 'short' })} ${year}`,
    endDate: `${lastDay} ${date.toLocaleDateString('en-US', { month: 'short' })} ${year}`
  };
}

function formatCurrency(amount: number, currency: string = 'AED'): string {
  return `${currency} ${(amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function getEarningsBreakdown(record: PayrollRecord): Array<{ label: string; amount: number }> {
  // If we have itemized earnings from the database, use those
  if (record.payroll_earnings && record.payroll_earnings.length > 0) {
    return record.payroll_earnings.map(e => ({
      label: formatEarningLabel(e.earning_type),
      amount: e.amount
    }));
  }
  
  // Otherwise, use the stored breakdown or calculate from totals
  const earnings: Array<{ label: string; amount: number }> = [];
  
  if (record.basic_salary > 0) {
    earnings.push({ label: 'Basic Salary', amount: record.basic_salary });
  }
  
  if (record.housing_allowance && record.housing_allowance > 0) {
    earnings.push({ label: 'Housing Rental Allowance', amount: record.housing_allowance });
  }
  
  if (record.transportation_allowance && record.transportation_allowance > 0) {
    earnings.push({ label: 'Transportation Allowance', amount: record.transportation_allowance });
  }
  
  if (record.ticket_allowance && record.ticket_allowance > 0) {
    earnings.push({ label: 'Ticket Allowance', amount: record.ticket_allowance });
  }
  
  if (record.other_allowances && record.other_allowances > 0) {
    earnings.push({ label: 'Other Allowances', amount: record.other_allowances });
  }
  
  // If no breakdown available, estimate from totals
  if (earnings.length === 0 || (earnings.length === 1 && record.allowances > 0)) {
    const basicSalary = record.basic_salary || 0;
    const allowances = record.allowances || 0;
    
    earnings.length = 0; // Clear
    earnings.push({ label: 'Basic Salary', amount: basicSalary });
    
    if (allowances > 0) {
      // Estimate typical UAE breakdown: 60% housing, 25% transport, 15% other
      const housing = Math.round(allowances * 0.60);
      const transport = Math.round(allowances * 0.25);
      const other = allowances - housing - transport;
      
      if (housing > 0) earnings.push({ label: 'Housing Rental Allowance', amount: housing });
      if (transport > 0) earnings.push({ label: 'Transportation Allowance', amount: transport });
      if (other > 0) earnings.push({ label: 'Other Allowances', amount: other });
    }
  }
  
  return earnings;
}

function getDeductionsBreakdown(record: PayrollRecord): Array<{ label: string; amount: number; days?: number }> {
  // If we have itemized deductions from the database, use those
  if (record.payroll_deductions && record.payroll_deductions.length > 0) {
    return record.payroll_deductions.map(d => ({
      label: d.reason || formatDeductionLabel(d.deduction_type),
      amount: d.amount,
      days: d.days
    }));
  }
  
  // If there's a deduction with reason, use that
  if (record.deductions > 0 && record.deduction_reason) {
    return [{
      label: record.deduction_reason,
      amount: record.deductions
    }];
  }
  
  return [];
}

function formatEarningLabel(type: string): string {
  const labels: Record<string, string> = {
    'basic_salary': 'Basic Salary',
    'housing_allowance': 'Housing Rental Allowance',
    'transport_allowance': 'Transportation Allowance',
    'transportation_allowance': 'Transportation Allowance',
    'ticket_allowance': 'Ticket Allowance',
    'other_allowances': 'Other Allowances',
    'other': 'Other Allowances',
  };
  return labels[type] || type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function formatDeductionLabel(type: string): string {
  const labels: Record<string, string> = {
    'lop': 'Loss of Pay',
    'custom': 'Deduction',
    'absence': 'Absence Deduction',
  };
  return labels[type] || type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}
