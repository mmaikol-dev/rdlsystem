<?php

namespace App\Http\Controllers;

use App\Models\Transfer;
use App\Models\Product;
use App\Models\User;
use Illuminate\Support\Facades\Log;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class TransferController extends Controller
{
    public function index(Request $request)
    {
        $view = $request->get('view', 'grouped'); // 'grouped' or 'detailed'

        if ($view === 'grouped') {
            return $this->groupedView($request);
        }

        return $this->detailedView($request);
    }

    private function groupedView(Request $request)
    {
        $query = Transfer::query()
            ->select(
                'product_id',
                'agent_id',
                DB::raw('COUNT(*) as transfer_count'),
                DB::raw('SUM(quantity) as total_quantity'),
                DB::raw('MAX(created_at) as last_transfer_date'),
                DB::raw('MIN(created_at) as first_transfer_date')
            )
            ->with(['product:id,name,unit_id', 'agent:id,name'])
            ->groupBy('product_id', 'agent_id');

        // Apply filters
        if ($request->product_id) {
            $query->where('product_id', $request->product_id);
        }

        if ($request->agent_id) {
            $query->where('agent_id', $request->agent_id);
        }

        if ($request->date) {
            $query->whereDate('created_at', $request->date);
        }

        $groupedTransfers = $query->latest('last_transfer_date')->paginate(20);

        $products = Product::select('id', 'name','unit_id')->get();
        $agents = User::where('roles', 'agent')
            ->select('id', 'name')
            ->orderBy('name')
            ->get();

        return inertia('products/transfer', [
            'groupedTransfers' => $groupedTransfers,
            'products' => $products,
            'agents' => $agents,
            'view' => 'grouped'
        ]);
    }

    private function detailedView(Request $request)
    {
        $query = Transfer::with(['product', 'agent']);

        // Apply filters
        if ($request->product_id) {
            $query->where('product_id', $request->product_id);
        }

        if ($request->agent_id) {
            $query->where('agent_id', $request->agent_id);
        }

        if ($request->date) {
            $query->whereDate('created_at', $request->date);
        }

        $transfers = $query->latest()->paginate(20);

        $products = Product::select('id', 'name','unit_id')->get();
        $agents = User::where('roles', 'agent')
            ->select('id', 'name')
            ->orderBy('name')
            ->get();

        return inertia('products/transfer', [
            'transfers' => $transfers,
            'products' => $products,
            'agents' => $agents,
            'view' => 'detailed'
        ]);
    }

    public function show(Request $request, $productId, $agentId)
    {
        $query = Transfer::where('product_id', $productId)
            ->where('agent_id', $agentId)
            ->with(['product', 'agent', 'unit']); // Add 'unit' here
    
        // Apply optional date filter
        if ($request->date) {
            $query->whereDate('created_at', $request->date);
        }
    
        $transfers = $query->latest()->paginate(20);
       
        return inertia('products/transferdetails', [
            'transfers' => $transfers,
            'productId' => $productId,
            'agentId' => $agentId,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'region' => 'required|string',
            'from' => 'required|string',
            'transfers' => 'required|array|min:1',
            'transfers.*.product_id' => 'required|exists:products,id',
            'transfers.*.quantity' => 'required|integer|min:1',
            'transfers.*.agent_id' => 'required|exists:users,id',
        ]);

        DB::transaction(function () use ($validated) {
            foreach ($validated['transfers'] as $transferData) {
                $product = Product::findOrFail($transferData['product_id']);

                Transfer::create([
                    'product_id' => $product->id,
                    'merchant' => $product->unit_id ?? $product->merchant,
                    'quantity' => $transferData['quantity'],
                    'agent_id' => $transferData['agent_id'],
                    'date' => now()->toDateString(),
                    'region' => $validated['region'],
                    'store_name' => $product->name,
                    'from' => $validated['from'],
                    'transfer_by' => auth()->user()->name ?? 'System',
                ]);
            }
        });

        return redirect()->back()->with('success', 'Transfers created successfully!');
    }
}