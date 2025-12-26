<?php

namespace App\Http\Controllers;

use App\Models\SheetOrder;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class StatsController extends Controller
{
    public function index(Request $request)
    {
        // Get filter parameters
        $dateRange = $request->get('date_range', 'all_time');
        $ccEmail = $request->get('cc_email');
        $merchant = $request->get('merchant');
        $status = $request->get('status');
        $country = $request->get('country');

        // Build base query - NO date filter by default
        $query = SheetOrder::query();

        // Apply date range filter ONLY if not all_time
        if ($dateRange !== 'all_time') {
            $dates = $this->getDateRange($dateRange);
            $query->whereBetween('order_date', [$dates['start'], $dates['end']]);
        }

        // Apply other filters
        if ($ccEmail) {
            $query->where('cc_email', $ccEmail);
        }
        if ($merchant) {
            $query->where('merchant', $merchant);
        }
        if ($status) {
            $query->where('status', $status);
        }
        if ($country) {
            $query->where('country', $country);
        }

        // Get summary statistics
        $totalOrders = (clone $query)->count();
        $totalRevenue = (clone $query)->sum('amount') ?? 0;
        $totalQuantity = (clone $query)->sum('quantity') ?? 0;

        $summary = [
            'totalOrders' => $totalOrders,
            'totalRevenue' => round($totalRevenue, 2),
            'averageOrderValue' => $totalOrders > 0 ? round($totalRevenue / $totalOrders, 2) : 0,
            'totalQuantity' => $totalQuantity,
        ];

        // Orders by status with percentage
        $ordersByStatus = (clone $query)
            ->select('status', DB::raw('count(*) as total'), DB::raw('sum(amount) as revenue'))
            ->groupBy('status')
            ->get()
            ->map(fn ($item) => [
                'status' => $item->status ?? 'Unknown',
                'total' => (int) $item->total,
                'revenue' => round($item->revenue ?? 0, 2),
                'percentage' => $totalOrders > 0 ? round(($item->total / $totalOrders) * 100, 1) : 0,
            ])
            ->sortByDesc('total')
            ->values();

        // Call Center Agent Performance (CC Email)
        $agentPerformance = (clone $query)
            ->select(
                'cc_email',
                DB::raw('count(*) as total_orders'),
                DB::raw('sum(amount) as total_revenue'),
                DB::raw('sum(case when LOWER(status) IN ("delivered", "completed") then 1 else 0 end) as delivered_orders'),
                DB::raw('sum(case when LOWER(status) IN ("cancelled", "canceled") then 1 else 0 end) as cancelled_orders'),
                DB::raw('sum(case when LOWER(status) = "pending" then 1 else 0 end) as pending_orders'),
                DB::raw('sum(case when LOWER(status) = "scheduled" then 1 else 0 end) as scheduled_orders'),
                DB::raw('avg(amount) as avg_order_value')
            )
            ->whereNotNull('cc_email')
            ->where('cc_email', '!=', '')
            ->groupBy('cc_email')
            ->orderByDesc('total_orders')
            ->limit(20)
            ->get()
            ->map(function ($agent) {
                $deliveryRate = $agent->total_orders > 0
                    ? round(($agent->delivered_orders / $agent->total_orders) * 100, 1)
                    : 0;

                $scheduleRate = $agent->total_orders > 0
                    ? round(($agent->scheduled_orders / $agent->total_orders) * 100, 1)
                    : 0;

                return [
                    'cc_email' => $agent->cc_email,
                    'total_orders' => (int) $agent->total_orders,
                    'total_revenue' => round($agent->total_revenue ?? 0, 2),
                    'delivered_orders' => (int) $agent->delivered_orders,
                    'cancelled_orders' => (int) $agent->cancelled_orders,
                    'pending_orders' => (int) $agent->pending_orders,
                    'scheduled_orders' => (int) $agent->scheduled_orders,
                    'avg_order_value' => round($agent->avg_order_value ?? 0, 2),
                    'delivery_rate' => $deliveryRate,
                    'schedule_rate' => $scheduleRate,
                ];
            });

        // Overdue Scheduled Orders by Agent
        $now = Carbon::now();
        $overdueScheduled = SheetOrder::query()
            ->select(
                'cc_email',
                'merchant',
                'order_no',
                'client_name',
                'delivery_date',
                DB::raw('DATEDIFF(NOW(), delivery_date) as days_overdue')
            )
            ->whereNotNull('cc_email')
            ->where('cc_email', '!=', '')
            ->whereNotNull('delivery_date')
            ->where('delivery_date', '<', $now)
            ->where(function ($q) {
                $q->where('status', 'scheduled')
                    ->orWhereRaw('LOWER(status) = "scheduled"');
            })
            ->orderBy('days_overdue', 'desc')
            ->get()
            ->map(fn ($order) => [
                'cc_email' => $order->cc_email,
                'merchant' => $order->merchant,
                'order_no' => $order->order_no,
                'client_name' => $order->client_name,
                'delivery_date' => $order->delivery_date,
                'days_overdue' => (int) $order->days_overdue,
            ]);

        // Overdue Scheduled Summary by Agent
        $overdueScheduledSummary = SheetOrder::query()
            ->select(
                'cc_email',
                DB::raw('count(*) as overdue_count'),
                DB::raw('AVG(DATEDIFF(NOW(), delivery_date)) as avg_days_overdue')
            )
            ->whereNotNull('cc_email')
            ->where('cc_email', '!=', '')
            ->whereNotNull('delivery_date')
            ->where('delivery_date', '<', $now)
            ->where(function ($q) {
                $q->where('status', 'scheduled')
                    ->orWhereRaw('LOWER(status) = "scheduled"');
            })
            ->groupBy('cc_email')
            ->orderByDesc('overdue_count')
            ->get()
            ->map(fn ($item) => [
                'cc_email' => $item->cc_email,
                'overdue_count' => (int) $item->overdue_count,
                'avg_days_overdue' => round($item->avg_days_overdue ?? 0, 1),
            ]);

        // Overdue Pending Orders (2+ days old)
        $overduePending = SheetOrder::query()
            ->select(
                'cc_email',
                'merchant',
                'order_no',
                'client_name',
                'order_date',
                DB::raw('DATEDIFF(NOW(), order_date) as days_pending')
            )
            ->whereNotNull('cc_email')
            ->where('cc_email', '!=', '')
            ->where(function ($q) {
                $q->where('status', 'pending')
                    ->orWhereRaw('LOWER(status) = "pending"');
            })
            ->whereRaw('DATEDIFF(NOW(), order_date) >= 2')
            ->orderBy('days_pending', 'desc')
            ->get()
            ->map(fn ($order) => [
                'cc_email' => $order->cc_email,
                'merchant' => $order->merchant,
                'order_no' => $order->order_no,
                'client_name' => $order->client_name,
                'order_date' => $order->order_date,
                'days_pending' => (int) $order->days_pending,
            ]);

        // Overdue Pending Summary by Agent
        $overduePendingSummary = SheetOrder::query()
            ->select(
                'cc_email',
                DB::raw('count(*) as overdue_count'),
                DB::raw('AVG(DATEDIFF(NOW(), order_date)) as avg_days_pending')
            )
            ->whereNotNull('cc_email')
            ->where('cc_email', '!=', '')
            ->where(function ($q) {
                $q->where('status', 'pending')
                    ->orWhereRaw('LOWER(status) = "pending"');
            })
            ->whereRaw('DATEDIFF(NOW(), order_date) >= 2')
            ->groupBy('cc_email')
            ->orderByDesc('overdue_count')
            ->get()
            ->map(fn ($item) => [
                'cc_email' => $item->cc_email,
                'overdue_count' => (int) $item->overdue_count,
                'avg_days_pending' => round($item->avg_days_pending ?? 0, 1),
            ]);

        // Orders by merchant - GET ALL MERCHANTS
        $ordersByMerchant = (clone $query)
            ->select('merchant', DB::raw('count(*) as total'), DB::raw('sum(amount) as revenue'))
            ->whereNotNull('merchant')
            ->where('merchant', '!=', '')
            ->groupBy('merchant')
            ->orderByDesc('total')
            ->get()
            ->map(fn ($item) => [
                'merchant' => $item->merchant,
                'total' => (int) $item->total,
                'revenue' => round($item->revenue ?? 0, 2),
            ]);

        // Daily trend (last 30 days OR filtered date range)
        $trendQuery = SheetOrder::query();
        if ($dateRange !== 'all_time') {
            $dates = $this->getDateRange($dateRange);
            $trendQuery->whereBetween('order_date', [$dates['start'], $dates['end']]);
        } else {
            $trendQuery->where('order_date', '>=', Carbon::now()->subDays(30));
        }

        $dailyTrend = $trendQuery
            ->select(
                DB::raw('DATE(order_date) as date'),
                DB::raw('count(*) as orders'),
                DB::raw('sum(amount) as revenue'),
                DB::raw('sum(case when LOWER(status) IN ("delivered", "completed") then 1 else 0 end) as delivered')
            )
            ->groupBy('date')
            ->orderBy('date')
            ->get()
            ->map(fn ($item) => [
                'date' => $item->date,
                'orders' => (int) $item->orders,
                'revenue' => round($item->revenue ?? 0, 2),
                'delivered' => (int) $item->delivered,
            ]);

        // Top products
        $topProducts = (clone $query)
            ->select(
                'product_name',
                DB::raw('count(*) as total'),
                DB::raw('sum(quantity) as quantity'),
                DB::raw('sum(amount) as revenue')
            )
            ->whereNotNull('product_name')
            ->where('product_name', '!=', '')
            ->groupBy('product_name')
            ->orderByDesc('total')
            ->limit(10)
            ->get()
            ->map(fn ($item) => [
                'product_name' => $item->product_name,
                'total' => (int) $item->total,
                'quantity' => (int) $item->quantity,
                'revenue' => round($item->revenue ?? 0, 2),
            ]);

        // Orders by country
        $ordersByCountry = (clone $query)
            ->select('country', DB::raw('count(*) as total'), DB::raw('sum(amount) as revenue'))
            ->whereNotNull('country')
            ->where('country', '!=', '')
            ->groupBy('country')
            ->orderByDesc('total')
            ->limit(10)
            ->get()
            ->map(fn ($item) => [
                'country' => $item->country,
                'total' => (int) $item->total,
                'revenue' => round($item->revenue ?? 0, 2),
            ]);

        // Orders by city
        $ordersByCity = (clone $query)
            ->select('city', DB::raw('count(*) as total'))
            ->whereNotNull('city')
            ->where('city', '!=', '')
            ->groupBy('city')
            ->orderByDesc('total')
            ->limit(10)
            ->get()
            ->map(fn ($item) => [
                'city' => $item->city,
                'total' => (int) $item->total,
            ]);

        // Get filter options - ALL available values
        $filterOptions = [
            'ccEmails' => SheetOrder::select('cc_email')
                ->distinct()
                ->whereNotNull('cc_email')
                ->where('cc_email', '!=', '')
                ->orderBy('cc_email')
                ->pluck('cc_email'),
            'merchants' => SheetOrder::select('merchant')
                ->distinct()
                ->whereNotNull('merchant')
                ->where('merchant', '!=', '')
                ->orderBy('merchant')
                ->pluck('merchant'),
            'statuses' => SheetOrder::select('status')
                ->distinct()
                ->whereNotNull('status')
                ->where('status', '!=', '')
                ->orderBy('status')
                ->pluck('status'),
            'countries' => SheetOrder::select('country')
                ->distinct()
                ->whereNotNull('country')
                ->where('country', '!=', '')
                ->orderBy('country')
                ->pluck('country'),
        ];

        // Recent orders
        $recentOrders = (clone $query)
            ->orderBy('order_date', 'desc')
            ->limit(20)
            ->get()
            ->map(fn ($order) => [
                'id' => $order->id,
                'order_no' => $order->order_no,
                'order_date' => $order->order_date,
                'client_name' => $order->client_name,
                'amount' => round($order->amount ?? 0, 2),
                'quantity' => $order->quantity,
                'status' => $order->status,
                'cc_email' => $order->cc_email,
                'merchant' => $order->merchant,
                'product_name' => $order->product_name,
                'country' => $order->country,
                'city' => $order->city,
            ]);

        return inertia('stats/index', [
            'summary' => $summary,
            'ordersByStatus' => $ordersByStatus,
            'agentPerformance' => $agentPerformance,
            'overdueScheduled' => $overdueScheduled,
            'overdueScheduledSummary' => $overdueScheduledSummary,
            'overduePending' => $overduePending,
            'overduePendingSummary' => $overduePendingSummary,
            'ordersByMerchant' => $ordersByMerchant,
            'dailyTrend' => $dailyTrend,
            'topProducts' => $topProducts,
            'ordersByCountry' => $ordersByCountry,
            'ordersByCity' => $ordersByCity,
            'recentOrders' => $recentOrders,
            'filterOptions' => $filterOptions,
            'filters' => [
                'date_range' => $dateRange,
                'cc_email' => $ccEmail,
                'merchant' => $merchant,
                'status' => $status,
                'country' => $country,
            ],
        ]);
    }

    private function getDateRange($range)
    {
        $now = Carbon::now();

        return match ($range) {
            'today' => [
                'start' => $now->copy()->startOfDay(),
                'end' => $now->copy()->endOfDay(),
            ],
            'yesterday' => [
                'start' => $now->copy()->subDay()->startOfDay(),
                'end' => $now->copy()->subDay()->endOfDay(),
            ],
            'this_week' => [
                'start' => $now->copy()->startOfWeek(),
                'end' => $now->copy()->endOfWeek(),
            ],
            'last_week' => [
                'start' => $now->copy()->subWeek()->startOfWeek(),
                'end' => $now->copy()->subWeek()->endOfWeek(),
            ],
            'this_month' => [
                'start' => $now->copy()->startOfMonth(),
                'end' => $now->copy()->endOfMonth(),
            ],
            'last_month' => [
                'start' => $now->copy()->subMonth()->startOfMonth(),
                'end' => $now->copy()->subMonth()->endOfMonth(),
            ],
            'this_year' => [
                'start' => $now->copy()->startOfYear(),
                'end' => $now->copy()->endOfYear(),
            ],
            'last_30_days' => [
                'start' => $now->copy()->subDays(30)->startOfDay(),
                'end' => $now->copy()->endOfDay(),
            ],
            'last_90_days' => [
                'start' => $now->copy()->subDays(90)->startOfDay(),
                'end' => $now->copy()->endOfDay(),
            ],
            'all_time' => [
                'start' => Carbon::parse('2000-01-01'),
                'end' => $now->copy()->endOfDay(),
            ],
            default => [
                'start' => Carbon::parse('2000-01-01'),
                'end' => $now->copy()->endOfDay(),
            ],
        };
    }
}
