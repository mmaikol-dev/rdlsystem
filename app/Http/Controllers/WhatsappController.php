<?php

namespace App\Http\Controllers;

use App\Models\SheetOrder;
use App\Models\Whatsapp;
use Illuminate\Support\Facades\Http;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log; 


class WhatsappController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        //
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        //
    }

    public function sendMessage($id)
{
    Log::info("📤 Sending WhatsApp for Order ID: $id");

    try {
        $order = SheetOrder::findOrFail($id);

        $client_name = $order->client_name ?? 'Client';
        $store_name = strtoupper($order->store_name ?? 'STORE');
        $order_no = $order->order_no;
        $product_name = $order->product_name;
        $quantity = $order->quantity;
        $amount = $order->amount;

        // Format phone number
        $phone = $this->formatPhoneNumber($order->phone, $store_name);
        if (!$phone) {
            Log::warning("📞 Primary phone invalid. Trying alt_no.");
            $phone = $this->formatPhoneNumber($order->alt_no, $store_name);
        }

        if (!$phone) {
            Log::error("❌ Both phone and alt_no are invalid.");
            return response()->json(['error' => 'Invalid phone number and alt_no.'], 400);
        }

        // Select template and phone number ID based on store
        switch ($store_name) {
            case 'RDL1':
                $templateName = 'delivery_reminder_rdl1';
                $phoneNumberId = '111111111111111'; // Replace with your actual Meta phone number ID
                $messageParams = [
                    ['type' => 'text', 'text' => $client_name],
                    ['type' => 'text', 'text' => $order_no],
                    ['type' => 'text', 'text' => $product_name],
                    ['type' => 'text', 'text' => (string) $quantity],
                    ['type' => 'text', 'text' => 'KES ' . number_format($amount)],
                ];
                break;

            case 'RDL2':
                $templateName = 'pending_template';
                $phoneNumberId = '631368316726669'; // Replace with your actual Meta phone number ID
                $messageParams = [
                    ['type' => 'text', 'text' => $client_name],
                    ['type' => 'text', 'text' => $order_no],
                    ['type' => 'text', 'text' => $product_name],
                    ['type' => 'text', 'text' => (string) $quantity],
                    ['type' => 'text', 'text' => 'KES ' . number_format($amount)],
                ];
                break;

            case 'RDL3':
                $templateName = 'reminder_tz';
                $phoneNumberId = '333333333333333'; // Replace with your actual Meta phone number ID
                $messageParams = [
                    ['type' => 'text', 'text' => $client_name],
                    ['type' => 'text', 'text' => $order_no],
                    ['type' => 'text', 'text' => $product_name],
                    ['type' => 'text', 'text' => (string) $quantity],
                    ['type' => 'text', 'text' => 'TZS ' . number_format($amount)],
                ];
                break;

            default:
                Log::error("❌ Unknown store: {$store_name}");
                return response()->json(['error' => "Unknown store: {$store_name}"], 422);
        }

        $accessToken = 'EAATOJZAktrZCIBO0R4rZBbORtSRYFkx1YyOXDfqK6UVNAJtoR15qdrBK8TFPycqxDLdaAZC3ujEQWcWBZASyyvqMAS3Lk7WYzjmQH1K9Vwl9I6EQhoZAZAalquTQs3zHW4cT1Q1qRbX566ti7xy285BZCZCiO6g5EnpXhdoyCc4Iq2Q8T57BMKtbFNNSZBipMw0Aw3'; // 👈 Replace with your actual token
        $url = "https://graph.facebook.com/v22.0/{$phoneNumberId}/messages";

        $response = Http::withToken($accessToken)->post($url, [
            'messaging_product' => 'whatsapp',
            'to' => $phone,
            'type' => 'template',
            'template' => [
                'name' => $templateName,
                'language' => ['code' => 'en'],
                'components' => [
                    [
                        'type' => 'body',
                        'parameters' => $messageParams
                    ]
                ]
            ]
        ]);

        if ($response->successful()) {
            Log::info("✅ WhatsApp sent to {$phone}");

            Whatsapp::create([
                'to' => $phone,
                'client_name' => $client_name,
                'store_name' => $store_name,
                'message' => "Hi {$client_name}, this is Realdeal Logistics, We tried contacting you regarding your order {$order_no} for {$product_name} ({$quantity} pcs) but your phone was unreachable.

Please call us back on 0734336218 to confirm your availability so we can deliver your order.

Thank you.",
                'status' => 'sent',
                'sid' => $response->json('messages.0.id') ?? null,
            ]);

            return back()->with('success', 'WhatsApp message sent successfully ✅');

        } else {
            Log::error("❌ WhatsApp API error", ['response' => $response->body()]);
            return back()->with('error', 'Failed to send WhatsApp message ❌');

        }

    } catch (\Exception $e) {
        Log::error("❌ WhatsApp sending failed", ['error' => $e->getMessage()]);
        return back()->with('error', 'Failed to send WhatsApp message ❌');

    }
}



private function formatPhoneNumber($phoneNumber, $storeName)
{
    $phoneNumber = preg_replace('/\D/', '', $phoneNumber);
    $countryCode = strtoupper($storeName) === 'RDL3' ? '+255' : '+254';

    // Must be at least 9 digits
    if (empty($phoneNumber) || strlen($phoneNumber) < 9) {
        return null;
    }

    if (str_starts_with($phoneNumber, '0')) {
        return $countryCode . substr($phoneNumber, 1);
    } elseif (str_starts_with($phoneNumber, '254') || str_starts_with($phoneNumber, '255')) {
        return '+' . $phoneNumber;
    } else {
        return $countryCode . $phoneNumber;
    }
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
    public function show(Whatsapp $whatsapp)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Whatsapp $whatsapp)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Whatsapp $whatsapp)
    {
        //
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Whatsapp $whatsapp)
    {
        //
    }
}
