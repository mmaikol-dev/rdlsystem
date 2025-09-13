<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\SheetOrder;
use App\Models\Product;
use Carbon\Carbon;
use App\Models\Unit;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Http;

class UpdateProductQuantities extends Command
{
    protected $signature = 'products:update-quantities';
    protected $description = 'Update product quantities when an order status changes to Delivered';

    public function __construct()
    {
        parent::__construct();
    }

   

public function handle()
{
    Log::info('Starting products:update-quantities command');

    try {
        $startOfMonth = Carbon::now()->startOfMonth();
        $endOfMonth   = Carbon::now()->endOfMonth();

        $orders = SheetOrder::where('status', 'Delivered')
                            ->where('processed', '0')
                            ->whereBetween('delivery_date', [$startOfMonth, $endOfMonth])
                            ->get();

        Log::info('Fetched orders for processing', ['order_count' => $orders->count()]);

        foreach ($orders as $order) {
            $this->processOrder($order); // each order handles its own transaction
        }

        $this->info('Product quantities update process completed.');
        Log::info('Product quantities update process completed.');
    } catch (\Exception $e) {
        Log::error('Error in UpdateProductQuantities command', ['error' => $e->getMessage()]);
    }

    Log::info('Completed products:update-quantities command');
}



private function processOrder($order)
{
    Log::info('Processing order', [
        'order_id' => $order->id, 
        'raw_product_name' => $order->product_name,
        'normalized_product_name' => $this->normalizeProductName($order->product_name),
        'product_name_length' => strlen(trim($order->product_name))
    ]);

    DB::beginTransaction();

    try {
        $unitName = $order->merchant;
        $unit = Unit::where('name', $unitName)->first();

        if (!$unit) {
            Log::error('Unit not found', ['unit_name' => $unitName, 'order_id' => $order->id]);
            throw new \Exception('Unit not found');
        }

        Log::info('Unit found', ['unit_id' => $unit->id, 'unit_name' => $unitName]);

        $normalizedProductName = $this->normalizeProductName($order->product_name);

        // Try exact match first
        $products = Product::where('unit_id', $unit->id)
                           ->whereRaw('LOWER(TRIM(name)) = ?', [$normalizedProductName])
                           ->get();

        // If no match, try Gemini AI
        if ($products->isEmpty()) {
            $availableProducts = Product::where('unit_id', $unit->id)
                                        ->pluck('name')
                                        ->toArray();

            $bestMatch = $this->getGeminiBestMatch($order->product_name, $availableProducts);

            if ($bestMatch) {
                $products = Product::where('unit_id', $unit->id)
                                   ->whereRaw('LOWER(TRIM(name)) = ?', [strtolower(trim($bestMatch))])
                                   ->get();
            }

            if ($products->isEmpty()) {
                Log::error('No matching products found', [
                    'unit_id' => $unit->id, 
                    'product_name' => $normalizedProductName,
                    'available_products' => $availableProducts
                ]);
                throw new \Exception('No matching products found');
            }
        }

        // Update product quantities & insert into inventory_log
        foreach ($products as $product) {
            Log::info('Product found', [
                'product_id' => $product->id,
                'current_quantity' => $product->quantity
            ]);

            $newQuantity = max($product->quantity - $order->quantity, 0);

            // Update the product table
            $product->quantity = $newQuantity;
            $product->timestamps = false;
            $product->save();

            // Insert into inventory_log table
            DB::table('inventory_logs')->insert([
                'product_name'     => $product->name,
                'product_code'     => $product->code,
                'remaining_qnty'   => $newQuantity,  
                'quantity_added'   => -$order->quantity, // negative for deduction
                'added_by'         => 'Warehouse Ai',
                'product_unit_id'  => $product->unit_id,
                'date_added'       => now(),
                'created_at'       => now(),
                'updated_at'       => now(),
            ]);

            Log::info('Product quantity updated & inventory log added', [
                'order_id' => $order->id,
                'product_id' => $product->id,
                'quantity_subtracted' => $order->quantity,
                'new_quantity' => $product->quantity,
            ]);
        }

        // Mark order processed
        $order->processed = true;
        $order->timestamps = false;
        $order->save();

        Log::info('Order marked as processed', ['order_id' => $order->id]);

        DB::commit();
    } catch (\Exception $e) {
        DB::rollBack();
        Log::error('Error processing order', [
            'order_id' => $order->id,
            'error' => $e->getMessage()
        ]);
    }
}


    private function normalizeProductName($name)
    {
        return strtolower(trim(preg_replace('/\s+/', ' ', $name)));
    }

    private function getGeminiBestMatch($orderProductName, $availableProducts)
{
    $apiKey = 'AIzaSyBSaG6kUZs3WIPN4AgjFTPErDa10hgemAk'; // Hardcoded for testing
    $url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={$apiKey}";

    $prompt = "The ordered product is: '{$orderProductName}'. 
    From this list: " . implode(", ", $availableProducts) . ". 
    Return ONLY the single most likely matching product name from the list without extra text.";

    $payload = [
        'contents' => [
            [
                'parts' => [
                    ['text' => $prompt]
                ]
            ]
        ]
    ];

    $maxRetries = 3;
    $attempt = 0;

    while ($attempt < $maxRetries) {
        try {
            $attempt++;
            Log::info("Calling Gemini API - Attempt {$attempt}");

            $response = Http::timeout(60)->post($url, $payload);

            if ($response->successful()) {
                $json = $response->json();
                return $json['candidates'][0]['content']['parts'][0]['text'] ?? null;
            }

            if ($response->status() == 429) {
                // Parse retryDelay if present
                $retryDelay = 40; // default seconds
                $body = $response->json();
                if (!empty($body['error']['details'])) {
                    foreach ($body['error']['details'] as $detail) {
                        if (isset($detail['@type']) && $detail['@type'] === 'type.googleapis.com/google.rpc.RetryInfo') {
                            if (isset($detail['retryDelay'])) {
                                $retryDelay = (int) filter_var($detail['retryDelay'], FILTER_SANITIZE_NUMBER_INT);
                            }
                        }
                    }
                }
                Log::warning("Gemini quota hit. Waiting {$retryDelay} seconds before retry...");
                sleep($retryDelay);
                continue;
            }

            Log::error('Gemini API request failed', [
                'status' => $response->status(),
                'body' => $response->body()
            ]);
            break;

        } catch (\Exception $e) {
            Log::error('Error calling Gemini API', ['error' => $e->getMessage()]);
            // Wait before retrying
            sleep(5);
        }
    }

    return null;
}

}
