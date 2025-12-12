<?php

namespace App\Http\Controllers;

use App\Models\SheetOrder;
use Illuminate\Http\Request;
use Inertia\Inertia;

class UnremittedController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $query = SheetOrder::query()
            ->whereNotNull('code')
            ->where('status', 'delivered')
            ->where(function ($q) {
                $q->whereNull('agent')
                    ->orWhere('agent', '');
            });

        // -------------------------
        // ✅ Merchant Filter
        // -------------------------
        if ($request->filled('merchant')) {
            $query->where('merchant', $request->merchant);
        }

        // -------------------------
        // ✅ Delivery Date Range Filter
        // from_date = start date
        // to_date   = end date
        // -------------------------
        if ($request->filled('from_date') && $request->filled('to_date')) {
            // Range: both start + end
            $query->whereBetween('delivery_date', [
                $request->from_date,
                $request->to_date,
            ]);
        } elseif ($request->filled('from_date')) {
            // Only start date
            $query->whereDate('delivery_date', '>=', $request->from_date);
        } elseif ($request->filled('to_date')) {
            // Only end date
            $query->whereDate('delivery_date', '<=', $request->to_date);
        }

        // -------------------------
        //  Pagination
        // -------------------------
        $orders = $query->orderByDesc('updated_at')
            ->paginate(100)
            ->withQueryString();

        // -------------------------
        //  Merchant List For Filter
        // -------------------------
        $merchantUsers = SheetOrder::whereNotNull('merchant')
            ->distinct()
            ->pluck('merchant');

        return Inertia::render('unremitted/index', [
            'orders' => $orders,
            'merchantUsers' => $merchantUsers,
            'filters' => $request->only([
                'merchant',
                'from_date',
                'to_date',
            ]),
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

    /**
     * Display the specified resource.
     */
    public function show(SheetOrder $unremitted)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(SheetOrder $unremitted)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, SheetOrder $unremitted)
    {
        //
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(SheetOrder $unremitted)
    {
        //
    }
}
