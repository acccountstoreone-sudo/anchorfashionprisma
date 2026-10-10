import webpush from "web-push";

// Configuration for web-push
// These VAPID keys should be generated and stored in environment variables.
// You can generate them using: `npx web-push generate-vapid-keys`
const vapidPublicKey =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "dummy_public_key";
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || "dummy_private_key";

webpush.setVapidDetails(
  "mailto:support@anchorfashion.com.bd",
  vapidPublicKey,
  vapidPrivateKey
);

export interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  data?: any;
}

export class PushProvider {
  /**
   * Sends a Web Push notification to a specific subscription.
   * @param subscription The user's push subscription details.
   * @param payload The notification payload to send.
   */
  static async send(
    subscription: PushSubscription,
    payload: PushPayload
  ): Promise<{ success: boolean; error?: any }> {
    try {
      const data = JSON.stringify({
        title: payload.title,
        options: {
          body: payload.body,
          icon: payload.icon || "/icons/icon-192x192.png",
          badge: payload.badge || "/icons/badge-72x72.png",
          data: {
            url: payload.url || "/",
            ...payload.data,
          },
        },
      });

      await webpush.sendNotification(subscription, data);
      return { success: true };
    } catch (error: any) {
      console.error("PushProvider error:", error);
      // If the subscription is no longer valid (e.g. 410 Gone), we should ideally return a specific error
      // so the caller can remove the subscription from the database.
      return { success: false, error };
    }
  }
}
