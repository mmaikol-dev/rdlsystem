<?php

use App\Http\Controllers\AppScriptController;
use App\Http\Controllers\C2BTransactionController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\DispatchController;
use App\Http\Controllers\WaybillController;
use App\Http\Controllers\SheetOrderController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\AiController;
use App\Http\Controllers\StkController;
use App\Http\Controllers\ChatController;
use App\Http\Controllers\ImportController;
use App\Http\Controllers\WhatsappController;
use Illuminate\Support\Facades\DB;
use App\Models\User;
use Carbon\Carbon;
use App\Http\Controllers\SheetController;
use App\Http\Controllers\StatController;
use App\Http\Controllers\UndeliveredController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\UnitController;
use App\Http\Controllers\UnremittedController;
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
            $dateObj = Carbon::parse($item->month . '-01');
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

//stats
Route::resource('stat',StatController::class);




//sheetorderspage- route
    Route::resource('sheetorders', SheetOrderController::class);
    Route::get('sheetorders/{order}/histories', [SheetOrderController::class, 'histories'])
    ->name('sheetorders.histories');
    
    //products
  Route::get('/products/{productCode}/inventory-logs', [ProductController::class, 'inventoryLogs']);
Route::post('/products/{product:id}/update-quantity', [ProductController::class, 'updateQuantity'])
    ->name('products.updateQuantity');


Route::resource('products', ProductController::class);




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
    Route::resource('dispatch',DispatchController::class);
    Route::get('dispatch/{order}/waybill', [DispatchController::class, 'generateWaybill'])->name('dispatch.waybill');
   
//waybill
    Route::get('/waybill/download/{id}', [WaybillController::class, 'download'])->name('waybill.download');
    

    //apscriptapi
    Route::resource('appscript',AppScriptController::class);
    

    //Whatsapp
    Route::resource('whastapp',WhatsappController::class);
    Route::post('/whatsapp/{id}/send', [WhatsappController::class, 'sendMessage'])
    ->name('whatsapp.send');

    //stkpush



Route::resource('stk', StkController::class);

//report
// Only the ones you actually use
Route::get('/report', [ReportController::class, 'index'])->name('report.index');
Route::get('/report/download', [ReportController::class, 'download'])->name('report.download');

//undelivered
Route::resource('/undelivered',UndeliveredController::class);

//unremitted
Route::resource('/unremitted',UnremittedController::class);


//whatsapp
Route::resource('whatsapp',ChatController::class);

//import
Route::resource('import',ImportController::class);
Route::post('/orders/import', [ImportController::class, 'store'])->name('orders.import.store');

//Ai
Route::resource('ai',AiController::class);




});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
