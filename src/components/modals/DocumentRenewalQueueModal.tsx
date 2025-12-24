import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDocumentRenewalQueue, RenewalQueueItem } from '@/hooks/useDocumentRenewalQueue';
import { useEmployees } from '@/hooks/useEmployees';
import { useDocumentTypes } from '@/hooks/useDocumentTypes';
import { DocumentTypesManager } from '@/components/documents/DocumentTypesManager';
import { AlertTriangle, CheckCircle, Clock, FileText, User, Settings2, Calendar, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';

interface DocumentRenewalQueueModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DocumentRenewalQueueModal({ open, onOpenChange }: DocumentRenewalQueueModalProps) {
  const [daysFilter, setDaysFilter] = useState(30);
  const [employeeFilter, setEmployeeFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('queue');
  
  const { data: queueItems = [], isLoading } = useDocumentRenewalQueue(daysFilter);
  const { data: employees = [] } = useEmployees();
  const { data: documentTypes = [] } = useDocumentTypes();

  const filteredItems = queueItems.filter(item => {
    if (employeeFilter !== 'all' && item.employee_id !== employeeFilter) return false;
    if (typeFilter !== 'all' && item.document_type !== typeFilter) return false;
    return true;
  });

  const criticalCount = filteredItems.filter(i => i.days_remaining <= 7).length;
  const warningCount = filteredItems.filter(i => i.days_remaining > 7 && i.days_remaining <= 30).length;
  const expiredCount = filteredItems.filter(i => i.days_remaining < 0).length;

  const getStatusStyle = (daysRemaining: number) => {
    if (daysRemaining < 0) {
      return { color: 'text-destructive', bg: 'bg-destructive/10', border: 'border-destructive/30', label: 'Expired' };
    }
    if (daysRemaining <= 7) {
      return { color: 'text-destructive', bg: 'bg-destructive/10', border: 'border-destructive/30', label: 'Critical' };
    }
    if (daysRemaining <= 30) {
      return { color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/30', label: 'Warning' };
    }
    return { color: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/30', label: 'Upcoming' };
  };

  const uniqueDocTypes = [...new Set(queueItems.map(i => i.document_type))];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Visa & Document Renewal Queue
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Prioritized by urgency for the next {daysFilter} days
          </p>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="queue" className="gap-2">
              <Clock className="w-4 h-4" />
              Renewal Queue
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Settings2 className="w-4 h-4" />
              Document Types
            </TabsTrigger>
          </TabsList>

          <TabsContent value="queue" className="flex-1 overflow-auto mt-4">
            {/* Critical Action Badge */}
            {(criticalCount > 0 || expiredCount > 0) && (
              <div className="mb-4 p-3 rounded-xl border-2 border-amber-500/50 bg-amber-500/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-amber-500">CRITICAL ACTION REQUIRED</p>
                    <p className="text-xs text-muted-foreground">
                      {expiredCount > 0 && `${expiredCount} expired, `}
                      {criticalCount} documents expiring within 7 days
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Filters */}
            <div className="flex flex-wrap gap-3 mb-4">
              <Select value={daysFilter.toString()} onValueChange={(v) => setDaysFilter(parseInt(v))}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Next 7 days</SelectItem>
                  <SelectItem value="30">Next 30 days</SelectItem>
                  <SelectItem value="60">Next 60 days</SelectItem>
                  <SelectItem value="90">Next 90 days</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Employees" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Employees</SelectItem>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {uniqueDocTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/30">
                <p className="text-2xl font-bold text-destructive">{expiredCount + criticalCount}</p>
                <p className="text-xs text-muted-foreground">Critical/Expired</p>
              </div>
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
                <p className="text-2xl font-bold text-amber-500">{warningCount}</p>
                <p className="text-xs text-muted-foreground">Warning (&lt;30 days)</p>
              </div>
              <div className="p-3 rounded-xl bg-primary/10 border border-primary/30">
                <p className="text-2xl font-bold text-primary">{filteredItems.length}</p>
                <p className="text-xs text-muted-foreground">Total Items</p>
              </div>
            </div>

            {/* Queue List */}
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-1">All Documents Up-to-Date</h3>
                <p className="text-sm text-muted-foreground">
                  No documents expiring within the next {daysFilter} days
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredItems.map((item) => {
                  const status = getStatusStyle(item.days_remaining);
                  
                  return (
                    <div
                      key={item.id}
                      className={cn(
                        "p-3 rounded-xl border transition-all hover:shadow-md",
                        status.border,
                        status.bg
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {item.employee_photo ? (
                            <img
                              src={item.employee_photo}
                              alt={item.employee_name}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                              <User className="w-5 h-5 text-muted-foreground" />
                            </div>
                          )}
                          
                          <div>
                            <p className="font-medium text-foreground">{item.employee_name}</p>
                            <p className="text-xs text-muted-foreground">{item.department}</p>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              "px-2 py-0.5 rounded-full text-xs font-medium",
                              status.bg, status.color
                            )}>
                              {item.document_type}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {item.document_name}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
                        <div className="flex items-center gap-2 text-xs">
                          <Calendar className="w-3 h-3 text-muted-foreground" />
                          <span className="text-muted-foreground">
                            Expires: {format(parseISO(item.expiry_date), 'dd MMM yyyy')}
                          </span>
                        </div>
                        
                        <div className={cn(
                          "px-3 py-1 rounded-full text-sm font-bold",
                          status.color
                        )}>
                          {item.days_remaining < 0 
                            ? `${Math.abs(item.days_remaining)} days overdue`
                            : item.days_remaining === 0
                              ? 'Expires Today!'
                              : `${item.days_remaining} days left`
                          }
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="settings" className="flex-1 overflow-auto mt-4">
            <DocumentTypesManager />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
