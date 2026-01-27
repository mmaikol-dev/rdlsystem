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
import { PlusCircleIcon, TrashIcon, EyeIcon, FilterIcon, XCircleIcon, CalendarIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export default function RequisitionsIndex() {
    const { auth, requisitions, categories, users, filters = {} } = usePage().props as any;

    const [openRequisitionModal, setOpenRequisitionModal] = useState(false);
    const [drawerDirection, setDrawerDirection] = useState<"right" | "bottom">("bottom");
    const [formData, setFormData] = useState({
        category_id: "",
        user_id: "",
        description: "",
        requisition_date: new Date().toISOString().split('T')[0],
    });
    const [items, setItems] = useState([
        { item_name: "", description: "", quantity: 1, unit_price: 0 }
    ]);
    const [openFilterModal, setOpenFilterModal] = useState(false);

    // Filter states - Initialize from props
    const [filterStatus, setFilterStatus] = useState(filters?.status || "");
    const [filterCategory, setFilterCategory] = useState(filters?.category_id || "");
    const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
        from: filters?.date_from ? new Date(filters.date_from) : undefined,
        to: filters?.date_to ? new Date(filters.date_to) : undefined,
    });

    useEffect(() => {
        const handleResize = () => {
            setDrawerDirection(window.innerWidth >= 768 ? "right" : "bottom");
        };
        handleResize();
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    // Update filter states when props change
    useEffect(() => {
        if (filters) {
            setFilterStatus(filters.status || "");
            setFilterCategory(filters.category_id || "");
            setDateRange({
                from: filters.date_from ? new Date(filters.date_from) : undefined,
                to: filters.date_to ? new Date(filters.date_to) : undefined,
            });
        }
    }, [filters]);

    const addItem = () => {
        setItems([...items, { item_name: "", description: "", quantity: 1, unit_price: 0 }]);
    };

    const removeItem = (index: number) => {
        if (items.length > 1) {
            setItems(items.filter((_, i) => i !== index));
        }
    };

    const handleItemChange = (index: number, field: string, value: any) => {
        const updated = [...items];
        (updated[index] as any)[field] = value;
        setItems(updated);
    };

    const calculateTotal = () => {
        return items.reduce((sum, item) => {
            return sum + (item.quantity * item.unit_price);
        }, 0);
    };

    const handleSubmit = () => {
        router.post("/requisitions", {
            ...formData,
            items,
        }, {
            onSuccess: () => {
                setOpenRequisitionModal(false);
                resetForm();
            }
        });
    };

    const resetForm = () => {
        setFormData({
            category_id: "",
            user_id: "",
            description: "",
            requisition_date: new Date().toISOString().split('T')[0],
        });
        setItems([{ item_name: "", description: "", quantity: 1, unit_price: 0 }]);
    };

    const updateStatus = (id: number, status: string) => {
        router.patch(`/requisitions/${id}/status`, { status });
    };

    const viewDetails = (id: number) => {
        router.get(`/requisitions/${id}`);
    };

    const applyFilters = () => {
        const params: any = {};

        if (filterStatus) params.status = filterStatus;
        if (filterCategory) params.category_id = filterCategory;
        if (dateRange.from) params.date_from = format(dateRange.from, "yyyy-MM-dd");
        if (dateRange.to) params.date_to = format(dateRange.to, "yyyy-MM-dd");

        router.get("/requisitions", params);
        setOpenFilterModal(false);
    };

    const clearFilters = () => {
        setFilterStatus("");
        setFilterCategory("");
        setDateRange({ from: undefined, to: undefined });
        router.get("/requisitions");
        setOpenFilterModal(false);
    };

    const removeFilter = (filterName: string) => {
        const params: any = {
            status: filterStatus,
            category_id: filterCategory,
            date_from: dateRange.from ? format(dateRange.from, "yyyy-MM-dd") : undefined,
            date_to: dateRange.to ? format(dateRange.to, "yyyy-MM-dd") : undefined,
        };

        if (filterName === 'status') {
            setFilterStatus("");
            delete params.status;
        }
        if (filterName === 'category_id') {
            setFilterCategory("");
            delete params.category_id;
        }
        if (filterName === 'date_range') {
            setDateRange({ from: undefined, to: undefined });
            delete params.date_from;
            delete params.date_to;
        }

        router.get("/requisitions", params);
    };

    const getStatusBadge = (status: string) => {
        const statusConfig: any = {
            pending: { variant: "secondary", label: "Pending" },
            approved: { variant: "default", label: "Approved" },
            rejected: { variant: "destructive", label: "Rejected" },
            paid: { variant: "default", label: "Paid" },
        };
        const config = statusConfig[status] || statusConfig.pending;
        return <Badge variant={config.variant}>{config.label}</Badge>;
    };

    const hasActiveFilters = filterStatus || filterCategory || dateRange.from || dateRange.to;

    const breadcrumbs = [
        { title: "Requisitions", href: "/requisitions" },
        { title: "Manage", href: "#" },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Requisitions" />

            <div className="flex items-center justify-between gap-2 p-3 flex-wrap">
                <h1 className="text-xl font-bold text-gray-800">Requisitions</h1>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        onClick={() => setOpenFilterModal(true)}
                        className="flex items-center gap-2"
                    >
                        <FilterIcon className="w-4 h-4" />
                        Filter
                        {hasActiveFilters && (
                            <Badge variant="secondary" className="ml-1">
                                Active
                            </Badge>
                        )}
                    </Button>

                    <Button
                        onClick={() => setOpenRequisitionModal(true)}
                        className="flex items-center gap-2 text-white"
                    >
                        <PlusCircleIcon className="w-4 h-4" />
                        New Requisition
                    </Button>
                </div>
            </div>

            {/* Active Filters Display */}
            {hasActiveFilters && (
                <div className="px-3 pb-3">
                    <Card>
                        <CardContent className="p-3">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-medium text-gray-700">Active Filters:</span>

                                {filterStatus && (
                                    <Badge variant="secondary" className="flex items-center gap-1">
                                        Status: {filterStatus}
                                        <XCircleIcon
                                            className="w-3 h-3 cursor-pointer hover:text-red-600"
                                            onClick={() => removeFilter('status')}
                                        />
                                    </Badge>
                                )}

                                {filterCategory && (
                                    <Badge variant="secondary" className="flex items-center gap-1">
                                        Category: {categories?.find((c: any) => String(c.id) === filterCategory)?.name}
                                        <XCircleIcon
                                            className="w-3 h-3 cursor-pointer hover:text-red-600"
                                            onClick={() => removeFilter('category_id')}
                                        />
                                    </Badge>
                                )}

                                {(dateRange.from || dateRange.to) && (
                                    <Badge variant="secondary" className="flex items-center gap-1">
                                        Date: {dateRange.from ? format(dateRange.from, "MMM dd, yyyy") : "..."} - {dateRange.to ? format(dateRange.to, "MMM dd, yyyy") : "..."}
                                        <XCircleIcon
                                            className="w-3 h-3 cursor-pointer hover:text-red-600"
                                            onClick={() => removeFilter('date_range')}
                                        />
                                    </Badge>
                                )}

                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={clearFilters}
                                    className="text-xs text-red-600 hover:text-red-700"
                                >
                                    Clear All
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Table Section */}
            <div className="p-4 sm:p-6 overflow-x-auto">
                <Card className="shadow-sm">
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>#</TableHead>
                                    <TableHead>Requisition No.</TableHead>
                                    <TableHead>Title</TableHead>
                                    <TableHead>Category</TableHead>
                                    <TableHead>Total Amount</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Requested By</TableHead>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {requisitions?.data?.length > 0 ? (
                                    requisitions.data.map((req: any, index: number) => (
                                        <TableRow key={req.id} className="hover:bg-gray-50">
                                            <TableCell>{index + 1}</TableCell>
                                            <TableCell className="font-medium">{req.requisition_number}</TableCell>
                                            <TableCell>{req.title}</TableCell>
                                            <TableCell>{req.category?.name}</TableCell>
                                            <TableCell className="font-semibold">
                                                KES {parseFloat(req.total_amount).toFixed(2)}
                                            </TableCell>
                                            <TableCell>{getStatusBadge(req.status)}</TableCell>
                                            <TableCell className="text-sm text-gray-600">
                                                {new Date(req.requisition_date).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell>{req.user?.name}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => viewDetails(req.id)}
                                                        className="flex items-center gap-1"
                                                    >
                                                        <EyeIcon className="w-4 h-4" />
                                                        View
                                                    </Button>
                                                    {req.status === 'approved' && auth?.user?.role === 'finance' && (
                                                        <Button
                                                            size="sm"
                                                            onClick={() => updateStatus(req.id, 'paid')}
                                                            className="text-white"
                                                        >
                                                            Mark Paid
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={9} className="text-center text-gray-500 py-6">
                                            {hasActiveFilters
                                                ? "No requisitions found matching your filters."
                                                : "No requisitions found."}
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>

            {/* Create Requisition Drawer */}
            <Drawer open={openRequisitionModal} onOpenChange={setOpenRequisitionModal} direction={drawerDirection}>
                <DrawerContent
                    className={`
            md:max-w-[900px] w-full h-[90vh] md:h-screen
            md:right-0 md:left-auto md:rounded-l-2xl
            flex flex-col overflow-hidden bg-white
          `}
                >
                    <DrawerHeader className="border-b bg-white sticky top-0 z-10 p-4">
                        <DrawerTitle className="text-xl font-bold text-gray-800">Create New Requisition</DrawerTitle>
                        <DrawerDescription className="text-sm text-muted-foreground">
                            Fill in the details below to create a requisition request.
                        </DrawerDescription>
                    </DrawerHeader>

                    <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-6 bg-gray-50">
                        <Card className="shadow-sm">
                            <CardContent className="p-4 sm:p-6">
                                <h3 className="text-base sm:text-lg font-semibold mb-4 text-gray-800">
                                    Requisition Information
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-700">Category *</label>
                                        <Select value={formData.category_id} onValueChange={(val) => setFormData({ ...formData, category_id: val })}>
                                            <SelectTrigger><SelectValue placeholder="Select Category" /></SelectTrigger>
                                            <SelectContent>
                                                {categories?.map((cat: any) => (
                                                    <SelectItem key={cat.id} value={String(cat.id)}>{cat.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-700">Date *</label>
                                        <Input
                                            type="date"
                                            value={formData.requisition_date}
                                            onChange={(e) => setFormData({ ...formData, requisition_date: e.target.value })}
                                        />
                                    </div>

                                    <div className="space-y-2 sm:col-span-2">
                                        <label className="text-sm font-medium text-gray-700">User *</label>
                                        <Select value={formData.user_id} onValueChange={(val) => setFormData({ ...formData, user_id: val })}>
                                            <SelectTrigger><SelectValue placeholder="Select User" /></SelectTrigger>
                                            <SelectContent>
                                                {users?.map((user: any) => (
                                                    <SelectItem key={user.id} value={String(user.id)}>
                                                        {user.name} ({user.email})
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2 sm:col-span-2">
                                        <label className="text-sm font-medium text-gray-700">Description</label>
                                        <Textarea
                                            value={formData.description}
                                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                            placeholder="Enter description"
                                            rows={3}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-700">Requested By</label>
                                        <Input readOnly value={auth?.user?.name || ""} className="bg-gray-100" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="shadow-sm">
                            <CardContent className="p-4 sm:p-6">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-base sm:text-lg font-semibold text-gray-800">
                                        Requisition Items
                                    </h3>
                                    <span className="text-xs sm:text-sm text-muted-foreground">
                                        {items.length} item{items.length !== 1 ? "s" : ""}
                                    </span>
                                </div>

                                <div className="space-y-4">
                                    {items.map((item, i) => (
                                        <Card key={i} className="border-l-4 border-l-blue-500 bg-white">
                                            <CardContent className="p-4">
                                                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                                                    <div className="space-y-2 md:col-span-2">
                                                        <label className="text-sm font-medium text-gray-700">Item Name *</label>
                                                        <Input
                                                            value={item.item_name}
                                                            onChange={(e) => handleItemChange(i, "item_name", e.target.value)}
                                                            placeholder="Enter item name"
                                                        />
                                                    </div>

                                                    <div className="space-y-2">
                                                        <label className="text-sm font-medium text-gray-700">Quantity *</label>
                                                        <Input
                                                            type="number"
                                                            min="1"
                                                            value={item.quantity}
                                                            onChange={(e) => handleItemChange(i, "quantity", parseInt(e.target.value) || 0)}
                                                            placeholder="Enter quantity"
                                                        />
                                                    </div>

                                                    <div className="space-y-2">
                                                        <label className="text-sm font-medium text-gray-700">Unit Price *</label>
                                                        <Input
                                                            type="number"
                                                            min="0"
                                                            step="0.01"
                                                            value={item.unit_price}
                                                            onChange={(e) => handleItemChange(i, "unit_price", parseFloat(e.target.value) || 0)}
                                                            placeholder="Enter price"
                                                        />
                                                    </div>

                                                    <Button
                                                        variant="outline"
                                                        onClick={() => removeItem(i)}
                                                        disabled={items.length === 1}
                                                        className="flex items-center justify-center"
                                                    >
                                                        <TrashIcon className="w-4 h-4 mr-1" /> Remove
                                                    </Button>
                                                </div>

                                                <div className="mt-3 space-y-2">
                                                    <label className="text-sm font-medium text-gray-700">Description</label>
                                                    <Textarea
                                                        value={item.description}
                                                        onChange={(e) => handleItemChange(i, "description", e.target.value)}
                                                        placeholder="Enter item description"
                                                        rows={2}
                                                    />
                                                </div>

                                                <div className="mt-3 text-right">
                                                    <span className="text-sm text-gray-600">
                                                        Subtotal: <span className="font-semibold">KES {(item.quantity * item.unit_price).toFixed(2)}</span>
                                                    </span>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>

                                <div className="flex justify-between items-center mt-4">
                                    <Button onClick={addItem} className="flex items-center gap-2">
                                        <PlusCircleIcon className="w-4 h-4" /> Add Item
                                    </Button>
                                    <div className="text-right">
                                        <span className="text-lg font-bold text-gray-800">
                                            Total: KES {calculateTotal().toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <DrawerFooter className="border-t bg-white sticky bottom-0 z-10 flex justify-end gap-2 py-4 px-4 sm:px-6">
                        <DrawerClose asChild><Button variant="outline">Cancel</Button></DrawerClose>
                        <Button onClick={handleSubmit} className="text-white">Submit Requisition</Button>
                    </DrawerFooter>
                </DrawerContent>
            </Drawer>

            {/* Filter Modal */}
            <Drawer open={openFilterModal} onOpenChange={setOpenFilterModal} direction={drawerDirection}>
                <DrawerContent className={`
            md:max-w-[500px] w-full h-[90vh] md:h-screen
            md:right-0 md:left-auto md:rounded-l-2xl
            flex flex-col overflow-hidden bg-white
          `}>
                    <DrawerHeader className="border-b bg-white sticky top-0 z-10 p-4">
                        <DrawerTitle className="text-lg font-semibold text-gray-800">Filter Requisitions</DrawerTitle>
                        <DrawerDescription className="text-sm text-gray-500">
                            Filter by status, category, or date range
                        </DrawerDescription>
                    </DrawerHeader>

                    <div className="p-6 space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Status</label>
                            <Select value={filterStatus} onValueChange={setFilterStatus}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="approved">Approved</SelectItem>
                                    <SelectItem value="rejected">Rejected</SelectItem>
                                    <SelectItem value="paid">Paid</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Category</label>
                            <Select value={filterCategory} onValueChange={setFilterCategory}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Category" />
                                </SelectTrigger>
                                <SelectContent>
                                    {categories?.map((cat: any) => (
                                        <SelectItem key={cat.id} value={String(cat.id)}>
                                            {cat.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Date Range</label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className={cn(
                                            "w-full justify-start text-left font-normal",
                                            !dateRange.from && !dateRange.to && "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {dateRange.from ? (
                                            dateRange.to ? (
                                                <>
                                                    {format(dateRange.from, "LLL dd, y")} -{" "}
                                                    {format(dateRange.to, "LLL dd, y")}
                                                </>
                                            ) : (
                                                format(dateRange.from, "LLL dd, y")
                                            )
                                        ) : (
                                            <span>Pick a date range</span>
                                        )}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        initialFocus
                                        mode="range"
                                        defaultMonth={dateRange.from}
                                        selected={{ from: dateRange.from, to: dateRange.to }}
                                        onSelect={(range) => setDateRange({ from: range?.from, to: range?.to })}
                                        numberOfMonths={2}
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>

                    <DrawerFooter className="border-t flex justify-between gap-2 bg-white p-4">
                        <Button
                            variant="outline"
                            onClick={clearFilters}
                            disabled={!hasActiveFilters}
                        >
                            Clear All
                        </Button>
                        <div className="flex gap-2">
                            <DrawerClose asChild>
                                <Button variant="outline">Cancel</Button>
                            </DrawerClose>
                            <Button
                                onClick={applyFilters}
                                className="text-white"
                            >
                                Apply Filters
                            </Button>
                        </div>
                    </DrawerFooter>
                </DrawerContent>
            </Drawer>
        </AppLayout>
    );
}