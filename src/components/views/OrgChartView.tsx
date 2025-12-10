import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { 
  Users, 
  GripVertical, 
  Pencil, 
  Trash2, 
  Plus, 
  User,
  Building2,
  ChevronDown,
  ChevronRight,
  Link as LinkIcon,
  Unlink
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useOrgChart, useUpdateOrgPosition, useAddOrgPosition, useDeleteOrgPosition, OrgChartPosition } from '@/hooks/useOrgChart';
import { useEmployees } from '@/hooks/useEmployees';
import { toast } from 'sonner';

interface OrgNodeProps {
  position: OrgChartPosition;
  children: OrgChartPosition[];
  allPositions: OrgChartPosition[];
  onEdit: (position: OrgChartPosition) => void;
  onDelete: (id: string) => void;
  onLinkEmployee: (position: OrgChartPosition) => void;
  level: number;
  expandedNodes: Set<string>;
  toggleExpand: (id: string) => void;
}

function OrgNode({ position, children, allPositions, onEdit, onDelete, onLinkEmployee, level, expandedNodes, toggleExpand }: OrgNodeProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: position.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const hasChildren = children.length > 0;
  const isExpanded = expandedNodes.has(position.id);

  const getLevelColor = (lvl: number) => {
    const colors = [
      'from-amber-500 to-orange-600', // President
      'from-blue-500 to-indigo-600', // CEO
      'from-purple-500 to-violet-600', // COO
      'from-emerald-500 to-teal-600', // Managers
      'from-rose-500 to-pink-600', // Staff
    ];
    return colors[Math.min(lvl, colors.length - 1)];
  };

  return (
    <div ref={setNodeRef} style={style} className={cn("relative", isDragging && "opacity-50")}>
      <div className="flex flex-col items-center">
        {/* Node Card */}
        <Card className={cn(
          "relative w-56 p-4 border-2 transition-all duration-200 hover:shadow-lg",
          isDragging ? "shadow-2xl ring-2 ring-primary" : "shadow-md",
          "bg-card"
        )}>
          {/* Gradient Header */}
          <div className={cn(
            "absolute top-0 left-0 right-0 h-2 rounded-t-lg bg-gradient-to-r",
            getLevelColor(level)
          )} />
          
          {/* Drag Handle */}
          <div 
            {...attributes} 
            {...listeners}
            className="absolute top-3 right-2 p-1 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
          >
            <GripVertical className="w-4 h-4" />
          </div>

          {/* Content */}
          <div className="pt-2 text-center">
            {/* Photo/Avatar */}
            <div className="mx-auto mb-3 relative">
              {position.employees?.photo_url ? (
                <img 
                  src={position.employees.photo_url} 
                  alt={position.holder_name || position.title}
                  className="w-16 h-16 rounded-full object-cover border-4 border-background shadow-md mx-auto"
                />
              ) : (
                <div className={cn(
                  "w-16 h-16 rounded-full flex items-center justify-center mx-auto shadow-md border-4 border-background bg-gradient-to-br",
                  getLevelColor(level)
                )}>
                  <User className="w-8 h-8 text-white" />
                </div>
              )}
              {position.employee_id && (
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                  <LinkIcon className="w-3 h-3 text-primary-foreground" />
                </div>
              )}
            </div>

            {/* Name */}
            <h3 className="font-semibold text-foreground text-sm truncate">
              {position.employees?.full_name || position.holder_name || 'Vacant'}
            </h3>
            
            {/* Position Title */}
            <p className={cn(
              "text-xs font-medium mt-1 px-2 py-0.5 rounded-full inline-block bg-gradient-to-r text-white",
              getLevelColor(level)
            )}>
              {position.title}
            </p>

            {/* Actions */}
            <div className="flex justify-center gap-1 mt-3">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-primary"
                onClick={() => onLinkEmployee(position)}
              >
                {position.employee_id ? <Unlink className="w-3.5 h-3.5" /> : <LinkIcon className="w-3.5 h-3.5" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-primary"
                onClick={() => onEdit(position)}
              >
                <Pencil className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={() => onDelete(position.id)}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          {/* Expand/Collapse Button */}
          {hasChildren && (
            <button
              onClick={() => toggleExpand(position.id)}
              className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-6 bg-primary rounded-full flex items-center justify-center text-primary-foreground shadow-md hover:scale-110 transition-transform z-10"
            >
              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          )}
        </Card>

        {/* Connector Line */}
        {hasChildren && isExpanded && (
          <div className="w-0.5 h-6 bg-border" />
        )}

        {/* Children */}
        {hasChildren && isExpanded && (
          <div className="relative">
            {/* Horizontal connector */}
            {children.length > 1 && (
              <div 
                className="absolute top-0 h-0.5 bg-border"
                style={{
                  left: `calc(50% - ${(children.length - 1) * 72}px)`,
                  right: `calc(50% - ${(children.length - 1) * 72}px)`,
                }}
              />
            )}
            <div className="flex gap-4 pt-0">
              {children.map((child) => {
                const grandChildren = allPositions.filter(p => p.parent_id === child.id);
                return (
                  <div key={child.id} className="flex flex-col items-center">
                    {/* Vertical connector to child */}
                    <div className="w-0.5 h-6 bg-border" />
                    <OrgNode
                      position={child}
                      children={grandChildren}
                      allPositions={allPositions}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      onLinkEmployee={onLinkEmployee}
                      level={level + 1}
                      expandedNodes={expandedNodes}
                      toggleExpand={toggleExpand}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function OrgChartView() {
  const { data: positions = [], isLoading } = useOrgChart();
  const { data: employees = [] } = useEmployees();
  const updatePosition = useUpdateOrgPosition();
  const addPosition = useAddOrgPosition();
  const deletePosition = useDeleteOrgPosition();
  
  const [editingPosition, setEditingPosition] = useState<OrgChartPosition | null>(null);
  const [linkingPosition, setLinkingPosition] = useState<OrgChartPosition | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newHolderName, setNewHolderName] = useState('');
  const [newParentId, setNewParentId] = useState<string>('');
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(positions.map(p => p.id)));
  const [activeId, setActiveId] = useState<string | null>(null);

  // Update expanded nodes when positions load
  useMemo(() => {
    if (positions.length > 0 && expandedNodes.size === 0) {
      setExpandedNodes(new Set(positions.map(p => p.id)));
    }
  }, [positions]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const rootPositions = positions.filter(p => p.parent_id === null);

  const toggleExpand = (id: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const activePos = positions.find(p => p.id === active.id);
      const overPos = positions.find(p => p.id === over.id);
      
      if (activePos && overPos) {
        // Swap sort orders within same parent
        if (activePos.parent_id === overPos.parent_id) {
          updatePosition.mutate({
            id: activePos.id,
            sort_order: overPos.sort_order,
          });
          updatePosition.mutate({
            id: overPos.id,
            sort_order: activePos.sort_order,
          });
          toast.success('Positions reordered');
        }
      }
    }
  };

  const handleEdit = (position: OrgChartPosition) => {
    setEditingPosition(position);
    setNewTitle(position.title);
    setNewHolderName(position.holder_name || '');
  };

  const handleSaveEdit = () => {
    if (editingPosition) {
      updatePosition.mutate({
        id: editingPosition.id,
        title: newTitle,
        holder_name: newHolderName || null,
      });
      toast.success('Position updated');
      setEditingPosition(null);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this position? All subordinate positions will become orphaned.')) {
      deletePosition.mutate(id);
    }
  };

  const handleAddPosition = () => {
    if (!newTitle.trim()) {
      toast.error('Position title is required');
      return;
    }

    const parentPos = positions.find(p => p.id === newParentId);
    const siblingCount = positions.filter(p => p.parent_id === (newParentId || null)).length;

    addPosition.mutate({
      title: newTitle,
      holder_name: newHolderName || null,
      employee_id: null,
      parent_id: newParentId || null,
      sort_order: siblingCount,
      level: parentPos ? parentPos.level + 1 : 0,
    });

    setNewTitle('');
    setNewHolderName('');
    setNewParentId('');
    setIsAddDialogOpen(false);
  };

  const handleLinkEmployee = (position: OrgChartPosition) => {
    setLinkingPosition(position);
  };

  const handleSelectEmployee = (employeeId: string) => {
    if (linkingPosition) {
      const employee = employees.find(e => e.id === employeeId);
      updatePosition.mutate({
        id: linkingPosition.id,
        employee_id: employeeId === 'unlink' ? null : employeeId,
        holder_name: employeeId === 'unlink' ? 'To be assigned' : employee?.full_name || null,
      });
      toast.success(employeeId === 'unlink' ? 'Employee unlinked' : 'Employee linked');
      setLinkingPosition(null);
    }
  };

  const expandAll = () => {
    setExpandedNodes(new Set(positions.map(p => p.id)));
  };

  const collapseAll = () => {
    setExpandedNodes(new Set());
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
            <Building2 className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Company Hierarchy</h1>
            <p className="text-sm text-muted-foreground">Drag and drop to rearrange positions</p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={expandAll}>
            Expand All
          </Button>
          <Button variant="outline" size="sm" onClick={collapseAll}>
            Collapse All
          </Button>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Add Position
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Position</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <label className="text-sm font-medium text-foreground">Position Title</label>
                  <Input
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g. Department Head"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Holder Name (Optional)</label>
                  <Input
                    value={newHolderName}
                    onChange={(e) => setNewHolderName(e.target.value)}
                    placeholder="e.g. John Doe"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Reports To</label>
                  <Select value={newParentId} onValueChange={setNewParentId}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select parent position" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Parent (Top Level)</SelectItem>
                      {positions.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleAddPosition} className="w-full">
                  Add Position
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Org Chart */}
      <Card className="p-8 overflow-x-auto">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={positions.map(p => p.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="flex flex-col items-center min-w-max py-8">
              {rootPositions.map((root) => {
                const children = positions.filter(p => p.parent_id === root.id);
                return (
                  <OrgNode
                    key={root.id}
                    position={root}
                    children={children}
                    allPositions={positions}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onLinkEmployee={handleLinkEmployee}
                    level={0}
                    expandedNodes={expandedNodes}
                    toggleExpand={toggleExpand}
                  />
                );
              })}
            </div>
          </SortableContext>
        </DndContext>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingPosition} onOpenChange={() => setEditingPosition(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Position</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <label className="text-sm font-medium text-foreground">Position Title</label>
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Holder Name</label>
              <Input
                value={newHolderName}
                onChange={(e) => setNewHolderName(e.target.value)}
                className="mt-1"
              />
            </div>
            <Button onClick={handleSaveEdit} className="w-full">
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Link Employee Dialog */}
      <Dialog open={!!linkingPosition} onOpenChange={() => setLinkingPosition(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Link Employee to {linkingPosition?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 pt-4 max-h-96 overflow-y-auto">
            {linkingPosition?.employee_id && (
              <Button
                variant="outline"
                className="w-full justify-start gap-3 h-auto py-3 border-destructive text-destructive"
                onClick={() => handleSelectEmployee('unlink')}
              >
                <Unlink className="w-5 h-5" />
                <span>Unlink Current Employee</span>
              </Button>
            )}
            {employees.map((employee) => (
              <Button
                key={employee.id}
                variant="outline"
                className={cn(
                  "w-full justify-start gap-3 h-auto py-3",
                  linkingPosition?.employee_id === employee.id && "border-primary bg-primary/5"
                )}
                onClick={() => handleSelectEmployee(employee.id)}
              >
                {employee.photo_url ? (
                  <img 
                    src={employee.photo_url} 
                    alt={employee.full_name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                )}
                <div className="text-left">
                  <p className="font-medium text-foreground">{employee.full_name}</p>
                  <p className="text-xs text-muted-foreground">{employee.job_position}</p>
                </div>
              </Button>
            ))}
            {employees.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                No employees found. Add employees first.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
