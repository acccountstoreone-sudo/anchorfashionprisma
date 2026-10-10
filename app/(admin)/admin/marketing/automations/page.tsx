"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Zap,
  Mail,
  ShoppingCart,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Clock,
  Plus,
  Play,
  Pause,
} from "lucide-react";
import { toast } from "sonner";

interface AutomationFlow {
  id: string;
  name: string;
  description: string;
  trigger: string;
  channel: "email" | "push" | "multi";
  steps: number;
  openRate: string;
  conversionRate: string;
  isActive: boolean;
}

const initialAutomations: AutomationFlow[] = [
  {
    id: "auto-1",
    name: "Welcome Onboarding Sequence",
    description: "Multi-touch introductory emails sent to new subscribers over 7 days showcasing brand heritage and exclusive first-order gift.",
    trigger: "New account creation or newsletter signup",
    channel: "email",
    steps: 3,
    openRate: "64.2%",
    conversionRate: "18.5%",
    isActive: true,
  },
  {
    id: "auto-2",
    name: "Abandoned Checkout Recovery",
    description: "Automated recovery trigger dispatched 2 hours and 24 hours after an order checkout session is abandoned.",
    trigger: "Cart abandoned > 2 hours",
    channel: "multi",
    steps: 2,
    openRate: "52.8%",
    conversionRate: "24.1%",
    isActive: true,
  },
  {
    id: "auto-3",
    name: "VIP Tier Upgrade & Anniversary",
    description: "Celebratory perk delivery and private catalog showroom access when customer crosses lifetime spend milestone.",
    trigger: "Customer loyalty tier upgrade",
    channel: "email",
    steps: 1,
    openRate: "78.0%",
    conversionRate: "35.2%",
    isActive: true,
  },
  {
    id: "auto-4",
    name: "Win-Back Inactive Patrons",
    description: "Re-engagement drip with a personalized seasonal incentive for customers with no orders in 90 days.",
    trigger: "No purchase in past 90 days",
    channel: "email",
    steps: 2,
    openRate: "38.5%",
    conversionRate: "9.4%",
    isActive: false,
  },
];

export default function MarketingAutomationsPage() {
  const [automations, setAutomations] = useState<AutomationFlow[]>(initialAutomations);

  const handleToggle = (id: string) => {
    setAutomations((prev) =>
      prev.map((a) => {
        if (a.id === id) {
          const next = !a.isActive;
          toast.success(
            `Automation "${a.name}" ${next ? "activated" : "paused"}`
          );
          return { ...a, isActive: next };
        }
        return a;
      })
    );
  };

  return (
    <div className="space-y-8 p-8 pt-6">
      {/* Header */}
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Marketing Automations
          </h1>
          <p className="mt-1 text-muted-foreground">
            Lifecycle triggers, drip sequences, and automatic audience engagement flows.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/admin/marketing/campaigns">Broadcast Campaigns</Link>
          </Button>
          <Button onClick={() => toast.info("New automated sequence builder will launch in the next workflow update.")}>
            <Plus className="mr-2 h-4 w-4" />
            Create Workflow
          </Button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Active Sequences</CardTitle>
            <Zap className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {automations.filter((a) => a.isActive).length} / {automations.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Currently running automated customer journeys
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Average Open Rate</CardTitle>
            <Mail className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">58.4%</div>
            <p className="text-xs text-emerald-600 mt-1 flex items-center">
              <TrendingUp className="mr-1 h-3.5 w-3.5" />
              +14.2% higher than standard broadcasts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Recovered Revenue</CardTitle>
            <ShoppingCart className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$34,850.00</div>
            <p className="text-xs text-muted-foreground mt-1">
              Attributed from cart and re-engagement triggers
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Automation Cards Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {automations.map((flow) => (
          <Card key={flow.id} className="relative overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg font-bold">{flow.name}</CardTitle>
                    <Badge variant={flow.isActive ? "default" : "secondary"}>
                      {flow.isActive ? "RUNNING" : "PAUSED"}
                    </Badge>
                  </div>
                  <CardDescription className="text-xs leading-relaxed">
                    {flow.description}
                  </CardDescription>
                </div>
                <Switch
                  checked={flow.isActive}
                  onCheckedChange={() => handleToggle(flow.id)}
                />
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="rounded-md border bg-muted/40 p-3 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground font-medium">Trigger:</span>
                  <span className="font-semibold text-foreground">{flow.trigger}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground font-medium">Journey Steps:</span>
                  <span>{flow.steps} touchpoint(s)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground font-medium">Conversion Rate:</span>
                  <span className="font-bold text-emerald-600">{flow.conversionRate}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 text-xs">
                <span className="text-muted-foreground">
                  Channel: <strong className="capitalize">{flow.channel}</strong>
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1 text-xs font-semibold text-primary"
                  onClick={() => toast.info(`Viewing step sequence for "${flow.name}"`)}
                >
                  Configure Steps <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
