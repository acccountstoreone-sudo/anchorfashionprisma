import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { ClientAdminSidebar } from "@/features/admin/components/ClientAdminSidebar";
import { AdminHeader } from "@/features/admin/components/AdminHeader";
import { MobileAppBanner } from "@/features/admin/components/MobileAppBanner";
import { createClient } from "@/lib/supabase/server";
import { STAFF_ROLES } from "@/lib/constants/auth";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Admin Dashboard | Anchor Fashion",
  description: "Enterprise Executive Command Center",
};

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  // Server-side auth guard — second layer of protection
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login?next=/admin");
  }

  let role = user.user_metadata?.role || user.app_metadata?.role;
  if (!role) {
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("roles(name)")
        .eq("id", user.id)
        .single();
      role = (profile?.roles as any)?.name;
    } catch {
      role = "CUSTOMER";
    }
  }
  if (!role) role = "CUSTOMER";

  if (!STAFF_ROLES.includes(role)) {
    redirect("/account/profile");
  }

  // Ensure plain JSON object across RSC boundary to prevent serialization issues
  const sanitizedUser = JSON.parse(JSON.stringify(user));

  return (
    <div className="fixed inset-0 flex h-full w-full overflow-hidden bg-slate-50 dark:bg-background text-slate-900 dark:text-foreground">
      <style>{`html, body { overflow: hidden !important; height: 100% !important; margin: 0 !important; padding: 0 !important; }`}</style>
      <ClientAdminSidebar role={role} className="hidden md:flex shrink-0 h-full border-r border-border" />
      <div className="flex min-w-0 min-h-0 flex-1 flex-col h-full overflow-hidden">
        <AdminHeader user={sanitizedUser} role={role} className="shrink-0 z-30" />
        <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-4 md:p-6 lg:p-8 bg-slate-50/50 dark:bg-background overscroll-contain">
          {children}
        </main>
      </div>
      <MobileAppBanner />
    </div>
  );
}
