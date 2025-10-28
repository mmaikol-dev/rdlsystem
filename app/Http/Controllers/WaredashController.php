<?php

// app/Http/Controllers/WaredashController.php

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

        $totalProducts = Product::count();
        $totalBarcodes = Barcode::count();
        $totalTransfers = Transfer::count();
        $totalStock = Product::sum('quantity');

        $transfersByRegion = Transfer::select('region', DB::raw('SUM(quantity) as total'))
            ->groupBy('region')
            ->get();

        $scansByOperation = Barcode::select('operation_type', DB::raw('COUNT(*) as total'))
            ->groupBy('operation_type')
            ->get();

        $recentScans = Barcode::latest()->take(10)->get();

        return Inertia::render('waredash/index', [
            'userName' => $user->name ?? 'User',
            'summary' => [
                'totalProducts' => $totalProducts,
                'totalBarcodes' => $totalBarcodes,
                'totalTransfers' => $totalTransfers,
                'totalStock' => $totalStock,
            ],
            'transfersByRegion' => $transfersByRegion,
            'scansByOperation' => $scansByOperation,
            'recentScans' => $recentScans,
        ]);
    }


    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        //
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        //
    }
}