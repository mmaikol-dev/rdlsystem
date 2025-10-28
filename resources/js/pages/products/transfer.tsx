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
import { PlusCircleIcon, TrashIcon } from "lucide-react";

export default function TransferIndex() {
  const { auth, products, agents, transfers } = usePage().props as any;

  const [openTransferModal, setOpenTransferModal] = useState(false);
  const [drawerDirection, setDrawerDirection] = useState<"right" | "bottom">("bottom");
  const [region, setRegion] = useState("");
  const [from, setFrom] = useState("");
  const [rows, setRows] = useState([{ product_id: "", quantity: "", agent_id: "" }]);

  useEffect(() => {
    const handleResize = () => {
      setDrawerDirection(window.innerWidth >= 768 ? "right" : "bottom");
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const addRow = () => setRows([...rows, { product_id: "", quantity: "", agent_id: "" }]);
  const removeRow = (index: number) => setRows(rows.filter((_, i) => i !== index));

  const handleChange = (index: number, field: string, value: string) => {
    const updated = [...rows];
    (updated[index] as any)[field] = value;
    setRows(updated);
  };

  const handleSubmit = () => {
    router.post("/transfers", { region, from, transfers: rows });

    setOpenTransferModal(false);
  };

  const breadcrumbs = [
    { title: "Transfers", href: "/transfers" },
    { title: "Manage", href: "#" },
  ];

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="Transfers" />

      {/* Header */}
      <div className="p-4 sm:p-6 flex justify-between items-center bg-white shadow-sm sticky top-0 z-30">
        <h1 className="text-lg sm:text-2xl font-semibold text-gray-800">Transfers</h1>
        <Button
          onClick={() => setOpenTransferModal(true)}
          className="flex items-center gap-2 text-white"
        >
          <PlusCircleIcon className="w-4 h-4" />
          New Transfer
        </Button>
      </div>

      {/* Table Section */}
      <div className="p-4 sm:p-6 overflow-x-auto">
        <Card className="shadow-sm">
          <CardContent className="p-0">
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

          {/* Scrollable Body */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-6 bg-gray-50">
            {/* Transfer Info */}
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

            {/* Products Section */}
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
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                          {/* Product */}
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

                          {/* Quantity */}
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

                          {/* Agent */}
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

                          {/* Remove */}
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
      
    </AppLayout>
  );
}
