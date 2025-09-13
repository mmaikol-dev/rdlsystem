"use client"

import AppLayout from '@/layouts/app-layout'
import { type BreadcrumbItem } from '@/types'
import { Head, usePage } from '@inertiajs/react'
import { TrendingUp } from "lucide-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis, Pie, PieChart, Label, Line, LineChart } from "recharts"
import * as React from "react"

// ---------------- Breadcrumbs ----------------
const breadcrumbs: BreadcrumbItem[] = [
  { title: 'Dashboard', href: '/dashboard' },
]

// ---------------- Chart Configs ----------------
const chartConfigVertical = {
  total: { label: "Total Orders", color: "var(--chart-1)" },
} satisfies ChartConfig

const chartConfigHorizontal = {
  orders: { label: "Orders", color: "var(--chart-2)" },
} satisfies ChartConfig

const chartConfigDonut = {
  visitors: { label: "Visitors" },
  chrome: { label: "Chrome", color: "var(--chart-1)" },
  safari: { label: "Safari", color: "var(--chart-2)" },
  firefox: { label: "Firefox", color: "var(--chart-3)" },
  edge: { label: "Edge", color: "var(--chart-4)" },
  other: { label: "Other", color: "var(--chart-5)" },
} satisfies ChartConfig

const chartDataDonut = [
  { browser: "chrome", visitors: 275, fill: "var(--color-chrome)" },
  { browser: "safari", visitors: 200, fill: "var(--color-safari)" },
  { browser: "firefox", visitors: 287, fill: "var(--color-firefox)" },
  { browser: "edge", visitors: 173, fill: "var(--color-edge)" },
  { browser: "other", visitors: 190, fill: "var(--color-other)" },
]

export default function Dashboard() {
  const { ordersPerMonth, merchantStats, statusSummary, merchantMonthly } = usePage<{
    ordersPerMonth: { month: string, total: number }[],
    merchantStats: { merchant: string, total_orders: number, total_quantity: number, total_sales: number }[],
    statusSummary: { status: string, totalOrders: number, totalAmount: number }[],
    merchantMonthly: Record<string, { month: string, total_orders: number }[]>
  }>().props

  const merchants = Object.keys(merchantMonthly)

  const totalVisitors = React.useMemo(() => {
    return chartDataDonut.reduce((acc, curr) => acc + curr.visitors, 0)
  }, [])

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="Dashboard" />
      <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4 overflow-x-auto">
        {/* Welcome message */}
        <div className="text-2xl font-semibold mb-4">
          👋 Welcome, Michael Mutiso!
        </div>

        {/* Top Row: Orders (Bar + Line) + Donut Chart */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Orders Per Month (Bar Chart) */}
          <Card>
            <CardHeader>
              <CardTitle>Orders Per Month (Bar)</CardTitle>
              <CardDescription>Total orders for all months</CardDescription>
            </CardHeader>
            <CardContent className="h-50 md:h-50">
              <ChartContainer config={chartConfigVertical} className="w-full h-full">
                <BarChart data={ordersPerMonth} className="h-full w-full" margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
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
                      const date = new Date(value + "-01")
                      return date.toLocaleDateString("en-US", { month: "short", year: "numeric" })
                    }}
                  />
                  <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                  <Bar dataKey="total" fill="url(#fillTotal)" radius={8}>
                    <LabelList position="top" offset={12} className="fill-foreground" fontSize={12} />
                  </Bar>
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Orders Per Month (Line Chart) */}
          <Card>
            <CardHeader>
              <CardTitle>Orders Per Month (Line)</CardTitle>
              <CardDescription>Trend over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfigVertical}>
                <LineChart data={ordersPerMonth} margin={{ top: 20, left: 12, right: 12 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="month"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tickFormatter={(value) => {
                      const date = new Date(value + "-01")
                      return date.toLocaleDateString("en-US", { month: "short", year: "numeric" })
                    }}
                  />
                  <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
                  <Line
                    type="natural"
                    dataKey="total"
                    stroke="var(--chart-1)"
                    strokeWidth={2}
                    dot={{ fill: "var(--chart-1)" }}
                    activeDot={{ r: 6 }}
                  >
                    <LabelList position="top" offset={12} className="fill-foreground" fontSize={12} />
                  </Line>
                </LineChart>
              </ChartContainer>
            </CardContent>
            <CardFooter className="flex-col items-start gap-2 text-sm">
              <div className="flex gap-2 leading-none font-medium">
                Trending up by 5.2% this month <TrendingUp className="h-4 w-4" />
              </div>
              <div className="text-muted-foreground leading-none">
                Showing monthly orders trend
              </div>
            </CardFooter>
          </Card>

          {/* Donut Chart */}
          <Card className="flex flex-col">
            <CardHeader className="items-center pb-0">
              <CardTitle>Pie Chart - Donut with Text</CardTitle>
              <CardDescription>January - June 2024</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 pb-0">
              <ChartContainer config={chartConfigDonut} className="mx-auto aspect-square max-h-[250px]">
                <PieChart>
                  <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                  <Pie data={chartDataDonut} dataKey="visitors" nameKey="browser" innerRadius={60} strokeWidth={5}>
                    <Label
                      content={({ viewBox }) => {
                        if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                          return (
                            <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                              <tspan x={viewBox.cx} y={viewBox.cy} className="fill-foreground text-3xl font-bold">
                                {totalVisitors.toLocaleString()}
                              </tspan>
                              <tspan x={viewBox.cx} y={(viewBox.cy || 0) + 24} className="fill-muted-foreground">
                                Visitors
                              </tspan>
                            </text>
                          )
                        }
                      }}
                    />
                  </Pie>
                </PieChart>
              </ChartContainer>
            </CardContent>
            <CardFooter className="flex-col gap-2 text-sm">
              <div className="flex items-center gap-2 leading-none font-medium">
                Trending up by 5.2% this month <TrendingUp className="h-4 w-4" />
              </div>
              <div className="text-muted-foreground leading-none">
                Showing total visitors for the last 6 months
              </div>
            </CardFooter>
          </Card>
        </div>

        {/* Merchant-Specific Charts */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {merchants.map((merchant, index) => (
            <Card key={merchant}>
              <CardHeader>
                <CardTitle>{merchant}</CardTitle>
                <CardDescription>Monthly Orders</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfigHorizontal}>
                  <BarChart data={merchantMonthly[merchant]} layout="vertical" margin={{ left: -20 }}>
                    <XAxis type="number" dataKey="total_orders" hide />
                    <YAxis
                      dataKey="month"
                      type="category"
                      tickLine={false}
                      tickMargin={10}
                      axisLine={false}
                      tickFormatter={(value) => {
                        const date = new Date(value + "-01")
                        return date.toLocaleDateString("en-US", { month: "short" })
                      }}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="total_orders" fill={`var(--chart-${(index % 6) + 2})`} radius={5} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
              <CardFooter className="flex gap-2 text-sm text-muted-foreground">
                <TrendingUp className="h-4 w-4" /> Orders trend for {merchant}
              </CardFooter>
            </Card>
          ))}
        </div>

        {/* Status Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          {statusSummary.map((status) => (
            <Card key={status.status} className="border-none shadow-md hover:shadow-lg transition-all">
              <CardHeader>
                <CardTitle>{status.status}</CardTitle>
                <CardDescription>Orders: {status.totalOrders}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-semibold">
                  {Number(status.totalAmount).toLocaleString("en-KE", { style: "currency", currency: "KES" })}
                </div>
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
