"use client";

import { useEffect, useState } from "react";
import { TierBadge } from "@/components/customer/loyalty/tier-badges";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Gift, CheckCircle2, Crown } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { RedeemRewardsDialog } from "@/features/customer/RedeemRewardsDialog";
import { fetchLoyaltyAction } from "@/app/actions/customer.actions";

export default function LoyaltyPage() {
  const [points, setPoints] = useState<number>(0);
  const [tier, setTier] = useState<string>("MEMBER");
  const [lifetimePoints, setLifetimePoints] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadLoyalty() {
      try {
        const res = await fetchLoyaltyAction();
        if (res.success && res.data) {
          setPoints(res.data.points_balance || 0);
          setTier(res.data.tier || "MEMBER");
          setLifetimePoints(res.data.lifetime_points || 0);
        }
      } catch (err) {
        console.error("Failed to load loyalty:", err);
      } finally {
        setLoading(false);
      }
    }
    loadLoyalty();
  }, []);

  const getNextTierInfo = () => {
    if (tier === "MEMBER") return { next: "BRONZE", threshold: 1000 };
    if (tier === "BRONZE") return { next: "SILVER", threshold: 5000 };
    if (tier === "SILVER") return { next: "GOLD", threshold: 15000 };
    if (tier === "GOLD") return { next: "PLATINUM", threshold: 50000 };
    return null;
  };

  const nextTier = getNextTierInfo();
  const progressPercent = nextTier ? Math.min((lifetimePoints / nextTier.threshold) * 100, 100) : 100;

  if (loading) {
    return <div className="p-8 text-center text-gray-500 animate-pulse">Loading loyalty data...</div>;
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-light tracking-tight text-[#1A1A1A]">Loyalty & Rewards</h1>
        <p className="mt-2 text-sm text-gray-500">
          Manage your points, track your tier status, and unlock exclusive luxury benefits.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
        {/* Points Card */}
        <Card className="lg:col-span-2 border-none bg-gradient-to-br from-[#1A1A1A] to-[#2D2D2D] text-white shadow-xl">
          <CardContent className="p-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div className="space-y-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-400 uppercase tracking-widest">Current Balance</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-light tracking-tighter">{points.toLocaleString()}</span>
                    <span className="text-sm font-medium text-[#C9A86A]">PTS</span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <TierBadge tier={tier} />
                  <span className="text-xs text-gray-400">Lifetime Points: {lifetimePoints.toLocaleString()}</span>
                </div>
              </div>

              {nextTier ? (
                <div className="w-full md:w-1/2 space-y-3 bg-white/5 p-4 rounded-lg border border-white/10">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-300">Progress to {nextTier.next}</span>
                    <span className="font-medium text-[#C9A86A]">
                      {Math.max(nextTier.threshold - lifetimePoints, 0).toLocaleString()} pts needed
                    </span>
                  </div>
                  <Progress value={progressPercent} className="h-1.5 bg-white/10" indicatorClassName="bg-[#C9A86A]" />
                </div>
              ) : (
                <div className="w-full md:w-1/2 flex items-center justify-center p-4 bg-white/5 rounded-lg border border-white/10">
                  <p className="text-sm text-[#C9A86A] font-medium flex items-center gap-2">
                    <Crown className="h-4 w-4" /> Maximum Tier Reached
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="border-gray-100 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-medium uppercase tracking-widest text-[#1A1A1A]">Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <RedeemRewardsDialog userPoints={points} />
            <Button asChild variant="outline" className="w-full font-semibold uppercase tracking-widest h-12 border-gray-200 text-[#1A1A1A] hover:text-[#1A1A1A]">
              <Link href="/account/rewards">
                View Rewards Catalog
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <h3 className="text-lg font-medium text-[#1A1A1A]">Your Tier Benefits</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <BenefitCard 
            title="Bronze" 
            description="Access to member-only sales" 
            active={tier === "BRONZE" || tier === "SILVER" || tier === "GOLD" || tier === "PLATINUM"} 
          />
          <BenefitCard 
            title="Silver" 
            description="Birthday gift and standard free shipping" 
            active={tier === "SILVER" || tier === "GOLD" || tier === "PLATINUM"} 
          />
          <BenefitCard 
            title="Gold" 
            description="Free express shipping and early access" 
            active={tier === "GOLD" || tier === "PLATINUM"} 
          />
          <BenefitCard 
            title="Platinum" 
            description="VIP events, priority support, and stylist" 
            active={tier === "PLATINUM"} 
          />
        </div>
      </div>
    </div>
  );
}

function BenefitCard({ title, description, active }: { title: string, description: string, active: boolean }) {
  return (
    <Card className={cn("transition-colors h-full", active ? "border-[#C9A86A]/30 bg-[#C9A86A]/5" : "border-gray-100 opacity-60")}>
      <CardContent className="p-4 flex gap-3 h-full">
        <div className={cn("mt-0.5", active ? "text-[#C9A86A]" : "text-gray-300")}>
          <CheckCircle2 className="h-4 w-4" />
        </div>
        <div>
          <h4 className={cn("text-sm font-medium", active ? "text-[#1A1A1A]" : "text-gray-400")}>{title}</h4>
          <p className="text-xs text-gray-500 mt-1 leading-relaxed">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
}
