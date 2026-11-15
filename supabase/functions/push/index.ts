import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function isWithinQuietHours(start: string | null, end: string | null, timezone: string) {
  if (!start || !end) return false;
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(new Date());
    const now = Number(parts.find((part) => part.type === "hour")?.value || 0) * 60
      + Number(parts.find((part) => part.type === "minute")?.value || 0);
    const toMinutes = (value: string) => {
      const [hours, minutes] = value.split(":").map(Number);
      return hours * 60 + minutes;
    };
    const from = toMinutes(start);
    const until = toMinutes(end);
    return from === until ? false : from < until ? now >= from && now < until : now >= from || now < until;
  } catch {
    return false;
  }
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json(405, { error: "Method not allowed" });

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const vapidPublic = Deno.env.get("VAPID_PUBLIC_KEY") || "";
  const vapidPrivate = Deno.env.get("VAPID_PRIVATE_KEY") || "";
  const vapidSubject = Deno.env.get("VAPID_SUBJECT") || "";
  if (!supabaseUrl || !serviceKey) return json(503, { error: "Supabase service configuration is missing" });

  const authorization = request.headers.get("Authorization") || "";
  if (authorization !== `Bearer ${serviceKey}`) return json(401, { error: "Unauthorized webhook" });

  if (!vapidPublic || !vapidPrivate || !vapidSubject) {
    return json(503, { error: "Push delivery is not configured. Set VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY and VAPID_SUBJECT." });
  }

  let payload: any;
  try {
    payload = await request.json();
  } catch {
    return json(400, { error: "Invalid JSON payload" });
  }

  const record = payload?.record || payload?.notification || payload;
  const notificationId = record?.id;
  if (!notificationId) return json(400, { error: "Missing notification record id" });

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: notification, error: notificationError } = await supabase
    .from("notifications")
    .select("id,recipient_id,category,title_en,title_ar,body_en,body_ar,action_tab,push_status,push_attempts")
    .eq("id", notificationId)
    .maybeSingle();
  if (notificationError || !notification) return json(404, { error: notificationError?.message || "Notification not found" });
  if (notification.push_status === "sent" || notification.push_status === "skipped") {
    return json(200, { ok: true, duplicate: true });
  }

  const [{ data: preferences }, { data: subscriptions }] = await Promise.all([
    supabase.from("notification_preferences")
      .select("push_enabled,category_settings,quiet_hours_start,quiet_hours_end,timezone,language")
      .eq("user_id", notification.recipient_id).maybeSingle(),
    supabase.from("push_subscriptions")
      .select("id,endpoint,p256dh,auth_secret,failure_count")
      .eq("user_id", notification.recipient_id),
  ]);

  if (!preferences?.push_enabled || preferences.category_settings?.[notification.category] === false) {
    await supabase.from("notifications").update({ push_status: "skipped" }).eq("id", notification.id);
    return json(200, { ok: true, skipped: "disabled_by_user" });
  }
  if (isWithinQuietHours(preferences.quiet_hours_start, preferences.quiet_hours_end, preferences.timezone || "Africa/Cairo")) {
    await supabase.from("notifications").update({ push_status: "skipped" }).eq("id", notification.id);
    return json(200, { ok: true, skipped: "quiet_hours" });
  }
  if (!subscriptions?.length) {
    await supabase.from("notifications").update({ push_status: "skipped" }).eq("id", notification.id);
    return json(200, { ok: true, skipped: "no_subscription" });
  }

  webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);
  const message = JSON.stringify({
    title: preferences.language === 'ar' ? notification.title_ar : notification.title_en,
    body: preferences.language === 'ar' ? notification.body_ar : notification.body_en,
    notificationId: notification.id,
    tag: notification.id,
    actionTab: notification.action_tab || undefined,
    url: notification.action_tab ? `/?tab=${encodeURIComponent(notification.action_tab)}` : "/",
    lang: preferences.language === 'ar' ? "ar" : "en",
    dir: preferences.language === 'ar' ? "rtl" : "ltr",
  });

  const outcomes = await Promise.allSettled(subscriptions.map(async (subscription) => {
    try {
      await webpush.sendNotification({
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth_secret },
      }, message, { TTL: 60 * 60 });
      await supabase.from("push_subscriptions")
        .update({ last_success_at: new Date().toISOString(), failure_count: 0, updated_at: new Date().toISOString() })
        .eq("id", subscription.id);
      return "sent";
    } catch (error: any) {
      const statusCode = Number(error?.statusCode || error?.status || 0);
      if (statusCode === 404 || statusCode === 410) {
        await supabase.from("push_subscriptions").delete().eq("id", subscription.id);
      } else {
        await supabase.from("push_subscriptions")
          .update({ failure_count: Number(subscription.failure_count || 0) + 1, updated_at: new Date().toISOString() })
          .eq("id", subscription.id);
      }
      throw new Error(`Push endpoint failed (${statusCode || "network"}): ${String(error?.message || error).slice(0, 180)}`);
    }
  }));

  const successes = outcomes.filter((outcome) => outcome.status === "fulfilled").length;
  const failures = outcomes.filter((outcome) => outcome.status === "rejected");
  const attempts = Number(notification.push_attempts || 0) + 1;
  await supabase.from("notifications").update({
    push_status: successes > 0 ? "sent" : "failed",
    push_attempts: attempts,
    push_last_error: failures.length ? failures.slice(0, 3).map((failure: any) => failure.reason?.message || "Push failed").join("; ").slice(0, 600) : null,
    push_sent_at: successes > 0 ? new Date().toISOString() : null,
  }).eq("id", notification.id);

  return json(successes > 0 ? 200 : 502, { ok: successes > 0, sent: successes, failed: failures.length });
});
