"use client";

import AppLayout from "@/layouts/app-layout";
import { Head, usePage, router } from "@inertiajs/react";
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
import { ArrowLeftIcon, PackageIcon, UserIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function TransferDetails() {
  const { transfers, productId, agentId } = usePage().props as any;

  const firstTransfer = transfers?.data?.[0];
  const totalQuantity = transfers?.data?.reduce((sum: number, t: any) => sum + parseInt(t.quantity || 0), 0) || 0;

  const breadcrumbs = [
    { title: "Transfers", href: "/transfer" },
    { title: "Details", href: "#" },
  ];

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="Transfer Details" />

      {/* Header */}
      <div className="p-4 sm:p-6">
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="outline"
            onClick={() => router.get("/transfer")}
            className="flex items-center gap-2"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            Back to Transfers
          </Button>
        </div>

        {/* Summary Cards */}
        {firstTransfer && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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
                <CardTitle className="text-sm font-medium text-gray-500">Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Transfers:</span>
                    <Badge variant="secondary" className="font-semibold">
                      {transfers?.data?.length || 0}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Quantity:</span>
                    <Badge variant="default" className="font-semibold">
                      {totalQuantity} units
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Detailed Transfer List */}
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
                            {transfer.quantity}
                          </Badge>
                        </TableCell>
                        <TableCell>{transfer.region || "N/A"}</TableCell>
                        <TableCell>{transfer.from || "N/A"}</TableCell>
                        <TableCell className="text-sm text-gray-600">{transfer.transfer_by || "System"}</TableCell>
                        <TableCell className="text-sm text-gray-600"> {transfer.unit?.name || transfer.merchant || "N/A"}</TableCell>
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
    </AppLayout>
  );
}