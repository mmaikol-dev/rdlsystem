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
    
        // ✅ Filter by merchant
        if ($request->filled('merchant')) {
            $query->where('merchant', $request->merchant);
        }
    
        // ✅ Filter by delivery date
        if ($request->filled('delivery_date')) {
            $query->whereDate('delivery_date', $request->delivery_date);
        }
    
        $orders = $query->orderByDesc('updated_at')
            ->paginate(100)
            ->withQueryString(); // ✅ keep filters in query string
    
        // ✅ Get merchant list for dropdown
        $merchantUsers = SheetOrder::whereNotNull('merchant')
            ->distinct()
            ->pluck('merchant');
    
        return Inertia::render('unremitted/index', [
            'orders' => $orders,
            'merchantUsers' => $merchantUsers,
            'filters' => $request->only(['merchant', 'delivery_date']), // ✅ removed status since it's fixed to delivered
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
