<?php

use App\Http\Controllers\VoiceController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('welcome');
})->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', function () {
        return Inertia::render('dashboard');
    })->name('dashboard');

    Route::get('/voice', [VoiceController::class, 'index'])->name('voice.index');
    Route::get('/voice/logs', [VoiceController::class, 'logsPage'])->name('voice.logs');
    Route::get('/webrtc/token', [VoiceController::class, 'generateWebRTCToken']);
    Route::post('/voice/generate-webrtc-token', [VoiceController::class, 'generateWebRTCToken']);
    Route::post('/voice/client-health', [VoiceController::class, 'checkClientHealth']);
    Route::patch('/voice/agent-status', [VoiceController::class, 'updateAgentStatus'])->name('voice.agent-status');
    Route::get('/voice/missed-calls', [VoiceController::class, 'missedCalls'])->name('voice.missed-calls');
    Route::patch('/voice/missed-calls/{call}/handling-status', [VoiceController::class, 'updateMissedCallHandlingStatus'])
        ->name('voice.missed-calls.handling-status');
    Route::get('/voice/active-sessions', [VoiceController::class, 'listActiveSessions']);
    Route::post('/voice/set-default-agent', [VoiceController::class, 'setDefaultAgent']);
    Route::get('/voice/test', [VoiceController::class, 'testSystem']);
    Route::get('/voice/calls/{sessionId}/status', [VoiceController::class, 'sessionStatus'])
        ->name('voice.calls.status');
});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
