<?php

namespace App\Http\Controllers;

use App\Models\SheetOrder;
use App\Models\User;
use Illuminate\Support\Facades\Storage;
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
    
    
      public function sendChat(Request $request)
{
    Log::info("📩 Incoming sendChat request", $request->all());

    $request->validate([
        'to' => 'required|string',   // phone comes from frontend
        'message' => 'required|string',
    ]);

    $phone = $this->formatPhoneNumber($request->to, 'RDL1');
    if (!$phone) {
        Log::error("❌ Invalid phone number", ['to' => $request->to]);
        return response()->json(['error' => 'Invalid phone number'], 400);
    }

    // Get current logged-in user username
   // Get current logged-in user username
$user = auth()->user();
$username = $user && isset($user->username) && $user->username
    ? $user->username
    : 'Callcenter1'; // fallback if username is missing


    $accessToken = 'EAATOJZAktrZCIBPYF9IkoaVtZAC4gUBeAqdonpFeF2SZA6Gq4IMAiJRMh9f8MM35wn1P2ZCr83e1H0whjX7ZCUiz04ZAuuuSTF7WJhr1WPOE0SXSqEvTqZApdtjeWLjEOIZBA3kiNnH8LMDLE1Nu1ZBpJbwAn9EU5aic6FXL3aZBkTYZAX9HTbWNStHKR2APBbDu'; // 👈 replace with your permanent/60-day token
    $phoneNumberId = '631368316726669'; // 👈 replace with your Meta phone number ID
    $url = "https://graph.facebook.com/v22.0/{$phoneNumberId}/messages";

    Log::info("🚀 Sending WhatsApp template", [
        'to' => $phone,
        'username' => $username,
        'message' => $request->message
    ]);

    $response = Http::withToken($accessToken)->post($url, [
        'messaging_product' => 'whatsapp',
        'to' => $phone,
        'type' => 'template',
        'template' => [
            'name' => 'chatrdl',
            'language' => ['code' => 'en'],
            'components' => [[
                'type' => 'body',
                'parameters' => [
                    ['type' => 'text', 'text' => $username],         // {{1}}
                    ['type' => 'text', 'text' => $request->message], // {{2}}
                ],
            ]],
        ],
    ]);

    if ($response->successful()) {
        $sid = $response->json('messages.0.id');

        Whatsapp::create([
            'to' => $phone,
            'client_name' => $username,
            'store_name' => 'CHAT',
         'message' => "Talking to {$username} from RealDeal.\nMessage: {$request->message}",
            'status' => 'sent',
            'sid' => $sid,
            'type' => 'template',
        ]);

        Log::info("✅ WhatsApp message sent", ['sid' => $sid]);

        return response()->json(['success' => true, 'sid' => $sid]);
    } else {
        Log::error("❌ Template send failed", ['resp' => $response->body()]);
        return response()->json(['error' => 'Failed to send', 'resp' => $response->json()], 500);
    }
}

    public function sendMessage($id)
{
    Log::info("📤 Sending WhatsApp for Order ID: $id");

    try {
        $order = SheetOrder::findOrFail($id);

        $client_name = $order->client_name ?? 'Client';
        $store_name = strtoupper($order->store_name ?? 'STORE');
        $order_no = $order->order_no;
        $user=$order->cc_email;
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

        $accessToken = 'EAATOJZAktrZCIBPYF9IkoaVtZAC4gUBeAqdonpFeF2SZA6Gq4IMAiJRMh9f8MM35wn1P2ZCr83e1H0whjX7ZCUiz04ZAuuuSTF7WJhr1WPOE0SXSqEvTqZApdtjeWLjEOIZBA3kiNnH8LMDLE1Nu1ZBpJbwAn9EU5aic6FXL3aZBkTYZAX9HTbWNStHKR2APBbDu'; // 👈 Replace with your actual token
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
                'user' => $order->cc_email, // 👈 Save the cc_email of the order here
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


// Inside WhatsappController.php

public function webhook(Request $request)
{
    // Log everything that comes from WhatsApp
    Log::info("📩 WhatsApp Webhook received", $request->all());
    
    // ✅ 1. Handle verification challenge from Meta
    if ($request->has('hub_mode') && $request->hub_mode === 'subscribe') {
        $verifyToken = 'realdeal_token'; // 👈 Your verify token (hardcoded for testing)
        if ($request->hub_verify_token === $verifyToken) {
            return response($request->hub_challenge, 200);
        } else {
            return response('Invalid verification token', 403);
        }
    }
    
    // ✅ 2. Handle messages and status updates
    if ($request->has('entry')) {
        foreach ($request->entry as $entry) {
            if (!empty($entry['changes'])) {
                foreach ($entry['changes'] as $change) {
                    $value = $change['value'];
                    
                    // Message received from customer
                    if (isset($value['messages'])) {
                        foreach ($value['messages'] as $message) {
                            Log::info("📨 Incoming message", $message);
                            
                            $messageText = 'N/A';
                            $mediaUrl = null;
                            $mediaType = null;
                            
                            // Handle different message types
                            if (isset($message['text'])) {
                                // Text message
                                $messageText = $message['text']['body'];
                            } elseif (isset($message['image'])) {
                                // Image message
                                $mediaType = 'image';
                                $mediaUrl = $this->downloadMedia($message['image']['id']);
                                $messageText = $message['image']['caption'] ?? 'Image received';
                            } elseif (isset($message['document'])) {
                                // Document message
                                $mediaType = 'document';
                                $mediaUrl = $this->downloadMedia($message['document']['id']);
                                $messageText = $message['document']['filename'] ?? 'Document received';
                            } elseif (isset($message['video'])) {
                                // Video message
                                $mediaType = 'video';
                                $mediaUrl = $this->downloadMedia($message['video']['id']);
                                $messageText = $message['video']['caption'] ?? 'Video received';
                            } elseif (isset($message['audio'])) {
                                // Audio message
                                $mediaType = 'audio';
                                $mediaUrl = $this->downloadMedia($message['audio']['id']);
                                $messageText = 'Audio message received';
                            } elseif (isset($message['voice'])) {
                                // Voice message
                                $mediaType = 'voice';
                                $mediaUrl = $this->downloadMedia($message['voice']['id']);
                                $messageText = 'Voice message received';
                            } elseif (isset($message['sticker'])) {
                                // Sticker message
                                $mediaType = 'sticker';
                                $mediaUrl = $this->downloadMedia($message['sticker']['id']);
                                $messageText = 'Sticker received';
                            }
                            
                            // Save to DB
                            Whatsapp::create([
                                'to' => $message['from'], // sender number
                                'client_name' => 'UNKNOWN',
                                'store_name' => 'WEBHOOK',
                                'message' => $messageText,
                                'media_url' => $mediaUrl, // Add this column to your DB
                                'media_type' => $mediaType, // Add this column to your DB
                                'status' => 'received',
                                'sid' => $message['id'],
                                'type' => '1',
                            ]);
                        }
                    }
                    
                    // Status updates for sent messages
                    if (isset($value['statuses'])) {
                        foreach ($value['statuses'] as $status) {
                            Log::info("📊 Message status update", $status);
                            Whatsapp::where('sid', $status['id'])->update([
                                'status' => $status['status'] // sent, delivered, read
                            ]);
                        }
                    }
                }
            }
        }
    }
    
    return response('EVENT_RECEIVED', 200);
}

/**
 * Download media from WhatsApp
 */
private function downloadMedia($mediaId)
{
    try {
        $accessToken = env('WHATSAPP_ACCESS_TOKEN'); // Your WhatsApp Business API token
        
        // Step 1: Get media URL
        $response = Http::withToken($accessToken)
            ->get("https://graph.facebook.com/v18.0/{$mediaId}");
            
        if (!$response->successful()) {
            Log::error("Failed to get media URL", ['response' => $response->body()]);
            return null;
        }
        
        $mediaData = $response->json();
        $mediaUrl = $mediaData['url'];
        $mimeType = $mediaData['mime_type'];
        
        // Step 2: Download the actual media file
        $fileResponse = Http::withToken($accessToken)
            ->get($mediaUrl);
            
        if (!$fileResponse->successful()) {
            Log::error("Failed to download media file", ['url' => $mediaUrl]);
            return null;
        }
        
        // Step 3: Save file to storage
        $extension = $this->getExtensionFromMimeType($mimeType);
        $fileName = 'whatsapp_media_' . $mediaId . '.' . $extension;
        $filePath = 'whatsapp_media/' . date('Y/m/d') . '/' . $fileName;
        
        // Save to storage (you can use 'public', 's3', etc.)
        Storage::disk('public')->put($filePath, $fileResponse->body());
        
        Log::info("Media saved successfully", [
            'media_id' => $mediaId,
            'file_path' => $filePath,
            'mime_type' => $mimeType
        ]);
        
        return $filePath;
        
    } catch (Exception $e) {
        Log::error("Error downloading media", [
            'media_id' => $mediaId,
            'error' => $e->getMessage()
        ]);
        return null;
    }
}

/**
 * Get file extension from MIME type
 */
private function getExtensionFromMimeType($mimeType)
{
    $mimeToExt = [
        'image/jpeg' => 'jpg',
        'image/jpg' => 'jpg',
        'image/png' => 'png',
        'image/gif' => 'gif',
        'image/webp' => 'webp',
        'video/mp4' => 'mp4',
        'video/3gpp' => '3gp',
        'audio/aac' => 'aac',
        'audio/mp4' => 'm4a',
        'audio/amr' => 'amr',
        'audio/mpeg' => 'mp3',
        'audio/ogg' => 'ogg',
        'application/pdf' => 'pdf',
        'application/vnd.ms-powerpoint' => 'ppt',
        'application/msword' => 'doc',
        'application/vnd.ms-excel' => 'xls',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation' => 'pptx',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document' => 'docx',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' => 'xlsx',
        'text/plain' => 'txt',
    ];
    
    return $mimeToExt[$mimeType] ?? 'bin';
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
