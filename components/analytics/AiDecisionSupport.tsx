"use client";

import { useEffect, useState } from "react";
import { getAiInsightsAction } from "@/app/actions/analytics/dashboard.actions";

export function AiDecisionSupport() {
  const [insights, setInsights] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getAiInsightsAction()
      .then((res) => {
        if (res.success) {
          setInsights(res.data);
        } else {
          setError(res.error || "Failed to load insights");
        }
      })
      .catch((err) => {
        console.error(err);
        setError("Failed to fetch insights");
      });
  }, []);

  if (error) {
    return (
      <div className="flex h-[400px] flex-col items-center justify-center gap-4 rounded-xl border border-red-100 bg-red-50 p-6 shadow-sm">
        <p className="text-red-600 font-medium">⚠️ {error}</p>
        <button onClick={() => window.location.reload()} className="text-sm text-red-500 underline">Retry</button>
      </div>
    );
  }

  if (!insights) {
    return (
      <div className="flex h-[400px] animate-pulse flex-col items-center justify-center gap-4 rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 p-6 shadow-sm">
        <div className="h-10 w-10 rounded-full bg-blue-200"></div>
        <div className="h-4 w-1/2 rounded bg-blue-200"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-lg text-white shadow-md">
          ✨
        </div>
        <div>
          <h2 className="text-xl font-bold text-blue-900">Gemini Insights</h2>
          <p className="text-xs font-medium text-blue-700">
            Executive Briefing
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-blue-100 bg-white/70 p-5 shadow-sm backdrop-blur-md">
        <p className="text-sm font-medium leading-relaxed text-blue-950">
          {insights.summary}
        </p>
      </div>

      <div>
        <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-red-700">
          <span className="h-2 w-2 rounded-full bg-red-500"></span> Identifed
          Risks
        </h3>
        <ul className="space-y-3">
          {insights.risks.map((risk: string, i: number) => (
            <li
              key={i}
              className="flex items-start gap-3 rounded-md border border-red-100 bg-red-50/50 p-3 text-sm text-red-900"
            >
              <span className="mt-0.5 text-red-500">⚠️</span>
              <span>{risk}</span>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-emerald-700">
          <span className="h-2 w-2 rounded-full bg-emerald-500"></span>{" "}
          Recommended Actions
        </h3>
        <div className="space-y-3">
          {insights.recommendations.map((rec: any, i: number) => (
            <div
              key={i}
              className="rounded-lg border border-emerald-100 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
            >
              <span className="mb-2 inline-block rounded bg-emerald-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                {rec.type}
              </span>
              <p className="text-sm font-medium text-gray-700">{rec.action}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
