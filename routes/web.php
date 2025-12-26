<?php

use App\Http\Controllers\AiController;
use App\Http\Controllers\AppScriptController;
use App\Http\Controllers\AssignController;
use App\Http\Controllers\C2BTransactionController;
use App\Http\Controllers\CallcenterController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\ChatController;
use App\Http\Controllers\DispatchController;
use App\Http\Controllers\ImportController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\SheetController;
use App\Http\Controllers\SheetOrderController;
use App\Http\Controllers\StatController;
use App\Http\Controllers\StatsController;
use App\Http\Controllers\StkController;
use App\Http\Controllers\TransferController;
use App\Http\Controllers\UndeliveredController;
use App\Http\Controllers\UnitController;
use App\Http\Controllers\UnremittedController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\WaredashController;
use App\Http\Controllers\WaybillController;
use App\Http\Controllers\WhatsappController;
use App\Models\Stats;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('welcome');
})->name('home');

// no auth routes
// appscript api

Route::middleware(['auth', 'verified'])->group(function () {
    // dashboard

    Route::get('dashboard', function () {
        $user = auth()->user();
        $userName = $user->name;
        $userRole = $user->roles;

        // Base query for orders
        $query = DB::table('sheet_orders');

        // 🔒 If role = merchant, filter by merchant column == user name
        if ($userRole === 'merchant') {
            $query->where('merchant', $userName);
        }

        // Aggregate total orders grouped by month and year
        $orders = $query
            ->selectRaw("DATE_FORMAT(order_date, '%Y-%m') as month, COUNT(*) as total")
            ->groupBy('month')
            ->orderBy('month')
            ->get();

        // Format month nicely, e.g., "May 2025"
        $chartData = $orders->map(function ($item) {
            $dateObj = Carbon::parse($item->month.'-01');

            return [
                'month' => $dateObj->format('F Y'),
                'total' => $item->total,
            ];
        });

        // Reset query for status summary
        $statusQuery = DB::table('sheet_orders');
        if ($userRole === 'merchant') {
            $statusQuery->where('merchant', $userName);
        }

        // Aggregate total orders and amount grouped by status
        $statusSummary = $statusQuery
            ->select('status', DB::raw('COUNT(*) as totalOrders'), DB::raw('SUM(amount) as totalAmount'))
            ->groupBy('status')
            ->get();

        return Inertia::render('dashboard', [
            'userName' => $userName,
            'chartData' => $chartData,
            'statusSummary' => $statusSummary,
        ]);
    })->name('dashboard');

    Route::get('/webrtc/token', [CallcenterController::class, 'generateWebRTCToken']);
    Route::get('/webrtc-token', [CallcenterController::class, 'getWebRTCToken'])->name('api.webrtc-token');
    // stats
    Route::resource('stat', StatController::class);

    Route::post('assign/reassign', [AssignController::class, 'reassign'])->name('assign.reassign');

    Route::resource('assign', AssignController::class);

    // sheetorderspage- route
    Route::resource('sheetorders', SheetOrderController::class);
    Route::get('sheetorders/{order}/histories', [SheetOrderController::class, 'histories'])
        ->name('sheetorders.histories');

    Route::get('/products/{product}/inventory-logs', [ProductController::class, 'inventoryLogs'])
        ->name('products.inventoryLogs');

    Route::post('/products/{product}/update-quantity', [ProductController::class, 'updateQuantity'])
        ->name('products.updateQuantity');

    Route::post('/products/scan-barcodes', [ProductController::class, 'scanBarcodes'])
        ->name('products.scanBarcodes');

    Route::get('/products/{product}/barcode-history', [ProductController::class, 'getBarcodeHistory'])
        ->name('products.barcodeHistory');

    Route::resource('products', ProductController::class);

    Route::get('/transfer', [TransferController::class, 'index'])->name('transfers.index');

    Route::get('/stats', [StatsController::class, 'index'])->name('stats.index');

    Route::post('/transfers', [TransferController::class, 'store'])->name('transfers.store');

    Route::get('/transfers/{productId}/{agentId}', [TransferController::class, 'show'])->name('transfers.show');
    Route::post('/transfers/{productId}/{agentId}/deductions', [TransferController::class, 'storeDeduction'])->name('transfers.deductions.store');
    Route::delete('/deductions/{id}', [TransferController::class, 'destroyDeduction'])->name('deductions.destroy');

    // Warehouse Dashboard

    Route::resource('waredash', WaredashController::class);

    // sheets
    Route::resource('sheets', SheetController::class);
    Route::get('/sheets/{sheetId}/view', [SheetController::class, 'viewSheetData']);

    // units(merchants)
    Route::resource('units', UnitController::class);

    // category
    Route::resource('categories', CategoryController::class);

    // users
    Route::resource('users', UserController::class);

    // c2btrans.
    Route::resource('transactions', C2BTransactionController::class);

    // dispatch
    Route::post('/dispatch/bulk-download-waybills', [App\Http\Controllers\DispatchController::class, 'bulkDownloadWaybills'])->name('dispatch.bulkDownload');

    Route::put('sheet_orders/{id}', [DispatchController::class, 'update'])->name('sheet_orders.update');
    Route::delete('sheet_orders/{id}', [DispatchController::class, 'destroy'])->name('sheet_orders.destroy');

    // Or update your frontend to use /dispatch endpoints
    Route::get('/dispatch/agent-orders/{agent}', [DispatchController::class, 'printAgentOrders'])
        ->name('dispatch.agent-orders');
    Route::resource('dispatch', DispatchController::class);

    // Bulk assign agent route
    Route::post('/dispatch/bulk-assign', [DispatchController::class, 'bulkAssignAgent'])->name('dispatch.bulk-assign');
    // waybill
    Route::get('/waybill/download/{id}', [WaybillController::class, 'download'])->name('waybill.download');
    Route::get('/phpinfo', function () {
        phpinfo();
    });

    // apscriptapi
    Route::resource('appscript', AppScriptController::class);

    // Whatsapp
    Route::resource('whastapp', WhatsappController::class);
    Route::post('/whatsapp/{id}/send', [WhatsappController::class, 'sendMessage'])
        ->name('whatsapp.send');
    Route::put('/chats/{phone}', [ChatController::class, 'updateStatus']);
    Route::get('/chats/{phone}', [ChatController::class, 'show'])->name('chats.show');
    Route::get('/api/whatsapp/conversations', [ChatController::class, 'getConversations']);

    // Route::post('/whatsapp/send-chat', [WhatsappController::class, 'sendChat'])->name('whatsapp.sendChat');

    // stkpush

    Route::resource('stk', StkController::class);

    // report
    // Only the ones you actually use
    Route::get('/report', [ReportController::class, 'index'])->name('report.index');
    Route::get('/report/download', [ReportController::class, 'download'])->name('report.download');

    // undelivered
    Route::resource('/undelivered', UndeliveredController::class);

    // unremitted
    Route::resource('/unremitted', UnremittedController::class);

    // whatsapp
    Route::resource('whatsapp', ChatController::class);

    // import
    Route::resource('import', ImportController::class);
    Route::post('/orders/import', [ImportController::class, 'store'])->name('orders.import.store');

    // Ai
    Route::resource('ai', AiController::class);

});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
