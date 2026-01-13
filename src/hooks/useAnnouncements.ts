import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Announcement {
  id: string;
  title: string;
  body: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  target_departments: string[] | null;
  target_employee_ids: string[] | null;
  send_push: boolean;
  created_by: string | null;
  published_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

interface CreateAnnouncementInput {
  title: string;
  body: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  target_departments?: string[];
  target_employee_ids?: string[];
  send_push?: boolean;
  published_at?: string;
  expires_at?: string;
}

export function useAnnouncements() {
  return useQuery({
    queryKey: ['announcements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Announcement[];
    },
  });
}

export function useCreateAnnouncement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateAnnouncementInput) => {
      const { data: session } = await supabase.auth.getSession();
      
      const { data, error } = await supabase
        .from('announcements')
        .insert({
          ...input,
          created_by: session.session?.user.id,
          published_at: input.published_at || new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      // If send_push is enabled and it's published now, send push notifications
      if (input.send_push !== false && (!input.published_at || new Date(input.published_at) <= new Date())) {
        await sendAnnouncementNotification(data as Announcement);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      toast.success('Announcement created successfully');
    },
    onError: (error) => {
      console.error('Create announcement error:', error);
      toast.error('Failed to create announcement');
    },
  });
}

export function useUpdateAnnouncement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Announcement> & { id: string }) => {
      const { data, error } = await supabase
        .from('announcements')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      toast.success('Announcement updated');
    },
    onError: (error) => {
      console.error('Update announcement error:', error);
      toast.error('Failed to update announcement');
    },
  });
}

export function useDeleteAnnouncement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('announcements')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      toast.success('Announcement deleted');
    },
    onError: (error) => {
      console.error('Delete announcement error:', error);
      toast.error('Failed to delete announcement');
    },
  });
}

export function usePublishAnnouncement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('announcements')
        .update({ published_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Send push notifications
      if (data.send_push) {
        await sendAnnouncementNotification(data as Announcement);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      toast.success('Announcement published and notifications sent');
    },
    onError: (error) => {
      console.error('Publish announcement error:', error);
      toast.error('Failed to publish announcement');
    },
  });
}

async function sendAnnouncementNotification(announcement: Announcement) {
  try {
    // Get target user IDs
    let userIds: string[] = [];

    if (announcement.target_employee_ids && announcement.target_employee_ids.length > 0) {
      // Specific employees
      const { data: employees } = await supabase
        .from('employees')
        .select('user_id')
        .in('id', announcement.target_employee_ids)
        .not('user_id', 'is', null);

      userIds = (employees || []).map(e => e.user_id!);
    } else if (announcement.target_departments && announcement.target_departments.length > 0) {
      // Specific departments
      const { data: employees } = await supabase
        .from('employees')
        .select('user_id')
        .in('department', announcement.target_departments)
        .not('user_id', 'is', null);

      userIds = (employees || []).map(e => e.user_id!);
    } else {
      // All employees
      const { data: employees } = await supabase
        .from('employees')
        .select('user_id')
        .not('user_id', 'is', null);

      userIds = (employees || []).map(e => e.user_id!);
    }

    if (userIds.length === 0) {
      console.log('No target users found for announcement');
      return;
    }

    // Send push notification
    const { data: session } = await supabase.auth.getSession();
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-push-notification`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.session?.access_token}`,
        },
        body: JSON.stringify({
          userIds,
          title: announcement.title,
          body: announcement.body,
          type: 'announcement',
          data: {
            announcementId: announcement.id,
            priority: announcement.priority,
          },
        }),
      }
    );

    if (!response.ok) {
      console.error('Failed to send push notifications:', await response.text());
    } else {
      const result = await response.json();
      console.log('Push notification result:', result);
    }
  } catch (error) {
    console.error('Error sending announcement notification:', error);
  }
}
