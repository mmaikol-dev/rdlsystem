"use client";

import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, usePage, router } from '@inertiajs/react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar1Icon, CopyIcon, EyeIcon, FilterIcon, MessageCircleMoreIcon, Trash2Icon } from "lucide-react";
import * as React from 'react';
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from '@/components/ui/calendar';
import { format } from "date-fns";
import { type DateRange } from 'react-day-picker';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Checkbox } from "@/components/ui/checkbox";

// Constants
const COLUMNS = [
  'cc_email','order_no', 'client_name', 'quantity', 'amount', 'product_name', 'address', 'phone',
  'alt_no', 'status', 'delivery_date', 'instructions','agent',
  'country', 'store_name', 'code', 'order_type', 'merchant',
] as const;

const STATUS_OPTIONS = [
  'Scheduled','Dispatched','Followup','Cancelled','Pending','WrongContact','Delivered','New Orders'
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

// TableRowMemo Component
const TableRowMemo = React.memo(
  ({ order, highlighted, onEdit, onHistory, onWhatsapp, canDelete, onDelete, visibleColumns }: {
    order: any;
    highlighted: Record<string, boolean>;
    onEdit: (order: any, field: keyof typeof order) => void;
    onHistory: (orderId: number, orderNo: string) => void;
    onWhatsapp: (orderId: number) => void;
    canDelete: boolean;
    onDelete: (order: any) => void;
    visibleColumns: string[];
  }) => {
    return (
      <TableRow className="hover:bg-muted/10">
        {visibleColumns.map((col) => {
          const key = `${order.id}-${col}`;
          const value = col === "status" ? order.status && order.status.trim() !== "" ? order.status : "New Orders" : String(order[col] || "");
          const colorClass = col === "status" ? statusColors[value] || "" : "";

          return (
            <TableCell
              key={col}
              className={`cursor-pointer min-w-[130px] max-w-[130px] truncate ${highlighted[key] ? "bg-green-200" : ""} ${colorClass}`}
              onClick={() => onEdit(order, col)}
              title={value}
            >
              {value}
            </TableCell>
          );
        })}

        <TableCell className="text-right flex space-x-1 justify-end">
          <Button
            className="p-0 w-5 h-5 flex items-center justify-center"
            variant="ghost"
            onClick={() => {
              const rowData = visibleColumns.map(col => order[col] ?? "").join("\t");
              navigator.clipboard.writeText(rowData)
                .then(() => alert("Row copied! ✅ You can now paste into Google Sheets."))
                .catch(err => console.error("Failed to copy row", err));
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
  (prevProps, nextProps) => {
    return (
      prevProps.order.id === nextProps.order.id &&
      prevProps.order.updated_at === nextProps.order.updated_at &&
      JSON.stringify(prevProps.highlighted) === JSON.stringify(nextProps.highlighted) &&
      prevProps.canDelete === nextProps.canDelete
    );
  }
);

// Main Component
export default function Index() {
  const { props } = usePage();
  const { orders, merchantUsers, ccUsers, merchantData } = props as any;

  const [filters, setFilters] = React.useState<Record<string, string | string[]>>({});
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>();
  const [editing, setEditing] = React.useState<{ order: any; field: keyof any } | null>(null);
  const [editValue, setEditValue] = React.useState('');
  const [highlighted, setHighlighted] = React.useState<Record<string, boolean>>({});
  const [filterDialogOpen, setFilterDialogOpen] = React.useState(false);
  const [historyModalOpen, setHistoryModalOpen] = React.useState(false);
  const [createModalOpen, setCreateModalOpen] = React.useState(false);
  const [newOrder, setNewOrder] = React.useState<Partial<any>>({});
  const [selectedHistories, setSelectedHistories] = React.useState<any[]>([]);
  const [selectedOrderNo, setSelectedOrderNo] = React.useState<string | null>(null);
  const [whatsappAlert, setWhatsappAlert] = React.useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [deletingOrder, setDeletingOrder] = React.useState<any | null>(null);

  // Check if user is G.O.D
  const isGOD = React.useMemo(() => {
    const roles = (usePage().props.auth.user as any)?.roles || "";
    return roles === "G.O.D";
  }, []);

  // Filter visible columns
  const visibleColumns = React.useMemo(() => {
    return COLUMNS.filter(col => !(isGOD && col === "merchant"));
  }, [isGOD]);

  // Determine delete permission
  const userPermissions = React.useMemo(() => {
    const userRoles = (usePage().props.auth.user as any)?.roles || [];
    return { canDelete: !["operations","finance","callcenter1",""].includes(userRoles) };
  }, []);

  // Handle edit
  const handleEdit = React.useCallback((order: any, field: keyof any) => {
    setEditing({ order, field });
    setEditValue(String(order[field] || ''));
  }, []);

  // Handle history
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

  // Handle WhatsApp
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

  // Handle delete
  const handleDeleteOrder = React.useCallback((order: any) => setDeletingOrder(order), []);
  const handleDelete = React.useCallback(() => {
    if (!deletingOrder) return;
    router.delete(`/sheetorders/${deletingOrder.id}`, {
      onSuccess: () => setDeletingOrder(null),
      onError: (err) => console.error("Delete failed", err)
    });
  }, [deletingOrder]);

  // Filter helpers
  const updateFilter = React.useCallback((key: string, value: string) => setFilters(prev => ({ ...prev, [key]: value })), []);
  const updateMultiSelectFilter = React.useCallback((key: string, value: string, checked: boolean) => {
    setFilters(prev => {
      const current = (prev[key] as string[]) || [];
      if (checked) return { ...prev, [key]: [...current, value] };
      else return { ...prev, [key]: current.filter(item => item !== value) };
    });
  }, []);

  const formatDate = React.useCallback((date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2,'0');
    const day = String(date.getDate()).padStart(2,'0');
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

  const refreshOrders = React.useCallback(() => router.get('/sheetorders', {}, { preserveState: true }), []);

  return (
    <AppLayout breadcrumbs={BREADCRUMBS}>
      <Head title="Sheet Orders" />
      
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold">Sheet Orders</h1>
          <div className="flex space-x-2">
            <Button onClick={() => setFilterDialogOpen(true)}><FilterIcon className="w-4 h-4 mr-1" />Filter</Button>
            <Button onClick={refreshOrders}>Refresh</Button>
          </div>
        </div>

        {whatsappAlert && (
          <div className={`p-2 rounded ${whatsappAlert.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {whatsappAlert.message}
          </div>
        )}

        <Table>
          <TableHeader className="sticky top-0 bg-background z-10">
            <TableRow className="h-10">
              {visibleColumns.map(col => (
                <TableHead
                  key={col}
                  className="min-w-[130px] text-sm font-medium truncate border border-gray-300"
                  title={col}
                >
                  {col}
                </TableHead>
              ))}
              <TableHead className="min-w-[40px] text-sm font-medium border border-gray-300">Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {orders.data.map((order: any) => (
              <TableRowMemo
                key={order.id}
                order={order}
                highlighted={highlighted}
                onEdit={handleEdit}
                onHistory={handleHistory}
                onWhatsapp={handleWhatsapp}
                canDelete={userPermissions.canDelete}
                onDelete={handleDeleteOrder}
                visibleColumns={visibleColumns}
              />
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Filter Dialog */}
      <Dialog open={filterDialogOpen} onOpenChange={setFilterDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Filter Orders</DialogTitle>
          </DialogHeader>

          <div className="space-y-2">
            <Input
              placeholder="Order Number"
              value={filters.order_no as string || ''}
              onChange={e => updateFilter('order_no', e.target.value)}
            />
            <Input
              placeholder="Client Name"
              value={filters.client_name as string || ''}
              onChange={e => updateFilter('client_name', e.target.value)}
            />

            <div>
              <label className="block text-sm font-medium">Status</label>
              <div className="flex flex-wrap gap-1">
                {STATUS_OPTIONS.map(status => (
                  <Checkbox
                    key={status}
                    checked={(filters.status as string[])?.includes(status) || false}
                    onCheckedChange={checked => updateMultiSelectFilter('status', status, checked as boolean)}
                  >
                    {status}
                  </Checkbox>
                ))}
              </div>
            </div>

            <div className="flex space-x-2">
              <Button onClick={applyFilters}>Apply</Button>
              <Button variant="outline" onClick={clearFilters}>Clear</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
