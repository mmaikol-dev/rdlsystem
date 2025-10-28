"use client"

import AppLayout from '@/layouts/app-layout'
import { Head, usePage } from '@inertiajs/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Bar, BarChart, CartesianGrid, XAxis, LabelList, ResponsiveContainer } from "recharts"
import { TrendingUp, Package, Barcode, Truck, Layers } from "lucide-react"
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartConfig } from "@/components/ui/chart"

interface DashboardProps {
  userName: string
  summary: {
    totalProducts: number
    totalBarcodes: number
    totalTransfers: number
    totalStock: number
  }
  transfersByRegion: { region: string, total: number }[]
  scansByOperation: { operation_type: string, total: number }[]
  recentScans: {
    id: number
    product_name: string
    barcode: string
    operation_type: string
    scanned_by: string
    scanned_at: string
  }[]
}

export default function WarehouseDashboard() {
  const { userName, summary, transfersByRegion, scansByOperation, recentScans } = usePage<DashboardProps>().props

  const chartConfig = {
    total: { label: "Total", color: "var(--chart-1)" },
  } satisfies ChartConfig

  return (
    <AppLayout breadcrumbs={[{ title: "Warehouse Dashboard", href: "/waredash" }]}>
      <Head title="Warehouse Dashboard" />
      <div className="flex flex-col gap-6 p-6">

        {/* Welcome Section */}
        <div>
          <h1 className="text-3xl font-bold mb-2">👋 Welcome, {userName}!</h1>
          <p className="text-muted-foreground">Here’s an overview of warehouse operations today.</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard title="Total Products" value={summary.totalProducts} icon={<Package className="h-5 w-5" />} />
          <SummaryCard title="Total Barcodes" value={summary.totalBarcodes} icon={<Barcode className="h-5 w-5" />} />
          <SummaryCard title="Total Transfers" value={summary.totalTransfers} icon={<Truck className="h-5 w-5" />} />
          <SummaryCard title="Stock Quantity" value={summary.totalStock} icon={<Layers className="h-5 w-5" />} />
        </div>

        {/* Charts Section */}
        <div className="grid md:grid-cols-2 gap-4">
          <ChartCard title="Transfers by Region" data={transfersByRegion} xKey="region" />
          <ChartCard title="Scans by Operation Type" data={scansByOperation} xKey="operation_type" />
        </div>

        {/* Recent Activity Table */}
        <Card className="shadow-md border-none">
          <CardHeader>
            <CardTitle>Recent Scans</CardTitle>
            <CardDescription>Last 10 barcode scans</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left py-2 px-3">Barcode</th>
                  <th className="text-left py-2 px-3">Product</th>
                  <th className="text-left py-2 px-3">Operation</th>
                  <th className="text-left py-2 px-3">Scanned By</th>
                  <th className="text-left py-2 px-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {recentScans.map(scan => (
                  <tr key={scan.id} className="border-b hover:bg-muted/40">
                    <td className="py-2 px-3">{scan.barcode}</td>
                    <td className="py-2 px-3">{scan.product_name}</td>
                    <td className="py-2 px-3 font-medium">{scan.operation_type}</td>
                    <td className="py-2 px-3">{scan.scanned_by}</td>
                    <td className="py-2 px-3">{new Date(scan.scanned_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}

/* ---------------- Reusable Components ---------------- */

function SummaryCard({ title, value, icon }: { title: string, value: number, icon: React.ReactNode }) {
  return (
    <Card className="border-none shadow-md hover:shadow-lg transition-all">
      <CardHeader className="flex flex-row justify-between items-center">
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
        <div className="text-primary">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value.toLocaleString()}</div>
      </CardContent>
      <CardFooter className="text-sm text-muted-foreground">
        <TrendingUp className="h-4 w-4 mr-1" /> Updated recently
      </CardFooter>
    </Card>
  )
}

function ChartCard({ title, data, xKey }: { title: string, data: any[], xKey: string }) {
  return (
    <Card className="shadow-md border-none">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="h-[300px]">
        {data.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            No data available
          </div>
        ) : (
          <ChartContainer config={{ total: { label: "Total", color: "var(--chart-1)" } }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                <defs>
                  <linearGradient id={`fill-${xKey}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} />
                <XAxis dataKey={xKey} tickLine={false} axisLine={false} tickMargin={8} />
                <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                <Bar dataKey="total" fill={`url(#fill-${xKey})`} radius={8}>
                  <LabelList position="top" className="fill-foreground text-xs" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
