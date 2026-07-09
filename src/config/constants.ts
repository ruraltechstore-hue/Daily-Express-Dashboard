// ─── Application Constants ───────────────────────────────────────
export const APP_NAME = 'Daily Express';
export const APP_DESCRIPTION = 'Dairy Home Delivery Admin Dashboard';

// ─── Pagination ──────────────────────────────────────────────────
export const DEFAULT_PAGE_SIZE = 10;
export const PAGE_SIZE_OPTIONS = [10, 20, 30, 50] as const;

// ─── Image Upload ────────────────────────────────────────────────
export const MAX_IMAGE_SIZE_MB = 5;
export const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024;
export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const IMAGE_COMPRESSION_OPTIONS = {
  maxSizeMB: 1,
  maxWidthOrHeight: 1920,
  useWebWorker: true,
} as const;

// ─── Supabase Storage Buckets ────────────────────────────────────
export const STORAGE_BUCKETS = {
  CATEGORIES: 'categories',
  PRODUCTS: 'products',
  AVATARS: 'avatars',
  BANNERS: 'banners',
} as const;

// ─── Order Status Flow ───────────────────────────────────────────
export const ORDER_STATUS_FLOW = [
  'pending',
  'accepted',
  'packed',
  'out_for_delivery',
  'delivered',
] as const;

export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  accepted: 'Accepted',
  packed: 'Packed',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cod: 'Cash on Delivery',
  razorpay: 'Razorpay',
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  success: 'Success',
  failed: 'Failed',
  refunded: 'Refunded',
};

export const SUBSCRIPTION_FREQUENCY_LABELS: Record<string, string> = {
  daily: 'Daily',
  alternate_days: 'Alternate Days',
  weekly: 'Weekly',
  custom: 'Custom',
};

export const SUBSCRIPTION_STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  paused: 'Paused',
  cancelled: 'Cancelled',
  expired: 'Expired',
};

// ─── Currency ────────────────────────────────────────────────────
export const CURRENCY = {
  code: 'INR',
  symbol: '₹',
  locale: 'en-IN',
} as const;
