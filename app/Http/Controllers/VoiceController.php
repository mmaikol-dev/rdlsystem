<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;
use Inertia\Inertia;

class VoiceController extends Controller
{
    private $apiKey = 'atsk_52e1c57e7e85f6b72a3feadc75348f990a77b11faaba39ef8acc119f44f9cb41ee9d494f';
    private $username = 'voiceapp1';
    private $callFrom = '+254711082565'; // Your AT virtual number
    
    /**
     * Render the voice interface
     */
    public function index()
    {
        return Inertia::render('Voice/index', [
            'callFrom' => $this->callFrom,
            'username' => $this->username
        ]);
    }

    /**
     * Generate capability token for WebRTC client
     * WORKING: Use minimal parameters (username, clientName, phoneNumber)
     */
    public function getCapabilityToken(Request $request)
    {
        $clientName = $request->input('client_name', 'agent_' . uniqid());
        
        Log::info('Generating capability token for: ' . $clientName);
        
        try {
            // WORKING PAYLOAD: Minimal parameters only
            $payload = [
                'username' => $this->username,
                'clientName' => $clientName,
                'phoneNumber' => $this->callFrom
            ];
            
            Log::info('Request payload: ', $payload);
            
            $response = Http::withOptions([
                'verify' => true,
                'timeout' => 30,
            ])->withHeaders([
                'apiKey' => $this->apiKey,
                'Content-Type' => 'application/json',
                'Accept' => 'application/json'
            ])->post('https://webrtc.africastalking.com/capability-token/request', $payload);

            Log::info('Response status: ' . $response->status());
            Log::info('Response body: ' . $response->body());

            if ($response->successful()) {
                $data = $response->json();
                
                // Check for error in response
                if (isset($data['errorMessage'])) {
                    Log::error('API returned error: ' . $data['errorMessage']);
                    return response()->json([
                        'success' => false,
                        'error' => $data['errorMessage']
                    ], 500);
                }
                
                if (!isset($data['token'])) {
                    Log::error('No token in response: ' . json_encode($data));
                    return response()->json([
                        'success' => false,
                        'error' => 'No token received from API',
                        'response' => $data
                    ], 500);
                }
                
                // Store client name in cache for later use
                Cache::put("client_name_{$clientName}", $clientName, now()->addDay());
                Cache::put('default_agent', $clientName, now()->addDays(7));
                
                return response()->json([
                    'success' => true,
                    'token' => $data['token'],
                    'clientName' => $clientName,
                    'fullClientName' => $this->username . '.' . $clientName, // Format: username.clientName
                    'lifeTimeSec' => $data['lifeTimeSec'] ?? 86400,
                    'incoming' => $data['incoming'] ?? true,
                    'outgoing' => $data['outgoing'] ?? true,
                    'message' => 'Token generated successfully'
                ]);
            }

            Log::error('Failed with status: ' . $response->status());
            Log::error('Response: ' . $response->body());

            return response()->json([
                'success' => false,
                'error' => 'Failed to get capability token. HTTP Status: ' . $response->status(),
                'details' => $response->body(),
                'request_payload' => $payload
            ], 400);

        } catch (\Exception $e) {
            Log::error('Error: ' . $e->getMessage());
            Log::error('Trace: ' . $e->getTraceAsString());
            
            return response()->json([
                'success' => false,
                'error' => 'Network error: ' . $e->getMessage(),
                'solution' => 'Check server connectivity to webrtc.africastalking.com'
            ], 500);
        }
    }

    /**
     * Initiate outgoing call via Voice API
     * Note: This is for regular voice calls, not WebRTC
     * WebRTC calls are initiated from browser using client.call()
     */
    /**
 * Initiate outgoing call via API - FIXED error handling
 */
public function makeCall(Request $request)
{
    $request->validate([
        'phone_number' => 'required|string',
        'client_name' => 'required|string'
    ]);

    $phoneNumber = $request->input('phone_number');
    $clientName = $request->input('client_name');
    
    Log::info('Voice API call to: ' . $phoneNumber . ' with client: ' . $clientName);
    
    // Format phone number
    if (!str_starts_with($phoneNumber, '+')) {
        $phoneNumber = '+' . ltrim($phoneNumber, '0');
    }
    
    // Store client name for callback
    Cache::put("active_call_{$phoneNumber}", $clientName, now()->addHours(2));
    
    try {
        $callbackUrl = url('/api/webhooks/voice/callback');
        Log::info('Using callback URL: ' . $callbackUrl);
        
        $response = Http::withOptions([
            'verify' => true,
            'timeout' => 30,
        ])->withHeaders([
            'apiKey' => $this->apiKey,
            'Content-Type' => 'application/x-www-form-urlencoded',
            'Accept' => 'application/json'
        ])->asForm()->post('https://voice.africastalking.com/call', [
            'username' => $this->username,
            'to' => $phoneNumber,
            'from' => $this->callFrom,
            'callbackUrl' => $callbackUrl
        ]);

        Log::info('Voice API response status: ' . $response->status());
        Log::info('Voice API response body: ' . $response->body());

        $responseData = $response->json();
        
        // FIX: Check if errorMessage is actually "None" (string)
        if (isset($responseData['errorMessage']) && $responseData['errorMessage'] !== 'None') {
            Log::error('Voice API error: ' . $responseData['errorMessage']);
            return response()->json([
                'success' => false,
                'error' => $responseData['errorMessage']
            ], 500);
        }
        
        if (!$response->successful()) {
            return response()->json([
                'success' => false,
                'error' => 'Failed to initiate call',
                'details' => $response->body()
            ], 500);
        }
        
        return response()->json([
            'success' => true,
            'message' => 'Call initiated successfully',
            'data' => $responseData,
            'note' => 'Your phone should ring shortly'
        ]);

    } catch (\Exception $e) {
        Log::error('Voice API error: ' . $e->getMessage());
        Log::error('Trace: ' . $e->getTraceAsString());
        
        return response()->json([
            'success' => false,
            'error' => 'Network error: ' . $e->getMessage()
        ], 500);
    }
}

    /**
     * Callback URL - Africa's Talking requests this when call is initiated/answered
     * This is called when browser client calls client.call() OR regular voice call
     */
   /**
 * Callback URL - Africa's Talking requests this when call is initiated/answered
 */
/**
 * Callback URL - Africa's Talking requests this when call is initiated/answered
 * FIXED: Proper handling of isActive parameter
 */
/**
 * CORRECT Callback for WebRTC → Phone calls
 */
/**
 * Fixed Callback for ALL call types
 */
/**
 * Smart Callback - Prevents call loops
 */
public function callCallback(Request $request)
{
    Log::info('=== SMART CALLBACK ===');
    Log::info('Request data:', $request->all());
    
    $isActive = $request->input('isActive', '0');
    $direction = $request->input('direction', '');
    $callSessionState = $request->input('callSessionState', '');
    $sessionId = $request->input('sessionId', '');
    $callerNumber = $request->input('callerNumber', '');
    $destinationNumber = $request->input('destinationNumber', '');
    
    Log::info('Direction: ' . $direction);
    Log::info('Is Active: ' . $isActive);
    Log::info('Session ID: ' . $sessionId);
    
    // Track active sessions to prevent loops
    $isOutboundCallAnswered = Cache::get("outbound_answered_{$sessionId}", false);
    
    $xml = '<?xml version="1.0" encoding="UTF-8"?>';
    $xml .= '<Response>';
    
    if ($direction === 'Outbound' && $isActive == '1') {
        // Outbound call answered - connect directly
        Log::info('OUTBOUND CALL ANSWERED - Direct connection');
        
        // Mark this session as answered to prevent loop
        Cache::put("outbound_answered_{$sessionId}", true, now()->addMinutes(5));
        
        // Get which agent made this call
        $phoneNumber = $callerNumber; // The person who answered
        $clientName = Cache::get("active_call_{$phoneNumber}", 'agent_default');
        $fullClientName = $this->username . '.' . $clientName;
        
        Log::info('Connecting to agent: ' . $fullClientName);
        
        // Direct connection - no Say, just Dial
        $xml .= '<Dial phoneNumbers="' . htmlspecialchars($fullClientName) . '"';
        $xml .= ' callerId="' . $this->callFrom . '"';
        $xml .= '>';
        $xml .= '<ClientId>' . htmlspecialchars($clientName) . '</ClientId>';
        $xml .= '</Dial>';
        
    } elseif ($direction === 'Inbound') {
        // Handle inbound calls differently based on source
        
        if (strpos($callerNumber, $this->username . '.') === 0) {
            // WebRTC agent making a call
            Log::info('WEBRTC AGENT MAKING CALL');
            
            if ($isActive == '1') {
                // WebRTC connected - dial the number
                $clientDialedNumber = $request->input('clientDialedNumber', '');
                if ($clientDialedNumber) {
                    Log::info('Dialing: ' . $clientDialedNumber);
                    $xml .= '<Dial phoneNumbers="' . htmlspecialchars($clientDialedNumber) . '"';
                    $xml .= ' callerId="' . $this->callFrom . '"';
                    $xml .= '>';
                    $xml .= '</Dial>';
                }
            } else {
                // Initial ringing - minimal response
                $xml .= '<Say voice="woman">Please wait while we connect your call.</Say>';
            }
            
        } else {
            // Regular phone calling in
            Log::info('REGULAR PHONE CALLING IN');
            
            if ($isActive == '1') {
                // Check if this is a callback from an outbound call
                if ($isOutboundCallAnswered) {
                    Log::info('This is callback from outbound call - already handled');
                    $xml .= '<Hangup/>';
                } else {
                    // Genuine inbound call - connect to agent
                    $clientName = Cache::get('default_agent', 'agent_default');
                    $fullClientName = $this->username . '.' . $clientName;
                    
                    Log::info('Connecting inbound call to: ' . $fullClientName);
                    
                    $xml .= '<Dial phoneNumbers="' . htmlspecialchars($fullClientName) . '"';
                    $xml .= ' callerId="' . $this->callFrom . '"';
                    $xml .= '>';
                    $xml .= '<ClientId>' . htmlspecialchars($clientName) . '</ClientId>';
                    $xml .= '</Dial>';
                }
            }
        }
        
    } else {
        // Default/unknown
        $xml .= '<Hangup/>';
    }
    
    $xml .= '</Response>';
    
    Log::info('XML Response: ' . $xml);
    
    return response($xml, 200)
        ->header('Content-Type', 'application/xml');
}
    /**
     * Handle incoming calls to your AT number
     */
    public function incomingCall(Request $request)
    {
        Log::info('=== INCOMING CALL RECEIVED ===');
        Log::info('Request data:', $request->all());
        
        $callerNumber = $request->input('callerNumber'); // Person calling your AT number
        $sessionId = $request->input('sessionId');
        
        // Get available agent from cache
        $clientName = Cache::get('default_agent', 'agent_default');
        $fullClientName = $this->username . '.' . $clientName;
        
        // Store for tracking
        Cache::put("incoming_call_{$sessionId}", [
            'caller' => $callerNumber,
            'agent' => $clientName,
            'time' => now()
        ], now()->addHours(2));
        
        $xml = '<?xml version="1.0" encoding="UTF-8"?>';
        $xml .= '<Response>';
        $xml .= '<Say voice="woman" playBeep="true">Thank you for calling. Please wait while we connect you to an agent.</Say>';
        
        // Dial the browser client (agent)
        $xml .= '<Dial phoneNumbers="' . htmlspecialchars($fullClientName) . '"';
        $xml .= ' sequential="true"';
        $xml .= ' record="false"';
        $xml .= ' callerId="' . $this->callFrom . '"';
        $xml .= ' ringbackTone="http://www.music.helsinki.fi/tmt/opetus/uusmedia/esim/a2002011001-e02-128k.ogg"';
        $xml .= '>';
        
        // Important: Use ClientId to dial browser client
        $xml .= '<ClientId>' . htmlspecialchars($clientName) . '</ClientId>';
        
        $xml .= '</Dial>';
        $xml .= '</Response>';
        
        Log::info('Incoming call XML:', ['xml' => $xml]);
        
        return response($xml, 200)
            ->header('Content-Type', 'application/xml')
            ->header('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
    
    /**
     * Handle DTMF digits from incoming calls
     */
    public function handleDigits(Request $request)
    {
        $digits = $request->input('dtmfDigits');
        $sessionId = $request->input('sessionId');
        
        Log::info('DTMF digits received', [
            'digits' => $digits,
            'sessionId' => $sessionId
        ]);
        
        $xml = '<?xml version="1.0" encoding="UTF-8"?>';
        $xml .= '<Response>';
        
        switch ($digits) {
            case '1':
                $clientName = Cache::get('default_agent', 'agent_default');
                $xml .= '<Say voice="woman">Connecting you to an agent, please hold.</Say>';
                $xml .= '<Dial phoneNumbers="' . $this->username . '.' . $clientName . '" sequential="true" record="false" callerId="' . $this->callFrom . '">';
                $xml .= '<ClientId>' . htmlspecialchars($clientName) . '</ClientId>';
                $xml .= '</Dial>';
                break;
            case '2':
                $xml .= '<Say voice="woman">Our business hours are Monday to Friday, 9 AM to 5 PM. Thank you for calling.</Say>';
                $xml .= '<Reject />';
                break;
            default:
                $xml .= '<Say voice="woman">Invalid option selected. Please try again.</Say>';
                $xml .= '<Redirect>' . url('/api/webhooks/voice/incoming') . '</Redirect>';
        }
        
        $xml .= '</Response>';
        
        return response($xml, 200)
            ->header('Content-Type', 'application/xml');
    }
    
    /**
     * Set default agent for incoming calls
     */
    public function setDefaultAgent(Request $request)
    {
        $request->validate([
            'client_name' => 'required|string'
        ]);
        
        $clientName = $request->input('client_name');
        Cache::put('default_agent', $clientName, now()->addDays(7));
        
        Log::info('Default agent set to: ' . $clientName);
        
        return response()->json([
            'success' => true,
            'message' => 'Default agent set successfully',
            'full_client_name' => $this->username . '.' . $clientName
        ]);
    }
    
    /**
     * List active client sessions
     */
    public function listActiveSessions()
    {
        // Get all active calls from cache
        $activeCalls = [];
        $pattern = 'active_call_*';
        
        // This is a simplified approach
        // In production, consider using Redis scan or database
        $sessions = [];
        
        return response()->json([
            'success' => true,
            'sessions' => $sessions,
            'default_agent' => Cache::get('default_agent', 'Not set')
        ]);
    }
    
    /**
     * Test if the system is working
     */
    public function testSystem(Request $request)
    {
        // Generate a test token
        $testClient = 'test_' . time();
        
        try {
            $payload = [
                'username' => $this->username,
                'clientName' => $testClient,
                'phoneNumber' => $this->callFrom
            ];
            
            $response = Http::withOptions([
                'verify' => true,
                'timeout' => 10,
            ])->withHeaders([
                'apiKey' => $this->apiKey,
                'Content-Type' => 'application/json',
            ])->post('https://webrtc.africastalking.com/capability-token/request', $payload);
            
            $webrtcWorking = $response->successful();
            $webrtcData = $response->successful() ? ['token_received' => true] : $response->body();
            
        } catch (\Exception $e) {
            $webrtcWorking = false;
            $webrtcData = $e->getMessage();
        }
        
        return response()->json([
            'success' => true,
            'system_status' => [
                'webrtc_api' => $webrtcWorking ? 'Working' : 'Failed',
                'webrtc_details' => $webrtcData,
                'credentials' => [
                    'username' => $this->username,
                    'phone_number' => $this->callFrom,
                    'api_key_prefix' => substr($this->apiKey, 0, 10) . '...'
                ],
                'cache_status' => [
                    'default_agent' => Cache::get('default_agent', 'Not set'),
                    'driver' => config('cache.default')
                ]
            ],
            'next_steps' => [
                '1. Open voice interface and initialize client',
                '2. Make a test call from browser',
                '3. Check Laravel logs for callbacks',
                '4. Test incoming calls by dialing ' . $this->callFrom
            ]
        ]);
    }
}