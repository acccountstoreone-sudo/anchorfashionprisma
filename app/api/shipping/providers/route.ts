import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin-client";

export async function GET() {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("courier_providers")
      .select(
        "id, code, name, display_name, logo_url, is_active, is_cod_supported, is_sandbox, priority"
      )
      .order("priority");

    if (error) throw error;
    return NextResponse.json({ data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
