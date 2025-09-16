<?php
// app/Console/Commands/SendScheduledOrders.php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\SheetOrder; // Ensure you import the correct model
use Illuminate\Support\Facades\Log;
use GuzzleHttp\Client;

class SendScheduledOrders extends Command
{
    protected $signature = 'orders:send-scheduled';
    protected $description = 'Send orders with scheduled or rescheduled status and today\'s delivery date at 8:00 AM';

    public function __construct()
    {
        parent::__construct();
    }

    public function handle()
    {
        $today = now()->format('Y-m-d'); // Assuming the delivery date is stored in Y-m-d format
        $sendTime = now()->setTime(8, 0)->format('Y-m-d H:i:s'); // Set the send time to 8:00 AM today

        $orders = SheetOrder::whereIn('status', ['scheduled', 'rescheduled'])
                    ->whereDate('delivery_date', $today)
                    ->get();

        // Collect messages for bulk sending
        $smsList = [];
        $client = new Client();
        $apiUrl = 'https://quicksms.advantasms.com/api/services/sendbulk/';
        $apiKey = '02a22646523f127b31b5423ae8ab92d0';
        $partnerID = '10851';

        foreach ($orders as $order) {
            $formattedPhone = $this->formatPhoneNumber($order->phone);
            if (!$formattedPhone) {
                Log::warning("Invalid phone number skipped: {$order->phone}");
                continue; // Skip invalid numbers
            }

            $message = $this->generateMessage($order);
            $smsList[] = [
                "partnerID" => $partnerID,
                "apikey" => $apiKey,
                "mobile" => $formattedPhone,
                "message" => $message,
                "shortcode" => 'Real Deal',
                "timeToSend" => $sendTime,
                "clientsmsid" => $order->id, // Unique ID for tracking
                "pass_type" => "plain"
            ];

            // Send in batches of 20
            if (count($smsList) === 20) {
                $this->sendBulkMessages($client, $apiUrl, $smsList);
                $smsList = []; // Reset list after sending
            }
        }

        // Send any remaining messages
        if (!empty($smsList)) {
            $this->sendBulkMessages($client, $apiUrl, $smsList);
        }
    }

private function formatPhoneNumber($phone)
{
    // Remove any non-numeric characters
    $phone = preg_replace('/\D/', '', $phone);

    // If the number starts with '2540', remove the extra zero
    if (preg_match('/^2540(\d{9})$/', $phone, $matches)) {
        return '254' . $matches[1]; // Convert 2540798010311 → 254798010311
    }

    // If the number has 9 digits and starts with 7 (like 798010311), assume it's missing '0'
    if (preg_match('/^7\d{8}$/', $phone)) {
        return '254' . $phone; // Convert 798010311 → 254798010311
    }

    // If the number starts with 0 and has 10 digits (e.g., 0798010311)
    if (preg_match('/^0\d{9}$/', $phone)) {
        return '254' . substr($phone, 1); // Convert 0712345678 → 254712345678
    }

    // If the number is already in the correct 12-digit format (e.g., 2547XXXXXXXX)
    if (preg_match('/^2547\d{8}$/', $phone)) {
        return $phone; // Already valid, return as is
    }

    return false; // Invalid number
}


private function generateMessage($order)
{
    $contact = '0740801187'; // Default contact for RDL1 or others

    if (strtoupper($order->store_name) === 'RDL2') {
        $contact = '+254 758 306343';
    }

    $template = "Hello, this is Realdeal Logistics your order ORDERNO for PRODUCT (QNTY pcs) valued at KshPRICE is scheduled for delivery today. Contact CONTACT for queries. Thank you!";

    $message = str_replace('ORDERNO', $order->order_no, $template);
    $message = str_replace('PRODUCT', $order->product_name, $message);
    $message = str_replace('QNTY', $order->quantity, $message);
    $message = str_replace('PRICE', $order->amount, $message);
    $message = str_replace('CONTACT', $contact, $message);

    return $message;
}


    private function sendBulkMessages($client, $apiUrl, $smsList)
    {
        $data = [
            "count" => count($smsList),
            "smslist" => $smsList
        ];

        try {
            $response = $client->post($apiUrl, [
                'json' => $data,
                'headers' => [
                    'Content-Type' => 'application/json'
                ]
            ]);

            $responseBody = json_decode($response->getBody(), true);

            // Log the API response
            Log::info("Bulk SMS API Response", ['response' => $responseBody]);

        } catch (\Exception $e) {
            // Log the exception
            Log::error('Error sending bulk messages', ['error' => $e->getMessage()]);
        }
    }
}
