import { useState } from 'react';
import { useLeave, useDeleteLeave, useAddLeave, useUpdateLeave } from '@/hooks/useLeave';
import { useEmployees } from '@/hooks/useEmployees';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, Edit, Plus, Search, RefreshCw, Save, X, Calendar } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export function AdminLeaveSection() {
  const { data: leaveRecords = [], isLoading, refetch } = useLeave();
  const { data: employees = [] } = useEmployees();
  const deleteLeave = useDeleteLeave();
  const addLeave = useAddLeave();
  const updateLeave = useUpdateLeave();
  
  const [search, setSearch] = useState('');
  const [filterEmployee, setFilterEmployee] = useState<string>('all');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Record<string, any>>({});
  
  const [newLeave, setNewLeave] = useState<{
    employee_id: string;
    leave_type: string;
    start_date: string;
    end_date: string;
    days_count: number;
    reason: string;
    status: 'Pending' | 'Approved' | 'Rejected';
  }>({
    employee_id: '',
    leave_type: 'Annual',
    start_date: '',
    end_date: '',
    days_count: 1,
    reason: '',
    status: 'Approved',
  });

  const filteredLeave = leaveRecords.filter(leave => {
    const matchesSearch = leave.employees?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      leave.leave_type.toLowerCase().includes(search.toLowerCase());
    const matchesEmployee = filterEmployee === 'all' || leave.employee_id === filterEmployee;
    return matchesSearch && matchesEmployee;
  });

  const handleAddLeave = async () => {
    if (!newLeave.employee_id || !newLeave.start_date || !newLeave.end_date) {
      return;
    }
    try {
      await addLeave.mutateAsync(newLeave);
      setIsAddOpen(false);
      setNewLeave({
        employee_id: '',
        leave_type: 'Annual',
        start_date: '',
        end_date: '',
        days_count: 1,
        reason: '',
        status: 'Approved' as const,
      });
    } catch (error) {
      console.error('Failed to add leave:', error);
    }
  };

  const handleEdit = (leave: any) => {
    setEditingId(leave.id);
    setEditData({
      leave_type: leave.leave_type,
      start_date: leave.start_date,
      end_date: leave.end_date,
      days_count: leave.days_count,
      status: leave.status,
      reason: leave.reason,
    });
  };

  const handleSave = async () => {
    if (!editingId) return;
    try {
      await updateLeave.mutateAsync({ id: editingId, ...editData });
      setEditingId(null);
      setEditData({});
    } catch (error) {
      console.error('Failed to update leave:', error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteLeave.mutateAsync(id);
    } catch (error) {
      console.error('Failed to delete leave:', error);
    }
  };

  const leaveTypes = ['Annual', 'Sick', 'Emergency', 'Unpaid', 'Maternity', 'Paternity', 'Compassionate', 'Hajj'];
  const statuses = ['Pending', 'Approved', 'Rejected'];

  return (
    <div className="glass-card rounded-3xl border border-border p-6 space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Leave History Management</h2>
          <p className="text-xs text-muted-foreground">Add, edit or delete leave records for employees</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 w-40"
            />
          </div>
          <Select value={filterEmployee} onValueChange={setFilterEmployee}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All Employees" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Employees</SelectItem>
              {employees.map((emp) => (
                <SelectItem key={emp.id} value={emp.id}>{emp.full_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => setIsAddOpen(true)} size="sm" className="bg-primary text-primary-foreground">
            <Plus size={16} className="mr-1" /> Add Leave
          </Button>
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className={isLoading ? "animate-spin" : ""} size={16} />
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Employee</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Start Date</TableHead>
              <TableHead>End Date</TableHead>
              <TableHead>Days</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLeave.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No leave records found
                </TableCell>
              </TableRow>
            ) : (
              filteredLeave.map((leave) => (
                <TableRow key={leave.id}>
                  {editingId === leave.id ? (
                    <>
                      <TableCell className="text-sm">{leave.employees?.full_name}</TableCell>
                      <TableCell>
                        <Select value={editData.leave_type} onValueChange={(v) => setEditData({...editData, leave_type: v})}>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {leaveTypes.map((type) => (
                              <SelectItem key={type} value={type}>{type}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input 
                          type="date"
                          value={editData.start_date} 
                          onChange={(e) => setEditData({...editData, start_date: e.target.value})}
                          className="h-8 text-xs"
                        />
                      </TableCell>
                      <TableCell>
                        <Input 
                          type="date"
                          value={editData.end_date} 
                          onChange={(e) => setEditData({...editData, end_date: e.target.value})}
                          className="h-8 text-xs"
                        />
                      </TableCell>
                      <TableCell>
                        <Input 
                          type="number"
                          value={editData.days_count} 
                          onChange={(e) => setEditData({...editData, days_count: Number(e.target.value)})}
                          className="h-8 text-xs w-16"
                        />
                      </TableCell>
                      <TableCell>
                        <Select value={editData.status} onValueChange={(v) => setEditData({...editData, status: v})}>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {statuses.map((status) => (
                              <SelectItem key={status} value={status}>{status}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button size="sm" variant="ghost" onClick={handleSave} className="h-8 w-8 p-0 text-primary">
                            <Save size={14} />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} className="h-8 w-8 p-0">
                            <X size={14} />
                          </Button>
                        </div>
                      </TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell className="text-sm font-medium">{leave.employees?.full_name}</TableCell>
                      <TableCell className="text-xs">{leave.leave_type}</TableCell>
                      <TableCell className="text-xs">{format(new Date(leave.start_date), 'dd MMM yyyy')}</TableCell>
                      <TableCell className="text-xs">{format(new Date(leave.end_date), 'dd MMM yyyy')}</TableCell>
                      <TableCell className="text-xs font-medium">{leave.days_count}</TableCell>
                      <TableCell>
                        <span className={cn(
                          "text-xs px-2 py-1 rounded-full",
                          leave.status === 'Approved' && "bg-emerald-500/10 text-emerald-500",
                          leave.status === 'Pending' && "bg-amber-500/10 text-amber-500",
                          leave.status === 'Rejected' && "bg-destructive/10 text-destructive"
                        )}>
                          {leave.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button size="sm" variant="ghost" onClick={() => handleEdit(leave)} className="h-8 w-8 p-0">
                            <Edit size={14} />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDelete(leave.id)} className="h-8 w-8 p-0 text-destructive hover:text-destructive">
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </TableCell>
                    </>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add Leave Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Add Leave Record
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Employee</Label>
              <Select value={newLeave.employee_id} onValueChange={(v) => setNewLeave({...newLeave, employee_id: v})}>
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
              <Label>Leave Type</Label>
              <Select value={newLeave.leave_type} onValueChange={(v) => setNewLeave({...newLeave, leave_type: v})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {leaveTypes.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input 
                  type="date" 
                  value={newLeave.start_date}
                  onChange={(e) => setNewLeave({...newLeave, start_date: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input 
                  type="date" 
                  value={newLeave.end_date}
                  onChange={(e) => setNewLeave({...newLeave, end_date: e.target.value})}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Days</Label>
                <Input 
                  type="number" 
                  value={newLeave.days_count}
                  onChange={(e) => setNewLeave({...newLeave, days_count: Number(e.target.value)})}
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={newLeave.status} onValueChange={(v) => setNewLeave({...newLeave, status: v as 'Pending' | 'Approved' | 'Rejected'})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statuses.map((status) => (
                      <SelectItem key={status} value={status}>{status}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Reason (optional)</Label>
              <Input 
                value={newLeave.reason}
                onChange={(e) => setNewLeave({...newLeave, reason: e.target.value})}
                placeholder="Enter reason"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAddLeave} disabled={addLeave.isPending}>
              {addLeave.isPending ? 'Adding...' : 'Add Leave'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
