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
import { Eye, Truck, Search, Ban, CheckCircle } from 'lucide-react';
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
import { UserPlus } from 'lucide-react';
import { useDeliveryBoys, useToggleDeliveryBoyStatus } from '@/features/delivery-boys/hooks/use-delivery-boys';
import { formatDate } from '@/lib/utils';
import { useDebounce } from '@/hooks/use-debounce';

export function DeliveryBoysPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 500);

  const { data, isLoading } = useDeliveryBoys(page, pageSize, debouncedSearch);
  const toggleStatusMutation = useToggleDeliveryBoyStatus();

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
            {url ? <img src={url} alt={name} className="h-full w-full object-cover" /> : name?.charAt(0) || 'D'}
          </div>
        );
      },
      size: 50,
    },
    {
      accessorKey: 'full_name',
      header: 'Delivery Boy',
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{row.original.full_name}</p>
          <p className="text-xs text-text-muted">{row.original.phone}</p>
        </div>
      ),
    },
    {
      accessorKey: 'orders.count',
      header: 'Total Orders Handled',
      cell: ({ row }) => (
        <span className="font-medium">{row.original.orders?.[0]?.count ?? 0}</span>
      ),
    },
    {
      accessorKey: 'is_active',
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant={row.original.is_active ? 'success' : 'destructive'}>
          {row.original.is_active ? 'Active' : 'Inactive'}
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
          <Button variant="ghost" size="sm" onClick={() => navigate(`/delivery-boys/${row.original.id}`)}>
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
      <PageHeader 
        title="Delivery Boys" 
        description="Manage your delivery fleet" 
        action={{
          label: 'Add Delivery Boy',
          onClick: () => navigate('/delivery-boys/new'),
          icon: UserPlus
        }}
      />

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
        ) : !data?.data.length ? (
          <EmptyState
            icon={Truck}
            title="No delivery boys found"
            description="We couldn't find any delivery boys matching your criteria."
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
                Total {data.count} delivery boys
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
        title={confirmToggleTarget?.willBeActive ? 'Activate Delivery Boy' : 'Deactivate Delivery Boy'}
        description={`Are you sure you want to ${confirmToggleTarget?.willBeActive ? 'activate' : 'deactivate'} ${confirmToggleTarget?.name}?`}
        confirmLabel={confirmToggleTarget?.willBeActive ? 'Activate' : 'Deactivate'}
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
