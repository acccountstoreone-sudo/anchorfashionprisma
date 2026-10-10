import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getOrderDetailsAction,
  updateOrderStatusAction,
} from "@/app/actions/oms/order.actions";
import { UpdateOrderStatusInput } from "@/lib/validations/oms";

export function useOrderDetails(orderId: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["order", orderId],
    queryFn: async () => {
      const response = await getOrderDetailsAction(orderId);
      if (!response.success) throw new Error(response.error);
      return response.data;
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (data: UpdateOrderStatusInput) => {
      const response = await updateOrderStatusAction(data);
      if (!response.success) throw new Error(response.error);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order", orderId] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });

  return {
    order: query.data,
    isLoading: query.isLoading,
    error: query.error,
    updateStatus: updateStatusMutation.mutateAsync,
    isUpdatingStatus: updateStatusMutation.isPending,
  };
}
