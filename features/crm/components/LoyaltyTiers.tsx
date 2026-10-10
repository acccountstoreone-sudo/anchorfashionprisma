import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export type LoyaltyTier = "SILVER" | "GOLD" | "PLATINUM" | "VIP";

interface LoyaltyAccountsStat {
  tier: LoyaltyTier;
  benefits: string[];
  customerCount: number;
  minPoints: number;
  color: string;
}

interface LoyaltyTiersProps {
  tiers?: LoyaltyAccountsStat[];
}

export const LoyaltyTiers = ({ tiers = [] }: LoyaltyTiersProps) => {
  const totalCustomers = tiers.reduce(
    (acc, tier) => acc + tier.customerCount,
    0
  );

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {tiers.map((tier) => (
        <Card key={tier.tier} className="flex flex-col">
          <CardHeader className={`${tier.color} rounded-t-lg py-4`}>
            <CardTitle className="flex items-center justify-between text-lg">
              {tier.tier}
            </CardTitle>
            <CardDescription className="font-medium opacity-90">
              {tier.minPoints.toLocaleString()}+ Points
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col justify-between pt-6">
            <div>
              <p className="mb-2 text-sm font-medium">Benefits:</p>
              <ul className="mb-6 list-disc space-y-1 pl-4 text-sm text-muted-foreground">
                {tier.benefits.map((benefit, i) => (
                  <li key={i}>{benefit}</li>
                ))}
              </ul>
            </div>

            <div className="mt-auto space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Members</span>
                <span className="font-medium">
                  {tier.customerCount.toLocaleString()}
                </span>
              </div>
              <Progress
                value={
                  totalCustomers === 0
                    ? 0
                    : (tier.customerCount / totalCustomers) * 100
                }
                className="h-2"
              />
              <p className="text-right text-xs text-muted-foreground">
                {totalCustomers === 0
                  ? "0.0"
                  : ((tier.customerCount / totalCustomers) * 100).toFixed(1)}
                % of total
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
