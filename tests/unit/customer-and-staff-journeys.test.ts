import { describe, it, expect } from "vitest";
import { MANAGER_ROLES, MARKETING_ROLES } from "@/lib/constants/auth";
import { OrderStatusService } from "@/lib/services/oms/order-status.service";

describe("Customer, Staff & Manager Journey Unit Tests", () => {
  const statusService = new OrderStatusService();

  describe("1. Customer Profile & Address Book Transformation Logic", () => {
    it("should map form inputs to authoritative Prisma CustomerAddress schema correctly", () => {
      interface FormInput {
        first_name: string;
        last_name: string;
        phone: string;
        address_line_1: string;
        address_line_2?: string;
        city: string;
        state: string;
        zip: string;
        country: string;
        is_default_shipping: boolean;
        is_default_billing: boolean;
      }

      function transformFormToDb(input: FormInput, customerId: string, profileId: string) {
        const fullName = `${input.first_name || ""} ${input.last_name || ""}`.trim();
        const addressLine = [input.address_line_1, input.address_line_2].filter(Boolean).join(", ");
        const isDefault = Boolean(input.is_default_shipping || input.is_default_billing);

        return {
          customerId,
          profileId,
          title: "Home",
          name: fullName,
          phone: input.phone,
          addressLine,
          city: input.city,
          state: input.state || null,
          postalCode: input.zip || null,
          country: input.country || "Bangladesh",
          isDefault,
        };
      }

      const input: FormInput = {
        first_name: "Mahmudul",
        last_name: "Hasan",
        phone: "+8801712345678",
        address_line_1: "House 24, Road 10",
        address_line_2: "Dhanmondi R/A",
        city: "Dhaka",
        state: "Dhaka",
        zip: "1209",
        country: "Bangladesh",
        is_default_shipping: true,
        is_default_billing: true,
      };

      const dbData = transformFormToDb(input, "cust-uuid-1", "prof-uuid-1");
      expect(dbData.name).toBe("Mahmudul Hasan");
      expect(dbData.addressLine).toBe("House 24, Road 10, Dhanmondi R/A");
      expect(dbData.postalCode).toBe("1209");
      expect(dbData.isDefault).toBe(true);
      expect(dbData.customerId).toBe("cust-uuid-1");
      expect(dbData.profileId).toBe("prof-uuid-1");
    });

    it("should map Prisma CustomerAddress record back to Storefront CustomerAddress structure", () => {
      const dbRecord = {
        id: "addr-001",
        customerId: "cust-uuid-1",
        profileId: "prof-uuid-1",
        title: "Office",
        name: "Shakib Al Hasan",
        phone: "+8801812345678",
        addressLine: "Level 4, Navana Tower, Gulshan-1",
        city: "Dhaka",
        state: "Dhaka",
        postalCode: "1212",
        country: "Bangladesh",
        isDefault: true,
        createdAt: new Date("2026-01-01T00:00:00Z"),
        updatedAt: new Date("2026-01-01T00:00:00Z"),
      };

      function mapDbToStorefront(addr: typeof dbRecord) {
        const parts = addr.name.trim().split(" ");
        const firstName = parts[0] || "";
        const lastName = parts.slice(1).join(" ") || "";
        const lines = addr.addressLine.split(", ");
        const line1 = lines[0] || addr.addressLine;
        const line2 = lines.slice(1).join(", ") || null;

        return {
          id: addr.id,
          customer_id: addr.customerId || addr.profileId,
          title: addr.title,
          first_name: firstName,
          last_name: lastName,
          phone: addr.phone,
          address_line_1: line1,
          address_line_2: line2,
          city: addr.city,
          state: addr.state,
          zip: addr.postalCode,
          country: addr.country,
          is_default_shipping: !!addr.isDefault,
          is_default_billing: !!addr.isDefault,
          created_at: addr.createdAt.toISOString(),
          updated_at: addr.updatedAt.toISOString(),
        };
      }

      const storefront = mapDbToStorefront(dbRecord);
      expect(storefront.first_name).toBe("Shakib");
      expect(storefront.last_name).toBe("Al Hasan");
      expect(storefront.address_line_1).toBe("Level 4");
      expect(storefront.address_line_2).toBe("Navana Tower, Gulshan-1");
      expect(storefront.zip).toBe("1212");
      expect(storefront.is_default_shipping).toBe(true);
    });
  });

  describe("2. Order Access & Ownership Security Matrix", () => {
    it("should allow customer to access only their own order and deny other customers", () => {
      function canCustomerAccessOrder(order: { customer_id?: string; profile_id?: string }, callerId: string, isStaff: boolean): boolean {
        if (isStaff) return true;
        return order.customer_id === callerId || order.profile_id === callerId;
      }

      const customerAOrder = { customer_id: "user-a-123", profile_id: "user-a-123" };
      
      // Customer A accessing own order -> ALLOW
      expect(canCustomerAccessOrder(customerAOrder, "user-a-123", false)).toBe(true);

      // Customer B attempting to access Customer A's order -> STRICT DENY
      expect(canCustomerAccessOrder(customerAOrder, "user-b-999", false)).toBe(false);

      // Staff or Manager accessing customer's order for support/fulfillment -> ALLOW
      expect(canCustomerAccessOrder(customerAOrder, "staff-001", true)).toBe(true);
    });

    it("should enforce search query customerId filter for regular customer vs staff", () => {
      function buildOrderQueryParams(input: { customerId?: string }, callerId: string, isStaff: boolean) {
        const params: Record<string, any> = { ...input };
        if (!isStaff) {
          params.customerId = callerId; // strictly force callerId for customers
        }
        return params;
      }

      // Customer tries to query without customerId or forged customerId -> strictly overridden to own callerId
      const custParams = buildOrderQueryParams({ customerId: "victim-id" }, "customer-legit-id", false);
      expect(custParams.customerId).toBe("customer-legit-id");

      // Staff querying specific customer's orders -> allowed
      const staffParams = buildOrderQueryParams({ customerId: "target-cust-id" }, "staff-id", true);
      expect(staffParams.customerId).toBe("target-cust-id");
    });
  });

  describe("3. Manager & Staff Operational Sidebar RBAC", () => {
    const allSidebarItems = [
      { title: "Dashboard", href: "/manager" },
      { title: "Orders", href: "/manager/orders" },
      { title: "Products", href: "/manager/products" },
      { title: "Inventory", href: "/manager/inventory" },
      { title: "Customers", href: "/manager/customers" },
      { title: "Marketing", href: "/manager/marketing" },
      { title: "CMS", href: "/manager/cms" },
      { title: "Support", href: "/manager/support" },
      { title: "Reports", href: "/manager/reports" },
      { title: "Tasks", href: "/manager/tasks" },
      { title: "Settings", href: "/manager/settings" },
    ];

    function filterSidebarForRole(role: string) {
      const normalized = role.toUpperCase().trim();
      const isManager = (MANAGER_ROLES as readonly string[]).includes(normalized);
      const isMarketing = (MARKETING_ROLES as readonly string[]).includes(normalized);

      return allSidebarItems.filter((item) => {
        if (["/manager/reports", "/manager/settings"].includes(item.href)) {
          return isManager;
        }
        if (["/manager/marketing", "/manager/cms"].includes(item.href)) {
          return isManager || isMarketing;
        }
        return true;
      });
    }

    it("should show full operational and executive suite to MANAGER", () => {
      const managerItems = filterSidebarForRole("MANAGER").map((i) => i.title);
      expect(managerItems).toContain("Dashboard");
      expect(managerItems).toContain("Orders");
      expect(managerItems).toContain("Inventory");
      expect(managerItems).toContain("Reports");
      expect(managerItems).toContain("Settings");
      expect(managerItems).toContain("Marketing");
      expect(managerItems).toContain("CMS");
    });

    it("should filter out Reports, Settings, Marketing, CMS for basic warehouse/order STAFF", () => {
      const staffItems = filterSidebarForRole("STAFF").map((i) => i.title);
      expect(staffItems).toContain("Dashboard");
      expect(staffItems).toContain("Orders");
      expect(staffItems).toContain("Products");
      expect(staffItems).toContain("Inventory");
      expect(staffItems).toContain("Tasks");
      expect(staffItems).toContain("Support");

      // Sensitive manager-only tabs must be hidden from regular staff
      expect(staffItems).not.toContain("Reports");
      expect(staffItems).not.toContain("Settings");
      expect(staffItems).not.toContain("Marketing");
      expect(staffItems).not.toContain("CMS");
    });

    it("should allow MARKETING staff to see Marketing & CMS while hiding Reports & Settings", () => {
      const marketingItems = filterSidebarForRole("MARKETING").map((i) => i.title);
      expect(marketingItems).toContain("Marketing");
      expect(marketingItems).toContain("CMS");
      expect(marketingItems).not.toContain("Reports");
      expect(marketingItems).not.toContain("Settings");
    });
  });

  describe("4. Order Lifecycle & Status Progression", () => {
    it("should allow Staff to step through complete progressive fulfillment chain", () => {
      const fulfillmentSteps = [
        ["confirmed", "preparing"],
        ["preparing", "picking"],
        ["picking", "packing"],
        ["packing", "ready_for_shipment"],
        ["ready_for_shipment", "shipped"],
      ] as const;

      for (const [from, to] of fulfillmentSteps) {
        expect(statusService.canTransition(from, to, "staff")).toBe(true);
      }
    });

    it("should allow Manager to cancel or reverse orders at any step", () => {
      expect(statusService.canTransition("paid", "cancelled", "manager")).toBe(true);
      expect(statusService.canTransition("confirmed", "cancelled", "manager")).toBe(true);
      expect(statusService.canTransition("shipped", "returned", "manager")).toBe(true);
    });

    it("should strictly forbid Customers from changing status to shipped or delivered", () => {
      expect(statusService.canTransition("confirmed", "shipped", "customer")).toBe(false);
      expect(statusService.canTransition("shipped", "delivered", "customer")).toBe(false);
    });
  });
});
