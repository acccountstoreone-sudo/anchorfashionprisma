import { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getServerSession } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
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

  let role = String((user as any).role || "").toUpperCase();

  if (!role || role === "CUSTOMER") {
    try {
      const isUuid =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          user.id
        );
      const profile = await prisma.profile.findFirst({
        where: {
          OR: [
            ...(isUuid ? [{ id: user.id }] : []),
            ...(user.email ? [{ email: user.email }] : []),
          ],
        },
        include: { role: true },
      });
      if (profile?.role?.name) {
        role = profile.role.name.toUpperCase();
      }
    } catch {
      role = "CUSTOMER";
    }
  }

  if (!role) role = "CUSTOMER";

  const isStaff =
    (STAFF_ROLES as readonly string[]).includes(role) ||
    [
      "SUPERADMIN",
      "SUPER_ADMIN",
      "ADMIN",
      "STAFF",
      "MANAGER",
      "WAREHOUSE_MANAGER",
      "MARKETING_MANAGER",
      "FINANCE_MANAGER",
      "MARKETING",
      "SUPPORT",
    ].includes(role);

  if (isStaff) {
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
