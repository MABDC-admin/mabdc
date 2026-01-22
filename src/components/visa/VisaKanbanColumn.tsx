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
  onCardClick: (application: VisaApplication) => void;
}

export const VisaKanbanColumn = ({ 
  stage, 
  applications, 
  onCardClick 
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
        'flex flex-col h-full min-w-[280px] max-w-[280px] transition-all',
        isOver && 'ring-2 ring-primary ring-offset-2',
        colors.border,
        'border-t-4'
      )}
    >
      <CardHeader className={cn('py-3 px-4', colors.bg)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className={cn('text-sm font-semibold', colors.text)}>
              {stage.name}
            </CardTitle>
            {stage.conditional && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-3.5 w-3.5 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">Optional stage - only for non-skilled positions</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          <Badge variant="secondary" className="text-xs">
            {applications.length}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-1">{stage.description}</p>
      </CardHeader>
      
      <CardContent className="flex-1 p-2 overflow-hidden">
        <ScrollArea className="h-full max-h-[calc(100vh-300px)]">
          <SortableContext items={applicationIds} strategy={verticalListSortingStrategy}>
            <div className="space-y-2 pb-4">
              {applications.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No applications
                </div>
              ) : (
                applications.map((application) => (
                  <VisaApplicationCard
                    key={application.id}
                    application={application}
                    onClick={() => onCardClick(application)}
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
