import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Notification icons based on type
const getNotificationIcon = (type: string): string => {
  const icons: Record<string, string> = {
    leave_approval: "✅",
    leave_rejection: "❌",
    attendance_reminder: "⏰",
    announcement: "📢",
    document_expiry: "⚠️",
    attendance_appeal: "📋",
    general: "🔔",
  };
  return icons[type] || "🔔";
};

// Send FCM notification for native apps
async function sendFCMNotification(
  token: string,
  title: string,
  body: string,
  type: string,
  data: Record<string, any>
): Promise<boolean> {
  const FCM_SERVER_KEY = Deno.env.get("FCM_SERVER_KEY");
  
  if (!FCM_SERVER_KEY) {
    console.log("FCM_SERVER_KEY not configured, skipping FCM notification");
    return false;
  }

  try {
    const icon = getNotificationIcon(type);
    
    const message = {
      to: token,
      notification: {
        title: `${icon} ${title}`,
        body: body,
        sound: "default",
        badge: "1",
        priority: "high",
        icon: "@mipmap/ic_launcher",
        color: "#3B82F6",
      },
      data: {
        type,
        ...data,
        click_action: "FLUTTER_NOTIFICATION_CLICK",
      },
      android: {
        priority: "high",
        notification: {
          sound: "default",
          channel_id: "hrms_notifications",
          visibility: "public", // Show on lock screen
          priority: "high",
        },
      },
      apns: {
        payload: {
          aps: {
            alert: {
              title: `${icon} ${title}`,
              body: body,
            },
            sound: "default",
            badge: 1,
          },
        },
      },
    };

    const response = await fetch("https://fcm.googleapis.com/fcm/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `key=${FCM_SERVER_KEY}`,
      },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`FCM error: ${response.status}`, errorText);
      return false;
    }

    const result = await response.json();
    console.log("FCM notification sent:", result);
    return result.success === 1;
  } catch (error) {
    console.error("Error sending FCM notification:", error);
    return false;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error("VAPID keys not configured");
      return new Response(
        JSON.stringify({ error: "Push notifications not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { userId, userIds, title, body, type, data } = await req.json();

    if (!title || !body || !type) {
      return new Response(
        JSON.stringify({ error: "title, body, and type are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get target user IDs
    let targetUserIds: string[] = [];
    if (userId) {
      targetUserIds = [userId];
    } else if (userIds && Array.isArray(userIds)) {
      targetUserIds = userIds;
    } else {
      return new Response(
        JSON.stringify({ error: "userId or userIds required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check notification preferences if applicable
    const typeToPreference: Record<string, string> = {
      leave_approval: "leave_updates",
      leave_rejection: "leave_updates",
      attendance_reminder: "attendance_reminders",
      announcement: "announcements",
      document_expiry: "document_expiry",
    };

    const preferenceField = typeToPreference[type];
    
    // Get users who have this notification type enabled
    let eligibleUserIds = targetUserIds;
    if (preferenceField) {
      const { data: preferences } = await supabase
        .from("notification_preferences")
        .select("user_id")
        .in("user_id", targetUserIds)
        .eq(preferenceField, true);

      // Users without preferences default to receiving notifications
      const { data: usersWithPrefs } = await supabase
        .from("notification_preferences")
        .select("user_id")
        .in("user_id", targetUserIds);

      const usersWithPrefsSet = new Set((usersWithPrefs || []).map(p => p.user_id));
      const usersWithEnabled = new Set((preferences || []).map(p => p.user_id));

      eligibleUserIds = targetUserIds.filter(uid => 
        !usersWithPrefsSet.has(uid) || usersWithEnabled.has(uid)
      );
    }

    if (eligibleUserIds.length === 0) {
      return new Response(
        JSON.stringify({ message: "No eligible users for this notification type", sent: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get push subscriptions for eligible users
    const { data: subscriptions, error: subError } = await supabase
      .from("push_subscriptions")
      .select("*")
      .in("user_id", eligibleUserIds);

    if (subError) {
      console.error("Error fetching subscriptions:", subError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch subscriptions" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create notification records
    const notificationRecords = eligibleUserIds.map(uid => ({
      user_id: uid,
      title,
      body,
      type,
      data: data || {},
    }));

    const { error: notifError } = await supabase
      .from("notifications")
      .insert(notificationRecords);

    if (notifError) {
      console.error("Error creating notification records:", notifError);
    }

    // Send push notifications
    let successCount = 0;
    let failCount = 0;
    const failedEndpoints: string[] = [];

    for (const sub of subscriptions || []) {
      try {
        // Check if this is an FCM token (starts with specific patterns)
        const isFCMToken = sub.endpoint.length > 100 && !sub.endpoint.startsWith('http');
        
        if (isFCMToken) {
          // Native app - use FCM
          const success = await sendFCMNotification(
            sub.endpoint,
            title,
            body,
            type,
            data || {}
          );
          
          if (success) {
            successCount++;
            // Update last_used_at
            await supabase
              .from("push_subscriptions")
              .update({ last_used_at: new Date().toISOString() })
              .eq("id", sub.id);
          } else {
            failCount++;
          }
        } else {
          // Web app - use standard web push (basic implementation)
          const payload = JSON.stringify({
            title,
            body,
            icon: "/icons/icon-192x192.svg",
            badge: "/icons/icon-192x192.svg",
            data: { type, ...data },
          });

          const response = await fetch(sub.endpoint, {
            method: "POST",
            headers: {
              "Content-Type": "text/plain",
              "TTL": "86400",
            },
            body: payload,
          });

          if (response.ok || response.status === 201) {
            successCount++;
            // Update last_used_at
            await supabase
              .from("push_subscriptions")
              .update({ last_used_at: new Date().toISOString() })
              .eq("id", sub.id);
          } else if (response.status === 404 || response.status === 410) {
            // Subscription expired or invalid, remove it
            await supabase
              .from("push_subscriptions")
              .delete()
              .eq("id", sub.id);
            failedEndpoints.push(sub.endpoint);
            failCount++;
          } else {
            console.error(`Push failed for ${sub.endpoint}: ${response.status}`);
            failCount++;
          }
        }
      } catch (error) {
        console.error(`Error sending push to ${sub.endpoint}:`, error);
        failCount++;
      }
    }

    return new Response(
      JSON.stringify({
        message: "Notifications processed",
        sent: successCount,
        failed: failCount,
        totalSubscriptions: subscriptions?.length || 0,
        notificationsCreated: notificationRecords.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Send push notification error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
