import { CMSRepository } from "@/repositories/cms.repository";
import {
  cmsPageSchema,
  cmsSectionSchema,
  cmsNavigationSchema,
} from "@/validators/cms.schema";
import { CMSPage, CMSSection, CMSNavigation, CMSPageBlock } from "@/types/cms.types";

const cmsRepository = new CMSRepository();

export class CMSService {
  async getPages(): Promise<CMSPage[]> {
    return await cmsRepository.getPages();
  }

  async getPageById(id: string): Promise<CMSPage | null> {
    return await cmsRepository.getPageById(id);
  }

  async getPageBySlug(slug: string): Promise<CMSPage | null> {
    return await cmsRepository.getPageBySlug(slug);
  }

  async createPage(data: unknown): Promise<CMSPage> {
    const validData = cmsPageSchema.parse(data);
    return await cmsRepository.createPage(validData);
  }

  async updatePage(id: string, data: unknown): Promise<CMSPage> {
    const validData = cmsPageSchema.partial().parse(data);
    return await cmsRepository.updatePage(id, validData);
  }

  async deletePage(id: string): Promise<void> {
    await cmsRepository.deletePage(id);
  }

  async getPageBlocks(pageId: string): Promise<CMSPageBlock[]> {
    return await cmsRepository.getPageBlocks(pageId);
  }

  async savePageBlocks(pageId: string, blocks: Partial<CMSPageBlock>[]): Promise<void> {
    await cmsRepository.savePageBlocks(pageId, blocks);
  }

  async getGlobalSections(): Promise<CMSSection[]> {
    return await cmsRepository.getGlobalSections();
  }

  async getNavigation(location: string): Promise<CMSNavigation | null> {
    return await cmsRepository.getNavigationByLocation(location);
  }

  async getAllNavigations(): Promise<CMSNavigation[]> {
    return await cmsRepository.getAllNavigations();
  }

  async saveNavigation(location: string, name: string, items: any[]): Promise<CMSNavigation> {
    return await cmsRepository.saveNavigation(location, name, items);
  }

  async deleteNavigation(id: string): Promise<void> {
    await cmsRepository.deleteNavigation(id);
  }
}

export const cmsService = new CMSService();
