import { QueryClient } from "@tanstack/react-query";

/**
 * Enterprise Optimistic Update Helper
 * Generates the onMutate, onError, and onSettled functions for useMutation
 */
export function getOptimisticUpdateHelpers<T>(
  queryClient: QueryClient,
  queryKey: unknown[],
  updater: (oldData: T | undefined) => T
) {
  return {
    onMutate: async () => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey });

      // Snapshot the previous value
      const previousData = queryClient.getQueryData<T>(queryKey);

      // Optimistically update to the new value
      queryClient.setQueryData<T>(queryKey, updater);

      // Return a context object with the snapshotted value
      return { previousData };
    },
    onError: (err: any, newTodo: any, context: any) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
    },
    onSettled: () => {
      // Always refetch after error or success to sync with server
      queryClient.invalidateQueries({ queryKey });
    },
  };
}

/**
 * Standard Cache Invalidator
 */
export function invalidateEntityCache(
  queryClient: QueryClient,
  entityName: string
) {
  return queryClient.invalidateQueries({ queryKey: [entityName] });
}
