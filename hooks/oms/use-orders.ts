import { useQuery } from "@tanstack/react-query";
import { fetchOrdersAction, fetchOrderMetricsAction } from "@/app/actions/oms/order.actions";

export function useOrders(params: {
  customerId?: string;
  status?: any;
  paymentMethod?: string;
  paymentStatus?: string;
  search?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: ["orders", params],
    queryFn: async () => {
      const response = await fetchOrdersAction(params);
      if (!response.success) {
        throw new Error(response.error);
      }
      return response.data;
    },
  });
}

export function useOrderMetrics() {
  return useQuery({
    queryKey: ["order-metrics"],
    queryFn: async () => {
      const response = await fetchOrderMetricsAction();
      if (!response.success) {
        throw new Error(response.error);
      }
      return response.data;
    },
    staleTime: 30000,
  });
}
