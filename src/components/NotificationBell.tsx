import { useEffect, useState } from 'react';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { 
  Bell, CalendarDays, Clock, Megaphone, FileWarning, 
  CheckCircle2, Info, Loader2 
} from 'lucide-react';
import { format, parseISO, formatDistanceToNow } from 'date-fns';

const typeIcons: Record<string, typeof Bell> = {
  leave_approval: CalendarDays,
  leave_rejection: CalendarDays,
  attendance_reminder: Clock,
  announcement: Megaphone,
  document_expiry: FileWarning,
  general: Info,
};

const typeColors: Record<string, string> = {
  leave_approval: 'text-green-500',
  leave_rejection: 'text-destructive',
  attendance_reminder: 'text-amber-500',
  announcement: 'text-primary',
  document_expiry: 'text-orange-500',
  general: 'text-muted-foreground',
};

export function NotificationBell() {
  const { 
    notifications, 
    unreadCount, 
    fetchNotifications, 
    markAsRead, 
    markAllAsRead 
  } = usePushNotifications();
  
  const [isOpen, setIsOpen] = useState(false);
  const [isMarkingAll, setIsMarkingAll] = useState(false);

  useEffect(() => {
    fetchNotifications();
    
    // Refresh notifications every minute
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const handleMarkAllAsRead = async () => {
    setIsMarkingAll(true);
    await markAllAsRead();
    setIsMarkingAll(false);
  };

  const handleNotificationClick = async (notificationId: string, read: boolean) => {
    if (!read) {
      await markAsRead(notificationId);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h4 className="font-semibold">Notifications</h4>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllAsRead}
              disabled={isMarkingAll}
            >
              {isMarkingAll ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-1" />
                  Mark all read
                </>
              )}
            </Button>
          )}
        </div>
        
        <ScrollArea className="h-80">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Bell className="w-10 h-10 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => {
                const Icon = typeIcons[notification.type] || Bell;
                const colorClass = typeColors[notification.type] || 'text-muted-foreground';
                
                return (
                  <div
                    key={notification.id}
                    className={`p-4 cursor-pointer hover:bg-muted/50 transition-colors ${
                      !notification.read ? 'bg-primary/5' : ''
                    }`}
                    onClick={() => handleNotificationClick(notification.id, notification.read)}
                  >
                    <div className="flex gap-3">
                      <div className={`mt-0.5 ${colorClass}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm font-medium ${!notification.read ? '' : 'text-muted-foreground'}`}>
                            {notification.title}
                          </p>
                          {!notification.read && (
                            <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {notification.body}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(parseISO(notification.sent_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
