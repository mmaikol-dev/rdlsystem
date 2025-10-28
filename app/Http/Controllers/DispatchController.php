<?php

namespace App\Http\Controllers;

use App\Models\Dispatch;
use App\Models\SheetOrder;
use App\Models\User;
use Barryvdh\DomPDF\Facade\Pdf;
use ZipArchive;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Carbon;



class DispatchController extends Controller
{
    public function index(Request $request)
    {
        $today = Carbon::today()->toDateString();
        $search = $request->input('search', '');
        $startDate = $request->input('start_date');
        $endDate = $request->input('end_date');
        $agentFilter = $request->input('agent');
        $user = $request->user();

        // Build base query
        $ordersQuery = SheetOrder::select([
                'id',
                'order_date',
                'order_no',
                'amount',
                'client_name',
                'address',
                'phone',
                'alt_no',
                'country',
                'city',
                'product_name',
                'quantity',
                'status',
                'agent',
                'delivery_date',
                'instructions',
                'cc_email',
                'merchant',
                'order_type',
                'sheet_id',
                'sheet_name',
                'created_at',
                'updated_at',
                'code',
                'store_name',
                'processed',
            ])
            ->whereIn('status', ['scheduled', 'dispatched'])
            ->orderByRaw("CASE WHEN delivery_date = ? THEN 0 ELSE 1 END", [$today])
            ->orderBy('delivery_date', 'asc');

        // Restrict merchants to their orders only
        if ($user->roles === 'merchant') {
            $ordersQuery->where('merchant', $user->name);
        }

        // Apply search
        if ($search) {
            $ordersQuery->where(function ($q) use ($search) {
                $q->where('order_no', 'like', "%{$search}%")
                  ->orWhere('product_name', 'like', "%{$search}%")
                  ->orWhere('client_name', 'like', "%{$search}%");
            });
        }

        // Apply date filter
        if ($request->filled('start_date') && $request->filled('end_date')) {
            $from = Carbon::parse($request->start_date)->toDateString();
            $to = Carbon::parse($request->end_date)->toDateString();
            $ordersQuery->whereBetween('delivery_date', [$from, $to]);
        }

        // Apply agent filter
        if ($agentFilter) {
            $ordersQuery->where('agent', $agentFilter);
        }

        // Paginate and format date
        $orders = $ordersQuery->paginate(50)->through(function ($order) {
            $order->delivery_date = $order->delivery_date
                ? Carbon::parse($order->delivery_date)->format('Y-m-d')
                : null;
            return $order;
        })->withQueryString();

        // Get agents for dropdown
        $agents = User::where('roles', 'agent')->select('id', 'name')->get();

        // ✅ Safe log (avoid undefined array key)
        if ($orders->count() > 0) {
            \Log::info('Sample order:', $orders->items()[0]->toArray());
        } else {
            \Log::info('No orders found for current filters.');
        }

        return Inertia::render('dispatch/index', [
            'orders' => $orders,
            'agents' => $agents,
            'filters' => [
                'search' => $search,
                'start_date' => $startDate,
                'end_date' => $endDate,
                'agent' => $agentFilter,
            ],
        ]);
    }

    
    /**
     * Bulk assign orders to an agent
     */
    public function bulkAssignAgent(Request $request)
    {
        $validated = $request->validate([
            'order_numbers' => 'required|string',
            'agent_name' => 'required|string',
        ]);

        // Parse order numbers (split by spaces, commas, or new lines)
        $orderNumbers = preg_split('/[\s,\n]+/', trim($validated['order_numbers']));
        $orderNumbers = array_filter($orderNumbers); // Remove empty values

        if (empty($orderNumbers)) {
            return redirect()->back()->withErrors(['order_numbers' => 'Please provide at least one order number.']);
        }

        // Update orders
        $updatedCount = SheetOrder::whereIn('order_no', $orderNumbers)
            ->update(['agent' => $validated['agent_name']]);

        if ($updatedCount === 0) {
            return redirect()->back()->withErrors(['order_numbers' => 'No matching orders found.']);
        }

        $notFound = count($orderNumbers) - $updatedCount;
        $message = "Successfully assigned {$updatedCount} order(s) to {$validated['agent_name']}.";
        
        if ($notFound > 0) {
            $message .= " {$notFound} order(s) not found.";
        }

        return redirect()->back()->with('success', $message);
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

   

    public function bulkDownloadWaybills(Request $request)
    {
        $validated = $request->validate([
            'order_numbers' => 'required|string',
        ]);
    
        // Split order numbers (comma, space, or newline)
        $orderNumbers = preg_split('/[\s,\n,]+/', trim($validated['order_numbers']));
        $orderNumbers = array_filter($orderNumbers);
    
        if (empty($orderNumbers)) {
            return back()->withErrors(['order_numbers' => 'Please provide valid order numbers.']);
        }
    
        // Fetch orders
        $orders = \App\Models\SheetOrder::whereIn('order_no', $orderNumbers)->get();
    
        if ($orders->isEmpty()) {
            return back()->withErrors(['order_numbers' => 'No matching orders found.']);
        }
    
        // Load one combined view (all waybills together)
        $pdf = Pdf::loadView('waybills', compact('orders'))
            ->setPaper('a4', 'portrait')
            ->setOption([
                'isRemoteEnabled' => true,
                'isHtml5ParserEnabled' => true,
            ]);
    
        // Update all orders to dispatched
        foreach ($orders as $order) {
            $order->update(['status' => 'Dispatched']);
        }
    
        $fileName = 'waybills_' . now()->format('Ymd_His') . '.pdf';
        return $pdf->download($fileName);
    }

    public function create()
    {
        //
    }

    public function store(Request $request)
    {
        //
    }

    public function show(Dispatch $dispatch)
    {
        //
    }

    public function edit(Dispatch $dispatch)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, $id)
    {
        $order = SheetOrder::findOrFail($id);
        
        $validated = $request->validate([
            'order_no' => 'sometimes|string',
            'product_name' => 'sometimes|string',
            'quantity' => 'sometimes|integer',
            'amount' => 'sometimes|string',
            'client_name' => 'sometimes|string',
            'phone' => 'sometimes|string',
            'agent' => 'nullable|string',
            'status' => 'sometimes|string',
            'delivery_date' => 'sometimes|date',
            'instructions' => 'nullable|string',
        ]);

        $order->update($validated);

        return redirect()->back()->with('success', 'Order updated successfully');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy($id)
    {
        $order = SheetOrder::findOrFail($id);
        $order->delete();

        return redirect()->back()->with('success', 'Order deleted successfully');
    }
}