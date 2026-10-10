import { CustomerRepository } from "@/lib/repositories/customer.repository";
import {
  CustomerProfile,
  CustomerAddress,
  CustomerNotification,
} from "@/types/customer.types";

export class CustomerService {
  private repository: CustomerRepository;

  constructor() {
    this.repository = new CustomerRepository();
  }

  async getProfile(userId: string): Promise<CustomerProfile | null> {
    return this.repository.getProfile(userId);
  }

  async updateProfile(
    userId: string,
    updates: Partial<CustomerProfile>
  ): Promise<CustomerProfile> {
    return this.repository.updateProfile(userId, {
      ...updates,
      updated_at: new Date().toISOString(),
    });
  }

  async getAddresses(userId: string): Promise<CustomerAddress[]> {
    return this.repository.getAddresses(userId);
  }

  async createAddress(
    userId: string,
    addressData: Omit<
      CustomerAddress,
      "id" | "customer_id" | "created_at" | "updated_at"
    >
  ): Promise<CustomerAddress> {
    // If setting as default, we might need to unset others, but let's keep it simple or assume DB handles it
    // Real-world: if is_default_shipping is true, unset other addresses for this user
    if (addressData.is_default_shipping) {
      const addresses = await this.getAddresses(userId);
      const defaultShipping = addresses.find((a) => a.is_default_shipping);
      if (defaultShipping) {
        await this.repository.updateAddress(defaultShipping.id, userId, {
          is_default_shipping: false,
        });
      }
    }

    if (addressData.is_default_billing) {
      const addresses = await this.getAddresses(userId);
      const defaultBilling = addresses.find((a) => a.is_default_billing);
      if (defaultBilling) {
        await this.repository.updateAddress(defaultBilling.id, userId, {
          is_default_billing: false,
        });
      }
    }

    return this.repository.createAddress({
      ...addressData,
      customer_id: userId,
    });
  }

  async updateAddress(
    id: string,
    userId: string,
    updates: Partial<CustomerAddress>
  ): Promise<CustomerAddress> {
    return this.repository.updateAddress(id, userId, updates);
  }

  async deleteAddress(id: string, userId: string): Promise<void> {
    return this.repository.deleteAddress(id, userId);
  }

  async getNotifications(userId: string): Promise<CustomerNotification[]> {
    return this.repository.getNotifications(userId);
  }

  async getUnreadNotificationCount(userId: string): Promise<number> {
    const notifications = await this.getNotifications(userId);
    return notifications.filter((n) => !n.is_read).length;
  }

  async markNotificationAsRead(id: string, userId: string): Promise<void> {
    return this.repository.markNotificationAsRead(id, userId);
  }

  async getReviews(userId: string) {
    return this.repository.getReviews(userId);
  }

  async getTickets(userId: string) {
    return this.repository.getTickets(userId);
  }

  async createTicket(userId: string, ticketData: any) {
    return this.repository.createTicket({
      ...ticketData,
      user_id: userId,
    });
  }

  async getTicketDetails(ticketId: string, userId: string) {
    return this.repository.getTicketDetails(ticketId, userId);
  }

  async replyTicket(ticketId: string, userId: string, message: string) {
    return this.repository.replyTicket(ticketId, userId, message);
  }

  async getLoginHistory(userId: string) {
    return this.repository.getLoginHistory(userId);
  }

  async getActiveSessions(userId: string) {
    return this.repository.getActiveSessions(userId);
  }

  async getWishlists(userId: string) {
    return this.repository.getWishlists(userId);
  }

  async deactivateProfile(userId: string, reason?: string) {
    const { CustomerService: CanonicalCustomerService } = await import("@/services/customer.service");
    return CanonicalCustomerService.deactivateProfile(userId, reason);
  }

  async deleteProfile(userId: string) {
    const { CustomerService: CanonicalCustomerService } = await import("@/services/customer.service");
    return CanonicalCustomerService.deleteProfile(userId);
  }
}

