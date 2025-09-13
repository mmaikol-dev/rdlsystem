<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class StatController extends Controller
{
    public function index()
    {
        // Orders grouped by month (overall)
        $ordersPerMonth = DB::table('sheet_orders')
            ->select(
                DB::raw("DATE_FORMAT(order_date, '%Y-%m') as month"),
                DB::raw('COUNT(*) as total')
            )
            ->groupBy('month')
            ->orderBy('month')
            ->get();

        // Merchant stats summary
        $merchantStats = DB::table('sheet_orders')
            ->select(
                'merchant',
                DB::raw('COUNT(*) as total_orders'),
                DB::raw('SUM(quantity) as total_quantity'),
                DB::raw('SUM(amount) as total_sales')
            )
            ->groupBy('merchant')
            ->get();

        // Status summary (overall)
        $statusSummary = DB::table('sheet_orders')
            ->select(
                'status',
                DB::raw('COUNT(*) as totalOrders'),
                DB::raw('SUM(amount) as totalAmount')
            )
            ->groupBy('status')
            ->get();

        // ✅ Merchant monthly orders (for bar charts)
        $merchantMonthly = DB::table('sheet_orders')
            ->select(
                'merchant',
                DB::raw("DATE_FORMAT(order_date, '%Y-%m') as month"),
                DB::raw('COUNT(*) as total_orders')
            )
            ->groupBy('merchant', 'month')
            ->orderBy('month')
            ->get()
            ->groupBy('merchant');

        // ✅ Merchant status summary (for pie charts)
        $merchantStatusSummary = DB::table('sheet_orders')
            ->select(
                'merchant',
                'status',
                DB::raw('COUNT(*) as total_orders')
            )
            ->groupBy('merchant', 'status')
            ->get()
            ->groupBy('merchant');

        return Inertia::render('stat/index', [
            'ordersPerMonth'        => $ordersPerMonth,
            'merchantStats'         => $merchantStats,
            'statusSummary'         => $statusSummary,
            'merchantMonthly'       => $merchantMonthly,       // ✅ bar charts
            'merchantStatusSummary' => $merchantStatusSummary, // ✅ pie charts
        ]);
    }
}
