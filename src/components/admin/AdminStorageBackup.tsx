import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { HardDrive, Download, Loader2, CheckCircle2, FolderArchive, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import JSZip from 'jszip';

const STORAGE_BUCKETS = [
  { id: 'employee-documents', label: 'Employee Documents', icon: '📄' },
  { id: 'contract-documents', label: 'Contract Documents', icon: '📝' },
  { id: 'company-documents', label: 'Company Documents', icon: '🏢' },
  { id: 'leave-attachments', label: 'Leave Attachments', icon: '🏖️' },
];

interface BucketStatus {
  fileCount: number;
  downloaded: number;
  status: 'idle' | 'listing' | 'downloading' | 'done' | 'error';
  error?: string;
}

export function AdminStorageBackup() {
  const [isExporting, setIsExporting] = useState(false);
  const [selectedBuckets, setSelectedBuckets] = useState<string[]>(STORAGE_BUCKETS.map(b => b.id));
  const [bucketStatuses, setBucketStatuses] = useState<Record<string, BucketStatus>>({});
  const [overallProgress, setOverallProgress] = useState(0);

  const toggleBucket = (id: string) => {
    setSelectedBuckets(prev =>
      prev.includes(id) ? prev.filter(b => b !== id) : [...prev, id]
    );
  };

  const listAllFiles = async (bucketId: string, path = ''): Promise<string[]> => {
    const files: string[] = [];
    const { data, error } = await supabase.storage.from(bucketId).list(path, { limit: 1000 });
    if (error || !data) return files;

    for (const item of data) {
      const fullPath = path ? `${path}/${item.name}` : item.name;
      if (item.id === null) {
        // It's a folder
        const subFiles = await listAllFiles(bucketId, fullPath);
        files.push(...subFiles);
      } else {
        files.push(fullPath);
      }
    }
    return files;
  };

  const handleExport = async () => {
    if (selectedBuckets.length === 0) {
      toast.error('Please select at least one storage bucket');
      return;
    }

    setIsExporting(true);
    setOverallProgress(0);
    const zip = new JSZip();
    let totalFiles = 0;
    let downloadedFiles = 0;

    try {
      // Phase 1: List all files
      const bucketFiles: Record<string, string[]> = {};
      for (const bucketId of selectedBuckets) {
        setBucketStatuses(prev => ({ ...prev, [bucketId]: { fileCount: 0, downloaded: 0, status: 'listing' } }));
        const files = await listAllFiles(bucketId);
        bucketFiles[bucketId] = files;
        totalFiles += files.length;
        setBucketStatuses(prev => ({ ...prev, [bucketId]: { fileCount: files.length, downloaded: 0, status: 'downloading' } }));
      }

      if (totalFiles === 0) {
        toast.info('No files found in selected buckets');
        setIsExporting(false);
        return;
      }

      // Phase 2: Download files
      for (const bucketId of selectedBuckets) {
        const files = bucketFiles[bucketId];
        const folder = zip.folder(bucketId)!;

        for (const filePath of files) {
          try {
            const { data, error } = await supabase.storage.from(bucketId).download(filePath);
            if (error) {
              console.warn(`Failed to download ${bucketId}/${filePath}:`, error.message);
              continue;
            }
            folder.file(filePath, data);
          } catch (e) {
            console.warn(`Error downloading ${bucketId}/${filePath}:`, e);
          }

          downloadedFiles++;
          setOverallProgress(Math.round((downloadedFiles / totalFiles) * 100));
          setBucketStatuses(prev => ({
            ...prev,
            [bucketId]: { ...prev[bucketId], downloaded: prev[bucketId].downloaded + 1 },
          }));
        }

        setBucketStatuses(prev => ({ ...prev, [bucketId]: { ...prev[bucketId], status: 'done' } }));
      }

      // Phase 3: Generate ZIP
      toast.info('Generating ZIP file...');
      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `MABDC-Storage-Backup-${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(`Backup complete! ${downloadedFiles} files exported.`);
    } catch (error) {
      console.error('Backup failed:', error);
      toast.error('Backup failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="glass-card rounded-3xl border border-border p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
          <HardDrive className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">Storage Backup</h2>
          <p className="text-sm text-muted-foreground">Download all uploaded files as a ZIP archive</p>
        </div>
      </div>

      {/* Bucket Selection */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {STORAGE_BUCKETS.map(bucket => {
          const status = bucketStatuses[bucket.id];
          const isSelected = selectedBuckets.includes(bucket.id);

          return (
            <button
              key={bucket.id}
              onClick={() => !isExporting && toggleBucket(bucket.id)}
              disabled={isExporting}
              className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${
                isSelected
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-muted/20 opacity-60'
              } ${isExporting ? 'cursor-not-allowed' : 'cursor-pointer hover:shadow-md'}`}
            >
              <span className="text-2xl">{bucket.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{bucket.label}</p>
                {status && status.status !== 'idle' && (
                  <p className="text-xs text-muted-foreground">
                    {status.status === 'listing' && 'Scanning files...'}
                    {status.status === 'downloading' && `${status.downloaded}/${status.fileCount} files`}
                    {status.status === 'done' && `✅ ${status.fileCount} files done`}
                    {status.status === 'error' && `❌ ${status.error}`}
                  </p>
                )}
              </div>
              {status?.status === 'downloading' && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
              {status?.status === 'done' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
            </button>
          );
        })}
      </div>

      {/* Progress */}
      {isExporting && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Overall progress</span>
            <span className="font-medium text-foreground">{overallProgress}%</span>
          </div>
          <Progress value={overallProgress} className="h-2" />
        </div>
      )}

      {/* Export Button */}
      <Button
        onClick={handleExport}
        disabled={isExporting || selectedBuckets.length === 0}
        className="w-full h-12 text-base font-semibold"
        size="lg"
      >
        {isExporting ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Exporting...
          </>
        ) : (
          <>
            <FolderArchive className="w-5 h-5 mr-2" />
            Export {selectedBuckets.length} Bucket{selectedBuckets.length !== 1 ? 's' : ''} as ZIP
          </>
        )}
      </Button>

      <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
        <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
        <p className="text-xs text-muted-foreground">
          Large backups may take several minutes. Keep this tab open during export.
        </p>
      </div>
    </div>
  );
}
