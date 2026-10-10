"use client";

import { useState, useEffect } from "react";
import { X, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";

export const MobileAppBanner = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Only show on mobile devices
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      // Check if user has already dismissed it
      const hasDismissed = localStorage.getItem("app-banner-dismissed");
      if (!hasDismissed) {
        setIsVisible(true);
      }
    }
  }, []);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#00A1FF] text-white p-4 shadow-lg flex items-center justify-between animate-in slide-in-from-bottom-full md:hidden">
      <div className="flex items-center gap-3">
        <div className="bg-white/20 p-2 rounded-lg">
          <Smartphone className="h-6 w-6" />
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-sm">Download our App</span>
          <span className="text-xs text-white/80">For a better admin experience</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button 
          size="sm" 
          className="bg-white text-[#00A1FF] hover:bg-slate-100 font-semibold"
          onClick={() => {
             window.open(
               "https://play.google.com/store/search?q=anchor+fashion",
               "_blank",
               "noopener,noreferrer"
             );
           }}
        >
          Get App
        </Button>
        <Button 
          variant="ghost" 
          size="icon" 
          className="text-white hover:bg-white/20 hover:text-white"
          onClick={() => {
            setIsVisible(false);
            localStorage.setItem("app-banner-dismissed", "true");
          }}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
