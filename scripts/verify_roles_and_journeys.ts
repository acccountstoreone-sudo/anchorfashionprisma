import { prisma } from "../lib/prisma";
import { CustomerRepository } from "../lib/repositories/customer.repository";
import { OrderRepository } from "../lib/repositories/oms/order.repository";
import { DashboardRepository } from "../lib/repositories/bi/dashboard.repository";
import { InventoryRepository } from "../repositories/inventory.repository";
import { OrderStatusService } from "../lib/services/oms/order-status.service";

async function verifyAllJourneys() {
  console.log("=================================================================");
  console.log("       ANCHOR FASHION - ROLES, OPERATIONS & JOURNEY VERIFIER     ");
  console.log("=================================================================\n");

  const results: { test: string; status: "PASS" | "FAIL"; details: string }[] = [];

  function record(test: string, passed: boolean, details: string) {
    results.push({ test, status: passed ? "PASS" : "FAIL", details });
    console.log(`${passed ? "✅ [PASS]" : "❌ [FAIL]"} ${test}: ${details}`);
  }

  // 1. Role Profiles verification
  const qaCustomer = await prisma.profile.findFirst({
    where: { email: "qa_customer@anchorfashion.com" },
    include: { role: true },
  });
  const qaStaff = await prisma.profile.findFirst({
    where: { email: "qa_staff@anchorfashion.com" },
    include: { role: true },
  });
  const qaManager = await prisma.profile.findFirst({
    where: { email: "qa_manager@anchorfashion.com" },
    include: { role: true },
  });

  record(
    "QA Customer Profile Exists",
    !!qaCustomer && qaCustomer.role?.name === "CUSTOMER",
    `ID: ${qaCustomer?.id}, Role: ${qaCustomer?.role?.name}`
  );
  record(
    "QA Staff Profile Exists",
    !!qaStaff && qaStaff.role?.name === "STAFF",
    `ID: ${qaStaff?.id}, Role: ${qaStaff?.role?.name}`
  );
  record(
    "QA Manager Profile Exists",
    !!qaManager && qaManager.role?.name === "MANAGER",
    `ID: ${qaManager?.id}, Role: ${qaManager?.role?.name}`
  );

  // 2. Customer Repository & Address Book Test
  const customerRepo = new CustomerRepository();
  if (qaCustomer) {
    try {
      const profile = await customerRepo.getProfile(qaCustomer.id);
      record(
        "Customer Profile Retrieval",
        !!profile && profile.email === qaCustomer.email,
        `Name: ${profile?.first_name} ${profile?.last_name}`
      );
    } catch (e: any) {
      record("Customer Profile Retrieval", false, e.message);
    }

    // Test creating an address using the format passed by customer action
    try {
      const createdAddr = await customerRepo.createAddress({
        customer_id: qaCustomer.id,
        first_name: "Test",
        last_name: "User",
        phone: "+8801700000010",
        address_line_1: "House 12, Road 4",
        address_line_2: "Apt 3B",
        city: "Dhaka",
        state: "Dhaka",
        zip: "1209",
        country: "BD",
        is_default_shipping: true,
        is_default_billing: true,
      } as any);

      record(
        "Customer Address Creation",
        !!createdAddr && !!createdAddr.id,
        `Created Address ID: ${createdAddr?.id}`
      );

      // Fetch addresses
      const list = await customerRepo.getAddresses(qaCustomer.id);
      record(
        "Customer Address Fetching",
        Array.isArray(list) && list.length > 0,
        `Found ${list.length} addresses`
      );

      // Clean up test address
      if (createdAddr?.id) {
        await customerRepo.deleteAddress(createdAddr.id, qaCustomer.id);
        record("Customer Address Cleanup", true, `Deleted test address ${createdAddr.id}`);
      }
    } catch (e: any) {
      record("Customer Address Creation / Fetching", false, `Exception: ${e.message}`);
    }
  }

  // 3. Order Management & Status Transitions
  const statusService = new OrderStatusService();
  record(
    "Staff Order Fulfillment Progression",
    statusService.canTransition("confirmed", "preparing", "staff") &&
      statusService.canTransition("preparing", "picking", "staff") &&
      statusService.canTransition("picking", "packing", "staff") &&
      statusService.canTransition("packing", "ready_for_shipment", "staff") &&
      statusService.canTransition("ready_for_shipment", "shipped", "staff"),
    "Staff allowed progressive fulfillment status steps"
  );

  record(
    "Manager Privileged Transition Override",
    statusService.canTransition("draft", "shipped", "manager") &&
      statusService.canTransition("paid", "cancelled", "manager"),
    "Manager override capability verified"
  );

  record(
    "Customer Denied Arbitrary Status Transition",
    !statusService.canTransition("draft", "shipped", "customer") &&
      !statusService.canTransition("confirmed", "delivered", "customer"),
    "Customer cannot forge fulfillment status"
  );

  // 4. Inventory Dashboard & Operations
  const invRepo = new InventoryRepository();
  try {
    const invDashboard = await invRepo.getInventoryDashboard(10);
    record(
      "Inventory Dashboard Data Query",
      !!invDashboard && typeof invDashboard.stats?.totalItems === "number",
      `Total items: ${invDashboard.stats?.totalItems}, Low stock: ${invDashboard.stats?.lowStock}`
    );
  } catch (e: any) {
    record("Inventory Dashboard Data Query", false, e.message);
  }

  // 5. BI Dashboard KPIs
  const dashRepo = new DashboardRepository();
  try {
    const kpis = await dashRepo.getDashboardKPIs();
    record(
      "Manager Dashboard KPIs Query",
      !!kpis && typeof kpis.revenue?.value === "number",
      `Revenue: ৳${kpis.revenue?.value}, Orders: ${kpis.orders?.value}`
    );
  } catch (e: any) {
    record("Manager Dashboard KPIs Query", false, e.message);
  }

  // 6. Orders Repository Query for Customer vs Staff
  const orderRepo = new OrderRepository();
  try {
    const allOrders = await orderRepo.getOrders({ limit: 5 });
    record(
      "Order Repository Query",
      Array.isArray(allOrders.data),
      `Found ${allOrders.data.length} total orders`
    );
  } catch (e: any) {
    record("Order Repository Query", false, e.message);
  }

  console.log("\n=================================================================");
  console.log(`SUMMARY: ${results.filter((r) => r.status === "PASS").length}/${results.length} PASSED`);
  console.log("=================================================================\n");
}

verifyAllJourneys()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
