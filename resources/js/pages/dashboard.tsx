"use client"

import AppLayout from '@/layouts/app-layout'
import { type BreadcrumbItem } from '@/types'
import { Head, usePage } from '@inertiajs/react'
import { TrendingUp } from "lucide-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Bar, BarChart, CartesianGrid, LabelList, XAxis } from "recharts"

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
]

export default function Dashboard() {
    const { chartData, statusSummary, userName } = usePage<{
        chartData: { month: string, total: number }[],
        statusSummary: { status: string, totalOrders: number, totalAmount: number }[],
        userName: string
    }>().props

    console.log("Chart Data:", chartData)
    console.log("Status Summary:", statusSummary)

    const chartConfig = {
        total: { label: "Total Orders", color: "var(--chart-1)" },
    } satisfies ChartConfig

    const dataForChart = chartData.map(item => ({
        month: item.month,
        total: item.total,
    }))

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard" />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4 overflow-x-auto">
                {/* Welcome message */}
                <div className="text-2xl font-semibold mb-4">
                👋 Welcome, {userName}!
                </div>

                {/* Orders Per Month Chart */}
                <div className="grid auto-rows-min gap-4 md:grid-cols-1">
                    <Card>
                        <CardHeader>
                            <CardTitle>Orders Per Month</CardTitle>
                            <CardDescription>Total orders for all months</CardDescription>
                        </CardHeader>
                        <CardContent className="h-50 md:h-50">
                            <ChartContainer config={chartConfig} className="w-full h-full">
                                <BarChart
                                    data={dataForChart}
                                    className="h-full w-full"
                                    margin={{ top: 20, right: 20, bottom: 20, left: 0 }}
                                >
                                    <defs>
                                        <linearGradient id="fillTotal" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0.1} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid vertical={false} />
                                    <XAxis
                                        dataKey="month"
                                        tickLine={false}
                                        axisLine={false}
                                        tickMargin={8}
                                        tickFormatter={(value) => {
                                            // Format like "Jan 2025"
                                            const date = new Date(value + "-01")
                                            return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                                        }}
                                    />
                                    <ChartTooltip
                                        cursor={false}
                                        content={<ChartTooltipContent hideLabel />}
                                    />
                                    <Bar dataKey="total" fill="url(#fillTotal)" radius={8}>
                                        <LabelList position="top" offset={12} className="fill-foreground" fontSize={12} />
                                    </Bar>
                                </BarChart>
                            </ChartContainer>
                        </CardContent>
                    </Card>
                </div>

                {/* Status Summary Filter */}
                <div className="flex gap-2 my-2">
                    {['Last 30 Days', 'Last 7 Days', 'Today', 'This Month'].map(period => (
                        <button
                            key={period}
                            className="px-3 py-1 rounded bg-none text-black-foreground hover:opacity-90 transition"
                        >
                            {period}
                        </button>
                    ))}
                </div>

                {/* Status Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    {statusSummary.map((status) => (
                        <Card key={status.status} className="border-none shadow-md hover:shadow-lg transition-all">
                            <CardHeader>
                                <CardTitle>{status.status}</CardTitle>
                                <CardDescription>Orders: {status.totalOrders}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="text-xl font-semibold">Ksh {status.totalAmount.toLocaleString('en-US', { style: 'currency', currency: 'KES' })}</div>
                            </CardContent>
                            <CardFooter className="flex gap-2 text-sm text-muted-foreground">
                                <TrendingUp className="h-4 w-4" /> Compared to last period
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            </div>
        </AppLayout>
    )
}
