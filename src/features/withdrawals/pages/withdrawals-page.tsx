import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  Download,
  RefreshCw,
  Clock,
  Copy,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PageHeader, EmptyState } from '@/components/shared';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useDebounce } from '@/hooks/use-debounce';
import type { DeliveryWithdrawalRequest, WithdrawalStatus, PayoutMethodType } from '@/types/database';
import {
  useWithdrawalRequests,
  useWithdrawalStats,
} from '@/features/withdrawals/hooks/use-withdrawals';
import { exportWithdrawalsCSV } from '@/features/withdrawals/api/withdrawals.api';
import { WithdrawalStatsCards } from '@/features/withdrawals/components/withdrawal-stats-cards';
import { ProcessWithdrawalDialog } from '@/features/withdrawals/components/process-withdrawal-dialog';

export function WithdrawalsPage() {
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [status, setStatus] = useState<WithdrawalStatus | 'all'>('all');
  const [method, setMethod] = useState<PayoutMethodType | 'all'>('all');
  const [search, setSearch] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<DeliveryWithdrawalRequest | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const debouncedSearch = useDebounce(search, 300);

  const { data: stats, isLoading: statsLoading } = useWithdrawalStats();
  const { data, isLoading, refetch, isFetching } = useWithdrawalRequests({
    page,
    pageSize,
    status,
    method,
    search: debouncedSearch,
  });

  const requests = data?.data || [];
  const totalCount = data?.count || 0;
  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  const handleOpenProcess = (req: DeliveryWithdrawalRequest) => {
    setSelectedRequest(req);
    setDialogOpen(true);
  };

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handleExport = () => {
    if (!requests.length) return;
    exportWithdrawalsCSV(requests);
  };

  const getStatusBadge = (st: WithdrawalStatus) => {
    switch (st) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Completed
          </span>
        );
      case 'processing':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
            Processing
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
            Rejected
          </span>
        );
      case 'pending':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
            Pending
          </span>
        );
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-5 max-w-6xl">
      {/* Header */}
      <PageHeader
        title="Withdrawals"
        description="Review and disburse delivery partner payout requests."
      >
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-8 gap-1 text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={!requests.length}
            className="h-8 gap-1 text-xs"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </Button>
        </div>
      </PageHeader>

      {/* Minimal Top Stats */}
      <WithdrawalStatsCards
        stats={stats}
        isLoading={statsLoading}
        activeStatus={status}
        onFilterClick={(statusFilter) => {
          setStatus(statusFilter);
          setPage(1);
        }}
      />

      {/* Unified Minimal Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Status segmented control */}
        <div className="flex items-center gap-1 p-1 bg-surface rounded-xl border border-border overflow-x-auto">
          {[
            { id: 'all', label: 'All' },
            { id: 'pending', label: 'Pending', count: stats?.pendingCount },
            { id: 'processing', label: 'Processing' },
            { id: 'completed', label: 'Completed' },
            { id: 'rejected', label: 'Rejected' },
          ].map((tab) => {
            const active = status === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setStatus(tab.id as WithdrawalStatus | 'all');
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  active
                    ? 'bg-white text-text-primary shadow-xs font-semibold'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                <span>{tab.label}</span>
                {tab.count !== undefined && tab.count > 0 && (
                  <span className="h-4 min-w-4 px-1 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center">
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Search & Method */}
        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-60">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted" />
            <Input
              placeholder="Search partner or request..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-8 h-8 text-xs rounded-xl"
            />
          </div>

          <Select
            value={method}
            onValueChange={(v) => {
              setMethod(v as PayoutMethodType | 'all');
              setPage(1);
            }}
          >
            <SelectTrigger className="h-8 w-28 text-xs rounded-xl">
              <SelectValue placeholder="Method" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Methods</SelectItem>
              <SelectItem value="upi">UPI</SelectItem>
              <SelectItem value="bank">Bank</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Clean Table Card */}
      <div className="rounded-2xl border border-border bg-white overflow-hidden shadow-xs">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 rounded-xl" />
            ))}
          </div>
        ) : !requests.length ? (
          <EmptyState
            icon={Clock}
            title="No withdrawal requests"
            description={
              status === 'pending'
                ? 'No pending withdrawal requests. All payouts are settled.'
                : 'No withdrawal requests match your search or filter.'
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-surface/40 hover:bg-surface/40 border-b border-border text-[11px] uppercase tracking-wider text-text-muted">
                    <TableHead className="font-semibold py-3">Partner</TableHead>
                    <TableHead className="font-semibold py-3">Amount</TableHead>
                    <TableHead className="font-semibold py-3">Payout Destination</TableHead>
                    <TableHead className="font-semibold py-3">Status</TableHead>
                    <TableHead className="font-semibold py-3">Date</TableHead>
                    <TableHead className="text-right font-semibold py-3">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((req) => {
                    const wallet = Array.isArray(req.delivery_boy?.delivery_wallets)
                      ? req.delivery_boy?.delivery_wallets[0]
                      : req.delivery_boy?.delivery_wallets;
                    const cashInHand = Number(wallet?.cash_in_hand) || 0;

                    const destText =
                      req.payout_method_type === 'upi'
                        ? req.payout_details?.upi_id || 'UPI'
                        : `${req.payout_details?.bank_name || 'Bank'} (${req.payout_details?.account_number ? '••••' + req.payout_details.account_number.slice(-4) : 'A/C'})`;

                    return (
                      <TableRow key={req.id} className="hover:bg-surface/30 transition-colors border-b border-border/60">
                        {/* Partner */}
                        <TableCell className="py-3">
                          <div className="flex items-center gap-2.5">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={req.delivery_boy?.avatar_url || undefined} />
                              <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                                {req.delivery_boy?.full_name?.charAt(0) || 'D'}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-semibold text-text-primary">
                                  {req.delivery_boy?.full_name}
                                </span>
                                {cashInHand > 500 && (
                                  <span
                                    title={`Rider holds ${formatCurrency(cashInHand)} floating COD cash`}
                                    className="inline-flex text-[10px] text-amber-700 bg-amber-100 font-semibold px-1 rounded"
                                  >
                                    Cash Held
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-text-muted">
                                {req.delivery_boy?.phone}
                              </span>
                            </div>
                          </div>
                        </TableCell>

                        {/* Amount & Request Number */}
                        <TableCell className="py-3">
                          <span className="text-sm font-bold text-text-primary block">
                            {formatCurrency(req.amount)}
                          </span>
                          <span className="text-[10px] font-mono text-text-muted">
                            {req.request_number}
                          </span>
                        </TableCell>

                        {/* Destination */}
                        <TableCell className="py-3">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-mono text-text-primary">
                              {destText}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopyText(req.payout_details?.upi_id || req.payout_details?.account_number || '', req.id)}
                              className="text-text-muted hover:text-text-primary p-0.5 transition-colors"
                              title="Copy details"
                            >
                              {copiedId === req.id ? (
                                <Check className="h-3 w-3 text-emerald-600" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </button>
                          </div>
                          {req.transaction_reference && (
                            <span className="text-[10px] font-mono text-text-muted block mt-0.5">
                              Ref: {req.transaction_reference}
                            </span>
                          )}
                        </TableCell>

                        {/* Status */}
                        <TableCell className="py-3">
                          {getStatusBadge(req.status)}
                        </TableCell>

                        {/* Date */}
                        <TableCell className="py-3 text-xs text-text-muted whitespace-nowrap">
                          {formatDate(req.created_at)}
                        </TableCell>

                        {/* Action */}
                        <TableCell className="py-3 text-right">
                          <Button
                            variant={req.status === 'pending' ? 'default' : 'outline'}
                            size="sm"
                            className="h-7 text-xs font-medium px-3 rounded-lg"
                            onClick={() => handleOpenProcess(req)}
                          >
                            {req.status === 'pending' ? 'Review & Pay' : 'View'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between p-3.5 border-t border-border bg-white text-xs text-text-muted">
                <span>
                  Showing {Math.min((page - 1) * pageSize + 1, totalCount)}–{Math.min(page * pageSize, totalCount)} of {totalCount}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="h-7 text-xs px-2"
                  >
                    Previous
                  </Button>
                  <span className="px-2">
                    {page} / {totalPages}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={page >= totalPages}
                    className="h-7 text-xs px-2"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Process Dialog */}
      <ProcessWithdrawalDialog
        request={selectedRequest}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </motion.div>
  );
}
