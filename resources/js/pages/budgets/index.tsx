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
import { Card, CardContent } from "@/components/ui/card";
import {
    Table,
    TableHeader,
    TableHead,
    TableBody,
    TableRow,
    TableCell,
} from "@/components/ui/table";
import { PlusCircleIcon, EyeIcon, TrendingUp, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

export default function BudgetsIndex() {
    const { auth, budgets } = usePage().props as any;

    const [openBudgetModal, setOpenBudgetModal] = useState(false);
    const [openTopUpModal, setOpenTopUpModal] = useState(false);
    const [drawerDirection, setDrawerDirection] = useState<"right" | "bottom">("bottom");
    const [selectedBudget, setSelectedBudget] = useState<any>(null);

    const [budgetData, setBudgetData] = useState({
        budget_date: new Date().toISOString().split('T')[0],
        initial_amount: "",
    });

    const [topUpData, setTopUpData] = useState({
        amount: "",
        reason: "",
    });

    useEffect(() => {
        const handleResize = () => {
            setDrawerDirection(window.innerWidth >= 768 ? "right" : "bottom");
        };
        handleResize();
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    const handleCreateBudget = () => {
        router.post("/budgets", budgetData);
        setOpenBudgetModal(false);
        setBudgetData({
            budget_date: new Date().toISOString().split('T')[0],
            initial_amount: "",
        });
    };

    const handleTopUp = () => {
        router.post(`/budgets/${selectedBudget.id}/topup`, topUpData);
        setOpenTopUpModal(false);
        setTopUpData({ amount: "", reason: "" });
    };

    const openTopUpDrawer = (budget: any) => {
        setSelectedBudget(budget);
        setOpenTopUpModal(true);
    };

    const viewDetails = (id: number) => {
        router.get(`/budgets/${id}`);
    };

    const getHealthStatus = (current: number, initial: number) => {
        const percentage = (current / initial) * 100;
        if (percentage > 50) return { color: "bg-green-100 text-green-800", label: "Healthy" };
        if (percentage > 25) return { color: "bg-yellow-100 text-yellow-800", label: "Moderate" };
        return { color: "bg-red-100 text-red-800", label: "Low" };
    };

    const breadcrumbs = [
        { title: "Daily Budgets", href: "/budgets" },
        { title: "Manage", href: "#" },
    ];

    // Convert budgets to array if it's a collection
    const budgetsArray = Array.isArray(budgets) ? budgets : budgets?.data || [];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Daily Budgets" />

            <div className="flex items-center justify-between gap-2 p-3 flex-wrap">
                <h1 className="text-xl font-bold text-gray-800">Daily Budgets</h1>

                <Button
                    onClick={() => setOpenBudgetModal(true)}
                    className="flex items-center gap-2 text-white"
                >
                    <PlusCircleIcon className="w-4 h-4" />
                    Create Budget
                </Button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4">
                <Card className="shadow-sm">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Total Budget</p>
                                <p className="text-2xl font-bold text-gray-800">
                                    KES{budgetsArray.reduce((sum: number, b: any) => sum + parseFloat(b.initial_amount || 0), 0).toFixed(2)}
                                </p>
                            </div>
                            <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                                <Wallet className="h-6 w-6 text-blue-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="shadow-sm">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Total Spent</p>
                                <p className="text-2xl font-bold text-gray-800">
                                    KES{budgetsArray.reduce((sum: number, b: any) => sum + parseFloat(b.spent_amount || 0), 0).toFixed(2)}
                                </p>
                            </div>
                            <div className="h-12 w-12 bg-red-100 rounded-full flex items-center justify-center">
                                <TrendingUp className="h-6 w-6 text-red-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="shadow-sm">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Remaining</p>
                                <p className="text-2xl font-bold text-gray-800">
                                    KES{budgetsArray.reduce((sum: number, b: any) => sum + parseFloat(b.current_amount || 0), 0).toFixed(2)}
                                </p>
                            </div>
                            <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                                <Wallet className="h-6 w-6 text-green-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Table Section */}
            <div className="p-4 sm:p-6 overflow-x-auto">
                <Card className="shadow-sm">
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>#</TableHead>
                                    <TableHead>Budget Date</TableHead>
                                    <TableHead>Initial Amount</TableHead>
                                    <TableHead>Spent Amount</TableHead>
                                    <TableHead>Current Balance</TableHead>
                                    <TableHead>Health</TableHead>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {budgetsArray.length > 0 ? (
                                    budgetsArray.map((budget: any, index: number) => {
                                        const health = getHealthStatus(
                                            parseFloat(budget.current_amount || 0),
                                            parseFloat(budget.initial_amount || 1) // Avoid division by zero
                                        );
                                        return (
                                            <TableRow key={budget.id} className="hover:bg-gray-50">
                                                <TableCell>{index + 1}</TableCell>
                                                <TableCell className="font-medium">
                                                    {new Date(budget.budget_date).toLocaleDateString()}
                                                </TableCell>
                                                <TableCell className="font-semibold">
                                                    KES{parseFloat(budget.initial_amount || 0).toFixed(2)}
                                                </TableCell>
                                                <TableCell className="text-red-600 font-semibold">
                                                    -KES{parseFloat(budget.spent_amount || 0).toFixed(2)}
                                                </TableCell>
                                                <TableCell className="text-green-600 font-bold text-lg">
                                                    KES{parseFloat(budget.current_amount || 0).toFixed(2)}
                                                </TableCell>
                                                <TableCell>
                                                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${health.color}`}>
                                                        {health.label}
                                                    </span>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => viewDetails(budget.id)}
                                                            className="flex items-center gap-1"
                                                        >
                                                            <EyeIcon className="w-4 h-4" />
                                                            View
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            onClick={() => openTopUpDrawer(budget)}
                                                            className="text-white"
                                                        >
                                                            Top Up
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center text-gray-500 py-6">
                                            No budgets found.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>

            {/* Create Budget Drawer */}
            <Drawer open={openBudgetModal} onOpenChange={setOpenBudgetModal} direction={drawerDirection}>
                <DrawerContent
                    className={`
                        md:max-w-[600px] w-full h-[90vh] md:h-screen
                        md:right-0 md:left-auto md:rounded-l-2xl
                        flex flex-col overflow-hidden bg-white
                    `}
                >
                    <DrawerHeader className="border-b bg-white sticky top-0 z-10 p-4">
                        <DrawerTitle className="text-xl font-bold text-gray-800">Create Daily Budget</DrawerTitle>
                        <DrawerDescription className="text-sm text-muted-foreground">
                            Set up a new daily budget allocation.
                        </DrawerDescription>
                    </DrawerHeader>

                    <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-6 bg-gray-50">
                        <Card className="shadow-sm">
                            <CardContent className="p-4 sm:p-6 space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">Budget Date *</label>
                                    <Input
                                        type="date"
                                        value={budgetData.budget_date}
                                        onChange={(e) => setBudgetData({ ...budgetData, budget_date: e.target.value })}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">Initial Amount *</label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={budgetData.initial_amount}
                                        onChange={(e) => setBudgetData({ ...budgetData, initial_amount: e.target.value })}
                                        placeholder="Enter initial budget amount"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">Created By</label>
                                    <Input readOnly value={auth?.user?.name || ""} className="bg-gray-100" />
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <DrawerFooter className="border-t bg-white sticky bottom-0 z-10 flex justify-end gap-2 py-4 px-4 sm:px-6">
                        <DrawerClose asChild><Button variant="outline">Cancel</Button></DrawerClose>
                        <Button onClick={handleCreateBudget} className="text-white">Create Budget</Button>
                    </DrawerFooter>
                </DrawerContent>
            </Drawer>

            {/* Top Up Drawer */}
            <Drawer open={openTopUpModal} onOpenChange={setOpenTopUpModal} direction={drawerDirection}>
                <DrawerContent
                    className={`
                        md:max-w-[600px] w-full h-[90vh] md:h-screen
                        md:right-0 md:left-auto md:rounded-l-2xl
                        flex flex-col overflow-hidden bg-white
                    `}
                >
                    <DrawerHeader className="border-b bg-white sticky top-0 z-10 p-4">
                        <DrawerTitle className="text-xl font-bold text-gray-800">Top Up Budget</DrawerTitle>
                        <DrawerDescription className="text-sm text-muted-foreground">
                            Add funds to the budget for {selectedBudget && new Date(selectedBudget.budget_date).toLocaleDateString()}
                        </DrawerDescription>
                    </DrawerHeader>

                    <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-6 bg-gray-50">
                        {selectedBudget && (
                            <Card className="shadow-sm bg-blue-50 border-blue-200">
                                <CardContent className="p-4 space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-sm text-blue-700">Current Balance:</span>
                                        <span className="font-bold text-blue-900">
                                            KES{parseFloat(selectedBudget.current_amount || 0).toFixed(2)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-sm text-blue-700">Spent:</span>
                                        <span className="font-semibold text-blue-900">
                                            KES{parseFloat(selectedBudget.spent_amount || 0).toFixed(2)}
                                        </span>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        <Card className="shadow-sm">
                            <CardContent className="p-4 sm:p-6 space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">Top Up Amount *</label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        min="0.01"
                                        value={topUpData.amount}
                                        onChange={(e) => setTopUpData({ ...topUpData, amount: e.target.value })}
                                        placeholder="Enter amount to add"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">Reason (Optional)</label>
                                    <Textarea
                                        value={topUpData.reason}
                                        onChange={(e) => setTopUpData({ ...topUpData, reason: e.target.value })}
                                        placeholder="Enter reason for top up"
                                        rows={3}
                                    />
                                </div>

                                {topUpData.amount && selectedBudget && (
                                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                                        <p className="text-sm text-green-700">New Balance After Top Up:</p>
                                        <p className="text-2xl font-bold text-green-900">
                                            KES{(parseFloat(selectedBudget.current_amount || 0) + parseFloat(topUpData.amount || 0)).toFixed(2)}
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    <DrawerFooter className="border-t bg-white sticky bottom-0 z-10 flex justify-end gap-2 py-4 px-4 sm:px-6">
                        <DrawerClose asChild><Button variant="outline">Cancel</Button></DrawerClose>
                        <Button onClick={handleTopUp} className="text-white">Confirm Top Up</Button>
                    </DrawerFooter>
                </DrawerContent>
            </Drawer>
        </AppLayout>
    );
}