import AppLayout from '@/layouts/app-layout'
import { type BreadcrumbItem } from '@/types'
import { Head, router } from '@inertiajs/react'
import {
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Package,
  Filter,
  X,
  Calendar,
  User,
  Store,
  BarChart3,
  PieChart,
  LineChart,
  MapPin,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  Award
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  BarChart,
  Bar,
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  Legend,
  PieChart as RechartsPieChart,
  Pie,
  Cell
} from "recharts"
import { useState } from 'react'

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#f43f5e', '#14b8a6']

const breadcrumbs: BreadcrumbItem[] = [
  { title: 'Statistics Dashboard', href: '/stats' },
]

export default function StatsDashboard({
  summary,
  ordersByStatus,
  agentPerformance,
  ordersByMerchant,
  dailyTrend,
  topProducts,
  ordersByCountry,
  ordersByCity,
  recentOrders,
  filterOptions,
  filters
}) {
  const [showFilters, setShowFilters] = useState(false)

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value || undefined }

    Object.keys(newFilters).forEach(k => {
      if (newFilters[k] === undefined || newFilters[k] === '') {
        delete newFilters[k]
      }
    })

    router.get('/stats', newFilters, {
      preserveState: true,
      preserveScroll: true,
      only: ['summary', 'ordersByStatus', 'agentPerformance', 'ordersByMerchant', 'dailyTrend', 'topProducts', 'ordersByCountry', 'ordersByCity', 'recentOrders', 'filters']
    })
  }

  const clearFilter = (key) => {
    handleFilterChange(key, null)
  }

  const clearAllFilters = () => {
    router.get('/stats', {}, {
      preserveState: true,
      preserveScroll: true
    })
  }

  const activeFiltersCount = Object.entries(filters).filter(([key, value]) => value && value !== 'all_time').length

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="Statistics Dashboard" />

      <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4 overflow-x-auto">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Orders Analytics Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Showing {summary.totalOrders.toLocaleString()} orders across all merchants
            </p>
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-all shadow-md"
          >
            <Filter className="h-4 w-4" />
            Filters
            {activeFiltersCount > 0 && (
              <span className="bg-primary-foreground text-primary text-xs px-2 py-0.5 rounded-full font-semibold">{activeFiltersCount}</span>
            )}
          </button>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <Card className="border shadow-md">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Filter Options
                </CardTitle>
                <button onClick={() => setShowFilters(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-5 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Date Range
                  </label>
                  <select
                    value={filters.date_range || 'all_time'}
                    onChange={(e) => handleFilterChange('date_range', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
                  >
                    <option value="all_time">All Time</option>
                    <option value="today">Today</option>
                    <option value="yesterday">Yesterday</option>
                    <option value="this_week">This Week</option>
                    <option value="last_week">Last Week</option>
                    <option value="this_month">This Month</option>
                    <option value="last_month">Last Month</option>
                    <option value="this_year">This Year</option>
                    <option value="last_30_days">Last 30 Days</option>
                    <option value="last_90_days">Last 90 Days</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Agent (CC Email)
                  </label>
                  <select
                    value={filters.cc_email || ''}
                    onChange={(e) => handleFilterChange('cc_email', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
                  >
                    <option value="">All Agents ({filterOptions.ccEmails.length})</option>
                    {filterOptions.ccEmails.map(email => (
                      <option key={email} value={email}>{email}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                    <Store className="h-4 w-4" />
                    Merchant
                  </label>
                  <select
                    value={filters.merchant || ''}
                    onChange={(e) => handleFilterChange('merchant', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
                  >
                    <option value="">All Merchants ({filterOptions.merchants.length})</option>
                    {filterOptions.merchants.map(merchant => (
                      <option key={merchant} value={merchant}>{merchant}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Status
                  </label>
                  <select
                    value={filters.status || ''}
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
                  >
                    <option value="">All Statuses ({filterOptions.statuses.length})</option>
                    {filterOptions.statuses.map(status => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Country
                  </label>
                  <select
                    value={filters.country || ''}
                    onChange={(e) => handleFilterChange('country', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
                  >
                    <option value="">All Countries ({filterOptions.countries.length})</option>
                    {filterOptions.countries.map(country => (
                      <option key={country} value={country}>{country}</option>
                    ))}
                  </select>
                </div>
              </div>

              {activeFiltersCount > 0 && (
                <div className="mt-4 pt-4 border-t flex items-center justify-between">
                  <div className="flex flex-wrap gap-2">
                    {filters.date_range && filters.date_range !== 'all_time' && (
                      <FilterBadge label="Date" value={filters.date_range.replace(/_/g, ' ')} onClear={() => clearFilter('date_range')} />
                    )}
                    {filters.cc_email && (
                      <FilterBadge label="Agent" value={filters.cc_email} onClear={() => clearFilter('cc_email')} />
                    )}
                    {filters.merchant && (
                      <FilterBadge label="Merchant" value={filters.merchant} onClear={() => clearFilter('merchant')} />
                    )}
                    {filters.status && (
                      <FilterBadge label="Status" value={filters.status} onClear={() => clearFilter('status')} />
                    )}
                    {filters.country && (
                      <FilterBadge label="Country" value={filters.country} onClear={() => clearFilter('country')} />
                    )}
                  </div>
                  <button
                    onClick={clearAllFilters}
                    className="text-sm text-destructive hover:opacity-80 font-medium flex items-center gap-1"
                  >
                    <X className="h-4 w-4" />
                    Clear All
                  </button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Total Orders"
            value={summary.totalOrders.toLocaleString()}
            icon={<ShoppingCart className="h-6 w-6" />}
            color="blue"
          />
          <MetricCard
            title="Total Revenue"
            value={`Ksh ${Number(summary.totalRevenue).toLocaleString()}`}
            icon={<DollarSign className="h-6 w-6" />}
            color="green"
          />
          <MetricCard
            title="Avg Order Value"
            value={`Ksh ${Number(summary.averageOrderValue || 0).toFixed(2)}`}
            icon={<TrendingUp className="h-6 w-6" />}
            color="purple"
          />
          <MetricCard
            title="Total Items"
            value={summary.totalQuantity.toLocaleString()}
            icon={<Package className="h-6 w-6" />}
            color="orange"
          />
        </div>

        {/* Agent Performance Section */}
        <Card className="border-none shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Call Center Agent Performance
            </CardTitle>
            <CardDescription>Performance metrics for all call center agents</CardDescription>
          </CardHeader>
          <CardContent>
            {agentPerformance.length === 0 ? (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No agent data available
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      <th className="text-left py-3 px-4 font-semibold">Agent</th>
                      <th className="text-right py-3 px-4 font-semibold">Total Orders</th>
                      <th className="text-right py-3 px-4 font-semibold">
                        <div className="flex items-center justify-end gap-1">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          Delivered
                        </div>
                      </th>
                      <th className="text-right py-3 px-4 font-semibold">
                        <div className="flex items-center justify-end gap-1">
                          <Clock className="h-4 w-4 text-yellow-600" />
                          Pending
                        </div>
                      </th>
                      <th className="text-right py-3 px-4 font-semibold">
                        <div className="flex items-center justify-end gap-1">
                          <XCircle className="h-4 w-4 text-red-600" />
                          Cancelled
                        </div>
                      </th>
                      <th className="text-right py-3 px-4 font-semibold">Delivery Rate</th>
                      <th className="text-right py-3 px-4 font-semibold">Total Revenue</th>
                      <th className="text-right py-3 px-4 font-semibold">Avg Order</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {agentPerformance.map((agent, idx) => (
                      <tr key={idx} className="hover:bg-muted/50 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            {idx < 3 && <Award className="h-4 w-4 text-yellow-500" />}
                            <span className="font-medium">{agent.cc_email}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right font-semibold">{agent.total_orders}</td>
                        <td className="py-3 px-4 text-right text-green-600 font-medium">{agent.delivered_orders}</td>
                        <td className="py-3 px-4 text-right text-yellow-600 font-medium">{agent.pending_orders}</td>
                        <td className="py-3 px-4 text-right text-red-600 font-medium">{agent.cancelled_orders}</td>
                        <td className="py-3 px-4 text-right">
                          <div className="inline-flex items-center gap-2">
                            <div className="w-16 bg-muted rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${agent.delivery_rate >= 80 ? 'bg-green-500' : agent.delivery_rate >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                style={{ width: `${agent.delivery_rate}%` }}
                              />
                            </div>
                            <span className="font-semibold">{agent.delivery_rate}%</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-green-600">
                          Ksh {Number(agent.total_revenue).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right text-muted-foreground">
                          Ksh {Number(agent.avg_order_value).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Charts Row 1 */}
        <div className="grid lg:grid-cols-2 gap-4">
          <Card className="border-none shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LineChart className="h-5 w-5" />
                Daily Trend
              </CardTitle>
              <CardDescription>Order trends over time</CardDescription>
            </CardHeader>
            <CardContent>
              {dailyTrend.length === 0 ? (
                <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                  No data available
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsLineChart data={dailyTrend}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      style={{ fontSize: '12px' }}
                    />
                    <YAxis yAxisId="left" style={{ fontSize: '12px' }} />
                    <YAxis yAxisId="right" orientation="right" style={{ fontSize: '12px' }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                      labelFormatter={(date) => new Date(date).toLocaleDateString()}
                    />
                    <Legend />
                    <Line yAxisId="left" type="monotone" dataKey="orders" stroke="#3b82f6" strokeWidth={2} name="Orders" />
                    <Line yAxisId="left" type="monotone" dataKey="delivered" stroke="#10b981" strokeWidth={2} name="Delivered" />
                    <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="#8b5cf6" strokeWidth={2} name="Revenue" />
                  </RechartsLineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card className="border-none shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5" />
                Orders by Status
              </CardTitle>
              <CardDescription>Status distribution</CardDescription>
            </CardHeader>
            <CardContent>
              {ordersByStatus.length === 0 ? (
                <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                  No data available
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPieChart>
                    <Pie
                      data={ordersByStatus}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ status, percentage }) => `${status}: ${percentage}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="total"
                    >
                      {ordersByStatus.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RechartsPieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 2 */}
        <div className="grid lg:grid-cols-2 gap-4">
          <Card className="border-none shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Store className="h-5 w-5" />
                Orders by Merchant ({ordersByMerchant.length} total)
              </CardTitle>
              <CardDescription>Order distribution by merchant</CardDescription>
            </CardHeader>
            <CardContent>
              {ordersByMerchant.length === 0 ? (
                <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                  No data available
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={ordersByMerchant}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="merchant" style={{ fontSize: '11px' }} angle={-45} textAnchor="end" height={100} />
                    <YAxis style={{ fontSize: '12px' }} />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                    <Bar dataKey="total" fill="hsl(var(--primary))" radius={4} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card className="border-none shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Orders by Country
              </CardTitle>
              <CardDescription>Geographic distribution</CardDescription>
            </CardHeader>
            <CardContent>
              {ordersByCountry.length === 0 ? (
                <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                  No data available
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={ordersByCountry}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="country" style={{ fontSize: '12px' }} />
                    <YAxis style={{ fontSize: '12px' }} />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                    <Bar dataKey="total" fill="#10b981" radius={4} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Top Products */}
        <Card className="border-none shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Top Products
            </CardTitle>
            <CardDescription>Best selling products</CardDescription>
          </CardHeader>
          <CardContent>
            {topProducts.length === 0 ? (
              <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                No data available
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      <th className="text-left py-3 px-4 font-semibold">Product</th>
                      <th className="text-right py-3 px-4 font-semibold">Orders</th>
                      <th className="text-right py-3 px-4 font-semibold">Quantity</th>
                      <th className="text-right py-3 px-4 font-semibold">Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {topProducts.map((product, idx) => (
                      <tr key={idx} className="hover:bg-muted/50">
                        <td className="py-3 px-4 font-medium">{product.product_name}</td>
                        <td className="py-3 px-4 text-right">{product.total}</td>
                        <td className="py-3 px-4 text-right">{product.quantity}</td>
                        <td className="py-3 px-4 text-right font-semibold text-green-600">
                          Ksh {Number(product.revenue).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Orders */}
        <Card className="border-none shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Recent Orders
            </CardTitle>
            <CardDescription>Latest order activity</CardDescription>
          </CardHeader>
          <CardContent>
            {recentOrders.length === 0 ? (
              <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                No data available
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      <th className="text-left py-3 px-4 font-semibold">Order No</th>
                      <th className="text-left py-3 px-4 font-semibold">Client</th>
                      <th className="text-left py-3 px-4 font-semibold">Product</th>
                      <th className="text-left py-3 px-4 font-semibold">Agent</th>
                      <th className="text-left py-3 px-4 font-semibold">Merchant</th>
                      <th className="text-left py-3 px-4 font-semibold">Status</th>
                      <th className="text-right py-3 px-4 font-semibold">Qty</th>
                      <th className="text-right py-3 px-4 font-semibold">Amount</th>
                      <th className="text-left py-3 px-4 font-semibold">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {recentOrders.map((order) => (
                      <tr key={order.id} className="hover:bg-muted/50">
                        <td className="py-3 px-4 font-medium text-primary">{order.order_no}</td>
                        <td className="py-3 px-4">{order.client_name}</td>
                        <td className="py-3 px-4 text-muted-foreground">{order.product_name}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-1 bg-primary/10 text-primary rounded text-xs font-medium">
                            {order.cc_email}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">{order.merchant}</td>
                        <td className="py-3 px-4">
                          <StatusBadge status={order.status} />
                        </td>
                        <td className="py-3 px-4 text-right">{order.quantity}</td>
                        <td className="py-3 px-4 text-right font-semibold">Ksh {order.amount}</td>
                        <td className="py-3 px-4 text-muted-foreground text-xs">
                          {new Date(order.order_date).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}

function MetricCard({ title, value, icon, color }) {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    purple: 'from-purple-500 to-purple-600',
    orange: 'from-orange-500 to-orange-600'
  }

  return (
    <Card className="border-none shadow-md hover:shadow-lg transition-all">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm text-muted-foreground font-medium mb-2">{title}</p>
            <p className="text-3xl font-bold">{value}</p>
          </div>
          <div className={`bg-gradient-to-br ${colorClasses[color]} p-3 rounded-lg text-white shadow-lg`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function FilterBadge({ label, value, onClear }) {
  return (
    <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1 rounded-full text-sm">
      <span className="font-medium">{label}:</span>
      <span className="capitalize">{value}</span>
      <button onClick={onClear} className="hover:bg-primary/20 rounded-full p-0.5 transition-colors">
        <X className="h-3 w-3" />
      </button>
    </div>
  )
}

function StatusBadge({ status }) {
  const styles = {
    Completed: 'bg-green-100 text-green-700 border-green-200',
    Delivered: 'bg-green-100 text-green-700 border-green-200',
    Pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    Processing: 'bg-blue-100 text-blue-700 border-blue-200',
    Cancelled: 'bg-red-100 text-red-700 border-red-200',
    Canceled: 'bg-red-100 text-red-700 border-red-200'
  }

  return (
    <span className={`px-2 py-1 rounded border text-xs font-semibold ${styles[status] || 'bg-muted text-muted-foreground border-border'}`}>
      {status}
    </span>
  )
}