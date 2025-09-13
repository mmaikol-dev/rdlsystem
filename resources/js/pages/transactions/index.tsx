"use client";

import AppLayout from "@/layouts/app-layout";
import { type BreadcrumbItem } from "@/types";
import { Head, usePage, router } from "@inertiajs/react";
import * as React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
} from "@/components/ui/pagination";
import { RefreshCwIcon, SearchIcon, ShieldAlert, Edit, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const BREADCRUMBS: BreadcrumbItem[] = [
  { title: "Dashboard", href: "/dashboard" },
  { title: "Transactions", href: "/transactions" },
];

interface Transaction {
  id: number;
  transaction_id: string;
  account_number: string;
  amount: string;
  payer_phone: string;
  processed: boolean;
  created_at?: string;
}

export default function TransactionsView() {
  const { transactions, auth, filters } = usePage<{
    transactions: { data: Transaction[]; links: any[] } | Transaction[];
    auth: { user: { roles: string } };
    filters?: { search?: string };
  }>().props;

  const userRole = (auth?.user?.roles || "").toLowerCase();

  // Normalize list + links regardless of array/paginated payload
  const list: Transaction[] = Array.isArray(transactions)
    ? (transactions as Transaction[])
    : (transactions?.data as Transaction[]) || [];
  const links: any[] = Array.isArray(transactions) ? [] : (transactions as any)?.links || [];

  const [search, setSearch] = React.useState(filters?.search || "");

  // Edit/Delete state
  const [editingTransaction, setEditingTransaction] = React.useState<Transaction | null>(null);
  const [editValues, setEditValues] = React.useState<Partial<Transaction>>({});
  const [deletingTransaction, setDeletingTransaction] = React.useState<Transaction | null>(null);

  const handleSearch = React.useCallback(() => {
    router.get(
      "/transactions",
      { search },
      { preserveState: true, replace: true }
    );
  }, [search]);

  const refresh = React.useCallback(() => {
    router.get("/transactions", { preserveState: true, replace: true });
  }, [search]);

  const handleEditOpen = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setEditValues(transaction);
  };

  const handleEditSave = () => {
    if (!editingTransaction) return;
    router.put(`/transactions/${editingTransaction.id}`, editValues, {
      onSuccess: () => setEditingTransaction(null),
      preserveScroll: true,
      preserveState: true,
      only: ["transactions"],
    });
  };

  const handleDelete = () => {
    if (!deletingTransaction) return;
    router.delete(`/transactions/${deletingTransaction.id}`, {
      onSuccess: () => setDeletingTransaction(null),
      preserveScroll: true,
      preserveState: true,
      only: ["transactions"],
    });
  };

  return (
    <AppLayout breadcrumbs={BREADCRUMBS}>
      <Head title="Transactions" />

      {/* Access Denied */}
      <Dialog open={userRole === "merchant"}>
        <DialogContent className="max-w-sm text-center">
          <DialogHeader>
            <div className="flex justify-center mb-2">
              <ShieldAlert className="text-red-500 w-12 h-12" />
            </div>
            <DialogTitle className="text-red-600">Access Not Allowed</DialogTitle>
            <DialogDescription>You don’t have permission to view transactions.</DialogDescription>
          </DialogHeader>
          <div className="flex justify-center mt-4">
            <Button variant="outline" onClick={() => router.visit("/dashboard")}>
              Go Back to Dashboard
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {userRole !== "merchant" && (
        <div className="p-4">
          {/* Toolbar */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4">
            <div className="flex gap-2 w-full sm:w-auto sm:flex-1">
              <Input
                placeholder="Search by transaction ID, account, or phone"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="flex-1"
              />
              <Button onClick={handleSearch} title="Search">
                <SearchIcon className="h-4 w-4 mr-1" />
                Search
              </Button>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={refresh} title="Refresh list">
                <RefreshCwIcon className="h-4 w-4 mr-1" />
                Refresh
              </Button>
            </div>
          </div>

          {/* Table container ensures no overlap by allowing horizontal scroll and fixed widths */}
          <div className="border rounded-lg overflow-x-auto">
            <div className="min-w-[980px]">
              <Table className="table-fixed">
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead className="w-[18%]">Txn ID</TableHead>
                    <TableHead className="w-[16%]">Account</TableHead>
                    <TableHead className="w-[10%]">Amount</TableHead>
                    <TableHead className="w-[16%]">Payer Phone</TableHead>
                    <TableHead className="w-[12%]">Status</TableHead>
                    <TableHead className="w-[18%]">Created</TableHead>
                    <TableHead className="w-[10%] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {list.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-10">
                        No transactions found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    list.map((txn) => (
                      <TableRow key={txn.id} className="hover:bg-muted/10">
                        <TableCell className="whitespace-nowrap align-middle">
                          <span className="block truncate max-w-[200px]" title={txn.transaction_id}>
                            {txn.transaction_id}
                          </span>
                        </TableCell>
                        <TableCell className="whitespace-nowrap align-middle">
                          <span className="block truncate max-w-[180px]" title={txn.account_number}>
                            {txn.account_number}
                          </span>
                        </TableCell>
                        <TableCell className="whitespace-nowrap align-middle">
                          <span title={txn.amount}>{txn.amount}</span>
                        </TableCell>
                        <TableCell className="whitespace-nowrap align-middle">
                          <span className="block truncate max-w-[180px]" title={txn.payer_phone}>
                            {txn.payer_phone}
                          </span>
                        </TableCell>
                        <TableCell className="whitespace-nowrap align-middle">
                          {txn.processed ? (
                            <span className="text-green-600 font-semibold">Processed</span>
                          ) : (
                            <span className="text-yellow-600 font-semibold">Pending</span>
                          )}
                        </TableCell>
                        <TableCell className="whitespace-nowrap align-middle">
                          {txn.created_at ? (
                            <span className="block truncate max-w-[220px]" title={new Date(txn.created_at).toLocaleString()}>
                              {new Date(txn.created_at).toLocaleString()}
                            </span>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell className="whitespace-nowrap align-middle">
                          <div className="flex gap-2 justify-end">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditOpen(txn)}
                              title="Edit"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => setDeletingTransaction(txn)}
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Pagination (keeps search param for cross-page search) */}
          {!Array.isArray(transactions) && links.length > 0 && (
            <div className="mt-4 flex justify-center">
              <Pagination>
                <PaginationContent>
                  {links.map((link: any, index: number) => (
                    <PaginationItem key={index}>
                      <PaginationLink
                        as="button"
                        isActive={link.active}
                        disabled={!link.url}
                        onClick={() =>
                          link.url && router.get(link.url, { search }, { preserveState: true })
                        }
                        dangerouslySetInnerHTML={{ __html: link.label }}
                      />
                    </PaginationItem>
                  ))}
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </div>
      )}

      {/* Edit Modal */}
      <Dialog
        open={!!editingTransaction}
        onOpenChange={(open) => !open && setEditingTransaction(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Transaction</DialogTitle>
            <DialogDescription>Update the transaction information below.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            {["transaction_id", "account_number", "amount", "payer_phone"].map((field) => (
              <Input
                key={field}
                value={(editValues as any)[field] || ""}
                onChange={(e) => setEditValues({ ...editValues, [field]: e.target.value })}
                placeholder={field.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
              />
            ))}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Processed</label>
              <input
                type="checkbox"
                checked={!!editValues.processed}
                onChange={(e) => setEditValues({ ...editValues, processed: e.target.checked })}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setEditingTransaction(null)}>
              Cancel
            </Button>
            <Button onClick={handleEditSave}>Save</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog
        open={!!deletingTransaction}
        onOpenChange={(open) => !open && setDeletingTransaction(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete transaction {" "}
              <strong>{deletingTransaction?.transaction_id}</strong>?
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setDeletingTransaction(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
