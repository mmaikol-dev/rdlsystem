<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Http;
use AfricasTalking\SDK\AfricasTalking;
use Exception;

class CallcenterController extends Controller
{
    public function makeCall(Request $request)
    {
        $request->validate([
            'to' => 'required|string', // recipient number(s)
        ]);

        // ⚠️ Hardcoded Africa's Talking credentials (for testing ONLY)
        $username = "callintergration"; 
        $apiKey   = "atsk_463712f00cfc1af3495507a14892c7bb5729c7d006b7ca114de95bf8ec8cbaa7972b395b"; 
        $from     = "+254711082321"; // Must be a registered AT voice number

        $AT    = new AfricasTalking($username, $apiKey);
        $voice = $AT->voice();

        try {
            $results = $voice->call([
                'from' => $from,
                'to'   => $request->input('to')
            ]);

            return response()->json($results);
        } catch (Exception $e) {
            return response()->json([
                'error'   => true,
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function generateWebRTCToken(Request $request)
    {
        try {
            $user = Auth::user();
            $clientName = $user->username ?? $user->email;
            $phone = $user->phone ?? '+254711082321';
    
            $apiKey   = "atsk_463712f00cfc1af3495507a14892c7bb5729c7d006b7ca114de95bf8ec8cbaa7972b395b";
            $username = "callintergration";
    
            $response = Http::withHeaders([
                'apiKey' => $apiKey
            ])->post("https://webrtc.africastalking.com/capability-token/request", [
                'username'    => $username,
                'clientName'  => $clientName,
                'phoneNumber' => $phone,
                'incoming'    => 'true',
                'outgoing'    => 'true',
            ]);
    
            if ($response->failed()) {
                Log::error("WebRTC token request failed", ['response' => $response->body()]);
                return response()->json(['error' => true, 'message' => 'Failed to fetch token', 'body' => $response->body()], 500);
            }
    
            return response()->json($response->json());
    
        } catch (Exception $e) {
            Log::error("WebRTC token generation error: " . $e->getMessage());
            return response()->json([
                'error'   => true,
                'message' => $e->getMessage()
            ], 500);
        }
    }

    // NEW: Dedicated endpoint for getting WebRTC tokens (for the client-side hook)
    public function getWebRTCToken(Request $request)
    {
        return $this->generateWebRTCToken($request);
    }
    
    public function voiceCallback(Request $request)
    {
        Log::info('Voice Callback:', $request->all());
    
        // Caller number (customer calling your AT line)
        $callerNumber = $request->input('callerNumber');
    
        // Example: pick which agent should receive the call
        // Here we just pick the first available agent from DB
        $agent = \App\Models\User::where('roles', 'callcenter1')
            ->inRandomOrder()
            ->first();
    
        // Fallback: if no agent is available, send to default client
        $agentClientName = $agent ? $agent->username : "default_agent";
    
        $xmlResponse = '<?xml version="1.0" encoding="UTF-8"?>
            <Response>
                <Dial>
                    <Client>' . $agentClientName . '</Client>
                </Dial>
            </Response>';
    
        return response($xmlResponse, 200)
            ->header('Content-Type', 'application/xml');
    }
    
    public function endCall(Request $request)
    {
        $request->validate([
            'sessionId' => 'required|string', // Africa's Talking session ID from makeCall
        ]);

        // ⚠️ Hardcoded credentials (testing only)
        $username = "callintergration"; 
        $apiKey   = "atsk_463712f00cfc1af3495507a14892c7bb5729c7d006b7ca114de95bf8ec8cbaa7972b395b"; 

        $AT    = new AfricasTalking($username, $apiKey);
        $voice = $AT->voice();

        try {
            $results = $voice->hangup([
                'sessionId' => $request->input('sessionId'),
            ]);

            return response()->json([
                'status' => 'success',
                'data'   => $results
            ]);
        } catch (Exception $e) {
            return response()->json([
                'error'   => true,
                'message' => $e->getMessage()
            ], 500);
        }
    }

    // NEW: Store call logs for tracking
    public function logCall(Request $request)
    {
        $request->validate([
            'phone_number' => 'required|string',
            'call_type' => 'required|in:incoming,outgoing',
            'call_status' => 'required|in:connected,failed,ended',
            'duration' => 'nullable|integer',
            'order_id' => 'nullable|integer'
        ]);

        try {
            $user = Auth::user();
            
            // You can create a CallLog model to store this data
            $callLog = [
                'user_id' => $user->id,
                'phone_number' => $request->input('phone_number'),
                'call_type' => $request->input('call_type'),
                'call_status' => $request->input('call_status'),
                'duration' => $request->input('duration', 0),
                'order_id' => $request->input('order_id'),
                'created_at' => now(),
            ];

            // Store in database (you'll need to create the model and migration)
            // \App\Models\CallLog::create($callLog);

            Log::info('Call logged:', $callLog);

            return response()->json([
                'status' => 'success',
                'message' => 'Call logged successfully'
            ]);
        } catch (Exception $e) {
            Log::error("Call logging error: " . $e->getMessage());
            return response()->json([
                'error' => true,
                'message' => $e->getMessage()
            ], 500);
        }
    }
}