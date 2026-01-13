import { useEffect, useState } from 'react';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
  Bell, BellOff, Smartphone, Trash2, Loader2, 
  CalendarDays, Clock, Megaphone, FileWarning, CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { format, parseISO, formatDistanceToNow } from 'date-fns';

export function NotificationSettings() {
  const {
    isSupported,
    isSubscribed,
    isLoading,
    permission,
    subscriptions,
    preferences,
    subscribe,
    unsubscribe,
    deleteSubscription,
    fetchSubscriptions,
    fetchPreferences,
    updatePreferences,
  } = usePushNotifications();

  const [showDeleteDialog, setShowDeleteDialog] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchSubscriptions();
    fetchPreferences();
  }, [fetchSubscriptions, fetchPreferences]);

  const handleToggleNotifications = async () => {
    if (isSubscribed) {
      await unsubscribe();
    } else {
      await subscribe();
    }
  };

  const handleDeleteSubscription = async () => {
    if (!showDeleteDialog) return;
    setIsDeleting(true);
    try {
      await deleteSubscription(showDeleteDialog);
      setShowDeleteDialog(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const handlePreferenceChange = async (key: keyof typeof preferences, value: boolean) => {
    await updatePreferences({ [key]: value });
  };

  if (!isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Push Notifications
          </CardTitle>
          <CardDescription>Get notified about important updates</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <div>
              <p className="font-medium text-sm">Not Supported</p>
              <p className="text-xs text-muted-foreground">
                Push notifications are not available on this device or browser.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Push Notifications
              </CardTitle>
              <CardDescription>Get notified about important updates</CardDescription>
            </div>
            <Button
              variant={isSubscribed ? 'outline' : 'default'}
              onClick={handleToggleNotifications}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isSubscribed ? (
                <>
                  <BellOff className="w-4 h-4 mr-2" />
                  Disable
                </>
              ) : (
                <>
                  <Bell className="w-4 h-4 mr-2" />
                  Enable
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Permission Status */}
          {permission === 'denied' && (
            <div className="flex items-center gap-3 p-4 bg-destructive/10 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              <div>
                <p className="font-medium text-sm">Notifications Blocked</p>
                <p className="text-xs text-muted-foreground">
                  Please enable notifications in your browser settings to receive updates.
                </p>
              </div>
            </div>
          )}

          {isSubscribed && (
            <>
              {/* Notification Preferences */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm">Notification Types</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CalendarDays className="w-4 h-4 text-muted-foreground" />
                      <Label htmlFor="leave-updates" className="cursor-pointer">
                        <span className="font-medium">Leave Updates</span>
                        <p className="text-xs text-muted-foreground">
                          Get notified when your leave requests are approved or rejected
                        </p>
                      </Label>
                    </div>
                    <Switch
                      id="leave-updates"
                      checked={preferences.leave_updates}
                      onCheckedChange={(checked) => handlePreferenceChange('leave_updates', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <Label htmlFor="attendance-reminders" className="cursor-pointer">
                        <span className="font-medium">Attendance Reminders</span>
                        <p className="text-xs text-muted-foreground">
                          Get reminded to check in or out on time
                        </p>
                      </Label>
                    </div>
                    <Switch
                      id="attendance-reminders"
                      checked={preferences.attendance_reminders}
                      onCheckedChange={(checked) => handlePreferenceChange('attendance_reminders', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Megaphone className="w-4 h-4 text-muted-foreground" />
                      <Label htmlFor="announcements" className="cursor-pointer">
                        <span className="font-medium">Announcements</span>
                        <p className="text-xs text-muted-foreground">
                          Get notified about company announcements
                        </p>
                      </Label>
                    </div>
                    <Switch
                      id="announcements"
                      checked={preferences.announcements}
                      onCheckedChange={(checked) => handlePreferenceChange('announcements', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileWarning className="w-4 h-4 text-muted-foreground" />
                      <Label htmlFor="document-expiry" className="cursor-pointer">
                        <span className="font-medium">Document Expiry</span>
                        <p className="text-xs text-muted-foreground">
                          Get reminded when your documents are about to expire
                        </p>
                      </Label>
                    </div>
                    <Switch
                      id="document-expiry"
                      checked={preferences.document_expiry}
                      onCheckedChange={(checked) => handlePreferenceChange('document_expiry', checked)}
                    />
                  </div>
                </div>
              </div>

              {/* Registered Devices */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm">Registered Devices</h4>
                {subscriptions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No devices registered</p>
                ) : (
                  <div className="space-y-2">
                    {subscriptions.map((sub) => (
                      <div
                        key={sub.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <Smartphone className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">{sub.device_name}</p>
                            <p className="text-xs text-muted-foreground">
                              Added {format(parseISO(sub.created_at), 'dd MMM yyyy')}
                              {sub.last_used_at && (
                                <> • Last used {formatDistanceToNow(parseISO(sub.last_used_at), { addSuffix: true })}</>
                              )}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setShowDeleteDialog(sub.id)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {!isSubscribed && permission !== 'denied' && (
            <div className="text-center py-6 space-y-4">
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <Bell className="w-8 h-8 text-primary" />
              </div>
              <div className="space-y-2">
                <p className="font-medium">Stay Updated</p>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                  Enable push notifications to receive updates about your leave requests, 
                  attendance reminders, and important announcements.
                </p>
              </div>
              <Button onClick={() => subscribe()}>
                <Bell className="w-4 h-4 mr-2" />
                Enable Notifications
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation */}
      <AlertDialog open={!!showDeleteDialog} onOpenChange={(open) => !open && setShowDeleteDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Device</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this device? You won't receive notifications on it anymore.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSubscription}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Removing...
                </>
              ) : (
                'Remove'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
