import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { ManagerSidebar } from "@/components/manager/layout/ManagerSidebar";
import { ManagerHeader } from "@/components/manager/layout/ManagerHeader";
import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { MANAGER_ROLES } from "@/lib/constants/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Manager Dashboard | Anchor Fashion",
  description: "Enterprise operations dashboard for Anchor Fashion managers.",
};

export default async function ManagerLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login?next=/manager");
  }

  const role =
    user.user_metadata?.role || user.app_metadata?.role || "CUSTOMER";
    
  // Sub-admins must have a role included in MANAGER_ROLES
  if (!MANAGER_ROLES.includes(role)) {
    redirect("/account/profile");
  }

  return (
    <div className="fixed inset-0 flex h-full w-full overflow-hidden bg-muted/20">
      <style>{`html, body { overflow: hidden !important; height: 100% !important; margin: 0 !important; padding: 0 !important; }`}</style>
      <ManagerSidebar />
      <div className="flex min-w-0 min-h-0 flex-1 flex-col h-full overflow-hidden">
        <ManagerHeader user={user} />
        <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-4 lg:p-6 overscroll-contain">
          <div className="mx-auto w-full max-w-[1600px] flex-1 flex flex-col gap-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
