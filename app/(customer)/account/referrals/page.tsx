import { ReferralDashboard } from "./referral-dashboard";
import { ReferralService } from "@/services/referral.service";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function ReferralsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { referralCode, stats, history } = await ReferralService.getReferralStats(user.id);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://anchorfashion.com";

  return (
    <ReferralDashboard 
      referralCode={referralCode}
      stats={stats}
      history={history}
      appUrl={appUrl}
    />
  );
}
import { ReferralDashboard } from "./referral-dashboard";
import { ReferralService } from "@/services/referral.service";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function ReferralsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { referralCode, stats, history } = await ReferralService.getReferralStats(user.id);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://anchorfashion.com";

  return (
    <ReferralDashboard 
      referralCode={referralCode}
      stats={stats}
      history={history}
      appUrl={appUrl}
    />
  );
}
