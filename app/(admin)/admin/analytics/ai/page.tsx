import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Bot } from "lucide-react";

export default function AiAnalyticsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AI Insights</h1>
          <p className="text-muted-foreground">
            Monitor AI token usage and performance.
          </p>
        </div>
      </div>

      <Card className="flex h-[400px] flex-col items-center justify-center text-center">
        <Bot className="mb-4 h-12 w-12 text-muted-foreground" />
        <CardTitle className="mb-2">No AI Telemetry Data Available</CardTitle>
        <CardDescription className="max-w-md">
          We are not currently tracking AI token usage or request latency in the database. 
          Real-time metrics will appear here once telemetry integration is complete.
        </CardDescription>
      </Card>
    </div>
  );
}
