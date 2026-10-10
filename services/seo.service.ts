import { SEORepository } from "@/repositories/seo.repository";
import { seoMetadataSchema } from "@/validators/seo.schema";
import { SEOMetadata } from "@/types/seo.types";

const seoRepository = new SEORepository();

export class SEOService {
  async getMetadataByEntity(
    entityType: string,
    entityId: string
  ): Promise<SEOMetadata | null> {
    return await seoRepository.getMetadataByEntity(entityType, entityId);
  }

  async upsertMetadata(data: unknown): Promise<SEOMetadata> {
    const validData = seoMetadataSchema.parse(data);
    return await seoRepository.upsertMetadata(validData);
  }

  async getAllMetadata(): Promise<SEOMetadata[]> {
    return await seoRepository.getAllMetadata();
  }
}

export const seoService = new SEOService();
