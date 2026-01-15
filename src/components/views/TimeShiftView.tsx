import { useState, useMemo } from "react";
import { format } from "date-fns";
import { useEmployees } from "@/hooks/useEmployees";
import { useTimeShifts, useAssignShift, useBulkAssignShift, useRemoveShift } from "@/hooks/useTimeShifts";
import { useShiftOverrides } from "@/hooks/useShiftOverrides";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, Sun, Sunset, Search, Users, RefreshCw, CalendarClock, Settings2 } from "lucide-react";
import { ShiftOverrideDialog } from "@/components/modals/ShiftOverrideDialog";

const SHIFTS = {
  morning: { label: "Morning Shift", time: "08:00 - 17:00", icon: Sun },
  afternoon: { label: "Afternoon Shift", time: "10:00 - 19:00", icon: Sunset },
} as const;

export default function TimeShiftView() {
  const { data: employees = [], isLoading: loadingEmployees, refetch } = useEmployees();
  const { data: shifts = [], isLoading: loadingShifts } = useTimeShifts();
  const { data: allOverrides = [] } = useShiftOverrides();
  const assignShift = useAssignShift();
  const bulkAssignShift = useBulkAssignShift();
  const removeShift = useRemoveShift();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [activeShiftFilter, setActiveShiftFilter] = useState<"all" | "morning" | "afternoon" | "unassigned">("all");
  const [overrideDialogOpen, setOverrideDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const shiftMap = useMemo(() => {
    const map = new Map<string, "morning" | "afternoon">();
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
    let morning = 0,
      afternoon = 0,
      unassigned = 0;
    employees.forEach((emp) => {
      const shift = shiftMap.get(emp.id);
      if (shift === "morning") morning++;
      else if (shift === "afternoon") afternoon++;
      else unassigned++;
    });
    return { morning, afternoon, unassigned, total: employees.length };
  }, [employees, shiftMap]);

  const handleSelectEmployee = (employeeId: string, checked: boolean) => {
    setSelectedEmployees((prev) => (checked ? [...prev, employeeId] : prev.filter((id) => id !== employeeId)));
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectedEmployees(checked ? filteredEmployees.map((e) => e.id) : []);
  };

  const handleBulkAssign = (shiftType: "morning" | "afternoon") => {
    if (selectedEmployees.length === 0) return;
    bulkAssignShift.mutate({ employeeIds: selectedEmployees, shiftType });
    setSelectedEmployees([]);
  };

  const handleAssignShift = (employeeId: string, shiftType: "morning" | "afternoon") => {
    assignShift.mutate({ employeeId, shiftType });
  };

  const handleRemoveShift = (employeeId: string) => {
    removeShift.mutate(employeeId);
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const isLoading = loadingEmployees || loadingShifts;

  // Count upcoming overrides
  const upcomingOverridesCount = allOverrides.filter(o => o.override_date >= format(new Date(), 'yyyy-MM-dd')).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Time Shift Management</h1>
          <p className="text-muted-foreground">Assign employees to shifts (Monday - Friday)</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setOverrideDialogOpen(true)}>
            <CalendarClock className="h-4 w-4 mr-2" />
            Manage Overrides
            {upcomingOverridesCount > 0 && (
              <Badge variant="secondary" className="ml-2">{upcomingOverridesCount}</Badge>
            )}
          </Button>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <Tabs defaultValue="assignments" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="assignments" className="gap-2">
            <Settings2 className="h-4 w-4" />
            Permanent Shifts
          </TabsTrigger>
          <TabsTrigger value="overrides" className="gap-2">
            <CalendarClock className="h-4 w-4" />
            Daily Overrides
            {upcomingOverridesCount > 0 && (
              <Badge variant="secondary" className="ml-1">{upcomingOverridesCount}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="assignments" className="space-y-6">

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

        <Card
          className={`cursor-pointer hover:shadow-md transition-shadow ${activeShiftFilter === "morning" ? "ring-2 ring-yellow-500" : ""}`}
          onClick={() => setActiveShiftFilter("morning")}
        >
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-full bg-yellow-100 dark:bg-yellow-900/30">
              <Sun className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Morning (08:00-17:00)</p>
              <p className="text-2xl font-bold">{shiftStats.morning}</p>
            </div>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer hover:shadow-md transition-shadow ${activeShiftFilter === "afternoon" ? "ring-2 ring-orange-500" : ""}`}
          onClick={() => setActiveShiftFilter("afternoon")}
        >
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-full bg-orange-100 dark:bg-orange-900/30">
              <Sunset className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Afternoon (09:00-18:00)</p>
              <p className="text-2xl font-bold">{shiftStats.afternoon}</p>
            </div>
          </CardContent>
        </Card>

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
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => handleBulkAssign("morning")}
                className="bg-yellow-500 hover:bg-yellow-600 text-white"
              >
                <Sun className="h-4 w-4 mr-2" />
                Assign Morning
              </Button>
              <Button
                size="sm"
                onClick={() => handleBulkAssign("afternoon")}
                className="bg-orange-500 hover:bg-orange-600 text-white"
              >
                <Sunset className="h-4 w-4 mr-2" />
                Assign Afternoon
              </Button>
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
                        {currentShift && (
                          <Badge
                            variant="outline"
                            className={
                              currentShift === "morning"
                                ? "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-300"
                                : "bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/30 dark:text-orange-300"
                            }
                          >
                            {SHIFTS[currentShift].time}
                          </Badge>
                        )}

                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant={currentShift === "morning" ? "default" : "outline"}
                            onClick={() => handleAssignShift(employee.id, "morning")}
                            className={currentShift === "morning" ? "bg-yellow-500 hover:bg-yellow-600" : ""}
                          >
                            <Sun className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant={currentShift === "afternoon" ? "default" : "outline"}
                            onClick={() => handleAssignShift(employee.id, "afternoon")}
                            className={currentShift === "afternoon" ? "bg-orange-500 hover:bg-orange-600" : ""}
                          >
                            <Sunset className="h-4 w-4" />
                          </Button>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
              <Sun className="h-8 w-8 text-yellow-600" />
              <div>
                <p className="font-medium text-yellow-800 dark:text-yellow-300">Morning Shift</p>
                <p className="text-sm text-yellow-700 dark:text-yellow-400">08:00 AM - 05:00 PM</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800">
              <Sunset className="h-8 w-8 text-orange-600" />
              <div>
                <p className="font-medium text-orange-800 dark:text-orange-300">Afternoon Shift</p>
                <p className="text-sm text-orange-700 dark:text-orange-400">10:00 AM - 07:00 PM</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="overrides" className="space-y-6">
          {/* Overrides Management Section */}
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <CalendarClock className="h-5 w-5" />
                    Daily Shift Overrides
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Manage custom schedules for specific dates. Overrides take precedence over permanent shift assignments.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-auto"
                  />
                  <Button onClick={() => setOverrideDialogOpen(true)}>
                    <CalendarClock className="h-4 w-4 mr-2" />
                    Add Override
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {allOverrides.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <CalendarClock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="font-medium">No shift overrides configured</p>
                  <p className="text-sm">Click "Add Override" to create flexible schedules for specific dates</p>
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {allOverrides.map((override) => {
                      const employee = employees.find(e => e.id === override.employee_id);
                      const isPast = override.override_date < format(new Date(), 'yyyy-MM-dd');
                      
                      return (
                        <div
                          key={override.id}
                          className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
                            isPast ? 'opacity-60 bg-muted/30' : 'hover:bg-muted/50'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={employee?.photo_url || ""} alt={employee?.full_name || ""} />
                              <AvatarFallback>{employee?.full_name?.split(" ").map(n => n[0]).join("").slice(0, 2) || "?"}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{employee?.full_name || "Unknown"}</p>
                              <p className="text-sm text-muted-foreground">
                                {employee?.hrms_no} • {format(new Date(override.override_date), 'EEE, MMM dd, yyyy')}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                              <Clock className="w-3 h-3 mr-1" />
                              {override.shift_start_time.substring(0, 5)} - {override.shift_end_time.substring(0, 5)}
                            </Badge>
                            
                            {override.reason && (
                              <span className="text-xs text-muted-foreground max-w-[150px] truncate" title={override.reason}>
                                {override.reason}
                              </span>
                            )}
                            
                            {isPast && (
                              <Badge variant="secondary" className="text-xs">Past</Badge>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Shift Override Dialog */}
      <ShiftOverrideDialog
        isOpen={overrideDialogOpen}
        onClose={() => setOverrideDialogOpen(false)}
        selectedDate={selectedDate}
      />
    </div>
  );
}
