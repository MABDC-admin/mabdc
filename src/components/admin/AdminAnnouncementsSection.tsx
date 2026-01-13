import { useState } from 'react';
import { useAnnouncements, useCreateAnnouncement, useDeleteAnnouncement, usePublishAnnouncement } from '@/hooks/useAnnouncements';
import { useEmployees } from '@/hooks/useEmployees';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Megaphone, Plus, Trash2, Send, Clock, Bell, 
  AlertTriangle, Loader2, Users, Building2, Calendar
} from 'lucide-react';
import { format, parseISO, formatDistanceToNow } from 'date-fns';

const priorityColors: Record<string, string> = {
  low: 'bg-muted text-muted-foreground',
  normal: 'bg-primary/10 text-primary',
  high: 'bg-amber-500/10 text-amber-600',
  urgent: 'bg-destructive/10 text-destructive',
};

const priorityLabels: Record<string, string> = {
  low: 'Low',
  normal: 'Normal',
  high: 'High Priority',
  urgent: 'Urgent',
};

export function AdminAnnouncementsSection() {
  const { data: announcements = [], isLoading } = useAnnouncements();
  const { data: employees = [] } = useEmployees();
  const createAnnouncement = useCreateAnnouncement();
  const deleteAnnouncement = useDeleteAnnouncement();
  const publishAnnouncement = usePublishAnnouncement();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    body: '',
    priority: 'normal' as 'low' | 'normal' | 'high' | 'urgent',
    send_push: true,
    target_type: 'all' as 'all' | 'department' | 'employees',
    target_departments: [] as string[],
    target_employee_ids: [] as string[],
    schedule: false,
    published_at: '',
    expires_at: '',
  });

  // Get unique departments
  const departments = [...new Set(employees.map(e => e.department).filter(Boolean))];

  const handleCreate = async () => {
    if (!formData.title.trim() || !formData.body.trim()) {
      return;
    }

    await createAnnouncement.mutateAsync({
      title: formData.title,
      body: formData.body,
      priority: formData.priority,
      send_push: formData.send_push,
      target_departments: formData.target_type === 'department' ? formData.target_departments : undefined,
      target_employee_ids: formData.target_type === 'employees' ? formData.target_employee_ids : undefined,
      published_at: formData.schedule && formData.published_at ? formData.published_at : undefined,
      expires_at: formData.expires_at || undefined,
    });

    setShowCreateDialog(false);
    resetForm();
  };

  const handleDelete = async () => {
    if (!showDeleteDialog) return;
    await deleteAnnouncement.mutateAsync(showDeleteDialog);
    setShowDeleteDialog(null);
  };

  const handlePublish = async (id: string) => {
    await publishAnnouncement.mutateAsync(id);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      body: '',
      priority: 'normal',
      send_push: true,
      target_type: 'all',
      target_departments: [],
      target_employee_ids: [],
      schedule: false,
      published_at: '',
      expires_at: '',
    });
  };

  const publishedAnnouncements = announcements.filter(a => a.published_at && new Date(a.published_at) <= new Date());
  const draftAnnouncements = announcements.filter(a => !a.published_at);
  const scheduledAnnouncements = announcements.filter(a => a.published_at && new Date(a.published_at) > new Date());

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Megaphone className="w-5 h-5" />
                Announcements
              </CardTitle>
              <CardDescription>
                Send announcements and push notifications to employees
              </CardDescription>
            </div>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              New Announcement
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 bg-muted/50 rounded-lg text-center">
              <p className="text-2xl font-bold">{publishedAnnouncements.length}</p>
              <p className="text-xs text-muted-foreground">Published</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg text-center">
              <p className="text-2xl font-bold">{scheduledAnnouncements.length}</p>
              <p className="text-xs text-muted-foreground">Scheduled</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg text-center">
              <p className="text-2xl font-bold">{draftAnnouncements.length}</p>
              <p className="text-xs text-muted-foreground">Drafts</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Scheduled Announcements */}
      {scheduledAnnouncements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Scheduled
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {scheduledAnnouncements.map((announcement) => (
              <AnnouncementCard
                key={announcement.id}
                announcement={announcement}
                onDelete={() => setShowDeleteDialog(announcement.id)}
                onPublish={() => handlePublish(announcement.id)}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Draft Announcements */}
      {draftAnnouncements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Drafts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {draftAnnouncements.map((announcement) => (
              <AnnouncementCard
                key={announcement.id}
                announcement={announcement}
                onDelete={() => setShowDeleteDialog(announcement.id)}
                onPublish={() => handlePublish(announcement.id)}
                isDraft
              />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Published Announcements */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Send className="w-4 h-4 text-green-500" />
            Published Announcements
          </CardTitle>
        </CardHeader>
        <CardContent>
          {publishedAnnouncements.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No announcements published yet
            </p>
          ) : (
            <div className="space-y-3">
              {publishedAnnouncements.map((announcement) => (
                <AnnouncementCard
                  key={announcement.id}
                  announcement={announcement}
                  onDelete={() => setShowDeleteDialog(announcement.id)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Megaphone className="w-5 h-5" />
              Create Announcement
            </DialogTitle>
            <DialogDescription>
              Send an announcement to employees with optional push notification
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="Announcement title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="body">Message</Label>
              <Textarea
                id="body"
                placeholder="Write your announcement message..."
                rows={4}
                value={formData.body}
                onChange={(e) => setFormData({ ...formData, body: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value: 'low' | 'normal' | 'high' | 'urgent') => 
                    setFormData({ ...formData, priority: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High Priority</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Target Audience</Label>
                <Select
                  value={formData.target_type}
                  onValueChange={(value: 'all' | 'department' | 'employees') => 
                    setFormData({ ...formData, target_type: value, target_departments: [], target_employee_ids: [] })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Employees</SelectItem>
                    <SelectItem value="department">By Department</SelectItem>
                    <SelectItem value="employees">Specific Employees</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {formData.target_type === 'department' && (
              <div className="space-y-2">
                <Label>Select Departments</Label>
                <div className="flex flex-wrap gap-2">
                  {departments.map((dept) => (
                    <Badge
                      key={dept}
                      variant={formData.target_departments.includes(dept) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => {
                        const newDepts = formData.target_departments.includes(dept)
                          ? formData.target_departments.filter(d => d !== dept)
                          : [...formData.target_departments, dept];
                        setFormData({ ...formData, target_departments: newDepts });
                      }}
                    >
                      {dept}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {formData.target_type === 'employees' && (
              <div className="space-y-2">
                <Label>Select Employees</Label>
                <Select
                  value=""
                  onValueChange={(value) => {
                    if (!formData.target_employee_ids.includes(value)) {
                      setFormData({
                        ...formData,
                        target_employee_ids: [...formData.target_employee_ids, value]
                      });
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Add employee..." />
                  </SelectTrigger>
                  <SelectContent>
                    {employees
                      .filter(e => !formData.target_employee_ids.includes(e.id))
                      .map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.full_name} ({emp.department})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                {formData.target_employee_ids.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.target_employee_ids.map((empId) => {
                      const emp = employees.find(e => e.id === empId);
                      return emp ? (
                        <Badge
                          key={empId}
                          variant="secondary"
                          className="cursor-pointer"
                          onClick={() => {
                            setFormData({
                              ...formData,
                              target_employee_ids: formData.target_employee_ids.filter(id => id !== empId)
                            });
                          }}
                        >
                          {emp.full_name} ×
                        </Badge>
                      ) : null;
                    })}
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-muted-foreground" />
                <Label htmlFor="send-push" className="cursor-pointer">
                  Send push notification
                </Label>
              </div>
              <Switch
                id="send-push"
                checked={formData.send_push}
                onCheckedChange={(checked) => setFormData({ ...formData, send_push: checked })}
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <Label htmlFor="schedule" className="cursor-pointer">
                  Schedule for later
                </Label>
              </div>
              <Switch
                id="schedule"
                checked={formData.schedule}
                onCheckedChange={(checked) => setFormData({ ...formData, schedule: checked })}
              />
            </div>

            {formData.schedule && (
              <div className="space-y-2">
                <Label htmlFor="published_at">Publish Date & Time</Label>
                <Input
                  id="published_at"
                  type="datetime-local"
                  value={formData.published_at}
                  onChange={(e) => setFormData({ ...formData, published_at: e.target.value })}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="expires_at">Expiry Date (optional)</Label>
              <Input
                id="expires_at"
                type="datetime-local"
                value={formData.expires_at}
                onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                After this date, the announcement won't be visible to employees
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={createAnnouncement.isPending || !formData.title.trim() || !formData.body.trim()}
            >
              {createAnnouncement.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : formData.schedule ? (
                <>
                  <Clock className="w-4 h-4 mr-2" />
                  Schedule
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Publish Now
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={!!showDeleteDialog} onOpenChange={(open) => !open && setShowDeleteDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Announcement</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this announcement? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function AnnouncementCard({
  announcement,
  onDelete,
  onPublish,
  isDraft = false,
}: {
  announcement: {
    id: string;
    title: string;
    body: string;
    priority: string;
    target_departments: string[] | null;
    target_employee_ids: string[] | null;
    send_push: boolean;
    published_at: string | null;
    expires_at: string | null;
    created_at: string;
  };
  onDelete: () => void;
  onPublish?: () => void;
  isDraft?: boolean;
}) {
  return (
    <div className="p-4 border rounded-lg space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h4 className="font-medium">{announcement.title}</h4>
            <Badge className={priorityColors[announcement.priority]}>
              {priorityLabels[announcement.priority]}
            </Badge>
            {announcement.send_push && (
              <Badge variant="outline" className="text-xs">
                <Bell className="w-3 h-3 mr-1" />
                Push
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground line-clamp-2">{announcement.body}</p>
        </div>
        <div className="flex items-center gap-2">
          {(isDraft || (announcement.published_at && new Date(announcement.published_at) > new Date())) && onPublish && (
            <Button size="sm" onClick={onPublish}>
              <Send className="w-4 h-4 mr-1" />
              Publish
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={onDelete}>
            <Trash2 className="w-4 h-4 text-destructive" />
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        {/* Target */}
        <div className="flex items-center gap-1">
          {announcement.target_departments?.length ? (
            <>
              <Building2 className="w-3 h-3" />
              <span>{announcement.target_departments.join(', ')}</span>
            </>
          ) : announcement.target_employee_ids?.length ? (
            <>
              <Users className="w-3 h-3" />
              <span>{announcement.target_employee_ids.length} employees</span>
            </>
          ) : (
            <>
              <Users className="w-3 h-3" />
              <span>All employees</span>
            </>
          )}
        </div>

        {/* Published */}
        {announcement.published_at && (
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            <span>
              {new Date(announcement.published_at) > new Date()
                ? `Scheduled for ${format(parseISO(announcement.published_at), 'dd MMM yyyy, HH:mm')}`
                : `Published ${formatDistanceToNow(parseISO(announcement.published_at), { addSuffix: true })}`
              }
            </span>
          </div>
        )}

        {/* Expires */}
        {announcement.expires_at && (
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>Expires {format(parseISO(announcement.expires_at), 'dd MMM yyyy')}</span>
          </div>
        )}
      </div>
    </div>
  );
}
