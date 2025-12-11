import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, Download, Calendar, Edit2, CheckSquare, Square, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, parseISO, isSameDay, isWithinInterval } from 'date-fns';
import { useAttendance } from '@/hooks/useAttendance';
import { useEmployees } from '@/hooks/useEmployees';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import jsPDF from 'jspdf';
import { toast } from 'sonner';
import { EmployeeAttendanceCalendar } from './EmployeeAttendanceCalendar';

// Map matrix status codes to database status values
const STATUS_TO_DB: Record<string, string> = {
  'P': 'Present',
  'A': 'Absent',
  'SL': 'Sick Leave',
  'VL': 'Vacation Leave',
  'H': 'Holiday',
  'SB': 'Spring Break',
  'WB': 'Winter Break',
  'HDA': 'Half Day Absent',
  'HDSL': 'Half Day Sick Leave',
  'DO': 'Day Off',
  '-': 'No Record',
};

interface MonthlyMatrixViewProps {
  onBack: () => void;
}

// Status type definitions - removed L (Late), added DO (Day Off), updated colors
const STATUS_CONFIG = {
  P: { label: 'P', name: 'Present', bg: 'bg-green-500', text: 'text-white', pdfBg: [34, 197, 94] },
  SB: { label: 'SB', name: 'Spring Break', bg: 'bg-violet-400', text: 'text-violet-900', pdfBg: [167, 139, 250] },
  WB: { label: 'WB', name: 'Winter Break', bg: 'bg-violet-400', text: 'text-violet-900', pdfBg: [167, 139, 250] },
  SL: { label: 'SL', name: 'Sick Leave', bg: 'bg-lime-400', text: 'text-lime-900', pdfBg: [163, 230, 53] },
  VL: { label: 'VL', name: 'Vacation Leave', bg: 'bg-yellow-300', text: 'text-yellow-800', pdfBg: [253, 224, 71] },
  H: { label: 'H', name: 'Public Holiday', bg: 'bg-cyan-300', text: 'text-cyan-800', pdfBg: [103, 232, 249] },
  HDA: { label: 'HDA', name: 'Half Day Absent', bg: 'bg-pink-400', text: 'text-pink-900', pdfBg: [244, 114, 182] },
  HDSL: { label: 'HDSL', name: 'Half Day Sick Leave', bg: 'bg-lime-400', text: 'text-lime-900', pdfBg: [163, 230, 53] },
  A: { label: 'A', name: 'Absent', bg: 'bg-red-500', text: 'text-white', pdfBg: [239, 68, 68] },
  DO: { label: 'DO', name: 'Day Off', bg: 'bg-blue-300', text: 'text-blue-800', pdfBg: [147, 197, 253] },
  '-': { label: '-', name: 'No Record', bg: 'bg-gray-200', text: 'text-gray-600', pdfBg: [229, 231, 235] },
  W: { label: '-', name: 'Weekend', bg: 'bg-gray-400', text: 'text-gray-700', pdfBg: [156, 163, 175] },
} as const;

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Editable statuses for the dropdown
const EDITABLE_STATUSES = ['-', 'A', 'H', 'P', 'SL', 'HDSL', 'VL', 'SB', 'WB', 'HDA', 'DO'] as const;

export function MonthlyMatrixView({ onBack }: MonthlyMatrixViewProps) {
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth());
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [editCell, setEditCell] = useState<{ employeeId: string; employeeName: string; date: Date; currentStatus: string } | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<{ id: string; name: string } | null>(null);
  const [manualOverrides, setManualOverrides] = useState<Record<string, string>>({});
  
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

  // Generate days of the month
  const daysInMonth = useMemo(() => {
    const monthStart = startOfMonth(new Date(selectedYear, selectedMonth));
    const monthEnd = endOfMonth(monthStart);
    return eachDayOfInterval({ start: monthStart, end: monthEnd });
  }, [selectedMonth, selectedYear]);

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
    
    // Weekend
    if (isSat || isSun) {
      return 'W';
    }
    
    // Public Holiday
    const holiday = getHolidayForDay(date);
    if (holiday) {
      return 'H';
    }

    // Check for approved leave
    const leave = getLeaveForEmployeeDay(employeeId, date);
    if (leave) {
      const leaveType = leave.leave_type?.toLowerCase() || '';
      if (leaveType.includes('sick')) return 'SL';
      if (leaveType.includes('vacation') || leaveType.includes('annual')) return 'VL';
      if (leaveType.includes('spring')) return 'SB';
      if (leaveType.includes('winter')) return 'WB';
      if (leaveType.includes('day off')) return 'DO';
      return 'VL'; // Default to vacation leave for other approved leaves
    }
    
    // Check attendance
    const attendance = getAttendanceForEmployeeDay(employeeId, date);
    if (!attendance) {
      // Check if date is in future
      if (date > currentDate) return '-';
      return 'A'; // Absent if no record for past working day
    }

    // Map attendance status - Late is now treated as Present in matrix
    const status = attendance.status?.toLowerCase() || '';
    if (status === 'present' || status === 'late' || status.includes('undertime')) return 'P';
    if (status === 'absent') return 'A';
    if (status === 'day off') return 'DO';
    if (status === 'sick leave') return 'SL';
    if (status === 'vacation leave') return 'VL';
    if (status === 'holiday') return 'H';
    if (status === 'spring break') return 'SB';
    if (status === 'winter break') return 'WB';
    if (status === 'half day absent') return 'HDA';
    if (status === 'half day sick leave') return 'HDSL';
    if (status === 'no record') return '-';
    
    return 'P';
  };

  // Mutation to save status to database
  const saveStatusMutation = useMutation({
    mutationFn: async ({ employeeId, date, status }: { employeeId: string; date: Date; status: string }) => {
      const dateStr = format(date, 'yyyy-MM-dd');
      const dbStatus = STATUS_TO_DB[status] || status;
      
      // Check if attendance record exists
      const { data: existing } = await supabase
        .from('attendance')
        .select('id')
        .eq('employee_id', employeeId)
        .eq('date', dateStr)
        .maybeSingle();
      
      if (existing) {
        // Update existing record
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
        // Insert new record
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
      
      // Save to database
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
    return employees.map((emp, index) => {
      const counts = {
        P: 0, SB: 0, WB: 0, H: 0, A: 0, HDA: 0, VL: 0, HDSL: 0, SL: 0, DO: 0
      };
      
      daysInMonth.forEach(day => {
        const status = getDayStatus(emp.id, day);
        if (status !== 'W' && status !== '-') {
          counts[status as keyof typeof counts]++;
        }
      });
      
      return { ...emp, index: index + 1, ...counts };
    });
  }, [employees, daysInMonth, allAttendance, leaveRecords, publicHolidays, manualOverrides]);

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
      { code: 'SB', color: STATUS_CONFIG.SB.pdfBg },
      { code: 'WB', color: STATUS_CONFIG.WB.pdfBg },
      { code: 'H', color: STATUS_CONFIG.H.pdfBg },
      { code: 'A', color: STATUS_CONFIG.A.pdfBg },
      { code: 'VL', color: STATUS_CONFIG.VL.pdfBg },
      { code: 'SL', color: STATUS_CONFIG.SL.pdfBg },
      { code: 'DO', color: STATUS_CONFIG.DO.pdfBg },
    ];
    legends.forEach((leg, idx) => {
      const x = margin + idx * 35;
      doc.setFillColor(leg.color[0], leg.color[1], leg.color[2]);
      doc.rect(x, legendY, 3, 3, 'F');
      doc.text(`${leg.code} = ${STATUS_CONFIG[leg.code as keyof typeof STATUS_CONFIG].name}`, x + 4, legendY + 2.5);
    });

    const startY = 25;
    
    // Table header - Day numbers
    doc.setFillColor(200, 200, 200);
    doc.rect(margin, startY, nameWidth + daysInMonth.length * cellWidth + 70, 8, 'F');
    doc.setFontSize(5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('EMPLOYEE NAME:', margin + 2, startY + 4);
    
    // Day headers (number and name)
    daysInMonth.forEach((day, idx) => {
      const x = margin + nameWidth + idx * cellWidth;
      doc.text(format(day, 'd'), x + cellWidth / 2, startY + 3, { align: 'center' });
      doc.setFontSize(4);
      doc.text(DAY_NAMES[getDay(day)], x + cellWidth / 2, startY + 6.5, { align: 'center' });
      doc.setFontSize(5);
    });

    // Summary headers
    const summaryStartX = margin + nameWidth + daysInMonth.length * cellWidth + 2;
    const summaryHeaders = ['P', 'SB', 'WB', 'H', 'A', 'HDA', 'VL', 'HDSL', 'SL', 'DO'];
    doc.setFontSize(4);
    summaryHeaders.forEach((h, idx) => {
      doc.text(h, summaryStartX + idx * 6.5 + 3, startY + 5, { align: 'center' });
    });

    // Employee rows
    let currentY = startY + 9;

    employeeSummaries.forEach((emp, empIdx) => {
      if (currentY + rowHeight > doc.internal.pageSize.getHeight() - 10) {
        doc.addPage();
        currentY = 15;
      }

      // Row number and name
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5);
      doc.setTextColor(0, 0, 0);
      const rowNum = String(emp.index).padStart(2, '0');
      doc.text(`${rowNum} ${emp.full_name}`, margin + 2, currentY + 3.5);

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
        const x = summaryStartX + idx * 6.5;
        const count = emp[h as keyof typeof emp] as number || 0;
        const config = STATUS_CONFIG[h as keyof typeof STATUS_CONFIG];
        doc.setFillColor(config.pdfBg[0], config.pdfBg[1], config.pdfBg[2]);
        doc.rect(x, currentY, 6, rowHeight, 'F');
        doc.setTextColor(0, 0, 0);
        doc.text(count.toString(), x + 3, currentY + 3.5, { align: 'center' });
      });

      currentY += rowHeight;
    });

    doc.save(`Monthly_Matrix_${months[selectedMonth]}_${selectedYear}.pdf`);
    toast.success('Monthly Matrix PDF generated');
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Monthly Matrix View</h1>
          <p className="text-sm text-muted-foreground">
            Complete attendance matrix with leave types
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant={bulkSelectMode ? "default" : "outline"} 
            onClick={toggleBulkSelectMode}
            className={bulkSelectMode ? "bg-primary" : ""}
          >
            {bulkSelectMode ? <CheckSquare className="w-4 h-4 mr-2" /> : <Square className="w-4 h-4 mr-2" />}
            {bulkSelectMode ? "Selection Mode ON" : "Bulk Select"}
          </Button>
          {bulkSelectMode && selectedCells.size > 0 && (
            <>
              <Button variant="default" onClick={() => setBulkEditDialogOpen(true)}>
                Apply to {selectedCells.size} cells
              </Button>
              <Button variant="ghost" size="icon" onClick={clearSelection}>
                <X className="w-4 h-4" />
              </Button>
            </>
          )}
          <Button variant="outline" onClick={generateMatrixPDF}>
            <Download className="w-4 h-4 mr-2" />
            Export PDF
          </Button>
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Month</span>
          <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {months.map((month, idx) => (
                <SelectItem key={idx} value={idx.toString()}>{month}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Year</span>
          <Input
            type="number"
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value) || currentDate.getFullYear())}
            className="w-[100px]"
            min={2020}
            max={2030}
          />
        </div>
        
        {bulkSelectMode && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-md text-sm">
            <CheckSquare className="w-4 h-4 text-primary" />
            <span className="text-primary font-medium">
              Click cells to select. {selectedCells.size > 0 ? `${selectedCells.size} selected` : 'None selected'}
            </span>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 text-xs">
        {Object.entries(STATUS_CONFIG).filter(([key]) => key !== 'W' && key !== '-').map(([key, config]) => (
          <div key={key} className="flex items-center gap-1">
            <span className={cn("w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold", config.bg, config.text)}>
              {config.label}
            </span>
            <span>{config.name}</span>
          </div>
        ))}
      </div>

      {/* Matrix Grid */}
      <Card>
        <CardContent className="p-2 overflow-x-auto">
          <table className="border-collapse text-xs">
            <thead>
              <tr className="bg-gray-200 dark:bg-gray-700">
                <th className="sticky left-0 bg-gray-200 dark:bg-gray-700 text-left p-1 text-[10px] font-bold min-w-[160px] border border-gray-300">
                  EMPLOYEE NAME:
                </th>
                {daysInMonth.map((day) => (
                  <th 
                    key={day.toISOString()} 
                    className={cn(
                      "text-center p-0.5 text-[9px] font-medium min-w-[24px] border border-gray-300",
                      (getDay(day) === 0 || getDay(day) === 6) && "bg-gray-300 dark:bg-gray-600"
                    )}
                  >
                    <div>{format(day, 'd')}</div>
                    <div className="text-[8px] text-muted-foreground">{DAY_NAMES[getDay(day)]}</div>
                  </th>
                ))}
                {/* Summary headers */}
                {['P', 'SB', 'WB', 'H', 'A', 'HDA', 'VL', 'HDSL', 'SL', 'DO'].map((h) => (
                  <th 
                    key={h} 
                    className={cn(
                      "p-0.5 text-[8px] font-bold min-w-[28px] border border-gray-300 writing-vertical",
                      STATUS_CONFIG[h as keyof typeof STATUS_CONFIG].bg
                    )}
                    style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
                  >
                    {STATUS_CONFIG[h as keyof typeof STATUS_CONFIG].name.toUpperCase()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {employeeSummaries.map((emp) => (
                <tr key={emp.id}>
                  <td 
                    className="sticky left-0 bg-card p-1 border border-gray-300 text-[10px] font-medium whitespace-nowrap cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => setSelectedEmployee({ id: emp.id, name: emp.full_name })}
                  >
                    <span className="text-muted-foreground mr-1">{String(emp.index).padStart(2, '0')}</span>
                    <span className="text-primary hover:underline">{emp.full_name}</span>
                    <Calendar className="inline-block w-3 h-3 ml-1 text-muted-foreground" />
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
                          "text-center p-0 border-2 cursor-pointer hover:opacity-80 transition-all relative",
                          config.bg,
                          isSelected ? "border-primary ring-2 ring-primary ring-inset" : "border-gray-300"
                        )}
                        onClick={() => handleCellClick(emp.id, emp.full_name, day, status)}
                      >
                        <span className={cn("text-[9px] font-bold", config.text)}>
                          {config.label}
                        </span>
                        {isSelected && (
                          <div className="absolute inset-0 bg-primary/20 pointer-events-none" />
                        )}
                      </td>
                    );
                  })}
                  {/* Summary cells */}
                  {['P', 'SB', 'WB', 'H', 'A', 'HDA', 'VL', 'HDSL', 'SL', 'DO'].map((h) => {
                    const count = emp[h as keyof typeof emp] as number || 0;
                    const config = STATUS_CONFIG[h as keyof typeof STATUS_CONFIG];
                    return (
                      <td 
                        key={h}
                        className={cn("text-center p-0.5 border border-gray-300", config.bg)}
                      >
                        <span className={cn("text-[10px] font-bold", config.text)}>{count}</span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
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
                      const config = STATUS_CONFIG[status];
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
              <p className="text-muted-foreground">All selected cells will be updated to the chosen status.</p>
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
