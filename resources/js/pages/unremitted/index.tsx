"use client";

import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, usePage, router } from '@inertiajs/react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FilterIcon, RefreshCwIcon } from "lucide-react";
import * as React from 'react';
import { Calendar } from '@/components/ui/calendar';
import { format } from "date-fns";
import { type DateRange } from 'react-day-picker';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Checkbox } from "@/components/ui/checkbox";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
} from "@/components/ui/pagination";

const BASE_COLUMNS = [
  'order_no', 'client_name', 'product_name', 'amount', 'phone',
  'status', 'delivery_date', 'merchant', 'code', 'agent',
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
  { title: 'Unremitted Orders', href: '/unremitted' },
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
  agent: string | null;
  updated_at: string;
}

export default function Index() {
  const { props } = usePage();
  const { orders, merchantUsers, auth } = props as unknown as {
    orders: { data: SheetOrder[], links: any[] },
    merchantUsers: string[],
    auth: { user: { id: number; name: string; roles: string } },
  };

  // ✅ Only add "remit" column if roles !== G.O.D
  const hiddenRoles = ["callcenter1", "merchant", "operations"];

  const COLUMNS = hiddenRoles.includes(auth.user.roles)
    ? BASE_COLUMNS
    : [...BASE_COLUMNS, "remit"];

  const [filters, setFilters] = React.useState<Record<string, string | string[]>>({});
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>();
  const [filterDialogOpen, setFilterDialogOpen] = React.useState(false);

  const updateMultiSelectFilter = (key: string, value: string, checked: boolean) => {
    setFilters(prev => {
      const current = (prev[key] as string[]) || [];
      return checked
        ? { ...prev, [key]: [...current, value] }
        : { ...prev, [key]: current.filter(item => item !== value) };
    });
  };

  const formatDate = (date: Date) => format(date, "yyyy-MM-dd");

  const applyFilters = () => {
    router.get('/unremitted', {
      ...filters,
      from_date: dateRange?.from ? formatDate(dateRange.from) : undefined,
      to_date: dateRange?.to ? formatDate(dateRange.to) : undefined,
    }, { preserveState: true });
    setFilterDialogOpen(false);
  };

  const clearFilters = () => {
    setFilters({});
    setDateRange(undefined);
    router.get('/unremitted', {}, { preserveState: true });
  };

  const refreshOrders = () => {
    router.get('/unremitted', {}, { preserveState: true });
  };

  // ✅ Handle remitting
  const handleRemit = (orderId: number, checked: boolean) => {
    router.put(`/sheetorders/${orderId}`, { agent: checked ? "Remitted" : "" }, {
      preserveState: true,
      preserveScroll: true,
      only: ['orders'],
    });
  };

  return (
    <AppLayout breadcrumbs={BREADCRUMBS}>
      <Head title="Unremitted Orders" />

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
                    className="w-[10%] text-sm font-medium border border-gray-300"
                  >
                    {col === "remit" ? "Mark Remitted" : col}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>

            <TableBody>
              {orders.data.map(order => (
                <TableRow key={order.id} className="hover:bg-muted/10">
                  {COLUMNS.map(col => {
                    if (col === "remit") {
                      return (
                        <TableCell key={col} className="w-[10%] text-center">
                          <Checkbox
                            checked={order.agent === "Remitted"}
                            onCheckedChange={checked => handleRemit(order.id, !!checked)}
                          />
                        </TableCell>
                      );
                    }

                    const value =
                      col === "status"
                        ? order.status?.trim() || "New Orders"
                        : String(order[col] || "");

                    return (
                      <TableCell
                        key={col}
                        className={`w-[10%] truncate ${
                          col === "status" ? statusColors[value] || "" : ""
                        }`}
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

      {/* Filter Dialog remains same */}
      {filterDialogOpen && (
        <Dialog open={filterDialogOpen} onOpenChange={setFilterDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Filter Orders</DialogTitle>
            </DialogHeader>
            {/* ... existing merchant/date filters here ... */}
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={clearFilters}>Clear</Button>
              <Button onClick={applyFilters}>Apply</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </AppLayout>
  );
}
