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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Edit, FileText, Trash2, Lock } from "lucide-react";
import * as React from "react";

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
  created_at?: string;
}

export default function DispatchView() {
  const { orders, auth } = usePage<{ orders: any; auth: any }>().props; 
  const userRole = auth.user.roles;

  const [searchTerm, setSearchTerm] = React.useState("");
  const [editingOrder, setEditingOrder] = React.useState<SheetOrder | null>(
    null
  );
  const [editValues, setEditValues] = React.useState<Partial<SheetOrder>>({});
  const [deletingOrder, setDeletingOrder] = React.useState<SheetOrder | null>(
    null
  );
  const [showAccessDenied, setShowAccessDenied] = React.useState(false);

  // Restrict merchants
  const restricted = userRole === "merchant";

  const handleRestrictedAction = () => setShowAccessDenied(true);

  // Handle server-side search
  const handleSearch = () => {
    router.get(
      "/dispatch",
      { search: searchTerm },
      { preserveState: true, replace: true }
    );
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
    router.put(`/sheet_orders/${editingOrder.id}`, editValues, {
      onSuccess: () => setEditingOrder(null),
    });
  };

  const handleDelete = () => {
    if (!deletingOrder) return;
    router.delete(`/sheet_orders/${deletingOrder.id}`, {
      onSuccess: () => setDeletingOrder(null),
    });
  };

  const handleDownload = (orderId: number) => {
    window.location.href = `/waybill/download/${orderId}`;
  };

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="Dispatch Orders" />

      <div className="flex flex-col gap-4 p-4">
        {/* Search Input */}
        <div className="flex gap-2 mb-4">
          <Input
            placeholder="Search orders..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Button onClick={handleSearch}>Search</Button>
        </div>

        {orders.data.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            No orders available.
          </div>
        ) : (
          <div className="grid gap-4 auto-rows-min 
                          grid-cols-2 
                          sm:grid-cols-2 
                          md:grid-cols-3 
                          lg:grid-cols-4 
                          xl:grid-cols-5 
                          2xl:grid-cols-6">
            {orders.data.map((order: SheetOrder) => (
              <Card
                key={order.id}
                className="flex flex-col justify-between border rounded-lg shadow hover:shadow-md transition-all duration-150 p-2"
              >
                <CardHeader>
                  <CardTitle className="truncate text-sm" title={order.order_no}>
                    Order: {order.order_no}
                  </CardTitle>
                  <CardDescription
                    className="text-xs text-muted-foreground truncate"
                    title={order.client_name}
                  >
                    Client: {order.client_name}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-1 text-xs overflow-hidden">
                  <div>
                    <strong>Product:</strong> {order.product_name}
                  </div>
                  <div>
                    <strong>Qty:</strong> {order.quantity}
                  </div>
                  <div>
                    <strong>Amount:</strong> {order.amount}
                  </div>
                  <div>
                    <strong>Phone:</strong> {order.phone}
                  </div>
                  <div>
                    <strong>Status:</strong>{" "}
                    {order.status === "scheduled" ? "⏳ Scheduled" : "✅ Dispatched"}
                  </div>
                  <div>
                    <strong>Delivery Date:</strong> {order.delivery_date}
                  </div>
                  {order.instructions && (
                    <div className="truncate max-h-[3rem]" title={order.instructions}>
                      <strong>Instructions:</strong> {order.instructions}
                    </div>
                  )}
                </CardContent>
                <div className="flex gap-2 justify-end p-3 flex-wrap">
                  <Button size="sm" variant="outline" onClick={() => handleEditOpen(order)}>
                    <Edit size={16} />
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDeleteOpen(order)}
                  >
                    <Trash2 size={16} />
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleDownload(order.id)}
                  >
                    <FileText size={16} />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Pagination */}
        <div className="flex justify-center gap-2 mt-4 flex-wrap">
          {orders.prev_page_url && (
            <Button
              variant="outline"
              onClick={() => router.get(orders.prev_page_url, {}, { preserveState: true })}
            >
              Previous
            </Button>
          )}
          {orders.next_page_url && (
            <Button
              variant="outline"
              onClick={() => router.get(orders.next_page_url, {}, { preserveState: true })}
            >
              Next
            </Button>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      <Dialog
        open={!!editingOrder}
        onOpenChange={(open) => !open && setEditingOrder(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Order</DialogTitle>
            <DialogDescription>
              Update order information below.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            {[
              "order_no",
              "product_name",
              "quantity",
              "amount",
              "client_name",
              "phone",
              "status",
              "delivery_date",
              "instructions",
            ].map((field) => (
              <Input
                key={field}
                value={(editValues as any)[field] || ""}
                onChange={(e) =>
                  setEditValues({ ...editValues, [field]: e.target.value })
                }
                placeholder={field.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase())}
              />
            ))}
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setEditingOrder(null)}>
              Cancel
            </Button>
            <Button onClick={handleEditSave}>Save</Button>
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
            <DialogTitle>Confirm Delete</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete order <strong>{deletingOrder?.order_no}</strong>?
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setDeletingOrder(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
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
