"use client";

import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, usePage, router } from '@inertiajs/react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Edit, Trash2, Plus, Eye, PackagePlus } from 'lucide-react';
import * as React from 'react';

const breadcrumbs: BreadcrumbItem[] = [
  { title: 'Dashboard', href: '/dashboard' },
  { title: 'Products', href: '/products' },
];

interface Product {
  id: number;
  name: string;
  store_name: string;
  slug: string;
  code: string;
  quantity: number;
  buying_price: number;
  selling_price: number;
  quantity_alert: number;
  tax: number;
  tax_type: string;
  notes: string;
  product_image: string;
  category_id: number;
  unit_id: number;
}

interface InventoryLog {
  id: number;
  product_name: string;
  product_code: string;
  quantity_added: number;
  remaining_qnty: number;
  added_by: string;
  product_unit_id: number;
  date_added: string;
  created_at: string;
  updated_at: string;
}

export default function ProductsPage() {
  const { products } = usePage<{ products: Product[] }>().props;

  const [filter, setFilter] = React.useState('');
  const [editingProduct, setEditingProduct] = React.useState<Product | null>(null);
  const [creatingProduct, setCreatingProduct] = React.useState(false);
  const [deletingProduct, setDeletingProduct] = React.useState<Product | null>(null);
  const [viewingLogs, setViewingLogs] = React.useState(false);
  const [inventoryLogs, setInventoryLogs] = React.useState<InventoryLog[]>([]);
  const [formValues, setFormValues] = React.useState<Partial<Product>>({});

  const [updatingProduct, setUpdatingProduct] = React.useState<Product | null>(null);
  const [quantityChange, setQuantityChange] = React.useState<number | null>(null);
  const [operation, setOperation] = React.useState<"add" | "subtract">("add");

  // Success/Error modals
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const filteredProducts = React.useMemo(() => {
    if (!products) return [];
    return products.filter((p) =>
      (p.name?.toLowerCase() || '').includes(filter.toLowerCase()) ||
      (p.store_name?.toLowerCase() || '').includes(filter.toLowerCase()) ||
      (p.code?.toLowerCase() || '').includes(filter.toLowerCase())
    );
  }, [products, filter]);

  const handleCreate = () => {
    router.post('/products', formValues, {
      preserveState: true,
      onSuccess: () => {
        setCreatingProduct(false);
        setFormValues({});
        router.reload({ only: ['products'] });
        setSuccessMessage("Product created successfully!");
      },
      onError: (errors: any) => {
        setErrorMessage("Failed to create product.");
      },
    });
  };

  const handleEditSave = () => {
    if (!editingProduct) return;
    router.put(`/products/${editingProduct.id}`, formValues, {
      preserveState: true,
      onSuccess: () => {
        setEditingProduct(null);
        setFormValues({});
        router.reload({ only: ['products'] });
        setSuccessMessage("Product updated successfully!");
      },
      onError: () => {
        setErrorMessage("Failed to update product.");
      },
    });
  };

  const handleDelete = () => {
    if (!deletingProduct) return;
    router.delete(`/products/${deletingProduct.id}`, {
      preserveState: true,
      onSuccess: () => {
        setDeletingProduct(null);
        router.reload({ only: ['products'] });
        setSuccessMessage("Product deleted successfully!");
      },
      onError: () => {
        setErrorMessage("Failed to delete product.");
      },
    });
  };

  const handleViewLogs = async (productCode: string) => {
    try {
      const response = await fetch(`/products/${productCode}/inventory-logs`);
      const data = await response.json();
      setInventoryLogs(data.logs);
      setViewingLogs(true);
    } catch (error) {
      console.error("Failed to fetch inventory logs:", error);
      setErrorMessage("Failed to fetch inventory logs.");
    }
  };

  const handleUpdateQuantity = () => {
    if (!updatingProduct || quantityChange === null) return;
    const finalChange = operation === "subtract" ? -Math.abs(quantityChange) : Math.abs(quantityChange);

    router.post(`/products/${updatingProduct.id}/update-quantity`, {
      quantity_change: finalChange,
    }, {
      preserveState: true,
      onSuccess: () => {
        setUpdatingProduct(null);
        setQuantityChange(null);
        setOperation("add");
        router.reload({ only: ['products'] });
        setSuccessMessage("Quantity updated successfully!");
      },
      onError: () => {
        setErrorMessage("Failed to update quantity.");
      },
    });
  };

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="Products" />

      <div className="flex flex-col gap-4 p-4">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-4">
          <Input
            placeholder="Filter products by name, store, or code"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="flex-1"
          />
          {!["operations","finance", "callcenter1",""].includes(usePage().props.auth.user.roles) && (
            <Button
              variant="default"
              className="flex items-center gap-2"
              onClick={() => setCreatingProduct(true)}
            >
              <Plus size={16} /> Create Product
            </Button>
          )}
        </div>

        {filteredProducts.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            No products available.
          </div>
        ) : (
          <div className="grid gap-4 auto-rows-min grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
            {filteredProducts.map((product) => (
              <Card key={product.id} className="flex flex-col justify-between border rounded-lg shadow hover:shadow-md transition-all duration-150 p-2">
                <CardHeader>
                  <CardTitle className="truncate text-sm" title={product.name}>
                    {product.name}
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground truncate" title={product.store_name}>
                    Store: {product.store_name || '-'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-1 text-xs overflow-hidden">
                  {[
                    { label: 'Code', value: product.code },
                    { label: 'Quantity', value: product.quantity },
                    { label: 'Buying Price', value: product.buying_price },
                    { label: 'Selling Price', value: product.selling_price },
                    { label: 'Quantity Alert', value: product.quantity_alert },
                    { label: 'Tax', value: product.tax },
                    { label: 'Tax Type', value: product.tax_type },
                    { label: 'Notes', value: product.notes },
                  ].map((item, index) => (
                    <div key={`${product.id}-info-${index}`} className="truncate">
                      <strong>{item.label}:</strong> {item.value || '-'}
                    </div>
                  ))}
                </CardContent>
                <div className="flex gap-2 justify-end p-2 flex-wrap">
                  {!["operations","finance", "callcenter1",""].includes(usePage().props.auth.user.roles) && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => { setUpdatingProduct(product); setQuantityChange(null); }}>
                        <PackagePlus size={16} />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => { setEditingProduct(product); setFormValues(product); }}>
                        <Edit size={16} />
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => setDeletingProduct(product)}>
                        <Trash2 size={16} />
                      </Button>
                    </>
                  )}
                  <Button size="sm" variant="secondary" onClick={() => handleViewLogs(product.code)}>
                    <Eye size={16} />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      <Dialog open={creatingProduct} onOpenChange={(open) => !open && setCreatingProduct(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Product</DialogTitle>
            <DialogDescription>Fill in product details below.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            {['name','store_name','slug','code','quantity','buying_price','selling_price','quantity_alert','tax','tax_type','notes'].map((field) => (
              <Input
                key={field}
                value={(formValues as any)[field] || ''}
                onChange={(e) => setFormValues({ ...formValues, [field]: e.target.value })}
                placeholder={field.replace('_',' ').replace(/\b\w/g, l => l.toUpperCase())}
              />
            ))}
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setCreatingProduct(false)}>Cancel</Button>
            <Button onClick={handleCreate}>Create</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={!!editingProduct} onOpenChange={(open) => !open && setEditingProduct(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
            <DialogDescription>Update product details below.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            {['name','store_name','slug','code','quantity','buying_price','selling_price','quantity_alert','tax','tax_type','notes'].map((field) => (
              <Input
                key={field}
                value={(formValues as any)[field] || ''}
                onChange={(e) => setFormValues({ ...formValues, [field]: e.target.value })}
                placeholder={field.replace('_',' ').replace(/\b\w/g, l => l.toUpperCase())}
              />
            ))}
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setEditingProduct(null)}>Cancel</Button>
            <Button onClick={handleEditSave}>Save</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Modal */}
      <Dialog open={!!deletingProduct} onOpenChange={(open) => !open && setDeletingProduct(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deletingProduct?.name}</strong>?
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setDeletingProduct(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Inventory Logs Modal */}
      <Dialog open={viewingLogs} onOpenChange={(open) => !open && setViewingLogs(false)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Inventory Logs</DialogTitle>
            <DialogDescription>Showing logs for selected product.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 mt-2 max-h-96 overflow-y-auto text-xs">
            {inventoryLogs.length === 0 ? (
              <div className="text-center text-muted-foreground">No logs found.</div>
            ) : (
              inventoryLogs.map((log) => (
                <div key={log.id} className="border-b py-1">
                 <div><strong>Update By:</strong> {log.added_by}</div>
                 <div><strong>Quantity Change:</strong> {log.quantity_added > 0 ? `+${log.quantity_added}` : log.quantity_added}</div>
                 <div><strong>Remaining Quantity:</strong> {log.remaining_qnty}</div>
                 <div><strong>Date updated:</strong> {log.date_added}</div>
                </div>
              ))
            )}
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setViewingLogs(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Quantity Update Modal */}
      <Dialog open={!!updatingProduct} onOpenChange={(open) => !open && setUpdatingProduct(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Update Quantity</DialogTitle>
            <DialogDescription>
              Add or subtract quantity for <strong>{updatingProduct?.name}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <select
              className="w-full border rounded p-2"
              value={operation}
              onChange={(e) => setOperation(e.target.value as "add" | "subtract")}
            >
              <option value="add">Add</option>
              <option value="subtract">Subtract</option>
            </select>
            <Input
              type="number"
              min="0"
              value={quantityChange ?? ""}
              onChange={(e) => setQuantityChange(e.target.value === "" ? null : parseInt(e.target.value))}
              placeholder="Enter quantity"
            />
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setUpdatingProduct(null)}>Cancel</Button>
            <Button onClick={handleUpdateQuantity}>Update</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Success Modal */}
      <Dialog open={!!successMessage} onOpenChange={(open) => !open && setSuccessMessage(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Success</DialogTitle>
            <DialogDescription>{successMessage}</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end mt-4">
            <Button onClick={() => setSuccessMessage(null)}>OK</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Error Modal */}
      <Dialog open={!!errorMessage} onOpenChange={(open) => !open && setErrorMessage(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Error</DialogTitle>
            <DialogDescription>{errorMessage}</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end mt-4">
            <Button variant="destructive" onClick={() => setErrorMessage(null)}>OK</Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
