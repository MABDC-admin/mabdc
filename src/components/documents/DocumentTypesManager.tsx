import { useState } from 'react';
import { useDocumentTypes, useAddDocumentType, useDeleteDocumentType } from '@/hooks/useDocumentTypes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, Lock, File, BookOpen, Plane, CreditCard, Briefcase, IdCard, HeartPulse, FileText, Award, BadgeCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

const iconMap: Record<string, React.ElementType> = {
  'file': File,
  'book': BookOpen,
  'plane': Plane,
  'credit-card': CreditCard,
  'briefcase': Briefcase,
  'id-card': IdCard,
  'heart-pulse': HeartPulse,
  'file-text': FileText,
  'award': Award,
  'badge': BadgeCheck,
};

interface DocumentTypesManagerProps {
  onClose?: () => void;
}

export function DocumentTypesManager({ onClose }: DocumentTypesManagerProps) {
  const { data: documentTypes = [], isLoading } = useDocumentTypes();
  const addDocumentType = useAddDocumentType();
  const deleteDocumentType = useDeleteDocumentType();
  
  const [isAdding, setIsAdding] = useState(false);
  const [newType, setNewType] = useState({
    name: '',
    name_arabic: '',
    requires_expiry: true,
    icon: 'file',
  });

  const handleAdd = () => {
    if (!newType.name.trim()) return;
    
    addDocumentType.mutate(newType, {
      onSuccess: () => {
        setNewType({ name: '', name_arabic: '', requires_expiry: true, icon: 'file' });
        setIsAdding(false);
      }
    });
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this document type?')) {
      deleteDocumentType.mutate(id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Document Types</h3>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setIsAdding(!isAdding)}
        >
          <Plus className="w-4 h-4 mr-1" />
          Add Type
        </Button>
      </div>

      {/* Add New Type Form */}
      {isAdding && (
        <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 space-y-3 animate-fade-in">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Name (English)</label>
              <Input
                value={newType.name}
                onChange={(e) => setNewType({ ...newType, name: e.target.value })}
                placeholder="e.g. Work Permit"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Name (Arabic)</label>
              <Input
                value={newType.name_arabic}
                onChange={(e) => setNewType({ ...newType, name_arabic: e.target.value })}
                placeholder="e.g. تصريح العمل"
                dir="rtl"
              />
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Switch
                checked={newType.requires_expiry}
                onCheckedChange={(checked) => setNewType({ ...newType, requires_expiry: checked })}
              />
              <label className="text-sm text-muted-foreground">Requires Expiry Date</label>
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setIsAdding(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleAdd} disabled={!newType.name.trim()}>
                Save
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Document Types List */}
      <div className="space-y-2">
        {documentTypes.map((type) => {
          const IconComponent = iconMap[type.icon] || File;
          
          return (
            <div
              key={type.id}
              className={cn(
                "flex items-center justify-between p-3 rounded-lg border",
                type.is_system
                  ? "bg-secondary/30 border-border"
                  : "bg-card border-border hover:border-primary/30 transition-colors"
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center",
                  type.is_system ? "bg-primary/10" : "bg-secondary"
                )}>
                  <IconComponent className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">{type.name}</span>
                    {type.is_system && (
                      <Lock className="w-3 h-3 text-muted-foreground" />
                    )}
                  </div>
                  {type.name_arabic && (
                    <span className="text-xs text-muted-foreground" dir="rtl">
                      {type.name_arabic}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                {type.requires_expiry && (
                  <span className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                    Expiry Required
                  </span>
                )}
                
                {!type.is_system && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDelete(type.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
