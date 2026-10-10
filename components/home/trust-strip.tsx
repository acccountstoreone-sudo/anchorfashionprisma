import { ShieldCheck, Truck, RefreshCw, Star } from "lucide-react";

export function TrustStrip() {
  const items = [
    { icon: Truck, text: "Free Shipping" },
    { icon: RefreshCw, text: "Easy Returns" },
    { icon: ShieldCheck, text: "Secure Payment" },
    { icon: Star, text: "Premium Quality" },
  ];

  return (
    <div className="border-b border-gray-100 bg-white py-3">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between gap-4 overflow-x-auto whitespace-nowrap scrollbar-hide md:justify-center md:gap-12">
          {items.map((item, index) => (
            <div key={index} className="flex shrink-0 items-center gap-2">
              <item.icon className="h-4 w-4 text-[#1A1A1A]" strokeWidth={1.5} />
              <span className="text-xs font-semibold uppercase tracking-widest text-[#1A1A1A]">
                {item.text}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
