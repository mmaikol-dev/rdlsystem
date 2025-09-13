"use client";

import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, usePage, router } from '@inertiajs/react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Edit, Trash2, SmartphoneIcon, CheckCircle2, Loader2, XCircle } from 'lucide-react';
import * as React from 'react';

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = React.useState(value);
  React.useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

const breadcrumbs: BreadcrumbItem[] = [
  { title: 'Dashboard', href: '/dashboard' },
  { title: 'Mpesa Prompting', href: '/stk' },
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

export default function Index() {
  const { props } = usePage();
  const { orders } = props as unknown as { orders: { data: SheetOrder[] } };

  const [filter, setFilter] = React.useState('');
  const [searchValue, setSearchValue] = React.useState(''); // raw input
  const [editingOrder, setEditingOrder] = React.useState<SheetOrder | null>(null);
  const [deletingOrder, setDeletingOrder] = React.useState<SheetOrder | null>(null);
  const [phoneNumbers, setPhoneNumbers] = React.useState<Record<number, string>>({});
  const [loadingOrder, setLoadingOrder] = React.useState<SheetOrder | null>(null);
  const [paymentResult, setPaymentResult] = React.useState<{ status: "Success" | "Failed"; receipt?: string; amount?: number } | null>(null);

  const debouncedFilter = useDebounce(filter, 250);

  const filteredOrders = React.useMemo(() => {
    return orders.data.filter(order =>
      order.order_no.toLowerCase().includes(debouncedFilter.toLowerCase()) ||
      order.client_name.toLowerCase().includes(debouncedFilter.toLowerCase()) ||
      (phoneNumbers[order.id] ?? order.phone).toLowerCase().includes(debouncedFilter.toLowerCase())
    );
  }, [orders.data, debouncedFilter, phoneNumbers]);

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

      // ✅ Start polling every 3s
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
      <Head title="Stk" />

      {/* Filter */}
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center justify-between mb-4 p-2">
        <Input
          placeholder="Filter by order, client, or phone"
          value={searchValue}
          onChange={e => setSearchValue(e.target.value)}
          className="flex-1"
        />
        <div className="flex gap-2">
          <Button
            onClick={() => setFilter(searchValue.trim())}
          >
            Search
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setSearchValue('');
              setFilter('');
            }}
          >
            Clear
          </Button>
        </div>
      </div>

      {/* Cards */}
      {filteredOrders.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">No orders available.</div>
      ) : (
        <div className="grid gap-4 auto-rows-min grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {filteredOrders.map(order => (
            <div key={order.id} className="flex flex-col justify-between border rounded-lg shadow hover:shadow-md transition-all duration-150 p-3">
              <div>
                <div className="text-sm font-medium truncate" title={order.order_no}>Order: {order.order_no}</div>
                <div className="text-xs text-muted-foreground truncate">Client: {order.client_name}</div>
                <div className="text-xs">Amount: {order.amount} | Qty: {order.quantity}</div>
                <div className="text-xs">Status: {order.status} </div>
                <div className="text-xs text-muted-foreground truncate">
                  Phone: <Input
                    value={phoneNumbers[order.id] ?? order.phone}
                    onChange={e => setPhoneNumbers(prev => ({ ...prev, [order.id]: e.target.value }))}
                    className="w-32"
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end mt-2 flex-wrap">
                <Button size="sm" variant="outline" onClick={() => payOrder(order)}>
                  <SmartphoneIcon size={16} /> Pay
                </Button>
                <Button size="sm" variant="outline" onClick={() => setEditingOrder(order)}>
                  <Edit size={16} />
                </Button>
                <Button size="sm" variant="destructive" onClick={() => setDeletingOrder(order)}>
                  <Trash2 size={16} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ✅ Modals */}
      {/* Edit Modal */}
      <Dialog open={!!editingOrder} onOpenChange={open => !open && setEditingOrder(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Order</DialogTitle>
          </DialogHeader>
            {editingOrder && (
              <div className="space-y-3 mt-2">
                <Input value={editingOrder.client_name} onChange={e => setEditingOrder({ ...editingOrder, client_name: e.target.value })} placeholder="Client Name" />
                <Input value={editingOrder.address} onChange={e => setEditingOrder({ ...editingOrder, address: e.target.value })} placeholder="Address" />
                <Input value={editingOrder.product_name} onChange={e => setEditingOrder({ ...editingOrder, product_name: e.target.value })} placeholder="Product Name" />
              </div>
            )}
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setEditingOrder(null)}>Cancel</Button>
            <Button onClick={handleEditSave}>Save</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Modal */}
      <Dialog open={!!deletingOrder} onOpenChange={open => !open && setDeletingOrder(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
          </DialogHeader>
            {deletingOrder && (
              <p>Are you sure you want to delete order <strong>{deletingOrder.order_no}</strong>?</p>
            )}
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setDeletingOrder(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Modal */}
      <Dialog open={!!loadingOrder} onOpenChange={() => {}}>
        <DialogContent className="max-w-sm">
          {!paymentResult ? (
            <div className="flex flex-col items-center text-center space-y-3">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <DialogHeader>
                <DialogTitle className="text-lg font-semibold">Processing Payment...</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">
                Check your phone to complete the STK push.
              </p>
            </div>
          ) : paymentResult.status === "Success" ? (
            <div className="flex flex-col items-center text-center space-y-3">
              <CheckCircle2 className="h-12 w-12 text-green-500" />
              <DialogHeader>
                <DialogTitle className="text-lg font-semibold text-green-600">
                  Payment Successful
                </DialogTitle>
              </DialogHeader>
              <p className="text-sm text-gray-700">
                Account no: <strong>{loadingOrder?.order_no}</strong>
              </p>
              <p className="text-sm text-gray-700">
                Amount: <strong>{paymentResult.amount}</strong>
              </p>
              <p className="text-sm text-gray-700">
                Receipt: <strong>{paymentResult.receipt}</strong>
              </p>
              <Button
                className="mt-2"
                onClick={() => {
                  setLoadingOrder(null);
                  window.location.reload();
                }}
              >
                Close
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center text-center space-y-3">
              <XCircle className="h-12 w-12 text-red-500" />
              <DialogHeader>
                <DialogTitle className="text-lg font-semibold text-red-600">
                  Payment Failed
                </DialogTitle>
              </DialogHeader>
              <p className="text-sm text-gray-700">
                The payment was not completed.
              </p>
              <Button className="mt-2" variant="destructive" onClick={() => setLoadingOrder(null)}>
                Close
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
