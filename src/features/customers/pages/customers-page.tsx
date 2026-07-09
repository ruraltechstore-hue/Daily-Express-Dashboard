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
import { Eye, Users, Search, Ban, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { PageHeader, EmptyState, ConfirmDialog } from '@/components/shared';
import { useCustomers, useToggleCustomerStatus } from '@/features/customers/hooks/use-customers';
import { formatDate } from '@/lib/utils';
import { useDebounce } from '@/hooks/use-debounce';

export function CustomersPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 500);

  const { data, isLoading, isError, error } = useCustomers(page, pageSize, debouncedSearch);
  const toggleStatusMutation = useToggleCustomerStatus();

  const [confirmToggleTarget, setConfirmToggleTarget] = useState<{ id: string, name: string, willBeActive: boolean } | null>(null);

  const columns: ColumnDef<any>[] = [
    {
      id: 'avatar',
      header: '',
      cell: ({ row }) => {
        const url = row.original.avatar_url;
        const name = row.original.full_name;
        return (
          <div className="h-10 w-10 rounded-full bg-secondary text-primary flex items-center justify-center font-semibold overflow-hidden shrink-0">
            {url ? <img src={url} alt={name} className="h-full w-full object-cover" /> : name?.charAt(0) || 'C'}
          </div>
        );
      },
      size: 50,
    },
    {
      accessorKey: 'full_name',
      header: 'Customer',
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{row.original.full_name}</p>
          <p className="text-xs text-text-muted">{row.original.phone}</p>
        </div>
      ),
    },
    {
      accessorKey: 'orders.count',
      header: 'Total Orders',
      cell: ({ row }) => (
        <span className="font-medium">{row.original.orders?.[0]?.count ?? 0}</span>
      ),
    },
    {
      accessorKey: 'active_order_count',
      header: 'Active Orders',
      cell: ({ row }) => (
        <span className="font-medium text-primary">{row.original.active_order_count}</span>
      ),
    },
    {
      accessorKey: 'is_active',
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant={row.original.is_active ? 'success' : 'destructive'}>
          {row.original.is_active ? 'Active' : 'Banned'}
        </Badge>
      ),
    },
    {
      accessorKey: 'created_at',
      header: 'Joined',
      cell: ({ row }) => (
        <span className="text-sm text-text-muted">{formatDate(row.original.created_at)}</span>
      ),
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/customers/${row.original.id}`)}>
            <Eye className="h-4 w-4 mr-2" />
            View
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={row.original.is_active ? 'text-error' : 'text-success'}
            onClick={() => setConfirmToggleTarget({
              id: row.original.id,
              name: row.original.full_name,
              willBeActive: !row.original.is_active
            })}
          >
            {row.original.is_active ? <Ban className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
          </Button>
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
      <PageHeader title="Customers" description="Manage and view your customer base" />

      {/* Toolbar */}
      <div className="flex items-center gap-4 w-full sm:w-80">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
          <Input
            placeholder="Search by name or phone..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-10"
          />
        </div>
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
            icon={Users}
            title="Failed to load customers"
            description={error instanceof Error ? error.message : 'Something went wrong while fetching customers.'}
          />
        ) : !data?.data.length ? (
          <EmptyState
            icon={Users}
            title="No customers found"
            description="We couldn't find any customers matching your criteria."
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
                Total {data.count} customers
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

      {/* Status Toggle Confirm */}
      <ConfirmDialog
        open={!!confirmToggleTarget}
        onOpenChange={() => setConfirmToggleTarget(null)}
        title={confirmToggleTarget?.willBeActive ? 'Activate Customer' : 'Ban Customer'}
        description={`Are you sure you want to ${confirmToggleTarget?.willBeActive ? 'activate' : 'ban'} ${confirmToggleTarget?.name}? ${!confirmToggleTarget?.willBeActive ? 'They will not be able to login to the app.' : ''}`}
        confirmLabel={confirmToggleTarget?.willBeActive ? 'Activate' : 'Ban'}
        destructive={!confirmToggleTarget?.willBeActive}
        loading={toggleStatusMutation.isPending}
        onConfirm={() => {
          if (confirmToggleTarget) {
            toggleStatusMutation.mutate({ id: confirmToggleTarget.id, isActive: confirmToggleTarget.willBeActive }, {
              onSettled: () => setConfirmToggleTarget(null)
            });
          }
        }}
      />
    </motion.div>
  );
}
