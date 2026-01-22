import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { VisaStage, STAGE_COLORS } from '@/constants/visaStages';
import { VisaApplication } from '@/hooks/useVisaProcess';
import { VisaApplicationCard } from './VisaApplicationCard';
import { cn } from '@/lib/utils';
import { Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface VisaKanbanColumnProps {
  stage: VisaStage;
  applications: VisaApplication[];
}

export const VisaKanbanColumn = ({ 
  stage, 
  applications
}: VisaKanbanColumnProps) => {
  const { setNodeRef, isOver } = useDroppable({
    id: stage.id
  });

  const colors = STAGE_COLORS[stage.color] || STAGE_COLORS.blue;
  const applicationIds = applications.map(a => a.id);

  return (
    <Card 
      ref={setNodeRef}
      className={cn(
        'flex flex-col h-full w-full min-w-0 transition-all',
        isOver && 'ring-2 ring-primary ring-offset-2',
        colors.border,
        'border-t-4'
      )}
    >
      <CardHeader className={cn('py-2 px-2', colors.bg)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <CardTitle className={cn('text-xs font-semibold truncate', colors.text)}>
                    {stage.shortName}
                  </CardTitle>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs font-medium">{stage.name}</p>
                  <p className="text-xs text-muted-foreground">{stage.description}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            {stage.conditional && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-3 w-3 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">Optional - only for non-skilled positions</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {stage.canBeSkipped && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-3 w-3 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">Can be marked as not required</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          <Badge variant="secondary" className="text-[10px] px-1 py-0">
            {applications.length}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 p-1 overflow-hidden">
        <ScrollArea className="h-full max-h-[calc(100vh-300px)]">
          <SortableContext items={applicationIds} strategy={verticalListSortingStrategy}>
            <div className="space-y-1 pb-2">
              {applications.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground text-xs">
                  No applications
                </div>
              ) : (
                applications.map((application) => (
                  <VisaApplicationCard
                    key={application.id}
                    application={application}
                  />
                ))
              )}
            </div>
          </SortableContext>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
