import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { ClientAdminSidebar } from "@/features/admin/components/ClientAdminSidebar";
import { AdminHeader } from "@/features/admin/components/AdminHeader";
import { MobileAppBanner } from "@/features/admin/components/MobileAppBanner";
import { auth } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
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
  // Server-side auth guard with Neon Auth
  const session = await auth.getSession({
    headers: await headers(),
  });
  const user = session?.user;

  if (!user) {
    redirect("/auth/login?next=/admin");
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
        include: {
          role: true,
        },
      });

      if (profile?.role?.name) {
        role = profile.role.name.toUpperCase();
      }
    } catch (err) {
      console.error("[Admin Layout] Error fetching role from database:", err);
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

  if (!isStaff) {
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
