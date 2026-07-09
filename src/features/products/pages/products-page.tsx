import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from '@tanstack/react-table';
import { Package, Pencil, Trash2, MoreHorizontal, Search, Image as ImageIcon, ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PageHeader, ConfirmDialog, EmptyState } from '@/components/shared';
import { useProducts, useDeleteProduct, useDeleteProducts } from '@/features/products/hooks/use-products';
import { useCategories } from '@/features/categories/hooks/use-categories';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { Product } from '@/types/database';

export function ProductsPage() {
  const navigate = useNavigate();
  const { data: products, isLoading: productsLoading } = useProducts();
  const { data: categories } = useCategories();
  const deleteMutation = useDeleteProduct();
  const bulkDeleteMutation = useDeleteProducts();

  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [categoryIdFilter, setCategoryIdFilter] = useState<string | null>(null);
  const [rowSelection, setRowSelection] = useState({});
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [showBulkDelete, setShowBulkDelete] = useState(false);

  const columns: ColumnDef<Product>[] = [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate')}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
        />
      ),
      enableSorting: false,
      size: 40,
    },
    {
      id: 'image',
      header: '',
      cell: ({ row }) => {
        const primaryImage = row.original.images?.find(img => img.is_primary) || row.original.images?.[0];
        
        return (
          <div className="h-10 w-10 rounded-[12px] bg-surface overflow-hidden">
            {primaryImage ? (
              <img
                src={primaryImage.image_url}
                alt={row.original.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <ImageIcon className="h-4 w-4 text-text-muted" />
              </div>
            )}
          </div>
        );
      },
      size: 60,
    },
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <div 
          className="flex items-center gap-2 cursor-pointer select-none hover:text-text-primary transition-colors"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Product Info
          <ArrowUpDown className="h-4 w-4" />
        </div>
      ),
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-text-primary">{row.original.name}</p>
          <div className="flex items-center gap-2 mt-0.5 text-xs text-text-muted">
            <span>{row.original.unit}</span>
            <span>•</span>
            <span className="truncate max-w-[120px]">{row.original.category?.name}</span>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'price',
      header: ({ column }) => (
        <div 
          className="flex items-center gap-2 cursor-pointer select-none hover:text-text-primary transition-colors"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Price
          <ArrowUpDown className="h-4 w-4" />
        </div>
      ),
      cell: ({ row }) => (
        <span className="font-medium">{formatCurrency(row.original.price)}</span>
      ),
    },
    {
      accessorKey: 'stock',
      header: ({ column }) => (
        <div 
          className="flex items-center gap-2 cursor-pointer select-none hover:text-text-primary transition-colors"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Stock
          <ArrowUpDown className="h-4 w-4" />
        </div>
      ),
      cell: ({ row }) => {
        const stock = row.original.stock;
        let color = 'bg-surface text-text-primary';
        if (stock <= 5 && stock > 0) color = 'bg-amber-50 text-warning';
        if (stock === 0) color = 'bg-error text-white';
        
        return (
          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>
            {stock} units
          </span>
        );
      },
    },
    {
      accessorKey: 'active',
      header: ({ column }) => (
        <div 
          className="flex items-center gap-2 cursor-pointer select-none hover:text-text-primary transition-colors"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Status
          <ArrowUpDown className="h-4 w-4" />
        </div>
      ),
      cell: ({ row }) => (
        <Badge variant={row.original.active ? 'success' : 'outline'}>
          {row.original.active ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      accessorKey: 'created_at',
      header: ({ column }) => (
        <div 
          className="flex items-center gap-2 cursor-pointer select-none hover:text-text-primary transition-colors"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Added
          <ArrowUpDown className="h-4 w-4" />
        </div>
      ),
      cell: ({ row }) => (
        <span className="text-sm text-text-muted">{formatDate(row.original.created_at)}</span>
      ),
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => navigate(`/products/${row.original.id}/edit`)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setDeleteTarget(row.original.id)}
              className="text-error"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      size: 60,
    },
  ];

  const filteredProducts = useMemo(() => {
    return (products ?? []).filter(p => 
      categoryIdFilter ? p.category_id === categoryIdFilter : true
    );
  }, [products, categoryIdFilter]);

  const table = useReactTable({
    data: filteredProducts,
    columns,
    state: { sorting, globalFilter, rowSelection },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  });

  const selectedIds = table.getFilteredSelectedRowModel().rows.map((r) => r.original.id);

  const isLoading = productsLoading;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <PageHeader
        title="Products"
        description="Manage your dairy products and inventory"
        action={{ label: 'Add Product', onClick: () => navigate('/products/new') }}
      />

      {/* Category Filter Chips */}
      {categories && categories.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <Badge 
            variant={categoryIdFilter === null ? 'default' : 'outline'} 
            className="cursor-pointer whitespace-nowrap text-sm px-4 py-1.5"
            onClick={() => setCategoryIdFilter(null)}
          >
            All Products
          </Badge>
          {categories.map(category => (
            <Badge 
              key={category.id}
              variant={categoryIdFilter === category.id ? 'default' : 'outline'} 
              className="cursor-pointer whitespace-nowrap text-sm px-4 py-1.5"
              onClick={() => setCategoryIdFilter(category.id)}
            >
              {category.name}
            </Badge>
          ))}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
          <Input
            placeholder="Search products..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-10"
          />
        </div>
        {selectedIds.length > 0 && (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setShowBulkDelete(true)}
          >
            <Trash2 className="h-4 w-4" />
            Delete ({selectedIds.length})
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-[20px] border border-border bg-white overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-14 rounded-[12px]" />
            ))}
          </div>
        ) : !products?.length ? (
          <EmptyState
            icon={Package}
            title="No products yet"
            description="Add your first dairy product to start selling."
            action={{ label: 'Add Product', onClick: () => navigate('/products/new') }}
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
                  <TableRow 
                    key={row.id} 
                    data-state={row.getIsSelected() && 'selected'}
                    className="cursor-pointer"
                    onClick={(e) => {
                      if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('input')) return;
                      navigate(`/products/${row.original.id}/edit`);
                    }}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Pagination */}
            <div className="flex items-center justify-between p-4 border-t border-border">
              <p className="text-sm text-text-muted">
                {table.getFilteredRowModel().rows.length} products
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                >
                  Previous
                </Button>
                <span className="text-sm text-text-muted">
                  Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
        title="Delete Product"
        description="Are you sure? This product will be removed from all future orders."
        confirmLabel="Delete"
        destructive
        loading={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteTarget) {
            deleteMutation.mutate(deleteTarget, { onSettled: () => setDeleteTarget(null) });
          }
        }}
      />
      <ConfirmDialog
        open={showBulkDelete}
        onOpenChange={setShowBulkDelete}
        title={`Delete ${selectedIds.length} Products`}
        description="Are you sure? This action cannot be undone."
        confirmLabel="Delete All"
        destructive
        loading={bulkDeleteMutation.isPending}
        onConfirm={() => {
          bulkDeleteMutation.mutate(selectedIds, {
            onSettled: () => {
              setShowBulkDelete(false);
              setRowSelection({});
            },
          });
        }}
      />
    </motion.div>
  );
}
