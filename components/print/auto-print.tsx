"use client";

import { useEffect } from "react";
import { Printer } from "lucide-react";

export function AutoPrint() {
  useEffect(() => {
    // Delay slightly to ensure page assets, fonts, and QR code have rendered
    const timer = setTimeout(() => {
      window.print();
    }, 400);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="mb-4 flex items-center justify-between border-b border-zinc-200 pb-2 print:hidden font-sans">
      <button
        type="button"
        onClick={() => window.print()}
        className="flex items-center gap-1.5 rounded-md bg-black px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-zinc-800 transition active:scale-95 cursor-pointer"
      >
        <Printer className="h-3.5 w-3.5" />
        Print Document
      </button>
      <button
        type="button"
        onClick={() => window.close()}
        className="text-xs text-zinc-500 hover:text-black underline cursor-pointer"
      >
        Close
      </button>
    </div>
  );
}
