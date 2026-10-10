import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ManagerPOS } from "@/components/pos/manager-pos";

export const metadata: Metadata = {
  title: "Create Order | Manager Dashboard",
};

export default async function NewOrderPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login?next=/manager/orders/new");
  }

  // Determine branch_id
  let branchId = "";
  const role = user.user_metadata?.role || user.app_metadata?.role;

  if (role !== "admin" && role !== "SUPERADMIN") {
    try {
      const { data: employee } = await supabase
        .from("employee_profiles")
        .select("branch_id")
        .eq("id", user.id)
        .maybeSingle();
      
      if (employee && employee.branch_id) {
        branchId = employee.branch_id;
      }
    } catch {}
  }

  if (!branchId) {
    // Fallback to primary / first branch
    const { data: defaultBranch } = await supabase.from("branches").select("id").limit(1).maybeSingle();
    if (defaultBranch) {
      branchId = defaultBranch.id;
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Manager POS</h1>
      </div>
      <ManagerPOS branchId={branchId} />
    </div>
  );
}
