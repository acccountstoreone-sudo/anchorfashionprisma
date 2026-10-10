"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Lock, Unlock, CheckCircle2, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { redeemLoyaltyPointsAction, fetchLoyaltyAction, fetchRewardCatalogAction } from "@/app/actions/customer.actions";

export default function RewardsPage() {
  const [points, setPoints] = useState<number>(0);
  const [rewards, setRewards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [loyaltyRes, catalogRes] = await Promise.all([
        fetchLoyaltyAction(),
        fetchRewardCatalogAction()
      ]);
      
      if (loyaltyRes.success) {
        setPoints(loyaltyRes.data?.points_balance || 0);
      }
      if (catalogRes.success) {
        setRewards(catalogRes.data || []);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load rewards data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRedeem = async (id: string, cost: number) => {
    if (points < cost) {
      toast.error("Not enough points to redeem this reward.");
      return;
    }
    
    try {
      const res = await redeemLoyaltyPointsAction({ rewardId: id });
      if (res.success) {
        toast.success(`Redeemed! Voucher code: ${res.data?.voucherCode}`);
        // Reload to update balance
        loadData();
      } else {
        toast.error(res.error || "Failed to redeem reward");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to redeem reward");
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500 animate-pulse">Loading rewards...</div>;
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-light tracking-tight text-[#1A1A1A]">Rewards Center</h1>
          <p className="mt-2 text-sm text-gray-500">
            Redeem your points for exclusive discounts and luxury gifts.
          </p>
        </div>
        <div className="bg-[#1A1A1A] text-white px-4 py-2 rounded-lg flex items-center gap-2">
          <span className="text-xs uppercase tracking-widest font-medium text-gray-400">Balance:</span>
          <span className="font-semibold text-lg text-[#C9A86A]">{points.toLocaleString()} pts</span>
        </div>
      </div>

      <div className="space-y-6">
        <h3 className="text-lg font-medium text-[#1A1A1A]">Available to Redeem</h3>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {rewards.map(reward => (
            <RewardCard 
              key={reward.id} 
              reward={reward} 
              canAfford={points >= reward.points_cost} 
              onRedeem={() => handleRedeem(reward.id, reward.points_cost)} 
            />
          ))}
          {rewards.length === 0 && (
            <p className="text-sm text-gray-500 italic col-span-full">No rewards currently available.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function RewardCard({ 
  reward, 
  canAfford, 
  onRedeem
}: { 
  reward: any; 
  canAfford: boolean; 
  onRedeem?: () => void;
}) {
  return (
    <Card className={cn(
      "flex flex-col transition-all duration-300 relative overflow-hidden",
      "border-gray-200 shadow-sm hover:shadow-md"
    )}>
      <CardHeader className="pb-4 border-b border-gray-100">
        <div className="flex justify-between items-start">
          <CardTitle className="text-base font-semibold leading-tight text-[#1A1A1A] pr-4">{reward.title}</CardTitle>
          <div className="p-2 rounded-full bg-gray-100 text-gray-500">
             <Gift className="h-4 w-4 text-[#1A1A1A]" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="py-4 flex-1">
        <p className="text-sm text-gray-500 leading-relaxed">{reward.description}</p>
      </CardContent>
      <CardFooter className="pt-4 border-t border-gray-100 flex items-center justify-between">
        <span className="font-semibold text-sm text-[#1A1A1A]">{reward.points_cost.toLocaleString()} pts</span>
        <Button 
          size="sm" 
          disabled={!canAfford}
          onClick={onRedeem}
          className={cn(
            "text-xs uppercase tracking-widest font-bold",
            canAfford ? "bg-[#1A1A1A] text-white hover:bg-black" : "bg-gray-200 text-gray-400"
          )}
        >
          {canAfford ? "Redeem" : "Need Points"}
        </Button>
      </CardFooter>
    </Card>
  );
}
