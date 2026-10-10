"use client";

import React, { useEffect, useState } from "react";

interface CountdownTimerProps {
  endTime: string; // ISO timestamp
  className?: string;
  onExpire?: () => void;
}

export function CountdownTimer({ endTime, className = "", onExpire }: CountdownTimerProps) {
  const [mounted, setMounted] = useState(false);
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    expired: false,
  });

  useEffect(() => {
    setMounted(true);
    
    const targetDate = new Date(endTime).getTime();

    const updateTimer = () => {
      const now = new Date().getTime();
      const difference = targetDate - now;

      if (difference <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: true });
        if (onExpire) onExpire();
        return;
      }

      setTimeLeft({
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((difference % (1000 * 60)) / 1000),
        expired: false,
      });
    };

    updateTimer(); // Initial call
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [endTime, onExpire]);

  if (!mounted) {
    // Return empty placeholder with same dimensions to avoid hydration mismatch layout shift
    return <div className={`flex gap-2 text-center opacity-0 ${className}`}>
      <div className="flex flex-col"><span className="text-xl font-bold">00</span><span className="text-xs">Days</span></div>
    </div>;
  }

  if (timeLeft.expired) {
    return <div className={`text-red-500 font-bold ${className}`}>Deal Expired</div>;
  }

  const formatNumber = (num: number) => num.toString().padStart(2, "0");

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="flex flex-col items-center bg-zinc-900 text-white rounded p-2 min-w-[50px]">
        <span className="text-lg font-bold leading-none">{formatNumber(timeLeft.days)}</span>
        <span className="text-[10px] uppercase mt-1 text-zinc-400">Days</span>
      </div>
      <span className="text-xl font-bold text-zinc-900">:</span>
      <div className="flex flex-col items-center bg-zinc-900 text-white rounded p-2 min-w-[50px]">
        <span className="text-lg font-bold leading-none">{formatNumber(timeLeft.hours)}</span>
        <span className="text-[10px] uppercase mt-1 text-zinc-400">Hours</span>
      </div>
      <span className="text-xl font-bold text-zinc-900">:</span>
      <div className="flex flex-col items-center bg-zinc-900 text-white rounded p-2 min-w-[50px]">
        <span className="text-lg font-bold leading-none">{formatNumber(timeLeft.minutes)}</span>
        <span className="text-[10px] uppercase mt-1 text-zinc-400">Mins</span>
      </div>
      <span className="text-xl font-bold text-zinc-900">:</span>
      <div className="flex flex-col items-center bg-zinc-900 text-white rounded p-2 min-w-[50px]">
        <span className="text-lg font-bold leading-none text-red-400">{formatNumber(timeLeft.seconds)}</span>
        <span className="text-[10px] uppercase mt-1 text-zinc-400">Secs</span>
      </div>
    </div>
  );
}
