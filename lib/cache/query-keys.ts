/**
 * Enterprise Query Key Factory
 * Standardizes TanStack Query cache keys to prevent typos and ensure
 * consistent invalidation across the app.
 */
export const QueryKeys = {
  // Base entities
  users: {
    all: ["users"] as const,
    lists: () => [...QueryKeys.users.all, "list"] as const,
    list: (filters: string) =>
      [...QueryKeys.users.lists(), { filters }] as const,
    details: () => [...QueryKeys.users.all, "detail"] as const,
    detail: (id: string) => [...QueryKeys.users.details(), id] as const,
  },

  // Generic Entity Key Factory Generator
  createEntityKey: (entityName: string) => ({
    all: [entityName] as const,
    lists: () => [entityName, "list"] as const,
    list: (filters?: Record<string, any>) =>
      [entityName, "list", { filters }] as const,
    details: () => [entityName, "detail"] as const,
    detail: (id: string) => [entityName, "detail", id] as const,
  }),
};
