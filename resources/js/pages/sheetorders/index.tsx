"use client";

import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, usePage, router } from '@inertiajs/react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar1Icon, CopyIcon, EyeIcon, FilterIcon, MessageCircleMoreIcon, MoreHorizontal, PlusIcon, RefreshCwIcon, Send, Trash2Icon } from "lucide-react";
import * as React from 'react';
import { Command, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from '@/components/ui/calendar';
import { format } from "date-fns";
import { type DateRange } from 'react-day-picker';
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Checkbox } from "@/components/ui/checkbox";
import { Terminal } from "lucide-react";

// ✅ Move constants outside component to prevent recreation
const COLUMNS = [
  'cc_email','order_no', 'client_name', 'quantity', 'amount', 'product_name', 'address', 'phone',
  'alt_no', 'status', 'delivery_date', 'instructions','code','merchant',
] as const;

const STATUS_OPTIONS = [
  'Scheduled',
  'Dispatched',
  'Followup',
  'Cancelled',
  'Pending',
  'Expired',
  'Returned',
  'Duplicate',
  'WrongContact',
  'Delivered',
  'New Orders', // added

] as const;

const statusColors: Record<string, string> = {
  Delivered: "text-green-600 font-semibold",
  Pending: "text-yellow-600 font-semibold",
  Scheduled: "text-blue-600 font-semibold",
  Dispatched: "text-blue-600 font-semibold",
  Cancelled: "text-red-600 font-semibold",
  Followup: "text-purple-600 font-semibold",
  WrongContact: "text-gray-600 italic",
};


const BREADCRUMBS: BreadcrumbItem[] = [
  { title: 'Dashboard', href: '/dashboard' },
  { title: 'Sheet Orders', href: '/sheetorders' },
];

// ✅ Memoize filtered columns to prevent recreation
const FILTERED_COLUMNS = COLUMNS.filter(col => !['quantity', 'amount', 'instructions'].includes(col));

interface SheetOrder {
  id: number;
  order_no: string;
  order_date: string;
  amount: number;
  quantity: number;
  item: string;
  delivery_date: string;
  client_name: string;
  address: string;
  product_name: string;
  city: string;
  country: string;
  phone: string;
  agent: string;
  store_name: string;
  status: string;
  code: string;
  order_type: string;
  alt_no: string;
  merchant: string;
  cc_email: string;
  instructions: string;
  invoice_code: string;
  sheet_id: string;
  sheet_name: string;
  updated_at: string;
}

interface OrderHistory {
  id: number;
  attribute: string;
  old_value: string;
  new_value: string;
  created_at: string;
  user: { name: string };
}

// ✅ Optimized TableRow with better memoization
const TableRowMemo = React.memo(
  ({ order, highlighted, onEdit, onHistory, onWhatsapp, canDelete, onDelete }: {
    order: SheetOrder;
    highlighted: Record<string, boolean>;
    onEdit: (order: SheetOrder, field: keyof SheetOrder) => void;
    onHistory: (orderId: number, orderNo: string) => void;
    onWhatsapp: (orderId: number) => void;
    canDelete: boolean;
    onDelete: (order: SheetOrder) => void;
  }) => {
    return (
      <TableRow className="hover:bg-muted/10">
  {COLUMNS.map((col) => {
    const key = `${order.id}-${col}`;

    // ✅ Display "New Orders" if status is null/empty
    const value =
    col === "status"
      ? order.status && order.status.trim() !== ""
        ? order.status
        : "New Orders"
      : col === "delivery_date" && order.delivery_date
      ? format(new Date(order.delivery_date), "yyyy-MM-dd") // 👈 show only date
      : String(order[col] || "");

    const colorClass =
      col === "status" ? statusColors[value] || "" : "";

    return (
      <TableCell
        key={col}
        className={`cursor-pointer min-w-[130px] max-w-[130px] truncate ${
          highlighted[key] ? "bg-green-200" : ""
        } ${colorClass}`}
        onClick={() => onEdit(order, col)}
        title={value}
      >

        {value}
      </TableCell>
    );
  })}

  <TableCell className="text-right flex space-x-1 justify-end sticky right-0 bg-background z-10">

  <Button
  className="p-0 w-5 h-5 flex items-center justify-center"
  variant="ghost"
  onClick={() => {
    const rowData = COLUMNS.map(col => order[col] ?? "").join("\t");
    navigator.clipboard.writeText(rowData)
      .then(() => {
        alert("Row copied! ✅ You can now paste into Google Sheets.");
      })
      .catch(err => {
        console.error("Failed to copy row", err);
      });
  }}
  title="Copy Row"
>
  <CopyIcon className="w-4 h-4" />
</Button>
    <Button
      className="p-0 w-5 h-5 flex items-center justify-center"
      variant="ghost"
      onClick={() => onHistory(order.id, order.order_no)}
      title="View History"
    >
      <EyeIcon className="w-4 h-4" />
    </Button>

    <Button
      className="p-0 w-5 h-5 flex items-center justify-center"
      variant="ghost"
      onClick={() => onWhatsapp(order.id)}
      title="Send WhatsApp"
    >
      <MessageCircleMoreIcon className="w-4 h-4" />
    </Button>

    {canDelete && (
      <Button
        className="p-0 w-5 h-5 flex items-center justify-center"
        variant="ghost"
        onClick={() => onDelete(order)}
      >
        <Trash2Icon className="w-4 h-4" />
      </Button>
    )}










  </TableCell>
</TableRow>

    );
  },
  // ✅ Custom comparison for better memoization
  (prevProps, nextProps) => {
    const prevOrder = prevProps.order;
    const nextOrder = nextProps.order;
    
    return (
      prevOrder.id === nextOrder.id &&
      prevOrder.updated_at === nextOrder.updated_at &&
      JSON.stringify(prevProps.highlighted) === JSON.stringify(nextProps.highlighted) &&
      prevProps.canDelete === nextProps.canDelete
    );
  }
);

export default function Index() {
  const { props } = usePage();
  
  const { orders, merchantUsers, ccUsers, merchantData } = props as unknown as {
    orders: { data: SheetOrder[], links: any[] },
    merchantUsers: string[],
    ccUsers: string[],
    merchantData: Record<string, { sheet_id: string; sheet_names: string[] }>,
  };

  // ✅ Optimized state management
  const [filters, setFilters] = React.useState<Record<string, string | string[]>>({});
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>();
  const [editing, setEditing] = React.useState<{ order: SheetOrder; field: keyof SheetOrder } | null>(null);
  const [editValue, setEditValue] = React.useState('');
  const [highlighted, setHighlighted] = React.useState<Record<string, boolean>>({});
  const [filterDialogOpen, setFilterDialogOpen] = React.useState(false);
  const [historyModalOpen, setHistoryModalOpen] = React.useState(false);
  const [createModalOpen, setCreateModalOpen] = React.useState(false);
  const [newOrder, setNewOrder] = React.useState<Partial<SheetOrder>>({});
  const [selectedHistories, setSelectedHistories] = React.useState<OrderHistory[]>([]);
  const [selectedOrderNo, setSelectedOrderNo] = React.useState<string | null>(null);
  const [whatsappAlert, setWhatsappAlert] = React.useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [deletingOrder, setDeletingOrder] = React.useState<SheetOrder | null>(null);

  // ✅ Memoize user permissions to prevent re-computation
  const userPermissions = React.useMemo(() => {
    const userRoles = (usePage().props.auth.user as any)?.roles || [];
    return {
      canDelete: !["operations", "finance", "callcenter1", ""].includes(userRoles)
    };
  }, []);

  // ✅ Memoized callbacks to prevent TableRowMemo re-renders
  const handleEdit = React.useCallback((order: SheetOrder, field: keyof SheetOrder) => {
    setEditing({ order, field });
    setEditValue(String(order[field] || ''));
  }, []);

  const handleHistory = React.useCallback(async (orderId: number, orderNo: string) => {
    try {
      const res = await fetch(`/sheetorders/${orderId}/histories`);
      const data = await res.json();
      setSelectedHistories(data.histories || []);
      setSelectedOrderNo(orderNo);
      setHistoryModalOpen(true);
    } catch (error) {
      console.error('Failed to fetch histories', error);
    }
  }, []);

  const handleWhatsapp = React.useCallback((orderId: number) => {
    router.post(`/whatsapp/${orderId}/send`, {}, {
      onSuccess: () => {
        setWhatsappAlert({ type: 'success', message: 'WhatsApp message sent successfully ✅' });
        setTimeout(() => setWhatsappAlert(null), 2000);
      },
      onError: () => {
        setWhatsappAlert({ type: 'error', message: 'Failed to send WhatsApp message ❌' });
        setTimeout(() => setWhatsappAlert(null), 2000);
      },
    });
  }, []);

  const handleDeleteOrder = React.useCallback((order: SheetOrder) => {
    setDeletingOrder(order);
  }, []);

  // ✅ Optimized filter update with useCallback
  const updateFilter = React.useCallback((key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  // ✅ Optimized multi-select filter updates
  const updateMultiSelectFilter = React.useCallback((key: string, value: string, checked: boolean) => {
    setFilters(prev => {
      const current = (prev[key] as string[]) || [];
      if (checked) {
        return { ...prev, [key]: [...current, value] };
      } else {
        return { ...prev, [key]: current.filter(item => item !== value) };
      }
    });
  }, []);

  const handleCloseEditModal = React.useCallback(() => {
    if (editing && editValue !== String(editing.order[editing.field] || '')) {
      router.put(`/sheetorders/${editing.order.id}`, { [editing.field]: editValue }, {
        preserveState: true,
        preserveScroll: true,
        only: ['orders'],
        onSuccess: () => {
          const key = `${editing.order.id}-${editing.field}`;
          setHighlighted(prev => ({ ...prev, [key]: true }));
          setTimeout(() => {
            setHighlighted(prev => {
              const updated = { ...prev };
              delete updated[key];
              return updated;
            });
          }, 2000);
        },
      });
    }
    setEditing(null);
    setEditValue('');
  }, [editing, editValue]);

  const handleNewOrderChange = React.useCallback((field: keyof SheetOrder, value: string) => {
    setNewOrder(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleCreateOrder = React.useCallback(() => {
    router.post('/sheetorders', newOrder, {
      onSuccess: () => {
        setCreateModalOpen(false);
        setNewOrder({});
      },
      onError: (err) => {
        console.error("Create failed", err);
      }
    });
  }, [newOrder]);

  const handleDelete = React.useCallback(() => {
    if (!deletingOrder) return;

    router.delete(`/sheetorders/${deletingOrder.id}`, {
      onSuccess: () => {
        setDeletingOrder(null);
      },
      onError: (err) => {
        console.error("Delete failed", err);
      }
    });
  }, [deletingOrder]);

  const formatDate = React.useCallback((date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  const applyFilters = React.useCallback(() => {
    router.get('/sheetorders', {
      ...filters,
      status: Array.isArray(filters.status) ? (filters.status as string[]).join(',') : filters.status,
      from_date: dateRange?.from ? formatDate(dateRange.from) : undefined,
      to_date: dateRange?.to ? formatDate(dateRange.to) : undefined,
    }, { preserveState: true });

    setFilterDialogOpen(false);
  }, [filters, dateRange, formatDate]);

  const clearFilters = React.useCallback(() => {
    setFilters({});
    setDateRange(undefined);
    router.get('/sheetorders', {}, { preserveState: true });
  }, []);

  const refreshOrders = React.useCallback(() => {
    router.get('/sheetorders', {}, { preserveState: true });
  }, []);

  // ✅ Memoize merchant data arrays to prevent recreation
  const merchantOptions = React.useMemo(() => Object.keys(merchantData), [merchantData]);

  return (
    <AppLayout breadcrumbs={BREADCRUMBS}>
      <Head title="Sheet Orders" />
      
      {/* ✅ WhatsApp Alert */}
      {whatsappAlert && (
        <div
          className={`fixed top-5 right-5 px-4 py-3 rounded-lg shadow-lg text-white transition-opacity duration-500 z-50 ${
            whatsappAlert.type === 'success' ? 'bg-green-500' : 'bg-red-500'
          }`}
        >
          <strong className="block">
            {whatsappAlert.type === 'success' ? 'Success' : 'Error'}
          </strong>
          <span className="text-sm">{whatsappAlert.message}</span>
        </div>
      )}

      <div className="flex justify-end mb-2 space-x-2 pt-4 pr-4">
        {/* Filter Orders */}
        <Button
          className="h-8 w-8 p-0 text-sm"
          onClick={() => setFilterDialogOpen(true)}
        >
          <FilterIcon className="h-4 w-4" />
        </Button>

        {/* Refresh Button */}
        <Button
          className="h-8 w-8 p-0 text-sm"
          onClick={refreshOrders}
        >
          <RefreshCwIcon className="h-4 w-4" />
        </Button>

        {/* Create Order Button */}
        <Button
          className="h-8 w-8 p-0 text-sm"
          onClick={() => setCreateModalOpen(true)}
        >
          <PlusIcon className="h-4 w-4" />
        </Button>
      </div>

      <div className="border rounded-lg">
        <div className="scrollbar-custom overflow-x-auto">
          <div className="inline-block min-w-full">
            <div className="max-h-[600px] overflow-y-auto">
              <Table className="min-w-full border border-gray-200">
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow className="h-10">
                    {COLUMNS.map(col => (
                      <TableHead
                        key={col}
                        className="min-w-[130px] text-sm font-medium truncate border border-gray-300"
                        title={col}
                      >
                        {col}
                      </TableHead>
                    ))}
                    <TableHead  className="min-w-[40px] text-sm font-medium border border-gray-300 sticky right-0 bg-background z-20">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {orders.data.map(order => (
                    <TableRowMemo
                      key={order.id}
                      order={order}
                      highlighted={highlighted}
                      onEdit={handleEdit}
                      onHistory={handleHistory}
                      onWhatsapp={handleWhatsapp}
                      canDelete={userPermissions.canDelete}
                      onDelete={handleDeleteOrder}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex justify-center">
        <Pagination>
          <PaginationContent>
            {/* Previous Button */}
            <PaginationItem>
              <PaginationPrevious
                as="button"
                disabled={!orders.links.find(link => link.label === 'Previous')?.url}
                onClick={() => {
                  const prev = orders.links.find(link => link.label === 'Previous')?.url;
                  if (prev) router.get(prev, {}, { preserveState: true });
                }}
              />
            </PaginationItem>

            {/* Page Numbers */}
            {orders.links
              .filter(link => !['Previous', 'Next'].includes(link.label))
              .map((link, index) => (
                <PaginationItem key={index}>
                  <PaginationLink
                    as="button"
                    isActive={link.active}
                    onClick={() => {
                      if (link.url) router.get(link.url, {}, { preserveState: true });
                    }}
                  >
                    {link.label}
                  </PaginationLink>
                </PaginationItem>
              ))}

            {/* Next Button */}
            <PaginationItem>
              <PaginationNext
                as="button"
                disabled={!orders.links.find(link => link.label === 'Next')?.url}
                onClick={() => {
                  const next = orders.links.find(link => link.label === 'Next')?.url;
                  if (next) router.get(next, {}, { preserveState: true });
                }}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>

      {/* ✅ Optimized Filter Dialog */}
      {filterDialogOpen && (
  <Dialog open={filterDialogOpen} onOpenChange={setFilterDialogOpen}>
    <DialogContent className="max-w-6xl">
      <DialogHeader>
        <DialogTitle>Filter Orders</DialogTitle>
      </DialogHeader>
      <div className="grid grid-cols-3 gap-4 mt-2 max-h-[500px] overflow-y-auto">
        {FILTERED_COLUMNS.map(col => (
          col === 'delivery_date' ? (
            // ✅ Date Range Filter
            <Popover key={col}>
              <PopoverTrigger asChild>
                <Input
                  readOnly
                  placeholder="Select date range"
                  value={
                    dateRange?.from && dateRange?.to
                      ? `${dateRange.from.toLocaleDateString()} - ${dateRange.to.toLocaleDateString()}`
                      : 'Delivery date'
                  }
                />
              </PopoverTrigger>
              <PopoverContent className="w-auto p-2">
                <Calendar
                  mode="range"
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={2}
                  className="rounded-lg border shadow-sm"
                />
              </PopoverContent>
            </Popover>
          ) : col === 'status' ? (
            // ✅ Status Searchable Multi-select
            <Popover key={col}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  {filters.status && (filters.status as string[]).length > 0
                    ? (filters.status as string[]).join(', ')
                    : 'Status(es)'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-2">
                <Command>
                  <CommandInput placeholder="Search status..." />
                  <CommandList className="max-h-60 overflow-y-auto">
                    <CommandGroup>
                      {['New Orders', ...STATUS_OPTIONS].map(status => (
                        <CommandItem
                          key={status}
                          onSelect={() => {
                            const isChecked = (filters.status as string[] || []).includes(status);
                            updateMultiSelectFilter('status', status, !isChecked);
                          }}
                        >
                          <Checkbox
                            checked={(filters.status as string[] || []).includes(status)}
                            className="mr-2"
                          />
                          {status}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          ) : col === 'merchant' ? (
            // ✅ Merchant Searchable Multi-select
            <Popover key={col}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  {filters.merchant && (filters.merchant as string[]).length > 0
                    ? (filters.merchant as string[]).join(', ')
                    : 'Merchant(s)'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-2">
                <Command>
                  <CommandInput placeholder="Search merchants..." />
                  <CommandList className="max-h-60 overflow-y-auto">
                    <CommandGroup>
                      {merchantUsers.map((name: string) => (
                        <CommandItem
                          key={name}
                          onSelect={() => {
                            const isChecked = (filters.merchant as string[] || []).includes(name);
                            updateMultiSelectFilter('merchant', name, !isChecked);
                          }}
                        >
                          <Checkbox
                            checked={(filters.merchant as string[] || []).includes(name)}
                            className="mr-2"
                          />
                          {name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          ) : col === 'cc_email' ? (
            // ✅ Callcenter (cc_email) Searchable Multi-select
            <Popover key={col}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  {filters.cc_email && (filters.cc_email as string[]).length > 0
                    ? (filters.cc_email as string[]).join(', ')
                    : 'Callcenter(s)'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-2">
                <Command>
                  <CommandInput placeholder="Search callcenter..." />
                  <CommandList className="max-h-60 overflow-y-auto">
                    <CommandGroup>
                      {ccUsers.map((name: string) => (
                        <CommandItem
                          key={name}
                          onSelect={() => {
                            const isChecked = (filters.cc_email as string[] || []).includes(name);
                            updateMultiSelectFilter('cc_email', name, !isChecked);
                          }}
                        >
                          <Checkbox
                            checked={(filters.cc_email as string[] || []).includes(name)}
                            className="mr-2"
                          />
                          {name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          ) : (
            // ✅ Default text filter
            <Input
              key={col}
              value={(filters[col] as string) || ''}
              onChange={e => updateFilter(col, e.target.value)}
              placeholder={col}
            />
          )
        ))}
      </div>
      <div className="flex justify-end gap-2 mt-4">
        <Button variant="outline" onClick={clearFilters}>Clear</Button>
        <Button onClick={applyFilters}>Apply</Button>
      </div>
    </DialogContent>
  </Dialog>
)}


      {/* ✅ Edit Modal - Only render when editing */}
      {editing && (
        <Dialog open={!!editing} onOpenChange={handleCloseEditModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                Edit {editing.field} for Order #{editing.order.order_no}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {editing.field === 'status' ? (
                <Select value={editValue} onValueChange={setEditValue}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map(status => (
                      <SelectItem key={status} value={status}>{status}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : editing.field === 'instructions' ? (
                <Textarea
                  value={editValue}
                  onChange={e => setEditValue(e.target.value)}
                  rows={5}
                  placeholder="Enter instructions..."
                />
              ) : editing.field === 'delivery_date' ? (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <Calendar1Icon className="mr-2 h-4 w-4" />
                      {editValue
                        ? format(new Date(editValue), "yyyy-MM-dd")
                        : "Pick a delivery date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={editValue ? new Date(editValue) : undefined}
                      onSelect={(date) => {
                        if (date) setEditValue(format(date, "yyyy-MM-dd"));
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              ) : (
                <Input
                  value={editValue}
                  onChange={e => setEditValue(e.target.value)}
                />
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* ✅ History Modal - Only render when open */}
      {historyModalOpen && (
        <Dialog open={historyModalOpen} onOpenChange={setHistoryModalOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit History for Order #{selectedOrderNo}</DialogTitle>
            </DialogHeader>
            <div className="p-2 space-y-2 max-h-[500px] overflow-y-auto">
              {selectedHistories.length > 0 ? (
                selectedHistories.map(history => (
                  <div key={history.id} className="border-b py-2">
                    <div className="text-sm font-medium">{history.attribute}</div>
                    <div className="text-xs text-muted-foreground">
                      <span className="font-semibold">Old:</span> {history.old_value} <br />
                      <span className="font-semibold">New:</span> {history.new_value} <br />
                      <span className="text-[10px]">By {history.user.name} on {new Date(history.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No edit history for this order.</p>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* ✅ Delete Confirmation - Only render when deleting */}
      {deletingOrder && (
        <Dialog open={!!deletingOrder} onOpenChange={() => setDeletingOrder(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Confirm Delete</DialogTitle>
            </DialogHeader>
            <p>Are you sure you want to delete order <strong>#{deletingOrder.order_no}</strong>?</p>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setDeletingOrder(null)}>Cancel</Button>
              <Button variant="destructive" onClick={handleDelete}>Delete</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

{/* Create Order Modal */}
<Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
  <DialogContent className="max-w-4xl">
    <DialogHeader>
      <DialogTitle>Create New Order</DialogTitle>
    </DialogHeader>

    <div className="grid grid-cols-2 gap-4 max-h-[500px] overflow-y-auto">

      {/* --- Order Info --- */}
      <Input
        required
        placeholder="Order No"
        value={newOrder.order_no || ""}
        onChange={(e) => handleNewOrderChange("order_no", e.target.value)}
      />

      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-start text-left font-normal"
          >
            <Calendar1Icon className="mr-2 h-4 w-4" />
            {newOrder.order_date
              ? format(new Date(newOrder.order_date), "yyyy-MM-dd")
              : "Pick order date"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <Calendar
            mode="single"
            selected={newOrder.order_date ? new Date(newOrder.order_date) : undefined}
            onSelect={(date) => {
              if (date) handleNewOrderChange("order_date", format(date, "yyyy-MM-dd"));
            }}
          />
        </PopoverContent>
      </Popover>

      <Input
        type="number"
        required
        placeholder="Amount"
        value={newOrder.amount || ""}
        onChange={(e) => handleNewOrderChange("amount", e.target.value)}
      />

      <Input
        type="number"
        required
        placeholder="Quantity"
        value={newOrder.quantity || ""}
        onChange={(e) => handleNewOrderChange("quantity", e.target.value)}
      />

      {/* --- Client Info --- */}
      <Input
        required
        placeholder="Client Name"
        value={newOrder.client_name || ""}
        onChange={(e) => handleNewOrderChange("client_name", e.target.value)}
      />
      <Input
        placeholder="Client City"
        value={newOrder.city || ""}
        onChange={(e) => handleNewOrderChange("city", e.target.value)}
      />
      <Input
        placeholder="Phone"
        value={newOrder.phone || ""}
        onChange={(e) => handleNewOrderChange("phone", e.target.value)}
      />
      <Input
        placeholder="Address"
        value={newOrder.address || ""}
        onChange={(e) => handleNewOrderChange("address", e.target.value)}
      />

      {/* --- Product Info --- */}
      <Input
        placeholder="Product Name"
        value={newOrder.product_name || ""}
        onChange={(e) => handleNewOrderChange("product_name", e.target.value)}
      />
    
      <Input
        placeholder="Store Name"
        value={newOrder.store_name || ""}
        onChange={(e) => handleNewOrderChange("store_name", e.target.value)}
      />

      {/* --- Merchant Select --- */}
      <Select
        value={newOrder.merchant || ""}
        onValueChange={(val) => {
          handleNewOrderChange("merchant", val);

          // auto fill sheet_id and reset sheet_name
          if (merchantData[val]) {
            handleNewOrderChange("sheet_id", merchantData[val].sheet_id || "");
            handleNewOrderChange("sheet_name", "");
          }
        }}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select Merchant" />
        </SelectTrigger>
        <SelectContent>
          {Object.keys(merchantData).map((m) => (
            <SelectItem key={m} value={m}>
              {m}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* --- Sheet ID (auto filled, readonly) --- */}
      <Input
        placeholder="Sheet ID"
        value={newOrder.sheet_id || ""}
        readOnly
      />

      {/* --- Sheet Name Dropdown --- */}
      <Select
        value={newOrder.sheet_name || ""}
        onValueChange={(val) => handleNewOrderChange("sheet_name", val)}
        disabled={!newOrder.merchant}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select Sheet Name" />
        </SelectTrigger>
        <SelectContent>
          {newOrder.merchant &&
            merchantData[newOrder.merchant]?.sheet_names.map((sn: string) => (
              <SelectItem key={sn} value={sn}>
                {sn}
              </SelectItem>
            ))}
        </SelectContent>
      </Select>

      {/* --- Delivery Info --- */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-start text-left font-normal"
          >
            <Calendar1Icon className="mr-2 h-4 w-4" />
            {newOrder.delivery_date
              ? format(new Date(newOrder.delivery_date), "yyyy-MM-dd")
              : "Pick delivery date"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <Calendar
            mode="single"
            selected={newOrder.delivery_date ? new Date(newOrder.delivery_date) : undefined}
            onSelect={(date) => {
              if (date) handleNewOrderChange("delivery_date", format(date, "yyyy-MM-dd"));
            }}
          />
        </PopoverContent>
      </Popover>

      {/* --- Status --- */}
      <Select
        required
        value={newOrder.status || ""}
        onValueChange={(val) => handleNewOrderChange("status", val)}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select status" />
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map(status => (
            <SelectItem key={status} value={status}>
              {status}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* --- Instructions --- */}
      <Textarea
        placeholder="Special Instructions"
        value={newOrder.instructions || ""}
        onChange={(e) => handleNewOrderChange("instructions", e.target.value)}
        className="col-span-2"
      />
    </div>

    <div className="flex justify-end gap-2 mt-4">
      <Button variant="outline" onClick={() => setCreateModalOpen(false)}>Cancel</Button>
      <Button onClick={handleCreateOrder}>Create</Button>
    </div>
  </DialogContent>
</Dialog>


    </AppLayout>
  );
}
