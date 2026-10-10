"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface CountdownBannerProps {
  endDate: Date;
  title: string;
  className?: string;
}

export function CountdownBanner({ endDate, title, className }: CountdownBannerProps) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const distance = endDate.getTime() - now;

      if (distance < 0) {
        clearInterval(interval);
        return;
      }

      setTimeLeft({
        days: Math.floor(distance / (1000 * 60 * 60 * 24)),
        hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((distance % (1000 * 60)) / 1000),
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [endDate]);

  if (!isClient) return null;

  return (
    <div className={cn("bg-[#1A1A1A] text-white py-3 px-4 flex flex-col md:flex-row items-center justify-center gap-4 text-sm", className)}>
      <span className="font-semibold uppercase tracking-widest text-[#C9A86A]">{title}</span>
      <div className="flex items-center gap-3 font-mono">
        <TimeUnit value={timeLeft.days} label="D" />
        <span className="opacity-50">:</span>
        <TimeUnit value={timeLeft.hours} label="H" />
        <span className="opacity-50">:</span>
        <TimeUnit value={timeLeft.minutes} label="M" />
        <span className="opacity-50">:</span>
        <TimeUnit value={timeLeft.seconds} label="S" />
      </div>
    </div>
  );
}

function TimeUnit({ value, label }: { value: number, label: string }) {
  return (
    <div className="flex items-baseline gap-1">
      <span className="text-lg font-bold w-6 text-center">{value.toString().padStart(2, '0')}</span>
      <span className="text-[10px] text-gray-400 font-sans">{label}</span>
    </div>
  );
}
