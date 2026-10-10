"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SizeChart } from "@/types/catalog.types";

interface SizeGuideModalProps {
  sizeCharts?: SizeChart[];
  selectedSize?: string;
  onSelectSize?: (size: string) => void;
  availableSizes?: string[];
  trigger?: React.ReactNode;
}

export function SizeGuideModal({
  sizeCharts = [],
  selectedSize,
  onSelectSize,
  availableSizes = [],
  trigger,
}: SizeGuideModalProps) {
  const [unit, setUnit] = useState<"cm" | "in">("cm");
  const [isOpen, setIsOpen] = useState(false);

  // Use the first available size chart. We'll rely on the server to sort them properly.
  const chart = sizeCharts[0];

  if (!chart || !chart.measurements || !chart.measurements.columns) {
    return null;
  }

  const { columns, rows } = chart.measurements;

  const handleUnitToggle = (newUnit: "cm" | "in") => {
    setUnit(newUnit);
  };

  const convertValue = (val: string | number) => {
    if (typeof val === "number") {
      if (unit === "in") {
        return (val / 2.54).toFixed(1);
      }
      return val;
    }
    return val;
  };

  const handleRowClick = (sizeValue: string) => {
    if (onSelectSize && availableSizes.includes(sizeValue)) {
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
            <Button variant="link" size="sm" className="px-0 underline text-muted-foreground hover:text-foreground">
              Size Guide
            </Button>
          )
        }
      />
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{chart.name}</DialogTitle>
        </DialogHeader>

        <div className="flex justify-end gap-2 my-4">
          <div className="bg-muted p-1 rounded-md inline-flex">
            <button
              type="button"
              onClick={() => handleUnitToggle("cm")}
              className={`px-3 py-1 text-xs font-medium rounded-sm transition-colors ${
                unit === "cm" ? "bg-background shadow-sm" : "text-muted-foreground"
              }`}
            >
              CM
            </button>
            <button
              type="button"
              onClick={() => handleUnitToggle("in")}
              className={`px-3 py-1 text-xs font-medium rounded-sm transition-colors ${
                unit === "in" ? "bg-background shadow-sm" : "text-muted-foreground"
              }`}
            >
              IN
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 border-b">
              <tr>
                {columns.map((col) => (
                  <th key={col} className="px-4 py-3 font-medium text-muted-foreground">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const sizeValue = String(row["Size"] || row[columns[0]]);
                const isAvailable = availableSizes.length === 0 || availableSizes.includes(sizeValue);
                const isSelected = selectedSize === sizeValue;

                return (
                  <tr
                    key={i}
                    onClick={() => handleRowClick(sizeValue)}
                    className={`border-b last:border-0 transition-colors
                      ${!isAvailable ? "opacity-50 bg-muted/20" : "hover:bg-muted/50 cursor-pointer"}
                      ${isSelected ? "bg-primary/5 border-primary/20" : ""}
                    `}
                  >
                    {columns.map((col) => (
                      <td
                        key={col}
                        className={`px-4 py-3 ${
                          col === "Size" || col === columns[0] ? "font-semibold" : ""
                        }`}
                      >
                        {convertValue(row[col])}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        <div className="mt-4 text-xs text-muted-foreground">
          * Measurements are approximate and may vary slightly. {availableSizes.length > 0 && "Click on an available size row to select it."}
        </div>
      </DialogContent>
    </Dialog>
  );
}
