import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Database, Download, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import JSZip from 'jszip';

const ALL_TABLES = [
  'employees', 'attendance', 'attendance_appeals', 'leave_records', 'leave_types',
  'leave_balances', 'leave_accrual_log', 'contracts', 'payroll', 'payroll_earnings',
  'payroll_deductions', 'employee_documents', 'employee_education', 'employee_shifts',
  'employee_shift_overrides', 'employee_performance', 'employee_discipline',
  'employee_corrective_actions', 'employee_face_data', 'employee_badges',
  'eos_records', 'events', 'company_settings', 'company_folders', 'company_files',
  'document_types', 'hr_letters', 'announcements', 'notifications',
  'notification_preferences', 'email_history', 'email_approval_tokens',
  'org_chart_positions', 'gamification_config', 'gamification_points',
  'gamification_transactions', 'gamification_badges', 'visa_applications',
  'visa_stage_history', 'ticket_allowance_records', 'public_holidays',
  'audit_logs', 'user_roles', 'profiles', 'pending_deletions', 'user_passkeys',
] as const;

type TableName = typeof ALL_TABLES[number];

export function AdminDataExport() {
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTable, setCurrentTable] = useState('');
  const [results, setResults] = useState<Record<string, { count: number; status: 'done' | 'error'; error?: string }>>({});

  const fetchAllRows = async (table: string): Promise<any[]> => {
    const allRows: any[] = [];
    const pageSize = 1000;
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await (supabase.from(table as any) as any)
        .select('*')
        .range(offset, offset + pageSize - 1);

      if (error) throw error;
      if (!data || data.length === 0) {
        hasMore = false;
      } else {
        allRows.push(...data);
        offset += pageSize;
        if (data.length < pageSize) hasMore = false;
      }
    }
    return allRows;
  };

  const handleExport = async () => {
    setIsExporting(true);
    setProgress(0);
    setResults({});

    const zip = new JSZip();
    const summary: Record<string, number> = {};

    for (let i = 0; i < ALL_TABLES.length; i++) {
      const table = ALL_TABLES[i];
      setCurrentTable(table);
      setProgress(Math.round(((i) / ALL_TABLES.length) * 100));

      try {
        const rows = await fetchAllRows(table);
        summary[table] = rows.length;
        if (rows.length > 0) {
          zip.file(`${table}.json`, JSON.stringify(rows, null, 2));
        }
        setResults(prev => ({ ...prev, [table]: { count: rows.length, status: 'done' } }));
      } catch (err: any) {
        console.warn(`Failed to export ${table}:`, err.message);
        setResults(prev => ({ ...prev, [table]: { count: 0, status: 'error', error: err.message } }));
      }
    }

    // Add summary
    zip.file('_export_summary.json', JSON.stringify({
      exported_at: new Date().toISOString(),
      tables: summary,
      total_records: Object.values(summary).reduce((a, b) => a + b, 0),
    }, null, 2));

    setProgress(100);
    setCurrentTable('Generating ZIP...');

    try {
      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `MABDC-Data-Export-${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      const totalRecords = Object.values(summary).reduce((a, b) => a + b, 0);
      toast.success(`Export complete! ${totalRecords} records from ${Object.keys(summary).length} tables.`);
    } catch {
      toast.error('Failed to generate ZIP file.');
    } finally {
      setIsExporting(false);
      setCurrentTable('');
    }
  };

  const doneCount = Object.values(results).filter(r => r.status === 'done').length;
  const errorCount = Object.values(results).filter(r => r.status === 'error').length;
  const totalRecords = Object.values(results).filter(r => r.status === 'done').reduce((a, b) => a + b.count, 0);

  return (
    <div className="glass-card rounded-3xl border border-border p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
          <Database className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">Database Export</h2>
          <p className="text-sm text-muted-foreground">Export all {ALL_TABLES.length} tables as JSON in a ZIP archive</p>
        </div>
      </div>

      {isExporting && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground truncate max-w-[200px]">{currentTable}</span>
            <span className="font-medium text-foreground">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      )}

      {Object.keys(results).length > 0 && (
        <div className="flex gap-4 text-sm">
          <span className="text-emerald-500 flex items-center gap-1">
            <CheckCircle2 className="w-4 h-4" /> {doneCount} tables
          </span>
          {errorCount > 0 && (
            <span className="text-destructive flex items-center gap-1">
              <AlertCircle className="w-4 h-4" /> {errorCount} errors
            </span>
          )}
          <span className="text-muted-foreground">{totalRecords.toLocaleString()} records</span>
        </div>
      )}

      <Button
        onClick={handleExport}
        disabled={isExporting}
        className="w-full h-12 text-base font-semibold"
        size="lg"
      >
        {isExporting ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Exporting {ALL_TABLES.length} tables...
          </>
        ) : (
          <>
            <Download className="w-5 h-5 mr-2" />
            Export All Data as ZIP
          </>
        )}
      </Button>

      <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
        <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
        <p className="text-xs text-muted-foreground">
          Exports all database records as JSON files. Use the Storage Backup for uploaded files.
        </p>
      </div>
    </div>
  );
}
