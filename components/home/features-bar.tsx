import { Truck, RotateCcw, Award, ShieldCheck } from "lucide-react";
import { jost } from "@/lib/fonts";

const features = [
  {
    icon: Truck,
    title: "Free Delivery",
    description: "Orders over ৳999",
  },
  {
    icon: RotateCcw,
    title: "Easy Returns",
    description: "7-day free returns",
  },
  {
    icon: Award,
    title: "Premium Quality",
    description: "Finest materials only",
  },
  {
    icon: ShieldCheck,
    title: "Secure Checkout",
    description: "100% safe & encrypted",
  },
];

export function FeaturesBar() {
  return (
    <section className={`${jost.className} border-b border-gray-100 bg-white`}>
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid grid-cols-2 md:grid-cols-4">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className={`group flex flex-col items-center justify-center gap-2 px-4 py-5 transition-colors duration-300 hover:bg-[#C9A86A]/5 md:flex-row md:gap-3 md:px-8 md:py-6 ${
                  index % 2 === 0 ? "border-r border-gray-100" : ""
                } ${index < 2 ? "border-b border-gray-100 md:border-b-0" : ""} ${
                  index === 0 || index === 2 ? "md:border-r md:border-gray-100" : ""
                } ${index === 1 || index === 3 ? "md:border-r-0" : ""}`}
              >
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center border border-[#C9A86A]/30 transition-all duration-300 group-hover:border-[#C9A86A] group-hover:bg-[#C9A86A]/10">
                  <Icon className="h-4 w-4 text-[#C9A86A]" strokeWidth={1.5} />
                </div>
                <div className="text-center md:text-left">
                  <span className="block text-[10px] font-semibold uppercase tracking-wider text-[#1A1A1A] md:text-xs">
                    {feature.title}
                  </span>
                  <span className="text-[10px] font-light text-gray-400">
                    {feature.description}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
