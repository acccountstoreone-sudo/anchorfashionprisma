import prisma from "@/lib/prisma";
import {
  CustomerProfile,
  CustomerAddress,
  CustomerReview,
  CustomerNotification,
} from "@/types/customer.types";

export class CustomerRepository {
  static async getProfile(userId: string): Promise<CustomerProfile | null> {
    try {
      const profile = await prisma.profile.findUnique({
        where: { id: userId },
      });

      if (!profile) return null;

      return {
        id: profile.id,
        first_name: profile.firstName,
        last_name: profile.lastName,
        email: profile.email || "",
        phone: profile.phone,
        avatar_url: profile.avatarUrl,
        is_active: profile.isActive,
        created_at: profile.createdAt.toISOString(),
        updated_at: profile.updatedAt.toISOString(),
      } as CustomerProfile;
    } catch (e) {
      console.error("Error fetching profile:", e);
      return null;
    }
  }

  static async updateProfile(
    userId: string,
    updates: Partial<CustomerProfile>
  ): Promise<CustomerProfile | null> {
    try {
      const updateData: any = {};
      if (updates.first_name !== undefined) updateData.firstName = updates.first_name;
      if (updates.last_name !== undefined) updateData.lastName = updates.last_name;
      if (updates.phone !== undefined) updateData.phone = updates.phone;
      if (updates.avatar_url !== undefined) updateData.avatarUrl = updates.avatar_url;
      if (updates.email !== undefined) updateData.email = updates.email;

      const profile = await prisma.profile.upsert({
        where: { id: userId },
        update: updateData,
        create: {
          id: userId,
          email: updates.email || "",
          ...updateData,
        },
      });

      return {
        id: profile.id,
        first_name: profile.firstName,
        last_name: profile.lastName,
        email: profile.email || "",
        phone: profile.phone,
        avatar_url: profile.avatarUrl,
        is_active: profile.isActive,
        created_at: profile.createdAt.toISOString(),
        updated_at: profile.updatedAt.toISOString(),
      } as CustomerProfile;
    } catch (e) {
      console.error("Error in updateProfile:", e);
      throw e;
    }
  }

  static async getAddresses(userId: string): Promise<CustomerAddress[]> {
    try {
      const addresses = await prisma.customerAddress.findMany({
        where: { profileId: userId },
        orderBy: { isDefault: "desc" },
      });

      return addresses.map((addr) => ({
        id: addr.id,
        customer_id: addr.profileId || addr.customerId || "",
        title: addr.title,
        first_name: addr.name.split(" ")[0] || "",
        last_name: addr.name.split(" ").slice(1).join(" ") || "",
        phone: addr.phone,
        address_line_1: addr.addressLine,
        address_line_2: null,
        city: addr.city,
        state: addr.state,
        zip: addr.postalCode || "",
        country: addr.country,
        is_default_shipping: addr.isDefault,
        is_default_billing: addr.isDefault,
        created_at: addr.createdAt.toISOString(),
        updated_at: addr.updatedAt.toISOString(),
      })) as CustomerAddress[];
    } catch (error) {
      console.error("Error fetching addresses:", error);
      return [];
    }
  }

  static async addAddress(
    userId: string,
    address: Partial<CustomerAddress>
  ): Promise<CustomerAddress> {
    const newAddress = await prisma.customerAddress.create({
      data: {
        profileId: userId,
        title: address.title || "Home",
        name: `${address.first_name || ""} ${address.last_name || ""}`.trim(),
        phone: address.phone || "",
        addressLine: address.address_line_1 || "",
        city: address.city || "",
        state: address.state,
        postalCode: address.zip,
        country: address.country || "Bangladesh",
        isDefault: address.is_default_shipping || false,
      },
    });

    return {
      id: newAddress.id,
      customer_id: newAddress.profileId || "",
      title: newAddress.title,
      first_name: newAddress.name.split(" ")[0] || "",
      last_name: newAddress.name.split(" ").slice(1).join(" ") || "",
      phone: newAddress.phone,
      address_line_1: newAddress.addressLine,
      address_line_2: null,
      city: newAddress.city,
      state: newAddress.state,
      zip: newAddress.postalCode || "",
      country: newAddress.country,
      is_default_shipping: newAddress.isDefault,
      is_default_billing: newAddress.isDefault,
      created_at: newAddress.createdAt.toISOString(),
      updated_at: newAddress.updatedAt.toISOString(),
    } as CustomerAddress;
  }

  static async getReviews(userId: string): Promise<CustomerReview[]> {
    try {
      const reviews = await prisma.review.findMany({
        where: { customerId: userId },
        include: { product: true },
        orderBy: { createdAt: "desc" },
      });

      return reviews.map((r) => ({
        id: r.id,
        customer_id: r.customerId || "",
        product_id: r.productId || "",
        order_id: null,
        rating: r.rating,
        title: null,
        review_text: r.comment,
        images: null,
        is_approved: r.isApproved,
        helpful_votes: 0,
        created_at: r.createdAt.toISOString(),
        updated_at: r.updatedAt.toISOString(),
        products: {
          name: r.product?.name || "",
          product_media: [],
        },
      })) as any[];
    } catch (error) {
      console.error("Error fetching reviews:", error);
      return [];
    }
  }

  static async deactivateProfile(userId: string): Promise<boolean> {
    try {
      await prisma.profile.update({
        where: { id: userId },
        data: { isActive: false },
      });
      return true;
    } catch (error: any) {
      console.error("Error deactivating customer profile:", error);
      throw new Error(error.message);
    }
  }

  static async deleteProfile(userId: string): Promise<boolean> {
    try {
      // With Prisma, depending on cascade rules, deleting the profile might delete addresses.
      // But we can delete explicitly to be safe.
      await prisma.customerAddress.deleteMany({
        where: { profileId: userId },
      });
      await prisma.profile.delete({
        where: { id: userId },
      });
      return true;
    } catch (error: any) {
      console.error("Error deleting customer profile:", error);
      throw new Error(error.message);
    }
  }

  // --- CRM Additions ---

  static async logActivity(userId: string, activityType: string, metadata: any = {}) {
    try {
      await prisma.auditLog.create({
        data: {
          userId,
          action: activityType,
          entity: "customer",
          newValues: metadata,
        },
      });
    } catch (error) {
      console.error("Failed to log customer activity:", error);
    }
  }

  static async getCustomerCRMStats(userId: string) {
    try {
      const [orders, activities, customer] = await Promise.all([
        prisma.order.findMany({
          where: { profileId: userId },
          select: { totalAmount: true, createdAt: true },
        }),
        prisma.auditLog.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" },
          take: 10,
        }),
        prisma.customer.findUnique({
          where: { profileId: userId },
          include: { group: true },
        })
      ]);

      const lifetimeValue = orders.reduce(
        (sum, order) => sum + Number(order.totalAmount || 0),
        0
      );
      const orderCount = orders.length;

      return {
        lifetimeValue,
        orderCount,
        recentActivity: activities,
        segments: customer?.group ? [customer.group] : [],
      };
    } catch (e) {
      console.error("Failed to get CRM stats:", e);
      return {
        lifetimeValue: 0,
        orderCount: 0,
        recentActivity: [],
        segments: []
      };
    }
  }
}

