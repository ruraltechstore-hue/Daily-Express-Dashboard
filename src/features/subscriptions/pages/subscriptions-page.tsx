import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { CalendarClock, Play, Pause, Ban, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PageHeader, EmptyState } from '@/components/shared';
import { useSubscriptions, useUpdateSubscriptionStatus } from '@/features/subscriptions/hooks/use-subscriptions';
import { formatDate } from '@/lib/utils';
import { SUBSCRIPTION_STATUS_LABELS, SUBSCRIPTION_FREQUENCY_LABELS } from '@/config/constants';
import type { Subscription, SubStatus } from '@/types/database';

export function SubscriptionsPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [statusFilter, setStatusFilter] = useState<SubStatus | 'all'>('all');

  const { data, isLoading } = useSubscriptions(
    page, 
    pageSize, 
    statusFilter === 'all' ? undefined : statusFilter
  );
  const updateStatusMutation = useUpdateSubscriptionStatus();

  const columns: ColumnDef<Subscription>[] = [
    {
      id: 'customer',
      header: 'Customer',
      cell: ({ row }) => (
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate(`/customers/${row.original.customer_id}`)}>
          <div className="h-8 w-8 rounded-full bg-surface flex items-center justify-center font-semibold text-primary">
            <User className="h-4 w-4" />
          </div>
          <div>
            <p className="font-medium">{(row.original.customer as { full_name: string })?.full_name}</p>
            <p className="text-xs text-text-muted">{(row.original.customer as { phone: string })?.phone}</p>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'plan',
      header: 'Plan / Items',
      cell: ({ row }) => {
        const items = row.original.items || [];
        return (
          <div>
            <p className="font-medium">{row.original.plan?.name || 'Custom Plan'}</p>
            <p className="text-xs text-text-muted">
              {items.length} items ({items.slice(0,2).map((i: any) => i.product?.name).join(', ')}{items.length > 2 ? '...' : ''})
            </p>
          </div>
        );
      },
    },
    {
      accessorKey: 'frequency',
      header: 'Frequency',
      cell: ({ row }) => (
        <span className="font-medium">{SUBSCRIPTION_FREQUENCY_LABELS[row.original.frequency]}</span>
      ),
    },
    {
      accessorKey: 'next_order_date',
      header: 'Next Delivery',
      cell: ({ row }) => (
        <span className="text-sm font-medium">{formatDate(row.original.next_order_date)}</span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.original.status;
        return (
          <Badge variant="outline" className={
            status === 'active' ? 'border-success text-success bg-success/10' :
            status === 'paused' ? 'border-warning text-warning bg-warning/10' :
            'border-error text-error bg-error/10'
          }>
            {SUBSCRIPTION_STATUS_LABELS[status]}
          </Badge>
        );
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <div className="flex items-center gap-1 justify-end">
          {row.original.status === 'active' && (
            <Button variant="ghost" size="sm" onClick={() => updateStatusMutation.mutate({ id: row.original.id, status: 'paused' })}>
              <Pause className="h-4 w-4 mr-2" /> Pause
            </Button>
          )}
          {row.original.status === 'paused' && (
            <Button variant="ghost" size="sm" onClick={() => updateStatusMutation.mutate({ id: row.original.id, status: 'active' })}>
              <Play className="h-4 w-4 mr-2" /> Resume
            </Button>
          )}
          {(row.original.status === 'active' || row.original.status === 'paused') && (
            <Button variant="ghost" size="sm" className="text-error hover:text-error" onClick={() => updateStatusMutation.mutate({ id: row.original.id, status: 'cancelled' })}>
              <Ban className="h-4 w-4 mr-2" /> Cancel
            </Button>
          )}
        </div>
      ),
    },
  ];

  const table = useReactTable({
    data: data?.data ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: true,
    pageCount: Math.ceil((data?.count ?? 0) / pageSize),
  });

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <PageHeader title="Subscriptions" description="Manage recurring customer subscriptions" />

      {/* Filters */}
      <div className="flex items-center gap-4 w-full sm:w-64">
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v as SubStatus | 'all'); setPage(1); }}>
          <SelectTrigger>
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Subscriptions</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="paused">Paused</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-[20px] border border-border bg-white overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-14 rounded-[12px]" />
            ))}
          </div>
        ) : !data?.data.length ? (
          <EmptyState
            icon={CalendarClock}
            title="No subscriptions found"
            description="There are no subscriptions matching your current filters."
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id}>
                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            <div className="flex items-center justify-between p-4 border-t border-border">
              <p className="text-sm text-text-muted">
                Total {data.count} subscriptions
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <span className="text-sm text-text-muted">
                  Page {page} of {Math.ceil(data.count / pageSize) || 1}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => p + 1)}
                  disabled={page >= Math.ceil(data.count / pageSize)}
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}
