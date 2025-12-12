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
import { Edit, Trash2, Plus, Eye, PackagePlus, ChevronLeft, ScanBarcodeIcon, ChevronRight, Scan, X, ScanEyeIcon } from 'lucide-react';
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

interface PaginatedProducts {
  current_page: number;
  data: Product[];
  first_page_url: string;
  from: number;
  last_page: number;
  last_page_url: string;
  links: Array<{
    url: string | null;
    label: string;
    active: boolean;
  }>;
  next_page_url: string | null;
  path: string;
  per_page: number;
  prev_page_url: string | null;
  to: number;
  total: number;
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

interface BarcodeData {
  id: number;
  product_id: number;
  product_code: string;
  product_name: string;
  barcode: string;
  operation_type: 'inbound' | 'outbound';
  scanned_by: string;
  scanned_at: string;
}

interface Unit {
  id: number;
  name: string;
  short_code: string;
}

interface Category {
  id: number;
  name: string;
}

export default function ProductsPage() {
  const { products, categories, units } = usePage<{
    products: PaginatedProducts;
    categories: Category[];
    units: Unit[];
  }>().props;

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

  // Barcode scanning states
  const [scanningBarcodes, setScanningBarcodes] = React.useState(false);
  const [selectedProduct, setSelectedProduct] = React.useState<Product | null>(null);
  const [operationType, setOperationType] = React.useState<'inbound' | 'outbound'>('inbound');
  const [scannedBarcodes, setScannedBarcodes] = React.useState<string[]>([]);
  const [currentBarcode, setCurrentBarcode] = React.useState('');
  const [viewingBarcodeHistory, setViewingBarcodeHistory] = React.useState(false);
  const [barcodeHistory, setBarcodeHistory] = React.useState<BarcodeData[]>([]);
  const [isProcessing, setIsProcessing] = React.useState(false);

  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const barcodeInputRef = React.useRef<HTMLInputElement>(null);

  const filteredProducts = React.useMemo(() => {
    if (!products?.data) return [];
    return products.data.filter((p) =>
      (p.name?.toLowerCase() || '').includes(filter.toLowerCase()) ||
      (p.store_name?.toLowerCase() || '').includes(filter.toLowerCase()) ||
      (p.code?.toLowerCase() || '').includes(filter.toLowerCase())
    );
  }, [products, filter]);

  // Auto-focus barcode input when scanning modal opens
  React.useEffect(() => {
    if (scanningBarcodes && barcodeInputRef.current) {
      barcodeInputRef.current.focus();
    }
  }, [scanningBarcodes]);

  const handleCreate = () => {
    router.post('/products', formValues, {
      preserveState: true,
      onSuccess: () => {
        setCreatingProduct(false);
        setFormValues({});
        setSuccessMessage("Product created successfully!");
      },
      onError: (errors: any) => {
        console.error(errors);
        setErrorMessage("Failed to create product. Please check all required fields.");
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
        setSuccessMessage("Quantity updated successfully!");
      },
      onError: () => {
        setErrorMessage("Failed to update quantity.");
      },
    });
  };

  const handlePageChange = (url: string | null) => {
    if (!url) return;
    router.get(url, {}, { preserveState: true, preserveScroll: true });
  };

  // Barcode scanning functions
  const handleStartScanning = (product: Product) => {
    setSelectedProduct(product);
    setScannedBarcodes([]);
    setCurrentBarcode('');
    setOperationType('inbound');
    setScanningBarcodes(true);
  };

  const handleAddBarcode = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentBarcode.trim()) {
      setScannedBarcodes([...scannedBarcodes, currentBarcode.trim()]);
      setCurrentBarcode('');
      barcodeInputRef.current?.focus();
    }
  };

  const handleRemoveBarcode = (index: number) => {
    setScannedBarcodes(scannedBarcodes.filter((_, i) => i !== index));
  };

  const handleSubmitBarcodes = async () => {
    if (!selectedProduct || scannedBarcodes.length === 0) {
      setErrorMessage("Please scan at least one barcode.");
      return;
    }

    setIsProcessing(true);

    try {
      const response = await fetch('/products/scan-barcodes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
        },
        body: JSON.stringify({
          product_id: selectedProduct.id,
          operation_type: operationType,
          barcodes: scannedBarcodes,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccessMessage(data.message);
        setScanningBarcodes(false);
        setScannedBarcodes([]);
        setCurrentBarcode('');
        router.reload({ only: ['products'] });
      } else {
        setErrorMessage(data.message);
      }
    } catch (error) {
      console.error("Failed to submit barcodes:", error);
      setErrorMessage("Failed to process barcodes.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleViewBarcodeHistory = async (product: Product) => {
    try {
      const response = await fetch(`/products/${product.id}/barcode-history`);
      const data = await response.json();

      if (data.success) {
        setBarcodeHistory(data.barcodes);
        setSelectedProduct(product);
        setViewingBarcodeHistory(true);
      }
    } catch (error) {
      console.error("Failed to fetch barcode history:", error);
      setErrorMessage("Failed to fetch barcode history.");
    }
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
          {!["operations", "finance", "callcenter1", ""].includes(usePage().props.auth.user.roles) && (
            <Button
              variant="default"
              className="flex items-center gap-2"
              onClick={() => setCreatingProduct(true)}
            >
              <Plus size={16} /> Create Product
            </Button>
          )}
        </div>

        {/* Pagination Info */}
        <div className="text-sm text-muted-foreground">
          Showing {products.from} to {products.to} of {products.total} products
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
                  {!["operations", "finance", "callcenter1", ""].includes(usePage().props.auth.user.roles) && (
                    <>
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => handleStartScanning(product)}
                        title="Scan Barcodes"
                      >
                        <ScanBarcodeIcon size={16} />
                      </Button>
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
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleViewBarcodeHistory(product)}
                    title="View Barcode History"
                  >
                    <ScanEyeIcon size={14} />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Pagination Controls */}
        <div className="flex justify-center items-center gap-2 mt-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(products.prev_page_url)}
            disabled={!products.prev_page_url}
          >
            <ChevronLeft size={16} /> Previous
          </Button>

          <div className="flex gap-1">
            {products.links.slice(1, -1).map((link, index) => (
              <Button
                key={index}
                variant={link.active ? "default" : "outline"}
                size="sm"
                onClick={() => handlePageChange(link.url)}
                disabled={!link.url}
                className="min-w-[40px]"
              >
                {link.label}
              </Button>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(products.next_page_url)}
            disabled={!products.next_page_url}
          >
            Next <ChevronRight size={16} />
          </Button>
        </div>
      </div>

      {/* Barcode Scanning Modal */}
      <Dialog open={scanningBarcodes} onOpenChange={(open) => !open && setScanningBarcodes(false)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Scan Barcodes - {selectedProduct?.name}</DialogTitle>
            <DialogDescription>
              Select operation type and scan multiple barcodes. Total scanned: {scannedBarcodes.length}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {/* Operation Type Selection */}
            <div>
              <label className="text-sm font-medium mb-2 block">Operation Type</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="operationType"
                    value="inbound"
                    checked={operationType === 'inbound'}
                    onChange={(e) => setOperationType(e.target.value as 'inbound' | 'outbound')}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Inbound (Add Stock)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="operationType"
                    value="outbound"
                    checked={operationType === 'outbound'}
                    onChange={(e) => setOperationType(e.target.value as 'inbound' | 'outbound')}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Outbound (Remove Stock)</span>
                </label>
              </div>
            </div>

            {/* Barcode Input */}
            <form onSubmit={handleAddBarcode} className="flex gap-2">
              <Input
                ref={barcodeInputRef}
                type="text"
                value={currentBarcode}
                onChange={(e) => setCurrentBarcode(e.target.value)}
                placeholder="Scan or enter barcode..."
                className="flex-1"
                autoFocus
              />
              <Button type="submit" variant="default">Add</Button>
            </form>

            {/* Scanned Barcodes List */}
            <div className="border rounded-lg p-4 max-h-64 overflow-y-auto">
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-sm font-medium">Scanned Barcodes ({scannedBarcodes.length})</h4>
                {scannedBarcodes.length > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setScannedBarcodes([])}
                  >
                    Clear All
                  </Button>
                )}
              </div>

              {scannedBarcodes.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No barcodes scanned yet. Start scanning to add items.
                </p>
              ) : (
                <div className="space-y-2">
                  {scannedBarcodes.map((barcode, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between bg-secondary/50 p-2 rounded"
                    >
                      <span className="text-sm font-mono">{barcode}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemoveBarcode(index)}
                      >
                        <X size={14} />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Summary */}
            <div className="bg-muted p-4 rounded-lg">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Current Quantity</p>
                  <p className="font-semibold text-lg">{selectedProduct?.quantity || 0}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">
                    {operationType === 'inbound' ? 'Will Add' : 'Will Remove'}
                  </p>
                  <p className="font-semibold text-lg">
                    {operationType === 'inbound' ? '+' : '-'}{scannedBarcodes.length}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-muted-foreground">New Quantity</p>
                  <p className="font-semibold text-lg">
                    {operationType === 'inbound'
                      ? (selectedProduct?.quantity || 0) + scannedBarcodes.length
                      : (selectedProduct?.quantity || 0) - scannedBarcodes.length}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setScanningBarcodes(false)}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitBarcodes}
              disabled={scannedBarcodes.length === 0 || isProcessing}
            >
              {isProcessing ? 'Processing...' : `Submit ${scannedBarcodes.length} Barcode(s)`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Barcode History Modal */}
      <Dialog open={viewingBarcodeHistory} onOpenChange={(open) => !open && setViewingBarcodeHistory(false)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Barcode History - {selectedProduct?.name}</DialogTitle>
            <DialogDescription>
              Complete history of scanned barcodes for this product
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 mt-4">
            {barcodeHistory.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No barcode history found for this product.
              </div>
            ) : (
              <div className="space-y-2">
                {barcodeHistory.map((record) => (
                  <div
                    key={record.id}
                    className="border rounded-lg p-3 hover:bg-secondary/50 transition-colors"
                  >
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                      <div>
                        <p className="text-muted-foreground text-xs">Barcode</p>
                        <p className="font-mono font-medium">{record.barcode}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Operation</p>
                        <p className={`font-medium ${record.operation_type === 'inbound'
                            ? 'text-green-600'
                            : 'text-red-600'
                          }`}>
                          {record.operation_type === 'inbound' ? '+ Inbound' : '- Outbound'}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Scanned By</p>
                        <p className="font-medium">{record.scanned_by}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Date</p>
                        <p className="font-medium">
                          {new Date(record.scanned_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setViewingBarcodeHistory(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Modal */}
      <Dialog open={creatingProduct} onOpenChange={(open) => !open && setCreatingProduct(false)}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Product</DialogTitle>
            <DialogDescription>Fill in product details below. Store name, slug, and code will be auto-generated.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <label className="text-sm font-medium">Product Name *</label>
              <Input
                value={formValues.name || ''}
                onChange={(e) => setFormValues({ ...formValues, name: e.target.value })}
                placeholder="Enter product name"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Category *</label>
              <select
                value={formValues.category_id || ''}
                onChange={(e) => setFormValues({ ...formValues, category_id: parseInt(e.target.value) })}
                className="w-full border rounded-md p-2 text-sm"
              >
                <option value="">Select Category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Unit *</label>
              <select
                value={formValues.unit_id || ''}
                onChange={(e) => setFormValues({ ...formValues, unit_id: parseInt(e.target.value) })}
                className="w-full border rounded-md p-2 text-sm"
              >
                <option value="">Select Unit</option>
                {units.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.name} ({unit.short_code})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Quantity *</label>
              <Input
                type="number"
                value={formValues.quantity || ''}
                onChange={(e) => setFormValues({ ...formValues, quantity: parseFloat(e.target.value) || 0 })}
                placeholder="Enter quantity"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Buying Price</label>
              <Input
                type="number"
                step="0.01"
                value={formValues.buying_price || ''}
                onChange={(e) => setFormValues({ ...formValues, buying_price: parseFloat(e.target.value) || 0 })}
                placeholder="Enter buying price"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Selling Price</label>
              <Input
                type="number"
                step="0.01"
                value={formValues.selling_price || ''}
                onChange={(e) => setFormValues({ ...formValues, selling_price: parseFloat(e.target.value) || 0 })}
                placeholder="Enter selling price"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Quantity Alert</label>
              <Input
                type="number"
                value={formValues.quantity_alert || ''}
                onChange={(e) => setFormValues({ ...formValues, quantity_alert: parseFloat(e.target.value) || 0 })}
                placeholder="Enter alert threshold"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Tax</label>
              <Input
                type="number"
                step="0.01"
                value={formValues.tax || ''}
                onChange={(e) => setFormValues({ ...formValues, tax: parseFloat(e.target.value) || 0 })}
                placeholder="Enter tax amount"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Tax Type</label>
              <Input
                value={formValues.tax_type || ''}
                onChange={(e) => setFormValues({ ...formValues, tax_type: e.target.value })}
                placeholder="e.g., VAT, Sales Tax"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Notes</label>
              <Input
                value={formValues.notes || ''}
                onChange={(e) => setFormValues({ ...formValues, notes: e.target.value })}
                placeholder="Additional notes"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setCreatingProduct(false)}>Cancel</Button>
            <Button onClick={handleCreate}>Create</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={!!editingProduct} onOpenChange={(open) => !open && setEditingProduct(null)}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
            <DialogDescription>Update product details below. Code: {editingProduct?.code}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <label className="text-sm font-medium">Product Name *</label>
              <Input
                value={formValues.name || ''}
                onChange={(e) => setFormValues({ ...formValues, name: e.target.value })}
                placeholder="Product name"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Quantity *</label>
              <Input
                type="number"
                value={formValues.quantity || ''}
                onChange={(e) => setFormValues({ ...formValues, quantity: parseFloat(e.target.value) || 0 })}
                placeholder="Quantity"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Buying Price</label>
              <Input
                type="number"
                step="0.01"
                value={formValues.buying_price || ''}
                onChange={(e) => setFormValues({ ...formValues, buying_price: parseFloat(e.target.value) || 0 })}
                placeholder="Buying price"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Selling Price</label>
              <Input
                type="number"
                step="0.01"
                value={formValues.selling_price || ''}
                onChange={(e) => setFormValues({ ...formValues, selling_price: parseFloat(e.target.value) || 0 })}
                placeholder="Selling price"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Quantity Alert</label>
              <Input
                type="number"
                value={formValues.quantity_alert || ''}
                onChange={(e) => setFormValues({ ...formValues, quantity_alert: parseFloat(e.target.value) || 0 })}
                placeholder="Alert threshold"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Tax</label>
              <Input
                type="number"
                step="0.01"
                value={formValues.tax || ''}
                onChange={(e) => setFormValues({ ...formValues, tax: parseFloat(e.target.value) || 0 })}
                placeholder="Tax"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Tax Type</label>
              <Input
                value={formValues.tax_type || ''}
                onChange={(e) => setFormValues({ ...formValues, tax_type: e.target.value })}
                placeholder="Tax type"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Notes</label>
              <Input
                value={formValues.notes || ''}
                onChange={(e) => setFormValues({ ...formValues, notes: e.target.value })}
                placeholder="Notes"
              />
            </div>
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