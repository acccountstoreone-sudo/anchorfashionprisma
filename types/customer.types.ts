export interface CustomerProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  phone: string | null;
  date_of_birth: string | null;
  gender: "MALE" | "FEMALE" | "OTHER" | "PREFER_NOT_TO_SAY" | null;
  avatar_url: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CustomerAddress {
  id: string;
  customer_id: string;
  title: string | null;
  first_name: string;
  last_name: string;
  phone: string;
  address_line_1: string;
  address_line_2: string | null;
  city: string;
  state: string | null;
  zip: string;
  country: string;
  is_default_shipping: boolean;
  is_default_billing: boolean;
  created_at: string;
  updated_at: string;
}

export interface CustomerWallet {
  id: string;
  customer_id: string;
  balance: number;
  currency: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WalletTransaction {
  id: string;
  wallet_id: string;
  type: "CREDIT" | "DEBIT";
  amount: number;
  balance_after: number;
  reference_type: string;
  reference_id: string | null;
  description: string | null;
  created_at: string;
}

export interface LoyaltyAccount {
  id: string;
  customer_id: string;
  tier: "SILVER" | "GOLD" | "PLATINUM" | "VIP";
  points_balance: number;
  total_points_earned: number;
  total_points_redeemed: number;
  tier_updated_at: string;
  created_at: string;
  updated_at: string;
}

export interface LoyaltyTransaction {
  id: string;
  loyalty_account_id: string;
  type: "EARN" | "REDEEM" | "EXPIRE" | "ADJUSTMENT";
  points: number;
  description: string | null;
  reference_type: string | null;
  reference_id: string | null;
  created_at: string;
}

export interface CustomerReview {
  id: string;
  customer_id: string;
  product_id: string;
  order_id: string | null;
  rating: number;
  title: string | null;
  review_text: string | null;
  images: string[] | null;
  is_approved: boolean;
  helpful_votes: number;
  created_at: string;
  updated_at: string;
}

export interface CustomerNotification {
  id: string;
  customer_id: string;
  type: "ORDER_UPDATE" | "PROMOTION" | "SYSTEM" | "SUPPORT" | "SECURITY";
  title: string;
  message: string;
  action_url: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

export interface CustomerDevice {
  id: string;
  customer_id: string;
  device_name: string | null;
  device_type: string | null;
  os: string | null;
  browser: string | null;
  ip_address: string | null;
  is_trusted: boolean;
  last_active: string;
  created_at: string;
}

export interface LoginHistory {
  id: string;
  user_id: string;
  email: string | null;
  ip_address: string | null;
  user_agent: string | null;
  device_fingerprint: string | null;
  location: string | null;
  status: "SUCCESS" | "FAILURE" | "BLOCKED" | "FAILED";
  failure_reason: string | null;
  attempted_at?: string;
  created_at?: string;
}

export interface ActiveSession {
  id: string;
  user_id: string;
  token_hash: string;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  last_active_at: string;
  expires_at: string;
}

export interface Wishlist {
  id: string;
  user_id: string;
  name: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface WishlistItem {
  id: string;
  wishlist_id: string | null;
  user_id: string | null;
  product_id: string;
  variant_id: string | null;
  added_at?: string;
  created_at?: string;
}
