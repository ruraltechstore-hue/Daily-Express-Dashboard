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
import { Eye, ShoppingCart } from 'lucide-react';
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
import { useOrders } from '@/features/orders/hooks/use-orders';
import { formatCurrency, formatDate, getOrderStatusColor } from '@/lib/utils';
import type { Order, OrderStatus } from '@/types/database';

export function OrdersPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');

  const { data, isLoading, isError, error } = useOrders(
    page, 
    pageSize, 
    statusFilter === 'all' ? undefined : statusFilter
  );

  const columns: ColumnDef<Order>[] = [
    {
      accessorKey: 'order_number',
      header: 'Order #',
      cell: ({ row }) => <span className="font-medium">{row.original.order_number}</span>,
    },
    {
      accessorKey: 'created_at',
      header: 'Date',
      cell: ({ row }) => (
        <span className="text-sm text-text-muted">{formatDate(row.original.created_at)}</span>
      ),
    },
    {
      id: 'customer',
      header: 'Customer',
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{(row.original.customer as { full_name: string })?.full_name}</p>
          <p className="text-xs text-text-muted">{(row.original.customer as { phone: string })?.phone}</p>
        </div>
      ),
    },
    {
      accessorKey: 'total',
      header: 'Total',
      cell: ({ row }) => (
        <span className="font-medium">{formatCurrency(row.original.total)}</span>
      ),
    },
    {
      accessorKey: 'payment_status',
      header: 'Payment',
      cell: ({ row }) => {
        const isPaid = row.original.payment_status === 'success';
        return (
          <Badge variant={isPaid ? 'success' : 'outline'}>
            {row.original.payment_status.toUpperCase()}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'order_status',
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant="outline" className={getOrderStatusColor(row.original.order_status)}>
          {row.original.order_status.replace(/_/g, ' ').toUpperCase()}
        </Badge>
      ),
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <Button variant="ghost" size="sm" onClick={() => navigate(`/orders/${row.original.id}`)}>
          <Eye className="h-4 w-4 mr-2" />
          View
        </Button>
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
      <PageHeader title="Orders" description="Manage and process customer orders" />

      {/* Filters */}
      <div className="flex items-center gap-4 w-full sm:w-64">
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v as OrderStatus | 'all'); setPage(1); }}>
          <SelectTrigger>
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Orders</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="accepted">Accepted</SelectItem>
            <SelectItem value="packed">Packed</SelectItem>
            <SelectItem value="out_for_delivery">Out for Delivery</SelectItem>
            <SelectItem value="delivered">Delivered</SelectItem>
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
        ) : isError ? (
          <EmptyState
            icon={ShoppingCart}
            title="Failed to load orders"
            description={error instanceof Error ? error.message : 'Something went wrong while fetching orders.'}
          />
        ) : !data?.data.length ? (
          <EmptyState
            icon={ShoppingCart}
            title="No orders found"
            description="There are no orders matching your current filters."
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
                  <TableRow key={row.id} className="cursor-pointer" onClick={() => navigate(`/orders/${row.original.id}`)}>
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
                Total {data.count} orders
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
