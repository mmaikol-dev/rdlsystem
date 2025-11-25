"use client";

import AppLayout from '@/layouts/app-layout';
import { Head, usePage, router } from '@inertiajs/react';
import { type BreadcrumbItem } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { FilterIcon, RefreshCwIcon, ChevronsUpDown, Check, UserCheck, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
} from "@/components/ui/pagination";
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
  CommandInput,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import * as React from 'react';


const BASE_COLUMNS = [
  'order_no', 'client_name', 'product_name', 'amount', 'phone',
  'status', 'delivery_date', 'merchant', 'code', 'cc_email',
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

const STATUS_OPTIONS = [
  "New Orders", "Pending", "Delivered", "Scheduled", "Dispatched", "Cancelled", "Followup", "WrongContact"
];

const BREADCRUMBS: BreadcrumbItem[] = [
  { title: 'Dashboard', href: '/dashboard' },
  { title: 'Re/ Assign orders', href: '/assign' },
];

interface SheetOrder {
  id: number;
  order_no: string;
  client_name: string;
  product_name: string;
  address: string;
  phone: string;
  amount: string;
  status: string;
  delivery_date: string;
  merchant: string;
  code: string;
  cc_email: string | null;
  updated_at: string;
}

export default function Index() {
  const { props } = usePage();
  const { orders, filters, merchantUsers, ccUsers, productNames, auth } = props as unknown as {
    orders: { data: SheetOrder[], links: any[] };
    filters: Record<string, string>;
    merchantUsers: string[];
    ccUsers: string[];
    productNames: string[];
    auth: { user: { name: string; roles: string } };
  };
  const hiddenRoles = ["callcenter1", "merchant", "operations"];
  const COLUMNS = hiddenRoles.includes(auth.user.roles)
    ? BASE_COLUMNS
    : [...BASE_COLUMNS, "checkbox"];

  const [filterDialogOpen, setFilterDialogOpen] = React.useState(false);
  const [reassignDialogOpen, setReassignDialogOpen] = React.useState(false);
  const [resultDialogOpen, setResultDialogOpen] = React.useState(false);
  const [resultMessage, setResultMessage] = React.useState({ title: "", description: "", type: "success" as "success" | "error" });
  const [merchantOpen, setMerchantOpen] = React.useState(false);
  const [statusOpen, setStatusOpen] = React.useState(false);
  const [ccOpen, setCcOpen] = React.useState(false);
  const [productOpen, setProductOpen] = React.useState(false);
  const [reassignCcOpen, setReassignCcOpen] = React.useState(false);
  const [selectedCcAgents, setSelectedCcAgents] = React.useState<string[]>([]);
  const [localFilters, setLocalFilters] = React.useState<Record<string, string>>(filters || {});
  const [selectedOrders, setSelectedOrders] = React.useState<number[]>([]);
  const allSelected = orders.data.length > 0 && selectedOrders.length === orders.data.length;

  const clearFilters = () => setLocalFilters({});
  const refreshOrders = () => window.location.reload();

  const applyFilters = () => {
    setFilterDialogOpen(false);
    router.get('/assign', localFilters);
  };

  const resetFilters = () => {
    clearFilters();
    router.get('/assign');
  };

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedOrders(orders.data.map(order => order.id));
    } else {
      setSelectedOrders([]);
    }
  };

  const toggleSingle = (id: number, checked: boolean) => {
    if (checked) {
      setSelectedOrders(prev => [...prev, id]);
    } else {
      setSelectedOrders(prev => prev.filter(orderId => orderId !== id));
    }
  };

  const handleReassign = () => {
    if (selectedOrders.length === 0) {
      setResultMessage({
        title: "No orders selected",
        description: "Please select at least one order to reassign",
        type: "error"
      });
      setResultDialogOpen(true);
      return;
    }
    setReassignDialogOpen(true);
  };

  const toggleCcAgent = (agent: string) => {
    setSelectedCcAgents(prev => {
      if (prev.includes(agent)) {
        return prev.filter(a => a !== agent);
      } else {
        return [...prev, agent];
      }
    });
  };

  const removeCcAgent = (agent: string) => {
    setSelectedCcAgents(prev => prev.filter(a => a !== agent));
  };

  const confirmReassign = () => {
    if (selectedCcAgents.length === 0) {
      setResultMessage({
        title: "No CC agents selected",
        description: "Please select at least one call center agent",
        type: "error"
      });
      setResultDialogOpen(true);
      return;
    }

    console.log('Sending reassign request:', {
      order_ids: selectedOrders,
      cc_emails: selectedCcAgents
    });

    router.post('/assign/reassign', {
      order_ids: selectedOrders,
      cc_emails: selectedCcAgents
    }, {
      onSuccess: (page) => {
        console.log('Reassign success:', page);
        const agentText = selectedCcAgents.length === 1
          ? selectedCcAgents[0]
          : `${selectedCcAgents.length} agents (round-robin)`;
        setResultMessage({
          title: "Success",
          description: `Successfully reassigned ${selectedOrders.length} order(s) to ${agentText}`,
          type: "success"
        });
        setReassignDialogOpen(false);
        setResultDialogOpen(true);
        setSelectedOrders([]);
        setSelectedCcAgents([]);

        // Refresh the page to show updated data
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      },
      onError: (errors) => {
        console.error('Reassign error:', errors);
        setResultMessage({
          title: "Error",
          description: errors.message || "Failed to reassign orders. Please try again.",
          type: "error"
        });
        setReassignDialogOpen(false);
        setResultDialogOpen(true);
      }
    });
  };

  return (
    <AppLayout breadcrumbs={BREADCRUMBS}>
      <Head title="Orders" />

      <div className="flex justify-between mb-2 pt-4 px-4">
        <div>
          {!hiddenRoles.includes(auth.user.roles) && selectedOrders.length > 0 && (
            <Button onClick={handleReassign} variant="default">
              <UserCheck className="h-4 w-4 mr-2" />
              Reassign ({selectedOrders.length})
            </Button>
          )}
        </div>
        <div className="flex space-x-2">
          <Button className="h-8 w-8 p-0" onClick={() => setFilterDialogOpen(true)}>
            <FilterIcon className="h-4 w-4" />
          </Button>
          <Button className="h-8 w-8 p-0" onClick={refreshOrders}>
            <RefreshCwIcon className="h-4 w-4" />
          </Button>
        </div>
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
                    {col === "checkbox" ? (
                      <div className="flex items-center justify-center">
                        <Checkbox
                          checked={allSelected}
                          onCheckedChange={(checked) => toggleSelectAll(!!checked)}
                        />
                        <span className="ml-2">Select All</span>
                      </div>
                    ) : (
                      col
                    )}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>

            <TableBody>
              {orders.data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={COLUMNS.length} className="text-center py-4 text-gray-500">
                    No orders found.
                  </TableCell>
                </TableRow>
              ) : (
                orders.data.map(order => (
                  <TableRow key={order.id} className="hover:bg-muted/10">
                    {COLUMNS.map(col => {
                      if (col === "checkbox") {
                        return (
                          <TableCell key={col} className="w-[10%] text-center">
                            <Checkbox
                              checked={selectedOrders.includes(order.id)}
                              onCheckedChange={(checked) => toggleSingle(order.id, !!checked)}
                            />
                          </TableCell>
                        );
                      }

                      const value =
                        col === "status"
                          ? order.status?.trim() || "New Orders"
                          : String(order[col as keyof SheetOrder] || "");

                      return (
                        <TableCell
                          key={col}
                          className={`w-[10%] truncate ${col === "status" ? statusColors[value] || "" : ""
                            }`}
                        >
                          {value}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="mt-4 flex justify-center">
        <Pagination>
          <PaginationContent>
            {orders.links.map((link, idx) => (
              <PaginationItem key={idx}>
                <PaginationLink
                  href={link.url || "#"}
                  isActive={link.active}
                  dangerouslySetInnerHTML={{ __html: link.label }}
                />
              </PaginationItem>
            ))}
          </PaginationContent>
        </Pagination>
      </div>

      {/* Result Dialog */}
      <Dialog open={resultDialogOpen} onOpenChange={setResultDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className={resultMessage.type === "success" ? "text-green-600" : "text-red-600"}>
              {resultMessage.title}
            </DialogTitle>
          </DialogHeader>

          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              {resultMessage.description}
            </p>
          </div>

          <div className="flex justify-end">
            <Button onClick={() => setResultDialogOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reassign Dialog */}
      <Dialog open={reassignDialogOpen} onOpenChange={setReassignDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reassign Orders (Round-Robin)</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">
              You are about to reassign {selectedOrders.length} order(s).
              {selectedCcAgents.length > 1 && " Orders will be distributed evenly using round-robin."}
            </p>

            <div className="flex flex-col space-y-2">
              <label className="text-sm font-medium">
                Select Call Center Agents (Multi-select)
              </label>

              {selectedCcAgents.length > 0 && (
                <div className="flex flex-wrap gap-2 p-2 border rounded-md bg-muted/20">
                  {selectedCcAgents.map((agent) => (
                    <Badge key={agent} variant="secondary" className="pl-2 pr-1">
                      {agent}
                      <button
                        onClick={() => removeCcAgent(agent)}
                        className="ml-1 hover:bg-muted rounded-full p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}

              <Popover open={reassignCcOpen} onOpenChange={setReassignCcOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" className="w-full justify-between">
                    {selectedCcAgents.length === 0
                      ? "Select Call Center Agents"
                      : `${selectedCcAgents.length} agent(s) selected`}
                    <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50 shrink-0" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0 w-[350px]">
                  <Command>
                    <CommandInput placeholder="Search agent..." />
                    <CommandList>
                      <CommandGroup>
                        {ccUsers.map((cc, idx) => (
                          <CommandItem
                            key={idx}
                            value={cc}
                            onSelect={() => toggleCcAgent(cc)}
                          >
                            <div className="flex items-center w-full">
                              <Checkbox
                                checked={selectedCcAgents.includes(cc)}
                                className="mr-2"
                              />
                              {cc}
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>

              {selectedCcAgents.length > 1 && (
                <p className="text-xs text-muted-foreground">
                  💡 Orders will be distributed evenly across {selectedCcAgents.length} agents
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={() => setReassignDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmReassign}>
              Confirm Reassign
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Filter Dialog */}
      {filterDialogOpen && (
        <Dialog open={filterDialogOpen} onOpenChange={setFilterDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Filter Orders</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 mt-4">
              <div className="flex flex-col space-y-2">
                <label className="text-sm font-medium">Merchant</label>
                <Popover open={merchantOpen} onOpenChange={setMerchantOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" className="w-full justify-between">
                      {localFilters.merchant || "Select Merchant"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50 shrink-0" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="p-0 w-[250px]">
                    <Command>
                      <CommandInput placeholder="Search merchant..." />
                      <CommandList>
                        <CommandGroup>
                          {merchantUsers.map((merchant, idx) => (
                            <CommandItem
                              key={idx}
                              value={merchant}
                              onSelect={() => {
                                setLocalFilters(prev => ({ ...prev, merchant }));
                                setMerchantOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  localFilters.merchant === merchant ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {merchant}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="flex flex-col space-y-2">
                <label className="text-sm font-medium">Product Name</label>
                <Popover open={productOpen} onOpenChange={setProductOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" className="w-full justify-between">
                      {localFilters.product_name || "Select Product"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50 shrink-0" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="p-0 w-[250px]">
                    <Command>
                      <CommandInput placeholder="Search product..." />
                      <CommandList>
                        <CommandGroup>
                          {productNames.map((product, idx) => (
                            <CommandItem
                              key={idx}
                              value={product}
                              onSelect={() => {
                                setLocalFilters(prev => ({ ...prev, product_name: product }));
                                setProductOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  localFilters.product_name === product ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {product}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="flex flex-col space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Popover open={statusOpen} onOpenChange={setStatusOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" className="w-full justify-between">
                      {localFilters.status || "Select Status"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50 shrink-0" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="p-0 w-[250px]">
                    <Command>
                      <CommandInput placeholder="Search status..." />
                      <CommandList>
                        <CommandGroup>
                          {STATUS_OPTIONS.map((status, idx) => (
                            <CommandItem
                              key={idx}
                              value={status}
                              onSelect={() => {
                                setLocalFilters(prev => ({ ...prev, status }));
                                setStatusOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  localFilters.status === status ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {status}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="flex flex-col space-y-2">
                <label className="text-sm font-medium">CC Email</label>
                <Popover open={ccOpen} onOpenChange={setCcOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" className="w-full justify-between">
                      {localFilters.cc_email || "Select Call Center"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50 shrink-0" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="p-0 w-[250px]">
                    <Command>
                      <CommandInput placeholder="Search call center..." />
                      <CommandList>
                        <CommandGroup>
                          {ccUsers.map((cc, idx) => (
                            <CommandItem
                              key={idx}
                              value={cc}
                              onSelect={() => {
                                setLocalFilters(prev => ({ ...prev, cc_email: cc }));
                                setCcOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  localFilters.cc_email === cc ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {cc}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="flex flex-col space-y-2">
                <label className="text-sm font-medium">Delivery Date</label>
                <Input
                  type="date"
                  value={localFilters.delivery_date || ""}
                  onChange={(e) =>
                    setLocalFilters((prev) => ({ ...prev, delivery_date: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={resetFilters}>
                Clear
              </Button>
              <Button onClick={applyFilters}>Apply</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </AppLayout>
  );
}