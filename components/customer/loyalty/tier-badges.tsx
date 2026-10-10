import { cn } from "@/lib/utils";
import { Award, Crown, Gem, Star } from "lucide-react";

export type LoyaltyTier = "Bronze" | "Silver" | "Gold" | "Platinum" | "VIP";

interface TierBadgeProps {
  tier: LoyaltyTier | string;
  className?: string;
  showIcon?: boolean;
}

export function TierBadge({ tier, className, showIcon = true }: TierBadgeProps) {
  const tierConfig: Record<string, any> = {
    Bronze: {
      bg: "bg-gradient-to-r from-[#CD7F32] to-[#B87333]",
      text: "text-white",
      shadow: "shadow-[#CD7F32]/20",
      icon: Star,
    },
    Silver: {
      bg: "bg-gradient-to-r from-[#C0C0C0] to-[#A9A9A9]",
      text: "text-[#1A1A1A]",
      shadow: "shadow-[#C0C0C0]/20",
      icon: Award,
    },
    Gold: {
      bg: "bg-gradient-to-r from-[#C9A86A] to-[#B08D55]",
      text: "text-white",
      shadow: "shadow-[#C9A86A]/20",
      icon: Crown,
    },
    Platinum: {
      bg: "bg-gradient-to-r from-[#E5E4E2] to-[#8C92AC]",
      text: "text-[#1A1A1A]",
      shadow: "shadow-[#8C92AC]/20",
      icon: Gem,
    },
    VIP: {
      bg: "bg-gradient-to-r from-[#1A1A1A] to-[#4A4A4A]",
      text: "text-white",
      shadow: "shadow-[#1A1A1A]/20",
      icon: Crown,
    }
  };

  const config = tierConfig[tier] || {
    bg: "bg-gray-100",
    text: "text-gray-600",
    shadow: "shadow-none",
    icon: Star,
  };
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 shadow-md",
        config.bg,
        config.text,
        config.shadow,
        className
      )}
    >
      {showIcon && <Icon className="h-3.5 w-3.5" />}
      <span className="text-[10px] font-bold uppercase tracking-widest">
        {tier}
      </span>
    </div>
  );
}
