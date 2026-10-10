import { supabase } from "../supabase";
import { RecommendationStrategy } from "./types";

export class AIRecommendationEngine {
  /**
   * Fetches active recommendation strategies and their weights.
   */
  static async getActiveStrategies(): Promise<RecommendationStrategy[]> {
    const { data, error } = await supabase
      .from("ai_recommendation_models")
      .select("*")
      .eq("is_active", true)
      .order("weight", { ascending: false });

    if (error || !data) {
      console.error("Failed to fetch recommendation models:", error);
      return [];
    }

    return data.map((d) => ({
      id: d.id,
      name: d.name,
      strategy: d.strategy,
      weight: d.weight,
      config: d.config,
    }));
  }

  /**
   * Gets similar products using semantic embeddings (pgvector).
   * Note: This assumes a PostgreSQL function `match_products` exists to handle the vector similarity.
   */
  static async getSimilarProducts(productId: string, limit: number = 5) {
    // We would first fetch the embedding of the current product
    const { data: sourceProduct, error: fetchError } = await supabase
      .from("ai_product_embeddings")
      .select("semantic_embedding")
      .eq("product_id", productId)
      .single();

    if (fetchError || !sourceProduct || !sourceProduct.semantic_embedding) {
      return [];
    }

    // Call a Postgres function that performs the vector similarity search
    // Since we don't have the RPC defined in the schema yet, this is illustrative.
    const { data, error } = await supabase.rpc("match_products_by_semantic", {
      query_embedding: sourceProduct.semantic_embedding,
      match_threshold: 0.7, // Only return high-confidence matches
      match_count: limit,
      p_id: productId, // Exclude self
    });

    if (error) {
      console.error("Similarity search failed:", error);
      return [];
    }

    return data;
  }

  /**
   * Gets trending products globally.
   */
  static async getTrendingProducts(limit: number = 10) {
    const { data, error } = await supabase
      .from("ai_product_embeddings")
      .select("product_id, trending_score")
      .order("trending_score", { ascending: false })
      .limit(limit);

    if (error) return [];
    return data;
  }
}
