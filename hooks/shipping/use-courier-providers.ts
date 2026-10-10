"use client";

import { useQuery } from "@tanstack/react-query";
import { createAdminClient } from "@/lib/supabase/admin-client";

// Note: This hook is admin-only. The admin client is only available server-side,
// so we use a fetch to an internal API or server action in the client.
// For the admin UI, we fetch courier providers from the public-read RLS policy.

async function fetchCourierProviders() {
  const res = await fetch("/api/shipping/providers");
  if (!res.ok) throw new Error("Failed to fetch courier providers");
  const json = await res.json();
  return json.data ?? [];
}

export function useCourierProviders() {
  return useQuery({
    queryKey: ["courier-providers"],
    queryFn: fetchCourierProviders,
    staleTime: 5 * 60 * 1000,
  });
}
