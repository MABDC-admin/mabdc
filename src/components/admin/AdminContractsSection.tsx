import { useState } from 'react';
import { useContracts, useDeleteContract } from '@/hooks/useContracts';
import { useEmployees } from '@/hooks/useEmployees';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { Trash2, Search, FileText, Loader2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

export function AdminContractsSection() {
  const { data: contracts = [], isLoading } = useContracts();
  const { data: employees = [] } = useEmployees();
  const deleteContract = useDeleteContract();
  const [searchQuery, setSearchQuery] = useState('');
  const [contractToDelete, setContractToDelete] = useState<{
    id: string;
    employeeName: string;
    mohreNo: string;
  } | null>(null);

  const getEmployeeName = (employeeId: string) => {
    const employee = employees.find(e => e.id === employeeId);
    return employee?.full_name || 'Unknown';
  };

  const filteredContracts = contracts.filter(contract => {
    const employeeName = contract.employees?.full_name || getEmployeeName(contract.employee_id);
    const searchLower = searchQuery.toLowerCase();
    return (
      employeeName.toLowerCase().includes(searchLower) ||
      contract.mohre_contract_no.toLowerCase().includes(searchLower) ||
      contract.status?.toLowerCase().includes(searchLower)
    );
  });

  const handleDeleteClick = (contract: typeof contracts[0]) => {
    setContractToDelete({
      id: contract.id,
      employeeName: contract.employees?.full_name || getEmployeeName(contract.employee_id),
      mohreNo: contract.mohre_contract_no,
    });
  };

  const handleConfirmDelete = async () => {
    if (!contractToDelete) return;
    await deleteContract.mutateAsync(contractToDelete.id);
    setContractToDelete(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active':
        return 'bg-green-500/20 text-green-600 border-green-500/30';
      case 'Draft':
        return 'bg-muted text-muted-foreground border-border';
      case 'Expired':
        return 'bg-destructive/20 text-destructive border-destructive/30';
      case 'Terminated':
        return 'bg-orange-500/20 text-orange-600 border-orange-500/30';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  if (isLoading) {
    return (
      <div className="glass-card rounded-3xl border border-border p-6 flex items-center justify-center min-h-[300px]">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="glass-card rounded-3xl border border-border p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Contracts Management</h2>
          <Badge variant="secondary">{contracts.length} total</Badge>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search contracts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {filteredContracts.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {searchQuery ? 'No contracts match your search' : 'No contracts found'}
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Employee</TableHead>
                <TableHead>MOHRE No</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>End Date</TableHead>
                <TableHead>Salary</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredContracts.map((contract) => (
                <TableRow key={contract.id} className="hover:bg-muted/30">
                  <TableCell className="font-medium">
                    {contract.employees?.full_name || getEmployeeName(contract.employee_id)}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {contract.mohre_contract_no}
                  </TableCell>
                  <TableCell>{contract.contract_type}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn(getStatusColor(contract.status || 'Draft'))}>
                      {contract.status || 'Draft'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {format(parseISO(contract.start_date), 'dd MMM yyyy')}
                  </TableCell>
                  <TableCell>
                    {contract.end_date ? format(parseISO(contract.end_date), 'dd MMM yyyy') : '—'}
                  </TableCell>
                  <TableCell>
                    AED {(contract.total_salary || contract.basic_salary || 0).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleDeleteClick(contract)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!contractToDelete} onOpenChange={() => setContractToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Contract</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the contract for <strong>{contractToDelete?.employeeName}</strong>?
              <br />
              <span className="text-xs text-muted-foreground">MOHRE No: {contractToDelete?.mohreNo}</span>
              <br /><br />
              This action cannot be undone. The contract will be permanently removed from the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteContract.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Contract'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
