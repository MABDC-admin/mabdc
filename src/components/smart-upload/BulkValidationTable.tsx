import { Trash2, User, AlertCircle, CheckCircle, XCircle, Clock } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BulkDocumentItem, BulkValidationStatus } from '@/hooks/useBulkDocumentUpload';
import { MatchedEmployee } from '@/hooks/useSmartDocumentUpload';
import { cn } from '@/lib/utils';

interface BulkValidationTableProps {
  items: BulkDocumentItem[];
  employees: Array<{ id: string; full_name: string; hrms_no: string; department: string; status?: string | null }>;
  onRemove: (id: string) => void;
  onUpdateEmployee: (id: string, employee: MatchedEmployee) => void;
}

function getStatusBadge(status: BulkValidationStatus, itemStatus: string) {
  if (itemStatus === 'error') {
    return (
      <Badge variant="destructive" className="gap-1">
        <XCircle className="h-3 w-3" />
        Error
      </Badge>
    );
  }
  
  switch (status) {
    case 'valid':
      return (
        <Badge className="bg-green-500 hover:bg-green-600 gap-1">
          <CheckCircle className="h-3 w-3" />
          Valid
        </Badge>
      );
    case 'expired':
      return (
        <Badge variant="destructive" className="gap-1">
          <XCircle className="h-3 w-3" />
          Expired
        </Badge>
      );
    case 'no_match':
      return (
        <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 gap-1">
          <AlertCircle className="h-3 w-3" />
          No Match
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="gap-1">
          <Clock className="h-3 w-3" />
          Pending
        </Badge>
      );
  }
}

function getExpiryDate(item: BulkDocumentItem): string | null {
  const data = item.editedData || item.extractionResult?.extractedData;
  if (!data) return null;
  
  const isContract = data.documentType?.toLowerCase().includes('contract');
  return isContract ? data.endDate || null : data.expiryDate || null;
}

export function BulkValidationTable({ items, employees, onRemove, onUpdateEmployee }: BulkValidationTableProps) {
  const activeEmployees = employees.filter(e => e.status === 'Active');

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[200px]">File Name</TableHead>
            <TableHead className="w-[120px]">Doc Type</TableHead>
            <TableHead className="w-[150px]">Detected Name</TableHead>
            <TableHead className="w-[200px]">Matched Employee</TableHead>
            <TableHead className="w-[100px]">Status</TableHead>
            <TableHead className="w-[100px]">Expiry</TableHead>
            <TableHead className="w-[60px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => {
            const data = item.editedData || item.extractionResult?.extractedData;
            const expiryDate = getExpiryDate(item);
            const isExpired = item.validationStatus === 'expired';
            
            return (
              <TableRow key={item.id}>
                {/* File Name */}
                <TableCell>
                  <div className="flex items-center gap-2">
                    {item.previewUrl && (
                      <img 
                        src={item.previewUrl} 
                        alt="" 
                        className="h-8 w-8 rounded object-cover border"
                      />
                    )}
                    <span className="text-sm truncate max-w-[140px]" title={item.file.name}>
                      {item.file.name}
                    </span>
                  </div>
                </TableCell>

                {/* Doc Type */}
                <TableCell>
                  <Badge variant="outline">
                    {data?.documentType || 'Processing...'}
                  </Badge>
                </TableCell>

                {/* Detected Name */}
                <TableCell>
                  <span className="text-sm">
                    {data?.name || '-'}
                  </span>
                </TableCell>

                {/* Matched Employee */}
                <TableCell>
                  {item.selectedEmployee ? (
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <div className="text-sm">
                        <p className="font-medium truncate max-w-[120px]">
                          {item.selectedEmployee.full_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {item.selectedEmployee.confidence}% match
                        </p>
                      </div>
                    </div>
                  ) : item.status === 'complete' ? (
                    <Select
                      onValueChange={(id) => {
                        const emp = activeEmployees.find(e => e.id === id);
                        if (emp) {
                          onUpdateEmployee(item.id, {
                            id: emp.id,
                            full_name: emp.full_name,
                            hrms_no: emp.hrms_no,
                            department: emp.department,
                            confidence: 100,
                          });
                        }
                      }}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Select employee" />
                      </SelectTrigger>
                      <SelectContent>
                        {activeEmployees.map((emp) => (
                          <SelectItem key={emp.id} value={emp.id}>
                            {emp.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <span className="text-sm text-muted-foreground">-</span>
                  )}
                </TableCell>

                {/* Status */}
                <TableCell>
                  {getStatusBadge(item.validationStatus, item.status)}
                </TableCell>

                {/* Expiry Date */}
                <TableCell>
                  {expiryDate ? (
                    <span className={cn(
                      "text-sm",
                      isExpired && "text-destructive font-medium"
                    )}>
                      {new Date(expiryDate).toLocaleDateString()}
                    </span>
                  ) : (
                    <span className="text-sm text-muted-foreground">-</span>
                  )}
                </TableCell>

                {/* Remove Button */}
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => onRemove(item.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
