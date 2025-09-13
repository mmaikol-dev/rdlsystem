<?php

namespace App\Http\Controllers;

use App\Models\SheetOrder;
use Illuminate\Http\Request;
use Inertia\Inertia;


class UndeliveredController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $query = SheetOrder::query()
            ->whereNotNull('code')
            ->where('code', '!=', '')
            ->where('status', '!=', 'delivered');
    
        // ✅ Filter by merchant
        if ($request->filled('merchant')) {
            $query->where('merchant', $request->merchant);
        }
    
        // ✅ Filter by status
        if ($request->filled('status')) {
            $statuses = is_array($request->status)
                ? $request->status
                : explode(',', $request->status);
    
            $query->whereIn('status', $statuses);
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
    
        return Inertia::render('undelivered/index', [
            'orders' => $orders,
            'merchantUsers' => $merchantUsers,
            'filters' => $request->only(['merchant', 'status', 'delivery_date']), // ✅ pass filters to frontend
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
    public function show($undelivered)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit( $undelivered)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request,$undelivered)
    {
        //
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy( $undelivered)
    {
        //
    }
}
