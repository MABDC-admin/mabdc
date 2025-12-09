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
  };
}

export function generatePayslipPDF(record: PayrollRecord) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Header
  doc.setFillColor(34, 197, 94); // Primary green
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('MABDC', 20, 25);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Salary Slip / WPS Report', pageWidth - 20, 20, { align: 'right' });
  doc.text(formatMonth(record.month), pageWidth - 20, 28, { align: 'right' });
  
  // Employee Details Section
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Employee Details', 20, 55);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const leftCol = 20;
  const rightCol = 110;
  let y = 65;
  
  doc.text(`Name: ${record.employees?.full_name || 'N/A'}`, leftCol, y);
  doc.text(`HRMS No: ${record.employees?.hrms_no || 'N/A'}`, rightCol, y);
  y += 8;
  doc.text(`Department: ${record.employees?.department || 'N/A'}`, leftCol, y);
  doc.text(`Position: ${record.employees?.job_position || 'N/A'}`, rightCol, y);
  y += 8;
  doc.text(`Bank: ${record.employees?.bank_name || 'N/A'}`, leftCol, y);
  doc.text(`IBAN: ${record.employees?.iban || 'N/A'}`, rightCol, y);
  
  // Salary Breakdown Table
  y += 20;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Salary Breakdown', 20, y);
  
  const tableData = [
    ['Basic Salary', `AED ${record.basic_salary?.toLocaleString() || 0}`],
    ['Allowances', `AED ${record.allowances?.toLocaleString() || 0}`],
    ['Gross Salary', `AED ${((record.basic_salary || 0) + (record.allowances || 0)).toLocaleString()}`],
    ['Deductions', `- AED ${record.deductions?.toLocaleString() || 0}`],
  ];
  
  autoTable(doc, {
    startY: y + 5,
    head: [['Description', 'Amount']],
    body: tableData,
    theme: 'grid',
    headStyles: { 
      fillColor: [34, 197, 94],
      textColor: [255, 255, 255],
      fontStyle: 'bold'
    },
    columnStyles: {
      0: { cellWidth: 100 },
      1: { cellWidth: 70, halign: 'right' }
    },
    margin: { left: 20, right: 20 }
  });
  
  // Net Salary Box
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  
  doc.setFillColor(240, 253, 244); // Light green
  doc.roundedRect(20, finalY, pageWidth - 40, 25, 3, 3, 'F');
  doc.setDrawColor(34, 197, 94);
  doc.roundedRect(20, finalY, pageWidth - 40, 25, 3, 3, 'S');
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('NET SALARY', 30, finalY + 16);
  
  doc.setFontSize(16);
  doc.setTextColor(34, 197, 94);
  doc.text(`AED ${record.net_salary?.toLocaleString() || 0}`, pageWidth - 30, finalY + 16, { align: 'right' });
  
  // Payment Status
  const statusY = finalY + 40;
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Payment Status: ${record.wps_processed ? 'PAID' : 'PENDING'}`, 20, statusY);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth - 20, statusY, { align: 'right' });
  
  // Footer
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text('This is a computer-generated document. UAE WPS Compliant.', pageWidth / 2, 280, { align: 'center' });
  
  // Save
  doc.save(`payslip-${record.employees?.hrms_no}-${record.month}.pdf`);
}

export function generateBulkPayrollPDF(records: PayrollRecord[], month: string) {
  const doc = new jsPDF('landscape');
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Header
  doc.setFillColor(34, 197, 94);
  doc.rect(0, 0, pageWidth, 30, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('MABDC - Monthly Payroll Report', 20, 20);
  
  doc.setFontSize(12);
  doc.text(formatMonth(month), pageWidth - 20, 20, { align: 'right' });
  
  // Summary Stats
  doc.setTextColor(0, 0, 0);
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
    `AED ${r.basic_salary?.toLocaleString() || 0}`,
    `AED ${r.allowances?.toLocaleString() || 0}`,
    `AED ${r.deductions?.toLocaleString() || 0}`,
    `AED ${r.net_salary?.toLocaleString() || 0}`,
    r.wps_processed ? 'Paid' : 'Pending',
    r.employees?.bank_name || '-'
  ]);
  
  // Add totals row
  tableData.push([
    '', 'TOTAL', '',
    `AED ${totalBasic.toLocaleString()}`,
    `AED ${totalAllowances.toLocaleString()}`,
    `AED ${totalDeductions.toLocaleString()}`,
    `AED ${totalNet.toLocaleString()}`,
    '', ''
  ]);
  
  autoTable(doc, {
    startY: 48,
    head: [['HRMS', 'Employee Name', 'Department', 'Basic Salary', 'Allowances', 'Deductions', 'Net Salary', 'Status', 'Bank']],
    body: tableData,
    theme: 'grid',
    headStyles: { 
      fillColor: [34, 197, 94],
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
        data.cell.styles.fillColor = [240, 253, 244];
      }
      // Style status column
      if (data.column.index === 7 && data.row.index < tableData.length - 1) {
        if (data.cell.raw === 'Paid') {
          data.cell.styles.textColor = [34, 197, 94];
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

function formatMonth(month: string): string {
  const [year, monthNum] = month.split('-');
  const date = new Date(parseInt(year), parseInt(monthNum) - 1);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}
