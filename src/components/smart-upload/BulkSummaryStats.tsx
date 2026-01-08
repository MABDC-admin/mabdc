import { CheckCircle, XCircle, AlertCircle, FileX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface BulkSummaryStatsProps {
  stats: {
    total: number;
    valid: number;
    expired: number;
    noMatch: number;
    errors: number;
  };
  isSaving: boolean;
  onSaveAllValid: () => void;
  onClearAll: () => void;
}

export function BulkSummaryStats({ stats, isSaving, onSaveAllValid, onClearAll }: BulkSummaryStatsProps) {
  return (
    <div className="p-4 border rounded-lg bg-muted/30 space-y-4">
      <h3 className="font-medium flex items-center gap-2">
        📊 Bulk Upload Summary
      </h3>
      
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Total */}
        <div className="p-3 bg-background rounded-lg border text-center">
          <p className="text-2xl font-bold">{stats.total}</p>
          <p className="text-xs text-muted-foreground">Total</p>
        </div>
        
        {/* Valid */}
        <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/30 text-center">
          <div className="flex items-center justify-center gap-1">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.valid}</p>
          </div>
          <p className="text-xs text-muted-foreground">Valid</p>
        </div>
        
        {/* Expired */}
        <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/30 text-center">
          <div className="flex items-center justify-center gap-1">
            <XCircle className="h-4 w-4 text-destructive" />
            <p className="text-2xl font-bold text-destructive">{stats.expired}</p>
          </div>
          <p className="text-xs text-muted-foreground">Expired</p>
        </div>
        
        {/* Errors/No Match */}
        <div className="p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/30 text-center">
          <div className="flex items-center justify-center gap-1">
            <AlertCircle className="h-4 w-4 text-yellow-500" />
            <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
              {stats.noMatch + stats.errors}
            </p>
          </div>
          <p className="text-xs text-muted-foreground">Need Attention</p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-2">
        <Button
          onClick={onSaveAllValid}
          disabled={stats.valid === 0 || isSaving}
          className="flex-1"
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <CheckCircle className="h-4 w-4 mr-2" />
              Save All Valid ({stats.valid})
            </>
          )}
        </Button>
        <Button
          variant="outline"
          onClick={onClearAll}
          disabled={isSaving}
        >
          <FileX className="h-4 w-4 mr-2" />
          Clear All
        </Button>
      </div>
    </div>
  );
}
