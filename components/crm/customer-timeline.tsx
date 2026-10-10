"use client";

import { Package, MessageCircle, Gift, CreditCard, ExternalLink } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

export interface TimelineEvent {
  id: string;
  type: "order" | "support" | "reward" | "payment";
  title: string;
  description: string;
  date: string;
  link?: string;
}

export function CustomerTimeline({ events }: { events: TimelineEvent[] }) {
  if (!events || events.length === 0) {
    return <p className="text-sm text-gray-500 italic">No interaction history available.</p>;
  }

  const getIcon = (type: string) => {
    switch (type) {
      case "order": return <Package className="h-4 w-4" />;
      case "support": return <MessageCircle className="h-4 w-4" />;
      case "reward": return <Gift className="h-4 w-4" />;
      case "payment": return <CreditCard className="h-4 w-4" />;
      default: return <Package className="h-4 w-4" />;
    }
  };

  return (
    <div className="relative space-y-4 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-gray-200 before:to-transparent">
      {events.map((event) => (
        <div key={event.id} className="relative flex items-start gap-4">
          <div className={cn(
            "flex items-center justify-center w-10 h-10 rounded-full border-4 border-white shadow shrink-0 z-10",
            event.type === "order" ? "bg-blue-50 text-blue-600" :
            event.type === "support" ? "bg-orange-50 text-orange-600" :
            event.type === "reward" ? "bg-green-50 text-green-600" :
            "bg-gray-50 text-gray-600"
          )}>
            {getIcon(event.type)}
          </div>
          
          <div className="pt-2 flex-1">
            <div className="flex justify-between items-start">
              <h4 className="text-sm font-medium text-[#1A1A1A]">{event.title}</h4>
              <time className="text-xs text-gray-400">
                {formatDistanceToNow(new Date(event.date), { addSuffix: true })}
              </time>
            </div>
            <p className="text-xs text-gray-500 mt-1">{event.description}</p>
            {event.link && (
              <a href={event.link} className="inline-flex items-center mt-2 text-xs font-semibold text-[#1A1A1A] hover:text-[#C9A86A] transition-colors">
                View Details <ExternalLink className="ml-1 h-3 w-3" />
              </a>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
