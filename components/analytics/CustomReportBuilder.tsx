"use client";

import { useEffect, useState } from "react";
import { getCustomReportAction } from "@/app/actions/analytics/dashboard.actions";

export function CustomReportBuilder() {
  const [report, setReport] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getCustomReportAction()
      .then((res) => {
        if (res.success) {
          setReport(res.data);
        } else {
          setError(res.error || "Failed to load report");
        }
      })
      .catch((err) => {
        console.error(err);
        setError("Failed to fetch report");
      });
  }, []);

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">
            Custom Report Builder
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Ad-hoc analysis and saved templates
          </p>
        </div>
        <button className="rounded-md border border-blue-200 px-4 py-2 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-50">
          + New Report
        </button>
      </div>

      {/* Mock drag and drop interface area */}
      <div className="mb-6 flex flex-col gap-4 md:flex-row">
        <div className="flex flex-1 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-6 text-sm text-gray-500 transition-colors hover:border-gray-400 hover:bg-gray-100">
          <span className="mb-2 text-xl">📊</span>
          <span className="font-medium">Drop Dimensions Here</span>
          <span className="mt-1 text-xs text-gray-400">
            e.g., Date, Region, Product
          </span>
        </div>
        <div className="flex flex-1 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-6 text-sm text-gray-500 transition-colors hover:border-gray-400 hover:bg-gray-100">
          <span className="mb-2 text-xl">📈</span>
          <span className="font-medium">Drop Metrics Here</span>
          <span className="mt-1 text-xs text-gray-400">
            e.g., Sales, Orders, Conv. Rate
          </span>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-100 bg-red-50 p-4 text-sm text-red-600">
          ⚠️ {error}
        </div>
      )}

      {report && (
        <div className="mt-8 overflow-hidden rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 p-4">
            <h3 className="text-sm font-bold text-gray-800">
              {report.reportName}
            </h3>
            <div className="flex gap-2">
              <button className="rounded border bg-white px-2 py-1 text-xs text-gray-600 hover:bg-gray-50">
                Filter
              </button>
              <button className="rounded border bg-white px-2 py-1 text-xs text-gray-600 hover:bg-gray-50">
                Export
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-white">
                <tr>
                  {report.columns.map((col: string, i: number) => (
                    <th
                      key={i}
                      className="bg-gray-50/50 px-6 py-4 text-left text-xs font-bold uppercase tracking-widest text-gray-500"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {report.rows.map((row: any[], i: number) => (
                  <tr key={i} className="transition-colors hover:bg-blue-50/30">
                    {row.map((cell: any, j: number) => (
                      <td
                        key={j}
                        className={`whitespace-nowrap px-6 py-4 text-sm ${j === 0 ? "font-medium text-gray-900" : "text-gray-600"}`}
                      >
                        {typeof cell === "number" && j > 0
                          ? j === 1
                            ? `৳${cell.toLocaleString()}`
                            : cell.toLocaleString()
                          : cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
