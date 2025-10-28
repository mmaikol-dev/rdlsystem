<?php

namespace App\Http\Controllers;

use App\Models\Transfer;
use App\Models\Product;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;

class TransferController extends Controller
{
    public function index()
    {
        $transfers = Transfer::with(['product', 'agent'])->latest()->paginate(10);
        $products = Product::select('id', 'name')->get();
        $agents = User::where('roles', 'agent')->select('id', 'name')->get();
        
    
        return Inertia::render('products/transfer', [
            'transfers' => $transfers,
            'products' => $products,
            'agents' => $agents,
            'auth' => ['user' => auth()->user()],
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
    
        foreach ($validated['transfers'] as $transferData) {
            $product = Product::findOrFail($transferData['product_id']);
    
            Transfer::create([
                'product_id' => $product->id,
                'merchant' => $product->merchant,
                'quantity' => $transferData['quantity'],
                'agent_id' => $transferData['agent_id'],
                'date' => now()->toDateString(),
                'region' => $validated['region'],
                'store_name' => $product->name,
                'from' => $validated['from'],
                'transfer_by' => auth()->user()->name ?? 'System',
            ]);
        }
    
        return redirect()->back()->with('success', 'Transfers created successfully!');
    }
    

}
