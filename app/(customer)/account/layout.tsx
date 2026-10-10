import { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

import { LogoutButton } from "@/components/auth/logout-button";

import { AccountNav } from "@/components/customer/account-nav";

export const dynamic = "force-dynamic";

export default async function AccountLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
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

  const { ADMIN_ROLES } = await import("@/lib/constants/auth");
  if (ADMIN_ROLES.includes(role)) {
    redirect("/admin");
  }

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <div className="flex flex-col gap-8 md:flex-row">
        <aside className="w-full shrink-0 md:w-64">
          <AccountNav />
          <div className="my-4 border-t border-slate-200 dark:border-slate-800"></div>
          <LogoutButton />
        </aside>

        <main className="flex-1 overflow-hidden rounded-xl border bg-card p-6 shadow-sm">
          {children}
        </main>
      </div>
    </div>
  );
}
