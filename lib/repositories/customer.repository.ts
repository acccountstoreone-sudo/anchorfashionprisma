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
      where: {
        OR: [{ customerId: userId }, { profileId: userId }],
      },
      orderBy: { isDefault: "desc" },
    });
    return addresses.map((addr) => {
      const parts = (addr.name || "").trim().split(" ");
      const firstName = parts[0] || "";
      const lastName = parts.slice(1).join(" ") || "";
      const lines = (addr.addressLine || "").split(", ");
      const line1 = lines[0] || addr.addressLine || "";
      const line2 = lines.slice(1).join(", ") || null;

      return {
        id: addr.id,
        customer_id: addr.customerId || addr.profileId || userId,
        title: addr.title || "Home",
        first_name: firstName,
        last_name: lastName,
        phone: addr.phone || "",
        address_line_1: line1,
        address_line_2: line2,
        city: addr.city || "",
        state: addr.state || null,
        zip: addr.postalCode || "",
        country: addr.country || "Bangladesh",
        is_default_shipping: !!addr.isDefault,
        is_default_billing: !!addr.isDefault,
        created_at: addr.createdAt ? addr.createdAt.toISOString() : new Date().toISOString(),
        updated_at: addr.updatedAt ? addr.updatedAt.toISOString() : new Date().toISOString(),
      } as CustomerAddress;
    });
  }

  async createAddress(address: any): Promise<CustomerAddress> {
    const rawUserId = address.customer_id || address.customerId || address.profileId;
    let customerId: string | null = null;
    let profileId: string | null = null;

    if (rawUserId) {
      const profile = await prisma.profile.findUnique({ where: { id: rawUserId } });
      if (profile) {
        profileId = profile.id;
        const customer = await prisma.customer.findFirst({ where: { profileId: profile.id } });
        if (customer) customerId = customer.id;
      } else {
        const customer = await prisma.customer.findUnique({ where: { id: rawUserId } });
        if (customer) {
          customerId = customer.id;
          profileId = customer.profileId;
        }
      }
    }

    const fullName = `${address.first_name || ""} ${address.last_name || ""}`.trim() || address.name || "Customer";
    const addressLine = [address.address_line_1, address.address_line_2].filter(Boolean).join(", ") || address.addressLine || "Address";
    const isDefault = address.is_default_shipping || address.is_default_billing || address.isDefault || false;

    if (isDefault && (customerId || profileId)) {
      await prisma.customerAddress.updateMany({
        where: {
          OR: [
            ...(customerId ? [{ customerId }] : []),
            ...(profileId ? [{ profileId }] : []),
          ],
        },
        data: { isDefault: false },
      });
    }

    const newAddress = await prisma.customerAddress.create({
      data: {
        customerId,
        profileId,
        title: address.title || "Home",
        name: fullName,
        phone: address.phone || "",
        addressLine,
        city: address.city || "Dhaka",
        state: address.state || null,
        postalCode: address.zip || address.postalCode || null,
        country: address.country || "Bangladesh",
        isDefault: !!isDefault,
      },
    });

    const parts = (newAddress.name || "").trim().split(" ");
    return {
      id: newAddress.id,
      customer_id: newAddress.customerId || newAddress.profileId || rawUserId || "",
      title: newAddress.title,
      first_name: parts[0] || "",
      last_name: parts.slice(1).join(" ") || "",
      phone: newAddress.phone,
      address_line_1: newAddress.addressLine,
      address_line_2: null,
      city: newAddress.city,
      state: newAddress.state,
      zip: newAddress.postalCode || "",
      country: newAddress.country,
      is_default_shipping: !!newAddress.isDefault,
      is_default_billing: !!newAddress.isDefault,
      created_at: newAddress.createdAt.toISOString(),
      updated_at: newAddress.updatedAt.toISOString(),
    } as CustomerAddress;
  }

  async updateAddress(id: string, userId: string, updates: any): Promise<CustomerAddress> {
    const data: any = {};
    if (updates.first_name !== undefined || updates.last_name !== undefined) {
      data.name = `${updates.first_name || ""} ${updates.last_name || ""}`.trim();
    }
    if (updates.name !== undefined) data.name = updates.name;
    if (updates.phone !== undefined) data.phone = updates.phone;
    if (updates.address_line_1 !== undefined) {
      data.addressLine = [updates.address_line_1, updates.address_line_2].filter(Boolean).join(", ");
    } else if (updates.addressLine !== undefined) {
      data.addressLine = updates.addressLine;
    }
    if (updates.city !== undefined) data.city = updates.city;
    if (updates.state !== undefined) data.state = updates.state;
    if (updates.zip !== undefined) data.postalCode = updates.zip;
    if (updates.postalCode !== undefined) data.postalCode = updates.postalCode;
    if (updates.country !== undefined) data.country = updates.country;
    if (updates.is_default_shipping !== undefined || updates.is_default_billing !== undefined || updates.isDefault !== undefined) {
      data.isDefault = Boolean(updates.is_default_shipping || updates.is_default_billing || updates.isDefault);
    }

    const updated = await prisma.customerAddress.update({
      where: { id },
      data,
    });

    const parts = (updated.name || "").trim().split(" ");
    return {
      id: updated.id,
      customer_id: updated.customerId || updated.profileId || userId,
      title: updated.title,
      first_name: parts[0] || "",
      last_name: parts.slice(1).join(" ") || "",
      phone: updated.phone,
      address_line_1: updated.addressLine,
      address_line_2: null,
      city: updated.city,
      state: updated.state,
      zip: updated.postalCode || "",
      country: updated.country,
      is_default_shipping: !!updated.isDefault,
      is_default_billing: !!updated.isDefault,
      created_at: updated.createdAt.toISOString(),
      updated_at: updated.updatedAt.toISOString(),
    } as CustomerAddress;
  }

  async deleteAddress(id: string, userId: string): Promise<void> {
    await prisma.customerAddress.deleteMany({
      where: {
        id,
        OR: [{ customerId: userId }, { profileId: userId }],
      },
    });
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
