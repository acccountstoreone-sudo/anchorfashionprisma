"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";

interface InvoiceToolbarProps {
  backUrl: string;
  backLabel?: string;
  autoPrint?: boolean;
}

export function InvoiceToolbar({
  backUrl,
  backLabel = "Back to Order Details",
  autoPrint = true,
}: InvoiceToolbarProps) {
  useEffect(() => {
    if (autoPrint) {
      const timer = setTimeout(() => {
        window.print();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [autoPrint]);

  return (
    <div className="max-w-4xl mx-auto mb-4 px-4 sm:px-0 flex flex-wrap items-center justify-between gap-3 print:hidden font-sans">
      <Link
        href={backUrl}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-950 bg-white px-3 py-2 rounded-lg border border-slate-200 shadow-xs transition hover:bg-slate-50"
      >
        <ArrowLeft className="h-4 w-4" />
        {backLabel}
      </Link>
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-slate-500 hidden sm:inline">
          Print Tip: Select A4 Portrait & enable Background Graphics
        </span>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 bg-[#122B59] hover:bg-[#0c1e3f] text-white px-4 py-2 rounded-lg text-xs font-bold shadow transition active:scale-95 cursor-pointer"
        >
          <Printer className="h-4 w-4" />
          Print / Save as PDF
        </button>
      </div>
    </div>
  );
}
