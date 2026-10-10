import { OrderService } from "@/lib/services/oms/order.service";
import { OrderRepository } from "@/lib/repositories/oms/order.repository";
import { OrderItemsRepository } from "@/lib/repositories/oms/order-items.repository";
import { CreateOrderInput } from "@/lib/validations/oms";

// Mock dependencies
jest.mock("@/lib/repositories/oms/order.repository");
jest.mock("@/lib/repositories/oms/order-items.repository");

describe("Order Workflow (OrderService)", () => {
  let orderService: OrderService;
  let mockOrderRepo: jest.Mocked<OrderRepository>;
  let mockOrderItemsRepo: jest.Mocked<OrderItemsRepository>;

  beforeEach(() => {
    mockOrderRepo = new OrderRepository() as jest.Mocked<OrderRepository>;
    mockOrderItemsRepo =
      new OrderItemsRepository() as jest.Mocked<OrderItemsRepository>;

    // Inject mocks via constructor or override private properties for testing
    // Since we instantiated them internally, we can mock the class prototypes
    orderService = new OrderService();
    (orderService as any).orderRepo = mockOrderRepo;
    (orderService as any).orderItemsRepo = mockOrderItemsRepo;
  });

  describe("createOrder()", () => {
    it("should create an order in draft state and attach items", async () => {
      const mockInput: CreateOrderInput = {
        subtotal: 100,
        tax_total: 10,
        shipping_total: 5,
        discount_total: 0,
        grand_total: 115,
        currency: "USD",
        items: [
          {
            product_id: "p1",
            sku: "SKU1",
            product_name: "Test Product",
            unit_price: 100,
            quantity: 1,
            discount: 0,
            tax: 10,
            line_total: 110,
          },
        ],
      };

      const mockOrderResponse = {
        id: "o1",
        status: "draft",
        order_number: "ORD-TEST",
      };

      mockOrderRepo.createOrder.mockResolvedValue(mockOrderResponse as any);
      mockOrderItemsRepo.createOrderItems.mockResolvedValue([]);

      const result = await orderService.createOrder(mockInput);

      expect(result).toBeDefined();
      expect(result.id).toBe("o1");
      expect(mockOrderRepo.createOrder).toHaveBeenCalled();
      expect(mockOrderItemsRepo.createOrderItems).toHaveBeenCalledTimes(1);
    });
  });

  describe("updateOrderStatus()", () => {
    it("should throw error on invalid transition", async () => {
      mockOrderRepo.getOrderById.mockResolvedValue({
        id: "o1",
        status: "draft",
      } as any);

      await expect(
        orderService.updateOrderStatus("o1", "shipped")
      ).rejects.toThrow("Invalid status transition from draft to shipped");
    });

    it("should succeed on valid transition", async () => {
      mockOrderRepo.getOrderById.mockResolvedValue({
        id: "o1",
        status: "paid",
      } as any);
      mockOrderRepo.updateOrderStatus.mockResolvedValue({
        id: "o1",
        status: "confirmed",
      } as any);

      const result = await orderService.updateOrderStatus("o1", "confirmed");
      expect(result.status).toBe("confirmed");
      expect(mockOrderRepo.updateOrderStatus).toHaveBeenCalledWith(
        "o1",
        "confirmed",
        undefined
      );
    });
  });
});
