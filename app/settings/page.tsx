import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ADMIN_ROLES, MANAGER_ROLES, MARKETING_ROLES } from "@/lib/constants/auth";

export const dynamic = "force-dynamic";

export default async function SettingsRedirectPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login?next=/settings");
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

  if (ADMIN_ROLES.includes(role)) {
    redirect("/admin/settings");
  } else if (MANAGER_ROLES.includes(role)) {
    redirect("/manager/settings");
  } else if (MARKETING_ROLES.includes(role)) {
    redirect("/admin/profile");
  } else {
    redirect("/account/security");
  }
}
