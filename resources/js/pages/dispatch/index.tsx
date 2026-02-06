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
import { Switch } from "@/components/ui/switch";
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
  Printer,
  XCircle,
  UserX,
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
  confirmed?: number;
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

  const [bulkDownloadAgent, setBulkDownloadAgent] = React.useState("all");
  const [bulkDownloadDateRange, setBulkDownloadDateRange] = React.useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({ from: undefined, to: undefined });
  // Loading states
  const [isFiltering, setIsFiltering] = React.useState(false);
  const [isBulkAssigning, setIsBulkAssigning] = React.useState(false);
  const [isBulkDownloading, setIsBulkDownloading] = React.useState(false);
  const [isUpdating, setIsUpdating] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [isDownloading, setIsDownloading] = React.useState<number | null>(null);
  const [updatingAgentId, setUpdatingAgentId] = React.useState<number | null>(null);
  const [togglingAgentId, setTogglingAgentId] = React.useState<number | null>(null);

  // Success/Error modals
  const [showSuccessModal, setShowSuccessModal] = React.useState(false);
  const [showErrorModal, setShowErrorModal] = React.useState(false);
  const [successMessage, setSuccessMessage] = React.useState("");
  const [errorMessage, setErrorMessage] = React.useState("");

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

    // Create a form to submit the POST request and trigger PDF download
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = '/dispatch/bulk-assign';
    form.target = '_blank'; // Open PDF in new tab

    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
    const csrfInput = document.createElement('input');
    csrfInput.type = 'hidden';
    csrfInput.name = '_token';
    csrfInput.value = csrfToken || '';
    form.appendChild(csrfInput);

    const orderInput = document.createElement('input');
    orderInput.type = 'hidden';
    orderInput.name = 'order_numbers';
    orderInput.value = bulkOrderNumbers;
    form.appendChild(orderInput);

    const agentInput = document.createElement('input');
    agentInput.type = 'hidden';
    agentInput.name = 'agent_name';
    agentInput.value = bulkSelectedAgent;
    form.appendChild(agentInput);

    document.body.appendChild(form);
    form.submit();
    document.body.removeChild(form);

    // Wait a bit for the assignment to process, then reload the page data
    setTimeout(() => {
      setIsBulkAssigning(false);
      setShowBulkAssignModal(false);
      setSuccessMessage(`Successfully assigned orders to ${bulkSelectedAgent}. PDF is downloading...`);
      setShowSuccessModal(true);
      setBulkOrderNumbers("");
      setBulkSelectedAgent("");

      // Reload the page data to show updated assignments
      router.reload({ only: ['orders'] });
    }, 1500);
  };

  // ✅ UPDATED: Handle bulk download with optional filters
  const handleBulkDownload = () => {
    // Allow download if there are order numbers OR filters are set
    const hasOrderNumbers = bulkDownloadOrderNumbers.trim();
    const hasFilters = bulkDownloadAgent !== "all" || bulkDownloadDateRange.from;

    if (!hasOrderNumbers && !hasFilters) {
      setErrorMessage("Please enter order numbers or select at least one filter (agent or date range).");
      setShowErrorModal(true);
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

    // Add order numbers if provided
    if (hasOrderNumbers) {
      const orderInput = document.createElement('input');
      orderInput.type = 'hidden';
      orderInput.name = 'order_numbers';
      orderInput.value = bulkDownloadOrderNumbers;
      form.appendChild(orderInput);
    }

    // Add agent filter if set
    if (bulkDownloadAgent && bulkDownloadAgent !== "all") {
      const agentInput = document.createElement('input');
      agentInput.type = 'hidden';
      agentInput.name = 'agent';
      agentInput.value = bulkDownloadAgent;
      form.appendChild(agentInput);
    }

    // Add date range filters if set
    if (bulkDownloadDateRange.from) {
      const startDateInput = document.createElement('input');
      startDateInput.type = 'hidden';
      startDateInput.name = 'start_date';
      startDateInput.value = format(bulkDownloadDateRange.from, 'yyyy-MM-dd');
      form.appendChild(startDateInput);
    }

    if (bulkDownloadDateRange.to) {
      const endDateInput = document.createElement('input');
      endDateInput.type = 'hidden';
      endDateInput.name = 'end_date';
      endDateInput.value = format(bulkDownloadDateRange.to, 'yyyy-MM-dd');
      form.appendChild(endDateInput);
    }

    document.body.appendChild(form);
    form.submit();
    document.body.removeChild(form);

    setTimeout(() => {
      setIsBulkDownloading(false);
      setShowBulkDownloadModal(false);
      setBulkDownloadOrderNumbers("");
      setBulkDownloadAgent("all");
      setBulkDownloadDateRange({ from: undefined, to: undefined });
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
      onSuccess: () => {
        setEditingOrder(null);
        setSuccessMessage("Order updated successfully!");
        setShowSuccessModal(true);
      },
      onError: (errors) => {
        setErrorMessage("Failed to update order. Please try again.");
        setShowErrorModal(true);
      },
      onFinish: () => setIsUpdating(false),
    });
  };

  const handleDelete = () => {
    if (!deletingOrder) return;
    setIsDeleting(true);
    router.delete(`/sheet_orders/${deletingOrder.id}`, {
      onSuccess: () => {
        setDeletingOrder(null);
        setSuccessMessage("Order deleted successfully!");
        setShowSuccessModal(true);
      },
      onError: (errors) => {
        setErrorMessage("Failed to delete order. Please try again.");
        setShowErrorModal(true);
      },
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
        onSuccess: () => {
          setSuccessMessage(`Agent ${agentName ? 'assigned' : 'removed'} successfully!`);
          setShowSuccessModal(true);
        },
        onError: (errors) => {
          setErrorMessage("Failed to update agent. Please try again.");
          setShowErrorModal(true);
        },
        onFinish: () => setUpdatingAgentId(null),
      }
    );
  };

  const handleAgentToggle = (order: SheetOrder, checked: boolean) => {
    if (!checked && order.agent) {
      // Directly unassign without confirmation modal
      setTogglingAgentId(order.id);
      router.put(
        `/sheet_orders/${order.id}`,
        { agent: null },
        {
          preserveState: true,
          onSuccess: () => {
            setSuccessMessage(`Agent unassigned from order ${order.order_no} successfully!`);
            setShowSuccessModal(true);
          },
          onError: (errors) => {
            setErrorMessage("Failed to unassign agent. Please try again.");
            setShowErrorModal(true);
          },
          onFinish: () => setTogglingAgentId(null),
        }
      );
    }
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
                      <TableHead className="w-[180px] font-semibold">Agent</TableHead>
                      <TableHead className="w-[80px] font-semibold">Active</TableHead>
                      <TableHead className="w-[120px] font-semibold">Status</TableHead>
                      <TableHead className="w-[140px] text-right font-semibold">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.data.map((order: SheetOrder) => (
                      <TableRow
                        key={order.id}
                        className={cn(
                          order.confirmed === 0 ? "bg-red-100 hover:!bg-red-200" : "hover:bg-muted/30"
                        )}
                        style={order.confirmed === 0 ? { backgroundColor: '#fee2e2' } : undefined}
                      >
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
                        <TableCell className="w-[180px]">
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
                        <TableCell className="w-[80px]">
                          {order.agent ? (
                            <div className="flex items-center justify-center">
                              {togglingAgentId === order.id ? (
                                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                              ) : (
                                <Switch
                                  checked={!!order.agent}
                                  onCheckedChange={(checked) => handleAgentToggle(order, checked)}
                                  disabled={togglingAgentId === order.id}
                                  className="data-[state=checked]:bg-green-500"
                                />
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center justify-center">
                              <span className="text-xs text-muted-foreground">N/A</span>
                            </div>
                          )}
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

      {/* Success Modal */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <div className="flex flex-col items-center gap-3">
              <div className="rounded-full bg-green-100 p-3">
                <CheckCircle2 className="w-8 h-8 text-green-600" /></div>
              <DialogTitle className="text-center text-lg">Success!</DialogTitle>
            </div>
          </DialogHeader>
          <div className="text-center py-2">
            <p className="text-sm text-muted-foreground">{successMessage}</p>
          </div>
          <DialogFooter className="sm:justify-center">
            <Button onClick={() => setShowSuccessModal(false)} className="w-full sm:w-auto">
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Error Modal */}
      <Dialog open={showErrorModal} onOpenChange={setShowErrorModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <div className="flex flex-col items-center gap-3">
              <div className="rounded-full bg-red-100 p-3">
                <XCircle className="w-8 h-8 text-red-600" />
              </div>
              <DialogTitle className="text-center text-lg">Error</DialogTitle>
            </div>
          </DialogHeader>
          <div className="text-center py-2">
            <p className="text-sm text-muted-foreground">{errorMessage}</p>
          </div>
          <DialogFooter className="sm:justify-center">
            <Button onClick={() => setShowErrorModal(false)} variant="destructive" className="w-full sm:w-auto">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Download className="w-5 h-5" />
              Bulk Download Waybills
            </DialogTitle>
            <DialogDescription>
              Download waybills by entering specific order numbers, or filter by agent and date range.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="order_numbers" className="text-base font-semibold">
                Order Numbers <span className="text-xs font-normal text-muted-foreground">(Optional)</span>
              </Label>
              <Textarea
                id="order_numbers"
                placeholder="Enter order numbers (e.g., ORD001, ORD002, ORD003 or one per line) - Leave empty to use filters below"
                value={bulkDownloadOrderNumbers}
                onChange={(e) => setBulkDownloadOrderNumbers(e.target.value)}
                className="min-h-[100px]"
              />
              <p className="text-xs text-muted-foreground">
                Separate by commas, spaces, or new lines. Maximum 50 orders per batch.
              </p>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or filter by
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="download_agent" className="text-base font-semibold">
                Agent <span className="text-xs font-normal text-muted-foreground">(Optional)</span>
              </Label>
              <Select
                value={bulkDownloadAgent}
                onValueChange={setBulkDownloadAgent}
                disabled={parsedDownloadOrders.length > 0}
              >
                <SelectTrigger id="download_agent" className="h-11">
                  <SelectValue placeholder="All Agents" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Agents</SelectItem>
                  {agents?.map((agent) => (
                    <SelectItem key={agent.id} value={agent.name}>
                      {agent.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {parsedDownloadOrders.length > 0
                  ? "Disabled when order numbers are provided"
                  : "Select an agent to download their waybills"}
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
                    disabled={parsedDownloadOrders.length > 0}
                    className={cn(
                      "w-full h-11 justify-start text-left font-normal",
                      !bulkDownloadDateRange.from && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {bulkDownloadDateRange.from ? (
                      bulkDownloadDateRange.to ? (
                        <>
                          {format(bulkDownloadDateRange.from, "LLL dd, y")} -{" "}
                          {format(bulkDownloadDateRange.to, "LLL dd, y")}
                        </>
                      ) : (
                        format(bulkDownloadDateRange.from, "LLL dd, y")
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
                    defaultMonth={bulkDownloadDateRange.from}
                    selected={bulkDownloadDateRange}
                    onSelect={(range) => setBulkDownloadDateRange(range || { from: undefined, to: undefined })}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
              <p className="text-xs text-muted-foreground">
                {parsedDownloadOrders.length > 0
                  ? "Disabled when order numbers are provided"
                  : "Leave empty to download all dates"}
              </p>
            </div>

            {parsedDownloadOrders.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Orders to Download ({parsedDownloadOrders.length})</Label>
                <div className="p-3 border rounded-lg max-h-[200px] overflow-y-auto bg-muted/30">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {parsedDownloadOrders.map((order, idx) => (
                      <div
                        key={idx}
                        className="px-2 py-1 text-sm bg-background border rounded truncate"
                        title={order}
                      >
                        {order}
                      </div>
                    ))}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  A PDF containing {parsedDownloadOrders.length} waybill(s) will be generated.
                </p>
              </div>
            )}

            {parsedDownloadOrders.length === 0 && (bulkDownloadAgent !== "all" || bulkDownloadDateRange.from) && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-blue-900">
                      Download waybills with filters:
                    </p>
                    <ul className="text-xs text-blue-700 space-y-1">
                      {bulkDownloadAgent && bulkDownloadAgent !== "all" && (
                        <li>• Agent: <strong>{bulkDownloadAgent}</strong></li>
                      )}
                      {bulkDownloadDateRange.from && bulkDownloadDateRange.to && (
                        <li>
                          • Date Range: {format(bulkDownloadDateRange.from, "MMM dd")} - {format(bulkDownloadDateRange.to, "MMM dd, yyyy")}
                        </li>
                      )}
                      {(!bulkDownloadAgent || bulkDownloadAgent === "all") && (
                        <li>• All agents</li>
                      )}
                      {!bulkDownloadDateRange.from && (
                        <li>• All dates</li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowBulkDownloadModal(false);
                setBulkDownloadOrderNumbers("");
                setBulkDownloadAgent("all");
                setBulkDownloadDateRange({ from: undefined, to: undefined });
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleBulkDownload}
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
                  Download Waybills
                  {parsedDownloadOrders.length > 0 && ` (${parsedDownloadOrders.length})`}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Assign Modal */}
      <Dialog open={showBulkAssignModal} onOpenChange={setShowBulkAssignModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Users className="w-5 h-5" />
              Bulk Assign Orders
            </DialogTitle>
            <DialogDescription>
              Assign multiple orders to an agent and generate a consolidated waybill PDF.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="bulk_order_numbers" className="text-base font-semibold">
                Order Numbers <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="bulk_order_numbers"
                placeholder="Enter order numbers (e.g., ORD001, ORD002, ORD003 or one per line)"
                value={bulkOrderNumbers}
                onChange={(e) => setBulkOrderNumbers(e.target.value)}
                className="min-h-[120px]"
              />
              <p className="text-xs text-muted-foreground">
                Separate by commas, spaces, or new lines. Maximum 50 orders per batch.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bulk_agent" className="text-base font-semibold">
                Select Agent <span className="text-red-500">*</span>
              </Label>
              <Select value={bulkSelectedAgent} onValueChange={setBulkSelectedAgent}>
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
              <p className="text-xs text-muted-foreground">
                Required: All selected orders will be assigned to this agent.
              </p>
            </div>

            {parsedOrders.length > 0 && bulkSelectedAgent && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-blue-900">
                      Ready to assign {parsedOrders.length} order(s) to <strong>{bulkSelectedAgent}</strong>
                    </p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {parsedOrders.slice(0, 10).map((order, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 text-xs bg-white border border-blue-300 rounded truncate"
                          title={order}
                        >
                          {order}
                        </span>
                      ))}
                      {parsedOrders.length > 10 && (
                        <span className="px-2 py-1 text-xs bg-white border border-blue-300 rounded">
                          +{parsedOrders.length - 10} more
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-blue-700 mt-2">
                      A consolidated PDF waybill will automatically download after assignment.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowBulkAssignModal(false);
                setBulkOrderNumbers("");
                setBulkSelectedAgent("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleBulkAssign}
              disabled={!parsedOrders.length || !bulkSelectedAgent || isBulkAssigning}
            >
              {isBulkAssigning ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Users className="mr-2 h-4 w-4" />
                  Assign Orders ({parsedOrders.length})
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
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Filter className="w-5 h-5" />
              Filter Orders
            </DialogTitle>
            <DialogDescription>
              Narrow down orders by search, date range, or assigned agent.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-4">
            <div className="space-y-2">
              <Label htmlFor="search" className="text-base font-semibold">
                Search
              </Label>
              <Input
                id="search"
                placeholder="Search by order number, client, product..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-11"
              />
              <p className="text-xs text-muted-foreground">
                Searches across order number, client name, product name, and phone
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-base font-semibold">Delivery Date Range</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full h-11 justify-start text-left font-normal",
                      !dateRange.from && "text-muted-foreground"
                    )}
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
                    onSelect={setDateRange}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
              <p className="text-xs text-muted-foreground">
                Leave empty to show all delivery dates
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="agent_filter" className="text-base font-semibold">
                Assigned Agent
              </Label>
              <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                <SelectTrigger id="agent_filter" className="h-11">
                  <SelectValue placeholder="All Agents" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Agents</SelectItem>
                  {agents?.map((agent) => (
                    <SelectItem key={agent.id} value={agent.name}>
                      {agent.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Shows orders assigned to a specific agent, or all agents
              </p>
            </div>

            {hasActiveFilters && (
              <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <Filter className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-orange-900">Active Filters:</p>
                    <ul className="text-xs text-orange-700 mt-1 space-y-1">
                      {searchTerm && <li>Search: "{searchTerm}"</li>}
                      {dateRange.from && dateRange.to && (
                        <li>
                          Date Range: {format(dateRange.from, "MMM dd")} - {format(dateRange.to, "MMM dd, yyyy")}
                        </li>
                      )}
                      {selectedAgent !== "all" && <li>Agent: {selectedAgent}</li>}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={handleClearFilters}
              disabled={!hasActiveFilters || isFiltering}
            >
              Clear All
            </Button>
            <Button onClick={handleApplyFilters} disabled={isFiltering}>
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

      {/* Edit Order Modal */}
      <Dialog open={!!editingOrder} onOpenChange={(open) => !open && setEditingOrder(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Edit className="w-5 h-5" />
              Edit Order: {editingOrder?.order_no}
            </DialogTitle>
            <DialogDescription>
              Update order details. Changes will be reflected immediately.
            </DialogDescription>
          </DialogHeader>
          {editingOrder && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_order_no">Order Number</Label>
                  <Input
                    id="edit_order_no"
                    value={editValues.order_no || ""}
                    onChange={(e) => setEditValues({ ...editValues, order_no: e.target.value })}
                    className="h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_client_name">Client Name</Label>
                  <Input
                    id="edit_client_name"
                    value={editValues.client_name || ""}
                    onChange={(e) => setEditValues({ ...editValues, client_name: e.target.value })}
                    className="h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_product_name">Product Name</Label>
                  <Input
                    id="edit_product_name"
                    value={editValues.product_name || ""}
                    onChange={(e) => setEditValues({ ...editValues, product_name: e.target.value })}
                    className="h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_quantity">Quantity</Label>
                  <Input
                    id="edit_quantity"
                    type="number"
                    value={editValues.quantity || ""}
                    onChange={(e) => setEditValues({ ...editValues, quantity: parseInt(e.target.value) || 0 })}
                    className="h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_amount">Amount</Label>
                  <Input
                    id="edit_amount"
                    value={editValues.amount || ""}
                    onChange={(e) => setEditValues({ ...editValues, amount: e.target.value })}
                    className="h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_phone">Phone</Label>
                  <Input
                    id="edit_phone"
                    value={editValues.phone || ""}
                    onChange={(e) => setEditValues({ ...editValues, phone: e.target.value })}
                    className="h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_status">Status</Label>
                  <Select
                    value={editValues.status || "scheduled"}
                    onValueChange={(value) => setEditValues({ ...editValues, status: value })}
                  >
                    <SelectTrigger id="edit_status" className="h-10">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                      <SelectItem value="dispatched">Dispatched</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_delivery_date">Delivery Date</Label>
                  <Input
                    id="edit_delivery_date"
                    type="date"
                    value={editValues.delivery_date?.substring(0, 10) || ""}
                    onChange={(e) => setEditValues({ ...editValues, delivery_date: e.target.value })}
                    className="h-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_instructions">Instructions</Label>
                <Textarea
                  id="edit_instructions"
                  value={editValues.instructions || ""}
                  onChange={(e) => setEditValues({ ...editValues, instructions: e.target.value })}
                  className="min-h-[80px]"
                  placeholder="Any special delivery instructions..."
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditingOrder(null)}>
              Cancel
            </Button>
            <Button onClick={handleEditSave} disabled={isUpdating}>
              {isUpdating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={!!deletingOrder} onOpenChange={(open) => !open && setDeletingOrder(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex flex-col items-center gap-3">
              <div className="rounded-full bg-red-100 p-3">
                <Trash2 className="w-8 h-8 text-red-600" />
              </div>
              <DialogTitle className="text-center text-lg">Delete Order?</DialogTitle>
            </div>
          </DialogHeader>
          <div className="text-center py-2 space-y-2">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete order{" "}
              <strong className="text-foreground">{deletingOrder?.order_no}</strong>?
            </p>
            <p className="text-xs text-muted-foreground">
              This action cannot be undone. The order will be permanently removed from the system.
            </p>
          </div>
          <DialogFooter className="sm:justify-center gap-2">
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
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Access Denied Modal */}
      <Dialog open={showAccessDenied} onOpenChange={setShowAccessDenied}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <div className="flex flex-col items-center gap-3">
              <div className="rounded-full bg-yellow-100 p-3">
                <Lock className="w-8 h-8 text-yellow-600" />
              </div>
              <DialogTitle className="text-center text-lg">Access Denied</DialogTitle>
            </div>
          </DialogHeader>
          <div className="text-center py-2">
            <p className="text-sm text-muted-foreground">
              You don't have permission to perform this action. Please contact your administrator.
            </p>
          </div>
          <DialogFooter className="sm:justify-center">
            <Button onClick={() => setShowAccessDenied(false)} className="w-full sm:w-auto">
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}