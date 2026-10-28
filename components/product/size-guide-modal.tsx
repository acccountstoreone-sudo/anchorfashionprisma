"use client";

import { useState, useMemo, type ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Ruler } from "lucide-react";
import { SizeChart } from "@/types/catalog.types";

interface SizeGuideModalProps {
  sizeCharts?: SizeChart[];
  selectedSize?: string;
  onSelectSize?: (size: string) => void;
  availableSizes?: string[];
  trigger?: ReactNode;
}

const DEFAULT_APPAREL_CHARTS = {
  tops: {
    name: "Tops Size Chart (Polo / T-Shirt / Shirts)",
    columns: ["Size", "Chest", "Length", "Shoulder"],
    rows: [
      { Size: "XS", Chest: 36, Length: 26, Shoulder: 15.5 },
      { Size: "S", Chest: 38, Length: 27, Shoulder: 16.5 },
      { Size: "M", Chest: 40, Length: 28, Shoulder: 17.5 },
      { Size: "L", Chest: 42, Length: 29, Shoulder: 18.5 },
      { Size: "XL", Chest: 44, Length: 30, Shoulder: 19.5 },
      { Size: "XXL", Chest: 46, Length: 31, Shoulder: 20.5 },
      { Size: "3XL", Chest: 48, Length: 32, Shoulder: 21.5 },
    ],
  },
  bottoms: {
    name: "Bottoms Size Chart (Jeans / Chinos / Pants)",
    columns: ["Size", "Waist", "Hip", "Length", "Thigh"],
    rows: [
      { Size: "28", Waist: 28, Hip: 36, Length: 39, Thigh: 21 },
      { Size: "30", Waist: 30, Hip: 38, Length: 40, Thigh: 22 },
      { Size: "32", Waist: 32, Hip: 40, Length: 41, Thigh: 23 },
      { Size: "34", Waist: 34, Hip: 42, Length: 41.5, Thigh: 24 },
      { Size: "36", Waist: 36, Hip: 44, Length: 42, Thigh: 25 },
      { Size: "38", Waist: 38, Hip: 46, Length: 42.5, Thigh: 26 },
    ],
  },
  traditional: {
    name: "Panjabi & Traditional Wear Size Chart",
    columns: ["Size", "Chest", "Length", "Shoulder", "Sleeve"],
    rows: [
      { Size: "38", Chest: 40, Length: 40, Shoulder: 17.5, Sleeve: 24.5 },
      { Size: "40", Chest: 42, Length: 42, Shoulder: 18.5, Sleeve: 25 },
      { Size: "42", Chest: 44, Length: 44, Shoulder: 19.5, Sleeve: 25.5 },
      { Size: "44", Chest: 46, Length: 46, Shoulder: 20.5, Sleeve: 26 },
      { Size: "46", Chest: 48, Length: 48, Shoulder: 21.5, Sleeve: 26.5 },
    ],
  },
};

export function SizeGuideModal({
  sizeCharts = [],
  selectedSize,
  onSelectSize,
  availableSizes = [],
  trigger,
}: SizeGuideModalProps) {
  const [unit, setUnit] = useState<"in" | "cm">("in");
  const [isOpen, setIsOpen] = useState(false);

  // Detect appropriate chart based on available sizes or passed sizeCharts
  const effectiveChart = useMemo(() => {
    if (sizeCharts && sizeCharts.length > 0 && sizeCharts[0].measurements?.columns) {
      return {
        name: sizeCharts[0].name,
        columns: sizeCharts[0].measurements.columns,
        rows: sizeCharts[0].measurements.rows,
      };
    }

    // Auto-detect based on available sizes
    const hasWaistSizes = availableSizes.some((s) => ["28", "30", "32", "34", "36", "38"].includes(s.trim()));
    if (hasWaistSizes) {
      return DEFAULT_APPAREL_CHARTS.bottoms;
    }

    const hasPanjabiSizes = availableSizes.some((s) => ["40", "42", "44", "46"].includes(s.trim()));
    if (hasPanjabiSizes) {
      return DEFAULT_APPAREL_CHARTS.traditional;
    }

    return DEFAULT_APPAREL_CHARTS.tops;
  }, [sizeCharts, availableSizes]);

  const { columns, rows, name } = effectiveChart;

  const convertValue = (val: string | number, col: string) => {
    if (col === "Size" || typeof val === "string") return val;
    if (typeof val === "number") {
      if (unit === "cm") {
        return `${(val * 2.54).toFixed(1)} cm`;
      }
      return `${val}"`;
    }
    return val;
  };

  const handleRowClick = (sizeValue: string) => {
    if (onSelectSize) {
      onSelectSize(sizeValue);
      setIsOpen(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger
        render={
          trigger ? (
            <>{trigger}</>
          ) : (
            <button
              type="button"
              className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-600 hover:text-black underline underline-offset-4 cursor-pointer transition-colors"
            >
              <Ruler className="h-3 w-3 text-[#C9A86A]" />
              <span>Size Guide</span>
            </button>
          )
        }
      />
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between pr-6">
            <DialogTitle className="text-base font-bold text-zinc-950 flex items-center gap-2">
              <Ruler className="h-4 w-4 text-[#C9A86A]" />
              <span>{name}</span>
            </DialogTitle>
          </div>
        </DialogHeader>

        {/* Unit Switcher */}
        <div className="flex items-center justify-between my-2 text-xs">
          <span className="text-zinc-500 text-[11px]">Click a size row below to auto-select</span>
          <div className="bg-zinc-100 p-0.5 rounded-md inline-flex border border-zinc-200">
            <button
              type="button"
              onClick={() => setUnit("in")}
              className={`px-2.5 py-1 text-xs font-bold rounded transition-all cursor-pointer ${
                unit === "in" ? "bg-white text-zinc-900 shadow-xs" : "text-zinc-500 hover:text-zinc-900"
              }`}
            >
              INCHES (IN)
            </button>
            <button
              type="button"
              onClick={() => setUnit("cm")}
              className={`px-2.5 py-1 text-xs font-bold rounded transition-all cursor-pointer ${
                unit === "cm" ? "bg-white text-zinc-900 shadow-xs" : "text-zinc-500 hover:text-zinc-900"
              }`}
            >
              CENTIMETERS (CM)
            </button>
          </div>
        </div>

        {/* Measurements Table */}
        <div className="overflow-x-auto rounded-lg border border-zinc-200">
          <table className="w-full text-xs text-left">
            <thead className="bg-zinc-50/80 border-b border-zinc-200">
              <tr>
                {columns.map((col) => (
                  <th key={col} className="px-3.5 py-2.5 font-bold uppercase tracking-wider text-zinc-700">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {rows.map((row, i) => {
                const r = row as Record<string, any>;
                const sizeValue = String(r["Size"] || r[columns[0]]);
                const isAvailable = availableSizes.length === 0 || availableSizes.includes(sizeValue);
                const isSelected = selectedSize === sizeValue;

                return (
                  <tr
                    key={i}
                    onClick={() => handleRowClick(sizeValue)}
                    className={`transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-[#C9A86A]/15 font-semibold text-zinc-950"
                        : isAvailable
                        ? "hover:bg-zinc-50 text-zinc-800"
                        : "opacity-45 bg-zinc-50/40 text-zinc-400"
                    }`}
                  >
                    {columns.map((col) => (
                      <td
                        key={col}
                        className={`px-3.5 py-2.5 ${
                          col === "Size" || col === columns[0]
                            ? "font-bold font-mono text-zinc-900"
                            : ""
                        }`}
                      >
                        {convertValue(r[col], col)}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-2 text-[11px] text-zinc-500 space-y-1">
          <p>• Standard tailored garment dimensions. Actual fit may vary by fabric stretch and style cut.</p>
          <p>• Click any size row to automatically apply it to your selection.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
