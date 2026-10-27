// ─── Database Types ──────────────────────────────────────────────
// Hand-crafted to match the Supabase schema exactly.

// ─── Enums ───────────────────────────────────────────────────────
export type AppRole = 'admin' | 'customer' | 'delivery';
export type OrderStatus = 'pending' | 'accepted' | 'packed' | 'out_for_delivery' | 'delivered' | 'cancelled';
export type PaymentMethod = 'cod' | 'razorpay';
export type PaymentStatus = 'pending' | 'success' | 'failed' | 'refunded';
export type NotificationType = 'new_order' | 'order_accepted' | 'payment_success' | 'out_for_delivery' | 'delivered' | 'order_delivered' | 'payout_credited';
export type DevicePlatform = 'android' | 'ios' | 'web';
export type SubFrequency = 'daily' | 'alternate_days' | 'weekly' | 'custom';
export type SubStatus = 'active' | 'paused' | 'cancelled' | 'expired';
export type AuditAction = 'create' | 'update' | 'delete' | 'login' | 'logout' | 'assign' | 'cancel' | 'refund' | 'activate' | 'deactivate';
export type WithdrawalStatus = 'pending' | 'processing' | 'completed' | 'rejected';
export type PayoutMethodType = 'upi' | 'bank';
export type DeliveryPartnerStatus = 'pending' | 'approved' | 'rejected' | 'suspended';
export type DeliveryTransactionType = 'earning' | 'withdrawal' | 'penalty' | 'cash_collected' | 'doorstep_upi' | 'cash_deposit' | 'cash_offset' | 'refund';

// ─── Tables ──────────────────────────────────────────────────────

export interface Profile {
  id: string;
  role: AppRole;
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
  fcm_token: string | null;
  device_platform: DevicePlatform | null;
  is_online: boolean;
  last_seen: string | null;
  current_latitude: number | null;
  current_longitude: number | null;
  active_order_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  sort_order: number;
  active: boolean;
  created_at: string;
  updated_at: string;
  // Joined
  products?: { count: number }[];
}

export interface Product {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  price: number;
  unit: string;
  stock: number;
  active: boolean;
  created_at: string;
  updated_at: string;
  shelf_life?: string | null;
  storage_instructions?: string | null;
  nutritional_info?: {
    fat?: number;
    protein?: number;
    carbs?: number;
    energy?: number;
  } | null;
  // Joined
  category?: Category;
  images?: ProductImage[];
}

export interface ProductImage {
  id: string;
  product_id: string;
  image_url: string;
  alt_text: string | null;
  sort_order: number;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

export interface Address {
  id: string;
  customer_id: string;
  label: string;
  full_name: string;
  phone: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  pincode: string;
  latitude: number | null;
  longitude: number | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface OrderAddress {
  id: string;
  address_id: string | null;
  full_name: string;
  phone: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  pincode: string;
  latitude: number | null;
  longitude: number | null;
  label: string | null;
  created_at: string;
}

export interface Order {
  id: string;
  order_number: string;
  customer_id: string;
  delivery_boy_id: string | null;
  order_address_id: string;
  subscription_id: string | null;
  subtotal: number;
  delivery_charge: number;
  total: number;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  order_status: OrderStatus;
  notes: string | null;
  accepted_at: string | null;
  packed_at: string | null;
  dispatched_at: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  customer?: Profile;
  delivery_boy?: Profile;
  order_address?: OrderAddress;
  order_items?: OrderItem[];
  status_history?: OrderStatusHistory[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  product_unit: string;
  unit_price: number;
  quantity: number;
  line_total: number;
  created_at: string;
  updated_at: string;
}

export interface OrderStatusHistory {
  id: string;
  order_id: string;
  changed_by: string | null;
  old_status: OrderStatus | null;
  new_status: OrderStatus;
  note: string | null;
  created_at: string;
  // Joined
  changed_by_profile?: Profile;
}

export interface Payment {
  id: string;
  order_id: string;
  razorpay_order_id: string;
  razorpay_payment_id: string | null;
  razorpay_signature: string | null;
  amount: number;
  currency: string;
  status: PaymentStatus;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  order_id: string | null;
  type: NotificationType;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  device_platform: DevicePlatform | null;
  device_token: string | null;
  is_read: boolean;
  read_at: string | null;
  sent_at: string | null;
  failed_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string | null;
  delivery_charge: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Subscription {
  id: string;
  customer_id: string;
  plan_id: string | null;
  address_id: string;
  frequency: SubFrequency;
  custom_days: number[] | null;
  start_date: string;
  end_date: string | null;
  status: SubStatus;
  payment_method: PaymentMethod;
  delivery_charge: number;
  notes: string | null;
  next_order_date: string;
  last_order_date: string | null;
  total_orders_generated: number;
  paused_until: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  customer?: Profile;
  plan?: SubscriptionPlan;
  address?: Address;
  items?: SubscriptionItem[];
}

export interface SubscriptionItem {
  id: string;
  subscription_id: string;
  product_id: string;
  quantity: number;
  created_at: string;
  updated_at: string;
  // Joined
  product?: Product;
}

export interface AuditLog {
  id: string;
  actor_id: string | null;
  actor_role: AppRole | null;
  action: AuditAction;
  table_name: string;
  record_id: string | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  note: string | null;
  created_at: string;
  // Joined
  actor?: Profile;
}

export interface DeliveryWallet {
  id: string;
  balance: number;
  total_earned: number;
  total_withdrawn: number;
  cash_in_hand: number;
  updated_at: string;
}

export interface DeliveryPartner {
  id: string;
  status: DeliveryPartnerStatus;
  vehicle_type: string;
  vehicle_number: string;
  driving_license: string;
  vehicle_image?: string | null;
  driving_license_image?: string | null;
  created_at: string;
  updated_at: string;
}

export interface DeliveryPayoutMethod {
  id: string;
  delivery_boy_id: string;
  method_type: PayoutMethodType;
  upi_id?: string | null;
  account_number?: string | null;
  ifsc_code?: string | null;
  account_holder_name?: string | null;
  bank_name?: string | null;
  is_primary: boolean;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface DeliveryTransaction {
  id: string;
  delivery_boy_id: string;
  amount: number;
  type: DeliveryTransactionType;
  description: string | null;
  order_id: string | null;
  created_at: string;
  // Joined
  order?: {
    id: string;
    order_number: string;
  };
}

export interface DeliveryWithdrawalRequest {
  id: string;
  request_number: string;
  delivery_boy_id: string;
  amount: number;
  payout_method_type: PayoutMethodType;
  payout_details: {
    method: 'upi' | 'bank';
    upi_id?: string;
    account_number?: string;
    full_account_number?: string;
    ifsc_code?: string;
    account_holder_name?: string;
    bank_name?: string;
  };
  status: WithdrawalStatus;
  transaction_reference: string | null;
  admin_notes: string | null;
  rejection_reason: string | null;
  created_at: string;
  processed_at: string | null;
  processed_by: string | null;
  // Joined
  delivery_boy?: Profile & {
    delivery_wallets?: DeliveryWallet | DeliveryWallet[];
    delivery_partners?: DeliveryPartner | DeliveryPartner[];
  };
  processed_by_admin?: Profile;
}

// ─── Insert/Update types ─────────────────────────────────────────

export type CategoryInsert = Omit<Category, 'id' | 'created_at' | 'updated_at'>;
export type CategoryUpdate = Partial<CategoryInsert>;

export type ProductInsert = Omit<Product, 'id' | 'created_at' | 'updated_at' | 'category' | 'images'>;
export type ProductUpdate = Partial<ProductInsert>;

export type ProductImageInsert = Omit<ProductImage, 'id' | 'created_at' | 'updated_at'>;

export type ProfileUpdate = Partial<Pick<Profile, 'full_name' | 'phone' | 'avatar_url' | 'is_active'>>;

// ─── API Response Types ──────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface DashboardStats {
  todayRevenue: number;
  todayOrders: number;
  pendingOrders: number;
  totalCustomers: number;
  revenueChange: number;
  ordersChange: number;
}

export interface RevenueDataPoint {
  date: string;
  revenue: number;
  orders: number;
}

export interface TopProduct {
  id: string;
  name: string;
  unit: string;
  totalQuantity: number;
  totalRevenue: number;
  image_url?: string;
}
