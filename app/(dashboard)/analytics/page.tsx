import { RealTimeCommandCenter } from "@/components/analytics/RealTimeCommandCenter";
import { AiDecisionSupport } from "@/components/analytics/AiDecisionSupport";
import { CustomReportBuilder } from "@/components/analytics/CustomReportBuilder";

export default function AnalyticsDashboardPage() {
  return (
    <div className="min-h-screen space-y-8 bg-gray-50 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">
          Enterprise Analytics Hub
        </h1>
        <div className="space-x-4">
          <button className="rounded-md border bg-white px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-gray-50">
            Export Report
          </button>
          <button className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700">
            Schedule Alert
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-3">
        {/* Main Pulse Dashboard */}
        <div className="space-y-8 xl:col-span-2">
          <RealTimeCommandCenter />
          <CustomReportBuilder />
        </div>

        {/* Executive AI Sidebar */}
        <div className="xl:col-span-1">
          <AiDecisionSupport />
        </div>
      </div>
    </div>
  );
}
