"use server";

import { createClient } from "@/lib/supabase/server";
import {
  AnalyticsEventSchema,
  DashboardSnapshotSchema,
} from "@/schemas/operations.schemas";
import {
  AnalyticsEvent,
  DashboardSnapshot,
  DashboardType,
} from "@/types/operations.types";
import { revalidatePath } from "next/cache";

export async function trackEvent(
  data: unknown
): Promise<{ error?: string; success?: boolean }> {
  try {
    const parsedData = AnalyticsEventSchema.parse(data);
    const supabase = await createClient();

    // Check user auth context
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase.from("analytics_events").insert({
      event_category: parsedData.event_category,
      event_action: parsedData.event_action,
      user_id: user?.id || parsedData.user_id || null,
      session_id: parsedData.session_id || null,
      url: parsedData.url || null,
      payload: parsedData.payload,
      metadata: parsedData.metadata,
    });

    if (error) throw new Error(error.message);

    return { success: true };
  } catch (error: any) {
    console.error("Error tracking analytics event:", error);
    return { error: error.message || "Failed to track event" };
  }
}

export async function getDashboardSnapshot(
  type: DashboardType,
  timeframe: string = "daily"
): Promise<{ data?: DashboardSnapshot | null; error?: string }> {
  const supabase = await createClient();
  try {
    const { data, error } = await supabase
      .from("dashboard_snapshots")
      .select("*")
      .eq("dashboard_type", type)
      .eq("timeframe", timeframe)
      .order("generated_at", { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== "PGRST116") throw new Error(error.message);

    return { data: data as DashboardSnapshot | null };
  } catch (error: any) {
    console.error(`Error fetching snapshot for ${type}:`, error);
    return { error: error.message || "Failed to fetch dashboard snapshot" };
  }
}

export async function saveDashboardSnapshot(
  data: unknown
): Promise<{ error?: string; success?: boolean }> {
  try {
    const parsedData = DashboardSnapshotSchema.parse(data);
    const supabase = await createClient();

    const { error } = await supabase.from("dashboard_snapshots").insert({
      dashboard_type: parsedData.dashboard_type,
      timeframe: parsedData.timeframe,
      snapshot_data: parsedData.snapshot_data,
      expires_at: parsedData.expires_at || null,
    });

    if (error) throw new Error(error.message);

    revalidatePath(`/dashboard/${parsedData.dashboard_type}`);
    return { success: true };
  } catch (error: any) {
    console.error("Error saving dashboard snapshot:", error);
    return { error: error.message || "Failed to save snapshot" };
  }
}

export async function getAnalyticsEvents(
  category?: string,
  limit: number = 100
): Promise<{ data?: AnalyticsEvent[]; error?: string }> {
  const supabase = await createClient();
  try {
    let query = supabase
      .from("analytics_events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (category) {
      query = query.eq("event_category", category);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    return { data: data as AnalyticsEvent[] };
  } catch (error: any) {
    console.error("Error fetching analytics events:", error);
    return { error: error.message || "Failed to fetch events" };
  }
}
