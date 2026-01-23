import { useState, useMemo } from 'react';
import { format, eachDayOfInterval, getDay, startOfMonth, endOfMonth, addMonths } from 'date-fns';
import { Calendar as CalendarIcon, Users, Clock, AlertCircle, CheckCircle2, Loader2, Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useEmployees } from '@/hooks/useEmployees';
import { useTimeShifts, SHIFT_DEFINITIONS, ShiftType } from '@/hooks/useTimeShifts';
import { useCompanySettings } from '@/hooks/useSettings';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { getWeekendDays, getWeekendLabel } from '@/utils/workWeekUtils';

interface BulkEditConfig {
  startDate: Date | undefined;
  endDate: Date | undefined;
  selectedEmployees: string[];
  checkIn: string;
  checkOut: string;
  status: string;
  useEmployeeShift: boolean;
  excludeWeekends: boolean;
  adminRemarks: string;
}

export function AdminBulkAttendanceEditor() {
  const { data: employees = [] } = useEmployees();
  const { data: shifts = [] } = useTimeShifts();
  const { data: companySettings } = useCompanySettings();
  
  // Calculate weekend days dynamically from company settings
  const weekendDays = useMemo(() => {
    return getWeekendDays(
      companySettings?.work_week_start || 'Monday',
      companySettings?.work_week_end || 'Friday'
    );
  }, [companySettings?.work_week_start, companySettings?.work_week_end]);
  
  const weekendLabel = useMemo(() => {
    return getWeekendLabel(
      companySettings?.work_week_start || 'Monday',
      companySettings?.work_week_end || 'Friday'
    );
  }, [companySettings?.work_week_start, companySettings?.work_week_end]);
  
  const [config, setConfig] = useState<BulkEditConfig>({
    startDate: undefined,
    endDate: undefined,
    selectedEmployees: [],
    checkIn: '08:00',
    checkOut: '17:00',
    status: 'Present',
    useEmployeeShift: true,
    excludeWeekends: true,
    adminRemarks: 'Bulk override by admin',
  });
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [previewMode, setPreviewMode] = useState(false);

  // Get active employees only
  const activeEmployees = useMemo(() => 
    employees.filter(e => e.status === 'Active'),
    [employees]
  );

  // Get unique departments
  const departments = useMemo(() => 
    [...new Set(activeEmployees.map(e => e.department))].sort(),
    [activeEmployees]
  );

  // Filter employees by search and department
  const filteredEmployees = useMemo(() => {
    return activeEmployees.filter(emp => {
      const matchesSearch = emp.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.hrms_no.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDept = departmentFilter === 'all' || emp.department === departmentFilter;
      return matchesSearch && matchesDept;
    });
  }, [activeEmployees, searchQuery, departmentFilter]);

  // Create shift map for employee lookup
  const shiftMap = useMemo(() => {
    const map = new Map<string, ShiftType>();
    shifts.forEach(s => map.set(s.employee_id, s.shift_type));
    return map;
  }, [shifts]);

  // Calculate working days in date range
  const workingDays = useMemo(() => {
    if (!config.startDate || !config.endDate) return [];
    
    const allDays = eachDayOfInterval({ start: config.startDate, end: config.endDate });
    
    if (config.excludeWeekends) {
      return allDays.filter(day => !weekendDays.includes(getDay(day)));
    }
    
    return allDays;
  }, [config.startDate, config.endDate, config.excludeWeekends, weekendDays]);

  // Calculate total records to be affected
  const totalRecords = workingDays.length * config.selectedEmployees.length;

  // Get shift times for an employee
  const getShiftTimes = (employeeId: string) => {
    const shiftType = shiftMap.get(employeeId) || 'morning';
    const shift = SHIFT_DEFINITIONS[shiftType];
    return {
      checkIn: shift.start || config.checkIn,
      checkOut: shift.end || config.checkOut,
    };
  };

  // Toggle employee selection
  const toggleEmployee = (employeeId: string) => {
    setConfig(prev => ({
      ...prev,
      selectedEmployees: prev.selectedEmployees.includes(employeeId)
        ? prev.selectedEmployees.filter(id => id !== employeeId)
        : [...prev.selectedEmployees, employeeId],
    }));
  };

  // Select all filtered employees
  const selectAll = () => {
    setConfig(prev => ({
      ...prev,
      selectedEmployees: filteredEmployees.map(e => e.id),
    }));
  };

  // Clear selection
  const clearSelection = () => {
    setConfig(prev => ({
      ...prev,
      selectedEmployees: [],
    }));
  };

  // Validation
  const validation = useMemo(() => {
    const errors: string[] = [];
    
    if (!config.startDate) errors.push('Start date is required');
    if (!config.endDate) errors.push('End date is required');
    if (config.startDate && config.endDate && config.startDate > config.endDate) {
      errors.push('Start date must be before end date');
    }
    if (config.selectedEmployees.length === 0) errors.push('Select at least one employee');
    if (!config.useEmployeeShift) {
      if (!config.checkIn) errors.push('Check-in time is required');
      if (!config.checkOut) errors.push('Check-out time is required');
    }
    if (!config.status) errors.push('Status is required');
    
    return {
      isValid: errors.length === 0,
      errors,
    };
  }, [config]);

  // Process bulk update
  const handleBulkUpdate = async () => {
    if (!validation.isValid) {
      toast.error('Please fix validation errors before proceeding');
      return;
    }

    setIsProcessing(true);
    
    try {
      let successCount = 0;
      let errorCount = 0;
      
      for (const employeeId of config.selectedEmployees) {
        const times = config.useEmployeeShift 
          ? getShiftTimes(employeeId)
          : { checkIn: config.checkIn, checkOut: config.checkOut };
        
        for (const day of workingDays) {
          const dateStr = format(day, 'yyyy-MM-dd');
          
          try {
            const { error } = await supabase
              .from('attendance')
              .upsert({
                employee_id: employeeId,
                date: dateStr,
                check_in: times.checkIn,
                check_out: times.checkOut,
                status: config.status,
                admin_remarks: config.adminRemarks,
                modified_by: 'System Admin',
                modified_at: new Date().toISOString(),
              }, {
                onConflict: 'employee_id,date',
              });
            
            if (error) throw error;
            successCount++;
          } catch (err) {
            console.error(`Error updating attendance for ${employeeId} on ${dateStr}:`, err);
            errorCount++;
          }
        }
      }
      
      if (errorCount === 0) {
        toast.success(`Successfully updated ${successCount} attendance records`);
      } else {
        toast.warning(`Updated ${successCount} records with ${errorCount} errors`);
      }
      
      // Reset form
      setConfig(prev => ({
        ...prev,
        selectedEmployees: [],
      }));
      setPreviewMode(false);
      
    } catch (error: any) {
      toast.error(`Bulk update failed: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Quick date range selectors
  const setDateRange = (type: 'current_month' | 'last_month' | 'custom') => {
    const now = new Date();
    switch (type) {
      case 'current_month':
        setConfig(prev => ({
          ...prev,
          startDate: startOfMonth(now),
          endDate: new Date(),
        }));
        break;
      case 'last_month':
        const lastMonth = addMonths(now, -1);
        setConfig(prev => ({
          ...prev,
          startDate: startOfMonth(lastMonth),
          endDate: endOfMonth(lastMonth),
        }));
        break;
    }
  };

  return (
    <div className="glass-card rounded-3xl border border-border p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Bulk Attendance Editor</h2>
          <p className="text-sm text-muted-foreground">Update attendance records for multiple employees and dates</p>
        </div>
        {totalRecords > 0 && (
          <Badge variant="secondary" className="text-lg px-4 py-2">
            {totalRecords} records
          </Badge>
        )}
      </div>

      {/* Date Range Selection */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Date Range</h3>
        </div>
        
        <div className="flex flex-wrap gap-2 mb-4">
          <Button variant="outline" size="sm" onClick={() => setDateRange('current_month')}>
            This Month
          </Button>
          <Button variant="outline" size="sm" onClick={() => setDateRange('last_month')}>
            Last Month
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Start Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !config.startDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {config.startDate ? format(config.startDate, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={config.startDate}
                  onSelect={(date) => setConfig(prev => ({ ...prev, startDate: date }))}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>End Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !config.endDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {config.endDate ? format(config.endDate, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={config.endDate}
                  onSelect={(date) => setConfig(prev => ({ ...prev, endDate: date }))}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="excludeWeekends"
              checked={config.excludeWeekends}
              onCheckedChange={(checked) => 
                setConfig(prev => ({ ...prev, excludeWeekends: !!checked }))
              }
            />
            <Label htmlFor="excludeWeekends" className="text-sm">
              Exclude weekends ({weekendLabel})
            </Label>
          </div>
          {workingDays.length > 0 && (
            <Badge variant="outline">{workingDays.length} working days</Badge>
          )}
        </div>
      </div>

      {/* Employee Selection */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground">Select Employees</h3>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={selectAll}>
              Select All ({filteredEmployees.length})
            </Button>
            <Button variant="ghost" size="sm" onClick={clearSelection}>
              Clear
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-[200px]">
            <Input
              placeholder="Search by name or HRMS..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
            />
          </div>
          <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
            <SelectTrigger className="w-[180px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departments.map(dept => (
                <SelectItem key={dept} value={dept}>{dept}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Selected count */}
        {config.selectedEmployees.length > 0 && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/10 text-primary">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-sm font-medium">
              {config.selectedEmployees.length} employee(s) selected
            </span>
          </div>
        )}

        {/* Employee List */}
        <ScrollArea className="h-[250px] border rounded-lg">
          <div className="p-3 space-y-1">
            {filteredEmployees.map(employee => {
              const isSelected = config.selectedEmployees.includes(employee.id);
              const shiftType = shiftMap.get(employee.id) || 'morning';
              
              return (
                <div
                  key={employee.id}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors",
                    isSelected 
                      ? "bg-primary/10 border border-primary/30" 
                      : "hover:bg-muted/50 border border-transparent"
                  )}
                  onClick={() => toggleEmployee(employee.id)}
                >
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleEmployee(employee.id)}
                    />
                    <div>
                      <p className="font-medium text-foreground">{employee.full_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {employee.hrms_no} • {employee.department}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {SHIFT_DEFINITIONS[shiftType].label}
                  </Badge>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </div>

      {/* Attendance Settings */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Attendance Settings</h3>
        </div>

        <div className="flex items-center space-x-2 mb-4">
          <Checkbox
            id="useEmployeeShift"
            checked={config.useEmployeeShift}
            onCheckedChange={(checked) => 
              setConfig(prev => ({ ...prev, useEmployeeShift: !!checked }))
            }
          />
          <Label htmlFor="useEmployeeShift" className="text-sm">
            Use each employee's assigned shift times (recommended)
          </Label>
        </div>

        {!config.useEmployeeShift && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg bg-muted/30">
            <div className="space-y-2">
              <Label>Check-In Time</Label>
              <Input
                type="time"
                value={config.checkIn}
                onChange={(e) => setConfig(prev => ({ ...prev, checkIn: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Check-Out Time</Label>
              <Input
                type="time"
                value={config.checkOut}
                onChange={(e) => setConfig(prev => ({ ...prev, checkOut: e.target.value }))}
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Status</Label>
            <Select 
              value={config.status} 
              onValueChange={(value) => setConfig(prev => ({ ...prev, status: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Present">Present</SelectItem>
                <SelectItem value="Late">Late</SelectItem>
                <SelectItem value="Undertime">Undertime</SelectItem>
                <SelectItem value="Missed Punch">Missed Punch</SelectItem>
                <SelectItem value="Appealed">Appealed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Admin Remarks</Label>
            <Input
              value={config.adminRemarks}
              onChange={(e) => setConfig(prev => ({ ...prev, adminRemarks: e.target.value }))}
              placeholder="Reason for bulk update..."
            />
          </div>
        </div>
      </div>

      {/* Validation Errors */}
      {!validation.isValid && (
        <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30 space-y-2">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="w-5 h-5" />
            <span className="font-medium">Please fix the following errors:</span>
          </div>
          <ul className="list-disc list-inside text-sm text-destructive/80">
            {validation.errors.map((error, i) => (
              <li key={i}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Preview & Action */}
      {validation.isValid && (
        <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30 space-y-3">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-amber-700 dark:text-amber-400">Confirm Bulk Update</p>
              <p className="text-sm text-muted-foreground">
                This will create or update <strong>{totalRecords}</strong> attendance records 
                for <strong>{config.selectedEmployees.length}</strong> employees 
                across <strong>{workingDays.length}</strong> working days
                ({config.startDate && format(config.startDate, 'MMM d')} - {config.endDate && format(config.endDate, 'MMM d, yyyy')}).
              </p>
            </div>
          </div>
          
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setConfig(prev => ({ ...prev, selectedEmployees: [] }));
              }}
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={handleBulkUpdate}
              disabled={isProcessing}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Apply Bulk Update
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
