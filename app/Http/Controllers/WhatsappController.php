<?php

namespace App\Http\Controllers;

use App\Models\SheetOrder;
use App\Models\User;
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
    // This method now only handles custom chat messages via WasenderAPI
    Log::info("📤 Sending custom WhatsApp chat message", $request->all());

    try {
        $validated = $request->validate([
            'to' => 'required|string',
            'message' => 'required|string|max:4096',
        ]);

        $to = $validated['to'];
        $messageText = $validated['message'];

        // Format phone number for WasenderAPI (no + prefix)
        $formattedPhone = preg_replace('/\D/', '', $to);
        
        if (!$formattedPhone || strlen($formattedPhone) < 9) {
            Log::error("❌ Invalid phone number format", ['to' => $to]);
            return response()->json([
                'success' => false,
                'error' => 'Invalid phone number format'
            ], 400);
        }

        // Ensure proper country code format (no + for WasenderAPI)
        if (!preg_match('/^(254|255)/', $formattedPhone)) {
            if (substr($formattedPhone, 0, 1) === '0') {
                $formattedPhone = '254' . substr($formattedPhone, 1);
            } else {
                $formattedPhone = '254' . $formattedPhone;
            }
        }

        Log::info("📞 Formatted phone: {$formattedPhone}");

        // Initialize WasenderAPI client
        $apiKey = '800bd2a1e9ec63c98996e734f9cad6f5f2713f49295dd3c4589313df10758a9c';
        $client = new \WasenderApi\WasenderClient($apiKey);

        // Send message via WasenderAPI
        $response = $client->sendText($formattedPhone, $messageText);

        Log::info("✅ WasenderAPI Response:", $response);

        // Extract message ID from response
        $messageId = $response['data']['key']['id'] ?? null;

        // Get conversation details from database
        $existingChat = Whatsapp::where('to', $to)
            ->orWhere('to', $formattedPhone)
            ->first();

        $clientName = $existingChat->client_name ?? 'Customer';
        $storeName = $existingChat->store_name ?? 'CHAT';
        $ccAgents = $existingChat->cc_agents ?? null;

        // Save message to database
        $whatsapp = Whatsapp::create([
            'to' => $formattedPhone,
            'client_name' => $clientName,
            'store_name' => $storeName,
            'cc_agents' => $ccAgents,
            'message' => $messageText,
            'status' => 'sent',
            'sid' => $messageId,
        ]);

        Log::info("💾 Message saved to database", [
            'id' => $whatsapp->id,
            'to' => $formattedPhone,
            'sid' => $messageId
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Message sent successfully',
            'sid' => $messageId,
            'data' => $whatsapp
        ]);

    } catch (\WasenderApi\Exceptions\WasenderApiException $e) {
        Log::error("❌ WasenderAPI Error", [
            'error' => $e->getMessage(),
            'to' => $request->to ?? 'unknown'
        ]);

        return response()->json([
            'success' => false,
            'error' => 'Failed to send message: ' . $e->getMessage()
        ], 500);

    } catch (\Exception $e) {
        Log::error("❌ Failed to send chat message", [
            'error' => $e->getMessage(),
        ]);

        return response()->json([
            'success' => false,
            'error' => 'An error occurred while sending the message'
        ], 500);
    }
}

private function formatPhoneNumber($phoneNumber, $storeName)
{
    if (!$phoneNumber) return null;

    // Remove anything not a digit
    $phone = preg_replace('/\D/', '', $phoneNumber);

    $countryCode = strtoupper($storeName) === 'RDL3' ? '255' : '254';

    // If number starts with country code already
    if (substr($phone, 0, strlen($countryCode)) === $countryCode) {
        return '+' . $phone;
    }

    // If number starts with 0 → convert 07xx → +2547xx
    if (substr($phone, 0, 1) === '0') {
        return '+' . $countryCode . substr($phone, 1);
    }

    // If number is 9 digits only → assume local without 0
    if (strlen($phone) === 9) {
        return '+' . $countryCode . $phone;
    }

    // If number is 10 digits without country code e.g. 743xxxxxxx
    if (strlen($phone) === 10) {
        return '+' . $countryCode . substr($phone, -9);
    }

    // Default fallback
    return null;
}



// Inside WhatsappController.php

public function webhook(Request $request)
{
    // Log everything that comes from WasenderAPI
    Log::info("📩 WasenderAPI Webhook received", $request->all());

    // ✅ Get the webhook data
    $data = $request->all();

    if (empty($data)) {
        Log::warning("⚠️ Empty webhook data received");
        return response()->json(['status' => 'no_data'], 200);
    }

    // ✅ Check event type
    if (!isset($data['event'])) {
        Log::warning("⚠️ No 'event' field found in webhook data");
        return response()->json(['status' => 'no_event'], 200);
    }

    $event = $data['event'];
    Log::info("📋 Event Type: {$event}");

    // ============================================
    // Handle chats.update event (incoming messages)
    // ============================================
    if ($event === 'chats.update') {
        Log::info("💬 Processing CHATS.UPDATE event");

        // Navigate to messages array
        $chats = $data['data']['chats'] ?? null;
        
        if (!$chats) {
            Log::warning("⚠️ No chats data found");
            return response()->json(['status' => 'no_chats'], 200);
        }

        $messages = $chats['messages'] ?? [];
        
        if (empty($messages)) {
            Log::warning("⚠️ No messages found in chats");
            return response()->json(['status' => 'no_messages'], 200);
        }

        // Process each message
        foreach ($messages as $msgWrapper) {
            try {
                $messageData = $msgWrapper['message'] ?? null;
                
                if (!$messageData) {
                    Log::warning("⚠️ No message data in wrapper");
                    continue;
                }

                Log::info("📨 Processing message:", $messageData);

                // Extract key information
                $key = $messageData['key'] ?? [];
                $messageId = $key['id'] ?? null;
                $fromMe = $key['fromMe'] ?? false;
                
                // Skip messages sent by us (fromMe: true)
                if ($fromMe) {
                    Log::info("⏭️ Skipping outgoing message (fromMe: true)");
                    continue;
                }

                // Get sender - use remoteJidAlt for clean phone number
                $from = $key['remoteJidAlt'] ?? $key['remoteJid'] ?? null;
                
                // Clean phone number (remove @s.whatsapp.net suffix)
                if ($from && strpos($from, '@') !== false) {
                    $from = explode('@', $from)[0];
                }

                $pushName = $messageData['pushName'] ?? 'UNKNOWN';
                
                // Extract message text
                $messageBody = '';
                $message = $messageData['message'] ?? [];
                
                // Check for different message types
                if (isset($message['conversation'])) {
                    $messageBody = $message['conversation'];
                    Log::info("✅ Text from conversation: {$messageBody}");
                }
                elseif (isset($message['extendedTextMessage']['text'])) {
                    $messageBody = $message['extendedTextMessage']['text'];
                    Log::info("✅ Text from extendedTextMessage: {$messageBody}");
                }
                elseif (isset($message['imageMessage'])) {
                    $caption = $message['imageMessage']['caption'] ?? '';
                    $messageBody = '[Image received]' . ($caption ? ": {$caption}" : '');
                    Log::info("✅ Image message: {$messageBody}");
                }
                elseif (isset($message['videoMessage'])) {
                    $caption = $message['videoMessage']['caption'] ?? '';
                    $messageBody = '[Video received]' . ($caption ? ": {$caption}" : '');
                    Log::info("✅ Video message: {$messageBody}");
                }
                elseif (isset($message['audioMessage'])) {
                    $messageBody = '[Audio received]';
                    Log::info("✅ Audio message");
                }
                elseif (isset($message['documentMessage'])) {
                    $fileName = $message['documentMessage']['fileName'] ?? 'document';
                    $messageBody = "[Document received: {$fileName}]";
                    Log::info("✅ Document message: {$messageBody}");
                }
                elseif (isset($message['stickerMessage'])) {
                    $messageBody = '[Sticker received]';
                    Log::info("✅ Sticker message");
                }
                else {
                    $messageBody = '[Unknown message type]';
                    Log::info("⚠️ Unknown message type:", array_keys($message));
                }

                // Validate before saving
                if (!$from || !$messageId) {
                    Log::error("❌ Missing required fields", [
                        'from' => $from,
                        'messageId' => $messageId
                    ]);
                    continue;
                }

                // Save to database
                Log::info("💾 Saving message to database", [
                    'to' => $from,
                    'client_name' => $pushName,
                    'message' => $messageBody,
                    'sid' => $messageId,
                ]);

                $whatsapp = Whatsapp::create([
                    'to' => $from,
                    'client_name' => $pushName,
                    'store_name' => 'WEBHOOK',
                    'cc_agents' => null,
                    'message' => $messageBody,
                    'status' => 'received',
                    'sid' => $messageId,
                ]);

                Log::info("✅✅✅ MESSAGE SAVED SUCCESSFULLY!", [
                    'id' => $whatsapp->id,
                    'from' => $from,
                    'message' => $messageBody
                ]);

            } catch (\Exception $e) {
                Log::error("❌❌❌ Failed to process message", [
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString()
                ]);
            }
        }
    }

    // ============================================
    // Handle message status updates
    // ============================================
    elseif ($event === 'message.status' || $event === 'messages.update') {
        Log::info("📊 Processing STATUS UPDATE event");
        
        $statusData = $data['data'] ?? [];
        
        Log::info("📊 Status Data:", $statusData);

        $messageId = $statusData['id'] ?? null;
        $status = $statusData['status'] ?? null;

        if ($messageId && $status) {
            $updated = Whatsapp::where('sid', $messageId)->update([
                'status' => $status
            ]);

            if ($updated) {
                Log::info("✅ Status updated for message {$messageId} to {$status}");
            } else {
                Log::warning("⚠️ Message {$messageId} not found in database for status update");
            }
        }
    }

    // ============================================
    // Handle other events
    // ============================================
    else {
        Log::info("ℹ️ Unhandled event type: {$event}", [
            'data' => $data
        ]);
    }

    return response()->json(['status' => 'success'], 200);
}
/**
 * Handle media decryption and save to storage
 */
private function handleMediaDecryption(array $mediaInfo, string $mediaType, string $messageId): void
{
    $url = $mediaInfo['url'] ?? null;
    $mediaKey = $mediaInfo['mediaKey'] ?? null;
    
    if (!$url || !$mediaKey) {
        throw new \Exception("Media object is missing url or mediaKey.");
    }

    // Download encrypted media
    $encryptedData = file_get_contents($url);
    if ($encryptedData === false) {
        throw new \Exception("Failed to download media from URL: {$url}");
    }

    // Derive decryption keys using HKDF
    $keys = $this->getDecryptionKeys($mediaKey, $mediaType);
    $iv = substr($keys, 0, 16);
    $cipherKey = substr($keys, 16, 32);
    $ciphertext = substr($encryptedData, 0, -10);

    // Decrypt the media
    $decryptedData = openssl_decrypt($ciphertext, 'aes-256-cbc', $cipherKey, OPENSSL_RAW_DATA, $iv);
    if ($decryptedData === false) {
        throw new \Exception('Failed to decrypt media.');
    }

    // Prepare storage path
    $mimeType = $mediaInfo['mimetype'] ?? 'application/octet-stream';
    $extension = explode('/', $mimeType)[1] ?? 'bin';
    $filename = $mediaInfo['fileName'] ?? "{$messageId}.{$extension}";
    
    // Save to storage/app/whatsapp-media/
    $storagePath = "whatsapp-media/{$filename}";
    \Storage::put($storagePath, $decryptedData);
    
    Log::info("✅ Media decrypted and saved", [
        'path' => $storagePath,
        'type' => $mediaType,
        'size' => strlen($decryptedData)
    ]);
}

/**
 * Derives the decryption keys using HKDF
 */
private function getDecryptionKeys(string $mediaKey, string $mediaType): string
{
    $info = match ($mediaType) {
        'image', 'sticker' => 'WhatsApp Image Keys',
        'video'           => 'WhatsApp Video Keys',
        'audio'           => 'WhatsApp Audio Keys',
        'document'        => 'WhatsApp Document Keys',
        default           => throw new \Exception("Invalid media type: {$mediaType}"),
    };
    
    return hash_hkdf('sha256', base64_decode($mediaKey), 112, $info, '');
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
