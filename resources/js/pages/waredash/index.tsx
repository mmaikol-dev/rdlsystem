"use client"

import AppLayout from '@/layouts/app-layout'
import { Head, usePage } from '@inertiajs/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Bar, BarChart, CartesianGrid, XAxis, LabelList, ResponsiveContainer } from "recharts"
import {
  TrendingUp, Package, Barcode, Truck, Layers, AlertTriangle, AlertOctagon,
  CircleCheck, Boxes
} from "lucide-react"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Badge } from "@/components/ui/badge"

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
  recentScans: any[]
  depletedProducts: any[]
  nearDepletedProducts: any[]
}

export default function WarehouseDashboard() {
  const {
    userName, summary, transfersByRegion, scansByOperation, recentScans,
    depletedProducts, nearDepletedProducts
  } = usePage<DashboardProps>().props

  return (
    <AppLayout breadcrumbs={[{ title: "Warehouse Dashboard", href: "/waredash" }]}>
      <Head title="Warehouse Dashboard" />
      <div className="flex flex-col gap-6 p-6">

        {/* Welcome */}
        <div>
          <h1 className="text-3xl font-bold mb-1">ðŸ‘‹ Welcome, {userName}!</h1>
          <p className="text-muted-foreground">Your real-time overview of warehouse inventory & activity.</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard title="Total Products" value={summary.totalProducts} icon={<Package />} />
          <SummaryCard title="Total Barcodes" value={summary.totalBarcodes} icon={<Barcode />} />
          <SummaryCard title="Total Transfers" value={summary.totalTransfers} icon={<Truck />} />
          <SummaryCard title="Stock Quantity" value={summary.totalStock} icon={<Layers />} />
        </div>

        {/* Stock Alerts */}
        <div className="grid md:grid-cols-2 gap-4">
          <StockAlertCard
            title="Depleted Products (0 Stock)"
            icon={<AlertOctagon className="text-red-600" />}
            products={depletedProducts}
            badgeColor="destructive"
            emptyText="No depleted items ðŸŽ‰"
          />

          <StockAlertCard
            title="Near Depletion"
            icon={<AlertTriangle className="text-yellow-500" />}
            products={nearDepletedProducts}
            badgeColor="warning"
            emptyText="All stock levels stable"
          />
        </div>

        {/* Charts */}
        <div className="grid md:grid-cols-2 gap-4">
          <ChartCard title="Transfers by Region" data={transfersByRegion} xKey="region" />
          <ChartCard title="Scans by Operation Type" data={scansByOperation} xKey="operation_type" />
        </div>

        {/* Recent Scans */}
        <Card className="shadow-md border-none">
          <CardHeader>
            <CardTitle className="flex gap-2 items-center">
              <Boxes className="h-5 w-5 text-primary" />
              Recent Scans
            </CardTitle>
            <CardDescription>Last 10 barcode scans</CardDescription>
          </CardHeader>

          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
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
                  <tr key={scan.id} className="border-b hover:bg-muted/30 transition">
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

/* ---------------- Components ---------------- */

function SummaryCard({ title, value, icon }: any) {
  return (
    <Card className="border-none shadow-md hover:shadow-lg transition">
      <CardHeader className="flex flex-row justify-between items-center">
        <CardTitle className="text-lg">{title}</CardTitle>
        <div className="text-primary">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{value.toLocaleString()}</div>
      </CardContent>
      <CardFooter className="text-sm text-muted-foreground flex items-center">
        <TrendingUp className="h-4 w-4 mr-1" /> Updated
      </CardFooter>
    </Card>
  )
}

function StockAlertCard({ title, icon, products, badgeColor, emptyText }: any) {
  return (
    <Card className="shadow-md border-none">
      <CardHeader className="flex flex-row items-center gap-2">{icon}<CardTitle>{title}</CardTitle></CardHeader>
      <CardContent className="max-h-[260px] overflow-auto">
        {products.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-8">{emptyText}</p>
        ) : (
          <ul className="space-y-3">
            {products.map((p: any) => (
              <li key={p.id} className="flex justify-between border-b pb-1">
                <span className="font-medium">{p.name}</span>
                <Badge variant={badgeColor}>{p.quantity} pcs left</Badge>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

function ChartCard({ title, data, xKey }: any) {
  return (
    <Card className="shadow-md border-none">
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent className="h-[300px]">
        {data.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">No data available</div>
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
                  <LabelList position="top" className="text-xs" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
