"use client";

import { useTransition, useState } from "react";
import { CustomerNotification } from "@/types/customer.types";
import { markNotificationAsReadAction } from "@/app/actions/customer.actions";
import { Button } from "@/components/ui/button";
import { Bell, Package, Gift, Tag, CheckCircle2, Megaphone } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface NotificationCenterProps {
  notifications: CustomerNotification[];
}

export function NotificationCenter({ notifications: initialNotifications }: NotificationCenterProps) {
  const [isPending, startTransition] = useTransition();
  const [notifications, setNotifications] = useState(initialNotifications);

  const handleMarkAsRead = (id: string) => {
    setNotifications(current => 
      current.map(n => n.id === id ? { ...n, is_read: true } : n)
    );
    startTransition(async () => {
      await markNotificationAsReadAction(id);
    });
  };

  const getIcon = (type?: string) => {
    switch (type) {
      case "order": return <Package className="h-4 w-4" />;
      case "promotion": return <Tag className="h-4 w-4" />;
      case "reward": return <Gift className="h-4 w-4" />;
      default: return <Megaphone className="h-4 w-4" />;
    }
  };

  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
        <Bell className="h-10 w-10 text-gray-300 mb-4" />
        <h3 className="text-lg font-medium text-[#1A1A1A]">No Notifications</h3>
        <p className="text-sm text-gray-500 mt-1">You're all caught up!</p>
      </div>
    );
  }

  return (
    <div className="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-200 before:to-transparent">
      {notifications.map((notification) => (
        <div key={notification.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
          
          <div className={cn(
            "flex items-center justify-center w-10 h-10 rounded-full border-4 border-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10",
            notification.is_read ? "bg-gray-100 text-gray-400" : "bg-[#1A1A1A] text-[#C9A86A]"
          )}>
            {getIcon(notification.type)}
          </div>
          
          <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-gray-100 bg-white shadow-sm transition-all hover:shadow-md">
            <div className="flex items-start justify-between mb-1">
              <span className={cn(
                "font-semibold text-sm uppercase tracking-widest",
                notification.is_read ? "text-gray-400" : "text-[#C9A86A]"
              )}>
                {notification.type || "System"}
              </span>
              <time className="text-xs font-medium text-gray-400">
                {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
              </time>
            </div>
            <h4 className={cn("text-base font-medium", notification.is_read ? "text-gray-600" : "text-[#1A1A1A]")}>
              {notification.title}
            </h4>
            <p className="text-sm text-gray-500 mt-2 leading-relaxed">
              {notification.message}
            </p>
            {!notification.is_read && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-4 px-0 h-auto text-xs uppercase tracking-widest font-semibold text-[#1A1A1A] hover:text-black hover:bg-transparent"
                onClick={() => handleMarkAsRead(notification.id)}
                disabled={isPending}
              >
                <CheckCircle2 className="mr-2 h-3.5 w-3.5" /> Mark as read
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
