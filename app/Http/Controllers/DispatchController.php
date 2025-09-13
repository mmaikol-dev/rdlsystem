<?php

namespace App\Http\Controllers;

use App\Models\Dispatch;
use App\Models\SheetOrder;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Carbon;


class DispatchController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $today = Carbon::today()->toDateString();
        $search = $request->input('search', '');
        $user = $request->user(); // Get authenticated user
    
        $ordersQuery = SheetOrder::whereIn('status', ['scheduled', 'dispatched'])
            ->orderByRaw("CASE WHEN delivery_date = ? THEN 0 ELSE 1 END", [$today])
            ->orderBy('delivery_date', 'asc');
    
        // Restrict merchants to only their orders
        if ($user->roles === 'merchant') {
            $ordersQuery->where('merchant', $user->name);
        }
    
        // Apply search if provided
        if ($search) {
            $ordersQuery->where(function ($q) use ($search) {
                $q->where('order_no', 'like', "%{$search}%")
                  ->orWhere('product_name', 'like', "%{$search}%")
                  ->orWhere('client_name', 'like', "%{$search}%");
            });
        }
    
        $orders = $ordersQuery->paginate(50)->withQueryString();
    
        return Inertia::render('dispatch/index', [
            'orders' => $orders,
            'search' => $search,
        ]);
    }
    


    public function generateWaybill(SheetOrder $order)
    {
        abort_unless($order, 404, 'Order not found');

        $order->update(['status' => 'Dispatched']);

        $pdf = Pdf::loadView('waybill', compact('order'));

        $pdf->setPaper('a4', 'portrait');
        $pdf->setOption([
            'isRemoteEnabled' => true,
            'isHtml5ParserEnabled' => true,
            'defaultFont' => 'sans-serif'
        ]);

        // Force file download
        return $pdf->download("waybill_{$order->order_no}.pdf");
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
    public function show(Dispatch $dispatch)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Dispatch $dispatch)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Dispatch $dispatch)
    {
        //
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Dispatch $dispatch)
    {
        //
    }
}
