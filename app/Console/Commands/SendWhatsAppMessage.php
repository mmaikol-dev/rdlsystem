<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use App\Models\Whatsapp;
use App\Models\SheetOrder;
use Carbon\Carbon;
use WasenderApi\WasenderClient;
use WasenderApi\Exceptions\WasenderApiException;
use Exception;

class SendWhatsAppMessage extends Command
{
    protected $signature = 'whatsapp:send-meta';
    protected $description = 'Send WhatsApp messages via WasenderAPI for scheduled orders';

    // 🔧 HARDCODED FOR TESTING - Replace with your WasenderAPI key
    private $apiKey = '800bd2a1e9ec63c98996e734f9cad6f5f2713f49295dd3c4589313df10758a9c'; // 👈 Get from https://wasenderapi.com/dashboard
    
    /**
     * Get WasenderAPI client instance
     */
    private function getClient()
    {
        // For testing: hardcoded API key
        return new WasenderClient($this->apiKey);
        
        // For production: uncomment this and comment out the line above
        // Then set WASENDERAPI_API_KEY in your .env file
        // return app(WasenderClient::class);
    }

    public function handle()
    {
        Log::info('Starting SendWhatsAppMessage command with WasenderAPI');

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

                // Build delivery message based on store
                $message = $this->buildDeliveryMessage($store_name, $client_name, $order_no, $product_name, $quantity, $amount);

                if (!$message) {
                    Log::warning("Unknown store_name: {$store_name}. Skipping order.");
                    continue;
                }

                // Send via WasenderAPI
                $client = $this->getClient();
                $response = $client->sendText($toPhone, $message);

                // Extract message ID from response
                $messageId = $response['data']['key']['id'] ?? null;

                // Store in database
                Whatsapp::create([
                    'to' => $toPhone,
                    'client_name' => $client_name,
                    'store_name' => $store_name,
                    'message' => "Hi {$client_name}, this is Realdeal Logistics, your order {$order_no} for {$product_name} ({$quantity} pcs) is scheduled for delivery today. For any questions, please call 0740801187. Thank you.",
                    'status' => 'sent',
                    'sid' => $messageId,
                ]);

                $this->info("✅ Message sent to {$toPhone}");

            } catch (WasenderApiException $e) {
                Log::error('❌ Failed to send WasenderAPI message', [
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

            } catch (Exception $e) {
                Log::error('❌ Failed to send WhatsApp message', [
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

        Log::info('SendWhatsAppMessage command completed.');
    }

    /**
     * Build delivery message based on store
     */
    private function buildDeliveryMessage($store_name, $client_name, $order_no, $product_name, $quantity, $amount)
    {
        switch ($store_name) {
            case 'RDL1':
                return "🚚 *RealDeal Logistics - Delivery Reminder*\n\n"
                    . "Hi *{$client_name}*,\n\n"
                    . "Your order is scheduled for delivery today! 🎉\n\n"
                    . "*Order Details:*\n"
                    . "• Product: {$product_name}\n"
                    . "• Quantity: {$quantity} pcs\n\n"
                    . "Please ensure you're available to receive your order.\n"
                    . "For any questions, call: *0740801187*\n\n"
                    . "Thank you for choosing RealDeal Logistics! 🙏";

            case 'RDL2':
                return "🚚 *RealDeal Logistics - Delivery Reminder*\n\n"
                    . "Hi *{$client_name}*,\n\n"
                    . "Your order is scheduled for delivery today! 🎉\n\n"
                    . "*Order Details:*\n"
                    . "• Order No: {$order_no}\n"
                    . "• Product: {$product_name}\n"
                    . "• Quantity: {$quantity} pcs\n"
                    . "• Amount: KES " . number_format($amount) . "\n\n"
                    . "Please ensure you're available to receive your order.\n"
                    . "For any questions, call: *0740801187*\n\n"
                    . "Thank you for choosing RealDeal Logistics! 🙏";

            case 'RDL3':
                return "🚚 *RealDeal Logistics Tanzania - Delivery Reminder*\n\n"
                    . "Hi *{$client_name}*,\n\n"
                    . "Your order is scheduled for delivery today! 🎉\n\n"
                    . "*Order Details:*\n"
                    . "• Order No: {$order_no}\n"
                    . "• Product: {$product_name}\n"
                    . "• Quantity: {$quantity} pcs\n"
                    . "• Amount: TZS " . number_format($amount) . "\n\n"
                    . "Please ensure you're available to receive your order.\n"
                    . "For any questions, call: *0740801187*\n\n"
                    . "Asante sana kwa kuchagua RealDeal Logistics! 🙏";

            default:
                return null;
        }
    }

    /**
     * Format phone number for WasenderAPI (no + prefix)
     */
    private function formatPhoneNumber($phoneNumber, $storeName)
    {
        // Remove all non-numeric characters
        $phoneNumber = preg_replace('/\D/', '', $phoneNumber);
        
        // Determine country code
        $countryCode = $storeName === 'RDL3' ? '255' : '254';

        // Remove leading zero and add country code
        if (str_starts_with($phoneNumber, '0')) {
            return $countryCode . substr($phoneNumber, 1);
        }

        // If already has country code, use as-is (no + prefix for WasenderAPI)
        if (str_starts_with($phoneNumber, '254') || str_starts_with($phoneNumber, '255')) {
            return $phoneNumber;
        }

        // Otherwise add country code
        return $countryCode . $phoneNumber;
    }
}