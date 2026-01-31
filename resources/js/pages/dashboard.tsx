"use client"

import AppLayout from '@/layouts/app-layout'
import { type BreadcrumbItem } from '@/types'
import { Head, usePage } from '@inertiajs/react'
import {
    TrendingUp,
    TrendingDown,
    Package,
    PackageCheck,
    Clock,
    XCircle,
    ArrowUpRight,
    ArrowDownRight,
    CalendarDays,
    Filter,
    Download,
    BarChart3,
    Activity,
    DollarSign,
    ShoppingCart,
    Wallet,
    Target,
    Users,
    ChevronLeft,
    ChevronRight,
    AlertCircle,
    CheckCircle,
    RefreshCw,
    MapPin,
    Globe,
    UserCheck,
    TrendingUpIcon,
    Award,
    Truck
} from "lucide-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartConfig, ChartContainer, ChartTooltip } from "@/components/ui/chart"
import { CartesianGrid, XAxis, YAxis, Area, AreaChart, Bar, BarChart, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { useState, useMemo } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
]

type FilterPeriod = 'today' | 'last7Days' | 'last30Days' | 'thisMonth' | 'allTime'

interface PageProps {
    chartData: { month: string, total: number, revenue: number }[]
    statusSummary: { status: string, totalOrders: number, totalAmount: number }[]
    userName: string
    userRole: string
    metrics: {
        totalOrders: number
        totalRevenue: number
        avgOrderValue: number
        totalCustomers: number
        pendingOrders: number
        completionRate: number
        cancellationRate: number
        deliveryRate: number
    }
    growth: {
        orders: number
        revenue: number
        currentMonth: { orders: number, revenue: number }
        previousMonth: { orders: number, revenue: number }
    }
    timeStats: {
        today: { orders: number, revenue: number }
        last7Days: { orders: number, revenue: number }
        last30Days: { orders: number, revenue: number }
    }
    topProducts?: Array<{
        product_name: string
        order_count: number
        total_quantity: number
        total_revenue: number
    }>
    topAgents?: Array<{
        agent: string
        order_count: number
        total_revenue: number
    }>
    recentOrders?: Array<{
        id: number
        order_date: string
        order_no: string
        client_name: string
        product_name: string
        quantity: number
        status: string
        amount: number
        agent: string
    }>
    countryDistribution?: Array<{
        country: string
        order_count: number
        total_revenue: number
    }>
    cityDistribution?: Array<{
        city: string
        order_count: number
        total_revenue: number
    }>
    orderTypeDistribution?: Array<{
        order_type: string
        order_count: number
        total_revenue: number
    }>
    deliveryStats?: {
        totalWithDelivery: number
        delivered: number
        pendingDelivery: number
        deliveryRate: number
    }
}

export default function Dashboard() {
    const {
        chartData,
        statusSummary,
        userName,
        userRole,
        metrics,
        growth,
        timeStats,
        topProducts = [],
        topAgents = [],
        recentOrders = [],
        countryDistribution = [],
        cityDistribution = [],
        orderTypeDistribution = [],
        deliveryStats
    } = usePage<PageProps>().props

    const [selectedFilter, setSelectedFilter] = useState<FilterPeriod>('last30Days')
    const [chartType, setChartType] = useState<'orders' | 'revenue'>('orders')
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 6

    // Get filtered data based on selected period
    const filteredMetrics = useMemo(() => {
        switch (selectedFilter) {
            case 'today':
                return timeStats.today
            case 'last7Days':
                return timeStats.last7Days
            case 'last30Days':
                return timeStats.last30Days
            case 'thisMonth':
                return growth.currentMonth
            case 'allTime':
            default:
                return {
                    orders: metrics.totalOrders,
                    revenue: metrics.totalRevenue
                }
        }
    }, [selectedFilter, timeStats, growth, metrics])

    // Format currency
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-KE', {
            style: 'currency',
            currency: 'KES',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount)
    }

    // Calculate pagination for status summary
    const paginatedStatusSummary = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage
        const endIndex = startIndex + itemsPerPage
        return statusSummary.slice(startIndex, endIndex)
    }, [statusSummary, currentPage])

    const totalPages = Math.ceil(statusSummary.length / itemsPerPage)

    // Prepare chart data
    const dataForChart = useMemo(() => {
        if (!chartData || !Array.isArray(chartData)) return []
        return chartData.map(item => ({
            month: item.month?.substring(0, 3) || 'N/A',
            orders: Number(item.total) || 0,
            revenue: Number(item.revenue) || 0,
        }))
    }, [chartData])

    const chartConfig = {
        orders: {
            label: "Total Orders",
            color: "hsl(220 70% 50%)",
        },
        revenue: {
            label: "Revenue",
            color: "hsl(142 76% 36%)",
        }
    } satisfies ChartConfig

    // Status configurations
    const statusConfig: Record<string, { icon: any, color: string, bgColor: string, label: string }> = {
        'Pending': { icon: Clock, color: 'text-orange-600', bgColor: 'bg-orange-50 border-orange-200', label: 'Pending' },
        'Processing': { icon: Package, color: 'text-blue-600', bgColor: 'bg-blue-50 border-blue-200', label: 'Processing' },
        'Completed': { icon: PackageCheck, color: 'text-green-600', bgColor: 'bg-green-50 border-green-200', label: 'Completed' },
        'Cancelled': { icon: XCircle, color: 'text-red-600', bgColor: 'bg-red-50 border-red-200', label: 'Cancelled' },
        'Shipped': { icon: Truck, color: 'text-indigo-600', bgColor: 'bg-indigo-50 border-indigo-200', label: 'Shipped' },
        'Delivered': { icon: PackageCheck, color: 'text-emerald-600', bgColor: 'bg-emerald-50 border-emerald-200', label: 'Delivered' },
        'Returned': { icon: ArrowDownRight, color: 'text-amber-600', bgColor: 'bg-amber-50 border-amber-200', label: 'Returned' },
        'Refunded': { icon: DollarSign, color: 'text-rose-600', bgColor: 'bg-rose-50 border-rose-200', label: 'Refunded' },
        'On Hold': { icon: Clock, color: 'text-slate-600', bgColor: 'bg-slate-50 border-slate-200', label: 'On Hold' },
        'Failed': { icon: XCircle, color: 'text-red-700', bgColor: 'bg-red-50 border-red-200', label: 'Failed' }
    }

    // Get color for status progress bars
    const getStatusColor = (status: string) => {
        const colorMap: Record<string, string> = {
            'Completed': 'bg-green-500',
            'Delivered': 'bg-green-500',
            'Processing': 'bg-blue-500',
            'Shipped': 'bg-blue-500',
            'Pending': 'bg-orange-500',
            'On Hold': 'bg-orange-500',
            'Cancelled': 'bg-red-500',
            'Failed': 'bg-red-500',
            'Returned': 'bg-amber-500',
            'Refunded': 'bg-amber-500',
        }
        return colorMap[status] || 'bg-slate-500'
    }

    // Colors for pie chart
    const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard" />

            <style jsx global>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
                
                * {
                    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
                }
                
                .metric-card {
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                }
                
                .metric-card:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 8px 16px -4px rgba(0,0,0,0.1);
                }
                
                .fade-in {
                    animation: fadeIn 0.5s ease-out forwards;
                    opacity: 0;
                }
                
                @keyframes fadeIn {
                    from {
                        opacity: 0;
                        transform: translateY(10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
            `}</style>

            <div className="flex h-full flex-1 flex-col gap-6 p-6 bg-slate-50/50">
                {/* Header Section */}
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 mb-1">
                            Welcome back, {userName}! 👋
                        </h1>
                        <p className="text-slate-600 flex items-center gap-2">
                            <CalendarDays className="h-4 w-4" />
                            <span>
                                {userRole === 'merchant' ? 'Your merchant dashboard' : 'Complete business overview'}
                            </span>
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <Button variant="outline" size="sm" className="gap-2">
                            <Download className="h-4 w-4" />
                            Export
                        </Button>
                        <Button size="sm" className="gap-2 bg-blue-600 hover:bg-blue-700">
                            <BarChart3 className="h-4 w-4" />
                            Generate Report
                        </Button>
                    </div>
                </div>

                {/* Filter Section */}
                <Card className="bg-white border-slate-200">
                    <CardContent className="pt-6">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-2">
                                <Filter className="h-4 w-4 text-slate-600" />
                                <span className="text-sm font-semibold text-slate-700">Time Period:</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {([
                                    { key: 'today', label: 'Today' },
                                    { key: 'last7Days', label: 'Last 7 Days' },
                                    { key: 'last30Days', label: 'Last 30 Days' },
                                    { key: 'thisMonth', label: 'This Month' },
                                    { key: 'allTime', label: 'All Time' },
                                ] as { key: FilterPeriod, label: string }[]).map(period => (
                                    <Button
                                        key={period.key}
                                        variant={selectedFilter === period.key ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => setSelectedFilter(period.key)}
                                        className={selectedFilter === period.key ? "bg-blue-600 hover:bg-blue-700" : ""}
                                    >
                                        {period.label}
                                    </Button>
                                ))}
                            </div>
                        </div>

                        {/* Display current filter stats */}
                        <div className="mt-4 pt-4 border-t flex items-center justify-between">
                            <div className="flex items-center gap-6">
                                <div>
                                    <p className="text-xs text-slate-500 mb-1">Orders</p>
                                    <p className="text-2xl font-bold text-slate-900">
                                        {filteredMetrics.orders.toLocaleString()}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 mb-1">Revenue</p>
                                    <p className="text-2xl font-bold text-green-600">
                                        {formatCurrency(filteredMetrics.revenue)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Key Metrics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Total Revenue Card */}
                    <Card className="fade-in metric-card border-l-4 border-l-blue-500">
                        <CardHeader className="pb-2">
                            <CardDescription className="flex items-center justify-between">
                                <span className="text-xs font-medium text-slate-600">Total Revenue</span>
                                <div className="p-2 rounded-lg bg-blue-100">
                                    <DollarSign className="h-4 w-4 text-blue-600" />
                                </div>
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-baseline gap-2">
                                <p className="text-2xl font-bold text-slate-900">
                                    {formatCurrency(metrics.totalRevenue)}
                                </p>
                                <Badge
                                    variant="secondary"
                                    className={`gap-1 ${growth.revenue >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'} hover:bg-transparent`}
                                >
                                    {growth.revenue >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                                    {Math.abs(growth.revenue).toFixed(1)}%
                                </Badge>
                            </div>
                            <p className="text-xs text-slate-500 mt-2">From {metrics.totalOrders.toLocaleString()} orders</p>
                        </CardContent>
                    </Card>

                    {/* Total Orders Card */}
                    <Card className="fade-in metric-card border-l-4 border-l-green-500">
                        <CardHeader className="pb-2">
                            <CardDescription className="flex items-center justify-between">
                                <span className="text-xs font-medium text-slate-600">Total Orders</span>
                                <div className="p-2 rounded-lg bg-green-100">
                                    <ShoppingCart className="h-4 w-4 text-green-600" />
                                </div>
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-baseline gap-2">
                                <p className="text-2xl font-bold text-slate-900">
                                    {metrics.totalOrders.toLocaleString()}
                                </p>
                                <Badge
                                    variant="secondary"
                                    className={`gap-1 ${growth.orders >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'} hover:bg-transparent`}
                                >
                                    {growth.orders >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                                    {Math.abs(growth.orders).toFixed(1)}%
                                </Badge>
                            </div>
                            <p className="text-xs text-slate-500 mt-2">
                                {growth.orders >= 0 ? '+' : ''}{(growth.currentMonth.orders - growth.previousMonth.orders)} from last month
                            </p>
                        </CardContent>
                    </Card>

                    {/* Average Order Value Card */}
                    <Card className="fade-in metric-card border-l-4 border-l-purple-500">
                        <CardHeader className="pb-2">
                            <CardDescription className="flex items-center justify-between">
                                <span className="text-xs font-medium text-slate-600">Avg Order Value</span>
                                <div className="p-2 rounded-lg bg-purple-100">
                                    <Wallet className="h-4 w-4 text-purple-600" />
                                </div>
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-baseline gap-2">
                                <p className="text-2xl font-bold text-slate-900">
                                    {formatCurrency(metrics.avgOrderValue)}
                                </p>
                            </div>
                            <p className="text-xs text-slate-500 mt-2">Per order average</p>
                        </CardContent>
                    </Card>

                    {/* Total Customers Card */}
                    <Card className="fade-in metric-card border-l-4 border-l-orange-500">
                        <CardHeader className="pb-2">
                            <CardDescription className="flex items-center justify-between">
                                <span className="text-xs font-medium text-slate-600">Total Customers</span>
                                <div className="p-2 rounded-lg bg-orange-100">
                                    <Users className="h-4 w-4 text-orange-600" />
                                </div>
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-baseline gap-2">
                                <p className="text-2xl font-bold text-slate-900">
                                    {metrics.totalCustomers.toLocaleString()}
                                </p>
                            </div>
                            <p className="text-xs text-slate-500 mt-2">Unique customers</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Main Chart Section */}
                <Card className="border-slate-200">
                    <CardHeader>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <CardTitle className="text-xl">Performance Overview</CardTitle>
                                <CardDescription className="mt-1">
                                    Monthly trends for the last 12 months
                                </CardDescription>
                            </div>
                            <div className="flex items-center gap-2">
                                <Tabs
                                    defaultValue="orders"
                                    className="w-full sm:w-auto"
                                    onValueChange={(value) => setChartType(value as 'orders' | 'revenue')}
                                >
                                    <TabsList className="grid w-full sm:w-auto grid-cols-2">
                                        <TabsTrigger value="orders" className="flex items-center gap-2">
                                            <ShoppingCart className="h-3 w-3" />
                                            Orders
                                        </TabsTrigger>
                                        <TabsTrigger value="revenue" className="flex items-center gap-2">
                                            <DollarSign className="h-3 w-3" />
                                            Revenue
                                        </TabsTrigger>
                                    </TabsList>
                                </Tabs>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <ChartContainer
                            config={chartConfig}
                            className="w-full h-[350px]"
                        >
                            <AreaChart
                                data={dataForChart}
                                margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
                            >
                                <defs>
                                    <linearGradient
                                        id={`color${chartType}`}
                                        x1="0"
                                        y1="0"
                                        x2="0"
                                        y2="1"
                                    >
                                        <stop
                                            offset="5%"
                                            stopColor={chartType === 'orders' ? "hsl(220 70% 50%)" : "hsl(142 76% 36%)"}
                                            stopOpacity={0.3}
                                        />
                                        <stop
                                            offset="95%"
                                            stopColor={chartType === 'orders' ? "hsl(220 70% 50%)" : "hsl(142 76% 36%)"}
                                            stopOpacity={0.05}
                                        />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    stroke="#e2e8f0"
                                    vertical={false}
                                />
                                <XAxis
                                    dataKey="month"
                                    tickLine={false}
                                    axisLine={false}
                                    tick={{ fill: '#64748b', fontSize: 12 }}
                                    tickMargin={10}
                                />
                                <YAxis
                                    tickLine={false}
                                    axisLine={false}
                                    tick={{ fill: '#64748b', fontSize: 12 }}
                                    tickFormatter={(value) => {
                                        if (chartType === 'revenue') {
                                            return `${(value / 1000).toFixed(0)}k`
                                        }
                                        return value.toString()
                                    }}
                                />
                                <ChartTooltip
                                    content={({ active, payload }) => {
                                        if (active && payload && payload.length) {
                                            const data = payload[0].payload
                                            return (
                                                <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 min-w-[180px]">
                                                    <p className="text-xs font-semibold text-slate-600 mb-2">
                                                        {data.month}
                                                    </p>
                                                    <div className="space-y-1">
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-xs text-slate-500">Orders:</span>
                                                            <span className="text-sm font-bold text-slate-900">
                                                                {data.orders.toLocaleString()}
                                                            </span>
                                                        </div>
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-xs text-slate-500">Revenue:</span>
                                                            <span className="text-sm font-bold text-green-600">
                                                                {formatCurrency(data.revenue)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        }
                                        return null
                                    }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey={chartType === 'orders' ? 'orders' : 'revenue'}
                                    stroke={chartType === 'orders' ? "hsl(220 70% 50%)" : "hsl(142 76% 36%)"}
                                    strokeWidth={3}
                                    fill={`url(#color${chartType})`}
                                    dot={{
                                        fill: chartType === 'orders' ? "hsl(220 70% 50%)" : "hsl(142 76% 36%)",
                                        strokeWidth: 2,
                                        r: 4
                                    }}
                                    activeDot={{
                                        r: 6,
                                        strokeWidth: 2,
                                        fill: chartType === 'orders' ? "hsl(220 70% 50%)" : "hsl(142 76% 36%)"
                                    }}
                                />
                            </AreaChart>
                        </ChartContainer>
                    </CardContent>
                </Card>

                {/* Top Products and Agents Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Top Products */}
                    {topProducts.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-xl flex items-center gap-2">
                                    <Award className="h-5 w-5 text-blue-600" />
                                    Top Products
                                </CardTitle>
                                <CardDescription>Best selling products by quantity</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {topProducts.slice(0, 5).map((product, index) => (
                                        <div key={product.product_name} className="flex items-center gap-3">
                                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                                                <span className="text-sm font-bold text-blue-600">#{index + 1}</span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold text-slate-900 truncate">
                                                    {product.product_name}
                                                </p>
                                                <p className="text-xs text-slate-500">
                                                    {product.total_quantity} units • {product.order_count} orders
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-bold text-slate-900">
                                                    {formatCurrency(product.total_revenue)}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Top Agents */}
                    {topAgents.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-xl flex items-center gap-2">
                                    <UserCheck className="h-5 w-5 text-green-600" />
                                    Top Agents
                                </CardTitle>
                                <CardDescription>Best performing sales agents</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {topAgents.slice(0, 5).map((agent, index) => (
                                        <div key={agent.agent} className="flex items-center gap-3">
                                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                                                <span className="text-sm font-bold text-green-600">#{index + 1}</span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold text-slate-900 truncate">
                                                    {agent.agent}
                                                </p>
                                                <p className="text-xs text-slate-500">
                                                    {agent.order_count} orders completed
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-bold text-slate-900">
                                                    {formatCurrency(agent.total_revenue)}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Geographic Distribution Section */}
                {(countryDistribution.length > 0 || cityDistribution.length > 0) && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Country Distribution */}
                        {countryDistribution.length > 0 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-xl flex items-center gap-2">
                                        <Globe className="h-5 w-5 text-purple-600" />
                                        Orders by Country
                                    </CardTitle>
                                    <CardDescription>Geographic distribution</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        {countryDistribution.slice(0, 5).map((country) => {
                                            const percentage = metrics.totalOrders > 0 ?
                                                (country.order_count / metrics.totalOrders * 100).toFixed(1) : '0.0'
                                            return (
                                                <div key={country.country}>
                                                    <div className="flex justify-between items-center mb-1">
                                                        <span className="text-sm font-medium text-slate-700">{country.country}</span>
                                                        <span className="text-xs text-slate-500">{country.order_count} orders ({percentage}%)</span>
                                                    </div>
                                                    <Progress value={Number(percentage)} className="h-2" />
                                                </div>
                                            )
                                        })}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* City Distribution */}
                        {cityDistribution.length > 0 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-xl flex items-center gap-2">
                                        <MapPin className="h-5 w-5 text-orange-600" />
                                        Orders by City
                                    </CardTitle>
                                    <CardDescription>Top cities</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        {cityDistribution.slice(0, 5).map((city) => {
                                            const percentage = metrics.totalOrders > 0 ?
                                                (city.order_count / metrics.totalOrders * 100).toFixed(1) : '0.0'
                                            return (
                                                <div key={city.city}>
                                                    <div className="flex justify-between items-center mb-1">
                                                        <span className="text-sm font-medium text-slate-700">{city.city}</span>
                                                        <span className="text-xs text-slate-500">{city.order_count} orders ({percentage}%)</span>
                                                    </div>
                                                    <Progress value={Number(percentage)} className="h-2" />
                                                </div>
                                            )
                                        })}
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                )}

                {/* Bottom Section: Status Distribution and Quick Stats */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Order Status Distribution */}
                    <Card className="lg:col-span-2">
                        <CardHeader>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div>
                                    <CardTitle className="text-xl">Order Status Distribution</CardTitle>
                                    <CardDescription>
                                        Showing {paginatedStatusSummary.length} of {statusSummary.length} statuses
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-6">
                                {paginatedStatusSummary.map((status) => {
                                    const config = statusConfig[status.status] || {
                                        icon: Package,
                                        color: 'text-slate-600',
                                        bgColor: 'bg-slate-50 border-slate-200',
                                        label: status.status
                                    }

                                    const Icon = config.icon
                                    const percentage = metrics.totalOrders > 0 ?
                                        (status.totalOrders / metrics.totalOrders * 100).toFixed(1) : '0.0'
                                    const avgValue = status.totalOrders > 0 ?
                                        status.totalAmount / status.totalOrders : 0

                                    return (
                                        <div key={status.status} className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className={`p-2 rounded-lg ${config.bgColor}`}>
                                                        <Icon className={`h-4 w-4 ${config.color}`} />
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-sm text-slate-900">{config.label}</p>
                                                        <p className="text-xs text-slate-500">
                                                            {status.totalOrders.toLocaleString()} orders • {percentage}%
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-bold text-sm text-slate-900">
                                                        {formatCurrency(status.totalAmount)}
                                                    </p>
                                                    <p className="text-xs text-slate-500">
                                                        Avg: {formatCurrency(avgValue)}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full transition-all duration-500 ${getStatusColor(status.status)}`}
                                                    style={{ width: `${percentage}%` }}
                                                />
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </CardContent>
                        {totalPages > 1 && (
                            <CardFooter className="border-t pt-4">
                                <div className="flex items-center justify-between w-full">
                                    <div className="text-sm text-slate-600">
                                        Page {currentPage} of {totalPages}
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                            disabled={currentPage === 1}
                                        >
                                            <ChevronLeft className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                            disabled={currentPage === totalPages}
                                        >
                                            <ChevronRight className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </CardFooter>
                        )}
                    </Card>

                    {/* Quick Stats Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-xl">Quick Stats</CardTitle>
                            <CardDescription>Key performance indicators</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                                    <div className="flex items-center gap-2">
                                        <CheckCircle className="h-4 w-4 text-green-600" />
                                        <span className="text-sm font-medium text-slate-700">Completion Rate</span>
                                    </div>
                                    <span className="font-bold text-green-600">{metrics.completionRate}%</span>
                                </div>

                                <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                                    <div className="flex items-center gap-2">
                                        <Clock className="h-4 w-4 text-orange-600" />
                                        <span className="text-sm font-medium text-slate-700">Pending Orders</span>
                                    </div>
                                    <span className="font-bold text-orange-600">{metrics.pendingOrders}</span>
                                </div>

                                <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                                    <div className="flex items-center gap-2">
                                        <AlertCircle className="h-4 w-4 text-red-600" />
                                        <span className="text-sm font-medium text-slate-700">Cancellation Rate</span>
                                    </div>
                                    <span className="font-bold text-red-600">{metrics.cancellationRate}%</span>
                                </div>

                                {deliveryStats && (
                                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                                        <div className="flex items-center gap-2">
                                            <Truck className="h-4 w-4 text-blue-600" />
                                            <span className="text-sm font-medium text-slate-700">Delivery Rate</span>
                                        </div>
                                        <span className="font-bold text-blue-600">{deliveryStats.deliveryRate}%</span>
                                    </div>
                                )}
                            </div>

                            <div className="pt-4 border-t">
                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                    <Activity className="h-3 w-3" />
                                    <span>Last updated: Just now</span>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button variant="outline" className="w-full gap-2">
                                <RefreshCw className="h-4 w-4" />
                                Refresh Data
                            </Button>
                        </CardFooter>
                    </Card>
                </div>

                {/* Recent Orders Table */}
                {recentOrders.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-xl">Recent Orders</CardTitle>
                            <CardDescription>Latest 10 orders</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Order #</TableHead>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Customer</TableHead>
                                            <TableHead>Product</TableHead>
                                            <TableHead>Qty</TableHead>
                                            <TableHead>Agent</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="text-right">Amount</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {recentOrders.map((order) => (
                                            <TableRow key={order.id}>
                                                <TableCell className="font-medium">{order.order_no || `#${order.id}`}</TableCell>
                                                <TableCell className="text-sm text-slate-600">
                                                    {new Date(order.order_date).toLocaleDateString()}
                                                </TableCell>
                                                <TableCell className="text-sm">{order.client_name || 'N/A'}</TableCell>
                                                <TableCell className="text-sm max-w-[150px] truncate">{order.product_name || 'N/A'}</TableCell>
                                                <TableCell className="text-sm">{order.quantity || 0}</TableCell>
                                                <TableCell className="text-sm">{order.agent || 'N/A'}</TableCell>
                                                <TableCell>
                                                    <Badge
                                                        variant="outline"
                                                        className={statusConfig[order.status]?.bgColor || 'bg-slate-50'}
                                                    >
                                                        {order.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right font-semibold">
                                                    {formatCurrency(order.amount)}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </AppLayout>
    )
}