<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Http;
use App\Models\Whatsapp;
use App\Models\SheetOrder;
use Carbon\Carbon;
use Exception;

class SendWhatsAppMessage extends Command
{
    protected $signature = 'whatsapp:send-meta';
    protected $description = 'Send WhatsApp messages via Meta Graph API using registered templates';

   
    public function handle()
    {
        Log::info('Starting SendWhatsAppMessageMeta command');

        $accessToken = 'EAATOJZAktrZCIBPYF9IkoaVtZAC4gUBeAqdonpFeF2SZA6Gq4IMAiJRMh9f8MM35wn1P2ZCr83e1H0whjX7ZCUiz04ZAuuuSTF7WJhr1WPOE0SXSqEvTqZApdtjeWLjEOIZBA3kiNnH8LMDLE1Nu1ZBpJbwAn9EU5aic6FXL3aZBkTYZAX9HTbWNStHKR2APBbDu'; // 🔒 Hardcoded Meta access token

        $today = Carbon::today();

        $orders = SheetOrder::where('status', 'Scheduled')
            ->whereDate('delivery_date', $today)
            ->get();

        if ($orders->isEmpty()) {
            Log::info('No scheduled orders found for today.');
            return;
        }

        foreach ($orders as $order) {
            try {
                $client_name = $order->client_name ?? 'Client';
                $store_name = strtoupper($order->store_name ?? 'Store');
                $order_no = $order->order_no;
                $product_name = $order->product_name;
                $quantity = $order->quantity;
                $amount = $order->amount;

                $toPhone = $this->formatPhoneNumber($order->phone, $store_name);

                switch ($store_name) {
                            case 'RDL1':
                                $templateName = 'delivery_reminder';
                                $languageCode = 'en';
                                $phoneNumberId = '631368316726669'; // Replace with actual RDL1 number ID
                                $messageParams = [
                                    ['type' => 'text', 'text' => $client_name],
                                    ['type' => 'text', 'text' => $product_name],
                                    ['type' => 'text', 'text' => $quantity],
                                ];
                                break;
                        
                            case 'RDL2':
                                $templateName = 'delivery_reminder';
                                $languageCode = 'en';
                                $phoneNumberId = '631368316726669'; // Replace with actual RDL2 number ID
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
                                $languageCode = 'en';
                                $phoneNumberId = '333333333333333'; // Replace with actual RDL3 number ID
                                $messageParams = [
                                    ['type' => 'text', 'text' => $client_name],
                                    ['type' => 'text', 'text' => $order_no],
                                    ['type' => 'text', 'text' => $product_name],
                                    ['type' => 'text', 'text' => (string) $quantity],
                                    ['type' => 'text', 'text' => 'TZS ' . number_format($amount)],
                                ];
                                break;
                        
                            default:
                                Log::warning("Unknown store_name: {$store_name}. Skipping order.");
                                continue 2;
                        }

                $response = Http::withToken($accessToken)
                ->post("https://graph.facebook.com/v22.0/{$phoneNumberId}/messages", [
                        'messaging_product' => 'whatsapp',
                        'to' => $toPhone,
                        'type' => 'template',
                        'template' => [
                            'name' => $templateName,
                            'language' => ['code' => $languageCode],
                            'components' => [
                                [
                                    'type' => 'body',
                                    'parameters' => $messageParams
                                ]
                            ]
                        ]
                    ]);

                if ($response->successful()) {
                    $messageId = $response->json()['messages'][0]['id'] ?? null;

                   Whatsapp::create([
                                                        'to' => $toPhone,
                                                        'client_name' => $client_name,
                                                        'store_name' => $store_name,
                                                        'message' => "Hi {$client_name}, this is Realdeal Logistics, your order {$order_no} for {$product_name} ({$quantity} pcs) is scheduled for delivery today. For any questions, please call 0740801187. Thank you.",
                                                        'status' => 'sent',
                                                        'sid' => $messageId,
                                        ]);


                    $this->info("✅ Message sent to {$toPhone}");
                } else {
                    throw new Exception($response->body());
                }

            } catch (Exception $e) {
                Log::error('❌ Failed to send Meta WhatsApp message', [
                    'error' => $e->getMessage(),
                    'phone' => $order->phone,
                ]);

                Whatsapp::create([
                    'to' => $order->phone,
                    'client_name' => $order->client_name,
                    'store_name' => $order->store_name,
                    'message' => "Hi {$client_name}, this is Realdeal Logistics, your order {$order_no} for {$product_name} ({$quantity} pcs) is scheduled for delivery today. For any questions, please call 0740801187. Thank you.",
                    'status' => 'failed',
                    'sid' => null,
                ]);

                $this->error("❌ Error: " . $e->getMessage());
            }
        }

        Log::info('SendWhatsAppMessageMeta command completed.');
    }

    private function formatPhoneNumber($phoneNumber, $storeName)
    {
        $phoneNumber = preg_replace('/\D/', '', $phoneNumber);
        $countryCode = $storeName === 'RDL3' ? '+255' : '+254';

        if (str_starts_with($phoneNumber, '0')) {
            return $countryCode . substr($phoneNumber, 1);
        }

        if (str_starts_with($phoneNumber, '254') || str_starts_with($phoneNumber, '255')) {
            return '+' . $phoneNumber;
        }

        return $countryCode . $phoneNumber;
    }
}
