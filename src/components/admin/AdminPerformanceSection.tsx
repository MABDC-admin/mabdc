import { useState } from 'react';
import { Plus, Star, AlertTriangle, Trash2, Upload, FileText, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useEmployees } from '@/hooks/useEmployees';
import { 
  usePerformance, useAddPerformance, useDeletePerformance,
  useCorrectiveActions, useAddCorrectiveAction, useDeleteCorrectiveAction 
} from '@/hooks/usePerformance';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';

const performanceTypes = ['Task', 'Behavioral', 'Competency', 'Result KPI', 'Adaptive/Teamwork'] as const;
const actionTypes = ['Verbal Warning', 'Written Warning', 'PIP', 'Final Warning'] as const;

export function AdminPerformanceSection() {
  const { data: employees = [] } = useEmployees();
  const { data: performanceRecords = [] } = usePerformance();
  const { data: correctiveActions = [] } = useCorrectiveActions();
  const addPerformance = useAddPerformance();
  const deletePerformance = useDeletePerformance();
  const addCorrectiveAction = useAddCorrectiveAction();
  const deleteCorrectiveAction = useDeleteCorrectiveAction();

  const [isPerformanceModalOpen, setIsPerformanceModalOpen] = useState(false);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [performanceForm, setPerformanceForm] = useState({
    employee_id: '',
    performance_type: 'Task' as typeof performanceTypes[number],
    rating: 3,
    review_period: '',
    reviewer: '',
    comments: '',
  });

  const [actionForm, setActionForm] = useState({
    employee_id: '',
    action_type: 'Verbal Warning' as typeof actionTypes[number],
    reason: '',
    issued_date: new Date().toISOString().split('T')[0],
    issued_by: '',
    document_url: null as string | null,
    document_name: null as string | null,
    status: 'Active' as const,
    notes: '',
  });

  const handleAddPerformance = () => {
    if (!performanceForm.employee_id || !performanceForm.review_period) {
      toast.error('Please fill required fields');
      return;
    }
    addPerformance.mutate(performanceForm, {
      onSuccess: () => {
        setIsPerformanceModalOpen(false);
        setPerformanceForm({ employee_id: '', performance_type: 'Task', rating: 3, review_period: '', reviewer: '', comments: '' });
      }
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploading(true);
    try {
      const fileName = `corrective-actions/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from('employee-documents').upload(fileName, file);
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage.from('employee-documents').getPublicUrl(fileName);
      setActionForm({ ...actionForm, document_url: publicUrl, document_name: file.name });
      toast.success('Document uploaded');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleAddCorrectiveAction = () => {
    if (!actionForm.employee_id || !actionForm.reason) {
      toast.error('Please fill required fields');
      return;
    }
    addCorrectiveAction.mutate(actionForm, {
      onSuccess: () => {
        setIsActionModalOpen(false);
        setActionForm({ employee_id: '', action_type: 'Verbal Warning', reason: '', issued_date: new Date().toISOString().split('T')[0], issued_by: '', document_url: null, document_name: null, status: 'Active', notes: '' });
      }
    });
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 4) return 'text-primary';
    if (rating >= 3) return 'text-amber-500';
    return 'text-destructive';
  };

  const getActionTypeColor = (type: string) => {
    switch (type) {
      case 'Verbal Warning': return 'bg-amber-500/20 text-amber-500';
      case 'Written Warning': return 'bg-orange-500/20 text-orange-500';
      case 'PIP': return 'bg-blue-500/20 text-blue-500';
      case 'Final Warning': return 'bg-destructive/20 text-destructive';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="performance" className="space-y-4">
        <TabsList className="bg-muted/50 border border-border">
          <TabsTrigger value="performance" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Star className="w-4 h-4 mr-2" />Performance Reviews
          </TabsTrigger>
          <TabsTrigger value="corrective" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <AlertTriangle className="w-4 h-4 mr-2" />Corrective Actions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Performance Reviews</h2>
            <Dialog open={isPerformanceModalOpen} onOpenChange={setIsPerformanceModalOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="w-4 h-4 mr-2" />Add Review</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add Performance Review</DialogTitle></DialogHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <label className="text-xs text-muted-foreground">Employee *</label>
                    <Select value={performanceForm.employee_id} onValueChange={(v) => setPerformanceForm({ ...performanceForm, employee_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                      <SelectContent>
                        {employees.map((emp) => (
                          <SelectItem key={emp.id} value={emp.id}>{emp.full_name} ({emp.hrms_no})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-muted-foreground">Performance Type *</label>
                      <Select value={performanceForm.performance_type} onValueChange={(v: typeof performanceTypes[number]) => setPerformanceForm({ ...performanceForm, performance_type: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {performanceTypes.map((type) => (
                            <SelectItem key={type} value={type}>{type}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Rating (1-5) *</label>
                      <Select value={String(performanceForm.rating)} onValueChange={(v) => setPerformanceForm({ ...performanceForm, rating: Number(v) })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 4, 5].map((r) => (
                            <SelectItem key={r} value={String(r)}>{r} - {r === 1 ? 'Poor' : r === 2 ? 'Below Average' : r === 3 ? 'Average' : r === 4 ? 'Good' : 'Excellent'}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Review Period *</label>
                    <Input placeholder="e.g., Q1 2025" value={performanceForm.review_period} onChange={(e) => setPerformanceForm({ ...performanceForm, review_period: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Reviewer</label>
                    <Input placeholder="Reviewer name" value={performanceForm.reviewer} onChange={(e) => setPerformanceForm({ ...performanceForm, reviewer: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Comments</label>
                    <Textarea placeholder="Performance comments..." value={performanceForm.comments} onChange={(e) => setPerformanceForm({ ...performanceForm, comments: e.target.value })} />
                  </div>
                  <Button className="w-full" onClick={handleAddPerformance} disabled={addPerformance.isPending}>
                    {addPerformance.isPending ? 'Adding...' : 'Add Performance Review'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="glass-card rounded-2xl border border-border overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground">Employee</th>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground">Type</th>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground">Rating</th>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground">Period</th>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground">Reviewer</th>
                  <th className="text-right p-3 text-xs font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {performanceRecords.map((record) => (
                  <tr key={record.id} className="border-t border-border hover:bg-muted/30">
                    <td className="p-3">
                      <p className="font-medium text-foreground">{record.employees?.full_name}</p>
                      <p className="text-xs text-muted-foreground">{record.employees?.hrms_no}</p>
                    </td>
                    <td className="p-3 text-sm text-foreground">{record.performance_type}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className={cn("w-4 h-4", i < record.rating ? getRatingColor(record.rating) : "text-muted-foreground/30")} fill={i < record.rating ? "currentColor" : "none"} />
                        ))}
                      </div>
                    </td>
                    <td className="p-3 text-sm text-foreground">{record.review_period}</td>
                    <td className="p-3 text-sm text-muted-foreground">{record.reviewer || '-'}</td>
                    <td className="p-3 text-right">
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deletePerformance.mutate({ id: record.id })}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
                {performanceRecords.length === 0 && (
                  <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No performance records found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="corrective" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Corrective Actions</h2>
            <Dialog open={isActionModalOpen} onOpenChange={setIsActionModalOpen}>
              <DialogTrigger asChild>
                <Button variant="destructive"><Plus className="w-4 h-4 mr-2" />Add Action</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle>Add Corrective Action</DialogTitle></DialogHeader>
                <div className="space-y-4 mt-4 max-h-[70vh] overflow-y-auto">
                  <div>
                    <label className="text-xs text-muted-foreground">Employee *</label>
                    <Select value={actionForm.employee_id} onValueChange={(v) => setActionForm({ ...actionForm, employee_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                      <SelectContent>
                        {employees.map((emp) => (
                          <SelectItem key={emp.id} value={emp.id}>{emp.full_name} ({emp.hrms_no})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-muted-foreground">Action Type *</label>
                      <Select value={actionForm.action_type} onValueChange={(v: typeof actionTypes[number]) => setActionForm({ ...actionForm, action_type: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {actionTypes.map((type) => (
                            <SelectItem key={type} value={type}>{type}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Issue Date</label>
                      <Input type="date" value={actionForm.issued_date} onChange={(e) => setActionForm({ ...actionForm, issued_date: e.target.value })} />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Reason *</label>
                    <Textarea placeholder="Reason for action..." value={actionForm.reason} onChange={(e) => setActionForm({ ...actionForm, reason: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Issued By</label>
                    <Input placeholder="Manager/HR name" value={actionForm.issued_by} onChange={(e) => setActionForm({ ...actionForm, issued_by: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Upload Document</label>
                    <div className="flex items-center gap-2">
                      <Input type="file" accept=".pdf,.doc,.docx,.jpg,.png" onChange={handleFileUpload} disabled={uploading} />
                      {actionForm.document_name && (
                        <div className="flex items-center gap-1 text-xs text-primary">
                          <FileText className="w-3 h-3" />{actionForm.document_name}
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Notes</label>
                    <Textarea placeholder="Additional notes..." value={actionForm.notes} onChange={(e) => setActionForm({ ...actionForm, notes: e.target.value })} />
                  </div>
                  <Button className="w-full" onClick={handleAddCorrectiveAction} disabled={addCorrectiveAction.isPending || uploading}>
                    {addCorrectiveAction.isPending ? 'Adding...' : 'Add Corrective Action'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="glass-card rounded-2xl border border-border overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground">Employee</th>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground">Action Type</th>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground">Reason</th>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground">Date</th>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground">Document</th>
                  <th className="text-right p-3 text-xs font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {correctiveActions.map((action) => (
                  <tr key={action.id} className="border-t border-border hover:bg-muted/30">
                    <td className="p-3">
                      <p className="font-medium text-foreground">{action.employees?.full_name}</p>
                      <p className="text-xs text-muted-foreground">{action.employees?.hrms_no}</p>
                    </td>
                    <td className="p-3">
                      <span className={cn("px-2 py-1 rounded-full text-xs font-medium", getActionTypeColor(action.action_type))}>
                        {action.action_type}
                      </span>
                    </td>
                    <td className="p-3 text-sm text-foreground max-w-xs truncate">{action.reason}</td>
                    <td className="p-3 text-sm text-muted-foreground">{format(parseISO(action.issued_date), 'dd MMM yyyy')}</td>
                    <td className="p-3">
                      {action.document_url ? (
                        <a href={action.document_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline text-xs">
                          <Eye className="w-3 h-3" />View
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteCorrectiveAction.mutate({ id: action.id })}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
                {correctiveActions.length === 0 && (
                  <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No corrective actions found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
