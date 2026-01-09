"use client";

import AppLayout from '@/layouts/app-layout';
import { Head, usePage, router } from '@inertiajs/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { BreadcrumbItem } from '@/components/ui/breadcrumb'; // adjust the path

import { Separator } from '@/components/ui/separator';
import {
    RefreshCcw,
    Hash,
    FileSpreadsheet,
    Clock,
    Search,
    Layers
} from 'lucide-react';
import * as React from 'react';

interface SheetOrder {
    id: number;
    order_no: string;
    sheet_id: string;
    sheet_name: string;
    merchant: string;
    status: string;
    updated_at: string;
}

export default function PendingUpdates() {
    const { props } = usePage();
    const { updates, filters } = props as unknown as {
        updates: SheetOrder[];
        filters: { search?: string };
    };

    const BREADCRUMBS: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Pending Sheet Updates', href: '/updates' },
    ];


    const [search, setSearch] = React.useState(filters?.search || '');

    const filtered = updates.filter(o =>
        o.order_no.toLowerCase().includes(search.toLowerCase()) ||
        o.merchant?.toLowerCase().includes(search.toLowerCase()) ||
        o.sheet_name?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <AppLayout breadcrumbs={BREADCRUMBS}>
            <Head title="Pending Sheet Updates" />

            <div className="space-y-6 p-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Pending Sheet Updates</h1>
                        <p className="text-muted-foreground">
                            Orders waiting to be pushed by the UpdateSheetOrders command
                        </p>
                    </div>

                    <Button
                        onClick={() =>
                            router.post('/sheet-updates/run', {}, {
                                onSuccess: () => {
                                    router.reload({ only: ['sheets'] })
                                }
                            })
                        }
                    >
                        <RefreshCcw className="h-4 w-4" />
                        Run Update Command
                    </Button>
                </div>

                {/* Search */}
                <Card>
                    <CardContent className="p-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Search by order no, merchant, or sheet"
                                className="pl-9"
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Layers className="h-4 w-4" />
                                Pending Orders
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="text-2xl font-bold">{updates.length}</CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FileSpreadsheet className="h-4 w-4" />
                                Affected Sheets
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="text-2xl font-bold">
                            {new Set(updates.map(o => o.sheet_id)).size}
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Clock className="h-4 w-4" />
                                Oldest Update
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm">
                            {updates[0]?.updated_at ?? '—'}
                        </CardContent>
                    </Card>
                </div>

                {/* Pending List */}
                <Card>
                    <CardHeader>
                        <CardTitle>Pending Orders</CardTitle>
                        <CardDescription>
                            These records will be picked up automatically by the cron command
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {filtered.length === 0 && (
                            <div className="text-center py-12 text-muted-foreground">
                                No pending updates found
                            </div>
                        )}

                        {filtered.map(order => (
                            <div
                                key={order.id}
                                className="rounded-lg border p-4 hover:bg-muted/40 transition"
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2 font-medium">
                                            <Hash className="h-4 w-4 text-muted-foreground" />
                                            {order.order_no}
                                        </div>
                                        <div className="text-sm text-muted-foreground">
                                            {order.sheet_name} · {order.merchant}
                                        </div>
                                    </div>

                                    <Badge variant="outline">Pending</Badge>
                                </div>

                                <Separator className="my-3" />

                                <div className="flex justify-between text-xs text-muted-foreground">
                                    <span>Sheet ID: {order.sheet_id}</span>
                                    <span>Updated at: {order.updated_at}</span>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
