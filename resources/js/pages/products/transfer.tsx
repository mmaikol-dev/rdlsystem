"use client";

import AppLayout from "@/layouts/app-layout";
import { Head, usePage, router } from "@inertiajs/react";
import { useState, useEffect } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { PlusCircleIcon, TrashIcon, EyeIcon, ListIcon, Grid3x3Icon } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function TransferIndex() {
  const { auth, products, agents, transfers, groupedTransfers, view } = usePage().props as any;

  const [openTransferModal, setOpenTransferModal] = useState(false);
  const [drawerDirection, setDrawerDirection] = useState<"right" | "bottom">("bottom");
  const [region, setRegion] = useState("");
  const [from, setFrom] = useState("");
  const [rows, setRows] = useState([{ product_id: "", quantity: "", agent_id: "" , merchant: ""}]);
  const [openFilterModal, setOpenFilterModal] = useState(false);
  const [filterProduct, setFilterProduct] = useState("");
  const [filterAgent, setFilterAgent] = useState("");
  const [filterDate, setFilterDate] = useState("");
  
  const currentView = view || 'grouped';

  useEffect(() => {
    const handleResize = () => {
      setDrawerDirection(window.innerWidth >= 768 ? "right" : "bottom");
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const addRow = () => setRows([...rows, { product_id: "", quantity: "", agent_id: "", merchant: "" }]);
  const removeRow = (index: number) => setRows(rows.filter((_, i) => i !== index));

  const handleChange = (index: number, field: string, value: string) => {
    const updated = [...rows];
    (updated[index] as any)[field] = value;
  
    if (field === "product_id") {
      const selectedProduct = products.find((p: any) => String(p.id) === value);
      console.log('Selected Product:', selectedProduct);
      console.log('Unit ID:', selectedProduct?.unit_id);
      (updated[index] as any).merchant = selectedProduct ? selectedProduct.unit_id || "" : "";
    }
  
    setRows(updated);
  };
  const handleSubmit = () => {
    router.post("/transfers", { region, from, transfers: rows });
    setOpenTransferModal(false);
  };

  const toggleView = () => {
    const newView = currentView === 'grouped' ? 'detailed' : 'grouped';
    router.get("/transfer", { 
      view: newView,
      product_id: filterProduct,
      agent_id: filterAgent,
      date: filterDate
    }, {
      preserveState: true,
      preserveScroll: true
    });
  };

  const viewDetails = (productId: number, agentId: number) => {
    router.get(`/transfers/${productId}/${agentId}`);
  };

  const breadcrumbs = [
    { title: "Transfers", href: "/transfer" },
    { title: "Manage", href: "#" },
  ];

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="Transfers" />

      <div className="flex items-center justify-between gap-2 p-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Button
            variant={currentView === 'grouped' ? 'default' : 'outline'}
            onClick={toggleView}
            className="flex items-center gap-2"
          >
            {currentView === 'grouped' ? (
              <>
                <Grid3x3Icon className="w-4 h-4" />
                Grouped View
              </>
            ) : (
              <>
                <ListIcon className="w-4 h-4" />
                Detailed View
              </>
            )}
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setOpenFilterModal(true)}
            className="flex items-center gap-2"
          >
            Filter
          </Button>

          <Button
            onClick={() => setOpenTransferModal(true)}
            className="flex items-center gap-2 text-white"
          >
            <PlusCircleIcon className="w-4 h-4" />
            New Transfer
          </Button>
        </div>
      </div>

      {/* Table Section */}
      <div className="p-4 sm:p-6 overflow-x-auto">
        <Card className="shadow-sm">
          <CardContent className="p-0">
            {currentView === 'grouped' ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Agent</TableHead>
                    <TableHead>Total Transfers</TableHead>
                    <TableHead>Total Quantity</TableHead>
                    <TableHead>First Transfer</TableHead>
                    <TableHead>Last Transfer</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groupedTransfers?.data?.length > 0 ? (
                    groupedTransfers.data.map((item: any, index: number) => (
                      <TableRow key={`${item.product_id}-${item.agent_id}`} className="hover:bg-gray-50">
                        <TableCell>{index + 1}</TableCell>
                        <TableCell className="font-medium">{item.product?.name}</TableCell>
                        <TableCell>{item.agent?.name}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="font-semibold">
                            {item.transfer_count} transfers
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="default" className="font-semibold">
                            {item.total_quantity} units
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {new Date(item.first_transfer_date).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {new Date(item.last_transfer_date).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => viewDetails(item.product_id, item.agent_id)}
                            className="flex items-center gap-1"
                          >
                            <EyeIcon className="w-4 h-4" />
                            View Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-gray-500 py-6">
                        No grouped transfers found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Agent</TableHead>
                    <TableHead>Region</TableHead>
                    <TableHead>From</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transfers?.data?.length > 0 ? (
                    transfers.data.map((transfer: any, index: number) => (
                      <TableRow key={transfer.id}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>{transfer.product?.name}</TableCell>
                        <TableCell>{transfer.quantity}</TableCell>
                        <TableCell>{transfer.agent?.name}</TableCell>
                        <TableCell>{transfer.region}</TableCell>
                        <TableCell>{transfer.from}</TableCell>
                        <TableCell>{transfer.date}</TableCell>
                        <TableCell>{transfer.transfer_by}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-gray-500 py-6">
                        No transfers found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Drawer for Creating New Transfer */}
      <Drawer open={openTransferModal} onOpenChange={setOpenTransferModal} direction={drawerDirection}>
        <DrawerContent
          className={`
            md:max-w-[800px] w-full h-[90vh] md:h-screen
            md:right-0 md:left-auto md:rounded-l-2xl
            flex flex-col overflow-hidden bg-white
          `}
        >
          <DrawerHeader className="border-b bg-white sticky top-0 z-10 p-4">
            <DrawerTitle className="text-xl font-bold text-gray-800">Create New Transfer</DrawerTitle>
            <DrawerDescription className="text-sm text-muted-foreground">
              Fill in the details below to distribute products to agents.
            </DrawerDescription>
          </DrawerHeader>

          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-6 bg-gray-50">
            <Card className="shadow-sm">
              <CardContent className="p-4 sm:p-6">
                <h3 className="text-base sm:text-lg font-semibold mb-4 text-gray-800">
                  Transfer Information
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Region *</label>
                    <Input value={region} onChange={(e) => setRegion(e.target.value)} placeholder="Enter region" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">From *</label>
                    <Input value={from} onChange={(e) => setFrom(e.target.value)} placeholder="e.g. Main Warehouse" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Initiated By</label>
                    <Input readOnly value={auth?.user?.name || ""} className="bg-gray-100" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardContent className="p-4 sm:p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-800">
                    Products to Transfer
                  </h3>
                  <span className="text-xs sm:text-sm text-muted-foreground">
                    {rows.length} product{rows.length !== 1 ? "s" : ""}
                  </span>
                </div>

                <div className="space-y-4">
                  {rows.map((row, i) => (
                    <Card key={i} className="border-l-4 border-l-blue-500 bg-white">
                      <CardContent className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Product *</label>
                            <Select value={row.product_id} onValueChange={(val) => handleChange(i, "product_id", val)}>
                              <SelectTrigger><SelectValue placeholder="Select Product" /></SelectTrigger>
                              <SelectContent>
                                {products.map((p: any) => (
                                  <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Merchant</label>
                            <Input
                              readOnly
                              value={row.merchant || ""}
                              placeholder="Auto-filled"
                              className="bg-gray-100"
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Quantity *</label>
                            <Input
                              type="number"
                              min="1"
                              value={row.quantity}
                              onChange={(e) => handleChange(i, "quantity", e.target.value)}
                              placeholder="Enter quantity"
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Agent *</label>
                            <Select value={row.agent_id} onValueChange={(val) => handleChange(i, "agent_id", val)}>
                              <SelectTrigger><SelectValue placeholder="Select Agent" /></SelectTrigger>
                              <SelectContent>
                                {agents.map((a: any) => (
                                  <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <Button
                            variant="outline"
                            onClick={() => removeRow(i)}
                            disabled={rows.length === 1}
                            className="flex items-center justify-center"
                          >
                            <TrashIcon className="w-4 h-4 mr-1" /> Remove
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <div className="flex justify-end mt-4">
                  <Button onClick={addRow} className="flex items-center gap-2">
                    <PlusCircleIcon className="w-4 h-4" /> Add Product
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <DrawerFooter className="border-t bg-white sticky bottom-0 z-10 flex justify-end gap-2 py-4 px-4 sm:px-6">
            <DrawerClose asChild><Button variant="outline">Cancel</Button></DrawerClose>
            <Button onClick={handleSubmit} className="text-white">Submit Transfer</Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Filter Modal */}
      <Drawer open={openFilterModal} onOpenChange={setOpenFilterModal}>
        <DrawerContent className={`
            md:max-w-[800px] w-full h-[90vh] md:h-screen
            md:right-0 md:left-auto md:rounded-l-2xl
            flex flex-col overflow-hidden bg-white
          `}>
          <DrawerHeader className="border-b bg-white sticky top-0 z-10 p-4">
            <DrawerTitle className="text-lg font-semibold text-gray-800">Filter Transfers</DrawerTitle>
            <DrawerDescription className="text-sm text-gray-500">
              Filter by product, agent, or date
            </DrawerDescription>
          </DrawerHeader>

          <div className="p-6 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Product</label>
              <Select value={filterProduct} onValueChange={setFilterProduct}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Product" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((p: any) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Agent</label>
              <Select value={filterAgent} onValueChange={setFilterAgent}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Agent" />
                </SelectTrigger>
                <SelectContent>
                  {agents.map((a: any) => (
                    <SelectItem key={a.id} value={String(a.id)}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Date</label>
              <Input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
              />
            </div>
          </div>

          <DrawerFooter className="border-t flex justify-end gap-2 bg-white p-4">
            <DrawerClose asChild>
              <Button variant="outline">Cancel</Button>
            </DrawerClose>
            <Button
              onClick={() => {
                router.get("/transfer", {
                  product_id: filterProduct,
                  agent_id: filterAgent,
                  date: filterDate,
                  view: currentView
                });
                setOpenFilterModal(false);
              }}
              className="text-white"
            >
              Apply Filters
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </AppLayout>
  );
}