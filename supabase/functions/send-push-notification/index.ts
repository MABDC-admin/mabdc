import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Web Push library for Deno
async function sendWebPush(
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  payload: string,
  vapidPublicKey: string,
  vapidPrivateKey: string
): Promise<Response> {
  const encoder = new TextEncoder();
  
  // For simplicity, we'll use fetch with the endpoint directly
  // In production, you'd want proper VAPID signing
  const response = await fetch(subscription.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Encoding": "aes128gcm",
      "TTL": "86400",
      "Authorization": `vapid t=${vapidPublicKey}`,
    },
    body: payload,
  });
  
  return response;
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
    const payload = JSON.stringify({
      title,
      body,
      icon: "/icons/icon-192x192.svg",
      badge: "/icons/icon-192x192.svg",
      data: { type, ...data },
    });

    let successCount = 0;
    let failCount = 0;
    const failedEndpoints: string[] = [];

    for (const sub of subscriptions || []) {
      try {
        const subscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        };

        // Simple push using fetch - in production use web-push library
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
