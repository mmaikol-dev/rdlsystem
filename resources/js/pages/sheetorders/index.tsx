"use client";

import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, usePage, router } from '@inertiajs/react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from "@/components/ui/badge"
import { Calendar1Icon, CopyIcon, EyeIcon, FilterIcon, MessageCircleMoreIcon, MoreHorizontal, PlusIcon, RefreshCwIcon, Send, Trash2Icon, MicIcon, MicOffIcon } from "lucide-react";
import * as React from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { PhoneIcon } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  'cc_email', 'order_no', 'client_name', 'quantity', 'amount', 'product_name', 'address', 'phone',
  'alt_no', 'status', 'delivery_date', 'instructions', 'code', 'merchant',
] as const;

const STATUS_OPTIONS = [
  'Scheduled',
  'Dispatched',
  'Followup',
  'Duplicate',
  'Cancelled',
  'Pending',
  'Expired',
  'Returned',
  'WrongContact',
  'Delivered',
  'New Orders',
] as const;

const statusColors: Record<string, string> = {
  Scheduled: "text-blue-600 font-semibold",
  Dispatched: "text-indigo-600 font-semibold",
  Followup: "text-purple-600 font-semibold",
  Duplicate: "text-pink-600 font-semibold",
  Cancelled: "text-red-600 font-semibold",
  Pending: "text-yellow-600 font-semibold",
  Expired: "text-orange-600 font-semibold",
  Returned: "text-rose-600 font-semibold",
  WrongContact: "text-gray-600 italic",
  Delivered: "text-green-600 font-semibold",
  "New Orders": "text-teal-600 font-semibold",
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
                : String(order[col as keyof SheetOrder] || "");

          // ✅ Apply green color to all columns if the row has a code value
          const hasCode = order.code && order.code.trim() !== "";

          const colorClass =
            col === "status"
              ? statusColors[value] || ""
              : hasCode
                ? "text-green-600 font-semibold"
                : "";

          return (
            <TableCell
              key={col}
              className={`cursor-pointer min-w-[130px] max-w-[130px] truncate ${highlighted[key] ? "bg-green-200" : ""
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

  const { orders, merchantUsers, totalOrders, ccUsers, merchantData } = props as unknown as {
    orders: { data: SheetOrder[], links: any[] },
    merchantUsers: string[],
    totalOrders: number;
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
  const [dialNumber, setDialNumber] = React.useState("");
  const [callStatus, setCallStatus] = React.useState<"Idle" | "Calling" | "Connected" | "Ended">("Idle");
  const [callTimer, setCallTimer] = React.useState(0);
  const timerRef = React.useRef<NodeJS.Timeout | null>(null);

  // Voice-to-text states
  const [isListening, setIsListening] = React.useState(false);
  const [speechRecognition, setSpeechRecognition] = React.useState<any>(null);
  const [isSpeechSupported, setIsSpeechSupported] = React.useState(false);
  const [transcript, setTranscript] = React.useState('');
  const [interimTranscript, setInterimTranscript] = React.useState('');
  const [speechError, setSpeechError] = React.useState<string | null>(null);

  // Initialize speech recognition
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        setIsSpeechSupported(true);
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event: any) => {
          let finalTranscript = '';
          let interim = '';

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript;
            } else {
              interim += transcript;
            }
          }

          if (finalTranscript) {
            setTranscript(prev => prev + ' ' + finalTranscript);
            if (editing?.field === 'instructions') {
              setEditValue(prev => prev + ' ' + finalTranscript);
            }
            if (createModalOpen && newOrder.instructions !== undefined) {
              setNewOrder(prev => ({
                ...prev,
                instructions: (prev.instructions || '') + ' ' + finalTranscript
              }));
            }
          }

          setInterimTranscript(interim);
        };

        recognition.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          setSpeechError(event.error);
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
          setInterimTranscript('');
        };

        setSpeechRecognition(recognition);
      }
    }
  }, [editing, createModalOpen]);

  const toggleListening = () => {
    if (!speechRecognition || !isSpeechSupported) return;

    if (isListening) {
      speechRecognition.stop();
      setIsListening(false);
      setInterimTranscript('');
    } else {
      try {
        speechRecognition.start();
        setIsListening(true);
        setSpeechError(null);
        setInterimTranscript('');
      } catch (error) {
        console.error('Failed to start speech recognition:', error);
        setSpeechError('Failed to start listening');
      }
    }
  };

  const startCall = async () => {
    if (!dialNumber) return;
    setCallStatus("Calling");

    try {
      const response = await fetch("api/make-call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: dialNumber,
        }),
      });

      if (!response.ok) throw new Error("Failed to initiate call");

      // Wait until AT connects the call (backend callback can update status)
      setTimeout(() => {
        setCallStatus("Connected");
        setCallTimer(0);

        timerRef.current = setInterval(() => {
          setCallTimer((t) => t + 1);
        }, 1000);
      }, 2000);
    } catch (error) {
      console.error(error);
      setCallStatus("Idle");
      alert("Call failed ❌");
    }
  };

  const endCall = async () => {
    setCallStatus("Ended");
    if (timerRef.current) clearInterval(timerRef.current);

    try {
      await fetch("api/end-call", { method: "POST" });
    } catch (err) {
      console.error("Failed to end call", err);
    }
  };

  const resetCall = () => {
    setDialNumber("");
    setCallStatus("Idle");
    setCallTimer(0);
  };

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
          className={`fixed top-5 right-5 px-4 py-3 rounded-lg shadow-lg text-white transition-opacity duration-500 z-50 ${whatsappAlert.type === 'success' ? 'bg-green-500' : 'bg-red-500'
            }`}
        >
          <strong className="block">
            {whatsappAlert.type === 'success' ? 'Success' : 'Error'}
          </strong>
          <span className="text-sm">{whatsappAlert.message}</span>
        </div>
      )}

      <div className="flex justify-between items-center mb-2 pt-4 px-4">
        {/* Left side - Total Orders */}
        <Badge className="bg-black text-white px-3 py-1 rounded">
          Total: {totalOrders}
        </Badge>
        <div className="flex space-x-2">
          {/* Filter Orders */}
          <Button
            className="h-8 w-8 p-0 text-sm"
            onClick={() => setFilterDialogOpen(true)}
          >
            <FilterIcon className="h-4 w-4" />
          </Button>

          <Sheet>
            <SheetTrigger asChild>
              <Button className="h-8 w-8 p-0 text-sm">
                <PhoneIcon className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[350px] sm:w-[400px]">
              <SheetHeader>
                <SheetTitle>Phone Panel</SheetTitle>
              </SheetHeader>

              <Tabs defaultValue="dialpad" className="mt-4">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="dialpad">Dial Pad</TabsTrigger>
                  <TabsTrigger value="incoming">
                    Incoming <Badge variant="secondary" className="ml-1">2</Badge>
                  </TabsTrigger>
                  <TabsTrigger value="missed">
                    Missed <Badge variant="destructive" className="ml-1">1</Badge>
                  </TabsTrigger>
                </TabsList>

                {/* Dial Pad */}
                <TabsContent value="dialpad" className="mt-4 space-y-4">
                  <div className="space-y-2">
                    <Input
                      value={dialNumber}
                      onChange={(e) => setDialNumber(e.target.value)}
                      placeholder="Enter number"
                      className="text-lg text-center"
                    />
                    <div className="text-center text-sm text-muted-foreground">
                      {callStatus} {callStatus === "Connected" && `⏱ ${callTimer}s`}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"].map((num) => (
                      <Button
                        key={num}
                        className="h-12 p-0 text-sm"
                        onClick={() => setDialNumber(dialNumber + num)}
                      >
                        {num}
                      </Button>
                    ))}
                  </div>

                  <div className="flex justify-center space-x-4 mt-4">
                    {callStatus === "Idle" && (
                      <Button
                        className="bg-green-600 hover:bg-green-700 px-6 text-white"
                        onClick={startCall}
                      >
                        Call
                      </Button>
                    )}
                    {callStatus === "Calling" && (
                      <Button
                        className="bg-yellow-500 hover:bg-yellow-600 px-6 text-white"
                        disabled
                      >
                        Calling...
                      </Button>
                    )}
                    {callStatus === "Connected" && (
                      <Button
                        className="bg-red-600 hover:bg-red-700 px-6 text-white"
                        onClick={endCall}
                      >
                        End Call
                      </Button>
                    )}
                    {callStatus === "Ended" && (
                      <Button variant="secondary" onClick={resetCall}>
                        Reset
                      </Button>
                    )}
                  </div>
                </TabsContent>

                {/* Incoming Calls */}
                <TabsContent value="incoming" className="mt-4 space-y-2">
                  <div className="p-2 border rounded-md flex items-center">
                    📞 John Doe - 0722000000
                  </div>
                  <div className="p-2 border rounded-md flex items-center">
                    📞 Jane Smith - 0733000000
                  </div>
                </TabsContent>

                {/* Missed Calls */}
                <TabsContent value="missed" className="mt-4 space-y-2">
                  <div className="p-2 border rounded-md text-red-600 flex items-center">
                    ❌ Missed - 0700111222
                  </div>
                </TabsContent>
              </Tabs>
            </SheetContent>
          </Sheet>

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
                    <TableHead className="min-w-[40px] text-sm font-medium border border-gray-300 sticky right-0 bg-background z-20">
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
            {/* Previous */}
            <PaginationItem>
              <PaginationPrevious
                as="button"
                disabled={!orders.links.find(l => l.label.includes("Previous"))?.url}
                onClick={() => {
                  const prev = orders.links.find(l => l.label.includes("Previous"))?.url;
                  if (prev) router.get(prev, {}, { preserveState: true, preserveScroll: true });
                }}
              />
            </PaginationItem>

            {/* Page Numbers */}
            {orders.links
              .filter(l => !l.label.includes("Previous") && !l.label.includes("Next"))
              .map(link => (
                <PaginationItem key={link.label}>
                  <PaginationLink
                    as="button"
                    isActive={link.active}
                    aria-current={link.active ? "page" : undefined}
                    onClick={() => {
                      if (link.url) router.get(link.url, {}, { preserveState: true, preserveScroll: true });
                    }}
                  >
                    {link.label}
                  </PaginationLink>
                </PaginationItem>
              ))}

            {/* Next */}
            <PaginationItem>
              <PaginationNext
                as="button"
                disabled={!orders.links.find(l => l.label.includes("Next"))?.url}
                onClick={() => {
                  const next = orders.links.find(l => l.label.includes("Next"))?.url;
                  if (next) router.get(next, {}, { preserveState: true, preserveScroll: true });
                }}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>

      {/* ✅ Filter Dialog */}
      {filterDialogOpen && (
        <Dialog open={filterDialogOpen} onOpenChange={setFilterDialogOpen}>
          <DialogContent className="max-w-6xl">
            <DialogHeader>
              <DialogTitle>Filter Orders</DialogTitle>
              <DialogDescription>
                Apply filters to narrow down your orders. Click Apply to filter or Clear to reset.
              </DialogDescription>
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
                  // ✅ Status Searchable Multi-select with Textarea
                  <Popover key={col}>
                    <PopoverTrigger asChild>
                      <Textarea
                        readOnly
                        className="w-full resize-y min-h-[40px] max-h-[120px]"
                        placeholder="Status(es)"
                        value={
                          filters.status && (filters.status as string[]).length > 0
                            ? (filters.status as string[]).join(', ')
                            : ''
                        }
                      />
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
                  // ✅ Merchant Searchable Multi-select with Textarea
                  <Popover key={col}>
                    <PopoverTrigger asChild>
                      <Textarea
                        readOnly
                        className="w-full resize-y min-h-[40px] max-h-[120px]"
                        placeholder="Merchant(s)"
                        value={
                          filters.merchant && (filters.merchant as string[]).length > 0
                            ? (filters.merchant as string[]).join(', ')
                            : ''
                        }
                      />
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
                  // ✅ Callcenter (cc_email) Searchable Multi-select with Textarea
                  <Popover key={col}>
                    <PopoverTrigger asChild>
                      <Textarea
                        readOnly
                        className="w-full resize-y min-h-[40px] max-h-[120px]"
                        placeholder="Callcenter(s)"
                        value={
                          filters.cc_email && (filters.cc_email as string[]).length > 0
                            ? (filters.cc_email as string[]).join(', ')
                            : ''
                        }
                      />
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

      {/* ✅ Edit Modal */}
      {editing && (
        <Dialog open={!!editing} onOpenChange={handleCloseEditModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                Edit {editing.field} for Order #{editing.order.order_no}
              </DialogTitle>
              <DialogDescription>
                Make changes to the order field. Click outside or press ESC to cancel.
              </DialogDescription>
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
                <>
                  <div className="relative">
                    <Textarea
                      value={editValue}
                      onChange={e => setEditValue(e.target.value)}
                      rows={5}
                      placeholder="Enter instructions..."
                      className="pr-12"
                    />
                    {isSpeechSupported && (
                      <div className="absolute right-2 top-2">
                        <Button
                          variant={isListening ? "destructive" : "outline"}
                          size="icon"
                          className={`h-8 w-8 transition-all ${isListening ? 'animate-pulse' : ''}`}
                          onClick={toggleListening}
                          title={isListening ? "Stop recording" : "Start voice recording"}
                          type="button"
                        >
                          {isListening ? (
                            <MicOffIcon className="h-4 w-4" />
                          ) : (
                            <MicIcon className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                  {isListening && (
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse"></div>
                      Listening... {interimTranscript && <span className="italic">"{interimTranscript}"</span>}
                    </div>
                  )}
                  {speechError && (
                    <div className="text-sm text-red-500">
                      Voice input error: {speechError}
                    </div>
                  )}
                  {!isSpeechSupported && (
                    <div className="text-sm text-muted-foreground">
                      Voice input is not supported in your browser. Try Chrome or Edge.
                    </div>
                  )}
                </>
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

      {/* ✅ History Modal */}
      {historyModalOpen && (
        <Dialog open={historyModalOpen} onOpenChange={setHistoryModalOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit History for Order #{selectedOrderNo}</DialogTitle>
              <DialogDescription>
                View all changes made to this order.
              </DialogDescription>
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

      {/* ✅ Delete Confirmation */}
      {deletingOrder && (
        <Dialog open={!!deletingOrder} onOpenChange={() => setDeletingOrder(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Confirm Delete</DialogTitle>
              <DialogDescription>
                This action cannot be undone. This will permanently delete the order from the system.
              </DialogDescription>
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
            <DialogDescription>
              Fill in all required fields to create a new order. Click Create when done.
            </DialogDescription>
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

            {/* --- Instructions with Voice-to-Text --- */}
            <div className="col-span-2 relative">
              <Textarea
                placeholder="Special Instructions"
                value={newOrder.instructions || ""}
                onChange={(e) => handleNewOrderChange("instructions", e.target.value)}
                rows={4}
                className="pr-12"
              />
              {isSpeechSupported && (
                <div className="absolute right-2 top-2">
                  <Button
                    variant={isListening ? "destructive" : "outline"}
                    size="icon"
                    className={`h-8 w-8 transition-all ${isListening ? 'animate-pulse' : ''}`}
                    onClick={toggleListening}
                    title={isListening ? "Stop recording" : "Start voice recording"}
                    type="button"
                  >
                    {isListening ? (
                      <MicOffIcon className="h-4 w-4" />
                    ) : (
                      <MicIcon className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              )}
              {isListening && (
                <div className="absolute bottom-2 left-2 text-sm text-muted-foreground flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse"></div>
                  Listening... {interimTranscript && <span className="italic">"{interimTranscript}"</span>}
                </div>
              )}
              {speechError && (
                <div className="text-sm text-red-500 mt-1">
                  Voice input error: {speechError}
                </div>
              )}
              {!isSpeechSupported && (
                <div className="text-sm text-muted-foreground mt-1">
                  Voice input is not supported in your browser. Try Chrome or Edge.
                </div>
              )}
            </div>
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