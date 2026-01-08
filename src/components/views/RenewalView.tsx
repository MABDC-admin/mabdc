import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDocumentRenewalQueue, RenewalQueueItem } from '@/hooks/useDocumentRenewalQueue';
import { useArchivedDocuments, useArchivedContracts, useRestoreArchivedDocument } from '@/hooks/useArchivedDocuments';
import { useEmployees } from '@/hooks/useEmployees';
import { useDocumentTypes } from '@/hooks/useDocumentTypes';
import { useRenewDocument } from '@/hooks/useDocuments';
import { DocumentTypesManager } from '@/components/documents/DocumentTypesManager';
import { AlertTriangle, CheckCircle, Clock, FileText, User, Settings2, Calendar, RefreshCw, Link2, Archive, ExternalLink, FileCheck, History, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function RenewalView() {
  const [daysFilter, setDaysFilter] = useState(30);
  const [employeeFilter, setEmployeeFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('queue');
  const [renewingItem, setRenewingItem] = useState<RenewalQueueItem | null>(null);
  const [isRenewDialogOpen, setIsRenewDialogOpen] = useState(false);
  const [renewFile, setRenewFile] = useState<File | null>(null);
  const [newExpiryDate, setNewExpiryDate] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  
  const { data: queueItems = [], isLoading, refetch } = useDocumentRenewalQueue(daysFilter);
  const { data: archivedDocs = [], isLoading: isLoadingArchived } = useArchivedDocuments();
  const { data: archivedContracts = [], isLoading: isLoadingArchivedContracts } = useArchivedContracts();
  const { data: employees = [] } = useEmployees();
  const { data: documentTypes = [] } = useDocumentTypes();
  const restoreDocument = useRestoreArchivedDocument();
  const renewDocument = useRenewDocument();

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

  const handleOpenRenewDialog = (item: RenewalQueueItem) => {
    // Only allow renewal for uploaded documents (source === 'document')
    if (item.source !== 'document') {
      toast.error('Only uploaded documents can be renewed here. For employee fields, update them in the employee profile.');
      return;
    }
    setRenewingItem(item);
    setNewExpiryDate('');
    setRenewFile(null);
    setIsRenewDialogOpen(true);
  };

  const handleRenewSubmit = async () => {
    if (!renewingItem || !renewFile || !newExpiryDate) {
      toast.error('Please upload a new document and set expiry date');
      return;
    }

    setIsUploading(true);
    try {
      // Upload new file
      const fileExt = renewFile.name.split('.').pop();
      const fileName = `${renewingItem.employee_id}/${Date.now()}-${renewFile.name}`;
      
      const { error: uploadError } = await supabase.storage
        .from('employee-documents')
        .upload(fileName, renewFile);
      
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('employee-documents')
        .getPublicUrl(fileName);

      // Get document type id
      const docType = documentTypes.find(dt => dt.name === renewingItem.document_type);

      // Mark old document as renewed and create new document
      await renewDocument.mutateAsync({
        oldDocumentId: renewingItem.id,
        newDocument: {
          employee_id: renewingItem.employee_id,
          name: renewFile.name,
          file_type: renewFile.type || 'application/octet-stream',
          file_url: urlData.publicUrl,
          file_size: `${(renewFile.size / 1024).toFixed(1)} KB`,
          expiry_date: newExpiryDate,
          document_type_id: docType?.id,
          category: renewingItem.document_type,
        }
      });

      toast.success('Document renewed successfully');
      setIsRenewDialogOpen(false);
      setRenewingItem(null);
      refetch();
    } catch (error: any) {
      toast.error(`Failed to renew document: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Visa & Document Renewal</h2>
          <p className="text-muted-foreground">Track and manage document expirations</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-lg grid-cols-3">
          <TabsTrigger value="queue" className="gap-2">
            <Clock className="w-4 h-4" />
            Renewal Queue
          </TabsTrigger>
          <TabsTrigger value="archived" className="gap-2">
            <Archive className="w-4 h-4" />
            Archived
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2">
            <Settings2 className="w-4 h-4" />
            Document Types
          </TabsTrigger>
        </TabsList>

        <TabsContent value="queue" className="mt-6">
          {/* Critical Action Badge */}
          {(criticalCount > 0 || expiredCount > 0) && (
            <div className="mb-4 p-4 rounded-xl border-2 border-amber-500/50 bg-amber-500/10">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-amber-500" />
                </div>
                <div>
                  <p className="font-bold text-amber-500 text-lg">CRITICAL ACTION REQUIRED</p>
                  <p className="text-sm text-muted-foreground">
                    {expiredCount > 0 && `${expiredCount} expired, `}
                    {criticalCount} documents expiring within 7 days
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-6">
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
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="glass-card p-4 rounded-xl bg-destructive/10 border border-destructive/30">
              <p className="text-3xl font-bold text-destructive">{expiredCount + criticalCount}</p>
              <p className="text-sm text-muted-foreground">Critical/Expired</p>
            </div>
            <div className="glass-card p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
              <p className="text-3xl font-bold text-amber-500">{warningCount}</p>
              <p className="text-sm text-muted-foreground">Warning (&lt;30 days)</p>
            </div>
            <div className="glass-card p-4 rounded-xl bg-primary/10 border border-primary/30">
              <p className="text-3xl font-bold text-primary">{filteredItems.length}</p>
              <p className="text-sm text-muted-foreground">Total Items</p>
            </div>
          </div>

          {/* Queue List */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="glass-card rounded-2xl p-12 text-center">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-10 h-10 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">All Documents Up-to-Date</h3>
              <p className="text-muted-foreground">
                No documents expiring within the next {daysFilter} days
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredItems.map((item) => {
                const status = getStatusStyle(item.days_remaining);
                const isRenewable = item.source === 'document';
                
                return (
                  <div
                    key={item.id}
                    className={cn(
                      "glass-card p-4 rounded-xl border transition-all hover:shadow-md",
                      status.border,
                      item.is_renewed && "opacity-60"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        {item.employee_photo ? (
                          <img
                            src={item.employee_photo}
                            alt={item.employee_name}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center">
                            <User className="w-6 h-6 text-muted-foreground" />
                          </div>
                        )}
                        
                        <div>
                          <p className="font-semibold text-foreground">{item.employee_name}</p>
                          <p className="text-sm text-muted-foreground">{item.department}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              "px-3 py-1 rounded-full text-xs font-medium",
                              status.bg, status.color
                            )}>
                              {item.document_type}
                            </span>
                            {item.is_renewed && (
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary flex items-center gap-1">
                                <Link2 className="w-3 h-3" />
                                Renewed
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {item.document_name}
                          </p>
                        </div>
                        
                        {isRenewable && !item.is_renewed && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenRenewDialog(item)}
                            className="gap-1"
                          >
                            <RefreshCw className="w-4 h-4" />
                            Renew
                          </Button>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/50">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          Expires: {format(parseISO(item.expiry_date), 'dd MMM yyyy')}
                        </span>
                      </div>
                      
                      <div className={cn(
                        "px-4 py-1.5 rounded-full text-sm font-bold",
                        status.bg, status.color
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

        <TabsContent value="archived" className="mt-6">
          <div className="space-y-6">
            {/* Archived Documents Section */}
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-primary" />
                Renewed Documents ({archivedDocs.length})
              </h3>

              {isLoadingArchived ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : archivedDocs.length === 0 ? (
                <div className="glass-card rounded-xl p-8 text-center border border-border">
                  <Archive className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No archived documents yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {archivedDocs.map((doc) => (
                    <div
                      key={doc.id}
                      className="glass-card p-4 rounded-xl border border-border hover:border-primary/30 transition-all"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          {doc.employee_photo ? (
                            <img
                              src={doc.employee_photo}
                              alt={doc.employee_name}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                              <User className="w-5 h-5 text-muted-foreground" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-foreground">{doc.employee_name}</p>
                            <p className="text-xs text-muted-foreground">{doc.department}</p>
                          </div>
                        </div>

                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                          {doc.category}
                        </span>
                      </div>

                      <div className="mt-4 pl-13 space-y-2">
                        {/* Old Document */}
                        <div className="flex items-center gap-3 p-2 rounded-lg bg-destructive/5 border border-destructive/20">
                          <div className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
                            <History className="w-4 h-4 text-destructive" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{doc.name}</p>
                            <p className="text-xs text-muted-foreground">
                              Expired: {doc.expiry_date ? format(parseISO(doc.expiry_date), 'dd MMM yyyy') : 'N/A'}
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2"
                              onClick={() => window.open(doc.file_url, '_blank')}
                            >
                              <ExternalLink className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-primary border-primary/30 hover:bg-primary/10"
                              onClick={() => restoreDocument.mutate(doc.id)}
                              disabled={restoreDocument.isPending}
                            >
                              <RotateCcw className="w-3 h-3 mr-1" />
                              Restore
                            </Button>
                          </div>
                        </div>

                        {/* Arrow */}
                        <div className="flex items-center gap-2 pl-3">
                          <div className="w-0.5 h-4 bg-primary/30" />
                          <span className="text-xs text-muted-foreground">
                            Renewed on {format(parseISO(doc.renewed_at), 'dd MMM yyyy')}
                          </span>
                        </div>

                        {/* New Document */}
                        {doc.new_document ? (
                          <div className="flex items-center gap-3 p-2 rounded-lg bg-primary/5 border border-primary/20">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <FileCheck className="w-4 h-4 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">{doc.new_document.name}</p>
                              <p className="text-xs text-primary">
                                New expiry: {doc.new_document.expiry_date ? format(parseISO(doc.new_document.expiry_date), 'dd MMM yyyy') : 'N/A'}
                              </p>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2"
                              onClick={() => window.open(doc.new_document!.file_url, '_blank')}
                            >
                              <ExternalLink className="w-3 h-3" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 border border-border">
                            <Link2 className="w-4 h-4 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">Replacement document not linked</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Archived Contracts Section */}
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-500" />
                Expired/Terminated Contracts ({archivedContracts.length})
              </h3>

              {isLoadingArchivedContracts ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : archivedContracts.length === 0 ? (
                <div className="glass-card rounded-xl p-8 text-center border border-border">
                  <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No archived contracts yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {archivedContracts.map((contract) => (
                    <div
                      key={contract.id}
                      className="glass-card p-4 rounded-xl border border-border hover:border-amber-500/30 transition-all"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          {contract.employee_photo ? (
                            <img
                              src={contract.employee_photo}
                              alt={contract.employee_name}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                              <User className="w-5 h-5 text-muted-foreground" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-foreground">{contract.employee_name}</p>
                            <p className="text-xs text-muted-foreground">{contract.department}</p>
                          </div>
                        </div>

                        <span className={cn(
                          "px-2 py-1 rounded-full text-xs font-medium",
                          contract.status === 'Expired' 
                            ? "bg-destructive/10 text-destructive" 
                            : "bg-amber-500/10 text-amber-500"
                        )}>
                          {contract.status}
                        </span>
                      </div>

                      <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div>
                          <p className="text-xs text-muted-foreground">MOHRE No</p>
                          <p className="font-medium text-foreground">{contract.mohre_contract_no}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Type</p>
                          <p className="font-medium text-foreground">{contract.contract_type}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Start Date</p>
                          <p className="font-medium text-foreground">{format(parseISO(contract.start_date), 'dd MMM yyyy')}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">End Date</p>
                          <p className="font-medium text-foreground">
                            {contract.end_date ? format(parseISO(contract.end_date), 'dd MMM yyyy') : 'N/A'}
                          </p>
                        </div>
                      </div>

                      {contract.notes && (
                        <p className="mt-3 text-xs text-muted-foreground italic border-t border-border pt-2">
                          {contract.notes}
                        </p>
                      )}

                      {(contract.page1_url || contract.page2_url) && (
                        <div className="mt-3 flex gap-2">
                          {contract.page1_url && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={() => window.open(contract.page1_url!, '_blank')}
                            >
                              <ExternalLink className="w-3 h-3 mr-1" />
                              Page 1
                            </Button>
                          )}
                          {contract.page2_url && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={() => window.open(contract.page2_url!, '_blank')}
                            >
                              <ExternalLink className="w-3 h-3 mr-1" />
                              Page 2
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <div className="glass-card rounded-2xl p-6 border border-border">
            <DocumentTypesManager />
          </div>
        </TabsContent>
      </Tabs>

      {/* Renew Document Dialog */}
      <Dialog open={isRenewDialogOpen} onOpenChange={setIsRenewDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-primary" />
              Renew Document
            </DialogTitle>
          </DialogHeader>
          
          {renewingItem && (
            <div className="space-y-4 mt-4">
              <div className="p-3 rounded-lg bg-secondary/50 border border-border">
                <p className="text-sm font-medium text-foreground">{renewingItem.employee_name}</p>
                <p className="text-xs text-muted-foreground">
                  {renewingItem.document_type} - {renewingItem.document_name}
                </p>
                <p className="text-xs text-destructive mt-1">
                  Current expiry: {format(parseISO(renewingItem.expiry_date), 'dd MMM yyyy')}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Upload New Document *
                </label>
                <div className="border-2 border-dashed border-border rounded-lg p-4">
                  <input
                    type="file"
                    onChange={(e) => setRenewFile(e.target.files?.[0] || null)}
                    className="w-full text-sm"
                  />
                  {renewFile && (
                    <p className="text-xs text-primary mt-2">
                      Selected: {renewFile.name}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  New Expiry Date *
                </label>
                <Input
                  type="date"
                  value={newExpiryDate}
                  onChange={(e) => setNewExpiryDate(e.target.value)}
                  required
                />
              </div>

              <div className="text-xs text-muted-foreground p-2 rounded bg-muted/30">
                The old document will be marked as "Renewed" and linked to the new version.
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleRenewSubmit}
                  className="flex-1"
                  disabled={isUploading || !renewFile || !newExpiryDate}
                >
                  {isUploading ? 'Uploading...' : 'Renew Document'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsRenewDialogOpen(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
