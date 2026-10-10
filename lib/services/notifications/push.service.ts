import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin-client";

const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
const privateVapidKey = process.env.VAPID_PRIVATE_KEY || "";

if (publicVapidKey && privateVapidKey) {
  webpush.setVapidDetails(
    "mailto:support@anchorfashion.com",
    publicVapidKey,
    privateVapidKey
  );
} else {
  console.warn("VAPID keys not configured, push notifications disabled.");
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
}

export class PushService {
  /**
   * Save a push subscription to the database.
   */
  static async saveSubscription(userId: string, subscription: any) {
    const supabase = createAdminClient();
    const { keys, endpoint } = subscription;
    
    if (!keys || !keys.p256dh || !keys.auth || !endpoint) {
      throw new Error("Invalid subscription object");
    }

    const { error } = await supabase.from("push_subscriptions").upsert(
      {
        user_id: userId,
        endpoint: endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
      },
      { onConflict: "endpoint" }
    );

    if (error) {
      console.error("Failed to save push subscription:", error);
      throw new Error("Failed to save push subscription");
    }
  }

  /**
   * Send a push notification to a specific user.
   */
  static async sendToUser(userId: string, payload: PushNotificationPayload) {
    if (!publicVapidKey || !privateVapidKey) {
      console.warn("Push notifications are disabled.");
      return;
    }

    const supabase = createAdminClient();
    const { data: subscriptions, error } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", userId);

    if (error || !subscriptions || subscriptions.length === 0) {
      return; // No subscriptions found
    }

    const stringPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: payload.icon || "/icons/icon-192x192.png",
      badge: payload.badge || "/icons/badge-72x72.png",
      data: { url: payload.url || "/" }
    });

    const sendPromises = subscriptions.map(async (sub) => {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
      };

      try {
        await webpush.sendNotification(pushSubscription, stringPayload);
      } catch (err: any) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          // Subscription expired or unsubscribed, delete it from DB
          await supabase
            .from("push_subscriptions")
            .delete()
            .eq("id", sub.id);
        } else {
          console.error("Error sending push notification:", err);
        }
      }
    });

    await Promise.allSettled(sendPromises);
  }
}
