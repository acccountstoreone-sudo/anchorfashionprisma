"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { X } from "lucide-react";
import Link from "next/link";

interface Announcement {
  id: string;
  title: string;
  message: string;
  type: string;
  link_url?: string;
}

export function AnnouncementBar() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const supabase = createClient();

  useEffect(() => {
    // Load dismissed announcements from local storage
    const saved = localStorage.getItem("dismissedAnnouncements");
    if (saved) {
      setDismissed(JSON.parse(saved));
    }
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    const { data } = await supabase
      .from("announcements")
      .select("*")
      .eq("is_active", true)
      .lte("start_date", new Date().toISOString())
      .gte("end_date", new Date().toISOString());

    // Fallback for null dates (always active)
    const { data: dataNoDates } = await supabase
      .from("announcements")
      .select("*")
      .eq("is_active", true)
      .is("start_date", null)
      .is("end_date", null);

    const allActive = [...(data || []), ...(dataNoDates || [])];
    // Remove duplicates if any
    const unique = Array.from(
      new Map(allActive.map((item) => [item.id, item])).values()
    );

    setAnnouncements(unique);
  };

  const handleDismiss = (id: string) => {
    const newDismissed = [...dismissed, id];
    setDismissed(newDismissed);
    localStorage.setItem(
      "dismissedAnnouncements",
      JSON.stringify(newDismissed)
    );
  };

  const visibleAnnouncements = announcements.filter(
    (a) => !dismissed.includes(a.id)
  );

  if (visibleAnnouncements.length === 0) return null;

  // Render the first active announcement
  const announcement = visibleAnnouncements[0];

  const bgColor =
    {
      INFO: "bg-blue-600",
      WARNING: "bg-yellow-500",
      SUCCESS: "bg-green-600",
      PROMOTION: "bg-purple-600",
    }[announcement.type] || "bg-black";

  const Content = () => (
    <>
      <span className="mr-2 font-semibold">{announcement.title}:</span>
      {announcement.message}
    </>
  );

  return (
    <div
      className={`relative px-4 py-2 text-center text-sm text-white ${bgColor}`}
    >
      <div className="flex items-center justify-center">
        {announcement.link_url ? (
          <Link href={announcement.link_url} className="hover:underline">
            <Content />
          </Link>
        ) : (
          <span>
            <Content />
          </span>
        )}
      </div>
      <button
        onClick={() => handleDismiss(announcement.id)}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 transition-colors hover:bg-white/20"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
