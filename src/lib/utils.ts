import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns';
import { CURRENCY } from '@/config/constants';

// ─── Class Names ─────────────────────────────────────────────────
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─── Currency Formatting ─────────────────────────────────────────
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat(CURRENCY.locale, {
    style: 'currency',
    currency: CURRENCY.code,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

// ─── Date Formatting ─────────────────────────────────────────────
export function formatDate(date: string | Date): string {
  const d = new Date(date);
  return format(d, 'dd MMM yyyy');
}

export function formatDateTime(date: string | Date): string {
  const d = new Date(date);
  return format(d, 'dd MMM yyyy, hh:mm a');
}

export function formatRelativeDate(date: string | Date): string {
  const d = new Date(date);
  if (isToday(d)) return `Today, ${format(d, 'hh:mm a')}`;
  if (isYesterday(d)) return `Yesterday, ${format(d, 'hh:mm a')}`;
  return format(d, 'dd MMM yyyy, hh:mm a');
}

export function formatTimeAgo(date: string | Date): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

// ─── Number Formatting ──────────────────────────────────────────
export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-IN').format(num);
}

export function formatCompactNumber(num: number): string {
  if (num >= 10000000) return `${(num / 10000000).toFixed(1)}Cr`;
  if (num >= 100000) return `${(num / 100000).toFixed(1)}L`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

// ─── String Utilities ────────────────────────────────────────────
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + '…';
}

// ─── Status Colors ──────────────────────────────────────────────
export function getOrderStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    accepted: 'bg-blue-50 text-blue-700 border-blue-200',
    packed: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    out_for_delivery: 'bg-purple-50 text-purple-700 border-purple-200',
    delivered: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    cancelled: 'bg-red-50 text-red-700 border-red-200',
  };
  return colors[status] ?? 'bg-gray-50 text-gray-700 border-gray-200';
}

export function getPaymentStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    failed: 'bg-red-50 text-red-700 border-red-200',
    refunded: 'bg-blue-50 text-blue-700 border-blue-200',
  };
  return colors[status] ?? 'bg-gray-50 text-gray-700 border-gray-200';
}

export function getSubscriptionStatusColor(status: string): string {
  const colors: Record<string, string> = {
    active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    paused: 'bg-amber-50 text-amber-700 border-amber-200',
    cancelled: 'bg-red-50 text-red-700 border-red-200',
    expired: 'bg-gray-50 text-gray-700 border-gray-200',
  };
  return colors[status] ?? 'bg-gray-50 text-gray-700 border-gray-200';
}

// ─── File Utilities ──────────────────────────────────────────────
export function getFileExtension(filename: string): string {
  return filename.slice(filename.lastIndexOf('.') + 1).toLowerCase();
}

export function generateStoragePath(
  _bucket: string,
  filename: string,
  prefix?: string
): string {
  const timestamp = Date.now();
  const ext = getFileExtension(filename);
  const safeName = slugify(filename.replace(`.${ext}`, ''));
  const path = prefix
    ? `${prefix}/${timestamp}-${safeName}.${ext}`
    : `${timestamp}-${safeName}.${ext}`;
  return path;
}
