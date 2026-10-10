"use client";

import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export function AiAnalyticsDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const res = await fetch("/api/ai/analytics");
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading Analytics...</div>;
  if (!data) return <div>Failed to load analytics.</div>;

  return (
    <div className="space-y-6">
      {/* Aggregates */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Total AI Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.aggregates?.totalRequests || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Estimated Cost
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${(data.aggregates?.totalCost || 0).toFixed(4)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Avg Latency (ms)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(data.aggregates?.avgLatency || 0).toFixed(0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Errors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">
              {data.aggregates?.errors || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent AI Telemetry Logs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-gray-50 text-xs uppercase">
                <tr>
                  <th className="px-4 py-2">Prompt</th>
                  <th className="px-4 py-2">Model</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Tokens (In/Out)</th>
                  <th className="px-4 py-2">Latency</th>
                  <th className="px-4 py-2">Cost</th>
                </tr>
              </thead>
              <tbody>
                {data.recentLogs?.map((log: any) => (
                  <tr key={log.id} className="border-b">
                    <td className="px-4 py-2 font-medium">{log.prompt_name}</td>
                    <td className="px-4 py-2">{log.model}</td>
                    <td className="px-4 py-2">
                      <span
                        className={`rounded px-2 py-1 text-xs ${log.status === "success" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
                      >
                        {log.status}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      {log.input_tokens} / {log.output_tokens}
                    </td>
                    <td className="px-4 py-2">{log.latency_ms}ms</td>
                    <td className="px-4 py-2">
                      ${Number(log.cost_estimated_usd).toFixed(5)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
