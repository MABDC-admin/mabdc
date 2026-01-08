import { Loader2, CheckCircle, XCircle, Clock, FileText } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { BulkDocumentItem } from '@/hooks/useBulkDocumentUpload';
import { cn } from '@/lib/utils';

interface BulkProgressViewProps {
  items: BulkDocumentItem[];
  currentIndex: number;
}

export function BulkProgressView({ items, currentIndex }: BulkProgressViewProps) {
  const completedCount = items.filter(it => it.status === 'complete' || it.status === 'error').length;
  const progressPercent = items.length > 0 ? (completedCount / items.length) * 100 : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium">
          Analyzing {currentIndex + 1} of {items.length} documents...
        </p>
        <span className="text-sm text-muted-foreground">
          {Math.round(progressPercent)}%
        </span>
      </div>
      
      <Progress value={progressPercent} className="h-2" />

      <div className="space-y-2 max-h-[300px] overflow-y-auto">
        {items.map((item, index) => (
          <div
            key={item.id}
            className={cn(
              "flex items-center gap-3 p-2 rounded-lg border",
              item.status === 'analyzing' && "bg-primary/5 border-primary/30",
              item.status === 'complete' && "bg-green-500/5 border-green-500/30",
              item.status === 'error' && "bg-destructive/5 border-destructive/30",
              item.status === 'pending' && "bg-muted/50"
            )}
          >
            {/* Status Icon */}
            <div className="flex-shrink-0">
              {item.status === 'pending' && (
                <Clock className="h-4 w-4 text-muted-foreground" />
              )}
              {item.status === 'analyzing' && (
                <Loader2 className="h-4 w-4 text-primary animate-spin" />
              )}
              {item.status === 'complete' && (
                <CheckCircle className="h-4 w-4 text-green-500" />
              )}
              {item.status === 'error' && (
                <XCircle className="h-4 w-4 text-destructive" />
              )}
            </div>

            {/* File Info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{item.file.name}</p>
              {item.status === 'complete' && item.extractionResult && (
                <p className="text-xs text-muted-foreground">
                  {item.extractionResult.extractedData.documentType}
                  {item.extractionResult.matchedEmployee && (
                    <> • Matched: {item.extractionResult.matchedEmployee.full_name}</>
                  )}
                </p>
              )}
              {item.status === 'error' && (
                <p className="text-xs text-destructive">{item.error}</p>
              )}
            </div>

            {/* File Icon */}
            <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
