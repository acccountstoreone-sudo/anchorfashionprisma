import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// GET all prompts
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");

    let query = supabase
      .from("ai_prompts")
      .select("*")
      .order("updated_at", { ascending: false });

    if (category) {
      query = query.eq("category", category);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST a new prompt
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Minimal validation
    if (!body.name || !body.system_prompt || !body.user_prompt_template) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("ai_prompts")
      .insert([
        {
          name: body.name,
          description: body.description,
          category: body.category || "general",
          model: body.model || "gemini-1.5-flash",
          system_prompt: body.system_prompt,
          user_prompt_template: body.user_prompt_template,
          temperature: body.temperature ?? 0.7,
          is_active: body.is_active ?? false,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
