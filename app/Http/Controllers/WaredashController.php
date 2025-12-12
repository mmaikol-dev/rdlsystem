<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\Barcode;
use App\Models\Transfer;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class WaredashController extends Controller
{
    public function index()
    {
        $user = Auth::user();

        // Basic dashboard counts
        $totalProducts = Product::count();
        $totalBarcodes = Barcode::count();
        $totalTransfers = Transfer::count();
        $totalStock = Product::sum('quantity');

        // Depleted products (0 stock)
        $depletedProducts = Product::where('quantity', '<=', 0)->get();

        // Near depleted products (greater than 0 but at or below alert level)
        $nearDepletedProducts = Product::where('quantity', '>', 0)
            ->whereColumn('quantity', '<=', 'quantity_alert')
            ->get();

        // Transfers grouped by region
        $transfersByRegion = Transfer::select('region', DB::raw('SUM(quantity) as total'))
            ->groupBy('region')
            ->get();

        // Scans grouped by operation
        $scansByOperation = Barcode::select('operation_type', DB::raw('COUNT(*) as total'))
            ->groupBy('operation_type')
            ->get();

        // Last 10 scans
        $recentScans = Barcode::latest()->take(10)->get();

        return Inertia::render('waredash/index', [
            'userName'   => $user->name ?? 'User',

            'summary' => [
                'totalProducts' => $totalProducts,
                'totalBarcodes' => $totalBarcodes,
                'totalTransfers' => $totalTransfers,
                'totalStock' => $totalStock,
            ],

            // NEW DATA
            'depletedProducts'     => $depletedProducts,
            'nearDepletedProducts' => $nearDepletedProducts,

            'transfersByRegion' => $transfersByRegion,
            'scansByOperation'  => $scansByOperation,
            'recentScans'       => $recentScans,
        ]);
    }
}
