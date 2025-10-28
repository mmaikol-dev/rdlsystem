<?php

namespace App\Http\Controllers;

use App\Models\AppScript;
use App\Models\Sheet;
use App\Models\SheetOrder;
use Illuminate\Support\Facades\Log;



use Illuminate\Http\Request;

class AppScriptController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        //
    }


    public function storeOrder(Request $request)
    {
        try {
            // Clean amount: remove non-digit characters (e.g., KSH)
            $cleanAmount = preg_replace('/[^\d.]/', '', $request->input('amount'));
    
            // Clean quantity: extract number only (e.g., "1 pack" → 1)
            preg_match('/\d+/', $request->input('quantity'), $matches);
            $cleanQuantity = isset($matches[0]) ? (int)$matches[0] : null;
    
            // Merge cleaned data
            $request->merge([
                'order_no' => (string) $request->input('order_no'),
                'delivery_date' => $request->input('delivery_date'),
                'amount' => $cleanAmount,
                'client_name' => $request->input('client_name'),
                'quantity' => $cleanQuantity,
                'phone' => $request->input('phone'),
                'alt_no' => $request->input('alt_no'),
                'address' => $request->input('address'),
                'product_name' => $request->input('product_name'),
            ]);
    
            // Validate
            $validatedData = $request->validate([
                'order_no' => 'required|string|max:255',
                'order_date' => 'required|date',
                'amount' => 'required|numeric',
                'quantity' => 'required|integer',
                'client_name' => 'nullable|string|max:255',
                'address' => 'nullable|string',
                'city' => 'nullable|string',
                'store_name' => 'required|string',
                'alt_no' => 'nullable|string',
                'country' => 'nullable|string',
                'phone' => 'nullable|string|max:15',
                'product_name' => 'nullable|string|max:255',
                'status' => 'nullable|string',
                'delivery_date' => 'nullable|date',
                'agent' => 'nullable|string',
                'sheet_id' => 'nullable|string',
                'sheet_name' => 'nullable|string',
                'merchant' => 'nullable|string',
            ]);
    
            // Default cc_email
            $validatedData['cc_email'] = null;
    
            // ✅ Assign cc_email from sheet's cc_agents JSON (per sheet_name)
            if (!empty($validatedData['sheet_id']) && !empty($validatedData['sheet_name'])) {
                Log::info("Assigning cc_email", [
                    'sheet_id' => $validatedData['sheet_id'],
                    'sheet_name' => $validatedData['sheet_name']
                ]);
    
                $sheet = Sheet::where('sheet_id', $validatedData['sheet_id'])->first();
    
                if ($sheet && !empty($sheet->cc_agents)) {
                    $agentsConfig = json_decode($sheet->cc_agents, true);
                    Log::info("Decoded cc_agents JSON", ['agentsConfig' => $agentsConfig]);
    
                    if (isset($agentsConfig[$validatedData['sheet_name']])) {
                        $agents = $agentsConfig[$validatedData['sheet_name']];
                        Log::info("Agents for this sheet_name", ['agents' => $agents]);
    
                        if (!empty($agents)) {
                            $orderCount = SheetOrder::where('sheet_id', $validatedData['sheet_id'])
                                                    ->where('sheet_name', $validatedData['sheet_name'])
                                                    ->count();
                            Log::info("Order count for this sheet_id + sheet_name", ['orderCount' => $orderCount]);
    
                            $agentIndex = $orderCount % count($agents);
                            $validatedData['cc_email'] = $agents[$agentIndex];
    
                            Log::info("Assigned cc_email", ['cc_email' => $validatedData['cc_email']]);
                        } else {
                            Log::warning("No agents found for sheet_name", ['sheet_name' => $validatedData['sheet_name']]);
                        }
                    } else {
                        Log::warning("No agent config found for sheet_name", [
                            'sheet_name' => $validatedData['sheet_name'],
                            'availableKeys' => array_keys($agentsConfig)
                        ]);
                    }
                } else {
                    Log::warning("No sheet or empty cc_agents found", ['sheet' => $sheet]);
                }
            }
    
            // Check for existing order
            $existingOrder = SheetOrder::where('order_no', $validatedData['order_no'])->first();
            if ($existingOrder) {
                foreach ($validatedData as $key => $value) {
                    if (empty($existingOrder->$key) && $value !== null) {
                        $existingOrder->$key = $value;
                    }
                }
    
                $existingOrder->updated_at = null;
                $existingOrder->save();
    
                Log::info("Existing order updated", ['order_no' => $validatedData['order_no']]);
    
                return response()->json([
                    'message' => 'Order already exists and was updated',
                    'order_no' => $validatedData['order_no']
                ], 200);
            }
    
            // Save new order
            $validatedData['updated_at'] = null;
            $sheetOrder = SheetOrder::create($validatedData);
    
            Log::info("New order created", ['order_no' => $validatedData['order_no'], 'cc_email' => $validatedData['cc_email']]);
    
            return response()->json([
                'message' => 'Order successfully created',
                'data' => $sheetOrder
            ], 201);
    
        } catch (\Exception $e) {
            Log::error("Error creating order", ['error' => $e->getMessage()]);
            return response()->json([
                'message' => 'Error creating order',
                'error' => $e->getMessage()
            ], 500);
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
    public function show(AppScript $appScript)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(AppScript $appScript)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, AppScript $appScript)
    {
        //
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(AppScript $appScript)
    {
        //
    }
}
