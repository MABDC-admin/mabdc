import { useState } from 'react';
import { useEmployees, useDeleteEmployee, useUpdateEmployee } from '@/hooks/useEmployees';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, Edit, Search, RefreshCw, Save, X, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export function AdminEmployeeSection() {
  const { data: employees = [], isLoading, refetch } = useEmployees();
  const deleteEmployee = useDeleteEmployee();
  const updateEmployee = useUpdateEmployee();
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Record<string, any>>({});
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const filteredEmployees = employees.filter(emp => 
    emp.full_name.toLowerCase().includes(search.toLowerCase()) ||
    emp.hrms_no.toLowerCase().includes(search.toLowerCase())
  );

  const handleEdit = (employee: any) => {
    setEditingId(employee.id);
    setEditData({
      full_name: employee.full_name,
      hrms_no: employee.hrms_no,
      department: employee.department,
      job_position: employee.job_position,
      work_email: employee.work_email,
      basic_salary: employee.basic_salary,
    });
  };

  const handleSave = async () => {
    if (!editingId) return;
    try {
      await updateEmployee.mutateAsync({ id: editingId, ...editData });
      setEditingId(null);
      setEditData({});
    } catch (error) {
      console.error('Failed to update employee:', error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteEmployee.mutateAsync(id);
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Failed to delete employee:', error);
    }
  };

  return (
    <div className="glass-card rounded-3xl border border-border p-6 space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Employee Management</h2>
          <p className="text-xs text-muted-foreground">Edit or delete employee records</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search employees..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 w-full sm:w-64"
            />
          </div>
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className={isLoading ? "animate-spin" : ""} size={16} />
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>HRMS No</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Position</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Salary</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredEmployees.map((employee) => (
              <TableRow key={employee.id}>
                {editingId === employee.id ? (
                  <>
                    <TableCell>
                      <Input 
                        value={editData.hrms_no} 
                        onChange={(e) => setEditData({...editData, hrms_no: e.target.value})}
                        className="h-8 text-xs"
                      />
                    </TableCell>
                    <TableCell>
                      <Input 
                        value={editData.full_name} 
                        onChange={(e) => setEditData({...editData, full_name: e.target.value})}
                        className="h-8 text-xs"
                      />
                    </TableCell>
                    <TableCell>
                      <Input 
                        value={editData.department} 
                        onChange={(e) => setEditData({...editData, department: e.target.value})}
                        className="h-8 text-xs"
                      />
                    </TableCell>
                    <TableCell>
                      <Input 
                        value={editData.job_position} 
                        onChange={(e) => setEditData({...editData, job_position: e.target.value})}
                        className="h-8 text-xs"
                      />
                    </TableCell>
                    <TableCell>
                      <Input 
                        value={editData.work_email} 
                        onChange={(e) => setEditData({...editData, work_email: e.target.value})}
                        className="h-8 text-xs"
                      />
                    </TableCell>
                    <TableCell>
                      <Input 
                        type="number"
                        value={editData.basic_salary} 
                        onChange={(e) => setEditData({...editData, basic_salary: Number(e.target.value)})}
                        className="h-8 text-xs"
                      />
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
                    <TableCell className="text-xs font-mono">{employee.hrms_no}</TableCell>
                    <TableCell className="text-sm font-medium">{employee.full_name}</TableCell>
                    <TableCell className="text-xs">{employee.department}</TableCell>
                    <TableCell className="text-xs">{employee.job_position}</TableCell>
                    <TableCell className="text-xs">{employee.work_email}</TableCell>
                    <TableCell className="text-xs">AED {employee.basic_salary?.toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => handleEdit(employee)} className="h-8 w-8 p-0">
                          <Edit size={14} />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setDeleteConfirm(employee.id)} className="h-8 w-8 p-0 text-destructive hover:text-destructive">
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </TableCell>
                  </>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Delete Employee
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this employee and all related records (attendance, leave, payroll, contracts). This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteConfirm && handleDelete(deleteConfirm)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
