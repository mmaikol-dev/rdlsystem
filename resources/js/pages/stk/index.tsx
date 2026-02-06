"use client";

import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, usePage, router } from '@inertiajs/react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Edit,
  Trash2,
  Smartphone,
  CheckCircle2,
  Loader2,
  XCircle,
  Search,
  X,
  Package,
  User,
  MapPin,
  Calendar,
  DollarSign,
  Hash,
  Phone,
  ShoppingCart,
  Receipt,
  LayoutGrid,
  List,
  ChevronDown,
  ChevronUp,
  PhoneCall,
  GripVertical,
  MessageSquare,
  CheckSquare
} from 'lucide-react';
import * as React from 'react';

const breadcrumbs: BreadcrumbItem[] = [
  { title: 'Dashboard', href: '/dashboard' },
  { title: 'M-Pesa Prompting', href: '/stk' },
];

interface SheetOrder {
  id: number;
  order_no: string;
  client_name: string;
  quantity: number;
  amount: number;
  product_name: string;
  address: string;
  phone: string;
  city: string;
  status: string;
  delivery_date: string;
  comments?: string;
  confirmed: number;
}

const getStatusColor = (status: string | null | undefined) => {
  if (!status) return 'bg-gray-100 text-gray-800 border-gray-200';
  const statusLower = status.toLowerCase();
  if (statusLower.includes('pending')) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
  if (statusLower.includes('paid') || statusLower.includes('success')) return 'bg-green-100 text-green-800 border-green-200';
  if (statusLower.includes('failed')) return 'bg-red-100 text-red-800 border-red-200';
  if (statusLower.includes('processing')) return 'bg-blue-100 text-blue-800 border-blue-200';
  return 'bg-gray-100 text-gray-800 border-gray-200';
};

export default function Index() {
  const { props } = usePage();
  const { orders, filters, auth } = props as unknown as {
    orders: { data: SheetOrder[] };
    filters: { search?: string };
    auth?: { user?: { id: number } };
  };

  const userId = auth?.user?.id || 'guest';
  const storageKey = `mpesa-orders-arrangement-user-${userId}`;

  const [searchValue, setSearchValue] = React.useState(filters?.search || '');
  const [editingOrder, setEditingOrder] = React.useState<SheetOrder | null>(null);
  const [deletingOrder, setDeletingOrder] = React.useState<SheetOrder | null>(null);
  const [phoneNumbers, setPhoneNumbers] = React.useState<Record<number, string>>({});
  const [loadingOrder, setLoadingOrder] = React.useState<SheetOrder | null>(null);
  const [paymentResult, setPaymentResult] = React.useState<{ status: "Success" | "Failed"; receipt?: string; amount?: number } | null>(null);
  const [viewMode, setViewMode] = React.useState<'table' | 'card'>('table');
  const [expandedRows, setExpandedRows] = React.useState<Set<number>>(new Set());
  const [searchModalOpen, setSearchModalOpen] = React.useState(false);
  const [orderedItems, setOrderedItems] = React.useState<SheetOrder[]>([]);
  const [draggedIndex, setDraggedIndex] = React.useState<number | null>(null);

  // Loading states
  const [isSearching, setIsSearching] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [payingOrders, setPayingOrders] = React.useState<Set<number>>(new Set());

  const filteredOrders = orderedItems;

  // Load saved order from localStorage or use default order
  React.useEffect(() => {
    const savedOrderString = localStorage.getItem(storageKey);

    if (savedOrderString) {
      try {
        const savedOrderIds = JSON.parse(savedOrderString) as number[];
        // Reorder based on saved IDs
        const orderedData = [...orders.data].sort((a, b) => {
          const indexA = savedOrderIds.indexOf(a.id);
          const indexB = savedOrderIds.indexOf(b.id);
          // If not in saved order, put at end
          if (indexA === -1) return 1;
          if (indexB === -1) return -1;
          return indexA - indexB;
        });
        setOrderedItems(orderedData);
      } catch (error) {
        console.error('Error loading saved order:', error);
        setOrderedItems(orders.data);
      }
    } else {
      setOrderedItems(orders.data);
    }
  }, [orders.data, storageKey]);

  const toggleRowExpansion = (orderId: number) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newOrders = [...orderedItems];
    const draggedItem = newOrders[draggedIndex];
    newOrders.splice(draggedIndex, 1);
    newOrders.splice(index, 0, draggedItem);

    setDraggedIndex(index);
    setOrderedItems(newOrders);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    // Save the new order to localStorage with user-specific key
    const orderIds = orderedItems.map(order => order.id);
    localStorage.setItem(storageKey, JSON.stringify(orderIds));
  };

  const payOrder = async (order: SheetOrder) => {
    const phone = phoneNumbers[order.id] ?? order.phone;
    if (!phone) {
      setPaymentResult({ status: "Failed" });
      return;
    }

    setPayingOrders(prev => new Set(prev).add(order.id));
    setLoadingOrder(order);
    setPaymentResult(null);

    try {
      const csrfToken = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content;

      const res = await fetch("api/stk/stk-push", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-TOKEN": csrfToken,
        },
        body: JSON.stringify({ phone, amount: order.amount, order_no: order.order_no }),
      });

      if (!res.ok) throw new Error("STK Push failed");

      const data = await res.json();
      if (!data.success) throw new Error(data.message || "STK Push failed");

      let attempts = 0;
      const interval = setInterval(async () => {
        attempts++;
        const check = await fetch(`/api/transactions/${order.order_no}`);
        if (check.ok) {
          const trx = await check.json();
          if (trx.status === "Success") {
            clearInterval(interval);
            setPaymentResult({ status: "Success", receipt: trx.mpesa_receipt, amount: trx.amount });
            setPayingOrders(prev => {
              const newSet = new Set(prev);
              newSet.delete(order.id);
              return newSet;
            });
          } else if (trx.status === "Failed") {
            clearInterval(interval);
            setPaymentResult({ status: "Failed" });
            setPayingOrders(prev => {
              const newSet = new Set(prev);
              newSet.delete(order.id);
              return newSet;
            });
          }
        }
        if (attempts > 20) {
          clearInterval(interval);
          setPaymentResult({ status: "Failed" });
          setPayingOrders(prev => {
            const newSet = new Set(prev);
            newSet.delete(order.id);
            return newSet;
          });
        }
      }, 3000);

    } catch (err) {
      console.error(err);
      setPaymentResult({ status: "Failed" });
      setLoadingOrder(null);
      setPayingOrders(prev => {
        const newSet = new Set(prev);
        newSet.delete(order.id);
        return newSet;
      });
    }
  };

  const handleEditSave = () => {
    if (!editingOrder) return;
    setIsSaving(true);
    router.put(`/stk/${editingOrder.id}`, {
      comments: editingOrder.comments,
      confirmed: editingOrder.confirmed
    }, {
      onSuccess: () => {
        setEditingOrder(null);
        setIsSaving(false);
      },
      onError: () => {
        setIsSaving(false);
      }
    });
  };

  const handleDelete = () => {
    if (!deletingOrder) return;
    setIsDeleting(true);
    router.delete(`/stk/${deletingOrder.id}`, {
      onSuccess: () => {
        setDeletingOrder(null);
        setIsDeleting(false);
      },
      onError: () => {
        setIsDeleting(false);
      }
    });
  };

  const handleSearch = () => {
    setIsSearching(true);
    router.get('/stk', { search: searchValue.trim() }, {
      preserveState: true,
      replace: true,
      onFinish: () => setIsSearching(false)
    });
  };

  const handleClearSearch = () => {
    setIsSearching(true);
    setSearchValue('');
    router.get('/stk', {}, {
      preserveState: true,
      replace: true,
      onFinish: () => setIsSearching(false)
    });
  };

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="M-Pesa Payment Processing" />

      <div className="space-y-4 p-2 sm:p-4 pb-20 sm:pb-4">
        {/* Header Section */}
        <div className="flex flex-col gap-1">
          <h1 className="text-xl sm:text-3xl font-bold tracking-tight">Order Payments</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Process M-Pesa payments for orders</p>
        </div>

        {/* Search and View Toggle */}
        {/* Desktop Search Card */}
        <Card className="hidden sm:block">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <Search className="h-4 w-4 sm:h-5 sm:w-5" />
                  Search Orders
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">Filter by order number, name, or phone</CardDescription>
              </div>
              <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'table' | 'card')} className="w-auto">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="table" className="gap-2 text-xs sm:text-sm">
                    <List className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    <span className="hidden sm:inline">Table</span>
                  </TabsTrigger>
                  <TabsTrigger value="card" className="gap-2 text-xs sm:text-sm">
                    <LayoutGrid className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    <span className="hidden sm:inline">Cards</span>
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search orders..."
                  value={searchValue}
                  onChange={e => setSearchValue(e.target.value)}
                  className="pl-9 h-9 sm:h-10"
                  disabled={isSearching}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      handleSearch();
                    }
                  }}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleSearch}
                  className="gap-2 flex-1 sm:flex-none h-9 sm:h-10"
                  size="sm"
                  disabled={isSearching}
                >
                  {isSearching ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                  <span className="sm:inline">Search</span>
                </Button>
                <Button
                  variant="outline"
                  onClick={handleClearSearch}
                  className="gap-2 h-9 sm:h-10"
                  size="sm"
                  disabled={isSearching}
                >
                  {isSearching ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <X className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Mobile Search Button */}
        <div className="sm:hidden flex gap-2">
          <Button
            variant="outline"
            onClick={() => setSearchModalOpen(true)}
            className="flex-1 gap-2 h-12 justify-start text-muted-foreground"
            disabled={isSearching}
          >
            {isSearching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            <span>Search orders...</span>
          </Button>
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'table' | 'card')} className="w-auto">
            <TabsList className="grid w-full grid-cols-2 h-12">
              <TabsTrigger value="table" className="gap-2">
                <List className="h-4 w-4" />
              </TabsTrigger>
              <TabsTrigger value="card" className="gap-2">
                <LayoutGrid className="h-4 w-4" />
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Orders Display */}
        {filteredOrders.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 sm:py-16 text-center">
              <Package className="h-12 w-12 sm:h-16 sm:w-16 text-muted-foreground mb-4" />
              <h3 className="text-base sm:text-lg font-semibold mb-2">No orders found</h3>
              <p className="text-sm text-muted-foreground">Try adjusting your search filters</p>
            </CardContent>
          </Card>
        ) : viewMode === 'table' ? (
          /* Table View */
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              {/* Desktop Table */}
              <div className="hidden lg:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40px]"></TableHead>
                      <TableHead className="w-[120px]">Order #</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead className="text-right w-[180px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrders.map((order, index) => {
                      const isPaying = payingOrders.has(order.id);
                      return (
                        <TableRow
                          key={order.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, index)}
                          onDragOver={(e) => handleDragOver(e, index)}
                          onDragEnd={handleDragEnd}
                          className={`cursor-move ${draggedIndex === index ? 'opacity-50' : ''}`}
                        >
                          <TableCell className="cursor-grab active:cursor-grabbing">
                            <GripVertical className="h-4 w-4 text-muted-foreground" />
                          </TableCell>
                          <TableCell className="font-medium">{order.order_no}</TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">{order.client_name}</span>
                              {order.address && <span className="text-xs text-muted-foreground truncate max-w-[200px]">{order.address}</span>}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span>{order.product_name}</span>
                              {order.delivery_date && <span className="text-xs text-muted-foreground">{order.delivery_date}</span>}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">{order.quantity}</TableCell>
                          <TableCell className="text-right font-semibold">KES {order.amount.toLocaleString()}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`${getStatusColor(order.status)} border`}>
                              {order.status || 'Unknown'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Input
                              value={phoneNumbers[order.id] ?? order.phone}
                              onChange={e => setPhoneNumbers(prev => ({ ...prev, [order.id]: e.target.value }))}
                              placeholder="254XXXXXXXXX"
                              className="h-8 w-[140px]"
                              disabled={isPaying}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  onClick={() => window.location.href = `tel:${phoneNumbers[order.id] ?? order.phone}`}
                                  className="h-8 w-8 p-0 bg-green-600 hover:bg-green-700"
                                  title="Call"
                                  disabled={isPaying}
                                >
                                  <PhoneCall className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => payOrder(order)}
                                  className="h-8 w-8 p-0"
                                  title="Pay Now"
                                  disabled={isPaying}
                                >
                                  {isPaying ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <Smartphone className="h-3.5 w-3.5" />
                                  )}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setEditingOrder(order)}
                                  className="h-8 w-8 p-0"
                                  title="Edit"
                                  disabled={isPaying}
                                >
                                  <Edit className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setDeletingOrder(order)}
                                  className="h-8 w-8 p-0"
                                  title="Delete"
                                  disabled={isPaying}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile/Tablet Expandable Table */}
              <div className="lg:hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40px]"></TableHead>
                      <TableHead className="w-[40px]"></TableHead>
                      <TableHead>Order</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrders.map((order, index) => {
                      const isPaying = payingOrders.has(order.id);
                      return (
                        <React.Fragment key={order.id}>
                          <TableRow
                            draggable
                            onDragStart={(e) => handleDragStart(e, index)}
                            onDragOver={(e) => handleDragOver(e, index)}
                            onDragEnd={handleDragEnd}
                            className={`${draggedIndex === index ? 'opacity-50' : ''}`}
                          >
                            <TableCell className="cursor-grab active:cursor-grabbing">
                              <GripVertical className="h-4 w-4 text-muted-foreground" />
                            </TableCell>
                            <TableCell className="cursor-pointer" onClick={() => toggleRowExpansion(order.id)}>
                              {expandedRows.has(order.id) ?
                                <ChevronUp className="h-4 w-4" /> :
                                <ChevronDown className="h-4 w-4" />
                              }
                            </TableCell>
                            <TableCell onClick={() => toggleRowExpansion(order.id)} className="cursor-pointer">
                              <div className="flex flex-col">
                                <span className="font-medium text-sm">{order.order_no}</span>
                                <span className="text-xs text-muted-foreground truncate">{order.client_name}</span>
                              </div>
                            </TableCell>
                            <TableCell onClick={() => toggleRowExpansion(order.id)} className="cursor-pointer text-right font-semibold text-sm">
                              KES {order.amount.toLocaleString()}
                            </TableCell>
                            <TableCell onClick={() => toggleRowExpansion(order.id)} className="cursor-pointer">
                              <Badge variant="outline" className={`${getStatusColor(order.status)} border text-xs`}>
                                {order.status || 'Unknown'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                          {expandedRows.has(order.id) && (
                            <TableRow>
                              <TableCell colSpan={5} className="bg-muted/50 p-4">
                                <div className="space-y-3">
                                  <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div>
                                      <span className="text-muted-foreground text-xs">Product:</span>
                                      <p className="font-medium">{order.product_name}</p>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground text-xs">Quantity:</span>
                                      <p className="font-medium">{order.quantity}</p>
                                    </div>
                                    {order.address && (
                                      <div className="col-span-2">
                                        <span className="text-muted-foreground text-xs">Address:</span>
                                        <p className="font-medium text-xs">{order.address}</p>
                                      </div>
                                    )}
                                    {order.delivery_date && (
                                      <div className="col-span-2">
                                        <span className="text-muted-foreground text-xs">Delivery:</span>
                                        <p className="font-medium">{order.delivery_date}</p>
                                      </div>
                                    )}
                                  </div>
                                  <Separator />
                                  <div className="space-y-2">
                                    <Label htmlFor={`phone-mobile-${order.id}`} className="text-xs">M-Pesa Phone</Label>
                                    <Input
                                      id={`phone-mobile-${order.id}`}
                                      value={phoneNumbers[order.id] ?? order.phone}
                                      onChange={e => setPhoneNumbers(prev => ({ ...prev, [order.id]: e.target.value }))}
                                      placeholder="254XXXXXXXXX"
                                      className="h-9"
                                      disabled={isPaying}
                                    />
                                  </div>
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      onClick={() => window.location.href = `tel:${phoneNumbers[order.id] ?? order.phone}`}
                                      className="h-10 w-10 p-0 bg-green-600 hover:bg-green-700 flex-shrink-0"
                                      disabled={isPaying}
                                    >
                                      <PhoneCall className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      onClick={() => payOrder(order)}
                                      className="flex-1 gap-2 h-10"
                                      disabled={isPaying}
                                    >
                                      {isPaying ? (
                                        <>
                                          <Loader2 className="h-4 w-4 animate-spin" />
                                          Processing...
                                        </>
                                      ) : (
                                        <>
                                          <Smartphone className="h-4 w-4" />
                                          Pay Now
                                        </>
                                      )}
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => setEditingOrder(order)}
                                      className="h-10 w-10 p-0 flex-shrink-0"
                                      disabled={isPaying}
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => setDeletingOrder(order)}
                                      className="h-10 w-10 p-0 flex-shrink-0"
                                      disabled={isPaying}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          </Card>
        ) : (
          /* Card View */
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredOrders.map((order, index) => {
              const isPaying = payingOrders.has(order.id);
              return (
                <Card
                  key={order.id}
                  className={`hover:shadow-lg transition-shadow duration-200 ${draggedIndex === index ? 'opacity-50' : ''}`}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="cursor-grab active:cursor-grabbing flex-shrink-0 pt-1">
                        <GripVertical className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="space-y-1 flex-1 min-w-0">
                        <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                          <Hash className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
                          <span className="truncate">{order.order_no}</span>
                        </CardTitle>
                        <CardDescription className="flex items-center gap-1.5 text-xs">
                          <User className="h-3 w-3 sm:h-3.5 sm:w-3.5 flex-shrink-0" />
                          <span className="truncate">{order.client_name}</span>
                        </CardDescription>
                      </div>
                      <Badge variant="outline" className={`${getStatusColor(order.status)} border flex-shrink-0 text-xs`}>
                        {order.status || 'Unknown'}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-2 sm:space-y-3">
                    <div className="flex items-start gap-2 text-xs sm:text-sm">
                      <Package className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{order.product_name}</div>
                        <div className="text-muted-foreground flex items-center gap-1">
                          <ShoppingCart className="h-3 w-3" />
                          Qty: {order.quantity}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs sm:text-sm">
                      <DollarSign className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
                      <span className="font-semibold text-base sm:text-lg">KES {order.amount.toLocaleString()}</span>
                    </div>

                    {order.address && (
                      <div className="flex items-start gap-2 text-xs sm:text-sm text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4 mt-0.5 flex-shrink-0" />
                        <span className="truncate">{order.address}</span>
                      </div>
                    )}

                    {order.delivery_date && (
                      <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                        <span>{order.delivery_date}</span>
                      </div>
                    )}

                    <Separator />

                    <div className="space-y-2">
                      <Label htmlFor={`phone-${order.id}`} className="text-xs flex items-center gap-1.5">
                        <Phone className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                        M-Pesa Phone Number
                      </Label>
                      <Input
                        id={`phone-${order.id}`}
                        value={phoneNumbers[order.id] ?? order.phone}
                        onChange={e => setPhoneNumbers(prev => ({ ...prev, [order.id]: e.target.value }))}
                        placeholder="254XXXXXXXXX"
                        className="h-8 sm:h-9"
                        disabled={isPaying}
                      />
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        onClick={() => window.location.href = `tel:${phoneNumbers[order.id] ?? order.phone}`}
                        className="flex-1 gap-2 h-9 bg-green-600 hover:bg-green-700"
                        disabled={isPaying}
                      >
                        <PhoneCall className="h-4 w-4" />
                        Call
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => payOrder(order)}
                        className="flex-1 gap-2 h-9"
                        disabled={isPaying}
                      >
                        {isPaying ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Processing
                          </>
                        ) : (
                          <>
                            <Smartphone className="h-4 w-4" />
                            Pay
                          </>
                        )}
                      </Button>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingOrder(order)}
                        className="flex-1 h-9"
                        disabled={isPaying}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setDeletingOrder(order)}
                        className="flex-1 h-9"
                        disabled={isPaying}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <Dialog open={!!editingOrder} onOpenChange={open => !open && setEditingOrder(null)}>
        <DialogContent className="sm:max-w-md max-w-[95vw]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Edit className="h-4 w-4 sm:h-5 sm:w-5" />
              Edit Order
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Update comments and confirmation status for {editingOrder?.order_no}
            </DialogDescription>
          </DialogHeader>
          {editingOrder && (
            <div className="space-y-3 sm:space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="comments" className="flex items-center gap-2 text-xs sm:text-sm">
                  <MessageSquare className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  Comments
                </Label>
                <textarea
                  id="comments"
                  value={editingOrder.comments || ''}
                  onChange={e => setEditingOrder({ ...editingOrder, comments: e.target.value })}
                  placeholder="Enter comments..."
                  className="w-full min-h-[100px] px-3 py-2 text-sm border border-input rounded-md bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                  rows={4}
                  disabled={isSaving}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmed" className="text-xs sm:text-sm flex items-center gap-2">
                  <CheckSquare className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  Confirmation Status
                </Label>
                <div className="flex items-center space-x-2 p-3 border rounded-md bg-muted/50">
                  <input
                    type="checkbox"
                    id="confirmed"
                    checked={editingOrder.confirmed === 1}
                    onChange={e => setEditingOrder({ ...editingOrder, confirmed: e.target.checked ? 1 : 0 })}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-2 focus:ring-primary cursor-pointer"
                    disabled={isSaving}
                  />
                  <Label htmlFor="confirmed" className="text-sm font-normal cursor-pointer">
                    Order Confirmed
                  </Label>
                </div>
              </div>
            </div>
          )}
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setEditingOrder(null)}
              size="sm"
              className="h-9"
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleEditSave}
              size="sm"
              className="h-9 gap-2"
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={!!deletingOrder} onOpenChange={open => !open && setDeletingOrder(null)}>
        <DialogContent className="sm:max-w-md max-w-[95vw]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive text-base sm:text-lg">
              <Trash2 className="h-4 w-4 sm:h-5 sm:w-5" />
              Confirm Deletion
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {deletingOrder && (
            <div className="py-4">
              <p className="text-xs sm:text-sm">
                Are you sure you want to delete order{' '}
                <span className="font-semibold">{deletingOrder.order_no}</span>?
              </p>
            </div>
          )}
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setDeletingOrder(null)}
              size="sm"
              className="h-9"
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              className="gap-2 h-9"
              size="sm"
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  Delete Order
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Processing Modal */}
      <Dialog open={!!loadingOrder} onOpenChange={() => { }}>
        <DialogContent className="sm:max-w-md max-w-[95vw]">
          {!paymentResult ? (
            <div className="flex flex-col items-center text-center space-y-4 py-6">
              <div className="rounded-full bg-primary/10 p-3 sm:p-4">
                <Loader2 className="h-10 w-10 sm:h-12 sm:w-12 animate-spin text-primary" />
              </div>
              <DialogHeader>
                <DialogTitle className="text-lg sm:text-xl font-semibold">Processing Payment</DialogTitle>
                <DialogDescription className="text-sm sm:text-base">
                  Please check your phone to complete the M-Pesa transaction
                </DialogDescription>
              </DialogHeader>
              <div className="bg-muted rounded-lg p-3 sm:p-4 w-full space-y-2 text-xs sm:text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Order:</span>
                  <span className="font-medium">{loadingOrder?.order_no}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount:</span>
                  <span className="font-medium">KES {loadingOrder?.amount.toLocaleString()}</span>
                </div>
              </div>
            </div>
          ) : paymentResult.status === "Success" ? (
            <div className="flex flex-col items-center text-center space-y-4 py-6">
              <div className="rounded-full bg-green-100 p-3 sm:p-4">
                <CheckCircle2 className="h-10 w-10 sm:h-12 sm:w-12 text-green-600" />
              </div>
              <DialogHeader>
                <DialogTitle className="text-lg sm:text-xl font-semibold text-green-600">
                  Payment Successful!
                </DialogTitle>
                <DialogDescription className="text-sm">
                  Your M-Pesa payment has been processed
                </DialogDescription>
              </DialogHeader>
              <div className="bg-green-50 rounded-lg p-3 sm:p-4 w-full space-y-2 text-xs sm:text-sm border border-green-200">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Hash className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                    Order:
                  </span>
                  <span className="font-medium">{loadingOrder?.order_no}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <DollarSign className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                    Amount:
                  </span>
                  <span className="font-medium">KES {paymentResult.amount?.toLocaleString()}</span>
                </div>
                <Separator className="bg-green-200" />
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Receipt className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                    Receipt:
                  </span>
                  <span className="font-semibold text-green-700">{paymentResult.receipt}</span>
                </div>
              </div>
              <Button
                className="w-full gap-2 h-9 sm:h-10"
                onClick={() => {
                  setLoadingOrder(null);
                  window.location.reload();
                }}
              >
                <CheckCircle2 className="h-4 w-4" />
                Close
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center text-center space-y-4 py-6">
              <div className="rounded-full bg-red-100 p-3 sm:p-4">
                <XCircle className="h-10 w-10 sm:h-12 sm:w-12 text-red-600" />
              </div>
              <DialogHeader>
                <DialogTitle className="text-lg sm:text-xl font-semibold text-red-600">
                  Payment Failed
                </DialogTitle>
                <DialogDescription className="text-sm">
                  The M-Pesa payment could not be completed
                </DialogDescription>
              </DialogHeader>
              <div className="bg-red-50 rounded-lg p-3 sm:p-4 w-full text-xs sm:text-sm border border-red-200">
                <p className="text-muted-foreground">
                  The transaction was declined or timed out. Please try again.
                </p>
              </div>
              <Button
                className="w-full gap-2 h-9 sm:h-10"
                variant="destructive"
                onClick={() => setLoadingOrder(null)}
              >
                <XCircle className="h-4 w-4" />
                Close
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Mobile Search Modal */}
      <Dialog open={searchModalOpen} onOpenChange={setSearchModalOpen}>
        <DialogContent className="sm:max-w-md max-w-[95vw]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Search Orders
            </DialogTitle>
            <DialogDescription>
              Filter by order number, name, or phone
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="mobile-search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="mobile-search"
                  placeholder="Search orders..."
                  value={searchValue}
                  onChange={e => setSearchValue(e.target.value)}
                  className="pl-9 h-10"
                  disabled={isSearching}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      handleSearch();
                      setSearchModalOpen(false);
                    }
                  }}
                />
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Button
              onClick={() => {
                handleSearch();
                setSearchModalOpen(false);
              }}
              className="gap-2 h-10 w-full"
              disabled={isSearching}
            >
              {isSearching ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4" />
                  Search
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                handleClearSearch();
                setSearchModalOpen(false);
              }}
              className="gap-2 h-10 w-full"
              disabled={isSearching}
            >
              {isSearching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <X className="h-4 w-4" />
              )}
              Clear Search
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}