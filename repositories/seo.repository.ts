import { createClient } from "@/lib/supabase/server";
import { SEOMetadata } from "@/types/seo.types";

export class SEORepository {
  async getMetadataByEntity(
    entityType: string,
    entityId: string
  ): Promise<SEOMetadata | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("seo_metadata")
      .select("*")
      .eq("entity_type", entityType)
      .eq("entity_id", entityId)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw new Error(error.message);
    }
    return data;
  }

  async upsertMetadata(metadata: Partial<SEOMetadata>): Promise<SEOMetadata> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("seo_metadata")
      .upsert(metadata, { onConflict: "entity_type,entity_id" })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async getAllMetadata(): Promise<SEOMetadata[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("seo_metadata")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return data;
  }
}
