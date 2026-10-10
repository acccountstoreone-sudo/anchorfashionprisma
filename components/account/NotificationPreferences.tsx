"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface Preferences {
  email_enabled: boolean;
  push_enabled: boolean;
  marketing_enabled: boolean;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
}

export function NotificationPreferences() {
  const [preferences, setPreferences] = useState<Preferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;

    const { data } = await supabase
      .from("notification_preferences")
      .select("*")
      .eq("user_id", session.user.id)
      .single();

    if (data) {
      setPreferences(data);
    } else {
      // Defaults
      setPreferences({
        email_enabled: true,
        push_enabled: false,
        marketing_enabled: true,
        quiet_hours_start: null,
        quiet_hours_end: null,
      });
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!preferences) return;
    setSaving(true);
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;

    await supabase.from("notification_preferences").upsert({
      user_id: session.user.id,
      ...preferences,
    });

    setSaving(false);
    toast.success("Preferences saved successfully!");
  };

  const requestPushPermission = async () => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      toast.error("Push notifications are not supported by your browser.");
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      setPreferences((prev) => (prev ? { ...prev, push_enabled: true } : null));
      toast.success("Push notifications enabled!");
    } else {
      toast.error("Push notification permission denied.");
    }
  };

  if (loading) return <div>Loading preferences...</div>;
  if (!preferences) return null;

  return (
    <div className="max-w-2xl rounded-lg bg-white p-6 shadow">
      <h2 className="mb-6 text-2xl font-semibold">Notification Preferences</h2>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-gray-900">Email Notifications</h3>
            <p className="text-sm text-gray-500">
              Receive order updates and important alerts via email.
            </p>
          </div>
          <label className="relative inline-flex cursor-pointer items-center">
            <input
              type="checkbox"
              className="peer sr-only"
              checked={preferences.email_enabled}
              onChange={(e) =>
                setPreferences({
                  ...preferences,
                  email_enabled: e.target.checked,
                })
              }
            />
            <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none"></div>
          </label>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-gray-900">Push Notifications</h3>
            <p className="text-sm text-gray-500">
              Receive real-time alerts directly on your device.
            </p>
          </div>
          {preferences.push_enabled ? (
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                className="peer sr-only"
                checked={preferences.push_enabled}
                onChange={(e) =>
                  setPreferences({
                    ...preferences,
                    push_enabled: e.target.checked,
                  })
                }
              />
              <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none"></div>
            </label>
          ) : (
            <button
              onClick={requestPushPermission}
              className="rounded border border-blue-600 px-3 py-1 text-sm text-blue-600 transition-colors hover:bg-blue-50"
            >
              Enable
            </button>
          )}
        </div>

        <div className="flex items-center justify-between border-t pt-6">
          <div>
            <h3 className="font-medium text-gray-900">
              Marketing & Promotions
            </h3>
            <p className="text-sm text-gray-500">
              Receive personalized offers, flash sales, and newsletters.
            </p>
          </div>
          <label className="relative inline-flex cursor-pointer items-center">
            <input
              type="checkbox"
              className="peer sr-only"
              checked={preferences.marketing_enabled}
              onChange={(e) =>
                setPreferences({
                  ...preferences,
                  marketing_enabled: e.target.checked,
                })
              }
            />
            <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none"></div>
          </label>
        </div>

        <div className="border-t pt-6">
          <h3 className="mb-4 font-medium text-gray-900">Quiet Hours</h3>
          <p className="mb-4 text-sm text-gray-500">
            Pause non-essential notifications during these hours.
          </p>
          <div className="flex gap-4">
            <div>
              <label className="mb-1 block text-xs text-gray-500">
                Start Time
              </label>
              <input
                type="time"
                className="rounded-md border px-3 py-2"
                value={preferences.quiet_hours_start || ""}
                onChange={(e) =>
                  setPreferences({
                    ...preferences,
                    quiet_hours_start: e.target.value,
                  })
                }
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500">
                End Time
              </label>
              <input
                type="time"
                className="rounded-md border px-3 py-2"
                value={preferences.quiet_hours_end || ""}
                onChange={(e) =>
                  setPreferences({
                    ...preferences,
                    quiet_hours_end: e.target.value,
                  })
                }
              />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 flex justify-end border-t pt-6">
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-md bg-black px-6 py-2 text-white transition-colors hover:bg-gray-800 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Preferences"}
        </button>
      </div>
    </div>
  );
}
