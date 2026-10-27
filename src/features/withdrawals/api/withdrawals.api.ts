import { supabase } from '@/lib/supabase';
import type { DeliveryWithdrawalRequest, WithdrawalStatus, PayoutMethodType } from '@/types/database';

export interface WithdrawalFilters {
  page?: number;
  pageSize?: number;
  status?: WithdrawalStatus | 'all';
  method?: PayoutMethodType | 'all';
  search?: string;
  sortBy?: 'created_at' | 'amount';
  sortOrder?: 'asc' | 'desc';
}

export interface WithdrawalStats {
  pendingCount: number;
  pendingAmount: number;
  processingCount: number;
  processingAmount: number;
  completedCount: number;
  completedAmount: number;
  rejectedCount: number;
  highRiskCount: number; // Riders with floating cash > 500
}

export async function fetchWithdrawalRequests(filters: WithdrawalFilters = {}) {
  const {
    page = 1,
    pageSize = 10,
    status = 'all',
    method = 'all',
    search = '',
    sortBy = 'created_at',
    sortOrder = 'desc',
  } = filters;

  let query = supabase
    .from('delivery_withdrawal_requests')
    .select(`
      *,
      delivery_boy:profiles!delivery_withdrawal_requests_delivery_boy_id_fkey(
        id, full_name, phone, avatar_url,
        delivery_wallets(balance, total_earned, total_withdrawn, cash_in_hand),
        delivery_partners(status, vehicle_type, vehicle_number)
      ),
      processed_by_admin:profiles!delivery_withdrawal_requests_processed_by_fkey(
        id, full_name
      )
    `, { count: 'exact' });

  // Status Filter
  if (status && status !== 'all') {
    query = query.eq('status', status);
  }

  // Method Filter
  if (method && method !== 'all') {
    query = query.eq('payout_method_type', method);
  }

  // Search filter
  if (search.trim()) {
    const s = search.trim();
    query = query.or(`request_number.ilike.%${s}%,transaction_reference.ilike.%${s}%`);
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, count, error } = await query
    .order(sortBy, { ascending: sortOrder === 'asc' })
    .range(from, to);

  if (error) {
    console.error('Error fetching withdrawal requests:', error);
    throw error;
  }

  // Filter in-memory for delivery boy name or phone if searched
  let results = (data || []) as DeliveryWithdrawalRequest[];
  if (search.trim() && !results.length) {
    // If request_number or reference didn't match, search by rider name or phone
    const s = search.toLowerCase();
    const { data: allWithRider } = await supabase
      .from('delivery_withdrawal_requests')
      .select(`
        *,
        delivery_boy:profiles!delivery_withdrawal_requests_delivery_boy_id_fkey(
          id, full_name, phone, avatar_url,
          delivery_wallets(balance, total_earned, total_withdrawn, cash_in_hand),
          delivery_partners(status, vehicle_type, vehicle_number)
        ),
        processed_by_admin:profiles!delivery_withdrawal_requests_processed_by_fkey(
          id, full_name
        )
      `)
      .order(sortBy, { ascending: sortOrder === 'asc' });

    if (allWithRider) {
      results = (allWithRider as DeliveryWithdrawalRequest[]).filter((r) => {
        const matchesStatus = status === 'all' || r.status === status;
        const matchesMethod = method === 'all' || r.payout_method_type === method;
        const nameMatch = r.delivery_boy?.full_name?.toLowerCase().includes(s);
        const phoneMatch = r.delivery_boy?.phone?.includes(s);
        const reqMatch = r.request_number?.toLowerCase().includes(s);
        return matchesStatus && matchesMethod && (nameMatch || phoneMatch || reqMatch);
      });
      return {
        data: results.slice(from, to + 1),
        count: results.length,
      };
    }
  }

  return {
    data: results,
    count: count ?? 0,
  };
}

export async function fetchWithdrawalStats(): Promise<WithdrawalStats> {
  const { data, error } = await supabase
    .from('delivery_withdrawal_requests')
    .select(`
      amount, status,
      delivery_boy:profiles!delivery_withdrawal_requests_delivery_boy_id_fkey(
        delivery_wallets(cash_in_hand)
      )
    `);

  if (error) {
    console.error('Error fetching withdrawal stats:', error);
    throw error;
  }

  const stats: WithdrawalStats = {
    pendingCount: 0,
    pendingAmount: 0,
    processingCount: 0,
    processingAmount: 0,
    completedCount: 0,
    completedAmount: 0,
    rejectedCount: 0,
    highRiskCount: 0,
  };

  for (const item of data || []) {
    const amt = Number(item.amount) || 0;
    if (item.status === 'pending') {
      stats.pendingCount += 1;
      stats.pendingAmount += amt;

      const rider = item.delivery_boy as any;
      const wallet = Array.isArray(rider?.delivery_wallets)
        ? rider?.delivery_wallets[0]
        : rider?.delivery_wallets;
      const cashInHand = Number(wallet?.cash_in_hand) || 0;
      if (cashInHand > 500) {
        stats.highRiskCount += 1;
      }
    } else if (item.status === 'processing') {
      stats.processingCount += 1;
      stats.processingAmount += amt;
    } else if (item.status === 'completed') {
      stats.completedCount += 1;
      stats.completedAmount += amt;
    } else if (item.status === 'rejected') {
      stats.rejectedCount += 1;
    }
  }

  return stats;
}

export async function processWithdrawalRequest(params: {
  requestId: string;
  action: 'complete' | 'reject' | 'processing';
  reference?: string;
  notes?: string;
}) {
  const { requestId, action, reference, notes } = params;

  const { data, error } = await supabase.rpc('admin_process_delivery_withdrawal', {
    p_request_id: requestId,
    p_action: action,
    p_reference: reference?.trim() || null,
    p_notes: notes?.trim() || null,
  });

  if (error) {
    console.error('Error in admin_process_delivery_withdrawal:', error);
    throw error;
  }

  return data;
}

export async function fetchDeliveryBoyWithdrawalHistory(deliveryBoyId: string) {
  const { data, error } = await supabase
    .from('delivery_withdrawal_requests')
    .select(`
      *,
      processed_by_admin:profiles!delivery_withdrawal_requests_processed_by_fkey(
        id, full_name
      )
    `)
    .eq('delivery_boy_id', deliveryBoyId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as DeliveryWithdrawalRequest[];
}

export async function fetchDeliveryBoyFinancialOverview(deliveryBoyId: string) {
  const [walletRes, payoutMethodsRes, transactionsRes] = await Promise.all([
    supabase
      .from('delivery_wallets')
      .select('*')
      .eq('id', deliveryBoyId)
      .maybeSingle(),
    supabase
      .from('delivery_payout_methods')
      .select('*')
      .eq('delivery_boy_id', deliveryBoyId)
      .order('is_primary', { ascending: false }),
    supabase
      .from('delivery_transactions')
      .select(`
        *,
        order:orders(id, order_number)
      `)
      .eq('delivery_boy_id', deliveryBoyId)
      .order('created_at', { ascending: false })
      .limit(30),
  ]);

  if (walletRes.error) throw walletRes.error;
  if (payoutMethodsRes.error) throw payoutMethodsRes.error;
  if (transactionsRes.error) throw transactionsRes.error;

  return {
    wallet: walletRes.data,
    payoutMethods: payoutMethodsRes.data || [],
    transactions: transactionsRes.data || [],
  };
}

export function exportWithdrawalsCSV(requests: DeliveryWithdrawalRequest[]) {
  const headers = [
    'Request #',
    'Rider Name',
    'Rider Phone',
    'Amount (INR)',
    'Payout Method',
    'Destination Details',
    'Status',
    'Transaction Reference (UTR)',
    'Requested At',
    'Processed At',
    'Admin Notes',
    'Rejection Reason',
  ];

  const rows = requests.map((r) => {
    let dest = '';
    if (r.payout_method_type === 'upi') {
      dest = r.payout_details?.upi_id || 'UPI';
    } else {
      const bank = r.payout_details?.bank_name || '';
      const acct = r.payout_details?.full_account_number || r.payout_details?.account_number || '';
      const ifsc = r.payout_details?.ifsc_code || '';
      dest = `${bank} Acct: ${acct} IFSC: ${ifsc}`;
    }

    return [
      r.request_number,
      `"${r.delivery_boy?.full_name || ''}"`,
      `"${r.delivery_boy?.phone || ''}"`,
      r.amount,
      r.payout_method_type.toUpperCase(),
      `"${dest.replace(/"/g, '""')}"`,
      r.status.toUpperCase(),
      `"${r.transaction_reference || ''}"`,
      r.created_at ? new Date(r.created_at).toLocaleString() : '',
      r.processed_at ? new Date(r.processed_at).toLocaleString() : '',
      `"${(r.admin_notes || '').replace(/"/g, '""')}"`,
      `"${(r.rejection_reason || '').replace(/"/g, '""')}"`,
    ];
  });

  const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `withdrawals_export_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
