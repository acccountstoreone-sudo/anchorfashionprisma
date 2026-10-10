import { AiAnalyticsDashboard } from "@/components/ai/AiAnalyticsDashboard";

export default function AiAnalyticsPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          AI Telemetry & Analytics
        </h1>
        <p className="text-muted-foreground">
          Monitor token usage, latency, estimated costs, and success rates
          across all AI workflows.
        </p>
      </div>

      <AiAnalyticsDashboard />
    </div>
  );
}
