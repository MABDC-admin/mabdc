import { useState, useMemo } from "react";
import { useEmployees } from "@/hooks/useEmployees";
import { 
  useTimeShifts, 
  useAssignShift, 
  useBulkAssignShift, 
  useRemoveShift,
  useShiftDefinitions,
  useCreateShiftDefinition,
  useUpdateShiftDefinition,
  useDeleteShiftDefinition,
  TimeShift,
  CreateTimeShiftData,
} from "@/hooks/useTimeShifts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Clock, Sun, Sunset, Search, Users, RefreshCw, Plus, Pencil, Trash2, Settings } from "lucide-react";

// Fallback shifts when database is empty or loading
const DEFAULT_SHIFTS: Record<string, { label: string; time: string; icon: typeof Sun }> = {
  morning: { label: "Morning Shift", time: "08:00 - 17:00", icon: Sun },
  afternoon: { label: "Afternoon Shift", time: "09:00 - 18:00", icon: Sunset },
};

// Helper to format time for display
function formatTimeRange(startTime: string, endTime: string): string {
  const formatTime = (t: string) => t.slice(0, 5);
  return `${formatTime(startTime)} - ${formatTime(endTime)}`;
}

// Helper to format time for display in 12hr format
function formatTime12hr(time: string): string {
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12.toString().padStart(2, '0')}:${minutes} ${ampm}`;
}

export default function TimeShiftView() {
  const { data: employees = [], isLoading: loadingEmployees, refetch } = useEmployees();
  const { data: shifts = [], isLoading: loadingShifts } = useTimeShifts();
  const { data: shiftDefinitions = [], isLoading: loadingDefinitions } = useShiftDefinitions();
  const assignShift = useAssignShift();
  const bulkAssignShift = useBulkAssignShift();
  const removeShift = useRemoveShift();
  const createShiftDef = useCreateShiftDefinition();
  const updateShiftDef = useUpdateShiftDefinition();
  const deleteShiftDef = useDeleteShiftDefinition();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [activeShiftFilter, setActiveShiftFilter] = useState<string>("all");
  const [showShiftManager, setShowShiftManager] = useState(false);
  
  // Shift form state
  const [editingShift, setEditingShift] = useState<TimeShift | null>(null);
  const [shiftFormOpen, setShiftFormOpen] = useState(false);
  const [shiftForm, setShiftForm] = useState<CreateTimeShiftData>({
    name: "",
    shift_key: "",
    start_time: "",
    end_time: "",
    is_active: true,
  });

  // Build SHIFTS map from database definitions
  const SHIFTS = useMemo(() => {
    if (shiftDefinitions.length === 0) return DEFAULT_SHIFTS;
    
    const map: Record<string, { label: string; time: string; icon: typeof Sun }> = {};
    shiftDefinitions.forEach((def) => {
      map[def.shift_key] = {
        label: def.name,
        time: formatTimeRange(def.start_time, def.end_time),
        icon: def.shift_key.toLowerCase().includes('morning') ? Sun : Sunset,
      };
    });
    return map;
  }, [shiftDefinitions]);

  // Get active shift keys for filtering
  const activeShiftKeys = useMemo(() => {
    return shiftDefinitions.filter(d => d.is_active !== false).map(d => d.shift_key);
  }, [shiftDefinitions]);

  const shiftMap = useMemo(() => {
    const map = new Map<string, string>();
    shifts.forEach((s) => map.set(s.employee_id, s.shift_type));
    return map;
  }, [shifts]);

  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const matchesSearch =
        emp.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.hrms_no.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      const empShift = shiftMap.get(emp.id);

      if (activeShiftFilter === "all") return true;
      if (activeShiftFilter === "unassigned") return !empShift;
      return empShift === activeShiftFilter;
    });
  }, [employees, searchQuery, activeShiftFilter, shiftMap]);

  const shiftStats = useMemo(() => {
    const stats: Record<string, number> = { unassigned: 0, total: employees.length };
    
    // Initialize stats for all shift definitions
    shiftDefinitions.forEach(def => {
      stats[def.shift_key] = 0;
    });
    
    employees.forEach((emp) => {
      const shift = shiftMap.get(emp.id);
      if (shift && stats[shift] !== undefined) {
        stats[shift]++;
      } else {
        stats.unassigned++;
      }
    });
    
    return stats;
  }, [employees, shiftMap, shiftDefinitions]);

  const handleSelectEmployee = (employeeId: string, checked: boolean) => {
    setSelectedEmployees((prev) => (checked ? [...prev, employeeId] : prev.filter((id) => id !== employeeId)));
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectedEmployees(checked ? filteredEmployees.map((e) => e.id) : []);
  };

  const handleBulkAssign = (shiftType: string) => {
    if (selectedEmployees.length === 0) return;
    bulkAssignShift.mutate({ employeeIds: selectedEmployees, shiftType });
    setSelectedEmployees([]);
  };

  const handleAssignShift = (employeeId: string, shiftType: string) => {
    assignShift.mutate({ employeeId, shiftType });
  };

  const handleRemoveShift = (employeeId: string) => {
    removeShift.mutate(employeeId);
  };

  // Shift definition CRUD handlers
  const resetShiftForm = () => {
    setShiftForm({ name: "", shift_key: "", start_time: "", end_time: "", is_active: true });
    setEditingShift(null);
  };

  const openCreateShiftDialog = () => {
    resetShiftForm();
    setShiftFormOpen(true);
  };

  const openEditShiftDialog = (shift: TimeShift) => {
    setEditingShift(shift);
    setShiftForm({
      name: shift.name,
      shift_key: shift.shift_key,
      start_time: shift.start_time.slice(0, 5),
      end_time: shift.end_time.slice(0, 5),
      is_active: shift.is_active ?? true,
    });
    setShiftFormOpen(true);
  };

  const handleSaveShift = () => {
    if (!shiftForm.name || !shiftForm.shift_key || !shiftForm.start_time || !shiftForm.end_time) {
      return;
    }
    
    if (editingShift) {
      updateShiftDef.mutate({ id: editingShift.id, data: shiftForm }, {
        onSuccess: () => {
          setShiftFormOpen(false);
          resetShiftForm();
        }
      });
    } else {
      createShiftDef.mutate(shiftForm, {
        onSuccess: () => {
          setShiftFormOpen(false);
          resetShiftForm();
        }
      });
    }
  };

  const handleDeleteShift = (id: string) => {
    deleteShiftDef.mutate(id);
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const isLoading = loadingEmployees || loadingShifts || loadingDefinitions;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Time Shift Management</h1>
          <p className="text-muted-foreground">Assign employees to shifts (Monday - Friday)</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowShiftManager(!showShiftManager)}>
            <Settings className="h-4 w-4 mr-2" />
            Manage Shifts
          </Button>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Shift Management Section */}
      {showShiftManager && (
        <Card className="border-primary/20">
          <CardHeader className="pb-3">
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg">Shift Definitions</CardTitle>
              <Dialog open={shiftFormOpen} onOpenChange={(open) => { setShiftFormOpen(open); if (!open) resetShiftForm(); }}>
                <DialogTrigger asChild>
                  <Button size="sm" onClick={openCreateShiftDialog}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Shift
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingShift ? 'Edit Shift' : 'Create New Shift'}</DialogTitle>
                    <DialogDescription>
                      {editingShift ? 'Update the shift details below.' : 'Define a new shift type with custom times.'}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="name">Shift Name</Label>
                      <Input
                        id="name"
                        placeholder="e.g., Morning Shift"
                        value={shiftForm.name}
                        onChange={(e) => setShiftForm({ ...shiftForm, name: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="shift_key">Shift Key (unique identifier)</Label>
                      <Input
                        id="shift_key"
                        placeholder="e.g., morning, afternoon, night"
                        value={shiftForm.shift_key}
                        onChange={(e) => setShiftForm({ ...shiftForm, shift_key: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                        disabled={!!editingShift}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="start_time">Start Time</Label>
                        <Input
                          id="start_time"
                          type="time"
                          value={shiftForm.start_time}
                          onChange={(e) => setShiftForm({ ...shiftForm, start_time: e.target.value })}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="end_time">End Time</Label>
                        <Input
                          id="end_time"
                          type="time"
                          value={shiftForm.end_time}
                          onChange={(e) => setShiftForm({ ...shiftForm, end_time: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="is_active"
                        checked={shiftForm.is_active}
                        onCheckedChange={(checked) => setShiftForm({ ...shiftForm, is_active: checked })}
                      />
                      <Label htmlFor="is_active">Active</Label>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShiftFormOpen(false)}>Cancel</Button>
                    <Button onClick={handleSaveShift} disabled={createShiftDef.isPending || updateShiftDef.isPending}>
                      {editingShift ? 'Update' : 'Create'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {shiftDefinitions.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No shift definitions yet. Create one to get started.</p>
            ) : (
              <div className="grid gap-3">
                {shiftDefinitions.map((shift) => (
                  <div key={shift.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${shift.shift_key.includes('morning') ? 'bg-yellow-100 dark:bg-yellow-900/30' : 'bg-orange-100 dark:bg-orange-900/30'}`}>
                        {shift.shift_key.includes('morning') ? <Sun className="h-5 w-5 text-yellow-600" /> : <Sunset className="h-5 w-5 text-orange-600" />}
                      </div>
                      <div>
                        <p className="font-medium">{shift.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatTime12hr(shift.start_time)} - {formatTime12hr(shift.end_time)}
                          {shift.is_active === false && <span className="ml-2 text-red-500">(Inactive)</span>}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => openEditShiftDialog(shift)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Shift?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{shift.name}"? This action cannot be undone.
                              Employees assigned to this shift will need to be reassigned.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteShift(shift.id)} className="bg-destructive text-destructive-foreground">
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Shift Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveShiftFilter("all")}>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-full bg-primary/10">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Employees</p>
              <p className="text-2xl font-bold">{shiftStats.total}</p>
            </div>
          </CardContent>
        </Card>

        {shiftDefinitions.filter(d => d.is_active !== false).map((shift) => (
          <Card
            key={shift.id}
            className={`cursor-pointer hover:shadow-md transition-shadow ${activeShiftFilter === shift.shift_key ? "ring-2 ring-primary" : ""}`}
            onClick={() => setActiveShiftFilter(shift.shift_key)}
          >
            <CardContent className="p-4 flex items-center gap-4">
              <div className={`p-3 rounded-full ${shift.shift_key.includes('morning') ? 'bg-yellow-100 dark:bg-yellow-900/30' : 'bg-orange-100 dark:bg-orange-900/30'}`}>
                {shift.shift_key.includes('morning') ? <Sun className="h-6 w-6 text-yellow-600" /> : <Sunset className="h-6 w-6 text-orange-600" />}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{shift.name} ({formatTimeRange(shift.start_time, shift.end_time)})</p>
                <p className="text-2xl font-bold">{shiftStats[shift.shift_key] || 0}</p>
              </div>
            </CardContent>
          </Card>
        ))}

        <Card
          className={`cursor-pointer hover:shadow-md transition-shadow ${activeShiftFilter === "unassigned" ? "ring-2 ring-gray-500" : ""}`}
          onClick={() => setActiveShiftFilter("unassigned")}
        >
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-full bg-muted">
              <Clock className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Unassigned</p>
              <p className="text-2xl font-bold">{shiftStats.unassigned}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bulk Actions */}
      {selectedEmployees.length > 0 && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <p className="font-medium">{selectedEmployees.length} employee(s) selected</p>
            <div className="flex flex-wrap gap-2">
              {shiftDefinitions.filter(d => d.is_active !== false).map((shift) => (
                <Button
                  key={shift.id}
                  size="sm"
                  onClick={() => handleBulkAssign(shift.shift_key)}
                  className={shift.shift_key.includes('morning') ? "bg-yellow-500 hover:bg-yellow-600 text-white" : "bg-orange-500 hover:bg-orange-600 text-white"}
                >
                  {shift.shift_key.includes('morning') ? <Sun className="h-4 w-4 mr-2" /> : <Sunset className="h-4 w-4 mr-2" />}
                  Assign {shift.name}
                </Button>
              ))}
              <Button size="sm" variant="outline" onClick={() => setSelectedEmployees([])}>
                Clear Selection
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Employee List */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle>Employee Shift Assignments</CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search employees..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : filteredEmployees.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No employees found</div>
          ) : (
            <ScrollArea className="h-[500px]">
              <div className="space-y-2">
                {/* Select All */}
                <div className="flex items-center gap-3 p-3 border-b">
                  <Checkbox
                    checked={selectedEmployees.length === filteredEmployees.length && filteredEmployees.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                  <span className="text-sm font-medium text-muted-foreground">Select All</span>
                </div>

                {filteredEmployees.map((employee) => {
                  const currentShift = shiftMap.get(employee.id);

                  return (
                    <div
                      key={employee.id}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={selectedEmployees.includes(employee.id)}
                          onCheckedChange={(checked) => handleSelectEmployee(employee.id, !!checked)}
                        />
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={employee.photo_url || ""} alt={employee.full_name} />
                          <AvatarFallback>{getInitials(employee.full_name)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{employee.full_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {employee.hrms_no} • {employee.department}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {currentShift && SHIFTS[currentShift] && (
                          <Badge
                            variant="outline"
                            className={
                              currentShift.includes("morning")
                                ? "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-300"
                                : "bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/30 dark:text-orange-300"
                            }
                          >
                            {SHIFTS[currentShift]?.time || currentShift}
                          </Badge>
                        )}

                        <div className="flex gap-1 flex-wrap">
                          {shiftDefinitions.filter(d => d.is_active !== false).map((shift) => (
                            <Button
                              key={shift.id}
                              size="sm"
                              variant={currentShift === shift.shift_key ? "default" : "outline"}
                              onClick={() => handleAssignShift(employee.id, shift.shift_key)}
                              className={currentShift === shift.shift_key ? (shift.shift_key.includes('morning') ? "bg-yellow-500 hover:bg-yellow-600" : "bg-orange-500 hover:bg-orange-600") : ""}
                              title={shift.name}
                            >
                              {shift.shift_key.includes('morning') ? <Sun className="h-4 w-4" /> : <Sunset className="h-4 w-4" />}
                            </Button>
                          ))}
                          {currentShift && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleRemoveShift(employee.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              ✕
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Shift Legend */}
      <Card>
        <CardContent className="p-4">
          <h3 className="font-semibold mb-3">Shift Schedule (Monday - Friday)</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {shiftDefinitions.filter(d => d.is_active !== false).map((shift) => (
              <div 
                key={shift.id} 
                className={`flex items-center gap-3 p-3 rounded-lg border ${
                  shift.shift_key.includes('morning') 
                    ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800' 
                    : 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800'
                }`}
              >
                {shift.shift_key.includes('morning') 
                  ? <Sun className="h-8 w-8 text-yellow-600" /> 
                  : <Sunset className="h-8 w-8 text-orange-600" />
                }
                <div>
                  <p className={`font-medium ${
                    shift.shift_key.includes('morning') 
                      ? 'text-yellow-800 dark:text-yellow-300' 
                      : 'text-orange-800 dark:text-orange-300'
                  }`}>
                    {shift.name}
                  </p>
                  <p className={`text-sm ${
                    shift.shift_key.includes('morning') 
                      ? 'text-yellow-700 dark:text-yellow-400' 
                      : 'text-orange-700 dark:text-orange-400'
                  }`}>
                    {formatTime12hr(shift.start_time)} - {formatTime12hr(shift.end_time)}
                  </p>
                </div>
              </div>
            ))}
            {shiftDefinitions.filter(d => d.is_active !== false).length === 0 && (
              <p className="text-muted-foreground col-span-full text-center py-4">
                No active shifts defined. Click "Manage Shifts" to create shift definitions.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
