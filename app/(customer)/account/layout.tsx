import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getServerSession, resolveUserRole } from "@/lib/auth/server";
import { ADMIN_ROLES, STAFF_ROLES } from "@/lib/constants/auth";

import { LogoutButton } from "@/components/auth/logout-button";
import { AccountNav } from "@/components/customer/account-nav";

export const dynamic = "force-dynamic";

export default async function AccountLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { user } = await getServerSession();

  if (!user) {
    redirect("/auth/login?next=/account");
  }

  const role = (await resolveUserRole(user)).toUpperCase().trim();

  const isAdmin = ADMIN_ROLES.includes(role);
  const isStaff = STAFF_ROLES.includes(role);

  if (isStaff) {
    redirect(isAdmin ? "/admin" : "/manager");
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
