import { prisma } from "@/lib/prisma";
import { CustomerProfile, CustomerAddress, CustomerNotification } from "@/types/customer.types";

export class CustomerRepository {
  async getProfile(userId: string): Promise<CustomerProfile | null> {
    try {
      let customer = await prisma.customer.findUnique({
        where: { id: userId },
        include: { profile: true },
      });

      if (!customer) {
        // Fallback: try to find by profile id if they differ, or create
        const profile = await prisma.profile.findUnique({ where: { id: userId } });
        if (profile) {
          customer = await prisma.customer.create({
            data: {
              id: userId,
              email: profile.email || "no-email@example.com",
              name: `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || "Customer",
              profileId: profile.id,
            },
            include: { profile: true }
          });
        }
      }

      if (!customer) return null;

      return {
        id: customer.id,
        first_name: customer.profile?.firstName || customer.name.split(" ")[0] || "Customer",
        last_name: customer.profile?.lastName || customer.name.split(" ")[1] || "",
        email: customer.email,
        phone: customer.phone,
        avatar_url: customer.profile?.avatarUrl,
        is_active: customer.status === "active",
        created_at: customer.createdAt.toISOString(),
        updated_at: customer.updatedAt.toISOString(),
      } as unknown as CustomerProfile;
    } catch (err) {
      console.error("Error in CustomerRepository.getProfile:", err);
      return null;
    }
  }

  async updateProfile(userId: string, updates: Partial<CustomerProfile>): Promise<CustomerProfile> {
    try {
      const profileUpdates: any = {};
      const customerUpdates: any = {};
      
      if (updates.first_name) {
        profileUpdates.firstName = updates.first_name;
        customerUpdates.name = updates.first_name + (updates.last_name ? ` ${updates.last_name}` : '');
      }
      if (updates.last_name) {
        profileUpdates.lastName = updates.last_name;
      }
      if (updates.phone) customerUpdates.phone = updates.phone;
      if (updates.email) customerUpdates.email = updates.email;
      if (updates.avatar_url) profileUpdates.avatarUrl = updates.avatar_url;

      const profile = await prisma.profile.upsert({
        where: { id: userId },
        update: profileUpdates,
        create: {
          id: userId,
          email: updates.email,
          ...profileUpdates,
        }
      });

      const customer = await prisma.customer.upsert({
        where: { id: userId },
        update: { ...customerUpdates, profileId: profile.id },
        create: {
          id: userId,
          email: updates.email || "no-email@example.com",
          name: updates.first_name || "Customer",
          phone: updates.phone,
          profileId: profile.id,
        },
        include: { profile: true }
      });

      return {
        id: customer.id,
        first_name: customer.profile?.firstName || customer.name.split(" ")[0] || "Customer",
        last_name: customer.profile?.lastName || customer.name.split(" ")[1] || "",
        email: customer.email,
        phone: customer.phone,
        avatar_url: customer.profile?.avatarUrl,
        is_active: customer.status === "active",
        created_at: customer.createdAt.toISOString(),
        updated_at: customer.updatedAt.toISOString(),
      } as unknown as CustomerProfile;
    } catch (err) {
      console.error("Error in CustomerRepository.updateProfile:", err);
      throw err;
    }
  }

  async getAddresses(userId: string): Promise<CustomerAddress[]> {
    const addresses = await prisma.customerAddress.findMany({
      where: { customerId: userId },
      orderBy: { isDefault: "desc" },
    });
    return addresses as unknown as CustomerAddress[];
  }

  async createAddress(address: any): Promise<CustomerAddress> {
    const newAddress = await prisma.customerAddress.create({
      data: {
        ...address,
        customerId: address.customer_id,
        profileId: address.customer_id, // assuming 1:1 mapping
      },
    });
    return newAddress as unknown as CustomerAddress;
  }

  async updateAddress(id: string, userId: string, updates: any): Promise<CustomerAddress> {
    const updated = await prisma.customerAddress.update({
      where: { id },
      data: updates,
    });
    return updated as unknown as CustomerAddress;
  }

  async deleteAddress(id: string, userId: string): Promise<void> {
    await prisma.customerAddress.delete({ where: { id } });
  }

  async getNotifications(userId: string): Promise<CustomerNotification[]> {
    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
    return notifications.map(n => ({
      ...n,
      customer_id: n.userId,
      is_read: !!n.readAt,
      created_at: n.createdAt.toISOString()
    })) as unknown as CustomerNotification[];
  }

  async markNotificationAsRead(id: string, userId: string): Promise<void> {
    await prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
    });
  }

  async getReviews(userId: string) {
    const reviews = await prisma.review.findMany({
      where: { userId },
      include: { product: true },
      orderBy: { createdAt: "desc" },
    });
    return reviews.map(r => ({
      ...r,
      customer_id: r.userId,
      created_at: r.createdAt.toISOString(),
    }));
  }

  async getTickets(userId: string) {
    return await prisma.supportTicket.findMany({
      where: { customerId: userId },
      orderBy: { createdAt: "desc" },
    });
  }

  async createTicket(ticket: any) {
    return await prisma.supportTicket.create({
      data: {
        ...ticket,
        customerId: ticket.customer_id,
      },
    });
  }

  async getMessages(ticketId: string) {
    return await prisma.ticketMessage.findMany({
      where: { ticketId },
      orderBy: { createdAt: "asc" },
    });
  }

  async addMessage(message: any) {
    return await prisma.ticketMessage.create({
      data: {
        ...message,
        ticketId: message.ticket_id,
        senderId: message.sender_id,
      }
    });
  }

  async getWishlist(userId: string) {
    const wishlist = await prisma.wishlist.findUnique({
      where: { userId },
      include: { items: { include: { product: true } } },
    });
    return wishlist?.items || [];
  }

  async addToWishlist(userId: string, productId: string) {
    let wishlist = await prisma.wishlist.findUnique({ where: { userId } });
    if (!wishlist) {
      wishlist = await prisma.wishlist.create({ data: { userId } });
    }
    return await prisma.wishlistItem.create({
      data: {
        wishlistId: wishlist.id,
        productId,
      }
    });
  }

  async removeFromWishlist(userId: string, productId: string) {
    const wishlist = await prisma.wishlist.findUnique({ where: { userId } });
    if (!wishlist) return;
    
    await prisma.wishlistItem.deleteMany({
      where: { wishlistId: wishlist.id, productId }
    });
  }

  async getBrowsingHistory(userId: string) {
    // Browsing history typically stored in Redis or similar, returning empty for Prisma fallback
    return [];
  }

  async getTicketDetails(ticketId: string, userId: string) {
    return await prisma.supportTicket.findFirst({
      where: { id: ticketId, customerId: userId },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });
  }

  async replyTicket(ticketId: string, userId: string, message: string) {
    return await prisma.ticketMessage.create({
      data: {
        ticketId,
        senderId: userId,
        body: message,
      },
    });
  }

  async getLoginHistory(userId: string) {
    return [];
  }

  async getActiveSessions(userId: string) {
    return [];
  }

  async getWishlists(userId: string) {
    return this.getWishlist(userId);
  }
}
