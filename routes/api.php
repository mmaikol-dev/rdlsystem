<?php

use App\Http\Controllers\VoiceController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/webrtc-token', [VoiceController::class, 'generateWebRTCToken']);
Route::post('/make-call', [VoiceController::class, 'makeCall']);
Route::post('/end-call', [VoiceController::class, 'endCall']);
Route::post('/log-call', [VoiceController::class, 'logCall']);
Route::post('/voice/callback', [VoiceController::class, 'callCallback']);
Route::post('/voice/status', [VoiceController::class, 'callStatus']);
Route::post('/voice/incoming', [VoiceController::class, 'incomingCall']);

Route::prefix('voice')->group(function () {
    Route::post('/capability-token', [VoiceController::class, 'getCapabilityToken']);
    Route::post('/make-call', [VoiceController::class, 'makeCall']);
    Route::post('/generate-webrtc-token', [VoiceController::class, 'generateWebRTCToken']);
    Route::post('/client-health', [VoiceController::class, 'checkClientHealth']);
    Route::patch('/agent-status', [VoiceController::class, 'updateAgentStatus']);
    Route::get('/missed-calls', [VoiceController::class, 'missedCalls']);
    Route::patch('/missed-calls/{call}/handling-status', [VoiceController::class, 'updateMissedCallHandlingStatus']);
    Route::get('/active-sessions', [VoiceController::class, 'listActiveSessions']);
    Route::post('/set-default-agent', [VoiceController::class, 'setDefaultAgent']);
    Route::get('/test', [VoiceController::class, 'testSystem']);
});

Route::prefix('webhooks')->group(function () {
    Route::post('/voice/callback', [VoiceController::class, 'callCallback']);
    Route::post('/voice/status', [VoiceController::class, 'callStatus']);
    Route::post('/voice/incoming', [VoiceController::class, 'incomingCall']);
});

Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
    return $request->user();
});
