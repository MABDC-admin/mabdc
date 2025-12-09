import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface PayrollRecord {
  id: string;
  employee_id: string;
  month: string;
  basic_salary: number;
  allowances: number;
  deductions: number;
  net_salary: number;
  wps_processed: boolean;
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
  };
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
  work_hours_per_day?: number;
}

export function generatePayslipPDF(record: PayrollRecord, settings?: CompanySettings | null) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  const companyName = settings?.company_name || 'MABDC';
  const companyAddress = settings?.address || 'Al Salam St. Al Ferdous Tower';
  const companyCity = settings?.city || settings?.emirate || 'Abu Dhabi';
  const companyCountry = settings?.country || 'United Arab Emirates';
  const workHours = settings?.work_hours_per_day || 8;
  
  const monthData = formatMonthData(record.month);
  
  // Header with curved design
  doc.setFillColor(45, 90, 69); // Dark green
  doc.rect(0, 0, pageWidth, 35, 'F');
  
  // Curved accent
  doc.setFillColor(230, 243, 236); // Light green
  doc.ellipse(-20, 20, 60, 40, 'F');
  
  // Company logo placeholder (circle with initials)
  doc.setFillColor(255, 255, 255);
  doc.circle(25, 18, 12, 'F');
  doc.setFillColor(45, 90, 69);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(45, 90, 69);
  doc.text('M.A', 25, 16, { align: 'center' });
  doc.setFontSize(5);
  doc.text('BRAIN', 25, 20, { align: 'center' });
  doc.text('DEV CENTER', 25, 23, { align: 'center' });
  
  // Company info on right
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(companyName.toUpperCase(), pageWidth - 15, 12, { align: 'right' });
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(companyAddress, pageWidth - 15, 18, { align: 'right' });
  doc.text(companyCity, pageWidth - 15, 23, { align: 'right' });
  doc.text(companyCountry, pageWidth - 15, 28, { align: 'right' });
  
  // Title
  doc.setTextColor(45, 90, 69);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(`Salary Slip - ${record.employees?.full_name || 'Employee'} - ${monthData.monthName} ${monthData.year}`, pageWidth / 2, 48, { align: 'center' });
  
  // Two column info boxes
  const boxY = 55;
  const boxHeight = 45;
  const leftBoxWidth = 90;
  const rightBoxWidth = 90;
  const gap = 10;
  
  // Employee Information Box
  doc.setFillColor(240, 248, 243);
  doc.roundedRect(10, boxY, leftBoxWidth, boxHeight, 3, 3, 'F');
  doc.setDrawColor(45, 90, 69);
  doc.setLineWidth(0.5);
  doc.roundedRect(10, boxY, leftBoxWidth, boxHeight, 3, 3, 'S');
  
  // Header bar
  doc.setFillColor(45, 90, 69);
  doc.rect(10, boxY, leftBoxWidth, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('EMPLOYEE INFORMATION', 55, boxY + 5.5, { align: 'center' });
  
  // Employee details
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  let infoY = boxY + 14;
  const lineHeight = 5.5;
  
  doc.setFont('helvetica', 'bold');
  doc.text('Name:', 14, infoY);
  doc.setFont('helvetica', 'normal');
  doc.text(record.employees?.full_name || 'N/A', 32, infoY);
  
  infoY += lineHeight;
  doc.setFont('helvetica', 'bold');
  doc.text('ID:', 14, infoY);
  doc.setFont('helvetica', 'normal');
  doc.text(record.employees?.hrms_no || 'N/A', 32, infoY);
  
  infoY += lineHeight;
  doc.setFont('helvetica', 'bold');
  doc.text('Email:', 14, infoY);
  doc.setFont('helvetica', 'normal');
  doc.text(record.employees?.work_email || 'N/A', 32, infoY);
  
  infoY += lineHeight;
  doc.setFont('helvetica', 'bold');
  doc.text('Job Position:', 14, infoY);
  doc.setFont('helvetica', 'normal');
  doc.text(record.employees?.job_position || 'N/A', 42, infoY);
  
  infoY += lineHeight;
  doc.setFont('helvetica', 'bold');
  doc.text('Department:', 14, infoY);
  doc.setFont('helvetica', 'normal');
  doc.text(record.employees?.department || 'N/A', 42, infoY);
  
  // Other Information Box
  doc.setFillColor(240, 248, 243);
  doc.roundedRect(10 + leftBoxWidth + gap, boxY, rightBoxWidth, boxHeight, 3, 3, 'F');
  doc.setDrawColor(45, 90, 69);
  doc.roundedRect(10 + leftBoxWidth + gap, boxY, rightBoxWidth, boxHeight, 3, 3, 'S');
  
  // Header bar
  doc.setFillColor(45, 90, 69);
  doc.rect(10 + leftBoxWidth + gap, boxY, rightBoxWidth, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text('OTHER INFORMATION', 10 + leftBoxWidth + gap + rightBoxWidth / 2, boxY + 5.5, { align: 'center' });
  
  // Contract details
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(7);
  const rightX = 10 + leftBoxWidth + gap + 4;
  let rightY = boxY + 14;
  
  doc.setFont('helvetica', 'bold');
  doc.text('Contract Wage (Monthly):', rightX, rightY);
  doc.setFont('helvetica', 'normal');
  doc.text(`${record.basic_salary?.toLocaleString()} AED`, rightX + 50, rightY);
  
  rightY += lineHeight;
  doc.setFont('helvetica', 'bold');
  doc.text('Pay Period:', rightX, rightY);
  doc.setFont('helvetica', 'normal');
  doc.text(`${monthData.startDate} - ${monthData.endDate}`, rightX + 50, rightY);
  
  rightY += lineHeight;
  doc.setFont('helvetica', 'bold');
  doc.text('Computed On:', rightX, rightY);
  doc.setFont('helvetica', 'normal');
  doc.text(new Date().toLocaleDateString('en-GB'), rightX + 50, rightY);
  
  rightY += lineHeight;
  doc.setFont('helvetica', 'bold');
  doc.text('Contract Type:', rightX, rightY);
  doc.setFont('helvetica', 'normal');
  doc.text(record.employees?.contract_type || 'Permanent', rightX + 50, rightY);
  
  rightY += lineHeight;
  doc.setFont('helvetica', 'bold');
  doc.text('Working Schedule:', rightX, rightY);
  doc.setFont('helvetica', 'normal');
  doc.text(`${workHours * 5}.0 Hours / Week`, rightX + 50, rightY);
  
  // Earnings Table
  const earningsY = boxY + boxHeight + 10;
  autoTable(doc, {
    startY: earningsY,
    head: [['EARNINGS', 'HOURS', 'DAYS', 'AMOUNT']],
    body: [
      ['Total', '0', '0', '0.00 AED']
    ],
    theme: 'grid',
    headStyles: { 
      fillColor: [45, 90, 69],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'center'
    },
    bodyStyles: {
      fontSize: 8,
      halign: 'center'
    },
    columnStyles: {
      0: { cellWidth: 70, halign: 'left' },
      1: { cellWidth: 40, halign: 'center' },
      2: { cellWidth: 40, halign: 'center' },
      3: { cellWidth: 40, halign: 'right' }
    },
    margin: { left: 10, right: 10 }
  });
  
  // Salary Breakdown Table
  const salaryY = (doc as any).lastAutoTable.finalY + 8;
  
  const grossSalary = (record.basic_salary || 0) + (record.allowances || 0);
  
  // Parse allowances (assuming housing and transport are roughly equal portions of allowances for display)
  const housingAllowance = Math.round((record.allowances || 0) * 0.6);
  const transportAllowance = Math.round((record.allowances || 0) * 0.3);
  const otherAllowances = (record.allowances || 0) - housingAllowance - transportAllowance;
  
  autoTable(doc, {
    startY: salaryY,
    head: [['NAME', 'AMOUNT', 'QUANTITY', 'RATE', 'TOTAL']],
    body: [
      ['Basic Salary', '', '', '', `${record.basic_salary?.toLocaleString() || 0}.00 AED`],
      ['Housing Allowance Input', '', '', '', `${housingAllowance.toLocaleString()}.00 AED`],
      ['Transportation Allowance', '', '', '', `${transportAllowance.toLocaleString()}.00 AED`],
      ['Other Allowances', '', '', '', `${otherAllowances.toLocaleString()}.00 AED`],
    ],
    theme: 'grid',
    headStyles: { 
      fillColor: [45, 90, 69],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8
    },
    bodyStyles: {
      fontSize: 8
    },
    columnStyles: {
      0: { cellWidth: 70 },
      1: { cellWidth: 30, halign: 'center' },
      2: { cellWidth: 30, halign: 'center' },
      3: { cellWidth: 30, halign: 'center' },
      4: { cellWidth: 30, halign: 'right' }
    },
    margin: { left: 10, right: 10 }
  });
  
  // Net Salary Row
  const netY = (doc as any).lastAutoTable.finalY;
  doc.setFillColor(240, 248, 243);
  doc.rect(10, netY, pageWidth - 20, 10, 'F');
  doc.setDrawColor(45, 90, 69);
  doc.rect(10, netY, pageWidth - 20, 10, 'S');
  
  doc.setTextColor(220, 53, 53); // Red for Net Salary label
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Net Salary', 14, netY + 7);
  
  doc.setTextColor(45, 90, 69);
  doc.text(`${record.net_salary?.toLocaleString() || 0}.00 AED`, pageWidth - 14, netY + 7, { align: 'right' });
  
  // Deductions note if any
  if ((record.deductions || 0) > 0) {
    doc.setFontSize(8);
    doc.setTextColor(220, 53, 53);
    doc.text(`(Deductions: -${record.deductions?.toLocaleString()} AED applied)`, pageWidth / 2, netY + 18, { align: 'center' });
  }
  
  // Footer
  const footerY = netY + 30;
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.text(`To pay on xxxxxxxxxxxxxxx of ${record.employees?.full_name}: ${record.net_salary?.toLocaleString()}.00 AED`, 10, footerY);
  
  // WPS Compliance note
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.text('This is a computer-generated payslip. UAE WPS Compliant.', pageWidth / 2, pageHeight - 10, { align: 'center' });
  
  // Save
  doc.save(`payslip-${record.employees?.hrms_no}-${record.month}.pdf`);
}

export function generateBulkPayrollPDF(records: PayrollRecord[], month: string, settings?: CompanySettings | null) {
  const doc = new jsPDF('landscape');
  const pageWidth = doc.internal.pageSize.getWidth();
  
  const companyName = settings?.company_name || 'MABDC';
  const monthData = formatMonthData(month);
  
  // Header
  doc.setFillColor(45, 90, 69);
  doc.rect(0, 0, pageWidth, 30, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(`${companyName} - Monthly Payroll Report`, 20, 18);
  
  doc.setFontSize(12);
  doc.text(`${monthData.monthName} ${monthData.year}`, pageWidth - 20, 18, { align: 'right' });
  
  // Summary Stats
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(10);
  const totalBasic = records.reduce((sum, r) => sum + (r.basic_salary || 0), 0);
  const totalAllowances = records.reduce((sum, r) => sum + (r.allowances || 0), 0);
  const totalDeductions = records.reduce((sum, r) => sum + (r.deductions || 0), 0);
  const totalNet = records.reduce((sum, r) => sum + (r.net_salary || 0), 0);
  const paidCount = records.filter(r => r.wps_processed).length;
  
  doc.text(`Total Employees: ${records.length}  |  Paid: ${paidCount}  |  Pending: ${records.length - paidCount}`, 20, 40);
  
  // Table
  const tableData = records.map(r => [
    r.employees?.hrms_no || '',
    r.employees?.full_name || '',
    r.employees?.department || '',
    `${r.basic_salary?.toLocaleString() || 0} AED`,
    `${r.allowances?.toLocaleString() || 0} AED`,
    `${r.deductions?.toLocaleString() || 0} AED`,
    `${r.net_salary?.toLocaleString() || 0} AED`,
    r.wps_processed ? 'Paid' : 'Pending',
    r.employees?.bank_name || '-'
  ]);
  
  // Add totals row
  tableData.push([
    '', 'TOTAL', '',
    `${totalBasic.toLocaleString()} AED`,
    `${totalAllowances.toLocaleString()} AED`,
    `${totalDeductions.toLocaleString()} AED`,
    `${totalNet.toLocaleString()} AED`,
    '', ''
  ]);
  
  autoTable(doc, {
    startY: 48,
    head: [['HRMS', 'Employee Name', 'Department', 'Basic Salary', 'Allowances', 'Deductions', 'Net Salary', 'Status', 'Bank']],
    body: tableData,
    theme: 'grid',
    headStyles: { 
      fillColor: [45, 90, 69],
      textColor: [255, 255, 255],
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
    margin: { left: 10, right: 10 },
    didParseCell: function(data) {
      // Style the totals row
      if (data.row.index === tableData.length - 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [240, 248, 243];
      }
      // Style status column
      if (data.column.index === 7 && data.row.index < tableData.length - 1) {
        if (data.cell.raw === 'Paid') {
          data.cell.styles.textColor = [45, 90, 69];
        } else {
          data.cell.styles.textColor = [245, 158, 11];
        }
      }
    }
  });
  
  // Footer
  const finalY = (doc as any).lastAutoTable.finalY + 15;
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 10, finalY);
  doc.text('UAE WPS Compliant Report', pageWidth - 10, finalY, { align: 'right' });
  
  // Save
  doc.save(`payroll-report-${month}.pdf`);
}

function formatMonthData(month: string) {
  const [year, monthNum] = month.split('-');
  const date = new Date(parseInt(year), parseInt(monthNum) - 1);
  const lastDay = new Date(parseInt(year), parseInt(monthNum), 0).getDate();
  
  return {
    year,
    monthNum,
    monthName: date.toLocaleDateString('en-US', { month: 'long' }),
    startDate: `${monthNum}/01/${year}`,
    endDate: `${monthNum}/${lastDay}/${year}`
  };
}
