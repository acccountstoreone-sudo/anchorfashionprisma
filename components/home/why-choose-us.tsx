import {
  ShieldCheck,
  Truck,
  RefreshCcw,
  HeartHandshake,
  Award,
  Clock,
  Sparkles,
  CheckCircle2,
  CreditCard,
  Package,
  Leaf,
  Star,
  Headphones,
  Zap,
  Lock,
} from "lucide-react";
import Image from "next/image";
import { jost } from "@/lib/fonts";
import {
  WhyChooseUsSettings,
  DEFAULT_WHY_CHOOSE_US,
} from "@/types/why-choose-us.types";

export const WHY_CHOOSE_US_ICONS: Record<
  string,
  React.ComponentType<{ className?: string }>
> = {
  ShieldCheck,
  Truck,
  RefreshCcw,
  HeartHandshake,
  Award,
  Clock,
  Sparkles,
  CheckCircle2,
  CreditCard,
  Package,
  Leaf,
  Star,
  Headphones,
  Zap,
  Lock,
};

interface WhyChooseUsProps {
  data?: WhyChooseUsSettings;
}

export function WhyChooseUs({ data }: WhyChooseUsProps) {
  const content = data || DEFAULT_WHY_CHOOSE_US;

  if (content.isEnabled === false) {
    return null;
  }

  const benefits =
    content.benefits && content.benefits.length > 0
      ? content.benefits
      : DEFAULT_WHY_CHOOSE_US.benefits;

  return (
    <section className="bg-white py-12 sm:py-16 md:py-24">
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid grid-cols-1 items-center gap-10 sm:gap-14 lg:grid-cols-2 lg:gap-24">
          {/* Left Side: Brand Image / Ethos */}
          <div className="relative aspect-[3/4] h-auto w-full overflow-hidden md:h-[500px] md:aspect-auto lg:h-[700px]">
            <Image
              src={content.imageUrl || DEFAULT_WHY_CHOOSE_US.imageUrl}
              alt={content.title || "The Anchor Fashion Difference"}
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-black/10" />
            <div className="absolute bottom-3 left-3 right-3 bg-white/95 p-4 text-center backdrop-blur-sm sm:bottom-6 sm:left-6 sm:right-6 sm:p-6 md:bottom-10 md:left-10 md:right-10 md:p-8">
              <span className="mb-2 sm:mb-3 block text-[10px] font-bold uppercase tracking-[0.3em] text-[#C9A86A]">
                {content.badge || "Our Ethos"}
              </span>
              <h2
                className={`${jost.className} mb-2 sm:mb-4 text-xl sm:text-2xl font-light tracking-tight text-gray-900 md:text-3xl`}
              >
                {content.title || "The Anchor Fashion Difference"}
              </h2>
              <p className="text-xs sm:text-sm leading-relaxed text-gray-500">
                {content.description ||
                  "We don't just sell clothes; we provide an elevated lifestyle experience. Discover why thousands of customers choose us for their everyday elegance."}
              </p>
            </div>
          </div>

          {/* Right Side: Features */}
          <div className="flex flex-col gap-10">
            {benefits.map((benefit, idx) => {
              const IconComp =
                WHY_CHOOSE_US_ICONS[benefit.icon] || ShieldCheck;
              return (
                <div key={benefit.id || idx} className="group flex gap-6">
                  <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center border border-gray-200 text-[#C9A86A] transition-all duration-300 group-hover:border-[#C9A86A] group-hover:bg-[#C9A86A]/5">
                    <IconComp className="h-6 w-6 stroke-[1.5]" />
                  </div>
                  <div>
                    <h3
                      className={`${jost.className} mb-2 text-xl font-medium text-[#1A1A1A]`}
                    >
                      {benefit.title}
                    </h3>
                    <p className="max-w-md text-sm leading-relaxed text-gray-500">
                      {benefit.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
