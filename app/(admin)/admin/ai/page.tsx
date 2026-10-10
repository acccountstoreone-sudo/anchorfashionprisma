import { Metadata } from "next";
import {
  Bot,
  Cpu,
  MessageSquareCode,
  History,
  Settings2,
  ShieldAlert,
  Coins,
} from "lucide-react";
import { DataCard } from "@/features/admin/components/DataCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "AI Control Center | Anchor Fashion",
  description: "Manage Gemini Configuration and Prompts",
};

export default function AIControlCenterPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
            <Bot className="h-8 w-8 text-primary" />
            AI Control Center
          </h1>
          <p className="text-muted-foreground">
            Manage Google Gemini configurations, prompts, and token usage.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="border-primary/20 bg-primary/10 text-primary"
          >
            Gemini 3.1 Pro (Active)
          </Badge>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <DataCard
          title="Total Token Usage"
          value="4.2M"
          description="This billing cycle"
          icon={<Cpu className="h-4 w-4 text-slate-500" />}
        />
        <DataCard
          title="Estimated Cost"
          value="$12.45"
          description="Current cycle API costs"
          icon={<Coins className="h-4 w-4 text-slate-500" />}
        />
        <DataCard
          title="Active Prompts"
          value="24"
          description="In production"
          icon={<MessageSquareCode className="h-4 w-4 text-slate-500" />}
        />
        <DataCard
          title="API Fallbacks"
          value="0"
          description="No fallbacks triggered today"
          icon={<ShieldAlert className="h-4 w-4 text-slate-500" />}
          className="border-emerald-500/20"
        />
      </div>

      <Tabs defaultValue="configuration" className="space-y-6">
        <TabsList className="border bg-background">
          <TabsTrigger value="configuration">Configuration</TabsTrigger>
          <TabsTrigger value="prompts">Prompt Library</TabsTrigger>
          <TabsTrigger value="usage">Usage Analytics</TabsTrigger>
          <TabsTrigger value="logs">AI Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="configuration" className="space-y-6 outline-none">
          <Card>
            <CardHeader>
              <CardTitle>Model Settings</CardTitle>
              <CardDescription>
                Configure primary and fallback AI models for the platform.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Primary Model</label>
                  <Input defaultValue="gemini-3.1-pro" disabled />
                  <p className="text-xs text-muted-foreground">
                    Used for complex analysis and content generation.
                  </p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Fast Model (Chat/Support)
                  </label>
                  <Input defaultValue="gemini-1.5-flash" disabled />
                  <p className="text-xs text-muted-foreground">
                    Used for low-latency tasks like customer support bots.
                  </p>
                </div>
              </div>
              <div className="flex justify-end pt-4">
                <Button>Save Configuration</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Security & Filtering</CardTitle>
              <CardDescription>
                Configure safety settings for generated content.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Settings forms would go here */}
              <div className="rounded-md border bg-muted/20 p-4">
                <div className="flex items-center gap-4">
                  <Settings2 className="h-8 w-8 text-muted-foreground" />
                  <div>
                    <h4 className="font-semibold">Harm Category Thresholds</h4>
                    <p className="text-sm text-muted-foreground">
                      Currently set to BLOCK_MEDIUM_AND_ABOVE across all
                      categories.
                    </p>
                  </div>
                  <Button variant="outline" className="ml-auto">
                    Configure
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="prompts" className="outline-none">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Prompt Library</CardTitle>
                <CardDescription>
                  Manage and version system prompts used across the platform.
                </CardDescription>
              </div>
              <Button>
                <a href="/admin/ai/prompts">
                  <MessageSquareCode className="mr-2 h-4 w-4" />
                  Manage Prompts
                </a>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border p-8 text-center text-muted-foreground">
                <p>
                  Prompt management has been moved to a dedicated dashboard.
                </p>
                <Button variant="link" className="mt-2">
                  <a href="/admin/ai/prompts">Go to Prompts Dashboard</a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
