import { useState } from 'react';
import { Plus, Trash2, Upload, FileText, Eye, AlertOctagon, Ban, Scale } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useEmployees } from '@/hooks/useEmployees';
import { useDiscipline, useAddDiscipline, useDeleteDiscipline, useUpdateDiscipline } from '@/hooks/useDiscipline';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';

const incidentTypes = ['Misconduct', 'Policy Violation', 'Written Warning', 'Suspension', 'Final Warning', 'Termination'] as const;
const statusOptions = ['Active', 'Resolved', 'Under Review', 'Appealed'] as const;

export function AdminDisciplineSection() {
  const { data: employees = [] } = useEmployees();
  const { data: disciplineRecords = [] } = useDiscipline();
  const addDiscipline = useAddDiscipline();
  const deleteDiscipline = useDeleteDiscipline();
  const updateDiscipline = useUpdateDiscipline();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState({
    employee_id: '',
    incident_type: 'Misconduct' as typeof incidentTypes[number],
    incident_date: new Date().toISOString().split('T')[0],
    description: '',
    action_taken: '',
    issued_by: '',
    document_url: null as string | null,
    document_name: null as string | null,
    suspension_start_date: null as string | null,
    suspension_end_date: null as string | null,
    status: 'Active' as typeof statusOptions[number],
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploading(true);
    try {
      const fileName = `discipline/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from('employee-documents').upload(fileName, file);
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage.from('employee-documents').getPublicUrl(fileName);
      setForm({ ...form, document_url: publicUrl, document_name: file.name });
      toast.success('Document uploaded');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleAdd = () => {
    if (!form.employee_id || !form.description) {
      toast.error('Please fill required fields');
      return;
    }
    addDiscipline.mutate(form, {
      onSuccess: () => {
        setIsModalOpen(false);
        setForm({
          employee_id: '', incident_type: 'Misconduct', incident_date: new Date().toISOString().split('T')[0],
          description: '', action_taken: '', issued_by: '', document_url: null, document_name: null,
          suspension_start_date: null, suspension_end_date: null, status: 'Active'
        });
      }
    });
  };

  const getIncidentTypeColor = (type: string) => {
    switch (type) {
      case 'Misconduct': return 'bg-amber-500/20 text-amber-500';
      case 'Policy Violation': return 'bg-orange-500/20 text-orange-500';
      case 'Written Warning': return 'bg-yellow-500/20 text-yellow-600';
      case 'Suspension': return 'bg-red-500/20 text-red-500';
      case 'Final Warning': return 'bg-destructive/20 text-destructive';
      case 'Termination': return 'bg-destructive text-destructive-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-primary/20 text-primary';
      case 'Resolved': return 'bg-green-500/20 text-green-500';
      case 'Under Review': return 'bg-blue-500/20 text-blue-500';
      case 'Appealed': return 'bg-amber-500/20 text-amber-500';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-destructive/20 flex items-center justify-center">
            <Scale className="w-5 h-5 text-destructive" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Employee Discipline</h2>
            <p className="text-xs text-muted-foreground">Manage misconduct, violations, and disciplinary actions</p>
          </div>
        </div>
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button variant="destructive"><Plus className="w-4 h-4 mr-2" />Add Incident</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Add Discipline Record</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="text-xs text-muted-foreground">Employee *</label>
                <Select value={form.employee_id} onValueChange={(v) => setForm({ ...form, employee_id: v })}>
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
                  <label className="text-xs text-muted-foreground">Incident Type *</label>
                  <Select value={form.incident_type} onValueChange={(v: typeof incidentTypes[number]) => setForm({ ...form, incident_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {incidentTypes.map((type) => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Incident Date</label>
                  <Input type="date" value={form.incident_date} onChange={(e) => setForm({ ...form, incident_date: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Description *</label>
                <Textarea placeholder="Describe the incident..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Action Taken</label>
                <Textarea placeholder="What action was taken..." value={form.action_taken} onChange={(e) => setForm({ ...form, action_taken: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Issued By</label>
                <Input placeholder="Manager/HR name" value={form.issued_by} onChange={(e) => setForm({ ...form, issued_by: e.target.value })} />
              </div>
              
              {form.incident_type === 'Suspension' && (
                <div className="grid grid-cols-2 gap-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <div>
                    <label className="text-xs text-destructive">Suspension Start</label>
                    <Input type="date" value={form.suspension_start_date || ''} onChange={(e) => setForm({ ...form, suspension_start_date: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs text-destructive">Suspension End</label>
                    <Input type="date" value={form.suspension_end_date || ''} onChange={(e) => setForm({ ...form, suspension_end_date: e.target.value })} />
                  </div>
                </div>
              )}
              
              <div>
                <label className="text-xs text-muted-foreground">Upload Document</label>
                <div className="flex items-center gap-2">
                  <Input type="file" accept=".pdf,.doc,.docx,.jpg,.png" onChange={handleFileUpload} disabled={uploading} />
                  {form.document_name && (
                    <div className="flex items-center gap-1 text-xs text-primary">
                      <FileText className="w-3 h-3" />{form.document_name}
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Status</label>
                <Select value={form.status} onValueChange={(v: typeof statusOptions[number]) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((status) => (
                      <SelectItem key={status} value={status}>{status}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full" onClick={handleAdd} disabled={addDiscipline.isPending || uploading}>
                {addDiscipline.isPending ? 'Adding...' : 'Add Discipline Record'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-2 text-amber-500 mb-1">
            <AlertOctagon className="w-4 h-4" />
            <span className="text-xs">Misconduct</span>
          </div>
          <p className="text-2xl font-bold">{disciplineRecords.filter(r => r.incident_type === 'Misconduct').length}</p>
        </div>
        <div className="glass-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-2 text-orange-500 mb-1">
            <Ban className="w-4 h-4" />
            <span className="text-xs">Violations</span>
          </div>
          <p className="text-2xl font-bold">{disciplineRecords.filter(r => r.incident_type === 'Policy Violation').length}</p>
        </div>
        <div className="glass-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-2 text-red-500 mb-1">
            <Ban className="w-4 h-4" />
            <span className="text-xs">Suspensions</span>
          </div>
          <p className="text-2xl font-bold">{disciplineRecords.filter(r => r.incident_type === 'Suspension').length}</p>
        </div>
        <div className="glass-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-2 text-primary mb-1">
            <Scale className="w-4 h-4" />
            <span className="text-xs">Active Cases</span>
          </div>
          <p className="text-2xl font-bold">{disciplineRecords.filter(r => r.status === 'Active').length}</p>
        </div>
      </div>

      {/* Records Table */}
      <div className="glass-card rounded-2xl border border-border overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-3 text-xs font-medium text-muted-foreground">Employee</th>
              <th className="text-left p-3 text-xs font-medium text-muted-foreground">Incident Type</th>
              <th className="text-left p-3 text-xs font-medium text-muted-foreground">Description</th>
              <th className="text-left p-3 text-xs font-medium text-muted-foreground">Date</th>
              <th className="text-left p-3 text-xs font-medium text-muted-foreground">Status</th>
              <th className="text-left p-3 text-xs font-medium text-muted-foreground">Document</th>
              <th className="text-right p-3 text-xs font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {disciplineRecords.map((record) => (
              <tr key={record.id} className="border-t border-border hover:bg-muted/30">
                <td className="p-3">
                  <p className="font-medium text-foreground">{record.employees?.full_name}</p>
                  <p className="text-xs text-muted-foreground">{record.employees?.hrms_no}</p>
                </td>
                <td className="p-3">
                  <span className={cn("px-2 py-1 rounded-full text-xs font-medium", getIncidentTypeColor(record.incident_type))}>
                    {record.incident_type}
                  </span>
                </td>
                <td className="p-3 text-sm text-foreground max-w-xs truncate">{record.description}</td>
                <td className="p-3 text-sm text-muted-foreground">{format(parseISO(record.incident_date), 'dd MMM yyyy')}</td>
                <td className="p-3">
                  <Select value={record.status} onValueChange={(v: typeof statusOptions[number]) => updateDiscipline.mutate({ id: record.id, status: v })}>
                    <SelectTrigger className={cn("h-7 w-28 text-xs", getStatusColor(record.status))}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((status) => (
                        <SelectItem key={status} value={status}>{status}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
                <td className="p-3">
                  {record.document_url ? (
                    <a href={record.document_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline text-xs">
                      <Eye className="w-3 h-3" />View
                    </a>
                  ) : (
                    <span className="text-xs text-muted-foreground">-</span>
                  )}
                </td>
                <td className="p-3 text-right">
                  <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteDiscipline.mutate({ id: record.id })}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </td>
              </tr>
            ))}
            {disciplineRecords.length === 0 && (
              <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No discipline records found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
