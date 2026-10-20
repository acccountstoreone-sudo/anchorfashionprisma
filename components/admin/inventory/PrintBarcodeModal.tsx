"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ClientBarcode } from "@/components/ui/ClientBarcode";
import { Printer, X, Download } from "lucide-react";

export interface BarcodeLabelData {
  productName: string;
  sku: string;
  barcode: string;
  color?: string;
  size?: string;
  price: number;
}

interface PrintBarcodeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  labels: BarcodeLabelData[];
}

export function PrintBarcodeModal({ open, onOpenChange, labels = [] }: PrintBarcodeModalProps) {
  const [copiesPerLabel, setCopiesPerLabel] = useState<number>(1);

  const handlePrint = () => {
    window.print();
  };

  const totalStickers = labels.length * copiesPerLabel;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <Printer className="h-5 w-5 text-primary" />
                Barcode Label Generator & Print
              </DialogTitle>
              <DialogDescription>
                Print barcode stickers for thermal sticker printer or A4 label sheets.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Controls */}
        <div className="flex items-center gap-4 p-4 bg-muted/40 rounded-lg border">
          <div className="flex items-center gap-2">
            <Label htmlFor="copies-input" className="text-sm font-medium">
              Copies per Variant:
            </Label>
            <Input
              id="copies-input"
              type="number"
              min={1}
              max={50}
              className="w-20"
              value={copiesPerLabel}
              onChange={(e) => setCopiesPerLabel(Math.max(1, parseInt(e.target.value) || 1))}
            />
          </div>
          <div className="text-sm text-muted-foreground ml-auto">
            Total Labels to Print: <strong className="text-foreground">{totalStickers} stickers</strong>
          </div>
          <Button onClick={handlePrint} className="gap-2">
            <Printer className="h-4 w-4" />
            Print Stickers Now
          </Button>
        </div>

        {/* Printable Area */}
        <div id="printable-barcode-sheet" className="p-4 border rounded-xl bg-white text-black min-h-[300px]">
          <style jsx global>{`
            @media print {
              body * {
                visibility: hidden;
              }
              #printable-barcode-sheet, #printable-barcode-sheet * {
                visibility: visible;
              }
              #printable-barcode-sheet {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                margin: 0;
                padding: 10px;
                border: none !important;
                background: white !important;
              }
            }
          `}</style>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {labels.flatMap((lbl, lblIdx) =>
              Array.from({ length: copiesPerLabel }).map((_, cIdx) => (
                <div
                  key={`${lbl.sku}-${lblIdx}-${cIdx}`}
                  className="border border-dashed border-gray-300 rounded p-2 text-center bg-white flex flex-col items-center justify-between h-[150px] shadow-sm"
                >
                  <div className="w-full">
                    <p className="text-[10px] font-extrabold tracking-wider uppercase text-gray-800 line-clamp-1">
                      ANCHOR FASHION
                    </p>
                    <p className="text-[11px] font-semibold text-gray-900 line-clamp-1 leading-tight">
                      {lbl.productName}
                    </p>
                  </div>

                  <div className="my-1 scale-90 -translate-y-1">
                    <ClientBarcode
                      value={lbl.barcode || "894200000000"}
                      format="CODE128"
                      width={1.2}
                      height={34}
                      fontSize={10}
                      margin={0}
                      displayValue={true}
                    />
                  </div>

                  <div className="w-full flex items-center justify-between text-[10px] font-medium border-t border-gray-200 pt-1">
                    <span className="font-mono">{lbl.sku}</span>
                    <span>
                      {lbl.color && `${lbl.color} `}
                      {lbl.size && `[${lbl.size}]`}
                    </span>
                    <span className="font-bold text-gray-950">৳{lbl.price}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={handlePrint} className="gap-2">
            <Printer className="h-4 w-4" />
            Print ({totalStickers})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
