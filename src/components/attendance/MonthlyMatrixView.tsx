import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, Download, Calendar, Edit2, CheckSquare, Square, X, ChevronLeft, ChevronRight, Search, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, parseISO, isSameDay, isWithinInterval, addMonths, subMonths } from 'date-fns';
import { useAttendance } from '@/hooks/useAttendance';
import { useEmployees } from '@/hooks/useEmployees';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { EmployeeAttendanceCalendar } from './EmployeeAttendanceCalendar';

// Map matrix status codes to database status values
const STATUS_TO_DB: Record<string, string> = {
  'P': 'Present',
  'A': 'Absent',
  'SL': 'Sick Leave',
  'VL': 'Vacation Leave',
  'M': 'Maternity Leave',
  'H': 'Holiday',
  'SB': 'Spring Break',
  'WB': 'Winter Break',
  'HDA': 'Half Day Absent',
  'HDSL': 'Half Day Sick Leave',
  'DO': 'Day Off',
  'L': 'Late',
  '-': 'No Record',
};

interface MonthlyMatrixViewProps {
  onBack: () => void;
}

// Status type definitions with updated colors to match reference
const STATUS_CONFIG = {
  P: { label: 'P', name: 'Present', bg: 'bg-emerald-500', text: 'text-white', pdfBg: [34, 197, 94] },
  L: { label: 'L', name: 'Late', bg: 'bg-amber-400', text: 'text-amber-900', pdfBg: [251, 191, 36] },
  A: { label: 'A', name: 'Absent', bg: 'bg-red-500', text: 'text-white', pdfBg: [239, 68, 68] },
  VL: { label: 'VL', name: 'On Leave', bg: 'bg-blue-500', text: 'text-white', pdfBg: [59, 130, 246] },
  M: { label: 'M', name: 'Maternity Leave', bg: 'bg-pink-500', text: 'text-white', pdfBg: [236, 72, 153] },
  W: { label: 'W', name: 'Weekend', bg: 'bg-slate-200', text: 'text-slate-600', pdfBg: [226, 232, 240] },
  DO: { label: 'DO', name: 'Day Off', bg: 'bg-purple-400', text: 'text-purple-900', pdfBg: [192, 132, 252] },
  H: { label: 'H', name: 'Half Day', bg: 'bg-orange-400', text: 'text-orange-900', pdfBg: [251, 146, 60] },
  SL: { label: 'SL', name: 'Sick Leave', bg: 'bg-lime-400', text: 'text-lime-900', pdfBg: [163, 230, 53] },
  SB: { label: 'SB', name: 'Spring Break', bg: 'bg-violet-400', text: 'text-violet-900', pdfBg: [167, 139, 250] },
  WB: { label: 'WB', name: 'Winter Break', bg: 'bg-violet-400', text: 'text-violet-900', pdfBg: [167, 139, 250] },
  HDA: { label: 'HDA', name: 'Half Day Absent', bg: 'bg-pink-400', text: 'text-pink-900', pdfBg: [244, 114, 182] },
  HDSL: { label: 'HDSL', name: 'Half Day Sick Leave', bg: 'bg-lime-400', text: 'text-lime-900', pdfBg: [163, 230, 53] },
  PH: { label: 'PH', name: 'Public Holiday', bg: 'bg-cyan-300', text: 'text-cyan-800', pdfBg: [103, 232, 249] },
  AP: { label: 'AP', name: 'Appealed', bg: 'bg-cyan-400', text: 'text-cyan-900', pdfBg: [34, 211, 238] },
  MP: { label: 'MP', name: 'Missed Punch', bg: 'bg-orange-500', text: 'text-white', pdfBg: [249, 115, 22] },
  UT: { label: 'UT', name: 'Undertime', bg: 'bg-purple-400', text: 'text-purple-900', pdfBg: [192, 132, 252] },
  '-': { label: '-', name: 'No Record', bg: 'bg-gray-200', text: 'text-gray-600', pdfBg: [229, 231, 235] },
} as const;

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Editable statuses for the dropdown
const EDITABLE_STATUSES = ['-', 'A', 'PH', 'P', 'L', 'SL', 'HDSL', 'VL', 'M', 'SB', 'WB', 'HDA', 'DO'] as const;

// Legend items for the header bar
const LEGEND_ITEMS = [
  { code: 'P', color: 'bg-emerald-500' },
  { code: 'L', color: 'bg-amber-400' },
  { code: 'A', color: 'bg-red-500' },
  { code: 'VL', color: 'bg-blue-500', label: 'On Leave' },
  { code: 'M', color: 'bg-pink-500', label: 'Maternity' },
  { code: 'W', color: 'bg-slate-200' },
  { code: 'DO', color: 'bg-purple-400', label: 'Day Off' },
  { code: 'H', color: 'bg-orange-400', label: 'Half Day' },
  { code: 'AP', color: 'bg-cyan-400', label: 'Appealed' },
  { code: 'MP', color: 'bg-orange-500', label: 'Missed Punch' },
  { code: 'UT', color: 'bg-purple-400', label: 'Undertime' },
];

export function MonthlyMatrixView({ onBack }: MonthlyMatrixViewProps) {
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth());
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [editCell, setEditCell] = useState<{ employeeId: string; employeeName: string; date: Date; currentStatus: string } | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<{ id: string; name: string } | null>(null);
  const [manualOverrides, setManualOverrides] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  
  // Bulk selection state
  const [bulkSelectMode, setBulkSelectMode] = useState(false);
  const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set());
  const [bulkEditDialogOpen, setBulkEditDialogOpen] = useState(false);
  
  const queryClient = useQueryClient();
  const { data: allAttendance = [] } = useAttendance();
  const { data: employees = [] } = useEmployees();

  // Fetch public holidays
  const { data: publicHolidays = [] } = useQuery({
    queryKey: ['public_holidays'],
    queryFn: async () => {
      const { data, error } = await supabase.from('public_holidays').select('*');
      if (error) throw error;
      return data;
    },
  });

  // Fetch leave records
  const { data: leaveRecords = [] } = useQuery({
    queryKey: ['leave_records'],
    queryFn: async () => {
      const { data, error } = await supabase.from('leave_records').select('*');
      if (error) throw error;
      return data;
    },
  });

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Get unique departments
  const departments = useMemo(() => {
    const depts = new Set(employees.map(e => e.department).filter(Boolean));
    return Array.from(depts).sort();
  }, [employees]);

  // Filter employees by search and department
  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      const matchesSearch = searchQuery === '' || 
        emp.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.hrms_no.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDepartment = selectedDepartment === 'all' || emp.department === selectedDepartment;
      return matchesSearch && matchesDepartment;
    });
  }, [employees, searchQuery, selectedDepartment]);

  // Generate days of the month
  const daysInMonth = useMemo(() => {
    const monthStart = startOfMonth(new Date(selectedYear, selectedMonth));
    const monthEnd = endOfMonth(monthStart);
    return eachDayOfInterval({ start: monthStart, end: monthEnd });
  }, [selectedMonth, selectedYear]);

  const navigateMonth = (direction: 'prev' | 'next') => {
    const currentDateValue = new Date(selectedYear, selectedMonth);
    const newDate = direction === 'prev' ? subMonths(currentDateValue, 1) : addMonths(currentDateValue, 1);
    setSelectedMonth(newDate.getMonth());
    setSelectedYear(newDate.getFullYear());
  };

  const getHolidayForDay = (date: Date) => {
    return publicHolidays.find(h => isSameDay(parseISO(h.date), date));
  };

  const getAttendanceForEmployeeDay = (employeeId: string, date: Date) => {
    return allAttendance.find(a => 
      a.employee_id === employeeId && isSameDay(parseISO(a.date), date)
    );
  };

  const getLeaveForEmployeeDay = (employeeId: string, date: Date) => {
    return leaveRecords.find(l => 
      l.employee_id === employeeId && 
      l.status === 'Approved' &&
      isWithinInterval(date, { 
        start: parseISO(l.start_date), 
        end: parseISO(l.end_date) 
      })
    );
  };

  const getOverrideKey = (employeeId: string, date: Date) => {
    return `${employeeId}_${format(date, 'yyyy-MM-dd')}`;
  };

  const getDayStatus = (employeeId: string, date: Date): keyof typeof STATUS_CONFIG => {
    // Check for manual override first
    const overrideKey = getOverrideKey(employeeId, date);
    if (manualOverrides[overrideKey]) {
      return manualOverrides[overrideKey] as keyof typeof STATUS_CONFIG;
    }

    const dayOfWeek = getDay(date);
    const isSat = dayOfWeek === 6;
    const isSun = dayOfWeek === 0;
    
    // CHECK LEAVE FIRST - before weekends! So leave shows on Sat/Sun too
    const leave = getLeaveForEmployeeDay(employeeId, date);
    if (leave) {
      const leaveType = leave.leave_type?.toLowerCase() || '';
      if (leaveType.includes('sick')) return 'SL';
      if (leaveType.includes('vacation') || leaveType.includes('annual')) return 'VL';
      if (leaveType.includes('maternity')) return 'M';
      if (leaveType.includes('spring')) return 'SB';
      if (leaveType.includes('winter')) return 'WB';
      if (leaveType.includes('day off')) return 'DO';
      return 'VL'; // Default to vacation leave for other approved leaves
    }
    
    // Weekend (Saturday and Sunday only) - only if NOT on leave
    if (isSat || isSun) {
      return 'W';
    }
    
    // Public Holiday
    const holiday = getHolidayForDay(date);
    if (holiday) {
      return 'PH';
    }
    
    // Check attendance
    const attendance = getAttendanceForEmployeeDay(employeeId, date);
    if (!attendance) {
      // Check if date is in future
      if (date > currentDate) return '-';
      
      // Show "-" for dates before January 20, 2026 (system start date)
      const systemStartDate = new Date(2026, 0, 20);
      if (date < systemStartDate) return '-';
      
      return 'A'; // Absent if no record for past working day after system start
    }

    // Map attendance status - check DB status FIRST before raw punch data
    const status = attendance.status?.toLowerCase() || '';
    
    // Appealed - Cyan
    if (status === 'appealed') return 'AP';
    
    // Missed Punch statuses - Orange
    if (status.includes('miss punch') || status === 'missed punch') return 'MP';
    
    // Undertime - Purple (but Late | Undertime should be Late)
    if (status === 'undertime') return 'UT';
    
    // Late (includes Late | Undertime) - Yellow
    if (status.includes('late')) return 'L';
    
    // Other statuses
    if (status === 'present') return 'P';
    if (status === 'absent') return 'A';
    if (status === 'day off') return 'DO';
    if (status === 'sick leave') return 'SL';
    if (status === 'vacation leave' || status === 'on leave') return 'VL';
    if (status === 'holiday') return 'PH';
    if (status === 'spring break') return 'SB';
    if (status === 'winter break') return 'WB';
    if (status === 'half day absent') return 'HDA';
    if (status === 'half day sick leave') return 'HDSL';
    if (status === 'half day') return 'H';
    if (status === 'no record') return '-';
    
    // Fallback: check raw punch data for missed punch
    const isMissedPunch = (attendance.check_in && !attendance.check_out) || (!attendance.check_in && attendance.check_out);
    if (isMissedPunch) return 'MP';
    
    return 'P';
  };

  // Mutation to save status to database
  const saveStatusMutation = useMutation({
    mutationFn: async ({ employeeId, date, status }: { employeeId: string; date: Date; status: string }) => {
      const dateStr = format(date, 'yyyy-MM-dd');
      const dbStatus = STATUS_TO_DB[status] || status;
      
      const { data: existing } = await supabase
        .from('attendance')
        .select('id')
        .eq('employee_id', employeeId)
        .eq('date', dateStr)
        .maybeSingle();
      
      if (existing) {
        const { error } = await supabase
          .from('attendance')
          .update({ 
            status: dbStatus,
            modified_at: new Date().toISOString(),
            modified_by: 'HR Admin (Matrix)'
          })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('attendance')
          .insert({
            employee_id: employeeId,
            date: dateStr,
            status: dbStatus,
            modified_at: new Date().toISOString(),
            modified_by: 'HR Admin (Matrix)'
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
    },
  });

  const handleEditStatus = async (newStatus: string) => {
    if (editCell) {
      const key = getOverrideKey(editCell.employeeId, editCell.date);
      
      try {
        await saveStatusMutation.mutateAsync({
          employeeId: editCell.employeeId,
          date: editCell.date,
          status: newStatus,
        });
        
        setManualOverrides(prev => ({
          ...prev,
          [key]: newStatus
        }));
        toast.success(`Status updated to ${STATUS_CONFIG[newStatus as keyof typeof STATUS_CONFIG]?.name || newStatus}`);
      } catch (error) {
        toast.error('Failed to save status');
        console.error(error);
      }
      
      setEditCell(null);
    }
  };

  // Bulk save mutation
  const bulkSaveStatusMutation = useMutation({
    mutationFn: async ({ cells, status }: { cells: string[]; status: string }) => {
      const dbStatus = STATUS_TO_DB[status] || status;
      
      for (const cellKey of cells) {
        const [employeeId, dateStr] = cellKey.split('_');
        
        const { data: existing } = await supabase
          .from('attendance')
          .select('id')
          .eq('employee_id', employeeId)
          .eq('date', dateStr)
          .maybeSingle();
        
        if (existing) {
          const { error } = await supabase
            .from('attendance')
            .update({ 
              status: dbStatus,
              modified_at: new Date().toISOString(),
              modified_by: 'HR Admin (Bulk Matrix)'
            })
            .eq('id', existing.id);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('attendance')
            .insert({
              employee_id: employeeId,
              date: dateStr,
              status: dbStatus,
              modified_at: new Date().toISOString(),
              modified_by: 'HR Admin (Bulk Matrix)'
            });
          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
    },
  });

  const handleCellClick = (employeeId: string, employeeName: string, date: Date, currentStatus: string) => {
    if (bulkSelectMode) {
      const key = getOverrideKey(employeeId, date);
      setSelectedCells(prev => {
        const newSet = new Set(prev);
        if (newSet.has(key)) {
          newSet.delete(key);
        } else {
          newSet.add(key);
        }
        return newSet;
      });
    } else {
      setEditCell({ employeeId, employeeName, date, currentStatus });
    }
  };

  const handleBulkEditStatus = async (newStatus: string) => {
    if (selectedCells.size === 0) return;
    
    try {
      await bulkSaveStatusMutation.mutateAsync({
        cells: Array.from(selectedCells),
        status: newStatus,
      });
      
      const newOverrides: Record<string, string> = {};
      selectedCells.forEach(key => {
        newOverrides[key] = newStatus;
      });
      setManualOverrides(prev => ({ ...prev, ...newOverrides }));
      
      toast.success(`Updated ${selectedCells.size} cells to ${STATUS_CONFIG[newStatus as keyof typeof STATUS_CONFIG]?.name || newStatus}`);
      setSelectedCells(new Set());
      setBulkEditDialogOpen(false);
      setBulkSelectMode(false);
    } catch (error) {
      toast.error('Failed to save bulk status');
      console.error(error);
    }
  };

  const toggleBulkSelectMode = () => {
    setBulkSelectMode(prev => !prev);
    if (bulkSelectMode) {
      setSelectedCells(new Set());
    }
  };

  const clearSelection = () => {
    setSelectedCells(new Set());
  };

  // Calculate summary for each employee
  const employeeSummaries = useMemo(() => {
    return filteredEmployees.map((emp, index) => {
      const counts = {
        P: 0, L: 0, A: 0, VL: 0, SL: 0, DO: 0, H: 0, SB: 0, WB: 0, HDA: 0, HDSL: 0, PH: 0
      };
      
      daysInMonth.forEach(day => {
        const status = getDayStatus(emp.id, day);
        if (status !== 'W' && status !== '-') {
          counts[status as keyof typeof counts]++;
        }
      });
      
      return { ...emp, index: index + 1, ...counts };
    });
  }, [filteredEmployees, daysInMonth, allAttendance, leaveRecords, publicHolidays, manualOverrides]);

  // PDF Generation
  const generateMatrixPDF = () => {
    const doc = new jsPDF('landscape', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 3;
    const cellWidth = 5.5;
    const nameWidth = 50;
    const rowHeight = 5;

    // Header
    doc.setFillColor(34, 34, 34);
    doc.rect(0, 0, pageWidth, 15, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Monthly Attendance Matrix', pageWidth / 2, 8, { align: 'center' });
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`${months[selectedMonth]} ${selectedYear}`, pageWidth / 2, 13, { align: 'center' });

    // Legend
    const legendY = 18;
    doc.setFontSize(5);
    doc.setTextColor(0, 0, 0);
    const legends = [
      { code: 'P', color: STATUS_CONFIG.P.pdfBg },
      { code: 'L', color: STATUS_CONFIG.L.pdfBg },
      { code: 'A', color: STATUS_CONFIG.A.pdfBg },
      { code: 'VL', color: STATUS_CONFIG.VL.pdfBg },
      { code: 'SL', color: STATUS_CONFIG.SL.pdfBg },
      { code: 'DO', color: STATUS_CONFIG.DO.pdfBg },
    ];
    legends.forEach((leg, idx) => {
      const x = margin + idx * 45;
      doc.setFillColor(leg.color[0], leg.color[1], leg.color[2]);
      doc.rect(x, legendY, 3, 3, 'F');
      doc.text(`${leg.code} = ${STATUS_CONFIG[leg.code as keyof typeof STATUS_CONFIG].name}`, x + 4, legendY + 2.5);
    });

    const startY = 25;
    
    // Table header
    doc.setFillColor(200, 200, 200);
    doc.rect(margin, startY, nameWidth + daysInMonth.length * cellWidth + 50, 8, 'F');
    doc.setFontSize(5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('EMPLOYEE', margin + 2, startY + 4);
    
    // Day headers
    daysInMonth.forEach((day, idx) => {
      const x = margin + nameWidth + idx * cellWidth;
      doc.text(format(day, 'd'), x + cellWidth / 2, startY + 3, { align: 'center' });
      doc.setFontSize(4);
      doc.text(DAY_NAMES[getDay(day)], x + cellWidth / 2, startY + 6.5, { align: 'center' });
      doc.setFontSize(5);
    });

    // Summary headers
    const summaryStartX = margin + nameWidth + daysInMonth.length * cellWidth + 2;
    const summaryHeaders = ['P', 'L', 'A', 'VL'];
    doc.setFontSize(4);
    summaryHeaders.forEach((h, idx) => {
      doc.text(h, summaryStartX + idx * 10 + 5, startY + 5, { align: 'center' });
    });

    // Employee rows
    let currentY = startY + 9;

    employeeSummaries.forEach((emp) => {
      if (currentY + rowHeight > doc.internal.pageSize.getHeight() - 10) {
        doc.addPage();
        currentY = 15;
      }

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5);
      doc.setTextColor(0, 0, 0);
      doc.text(emp.full_name, margin + 2, currentY + 3.5);

      // Day cells
      daysInMonth.forEach((day, dayIdx) => {
        const x = margin + nameWidth + dayIdx * cellWidth;
        const status = getDayStatus(emp.id, day);
        const config = STATUS_CONFIG[status];
        
        doc.setFillColor(config.pdfBg[0], config.pdfBg[1], config.pdfBg[2]);
        doc.rect(x, currentY, cellWidth, rowHeight, 'F');
        
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(4);
        doc.text(config.label, x + cellWidth / 2, currentY + 3.5, { align: 'center' });
      });

      // Summary cells
      doc.setFontSize(5);
      summaryHeaders.forEach((h, idx) => {
        const x = summaryStartX + idx * 10;
        const count = emp[h as keyof typeof emp] as number || 0;
        const config = STATUS_CONFIG[h as keyof typeof STATUS_CONFIG];
        doc.setFillColor(config.pdfBg[0], config.pdfBg[1], config.pdfBg[2]);
        doc.rect(x, currentY, 9, rowHeight, 'F');
        doc.setTextColor(0, 0, 0);
        doc.text(count.toString(), x + 4.5, currentY + 3.5, { align: 'center' });
      });

      currentY += rowHeight;
    });

    doc.save(`Monthly_Matrix_${months[selectedMonth]}_${selectedYear}.pdf`);
    toast.success('Monthly Matrix PDF generated');
  };

  // Excel Generation
  const generateMatrixExcel = () => {
    const wb = XLSX.utils.book_new();
    
    const headerRow1 = ['Employee', 'HRMS No'];
    const headerRow2 = ['', ''];
    
    daysInMonth.forEach(day => {
      headerRow1.push(format(day, 'd'));
      headerRow2.push(DAY_NAMES[getDay(day)]);
    });
    
    const summaryHeaders = ['Present', 'Late', 'Absent', 'On Leave'];
    summaryHeaders.forEach(h => {
      headerRow1.push(h);
      headerRow2.push('');
    });
    
    const dataRows: string[][] = [];
    employeeSummaries.forEach((emp) => {
      const row: string[] = [emp.full_name, emp.hrms_no];
      
      daysInMonth.forEach(day => {
        const status = getDayStatus(emp.id, day);
        const config = STATUS_CONFIG[status];
        row.push(config.label);
      });
      
      row.push(String(emp.P || 0));
      row.push(String(emp.L || 0));
      row.push(String(emp.A || 0));
      row.push(String(emp.VL || 0));
      
      dataRows.push(row);
    });
    
    const wsData = [headerRow1, headerRow2, ...dataRows];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    
    const colWidths = [
      { wch: 25 },
      { wch: 12 },
      ...daysInMonth.map(() => ({ wch: 4 })),
      ...summaryHeaders.map(() => ({ wch: 8 }))
    ];
    ws['!cols'] = colWidths;
    
    XLSX.utils.book_append_sheet(wb, ws, 'Attendance Matrix');
    
    const legendData = [
      ['Status Code', 'Description'],
      ['P', 'Present'],
      ['L', 'Late'],
      ['A', 'Absent'],
      ['VL', 'On Leave'],
      ['W', 'Weekend'],
      ['DO', 'Day Off'],
      ['H', 'Half Day'],
      ['SL', 'Sick Leave'],
    ];
    const legendWs = XLSX.utils.aoa_to_sheet(legendData);
    legendWs['!cols'] = [{ wch: 12 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, legendWs, 'Legend');
    
    XLSX.writeFile(wb, `Monthly_Matrix_${months[selectedMonth]}_${selectedYear}.xlsx`);
    toast.success('Monthly Matrix Excel generated');
  };

  const isWeekendDay = (date: Date) => {
    const day = getDay(date);
    return day === 0 || day === 6; // Sun, Sat only
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Attendance</h1>
          <p className="text-sm text-muted-foreground">Monthly matrix view</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button 
            variant={bulkSelectMode ? "default" : "outline"} 
            size="sm"
            onClick={toggleBulkSelectMode}
          >
            {bulkSelectMode ? <CheckSquare className="w-4 h-4 mr-2" /> : <Square className="w-4 h-4 mr-2" />}
            {bulkSelectMode ? "Selection ON" : "Bulk Select"}
          </Button>
          {bulkSelectMode && selectedCells.size > 0 && (
            <>
              <Button variant="default" size="sm" onClick={() => setBulkEditDialogOpen(true)}>
                Apply ({selectedCells.size})
              </Button>
              <Button variant="ghost" size="icon" onClick={clearSelection}>
                <X className="w-4 h-4" />
              </Button>
            </>
          )}
          <Button variant="outline" size="sm" onClick={generateMatrixPDF}>
            <Download className="w-4 h-4 mr-2" />
            Export PDF
          </Button>
          <Button variant="outline" size="sm" onClick={generateMatrixExcel}>
            <Download className="w-4 h-4 mr-2" />
            Export Excel
          </Button>
          <Button variant="outline" size="sm" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>
      </div>

      {/* Controls Row */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        {/* Month Navigation */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => navigateMonth('prev')}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" className="min-w-[160px]">
            {months[selectedMonth]} {selectedYear}
          </Button>
          <Button variant="outline" size="icon" onClick={() => navigateMonth('next')}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Search & Filter */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search employees..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-[200px]"
            />
          </div>
          <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
            <SelectTrigger className="w-[180px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="All Departments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departments.map(dept => (
                <SelectItem key={dept} value={dept}>{dept}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Legend Bar */}
      <div className="flex items-center gap-4 text-xs flex-wrap py-2 px-4 bg-muted/30 rounded-lg">
        {LEGEND_ITEMS.map(item => (
          <div key={item.code} className="flex items-center gap-1.5">
            <span className={cn("w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold", item.color, 
              item.code === 'W' ? 'text-slate-600' : 'text-white'
            )}>
              {item.code}
            </span>
            <span className="text-muted-foreground">{item.label || STATUS_CONFIG[item.code as keyof typeof STATUS_CONFIG]?.name}</span>
          </div>
        ))}
      </div>

      {/* Matrix Grid */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="border-collapse text-xs w-full">
              <thead>
                <tr className="bg-muted">
                  <th className="sticky left-0 z-20 bg-muted text-left p-2 text-xs font-semibold min-w-[220px] border-r border-border">
                    Employee
                  </th>
                  {daysInMonth.map((day) => {
                    const isWeekend = isWeekendDay(day);
                    return (
                      <th 
                        key={day.toISOString()} 
                        className={cn(
                          "text-center p-1 text-[10px] font-medium min-w-[32px] border-x border-border",
                          isWeekend && "text-blue-600"
                        )}
                      >
                        <div className="font-bold">{format(day, 'd')}</div>
                        <div className="text-[9px] opacity-70">{DAY_NAMES[getDay(day)]}</div>
                      </th>
                    );
                  })}
                  {/* Summary headers */}
                  <th className="bg-emerald-500 text-white p-1 text-[9px] font-bold min-w-[36px] border-x border-border" style={{ writingMode: 'vertical-rl' }}>PRESENT</th>
                  <th className="bg-amber-400 text-amber-900 p-1 text-[9px] font-bold min-w-[36px] border-x border-border" style={{ writingMode: 'vertical-rl' }}>LATE</th>
                  <th className="bg-red-500 text-white p-1 text-[9px] font-bold min-w-[36px] border-x border-border" style={{ writingMode: 'vertical-rl' }}>ABSENT</th>
                  <th className="bg-blue-500 text-white p-1 text-[9px] font-bold min-w-[36px] border-x border-border" style={{ writingMode: 'vertical-rl' }}>ON LEAVE</th>
                </tr>
              </thead>
              <tbody>
                {employeeSummaries.map((emp) => (
                  <tr key={emp.id} className="hover:bg-muted/30 transition-colors">
                    <td 
                      className="sticky left-0 z-10 bg-card p-2 border-r border-b border-border cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => setSelectedEmployee({ id: emp.id, name: emp.full_name })}
                    >
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={emp.photo_url || ''} />
                          <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                            {getInitials(emp.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="font-medium text-primary text-sm truncate hover:underline">
                            {emp.full_name}
                          </div>
                          <div className="text-[10px] text-muted-foreground">{emp.hrms_no}</div>
                        </div>
                      </div>
                    </td>
                    {daysInMonth.map((day) => {
                      const status = getDayStatus(emp.id, day);
                      const config = STATUS_CONFIG[status];
                      const cellKey = getOverrideKey(emp.id, day);
                      const isSelected = selectedCells.has(cellKey);
                      return (
                        <td 
                          key={day.toISOString()} 
                          className={cn(
                            "text-center p-0.5 border border-border cursor-pointer hover:opacity-80 transition-all",
                            isSelected && "ring-2 ring-primary ring-inset"
                          )}
                          onClick={() => handleCellClick(emp.id, emp.full_name, day, status)}
                        >
                          <span className={cn(
                            "inline-flex items-center justify-center w-6 h-6 rounded text-[10px] font-bold",
                            config.bg, config.text
                          )}>
                            {config.label}
                          </span>
                        </td>
                      );
                    })}
                    {/* Summary cells */}
                    <td className="text-center p-1 border border-border bg-emerald-500/10">
                      <span className="font-bold text-emerald-700">{emp.P || 0}</span>
                    </td>
                    <td className="text-center p-1 border border-border bg-amber-400/10">
                      <span className="font-bold text-amber-700">{emp.L || 0}</span>
                    </td>
                    <td className="text-center p-1 border border-border bg-red-500/10">
                      <span className="font-bold text-red-700">{emp.A || 0}</span>
                    </td>
                    <td className="text-center p-1 border border-border bg-blue-500/10">
                      <span className="font-bold text-blue-700">{emp.VL || 0}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Status Dialog */}
      <Dialog open={!!editCell} onOpenChange={() => setEditCell(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="w-4 h-4" />
              Edit Status
            </DialogTitle>
          </DialogHeader>
          {editCell && (
            <div className="space-y-4">
              <div className="text-sm">
                <p><strong>Employee:</strong> {editCell.employeeName}</p>
                <p><strong>Date:</strong> {format(editCell.date, 'EEEE, MMMM d, yyyy')}</p>
                <p><strong>Current Status:</strong> {STATUS_CONFIG[editCell.currentStatus as keyof typeof STATUS_CONFIG]?.name || editCell.currentStatus}</p>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Select New Status</label>
                <Select 
                  value={editCell.currentStatus} 
                  onValueChange={handleEditStatus}
                  disabled={saveStatusMutation.isPending}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {EDITABLE_STATUSES.map((status) => {
                      const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG];
                      if (!config) return null;
                      return (
                        <SelectItem key={status} value={status}>
                          <div className="flex items-center gap-2">
                            <span className={cn("w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold", config.bg, config.text)}>
                              {config.label}
                            </span>
                            <span>{config.name}</span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Bulk Edit Status Dialog */}
      <Dialog open={bulkEditDialogOpen} onOpenChange={setBulkEditDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckSquare className="w-4 h-4" />
              Bulk Edit Status
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-sm">
              <p><strong>Selected Cells:</strong> {selectedCells.size}</p>
              <p className="text-muted-foreground">All selected cells will be updated.</p>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Select Status for All</label>
              <Select 
                onValueChange={handleBulkEditStatus}
                disabled={bulkSaveStatusMutation.isPending}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status to apply" />
                </SelectTrigger>
                <SelectContent>
                  {EDITABLE_STATUSES.map((status) => {
                    const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG];
                    if (!config) return null;
                    return (
                      <SelectItem key={status} value={status}>
                        <div className="flex items-center gap-2">
                          <span className={cn("w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold", config.bg, config.text)}>
                            {config.label}
                          </span>
                          <span>{config.name}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            {bulkSaveStatusMutation.isPending && (
              <p className="text-sm text-muted-foreground">Saving {selectedCells.size} records...</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Employee Calendar Dialog */}
      <Dialog open={!!selectedEmployee} onOpenChange={() => setSelectedEmployee(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              {selectedEmployee?.name} - Attendance Calendar
            </DialogTitle>
          </DialogHeader>
          {selectedEmployee && (
            <div className="mt-4">
              <EmployeeAttendanceCalendar 
                employeeId={selectedEmployee.id}
                showBackButton={false}
                showEmployeeSelector={false}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
