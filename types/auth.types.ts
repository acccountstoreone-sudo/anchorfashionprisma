export type Role =
  | "SUPERADMIN"
  | "MANAGER"
  | "CUSTOMER"
  | "SUPPORT"
  | "MARKETING"
  | "WAREHOUSE_MANAGER"
  | "FINANCE_MANAGER";

export interface Permission {
  id: string;
  action: string;
  description: string;
  created_at: string;
}

export interface UserProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  role_id: string;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  name: Role;
  description: string;
}

export interface UserSession {
  id: string;
  user_id: string;
  device_id?: string;
  session_token: string;
  ip_address?: string;
  user_agent?: string;
  is_active: boolean;
  last_active_at: string;
  expires_at: string;
  created_at: string;
}

export interface AuthUserContext {
  user: UserProfile | null;
  role: UserRole | null;
  permissions: string[];
  session: UserSession | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
