"use client";

import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, usePage, router } from '@inertiajs/react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FilterIcon, RefreshCwIcon, CopyIcon, EyeIcon, MessageCircleMoreIcon, Calendar1Icon } from "lucide-react";
import * as React from 'react';
import { Calendar } from '@/components/ui/calendar';
import { format } from "date-fns";
import { type DateRange } from 'react-day-picker';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Checkbox } from "@/components/ui/checkbox";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

const COLUMNS = [
  'order_no', 'client_name', 'product_name', 'amount','phone',
  'status', 'delivery_date', 'merchant', 'code',
] as const;

const STATUS_OPTIONS = [
  'Scheduled',
  'Delivered',
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
  { title: 'Undelivered Orders', href: '/undelivered' },
];

interface SheetOrder {
  id: number;
  order_no: string;
  client_name: string;
  product_name: string;
  address: string;
  phone: string;
  status: string;
  delivery_date: string;
  merchant: string;
  code: string;
  updated_at: string;
}

export default function Index() {
  const { props } = usePage();
  const { orders, merchantUsers } = props as unknown as {
    orders: { data: SheetOrder[], links: any[] },
    merchantUsers: string[],
  };

  const [filters, setFilters] = React.useState<Record<string, string | string[]>>({});
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>();
  const [editing, setEditing] = React.useState<{ order: SheetOrder; field: keyof SheetOrder } | null>(null);
  const [editValue, setEditValue] = React.useState('');
  const [filterDialogOpen, setFilterDialogOpen] = React.useState(false);

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

  const formatDate = React.useCallback((date: Date) => {
    return format(date, "yyyy-MM-dd");
  }, []);

  const applyFilters = React.useCallback(() => {
    router.get('/undelivered', {
      ...filters,
      from_date: dateRange?.from ? formatDate(dateRange.from) : undefined,
      to_date: dateRange?.to ? formatDate(dateRange.to) : undefined,
    }, { preserveState: true });
    setFilterDialogOpen(false);
  }, [filters, dateRange, formatDate]);

  const clearFilters = React.useCallback(() => {
    setFilters({});
    setDateRange(undefined);
    router.get('/undelivered', {}, { preserveState: true });
  }, []);

  const refreshOrders = React.useCallback(() => {
    router.get('/undelivered', {}, { preserveState: true });
  }, []);

  const handleEdit = (order: SheetOrder, field: keyof SheetOrder) => {
    if (field !== 'status') return;
    setEditing({ order, field });
    setEditValue(String(order[field] || ''));
  };

  const handleCloseEditModal = React.useCallback(() => {
    if (editing && editValue !== String(editing.order[editing.field] || '')) {
      router.put(`/sheetorders/${editing.order.id}`, { [editing.field]: editValue }, {
        preserveState: true,
        preserveScroll: true,
        only: ['orders'],
      });
    }
    setEditing(null);
    setEditValue('');
  }, [editing, editValue]);

  return (
    <AppLayout breadcrumbs={BREADCRUMBS}>
      <Head title="Undelivered Orders" />

      <div className="flex justify-end mb-2 space-x-2 pt-4 pr-4">
        <Button className="h-8 w-8 p-0" onClick={() => setFilterDialogOpen(true)}>
          <FilterIcon className="h-4 w-4" />
        </Button>
        <Button className="h-8 w-8 p-0" onClick={refreshOrders}>
          <RefreshCwIcon className="h-4 w-4" />
        </Button>
      </div>

      <div className="border rounded-lg">
        <div className="scrollbar-custom overflow-x-auto">
        <Table className="min-w-full border border-gray-200 table-fixed">
  <TableHeader className="sticky top-0 bg-background z-10">
    <TableRow>
      {COLUMNS.map(col => (
        <TableHead
          key={col}
          className="w-[11%] text-sm font-medium border border-gray-300"
        >
          {col}
        </TableHead>
      ))}
    </TableRow>
  </TableHeader>

  <TableBody>
    {orders.data.map(order => (
      <TableRow key={order.id} className="hover:bg-muted/10">
        {COLUMNS.map(col => {
          const value =
            col === "status"
              ? order.status?.trim() || "New Orders"
              : String(order[col] || "");
          return (
            <TableCell
              key={col}
              className={`w-[11%] truncate cursor-pointer ${
                col === "status" ? statusColors[value] || "" : ""
              }`}
              onClick={() => handleEdit(order, col)}
            >
              {value}
            </TableCell>
          );
        })}
      </TableRow>
    ))}
  </TableBody>
</Table>

        </div>
      </div>

      <div className="mt-4 flex justify-center">
        <Pagination>
          <PaginationContent>
            {orders.links.map((link, index) => (
              <PaginationItem key={index}>
                <PaginationLink
                  as="button"
                  isActive={link.active}
                  disabled={!link.url}
                  onClick={() => link.url && router.get(link.url, {}, { preserveState: true })}
                >
                  {link.label}
                </PaginationLink>
              </PaginationItem>
            ))}
          </PaginationContent>
        </Pagination>
      </div>

      {/* Filter Dialog */}
      {filterDialogOpen && (
        <Dialog open={filterDialogOpen} onOpenChange={setFilterDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Filter Orders</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 mt-2">
              {/* Merchant filter */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full text-left">
                    {filters.merchant && (filters.merchant as string[]).length > 0
                      ? (filters.merchant as string[]).join(', ')
                      : 'Merchant(s)'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-60 p-2">
                  <div className="flex flex-col gap-1 max-h-64 overflow-y-auto">
                    {merchantUsers.map((name: string) => (
                      <label key={name} className="flex items-center space-x-2">
                        <Checkbox
                          checked={(filters.merchant as string[] || []).includes(name)}
                          onCheckedChange={checked =>
                            updateMultiSelectFilter('merchant', name, !!checked)
                          }
                        />
                        <span>{name}</span>
                      </label>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              {/* Delivery Date filter */}
              <Popover>
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
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={clearFilters}>Clear</Button>
              <Button onClick={applyFilters}>Apply</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Modal */}
      {editing && (
        <Dialog open={!!editing} onOpenChange={handleCloseEditModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Status for Order #{editing.order.order_no}</DialogTitle>
            </DialogHeader>
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
          </DialogContent>
        </Dialog>
      )}
    </AppLayout>
  );
}
