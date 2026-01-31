<?php

use App\Http\Controllers\AppScriptController;
use App\Http\Controllers\C2BTransactionController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\DispatchController;
use App\Http\Controllers\WaybillController;
use App\Http\Controllers\SheetOrderController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\AssignController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\ImportController;
use App\Http\Controllers\ChatController;
use App\Http\Controllers\DailyBudgetController;
use App\Http\Controllers\RequisitionCategoryController;
use App\Http\Controllers\RequisitionController;
use App\Http\Controllers\StatsController;
use App\Http\Controllers\WaredashController;
use App\Http\Controllers\TransferController;
use App\Http\Controllers\CallcenterController;
use App\Http\Controllers\StkController;
use App\Http\Controllers\UpdateController;
use App\Http\Controllers\UndeliveredController;
use App\Http\Controllers\WhatsappController;
use Illuminate\Support\Facades\DB;
use App\Http\Controllers\AiController;
use App\Http\Controllers\UnremittedController;
use App\Models\User;
use Carbon\Carbon;
use App\Http\Controllers\SheetController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\UnitController;
use Illuminate\Support\Facades\Route;
use App\Http\Middleware\VerifyCsrfToken;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('welcome');
})->name('home');

//no auth routes
//appscript api







Route::middleware(['auth', 'verified'])->group(function () {
    //dashboard
  



// Improved Dashboard Route with Comprehensive Metrics


// Updated Dashboard Route - Matching Actual Database Schema
Route::get('dashboard', function () {
    $user = auth()->user();
    $userName = $user->name;
    $userRole = $user->roles;

    // Base query builder
    $baseQuery = function() use ($userName, $userRole) {
        $query = DB::table('sheet_orders');
        if ($userRole === 'merchant') {
            $query->where('merchant', $userName);
        }
        return $query;
    };

    // =================================================================
    // 1. MONTHLY CHART DATA (Orders & Revenue)
    // =================================================================
    $monthlyData = $baseQuery()
        ->selectRaw("
            DATE_FORMAT(order_date, '%Y-%m') as month,
            COUNT(*) as total,
            SUM(COALESCE(amount, 0)) as revenue
        ")
        ->whereNotNull('order_date')
        ->groupBy('month')
        ->orderBy('month', 'DESC')
        ->limit(12) // Last 12 months
        ->get()
        ->reverse() // Show oldest to newest
        ->values();

    $chartData = $monthlyData->map(function ($item) {
        $dateObj = Carbon::parse($item->month . '-01');
        return [
            'month' => $dateObj->format('F Y'),
            'total' => (int) $item->total,
            'revenue' => (float) $item->revenue,
        ];
    });

    // =================================================================
    // 2. STATUS SUMMARY (With Better Aggregations)
    // =================================================================
    $statusSummary = $baseQuery()
        ->select(
            'status',
            DB::raw('COUNT(*) as totalOrders'),
            DB::raw('SUM(COALESCE(amount, 0)) as totalAmount')
        )
        ->whereNotNull('status')
        ->groupBy('status')
        ->orderByDesc('totalOrders')
        ->get()
        ->map(function($item) {
            return [
                'status' => $item->status ?: 'Unknown',
                'totalOrders' => (int) $item->totalOrders,
                'totalAmount' => (float) $item->totalAmount,
            ];
        });

    // =================================================================
    // 3. OVERALL METRICS
    // =================================================================
    $overallMetrics = $baseQuery()
        ->selectRaw("
            COUNT(*) as total_orders,
            SUM(COALESCE(amount, 0)) as total_revenue,
            AVG(COALESCE(amount, 0)) as avg_order_value,
            COUNT(DISTINCT client_name) as total_customers
        ")
        ->first();

    // =================================================================
    // 4. PERIOD COMPARISONS (Current vs Previous Month)
    // =================================================================
    $currentMonthStart = Carbon::now()->startOfMonth();
    $lastMonthStart = Carbon::now()->subMonth()->startOfMonth();
    $lastMonthEnd = Carbon::now()->subMonth()->endOfMonth();

    // Current month stats
    $currentMonth = $baseQuery()
        ->where('order_date', '>=', $currentMonthStart)
        ->selectRaw("
            COUNT(*) as orders,
            SUM(COALESCE(amount, 0)) as revenue
        ")
        ->first();

    // Previous month stats
    $previousMonth = $baseQuery()
        ->whereBetween('order_date', [$lastMonthStart, $lastMonthEnd])
        ->selectRaw("
            COUNT(*) as orders,
            SUM(COALESCE(amount, 0)) as revenue
        ")
        ->first();

    // Calculate growth percentages
    $orderGrowth = $previousMonth->orders > 0
        ? (($currentMonth->orders - $previousMonth->orders) / $previousMonth->orders) * 100
        : 0;

    $revenueGrowth = $previousMonth->revenue > 0
        ? (($currentMonth->revenue - $previousMonth->revenue) / $previousMonth->revenue) * 100
        : 0;

    // =================================================================
    // 5. STATUS-SPECIFIC METRICS
    // =================================================================
    $pendingOrders = $baseQuery()->where('status', 'Pending')->count();
    $completedOrders = $baseQuery()->where('status', 'Completed')->count();
    $cancelledOrders = $baseQuery()->where('status', 'Cancelled')->count();

    $completionRate = $overallMetrics->total_orders > 0
        ? ($completedOrders / $overallMetrics->total_orders) * 100
        : 0;

    $cancellationRate = $overallMetrics->total_orders > 0
        ? ($cancelledOrders / $overallMetrics->total_orders) * 100
        : 0;

    // =================================================================
    // 6. TIME-BASED METRICS
    // =================================================================
    $today = Carbon::today();
    $last7Days = Carbon::now()->subDays(7);
    $last30Days = Carbon::now()->subDays(30);

    $todayStats = $baseQuery()
        ->whereDate('order_date', $today)
        ->selectRaw("COUNT(*) as orders, SUM(COALESCE(amount, 0)) as revenue")
        ->first();

    $last7DaysStats = $baseQuery()
        ->where('order_date', '>=', $last7Days)
        ->selectRaw("COUNT(*) as orders, SUM(COALESCE(amount, 0)) as revenue")
        ->first();

    $last30DaysStats = $baseQuery()
        ->where('order_date', '>=', $last30Days)
        ->selectRaw("COUNT(*) as orders, SUM(COALESCE(amount, 0)) as revenue")
        ->first();

    // =================================================================
    // 7. TOP PRODUCTS (Based on quantity sold)
    // =================================================================
    $topProducts = $baseQuery()
        ->select(
            'product_name',
            DB::raw('COUNT(*) as order_count'),
            DB::raw('SUM(COALESCE(quantity, 0)) as total_quantity'),
            DB::raw('SUM(COALESCE(amount, 0)) as total_revenue')
        )
        ->whereNotNull('product_name')
        ->where('product_name', '!=', '')
        ->groupBy('product_name')
        ->orderByDesc('total_quantity')
        ->limit(5)
        ->get()
        ->map(function($item) {
            return [
                'product_name' => $item->product_name,
                'order_count' => (int) $item->order_count,
                'total_quantity' => (int) $item->total_quantity,
                'total_revenue' => (float) $item->total_revenue,
            ];
        });

    // =================================================================
    // 8. TOP AGENTS (if applicable)
    // =================================================================
    $topAgents = $baseQuery()
        ->select(
            'agent',
            DB::raw('COUNT(*) as order_count'),
            DB::raw('SUM(COALESCE(amount, 0)) as total_revenue')
        )
        ->whereNotNull('agent')
        ->where('agent', '!=', '')
        ->groupBy('agent')
        ->orderByDesc('total_revenue')
        ->limit(5)
        ->get()
        ->map(function($item) {
            return [
                'agent' => $item->agent,
                'order_count' => (int) $item->order_count,
                'total_revenue' => (float) $item->total_revenue,
            ];
        });

    // =================================================================
    // 9. RECENT ORDERS
    // =================================================================
    $recentOrders = $baseQuery()
        ->select(
            'id',
            'order_date',
            'order_no',
            'client_name',
            'product_name',
            'quantity',
            'status',
            'amount',
            'agent'
        )
        ->orderBy('order_date', 'DESC')
        ->limit(10)
        ->get()
        ->map(function($item) {
            return [
                'id' => $item->id,
                'order_date' => $item->order_date,
                'order_no' => $item->order_no,
                'client_name' => $item->client_name,
                'product_name' => $item->product_name,
                'quantity' => (int) $item->quantity,
                'status' => $item->status,
                'amount' => (float) $item->amount,
                'agent' => $item->agent,
            ];
        });

    // =================================================================
    // 10. GEOGRAPHICAL DISTRIBUTION (By Country and City)
    // =================================================================
    $countryDistribution = $baseQuery()
        ->select(
            'country',
            DB::raw('COUNT(*) as order_count'),
            DB::raw('SUM(COALESCE(amount, 0)) as total_revenue')
        )
        ->whereNotNull('country')
        ->where('country', '!=', '')
        ->groupBy('country')
        ->orderByDesc('order_count')
        ->limit(10)
        ->get()
        ->map(function($item) {
            return [
                'country' => $item->country,
                'order_count' => (int) $item->order_count,
                'total_revenue' => (float) $item->total_revenue,
            ];
        });

    $cityDistribution = $baseQuery()
        ->select(
            'city',
            DB::raw('COUNT(*) as order_count'),
            DB::raw('SUM(COALESCE(amount, 0)) as total_revenue')
        )
        ->whereNotNull('city')
        ->where('city', '!=', '')
        ->groupBy('city')
        ->orderByDesc('order_count')
        ->limit(10)
        ->get()
        ->map(function($item) {
            return [
                'city' => $item->city,
                'order_count' => (int) $item->order_count,
                'total_revenue' => (float) $item->total_revenue,
            ];
        });

    // =================================================================
    // 11. ORDER TYPE DISTRIBUTION (if applicable)
    // =================================================================
    $orderTypeDistribution = $baseQuery()
        ->select(
            'order_type',
            DB::raw('COUNT(*) as order_count'),
            DB::raw('SUM(COALESCE(amount, 0)) as total_revenue')
        )
        ->whereNotNull('order_type')
        ->where('order_type', '!=', '')
        ->groupBy('order_type')
        ->orderByDesc('order_count')
        ->get()
        ->map(function($item) {
            return [
                'order_type' => $item->order_type,
                'order_count' => (int) $item->order_count,
                'total_revenue' => (float) $item->total_revenue,
            ];
        });

    // =================================================================
    // 12. DELIVERY PERFORMANCE (Orders with delivery dates)
    // =================================================================
    $deliveryStats = $baseQuery()
        ->selectRaw("
            COUNT(*) as total_orders_with_delivery,
            COUNT(CASE WHEN delivery_date IS NOT NULL AND delivery_date <= NOW() THEN 1 END) as delivered_orders,
            COUNT(CASE WHEN delivery_date IS NOT NULL AND delivery_date > NOW() THEN 1 END) as pending_delivery
        ")
        ->first();

    $deliveryRate = $deliveryStats->total_orders_with_delivery > 0
        ? ($deliveryStats->delivered_orders / $deliveryStats->total_orders_with_delivery) * 100
        : 0;

    // =================================================================
    // RETURN ALL DATA TO FRONTEND
    // =================================================================
    return Inertia::render('dashboard', [
        'userName' => $userName,
        'userRole' => $userRole,

        // Chart data
        'chartData' => $chartData,

        // Status breakdown
        'statusSummary' => $statusSummary,

        // Overall metrics
        'metrics' => [
            'totalOrders' => (int) $overallMetrics->total_orders,
            'totalRevenue' => (float) $overallMetrics->total_revenue,
            'avgOrderValue' => (float) $overallMetrics->avg_order_value,
            'totalCustomers' => (int) $overallMetrics->total_customers,
            'pendingOrders' => $pendingOrders,
            'completionRate' => round($completionRate, 1),
            'cancellationRate' => round($cancellationRate, 1),
            'deliveryRate' => round($deliveryRate, 1),
        ],

        // Growth metrics
        'growth' => [
            'orders' => round($orderGrowth, 1),
            'revenue' => round($revenueGrowth, 1),
            'currentMonth' => [
                'orders' => (int) $currentMonth->orders,
                'revenue' => (float) $currentMonth->revenue,
            ],
            'previousMonth' => [
                'orders' => (int) $previousMonth->orders,
                'revenue' => (float) $previousMonth->revenue,
            ],
        ],

        // Time-based stats
        'timeStats' => [
            'today' => [
                'orders' => (int) $todayStats->orders,
                'revenue' => (float) $todayStats->revenue,
            ],
            'last7Days' => [
                'orders' => (int) $last7DaysStats->orders,
                'revenue' => (float) $last7DaysStats->revenue,
            ],
            'last30Days' => [
                'orders' => (int) $last30DaysStats->orders,
                'revenue' => (float) $last30DaysStats->revenue,
            ],
        ],

        // Additional insights
        'topProducts' => $topProducts,
        'topAgents' => $topAgents,
        'recentOrders' => $recentOrders,
        'countryDistribution' => $countryDistribution,
        'cityDistribution' => $cityDistribution,
        'orderTypeDistribution' => $orderTypeDistribution,

        // Delivery stats
        'deliveryStats' => [
            'totalWithDelivery' => (int) $deliveryStats->total_orders_with_delivery,
            'delivered' => (int) $deliveryStats->delivered_orders,
            'pendingDelivery' => (int) $deliveryStats->pending_delivery,
            'deliveryRate' => round($deliveryRate, 1),
        ],
    ]);
})->name('dashboard');
//sheetorderspage- route
    Route::resource('sheetorders', SheetOrderController::class);
    Route::get('sheetorders/{order}/histories', [SheetOrderController::class, 'histories'])
    ->name('sheetorders.histories');
    
    //product and transfer
    
   Route::get('/products/{product}/inventory-logs', [ProductController::class, 'inventoryLogs'])
    ->name('products.inventoryLogs');


Route::post('/products/scan-barcodes', [ProductController::class, 'scanBarcodes'])
    ->name('products.scanBarcodes');

Route::get('/products/{product}/barcode-history', [ProductController::class, 'getBarcodeHistory'])
    ->name('products.barcodeHistory');
    
    Route::post('/products/{product:id}/update-quantity', [ProductController::class, 'updateQuantity'])
    ->name('products.updateQuantity');

Route::resource('products', ProductController::class);

Route::get('/transfer', [TransferController::class, 'index'])->name('transfers.index');

Route::post('/transfers', [TransferController::class, 'store'])->name('transfers.store');

Route::get('/transfers/{productId}/{agentId}', [TransferController::class, 'show'])->name('transfers.show');
Route::post('/transfers/{productId}/{agentId}/deductions', [TransferController::class, 'storeDeduction'])->name('transfers.deductions.store');
Route::delete('/deductions/{id}', [TransferController::class, 'destroyDeduction'])->name('deductions.destroy');




    //sheets
    Route::resource('sheets', SheetController::class);
    Route::get('/sheets/{sheetId}/view', [SheetController::class, 'viewSheetData']);

    //units(merchants)
    Route::resource('units',UnitController::class);

    //category
    Route::resource('categories',CategoryController::class);

    //users
    Route::resource('users',UserController::class);

    //c2btrans.
    Route::resource('transactions',C2BTransactionController::class);
   
//dispatch

Route::put('sheet_orders/{id}', [DispatchController::class, 'update'])->name('sheet_orders.update');
Route::delete('sheet_orders/{id}', [DispatchController::class, 'destroy'])->name('sheet_orders.destroy');

Route::post('/dispatch/bulk-download-waybills', [App\Http\Controllers\DispatchController::class, 'bulkDownloadWaybills'])->name('dispatch.bulkDownload');

// Or update your frontend to use /dispatch endpoints
 Route::get('/dispatch/agent-orders/{agent}', [DispatchController::class, 'printAgentOrders'])
        ->name('dispatch.agent-orders');
    Route::resource('dispatch',DispatchController::class);
    Route::get('dispatch/{order}/waybill', [DispatchController::class, 'generateWaybill'])->name('dispatch.waybill');
   Route::post('/dispatch/bulk-assign', [DispatchController::class, 'bulkAssignAgent'])->name('dispatch.bulk-assign');
//waybill
    Route::get('/waybill/download/{id}', [WaybillController::class, 'download'])->name('waybill.download');
    

    //apscriptapi
    Route::resource('appscript',AppScriptController::class);
    

    //Whatsapp
    Route::resource('whastapp',WhatsappController::class);
    Route::post('/whatsapp/{id}/send', [WhatsappController::class, 'sendMessage'])
    ->name('whatsapp.send');


//reassign
Route::post('assign/reassign', [AssignController::class, 'reassign'])->name('assign.reassign');

Route::resource('assign',AssignController::class);


    //stkpush

Route::get('/webrtc/token', [CallcenterController::class, 'generateWebRTCToken']);

Route::resource('stk', StkController::class);

//report
// Only the ones you actually use
Route::get('/report', [ReportController::class, 'index'])->name('report.index');
Route::get('/report/download', [ReportController::class, 'download'])->name('report.download');


//undelivered
Route::resource('/undelivered',UndeliveredController::class);

//Warehouse Dashboard

Route::resource('waredash', WaredashController::class);

//unremitted
Route::resource('/unremitted',UnremittedController::class);

Route::get('/stats', [StatsController::class, 'index'])->name('stats.index');

//whatsapp
Route::resource('whatsapp',ChatController::class);
  Route::put('/chats/{phone}', [ChatController::class, 'updateStatus']);
    Route::get('/chats/{phone}', [ChatController::class, 'show'])->name('chats.show');
    Route::get('/api/whatsapp/conversations', [ChatController::class, 'getConversations']);

//import
Route::resource('import',ImportController::class);
Route::post('/orders/import', [ImportController::class, 'store'])->name('orders.import.store');

//Ai
Route::resource('ai',AiController::class);

 // updates
    Route::post('/sheet-updates/run', [UpdateController::class, 'run']);
    Route::resource('updates', UpdateController::class);


Route::get('/reqcategories', [RequisitionCategoryController::class, 'index'])
        ->name('reqcategories.index');
    Route::post('/reqcategories', [RequisitionCategoryController::class, 'store'])
        ->name('reqcategories.store');
    Route::put('/reqcategories/{category}', [RequisitionCategoryController::class, 'update'])
        ->name('reqcategories.update');
    Route::delete('/reqcategories/{category}', [RequisitionCategoryController::class, 'destroy'])
        ->name('reqcategories.destroy');

    // Daily Budgets Routes
    Route::get('/budgets', [DailyBudgetController::class, 'index'])
        ->name('budgets.index');
    Route::post('/budgets', [DailyBudgetController::class, 'store'])
        ->name('budgets.store');
    Route::get('/budgets/{id}', [DailyBudgetController::class, 'show'])
        ->name('budgets.show');
    Route::post('/budgets/{id}/topup', [DailyBudgetController::class, 'topUp'])
        ->name('budgets.topup');
    Route::get('/budgets/date/{date}', [DailyBudgetController::class, 'getByDate'])
        ->name('budgets.by-date');

    // Requisitions Routes
    Route::get('/requisitions', [RequisitionController::class, 'index'])
    ->name('requisitions.index');
Route::post('/requisitions', [RequisitionController::class, 'store'])
    ->name('requisitions.store');
Route::get('/requisitions/{requisition}', [RequisitionController::class, 'show'])
    ->name('requisitions.show');
Route::patch('/requisitions/{requisition}/status', [RequisitionController::class, 'updateStatus'])
    ->name('requisitions.update-status');
Route::patch('/requisitions/{requisition}/items/{item}', [RequisitionController::class, 'updateItem'])
    ->name('requisitions.update-item');
Route::delete('/requisitions/{requisition}', [RequisitionController::class, 'destroy'])
    ->name('requisitions.destroy');


});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
