"use client";

import AppLayout from "@/layouts/app-layout";
import { Head, usePage, router, useForm } from "@inertiajs/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { ArrowLeftIcon, PackageIcon, UserIcon, MinusCircleIcon, PlusCircleIcon, TrashIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { useState } from "react";

export default function TransferDetails() {
  const { transfers, deductions, productId, agentId, totalTransferred, totalDeducted, remainingQuantity } = usePage().props as any;
  const [isDeductionOpen, setIsDeductionOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data, setData, post, processing, errors, reset } = useForm({
    code: "",
    quantity: "",
    reason: "",
  });

  const firstTransfer = transfers?.data?.[0];

  const handleSubmitDeduction = (e: React.FormEvent) => {
    e.preventDefault();
    post(`/transfers/${productId}/${agentId}/deductions`, {
      onSuccess: () => {
        reset();
        setIsDeductionOpen(false);
      },
    });
  };

  const handleDeleteDeduction = (id: number) => {
    router.delete(`/deductions/${id}`, {
      onSuccess: () => {
        setDeleteId(null);
      },
    });
  };

  const breadcrumbs = [
    { title: "Transfers", href: "/transfer" },
    { title: "Details", href: "#" },
  ];

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="Transfer Details" />

      <div className="p-4 sm:p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="outline"
            onClick={() => router.get("/transfer")}
            className="flex items-center gap-2"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            Back to Transfers
          </Button>

          <Dialog open={isDeductionOpen} onOpenChange={setIsDeductionOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <MinusCircleIcon className="w-4 h-4" />
                Add Deduction
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Record Deduction</DialogTitle>
                <DialogDescription>
                  Enter a unique code and quantity to deduct from transfers.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmitDeduction}>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="code">Unique Code *</Label>
                    <Input
                      id="code"
                      value={data.code}
                      onChange={(e) => setData("code", e.target.value)}
                      placeholder="Enter unique code"
                      required
                    />
                    {errors.code && (
                      <p className="text-sm text-red-600">{errors.code}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="quantity">Quantity *</Label>
                    <Input
                      id="quantity"
                      type="number"
                      min="1"
                      max={remainingQuantity}
                      value={data.quantity}
                      onChange={(e) => setData("quantity", e.target.value)}
                      placeholder="Enter quantity"
                      required
                    />
                    {errors.quantity && (
                      <p className="text-sm text-red-600">{errors.quantity}</p>
                    )}
                    <p className="text-sm text-gray-500">
                      Available: {remainingQuantity} units
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reason">Reason (Optional)</Label>
                    <Textarea
                      id="reason"
                      value={data.reason}
                      onChange={(e) => setData("reason", e.target.value)}
                      placeholder="Enter reason for deduction"
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDeductionOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={processing}>
                    {processing ? "Saving..." : "Save Deduction"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Summary Cards */}
        {firstTransfer && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
                  <PackageIcon className="w-4 h-4" />
                  Product
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-gray-900">{firstTransfer.product?.name}</p>
                <p className="text-sm text-gray-500 mt-1">ID: {productId}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
                  <UserIcon className="w-4 h-4" />
                  Agent
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-gray-900">{firstTransfer.agent?.name}</p>
                <p className="text-sm text-gray-500 mt-1">ID: {agentId}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
                  <PlusCircleIcon className="w-4 h-4 text-green-600" />
                  Total Transferred
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-green-600">{totalTransferred}</p>
                <p className="text-sm text-gray-500 mt-1">{transfers?.data?.length || 0} transfers</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
                  <MinusCircleIcon className="w-4 h-4 text-red-600" />
                  Deducted / Remaining
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-bold text-red-600">{totalDeducted}</p>
                  <span className="text-gray-400">/</span>
                  <p className="text-2xl font-bold text-blue-600">{remainingQuantity}</p>
                </div>
                <p className="text-sm text-gray-500 mt-1">{deductions?.length || 0} deductions</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Deductions Table */}
        {deductions && deductions.length > 0 && (
          <Card className="shadow-sm mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Deductions</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Deducted By</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deductions.map((deduction: any, index: number) => (
                      <TableRow key={deduction.id} className="hover:bg-gray-50">
                        <TableCell className="font-medium">{index + 1}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono">
                            {deduction.code}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="destructive">-{deduction.quantity}</Badge>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {deduction.reason || "—"}
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {deduction.deducted_by}
                        </TableCell>
                        <TableCell className="text-sm">
                          {new Date(deduction.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteId(deduction.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Transfer History */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Transfer History</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Region</TableHead>
                    <TableHead>From</TableHead>
                    <TableHead>Transferred By</TableHead>
                    <TableHead>Merchant</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transfers?.data?.length > 0 ? (
                    transfers.data.map((transfer: any, index: number) => (
                      <TableRow key={transfer.id} className="hover:bg-gray-50">
                        <TableCell className="font-medium">{index + 1}</TableCell>
                        <TableCell>{transfer.date || new Date(transfer.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono">
                            +{transfer.quantity}
                          </Badge>
                        </TableCell>
                        <TableCell>{transfer.region || "N/A"}</TableCell>
                        <TableCell>{transfer.from || "N/A"}</TableCell>
                        <TableCell className="text-sm text-gray-600">{transfer.transfer_by || "System"}</TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {transfer.unit?.name || transfer.merchant || "N/A"}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                        No transfer records found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Pagination */}
        {transfers?.links && (
          <div className="flex justify-center gap-2 mt-4">
            {transfers.links.map((link: any, index: number) => (
              <Button
                key={index}
                variant={link.active ? "default" : "outline"}
                size="sm"
                disabled={!link.url}
                onClick={() => link.url && router.get(link.url)}
                dangerouslySetInnerHTML={{ __html: link.label }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Deduction?</DialogTitle>
            <DialogDescription>
              This will permanently delete this deduction record. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteId(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteId && handleDeleteDeduction(deleteId)}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}