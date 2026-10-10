/**
 * Base Request Interface
 * Extended by feature-specific Create/Update DTOs
 */
export interface BaseRequestDto {
  // Empty by default, allows generic constraints
}

/**
 * Base Response Interface
 * Extended by feature-specific Response DTOs sent to the Client
 */
export interface BaseResponseDto {
  id: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Base Entity Interface
 * Represents the shape of the database tables (snake_case)
 */
export interface BaseEntity {
  id: string;
  created_at: string;
  updated_at: string;
}

/**
 * Standard Paginated Response
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}
