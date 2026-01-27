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
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, TrendingUp, TrendingDown, DollarSign } from "lucide-react";

export default function BudgetShow() {
    const { budget } = usePage().props as any;

    const getTransactionIcon = (type: string) => {
        switch (type) {
            case 'initial':
            case 'topup':
                return <TrendingUp className="w-4 h-4 text-green-600" />;
            case 'deduction':
                return <TrendingDown className="w-4 h-4 text-red-600" />;
            default:
                return <DollarSign className="w-4 h-4 text-gray-600" />;
        }
    };

    const getTransactionColor = (type: string) => {
        switch (type) {
            case 'initial':
            case 'topup':
                return 'text-green-600';
            case 'deduction':
                return 'text-red-600';
            default:
                return 'text-gray-600';
        }
    };

    const breadcrumbs = [
        { title: "Daily Budgets", href: "/budgets" },
        { title: new Date(budget.budget_date).toLocaleDateString(), href: "#" },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Budget - ${new Date(budget.budget_date).toLocaleDateString()}`} />

            <div className="p-4 sm:p-6 space-y-6">
                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        onClick={() => router.get("/budgets")}
                        className="flex items-center gap-2"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back
                    </Button>
                    <h1 className="text-2xl font-bold text-gray-800">
                        Budget for {new Date(budget.budget_date).toLocaleDateString()}
                    </h1>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="shadow-sm bg-blue-50 border-blue-200">
                        <CardContent className="p-6">
                            <p className="text-sm text-blue-700 mb-1">Initial Budget</p>
                            <p className="text-3xl font-bold text-blue-900">
                                KES{parseFloat(budget.initial_amount).toFixed(2)}
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="shadow-sm bg-red-50 border-red-200">
                        <CardContent className="p-6">
                            <p className="text-sm text-red-700 mb-1">Spent Amount</p>
                            <p className="text-3xl font-bold text-red-900">
                                KES{parseFloat(budget.spent_amount).toFixed(2)}
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="shadow-sm bg-green-50 border-green-200">
                        <CardContent className="p-6">
                            <p className="text-sm text-green-700 mb-1">Current Balance</p>
                            <p className="text-3xl font-bold text-green-900">
                                KES{parseFloat(budget.current_amount).toFixed(2)}
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Transactions Table */}
                <Card className="shadow-sm">
                    <CardHeader className="border-b">
                        <CardTitle>Transaction History</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>#</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                    <TableHead className="text-right">Balance Before</TableHead>
                                    <TableHead className="text-right">Balance After</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>By</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {budget.transactions?.length > 0 ? (
                                    budget.transactions.map((transaction: any, index: number) => (
                                        <TableRow key={transaction.id} className="hover:bg-gray-50">
                                            <TableCell>{index + 1}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    {getTransactionIcon(transaction.type)}
                                                    <span className="capitalize font-medium">{transaction.type}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="max-w-xs">
                                                {transaction.description || '-'}
                                            </TableCell>
                                            <TableCell className={`text-right font-semibold ${getTransactionColor(transaction.type)}`}>
                                                {transaction.type === 'deduction' ? '-' : '+'}
                                                KES{parseFloat(transaction.amount).toFixed(2)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                KES{parseFloat(transaction.balance_before).toFixed(2)}
                                            </TableCell>
                                            <TableCell className="text-right font-semibold">
                                                KES{parseFloat(transaction.balance_after).toFixed(2)}
                                            </TableCell>
                                            <TableCell className="text-sm">
                                                {new Date(transaction.created_at).toLocaleString()}
                                            </TableCell>
                                            <TableCell>{transaction.creator?.name || 'System'}</TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={8} className="text-center text-gray-500 py-6">
                                            No transactions found.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Top Ups Table */}
                {budget.top_ups?.length > 0 && (
                    <Card className="shadow-sm">
                        <CardHeader className="border-b">
                            <CardTitle>Top Up History</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>#</TableHead>
                                        <TableHead>Amount</TableHead>
                                        <TableHead>Reason</TableHead>
                                        <TableHead>Added By</TableHead>
                                        <TableHead>Date</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {budget.top_ups.map((topUp: any, index: number) => (
                                        <TableRow key={topUp.id}>
                                            <TableCell>{index + 1}</TableCell>
                                            <TableCell className="font-semibold text-green-600">
                                                +KES{parseFloat(topUp.amount).toFixed(2)}
                                            </TableCell>
                                            <TableCell>{topUp.reason || '-'}</TableCell>
                                            <TableCell>{topUp.added_by_user?.name}</TableCell>
                                            <TableCell className="text-sm">
                                                {new Date(topUp.created_at).toLocaleString()}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                )}

                {/* Requisitions Paid from This Budget */}
                {budget.requisitions?.length > 0 && (
                    <Card className="shadow-sm">
                        <CardHeader className="border-b">
                            <CardTitle>Requisitions Paid from This Budget</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>#</TableHead>
                                        <TableHead>Requisition No.</TableHead>
                                        <TableHead>Title</TableHead>
                                        <TableHead>Amount</TableHead>
                                        <TableHead>Paid At</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {budget.requisitions.map((req: any, index: number) => (
                                        <TableRow key={req.id}>
                                            <TableCell>{index + 1}</TableCell>
                                            <TableCell className="font-medium">{req.requisition_number}</TableCell>
                                            <TableCell>{req.title}</TableCell>
                                            <TableCell className="font-semibold text-red-600">
                                                -KES{parseFloat(req.total_amount).toFixed(2)}
                                            </TableCell>
                                            <TableCell className="text-sm">
                                                {new Date(req.paid_at).toLocaleString()}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                )}
            </div>
        </AppLayout>
    );
}