import { useState, useMemo } from 'react';
import { 
  DndContext, 
  DragEndEvent, 
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners
} from '@dnd-kit/core';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Plane, Plus, Search, Filter, RefreshCw, AlertTriangle, Users } from 'lucide-react';
import { VISA_STAGES, VISA_TYPES } from '@/constants/visaStages';
import { 
  useVisaApplications, 
  useMoveToNextStage,
  VisaApplication 
} from '@/hooks/useVisaProcess';
import { useEmployees } from '@/hooks/useEmployees';
import { VisaKanbanColumn } from '@/components/visa/VisaKanbanColumn';
import { VisaApplicationCard } from '@/components/visa/VisaApplicationCard';
import { VisaApplicationModal } from '@/components/visa/VisaApplicationModal';

export const VisaProcessView = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [visaTypeFilter, setVisaTypeFilter] = useState<string>('all');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<VisaApplication | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const { data: applications = [], isLoading, refetch } = useVisaApplications();
  const { data: employees = [] } = useEmployees();
  const moveToNextMutation = useMoveToNextStage();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Get unique departments
  const departments = useMemo(() => {
    const depts = new Set(employees.map(e => e.department).filter(Boolean));
    return Array.from(depts).sort();
  }, [employees]);

  // Filter applications
  const filteredApplications = useMemo(() => {
    return applications.filter(app => {
      const matchesSearch = !searchQuery || 
        app.employees?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.employees?.job_position?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesDepartment = departmentFilter === 'all' || 
        app.employees?.department === departmentFilter;
      
      const matchesVisaType = visaTypeFilter === 'all' || 
        app.visa_type === visaTypeFilter;
      
      return matchesSearch && matchesDepartment && matchesVisaType;
    });
  }, [applications, searchQuery, departmentFilter, visaTypeFilter]);

  // Group applications by stage
  const applicationsByStage = useMemo(() => {
    const grouped: Record<string, VisaApplication[]> = {};
    VISA_STAGES.forEach(stage => {
      grouped[stage.id] = filteredApplications.filter(
        app => app.current_stage === stage.id
      );
    });
    return grouped;
  }, [filteredApplications]);

  // Stats
  const stats = useMemo(() => {
    const total = applications.length;
    const delayed = applications.filter(app => {
      if (app.current_stage !== 'immigration_processing') return false;
      const days = Math.ceil(
        (new Date().getTime() - new Date(app.stage_entered_at).getTime()) / (1000 * 60 * 60 * 24)
      );
      return days > 45;
    }).length;
    const completed = applications.filter(
      app => app.current_stage === 'onboarding' && app.onboarding_completed
    ).length;
    
    return { total, delayed, completed };
  }, [applications]);

  const activeApplication = activeId 
    ? applications.find(a => a.id === activeId) 
    : null;

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    
    if (!over) return;
    
    const application = applications.find(a => a.id === active.id);
    if (!application) return;
    
    const targetStage = over.id as string;
    if (targetStage === application.current_stage) return;
    
    // Only allow moving to the next stage
    const currentStageIndex = VISA_STAGES.findIndex(s => s.id === application.current_stage);
    const targetStageIndex = VISA_STAGES.findIndex(s => s.id === targetStage);
    
    if (targetStageIndex === currentStageIndex + 1) {
      // Check if tawjeeh should be skipped
      const skipTawjeeh = targetStage === 'tawjeeh' && !application.tawjeeh_required;
      
      moveToNextMutation.mutate({
        applicationId: application.id,
        currentStage: application.current_stage,
        skipTawjeeh
      });
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Plane className="h-6 w-6 text-primary" />
            Visa Process
          </h1>
          <p className="text-muted-foreground">
            Track and manage employee visa applications
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button onClick={() => setCreateModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Application
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Users className="h-4 w-4" />
            Total Applications
          </div>
          <p className="text-2xl font-bold mt-1">{stats.total}</p>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400 text-sm">
            <AlertTriangle className="h-4 w-4" />
            Delayed (Immigration)
          </div>
          <p className="text-2xl font-bold mt-1">{stats.delayed}</p>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-sm">
            <Plane className="h-4 w-4" />
            Completed
          </div>
          <p className="text-2xl font-bold mt-1">{stats.completed}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-[300px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or position..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        
        <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
          <SelectTrigger className="w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Department" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {departments.map(dept => (
              <SelectItem key={dept} value={dept}>{dept}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Select value={visaTypeFilter} onValueChange={setVisaTypeFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Visa Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {VISA_TYPES.map(type => (
              <SelectItem key={type} value={type}>{type}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {(searchQuery || departmentFilter !== 'all' || visaTypeFilter !== 'all') && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchQuery('');
              setDepartmentFilter('all');
              setVisaTypeFilter('all');
            }}
          >
            Clear filters
          </Button>
        )}
        
        <Badge variant="secondary" className="ml-auto">
          {filteredApplications.length} application{filteredApplications.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="flex gap-4 pb-4 min-w-max">
              {VISA_STAGES.map(stage => (
                <VisaKanbanColumn
                  key={stage.id}
                  stage={stage}
                  applications={applicationsByStage[stage.id] || []}
                />
              ))}
            </div>
            
            <DragOverlay>
              {activeApplication && (
                <div className="opacity-80">
                  <VisaApplicationCard application={activeApplication} />
                </div>
              )}
            </DragOverlay>
          </DndContext>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>

      {/* Modals */}
      <VisaApplicationModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        mode="create"
      />
      
      <VisaApplicationModal
        open={!!selectedApplication}
        onOpenChange={(open) => !open && setSelectedApplication(null)}
        application={selectedApplication}
        mode="edit"
      />
    </div>
  );
};
