<?php

namespace App\Http\Controllers;

use App\Models\Product;
use Illuminate\Http\Request;
use App\Models\InventoryLog;
use App\Models\Barcode;
use App\Models\Category;
use App\Models\Unit;
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Str;

class ProductController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $isMerchant = $user->roles === 'merchant';
        $categories = Category::select('id', 'name')->get();
        $units = Unit::select('id', 'name', 'short_code')->get();
        $productsQuery = Product::query();
    
        // Apply merchant filter using UUIDs
        if ($isMerchant) {
            $productsQuery->where('uuid', $user->uuid);
        }
    
        // Paginate with 50 items per page
        $products = $productsQuery->orderBy('created_at', 'desc')->paginate(50);
    
        return Inertia::render('products/index', [
            'products' => $products,
            'categories' => $categories,
            'units' => $units,
        ]);
    }

    public function inventoryLogs($productCode)
    {
        $logs = InventoryLog::where('product_code', $productCode)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json(['logs' => $logs]);
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

        InventoryLog::create([
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

    private function generateUniqueCode()
    {
        $lastProduct = Product::orderBy('id', 'desc')->first();
        $nextId = $lastProduct ? $lastProduct->id + 1 : 1;
        $code = 'PC-' . str_pad($nextId, 5, '0', STR_PAD_LEFT);
        
        // Ensure uniqueness
        while (Product::where('code', $code)->exists()) {
            $nextId++;
            $code = 'PC-' . str_pad($nextId, 5, '0', STR_PAD_LEFT);
        }
        
        return $code;
    }

    private function generateSlug($name)
    {
        $slug = Str::slug($name);
        $originalSlug = $slug;
        $counter = 1;
        
        while (Product::where('slug', $slug)->exists()) {
            $slug = $originalSlug . '-' . $counter;
            $counter++;
        }
        
        return $slug;
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'quantity' => 'required|numeric',
            'buying_price' => 'nullable|numeric',
            'selling_price' => 'nullable|numeric',
            'quantity_alert' => 'nullable|numeric',
            'tax' => 'nullable|numeric',
            'tax_type' => 'nullable|string',
            'notes' => 'nullable|string',
            'product_image' => 'nullable|string',
            'category_id' => 'nullable|integer|exists:categories,id',
            'unit_id' => 'nullable|integer|exists:units,id',
        ]);

        $user = $request->user();

        // Auto-generate fields
        $slug = $this->generateSlug($request->name);
        $code = $this->generateUniqueCode();
        $storeName = $user->name . ' Store'; // Auto-generate store name from user

        $data = [
            'user_id' => $user->id,
            'uuid' => $user->uuid,
            'name' => $request->name,
            'store_name' => $storeName,
            'slug' => $slug,
            'code' => $code,
            'quantity' => $request->quantity,
            'buying_price' => $request->buying_price,
            'selling_price' => $request->selling_price,
            'quantity_alert' => $request->quantity_alert,
            'tax' => $request->tax,
            'tax_type' => $request->tax_type,
            'notes' => $request->notes,
            'product_image' => $request->product_image,
            'category_id' => $request->category_id ?? 10,
            'unit_id' => $request->unit_id ?? 10,
        ];

        Product::create($data);

        return redirect()->route('products.index')
            ->with('successMessage', 'Product created successfully!');
    }

    public function update(Request $request, Product $product)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'quantity' => 'required|numeric',
            'buying_price' => 'nullable|numeric',
            'selling_price' => 'nullable|numeric',
            'quantity_alert' => 'nullable|numeric',
            'tax' => 'nullable|numeric',
            'tax_type' => 'nullable|string',
            'notes' => 'nullable|string',
            'product_image' => 'nullable|string',
            'category_id' => 'nullable|integer|exists:categories,id',
            'unit_id' => 'nullable|integer|exists:units,id',
        ]);

        // Update slug if name changed
        $slug = $product->slug;
        if ($request->name !== $product->name) {
            $slug = $this->generateSlug($request->name);
        }

        $data = [
            'name' => $request->name,
            'slug' => $slug,
            'quantity' => $request->quantity,
            'buying_price' => $request->buying_price,
            'selling_price' => $request->selling_price,
            'quantity_alert' => $request->quantity_alert,
            'tax' => $request->tax,
            'tax_type' => $request->tax_type,
            'notes' => $request->notes,
            'product_image' => $request->product_image,
            'category_id' => $request->category_id,
            'unit_id' => $request->unit_id,
        ];

        $product->update($data);

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
        return Inertia::render('products/index');
    }

    // Barcode Scanning Feature
    public function scanBarcodes(Request $request)
{
    $request->validate([
        'product_id' => 'required|exists:products,id',
        'operation_type' => 'required|in:inbound,outbound',
        'barcodes' => 'required|array|min:1',
        'barcodes.*' => 'required|string',
    ]);

    $user = $request->user();
    $product = Product::findOrFail($request->product_id);
    $operationType = $request->operation_type;
    $barcodes = $request->barcodes;
    $totalBarcodes = count($barcodes);

    DB::beginTransaction();
    try {
        $savedBarcodes = [];

        foreach ($barcodes as $barcodeValue) {
            $existing = Barcode::where('barcode', $barcodeValue)
                ->where('product_id', $product->id)
                ->latest()
                ->first();

            // 🚫 Prevent scanning out again if already outbound
            if ($existing && $existing->operation_type === 'outbound' && $operationType === 'outbound') {
                DB::rollBack();
                return response()->json([
                    'success' => false,
                    'message' => "Barcode '{$barcodeValue}' has already been scanned outbound and cannot be scanned out again."
                ], 400);
            }

            // ✅ Otherwise create new scan record
            $barcode = Barcode::create([
                'product_id'     => $product->id,
                'product_code'   => $product->code,
                'product_name'   => $product->name,
                'barcode'        => $barcodeValue,
                'operation_type' => $operationType,
                'scanned_by'     => $user->name,
                'user_id'        => $user->id,
                'scanned_at'     => now(),
            ]);

            $savedBarcodes[] = $barcode;
        }

        // ✅ Update product quantity
        if ($operationType === 'inbound') {
            $newQuantity = $product->quantity + $totalBarcodes;
            $quantityChange = $totalBarcodes;
        } else { // outbound
            $newQuantity = $product->quantity - $totalBarcodes;
            $quantityChange = -$totalBarcodes;

            if ($newQuantity < 0) {
                DB::rollBack();
                return response()->json([
                    'success' => false,
                    'message' => 'Insufficient quantity. Cannot process outbound operation.'
                ], 400);
            }
        }

        $product->update(['quantity' => $newQuantity]);

        // ✅ Log the transaction
        InventoryLog::create([
            'product_name'    => $product->name,
            'product_code'    => $product->code,
            'quantity_added'  => $quantityChange,
            'remaining_qnty'  => $newQuantity,
            'added_by'        => $user->name,
            'product_unit_id' => $product->unit_id,
            'date_added'      => now(),
        ]);

        DB::commit();

        return response()->json([
            'success' => true,
            'message' => "{$totalBarcodes} barcodes scanned successfully!",
            'data' => [
                'total_scanned'  => $totalBarcodes,
                'operation_type' => $operationType,
                'new_quantity'   => $newQuantity,
                'barcodes'       => $savedBarcodes,
            ]
        ]);
    } catch (\Exception $e) {
        DB::rollBack();
        return response()->json([
            'success' => false,
            'message' => 'Failed to process barcodes: ' . $e->getMessage(),
        ], 500);
    }
}

    

    public function getBarcodeHistory($productId)
    {
        $barcodes = Barcode::where('product_id', $productId)
            ->orderBy('scanned_at', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'barcodes' => $barcodes
        ]);
    }
}