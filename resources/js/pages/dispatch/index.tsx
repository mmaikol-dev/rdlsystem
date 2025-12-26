
"use client";

import AppLayout from "@/layouts/app-layout";
import { type BreadcrumbItem } from "@/types";
import { Head, usePage, router } from "@inertiajs/react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Edit,
  FileText,
  Trash2,
  Lock,
  Filter,
  CalendarIcon,
  Users,
  PackageCheck,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Download,
  Printer
} from "lucide-react";
import * as React from "react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const breadcrumbs: BreadcrumbItem[] = [
  { title: "Dashboard", href: "/dashboard" },
  { title: "Dispatch", href: "/dispatch" },
];

interface SheetOrder {
  id: number;
  order_no: string;
  product_name: string;
  quantity: number;
  amount: string;
  client_name: string;
  phone: string;
  status: string;
  delivery_date: string;
  instructions?: string;
  agent?: string;
  created_at?: string;
}

interface Agent {
  id: number;
  name: string;
}

export default function DispatchView() {
  const { orders, agents, filters, auth, flash } = usePage<{
    orders: any;
    agents: Agent[];
    filters: any;
    auth: any;
    flash?: { success?: string; error?: string };
  }>().props;
  const userRole = auth.user.roles;

  const [searchTerm, setSearchTerm] = React.useState(filters?.search || "");
  const [dateRange, setDateRange] = React.useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: filters?.start_date ? new Date(filters.start_date) : undefined,
    to: filters?.end_date ? new Date(filters.end_date) : undefined,
  });
  const [selectedAgent, setSelectedAgent] = React.useState(filters?.agent || "all");
  const [showFilterModal, setShowFilterModal] = React.useState(false);
  const [showBulkAssignModal, setShowBulkAssignModal] = React.useState(false);
  const [showBulkDownloadModal, setShowBulkDownloadModal] = React.useState(false);
  const [showPrintModal, setShowPrintModal] = React.useState(false);
  const [bulkOrderNumbers, setBulkOrderNumbers] = React.useState("");
  const [bulkDownloadOrderNumbers, setBulkDownloadOrderNumbers] = React.useState("");
  const [bulkSelectedAgent, setBulkSelectedAgent] = React.useState("");
  const [printAgent, setPrintAgent] = React.useState("");
  const [printDateRange, setPrintDateRange] = React.useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({ from: undefined, to: undefined });
  const [editingOrder, setEditingOrder] = React.useState<SheetOrder | null>(null);
  const [editValues, setEditValues] = React.useState<Partial<SheetOrder>>({});
  const [deletingOrder, setDeletingOrder] = React.useState<SheetOrder | null>(null);
  const [showAccessDenied, setShowAccessDenied] = React.useState(false);

  // Loading states
  const [isFiltering, setIsFiltering] = React.useState(false);
  const [isBulkAssigning, setIsBulkAssigning] = React.useState(false);
  const [isBulkDownloading, setIsBulkDownloading] = React.useState(false);
  const [isUpdating, setIsUpdating] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [isDownloading, setIsDownloading] = React.useState<number | null>(null);
  const [updatingAgentId, setUpdatingAgentId] = React.useState<number | null>(null);

  // Restrict merchants
  const restricted = userRole === "merchant";

  const handleRestrictedAction = () => setShowAccessDenied(true);

  // Handle server-side filtering
  const handleApplyFilters = () => {
    setIsFiltering(true);
    router.get(
      "/dispatch",
      {
        search: searchTerm,
        start_date: dateRange.from ? format(dateRange.from, "yyyy-MM-dd") : "",
        end_date: dateRange.to ? format(dateRange.to, "yyyy-MM-dd") : "",
        agent: selectedAgent === "all" ? "" : selectedAgent,
      },
      {
        preserveState: true,
        replace: true,
        onFinish: () => {
          setIsFiltering(false);
          setShowFilterModal(false);
        }
      }
    );
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    setDateRange({ from: undefined, to: undefined });
    setSelectedAgent("all");
    setIsFiltering(true);
    router.get("/dispatch", {}, {
      preserveState: true,
      replace: true,
      onFinish: () => {
        setIsFiltering(false);
        setShowFilterModal(false);
      }
    });
  };

  const handleBulkAssign = () => {
    if (!bulkOrderNumbers.trim() || !bulkSelectedAgent) {
      return;
    }

    setIsBulkAssigning(true);
    router.post("/dispatch/bulk-assign", {
      order_numbers: bulkOrderNumbers,
      agent_name: bulkSelectedAgent,
    }, {
      onSuccess: () => {
        setShowBulkAssignModal(false);
        setBulkOrderNumbers("");
        setBulkSelectedAgent("");
      },
      onFinish: () => setIsBulkAssigning(false),
    });
  };

  const handleBulkDownload = () => {
    if (!bulkDownloadOrderNumbers.trim()) {
      return;
    }

    setIsBulkDownloading(true);

    const form = document.createElement('form');
    form.method = 'POST';
    form.action = '/dispatch/bulk-download-waybills';

    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
    const csrfInput = document.createElement('input');
    csrfInput.type = 'hidden';
    csrfInput.name = '_token';
    csrfInput.value = csrfToken || '';
    form.appendChild(csrfInput);

    const orderInput = document.createElement('input');
    orderInput.type = 'hidden';
    orderInput.name = 'order_numbers';
    orderInput.value = bulkDownloadOrderNumbers;
    form.appendChild(orderInput);

    document.body.appendChild(form);
    form.submit();
    document.body.removeChild(form);

    setTimeout(() => {
      setIsBulkDownloading(false);
      setShowBulkDownloadModal(false);
      setBulkDownloadOrderNumbers("");
      router.reload();
    }, 2000);
  };

  const handlePrintAgentOrders = () => {
    if (!printAgent) {
      return;
    }

    // Build URL with optional date filters
    let url = `/dispatch/agent-orders/${encodeURIComponent(printAgent)}`;
    const params = new URLSearchParams();

    if (printDateRange.from) {
      params.append('start_date', format(printDateRange.from, 'yyyy-MM-dd'));
    }
    if (printDateRange.to) {
      params.append('end_date', format(printDateRange.to, 'yyyy-MM-dd'));
    }

    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    window.open(url, '_blank');
    setShowPrintModal(false);
  };

  const handleEditOpen = (order: SheetOrder) => {
    if (restricted) return handleRestrictedAction();
    setEditingOrder(order);
    setEditValues(order);
  };

  const handleDeleteOpen = (order: SheetOrder) => {
    if (restricted) return handleRestrictedAction();
    setDeletingOrder(order);
  };

  const handleEditSave = () => {
    if (!editingOrder) return;
    setIsUpdating(true);
    router.put(`/sheet_orders/${editingOrder.id}`, editValues, {
      onSuccess: () => setEditingOrder(null),
      onFinish: () => setIsUpdating(false),
    });
  };

  const handleDelete = () => {
    if (!deletingOrder) return;
    setIsDeleting(true);
    router.delete(`/sheet_orders/${deletingOrder.id}`, {
      onSuccess: () => setDeletingOrder(null),
      onFinish: () => setIsDeleting(false),
    });
  };

  const handleDownload = (orderId: number) => {
    setIsDownloading(orderId);
    window.location.href = `/waybill/download/${orderId}`;
    setTimeout(() => setIsDownloading(null), 2000);
  };

  const handleAgentChange = (orderId: number, agentName: string | null) => {
    setUpdatingAgentId(orderId);
    router.put(
      `/sheet_orders/${orderId}`,
      { agent: agentName },
      {
        preserveState: true,
        onFinish: () => setUpdatingAgentId(null),
      }
    );
  };

  const goToPage = (page: number) => {
    router.get(
      `/dispatch?page=${page}`,
      {
        search: searchTerm,
        start_date: dateRange.from ? format(dateRange.from, "yyyy-MM-dd") : "",
        end_date: dateRange.to ? format(dateRange.to, "yyyy-MM-dd") : "",
        agent: selectedAgent === "all" ? "" : selectedAgent,
      },
      { preserveState: true }
    );
  };

  const generatePageNumbers = () => {
    const current = orders.current_page;
    const last = orders.last_page;
    const delta = 2;
    const pages = [];

    for (let i = 1; i <= last; i++) {
      if (
        i === 1 ||
        i === last ||
        (i >= current - delta && i <= current + delta)
      ) {
        pages.push(i);
      } else if (pages[pages.length - 1] !== "...") {
        pages.push("...");
      }
    }

    return pages;
  };

  const parseOrderNumbers = (text: string) => {
    return text
      .split(/[\s,\n]+/)
      .filter(Boolean)
      .map((num) => num.trim());
  };

  const parsedOrders = React.useMemo(
    () => parseOrderNumbers(bulkOrderNumbers),
    [bulkOrderNumbers]
  );

  const parsedDownloadOrders = React.useMemo(
    () => parseOrderNumbers(bulkDownloadOrderNumbers),
    [bulkDownloadOrderNumbers]
  );

  const hasActiveFilters = searchTerm || dateRange.from || dateRange.to || selectedAgent !== "all";

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="Dispatch Orders" />

      <div className="flex flex-col gap-6 p-4 md:p-6">
        {/* Flash Messages */}
        {flash?.success && (
          <Alert className="border-green-200 bg-green-50 animate-in fade-in slide-in-from-top-2 duration-300">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              {flash.success}
            </AlertDescription>
          </Alert>
        )}

        {flash?.error && (
          <Alert variant="destructive" className="animate-in fade-in slide-in-from-top-2 duration-300">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{flash.error}</AlertDescription>
          </Alert>
        )}

        {/* Orders Table */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle className="text-xl">Dispatch Orders</CardTitle>
                <CardDescription>
                  Manage and track all dispatch orders
                </CardDescription>
              </div>
              <div className="flex gap-2 w-full sm:w-auto flex-wrap">
                <Button
                  onClick={() => setShowBulkAssignModal(true)}
                  className="flex-1 sm:flex-none"
                  disabled={isBulkAssigning}
                >
                  {isBulkAssigning ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Users className="mr-2 h-4 w-4" />
                      Assign Orders
                    </>
                  )}
                </Button>
                <Button
                  onClick={() => setShowBulkDownloadModal(true)}
                  variant="secondary"
                  className="flex-1 sm:flex-none"
                  disabled={isBulkDownloading}
                >
                  {isBulkDownloading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Downloading...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Bulk Download
                    </>
                  )}
                </Button>
                <Button
                  onClick={() => setShowPrintModal(true)}
                  variant="outline"
                  className="flex-1 sm:flex-none"
                >
                  <Printer className="mr-2 h-4 w-4" />
                  Print Orders
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowFilterModal(true)}
                  className="relative flex-1 sm:flex-none"
                  disabled={isFiltering}
                >
                  {isFiltering ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Filter size={16} className="mr-2" />
                  )}
                  Filters
                  {hasActiveFilters && !isFiltering && (
                    <span className="absolute -top-1 -right-1 h-3 w-3 bg-blue-500 rounded-full" />
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {orders.data.length === 0 ? (
              <div className="text-center py-12">
                <PackageCheck className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground text-lg">No orders available.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-[120px] font-semibold">Order No</TableHead>
                      <TableHead className="w-[150px] font-semibold">Client</TableHead>
                      <TableHead className="w-[120px] font-semibold">Product</TableHead>
                      <TableHead className="w-[80px] text-right font-semibold">Qty</TableHead>
                      <TableHead className="w-[100px] text-right font-semibold">Amount</TableHead>
                      <TableHead className="w-[120px] font-semibold">Phone</TableHead>
                      <TableHead className="w-[140px] font-semibold">Agent</TableHead>
                      <TableHead className="w-[120px] font-semibold">Status</TableHead>
                      <TableHead className="w-[140px] text-right font-semibold">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.data.map((order: SheetOrder) => (
                      <TableRow key={order.id} className="hover:bg-muted/30">
                        <TableCell
                          className="font-medium w-[120px] truncate"
                          title={order.order_no}
                        >
                          {order.order_no}
                        </TableCell>
                        <TableCell
                          className="w-[120px] truncate"
                          title={order.client_name}
                        >
                          {order.client_name}
                        </TableCell>
                        <TableCell
                          className="w-[120px] truncate"
                          title={order.product_name}
                        >
                          {order.product_name}
                        </TableCell>
                        <TableCell className="text-right w-[80px]">
                          {order.quantity}
                        </TableCell>
                        <TableCell
                          className="text-right w-[100px] truncate font-medium"
                          title={order.amount}
                        >
                          {order.amount}
                        </TableCell>
                        <TableCell
                          className="w-[120px] truncate"
                          title={order.phone}
                        >
                          {order.phone}
                        </TableCell>
                        <TableCell className="w-[140px]">
                          <div className="relative">
                            <Select
                              value={order.agent || "none"}
                              onValueChange={(value) => {
                                const agentName = value === "none" ? null : value;
                                handleAgentChange(order.id, agentName);
                              }}
                              disabled={updatingAgentId === order.id}
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder="No Agent" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">No Agent</SelectItem>
                                {agents?.map((agent) => (
                                  <SelectItem key={agent.id} value={agent.name}>
                                    {agent.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {updatingAgentId === order.id && (
                              <div className="absolute inset-0 flex items-center justify-center bg-background/50 rounded">
                                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="w-[120px]">
                          <Badge
                            variant={order.status === "scheduled" ? "secondary" : "default"}
                            className={cn(
                              "whitespace-nowrap",
                              order.status === "scheduled"
                                ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
                                : "bg-green-100 text-green-800 hover:bg-green-200"
                            )}
                          >
                            {order.status === "scheduled" ? "⏳ Scheduled" : "✅ Dispatched"}
                          </Badge>
                        </TableCell>

                        <TableCell className="text-right w-[140px]">
                          <div className="flex gap-1 justify-end">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditOpen(order)}
                              className="h-8 w-8 p-0"
                              title="Edit order"
                            >
                              <Edit size={14} />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeleteOpen(order)}
                              className="h-8 w-8 p-0"
                              title="Delete order"
                            >
                              <Trash2 size={14} />
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => handleDownload(order.id)}
                              className="h-8 w-8 p-0"
                              title="Download waybill"
                              disabled={isDownloading === order.id}
                            >
                              {isDownloading === order.id ? (
                                <Loader2 size={14} className="animate-spin" />
                              ) : (
                                <FileText size={14} />
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        {orders.last_page > 1 && (
          <div className="flex justify-center items-center gap-2 flex-wrap">
            {orders.prev_page_url && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => goToPage(orders.current_page - 1)}
              >
                Previous
              </Button>
            )}

            {generatePageNumbers().map((page, index) => (
              <React.Fragment key={index}>
                {page === "..." ? (
                  <span className="px-2 text-muted-foreground">...</span>
                ) : (
                  <Button
                    variant={page === orders.current_page ? "default" : "outline"}
                    size="sm"
                    onClick={() => goToPage(page as number)}
                  >
                    {page}
                  </Button>
                )}
              </React.Fragment>
            ))}

            {orders.next_page_url && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => goToPage(orders.current_page + 1)}
              >
                Next
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Print Agent Orders Modal */}
      <Dialog open={showPrintModal} onOpenChange={setShowPrintModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Printer className="w-5 h-5" />
              Print Agent Orders
            </DialogTitle>
            <DialogDescription>
              Select an agent to generate a PDF report of their assigned orders.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-4">
            <div className="space-y-2">
              <Label htmlFor="print_agent" className="text-base font-semibold">
                Select Agent <span className="text-red-500">*</span>
              </Label>
              <Select value={printAgent} onValueChange={setPrintAgent}>
                <SelectTrigger id="print_agent" className="h-11">
                  <SelectValue placeholder="Choose an agent..." />
                </SelectTrigger>
                <SelectContent>
                  {agents?.map((agent) => (
                    <SelectItem key={agent.id} value={agent.name}>
                      {agent.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Required: Select which agent's orders to print
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-base font-semibold">
                Delivery Date Range <span className="text-xs font-normal text-muted-foreground">(Optional)</span>
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full h-11 justify-start text-left font-normal",
                      !printDateRange.from && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {printDateRange.from ? (
                      printDateRange.to ? (
                        <>
                          {format(printDateRange.from, "LLL dd, y")} -{" "}
                          {format(printDateRange.to, "LLL dd, y")}
                        </>
                      ) : (
                        format(printDateRange.from, "LLL dd, y")
                      )
                    ) : (
                      <span>Pick a date range</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={printDateRange.from}
                    selected={printDateRange}
                    onSelect={(range) => setPrintDateRange(range || { from: undefined, to: undefined })}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
              <p className="text-xs text-muted-foreground mt-1">
                Leave empty to print all orders for the selected agent
              </p>
            </div>

            {printAgent && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-blue-900">
                      Ready to print orders for: <strong>{printAgent}</strong>
                    </p>
                    {printDateRange.from && printDateRange.to && (
                      <p className="text-xs text-blue-700">
                        Delivery dates: {format(printDateRange.from, "MMM dd")} - {format(printDateRange.to, "MMM dd, yyyy")}
                      </p>
                    )}
                    {(!printDateRange.from || !printDateRange.to) && (
                      <p className="text-xs text-blue-700">
                        All orders (no date filter)
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowPrintModal(false);
                setPrintAgent("");
                setPrintDateRange({ from: undefined, to: undefined });
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handlePrintAgentOrders}
              disabled={!printAgent}
            >
              <Printer className="mr-2 h-4 w-4" />
              Generate PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Download Modal */}
      <Dialog open={showBulkDownloadModal} onOpenChange={setShowBulkDownloadModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Download className="w-5 h-5" />
              Bulk Download Waybills
            </DialogTitle>
            <DialogDescription>
              Enter multiple order numbers to download their waybills as a ZIP file.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-4">
            <div className="space-y-2">
              <Label htmlFor="bulk_download_order_numbers" className="text-base font-semibold">
                Order Numbers
              </Label>
              <Textarea
                id="bulk_download_order_numbers"
                placeholder="Enter order numbers separated by spaces, commas, or new lines&#10;Example:&#10;ord001 ord002 ord003&#10;or&#10;ord001, ord002, ord003"
                value={bulkDownloadOrderNumbers}
                onChange={(e) => setBulkDownloadOrderNumbers(e.target.value)}
                rows={6}
                className="font-mono text-sm"
                disabled={isBulkDownloading}
              />
              {parsedDownloadOrders.length > 0 && (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm font-medium text-blue-900 mb-2">
                    📦 {parsedDownloadOrders.length} order(s) detected:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {parsedDownloadOrders.map((orderNum, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {orderNum}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowBulkDownloadModal(false);
                setBulkDownloadOrderNumbers("");
              }}
              disabled={isBulkDownloading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleBulkDownload}
              disabled={!bulkDownloadOrderNumbers.trim() || parsedDownloadOrders.length === 0 || isBulkDownloading}
            >
              {isBulkDownloading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Download {parsedDownloadOrders.length > 0 && `${parsedDownloadOrders.length} Waybill(s)`}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Assignment Modal */}
      <Dialog open={showBulkAssignModal} onOpenChange={setShowBulkAssignModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Users className="w-5 h-5" />
              Bulk Assign Orders to Agent
            </DialogTitle>
            <DialogDescription>
              Enter multiple order numbers and select an agent to assign them all at once.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-4">
            <div className="space-y-2">
              <Label htmlFor="bulk_order_numbers" className="text-base font-semibold">
                Order Numbers
              </Label>
              <Textarea
                id="bulk_order_numbers"
                placeholder="Enter order numbers separated by spaces, commas, or new lines&#10;Example:&#10;ord001 ord002 ord003&#10;or&#10;ord001, ord002, ord003"
                value={bulkOrderNumbers}
                onChange={(e) => setBulkOrderNumbers(e.target.value)}
                rows={6}
                className="font-mono text-sm"
                disabled={isBulkAssigning}
              />
              {parsedOrders.length > 0 && (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm font-medium text-blue-900 mb-2">
                    📦 {parsedOrders.length} order(s) detected:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {parsedOrders.map((orderNum, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {orderNum}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="bulk_agent" className="text-base font-semibold">
                Select Agent
              </Label>
              <Select
                value={bulkSelectedAgent}
                onValueChange={setBulkSelectedAgent}
                disabled={isBulkAssigning}
              >
                <SelectTrigger id="bulk_agent" className="h-11">
                  <SelectValue placeholder="Choose an agent..." />
                </SelectTrigger>
                <SelectContent>
                  {agents?.map((agent) => (
                    <SelectItem key={agent.id} value={agent.name}>
                      {agent.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowBulkAssignModal(false);
                setBulkOrderNumbers("");
                setBulkSelectedAgent("");
              }}
              disabled={isBulkAssigning}
            >
              Cancel
            </Button>
            <Button
              onClick={handleBulkAssign}
              disabled={!bulkOrderNumbers.trim() || !bulkSelectedAgent || parsedOrders.length === 0 || isBulkAssigning}
            >
              {isBulkAssigning ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Assigning...
                </>
              ) : (
                <>
                  <Users className="mr-2 h-4 w-4" />
                  Assign {parsedOrders.length > 0 && `${parsedOrders.length} Order(s)`}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Filter Modal */}
      <Dialog open={showFilterModal} onOpenChange={setShowFilterModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filter Orders
            </DialogTitle>
            <DialogDescription>
              Apply filters to narrow down your search results.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="filter_search" className="mb-2 block">
                Search
              </Label>
              <Input
                id="filter_search"
                placeholder="Order, Product, Client..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                disabled={isFiltering}
              />
            </div>

            <div>
              <Label className="mb-2 block">Date Range</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dateRange.from && "text-muted-foreground"
                    )}
                    disabled={isFiltering}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, "LLL dd, y")} -{" "}
                          {format(dateRange.to, "LLL dd, y")}
                        </>
                      ) : (
                        format(dateRange.from, "LLL dd, y")
                      )
                    ) : (
                      <span>Pick a date range</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange.from}
                    selected={dateRange}
                    onSelect={(range) => setDateRange(range || { from: undefined, to: undefined })}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label htmlFor="filter_agent" className="mb-2 block">
                Agent
              </Label>
              <Select
                value={selectedAgent}
                onValueChange={setSelectedAgent}
                disabled={isFiltering}
              >
                <SelectTrigger id="filter_agent">
                  <SelectValue placeholder="All Agents" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Agents</SelectItem>
                  {agents?.map((agent) => (
                    <SelectItem key={agent.name} value={agent.name.toString()}>
                      {agent.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleClearFilters}
              disabled={isFiltering}
            >
              {isFiltering ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Clearing...
                </>
              ) : (
                "Clear All"
              )}
            </Button>
            <Button
              onClick={handleApplyFilters}
              disabled={isFiltering}
            >
              {isFiltering ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Applying...
                </>
              ) : (
                "Apply Filters"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog
        open={!!editingOrder}
        onOpenChange={(open) => !open && setEditingOrder(null)}
      >
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5" />
              Edit Order
            </DialogTitle>
            <DialogDescription>
              Update order information below.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <Label htmlFor="edit_order_no">Order No</Label>
              <Input
                id="edit_order_no"
                value={editValues.order_no || ""}
                onChange={(e) =>
                  setEditValues({ ...editValues, order_no: e.target.value })
                }
                disabled={isUpdating}
              />
            </div>
            <div>
              <Label htmlFor="edit_product_name">Product Name</Label>
              <Input
                id="edit_product_name"
                value={editValues.product_name || ""}
                onChange={(e) =>
                  setEditValues({ ...editValues, product_name: e.target.value })
                }
                disabled={isUpdating}
              />
            </div>
            <div>
              <Label htmlFor="edit_quantity">Quantity</Label>
              <Input
                id="edit_quantity"
                type="number"
                value={editValues.quantity || ""}
                onChange={(e) =>
                  setEditValues({ ...editValues, quantity: parseInt(e.target.value) })
                }
                disabled={isUpdating}
              />
            </div>
            <div>
              <Label htmlFor="edit_amount">Amount</Label>
              <Input
                id="edit_amount"
                value={editValues.amount || ""}
                onChange={(e) =>
                  setEditValues({ ...editValues, amount: e.target.value })
                }
                disabled={isUpdating}
              />
            </div>
            <div>
              <Label htmlFor="edit_client_name">Client Name</Label>
              <Input
                id="edit_client_name"
                value={editValues.client_name || ""}
                onChange={(e) =>
                  setEditValues({ ...editValues, client_name: e.target.value })
                }
                disabled={isUpdating}
              />
            </div>
            <div>
              <Label htmlFor="edit_phone">Phone</Label>
              <Input
                id="edit_phone"
                value={editValues.phone || ""}
                onChange={(e) =>
                  setEditValues({ ...editValues, phone: e.target.value })
                }
                disabled={isUpdating}
              />
            </div>
            <div>
              <Label htmlFor="edit_agent">Agent</Label>
              <Select
                value={editValues.agent || "none"}
                onValueChange={(value) =>
                  setEditValues({
                    ...editValues,
                    agent: value === "none" ? null : value
                  })
                }
                disabled={isUpdating}
              >
                <SelectTrigger id="edit_agent">
                  <SelectValue placeholder="Select Agent" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Agent</SelectItem>
                  {agents?.map((agent) => (
                    <SelectItem key={agent.id} value={agent.name}>
                      {agent.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit_status">Status</Label>
              <Select
                value={editValues.status || ""}
                onValueChange={(value) =>
                  setEditValues({ ...editValues, status: value })
                }
                disabled={isUpdating}
              >
                <SelectTrigger id="edit_status">
                  <SelectValue placeholder="Select Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="dispatched">Dispatched</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit_delivery_date">Delivery Date</Label>
              <Input
                id="edit_delivery_date"
                type="date"
                value={editValues.delivery_date || ""}
                onChange={(e) =>
                  setEditValues({ ...editValues, delivery_date: e.target.value })
                }
                disabled={isUpdating}
              />
            </div>
            <div>
              <Label htmlFor="edit_instructions">Instructions</Label>
              <Input
                id="edit_instructions"
                value={editValues.instructions || ""}
                onChange={(e) =>
                  setEditValues({ ...editValues, instructions: e.target.value })
                }
                disabled={isUpdating}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setEditingOrder(null)}
              disabled={isUpdating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleEditSave}
              disabled={isUpdating}
            >
              {isUpdating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog
        open={!!deletingOrder}
        onOpenChange={(open) => !open && setDeletingOrder(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="w-5 h-5" />
              Confirm Delete
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete order{" "}
              <strong className="text-foreground">{deletingOrder?.order_no}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setDeletingOrder(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Order
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Access Denied Modal */}
      <Dialog open={showAccessDenied} onOpenChange={setShowAccessDenied}>
        <DialogContent className="max-w-sm text-center">
          <DialogHeader>
            <Lock className="w-12 h-12 text-red-500 mx-auto mb-2" />
            <DialogTitle className="text-lg font-bold">
              Access Not Allowed
            </DialogTitle>
            <DialogDescription>
              Your account does not have permission to perform this action.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center mt-4">
            <Button onClick={() => setShowAccessDenied(false)}>OK</Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}