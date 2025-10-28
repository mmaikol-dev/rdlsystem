<?php

namespace App\Http\Controllers;

use App\Models\assign;
use App\Models\OrderHistory;
use App\Models\SheetOrder;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Schema;
use Illuminate\Http\Request;
use Inertia\Inertia;

class AssignController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $query = SheetOrder::query();
    
        if (auth()->user()->roles === 'merchant') {
            $query->where('merchant', auth()->user()->name);
        }
    
        foreach ($request->all() as $key => $value) {
            if (!empty($value) && \Schema::hasColumn('sheet_orders', $key)) {
                if (!in_array($key, ['status', 'merchant', 'cc_email'])) {
                    $query->where($key, 'like', "%{$value}%");
                }
            }
        }
    
        if ($request->filled('status')) {
            $statuses = is_array($request->status) ? $request->status : explode(',', $request->status);
            $query->where(function($q) use ($statuses) {
                if (in_array('New Orders', $statuses)) {
                    $q->orWhereNull('status')->orWhere('status', '');
                }
                $otherStatuses = array_diff($statuses, ['New Orders']);
                if (!empty($otherStatuses)) {
                    $q->orWhereIn('status', $otherStatuses);
                }
            });
        }
    
        if ($request->filled('merchant') && auth()->user()->role !== 'merchant') {
            $merchants = is_array($request->merchant) ? $request->merchant : explode(',', $request->merchant);
            $query->whereIn('merchant', $merchants);
        }
    
        if ($request->filled('cc_email')) {
            $ccs = is_array($request->cc_email) ? $request->cc_email : explode(',', $request->cc_email);
            $query->whereIn('cc_email', $ccs);
        }
    
        if ($request->filled('from_date') && $request->filled('to_date')) {
            $from = Carbon::parse($request->from_date, 'Africa/Nairobi')->startOfDay();
            $to = Carbon::parse($request->to_date, 'Africa/Nairobi')->endOfDay();
            $query->whereBetween('delivery_date', [$from, $to]);
        }
    
        $query->orderBy('created_at', 'desc');
    
        $totalOrders = (clone $query)->count();
    
        $orders = $query->paginate(50)->appends($request->all());
    
        $merchantData = SheetOrder::select('merchant', 'sheet_id', 'sheet_name')
            ->whereNotNull('merchant')
            ->groupBy('merchant', 'sheet_id', 'sheet_name')
            ->get()
            ->groupBy('merchant')
            ->map(function ($items, $merchant) {
                return [
                    'sheet_id'    => $items->first()->sheet_id,
                    'sheet_names' => $items->pluck('sheet_name')->unique()->values(),
                ];
            });
    
        $merchantUsers = User::where('roles', 'merchant')->pluck('name');
        $ccUsers = User::where('roles', 'callcenter1')->pluck('name');
    
        return inertia('sheetorders/assign', [
            'orders'        => $orders,
            'filters'       => $request->all(),
            'merchantUsers' => $merchantUsers,
            'merchantData'  => $merchantData,
            'ccUsers'       => $ccUsers,
            'totalOrders'   => $totalOrders,
        ]);
    }

    /**
     * Bulk reassign orders to a different CC agent
     */
    public function reassign(Request $request)
    {
        $request->validate([
            'order_ids' => 'required|array|min:1',
            'order_ids.*' => 'exists:sheet_orders,id',
            'cc_email' => 'required|string',
        ]);
    
        try {
            $orders = SheetOrder::whereIn('id', $request->order_ids)->get();
            $updatedCount = 0;
    
            foreach ($orders as $sheetorder) {
                $oldValue = $sheetorder->cc_email;
                $newValue = $request->cc_email;
    
                if ($oldValue !== $newValue) {
                    // ✅ Log the reassignment for accountability
                    OrderHistory::create([
                        'order_id'  => $sheetorder->id,
                        'user_id'   => auth()->id(),
                        'attribute' => 'cc_email',
                        'old_value' => $oldValue,
                        'new_value' => $newValue,
                    ]);
    
                    // ✅ Update the cc_email field
                    $sheetorder->update(['cc_email' => $newValue]);
                    $updatedCount++;
                }
            }
    
            return back()->with('success', "Successfully reassigned {$updatedCount} order(s) to {$request->cc_email}");
        } catch (\Exception $e) {
            return back()->with('error', 'Failed to reassign orders: ' . $e->getMessage());
        }
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
    public function show(assign $assign)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(assign $assign)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, assign $assign)
    {
        //
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(assign $assign)
    {
        //
    }
}