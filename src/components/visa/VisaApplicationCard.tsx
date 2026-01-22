import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Clock, AlertTriangle, AlertCircle, GripVertical } from 'lucide-react';
import { VisaApplication, getDaysInStage, getDelayStatus } from '@/hooks/useVisaProcess';
import { cn } from '@/lib/utils';

interface VisaApplicationCardProps {
  application: VisaApplication;
  onClick?: () => void;
}

export const VisaApplicationCard = ({ application, onClick }: VisaApplicationCardProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: application.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  };

  const daysInStage = getDaysInStage(application.stage_entered_at);
  const delayStatus = getDelayStatus(application);
  const employee = application.employees;

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getStatusBadge = () => {
    switch (application.current_stage) {
      case 'mohre_application':
        return application.mohre_status;
      case 'immigration_processing':
        return application.immigration_status;
      case 'medical_examination':
        return application.medical_status;
      case 'daman_insurance':
        return application.daman_status;
      case 'residence_visa':
        return application.residence_visa_status;
      default:
        return null;
    }
  };

  const status = getStatusBadge();

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn(
        'p-3 cursor-pointer hover:shadow-md transition-all border-l-4',
        isDragging && 'opacity-50 shadow-lg rotate-2',
        delayStatus === 'critical' && 'border-l-red-500 bg-red-50 dark:bg-red-950/20',
        delayStatus === 'warning' && 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-950/20',
        !delayStatus && 'border-l-primary/50'
      )}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing mt-1 text-muted-foreground hover:text-foreground"
        >
          <GripVertical className="h-4 w-4" />
        </div>
        
        <Avatar className="h-10 w-10 flex-shrink-0">
          <AvatarImage src={employee?.photo_url || undefined} alt={employee?.full_name} />
          <AvatarFallback className="text-xs">
            {employee?.full_name ? getInitials(employee.full_name) : '??'}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">
            {employee?.full_name || 'Unknown Employee'}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {employee?.job_position || 'No position'}
          </p>
          
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <Badge variant="outline" className="text-xs">
              {application.visa_type}
            </Badge>
            
            {status && (
              <Badge 
                variant="secondary" 
                className={cn(
                  'text-xs',
                  status === 'Approved' && 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
                  status === 'Pending' && 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
                  status === 'Rejected' && 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
                  status === 'In Progress' && 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
                  status === 'Passed' && 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
                  status === 'Failed' && 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
                  status === 'Stamped' && 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                )}
              >
                {status}
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
            {delayStatus === 'critical' ? (
              <AlertCircle className="h-3 w-3 text-red-500" />
            ) : delayStatus === 'warning' ? (
              <AlertTriangle className="h-3 w-3 text-yellow-500" />
            ) : (
              <Clock className="h-3 w-3" />
            )}
            <span className={cn(
              delayStatus === 'critical' && 'text-red-600 font-medium',
              delayStatus === 'warning' && 'text-yellow-600 font-medium'
            )}>
              {daysInStage} day{daysInStage !== 1 ? 's' : ''} in stage
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
};
