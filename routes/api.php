<?php



use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\VoiceController;
use App\Http\Controllers\AppScriptController;
use App\Http\Controllers\C2BTransactionController;
use App\Http\Controllers\StkController;
use App\Http\Controllers\RequisitionController;
use App\Http\Controllers\RequisitionCategoryController;
use App\Http\Controllers\DailyBudgetController;
use App\Http\Controllers\WhatsappController;
use App\Http\Controllers\AiController;
use App\Http\Controllers\CallcenterController;

Route::post('/c2b/confirmation', [C2BTransactionController::class, 'confirmTransaction']);
Route::post('/c2b/validation', [C2BTransactionController::class, 'validateTransaction']); // optional if you handle validation
Route::get('/transactions/{order_no}', [StkController::class, 'checkStatus'])->name('transactions.check');
Route::post('/stk/stk-push', [StkController::class, 'stkPush'])->name('stk.push');
Route::post('/mpesa/callback', [StkController::class, 'handleCallback'])->name('stk.callback');
Route::post('/sheet-orders', [AppScriptController::class, 'storeOrder']);
Route::post('/ai', [AiController::class, 'ask']);
Route::get('/webrtc-token', [CallcenterController::class, 'generateWebRTCToken']);
Route::post('/make-call', [CallcenterController::class, 'makeCall']);
Route::post('/end-call', [CallcenterController::class, 'endCall']);
Route::post('/log-call', [CallcenterController::class, 'logCall']);

// Public callbacks from Africa's Talking (no auth required)
Route::post('/voice/callback', [CallcenterController::class, 'voiceCallback']);
Route::post('/voice/status', [CallcenterController::class, 'callStatusCallback']);



Route::post('/whatsapp/send-chat', [WhatsappController::class, 'sendChat'])->name('whatsapp.sendChat');

Route::post('/whatsapp/webhook', [WhatsappController::class, 'webhook']);
Route::get('/whatsapp/webhook', [WhatsappController::class, 'webhook']);


// Default Laravel route (you can keep or remove this)
Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
    return $request->user();
});

// API routes for voice functionality
Route::prefix('voice')->group(function () {
    Route::post('/capability-token', [VoiceController::class, 'getCapabilityToken']);
    Route::post('/make-call', [VoiceController::class, 'makeCall']);
});

// Africa's Talking callback routes
Route::prefix('webhooks')->group(function () {
    Route::post('/voice/callback', [VoiceController::class, 'callCallback']);
    Route::post('/voice/status', [VoiceController::class, 'callStatus']);
    Route::post('/voice/incoming', [VoiceController::class, 'incomingCall']);



  
});