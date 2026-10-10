"use client";

import { Card, CardContent } from "@/components/ui/card";
import { MoreHorizontal } from "lucide-react";

export function UserByContinent({ data = [] }: { data?: any[] }) {
  const totalUsers = data.reduce((sum, item) => sum + Number(item.user_count), 0);
  
  // Calculate top 3 to mimic the 3 color bars in the mockup
  const topCountries = data.slice(0, 3);
  const othersCount = totalUsers - topCountries.reduce((sum, item) => sum + Number(item.user_count), 0);
  
  const p1 = totalUsers ? (Number(topCountries[0]?.user_count || 0) / totalUsers) * 100 : 0;
  const p2 = totalUsers ? (Number(topCountries[1]?.user_count || 0) / totalUsers) * 100 : 0;
  const p3 = totalUsers ? (Number(topCountries[2]?.user_count || 0) / totalUsers) * 100 : 0;

  return (
    <Card className="border-none bg-card text-card-foreground shadow-sm rounded-2xl h-full flex flex-col">
      <div className="flex items-center justify-between p-6">
        <h3 className="text-lg font-semibold text-foreground">User By Location</h3>
        <button className="text-muted-foreground/80 hover:text-muted-foreground transition-colors" aria-label="More options">
          <MoreHorizontal className="h-5 w-5" />
        </button>
      </div>
      <CardContent className="px-6 pb-6 pt-0 flex-1 flex flex-col">
        {totalUsers === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
            <p className="text-sm font-medium">No user location data available</p>
            <p className="text-xs text-muted-foreground/80 mt-1">Location demographics will appear as customers register.</p>
          </div>
        ) : (
          <>
            <div className="mb-4">
              <div className="text-sm font-semibold text-foreground mb-2">{totalUsers.toLocaleString()} items</div>
              <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
                {p1 > 0 && <div className="h-full bg-[#00A1FF]" style={{ width: `${p1}%` }}></div>}
                {p2 > 0 && <div className="h-full bg-[#9333EA]" style={{ width: `${p2}%` }}></div>}
                {p3 > 0 && <div className="h-full bg-[#F43F5E]" style={{ width: `${p3}%` }}></div>}
              </div>
            </div>
            
            <div className="relative flex-1 mt-4 min-h-[180px] w-full flex items-center justify-center opacity-40">
              <svg viewBox="0 0 1000 500" className="w-full h-full fill-slate-400">
                <path d="M150,150 Q200,50 300,100 T400,200 T250,450 Z" />
                <path d="M450,100 Q550,50 650,150 T800,250 T750,400 T550,400 Z" />
                <path d="M850,250 Q900,200 950,250 T900,450 Z" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="absolute top-1/4 left-1/4 h-3 w-3 bg-[#00A1FF] rounded-full shadow-[0_0_10px_rgba(0,161,255,0.8)]"></div>
                <div className="absolute top-1/3 right-1/4 h-3 w-3 bg-[#9333EA] rounded-full shadow-[0_0_10px_rgba(147,51,234,0.8)]"></div>
                <div className="absolute bottom-1/3 left-1/2 h-3 w-3 bg-[#F43F5E] rounded-full shadow-[0_0_10px_rgba(244,63,94,0.8)]"></div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
