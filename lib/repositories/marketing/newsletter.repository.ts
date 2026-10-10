export class NewsletterRepository {
  static async getSubscribers() {
    try {
      // NOTE: newsletter_subscribers table is not mapped to Prisma schema yet
      return [];
    } catch (err) {
      console.error("Unexpected error in getSubscribers:", err);
      return [];
    }
  }
}
