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
  Receipt
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
  const { orders, filters } = props as unknown as {
    orders: { data: SheetOrder[] };
    filters: { search?: string };
  };

  const [searchValue, setSearchValue] = React.useState(filters?.search || '');
  const [editingOrder, setEditingOrder] = React.useState<SheetOrder | null>(null);
  const [deletingOrder, setDeletingOrder] = React.useState<SheetOrder | null>(null);
  const [phoneNumbers, setPhoneNumbers] = React.useState<Record<number, string>>({});
  const [loadingOrder, setLoadingOrder] = React.useState<SheetOrder | null>(null);
  const [paymentResult, setPaymentResult] = React.useState<{ status: "Success" | "Failed"; receipt?: string; amount?: number } | null>(null);

  const filteredOrders = orders.data;

  const payOrder = async (order: SheetOrder) => {
    const phone = phoneNumbers[order.id] ?? order.phone;
    if (!phone) {
      setPaymentResult({ status: "Failed" });
      return;
    }

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
          } else if (trx.status === "Failed") {
            clearInterval(interval);
            setPaymentResult({ status: "Failed" });
          }
        }
        if (attempts > 20) {
          clearInterval(interval);
          setPaymentResult({ status: "Failed" });
        }
      }, 3000);

    } catch (err) {
      console.error(err);
      setPaymentResult({ status: "Failed" });
      setLoadingOrder(null);
    }
  };

  const handleEditSave = () => {
    if (!editingOrder) return;
    router.put(`/sheetorders/${editingOrder.id}`, editingOrder, {
      onSuccess: () => setEditingOrder(null),
    });
  };

  const handleDelete = () => {
    if (!deletingOrder) return;
    router.delete(`/sheetorders/${deletingOrder.id}`, {
      onSuccess: () => setDeletingOrder(null),
    });
  };

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="M-Pesa Payment Processing" />

      <div className="space-y-6 p-4">
        {/* Header Section */}
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Order Payment Processing</h1>
          <p className="text-muted-foreground">Process and manage M-Pesa payments for your orders</p>
        </div>

        {/* Search Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Search className="h-5 w-5" />
              Search Orders
            </CardTitle>
            <CardDescription>Filter orders by order number, client name, or phone number</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search orders..."
                  value={searchValue}
                  onChange={e => setSearchValue(e.target.value)}
                  className="pl-9"
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      router.get('/stk', { search: searchValue.trim() }, { preserveState: true, replace: true });
                    }
                  }}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    router.get('/stk', { search: searchValue.trim() }, { preserveState: true, replace: true });
                  }}
                  className="gap-2"
                >
                  <Search className="h-4 w-4" />
                  Search
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchValue('');
                    router.get('/stk', {}, { preserveState: true, replace: true });
                  }}
                  className="gap-2"
                >
                  <X className="h-4 w-4" />
                  Clear
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Orders Grid */}
        {filteredOrders.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Package className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No orders found</h3>
              <p className="text-muted-foreground">Try adjusting your search filters</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredOrders.map(order => (
              <Card key={order.id} className="hover:shadow-lg transition-shadow duration-200">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1 flex-1 min-w-0">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Hash className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span className="truncate">{order.order_no}</span>
                      </CardTitle>
                      <CardDescription className="flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 flex-shrink-0" />
                        <span className="truncate">{order.client_name}</span>
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className={`${getStatusColor(order.status)} border flex-shrink-0`}>
                      {order.status || 'Unknown'}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3">
                  {/* Product Info */}
                  <div className="flex items-start gap-2 text-sm">
                    <Package className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{order.product_name}</div>
                      <div className="text-muted-foreground flex items-center gap-1">
                        <ShoppingCart className="h-3 w-3" />
                        Qty: {order.quantity}
                      </div>
                    </div>
                  </div>

                  {/* Amount */}
                  <div className="flex items-center gap-2 text-sm">
                    <DollarSign className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="font-semibold text-lg">KES {order.amount.toLocaleString()}</span>
                  </div>

                  {/* Location */}
                  {order.address && (
                    <div className="flex items-start gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span className="truncate">{order.address}</span>
                    </div>
                  )}

                  {/* Delivery Date */}
                  {order.delivery_date && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4 flex-shrink-0" />
                      <span>{order.delivery_date}</span>
                    </div>
                  )}

                  <Separator />

                  {/* Phone Input */}
                  <div className="space-y-2">
                    <Label htmlFor={`phone-${order.id}`} className="text-xs flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5" />
                      M-Pesa Phone Number
                    </Label>
                    <Input
                      id={`phone-${order.id}`}
                      value={phoneNumbers[order.id] ?? order.phone}
                      onChange={e => setPhoneNumbers(prev => ({ ...prev, [order.id]: e.target.value }))}
                      placeholder="254XXXXXXXXX"
                      className="h-9"
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      onClick={() => payOrder(order)}
                      className="flex-1 gap-2"
                    >
                      <Smartphone className="h-4 w-4" />
                      Pay Now
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingOrder(order)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setDeletingOrder(order)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <Dialog open={!!editingOrder} onOpenChange={open => !open && setEditingOrder(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5" />
              Edit Order
            </DialogTitle>
            <DialogDescription>
              Update order details for {editingOrder?.order_no}
            </DialogDescription>
          </DialogHeader>
          {editingOrder && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="client_name" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Client Name
                </Label>
                <Input
                  id="client_name"
                  value={editingOrder.client_name}
                  onChange={e => setEditingOrder({ ...editingOrder, client_name: e.target.value })}
                  placeholder="Enter client name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address" className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Address
                </Label>
                <Input
                  id="address"
                  value={editingOrder.address}
                  onChange={e => setEditingOrder({ ...editingOrder, address: e.target.value })}
                  placeholder="Enter address"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="product_name" className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Product Name
                </Label>
                <Input
                  id="product_name"
                  value={editingOrder.product_name}
                  onChange={e => setEditingOrder({ ...editingOrder, product_name: e.target.value })}
                  placeholder="Enter product name"
                />
              </div>
            </div>
          )}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setEditingOrder(null)}>
              Cancel
            </Button>
            <Button onClick={handleEditSave}>
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={!!deletingOrder} onOpenChange={open => !open && setDeletingOrder(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Confirm Deletion
            </DialogTitle>
            <DialogDescription>
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {deletingOrder && (
            <div className="py-4">
              <p className="text-sm">
                Are you sure you want to delete order{' '}
                <span className="font-semibold">{deletingOrder.order_no}</span>?
              </p>
            </div>
          )}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setDeletingOrder(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} className="gap-2">
              <Trash2 className="h-4 w-4" />
              Delete Order
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Processing Modal */}
      <Dialog open={!!loadingOrder} onOpenChange={() => { }}>
        <DialogContent className="sm:max-w-md">
          {!paymentResult ? (
            <div className="flex flex-col items-center text-center space-y-4 py-6">
              <div className="rounded-full bg-primary/10 p-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
              </div>
              <DialogHeader>
                <DialogTitle className="text-xl font-semibold">Processing Payment</DialogTitle>
                <DialogDescription className="text-base">
                  Please check your phone to complete the M-Pesa transaction
                </DialogDescription>
              </DialogHeader>
              <div className="bg-muted rounded-lg p-4 w-full space-y-2 text-sm">
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
              <div className="rounded-full bg-green-100 p-4">
                <CheckCircle2 className="h-12 w-12 text-green-600" />
              </div>
              <DialogHeader>
                <DialogTitle className="text-xl font-semibold text-green-600">
                  Payment Successful!
                </DialogTitle>
                <DialogDescription>
                  Your M-Pesa payment has been processed
                </DialogDescription>
              </DialogHeader>
              <div className="bg-green-50 rounded-lg p-4 w-full space-y-2 text-sm border border-green-200">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Hash className="h-3.5 w-3.5" />
                    Order:
                  </span>
                  <span className="font-medium">{loadingOrder?.order_no}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <DollarSign className="h-3.5 w-3.5" />
                    Amount:
                  </span>
                  <span className="font-medium">KES {paymentResult.amount?.toLocaleString()}</span>
                </div>
                <Separator className="bg-green-200" />
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Receipt className="h-3.5 w-3.5" />
                    Receipt:
                  </span>
                  <span className="font-semibold text-green-700">{paymentResult.receipt}</span>
                </div>
              </div>
              <Button
                className="w-full gap-2"
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
              <div className="rounded-full bg-red-100 p-4">
                <XCircle className="h-12 w-12 text-red-600" />
              </div>
              <DialogHeader>
                <DialogTitle className="text-xl font-semibold text-red-600">
                  Payment Failed
                </DialogTitle>
                <DialogDescription>
                  The M-Pesa payment could not be completed
                </DialogDescription>
              </DialogHeader>
              <div className="bg-red-50 rounded-lg p-4 w-full text-sm border border-red-200">
                <p className="text-muted-foreground">
                  The transaction was declined or timed out. Please try again.
                </p>
              </div>
              <Button
                className="w-full gap-2"
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
    </AppLayout>
  );
}