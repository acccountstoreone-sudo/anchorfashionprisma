import { Metadata } from "next";
import { CustomerService } from "@/lib/services/customer.service";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Notifications | Anchor Fashion",
  description: "View your notifications.",
};

export default async function NotificationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const customerService = new CustomerService();
  const notifications = await customerService.getNotifications(user.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
        <p className="text-muted-foreground">
          Stay updated with your orders and promotions.
        </p>
      </div>
      <NotificationCenter notifications={notifications} />
    </div>
  );
}
