<?php

namespace App\Http\Controllers;

use App\Models\Product;
use Illuminate\Http\Request;
use App\Models\InventoryLog;
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\JsonResponse;

class ProductController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user(); // Get authenticated user
        $isMerchant = $user->roles === 'merchant';
    
        $productsQuery = Product::query();
    
        // Apply merchant filter using UUIDs
        if ($isMerchant) {
            $productsQuery->where('uuid', $user->uuid);
        }
    
        $products = $productsQuery->get();
    
        return Inertia::render('products/index', [
            'products' => $products,
        ]);
    }


    


    public function updateQuantity(Request $request, Product $product)
{
    $request->validate([
        'quantity_change' => 'required|numeric',
    ]);

    $user = $request->user();
    $change = (int) $request->quantity_change;

    $newQuantity = $product->quantity + $change;

    if ($newQuantity < 0) {
        return redirect()->route('products.index')
                         ->with('errorMessage', 'Quantity cannot be negative.');
    }

    $product->update(['quantity' => $newQuantity]);

    \App\Models\InventoryLog::create([
        'product_name'    => $product->name,
        'product_code'    => $product->code,
        'quantity_added'  => $change,
        'remaining_qnty'  => $newQuantity,
        'added_by'        => $user->name,
        'product_unit_id' => $product->unit_id,
        'date_added'      => now(),
    ]);

    return redirect()->route('products.index')
                     ->with('successMessage', 'Quantity updated successfully!');
}

    

    


public function store(Request $request)
{
    $request->validate([
        'name' => 'required|string|max:255',
        'quantity' => 'required|numeric',
        'store_name' => 'nullable|string|max:255',
        'slug' => 'nullable|string|max:255|unique:products,slug',
        'code' => 'nullable|string|max:255|unique:products,code',
        'buying_price' => 'nullable|numeric',
        'selling_price' => 'nullable|numeric',
        'quantity_alert' => 'nullable|numeric',
        'tax' => 'nullable|numeric',
        'tax_type' => 'nullable|string',
        'notes' => 'nullable|string',
        'product_image' => 'nullable|string',
    ]);

    $user = $request->user();

    $data = array_merge($request->all(), [
        'user_id' => $user->id,
        'uuid' => $user->uuid,
        'category_id' => $request->category_id ?? 10,
        'unit_id' => $request->unit_id ?? 10,
    ]);

    Product::create($data);

    return redirect()->route('products.index')
                     ->with('successMessage', 'Product created successfully!');
}

public function update(Request $request, Product $product)
{
    $request->validate([
        'name' => 'required|string|max:255',
        'store_name' => 'nullable|string|max:255',
        'slug' => 'nullable|string|max:255|unique:products,slug,' . $product->id,
        'code' => 'nullable|string|max:255|unique:products,code,' . $product->id,
        'quantity' => 'required|numeric',
        'buying_price' => 'nullable|numeric',
        'selling_price' => 'nullable|numeric',
        'quantity_alert' => 'nullable|numeric',
        'tax' => 'nullable|numeric',
        'tax_type' => 'nullable|string',
        'notes' => 'nullable|string',
        'product_image' => 'nullable|string',
        'category_id' => 'nullable|integer',
        'unit_id' => 'nullable|integer',
    ]);

    $product->update($request->all());

    return redirect()->route('products.index')
                     ->with('successMessage', 'Product updated successfully!');
}

public function destroy(Product $product)
{
    $product->delete();

    return redirect()->route('products.index')
                     ->with('successMessage', 'Product deleted successfully!');
}

    public function create()
    {
        // Not used: creation handled in frontend modal
        return Inertia::render('products/index');
    }
}
