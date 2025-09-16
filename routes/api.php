<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AppScriptController;
use App\Http\Controllers\C2BTransactionController;
use App\Http\Controllers\StkController;
use App\Http\Controllers\WhatsappController;
use App\Http\Controllers\AiController;

Route::post('/c2b/confirmation', [C2BTransactionController::class, 'confirmTransaction']);
Route::post('/c2b/validation', [C2BTransactionController::class, 'validateTransaction']); // optional if you handle validation
Route::get('/transactions/{order_no}', [StkController::class, 'checkStatus'])->name('transactions.check');
Route::post('/stk/stk-push', [StkController::class, 'stkPush'])->name('stk.push');
Route::post('/mpesa/callback', [StkController::class, 'handleCallback'])->name('stk.callback');
Route::post('/sheet-orders', [AppScriptController::class, 'storeOrder']);
Route::post('/ai', [AiController::class, 'ask']);

Route::post('/whatsapp/webhook', [WhatsappController::class, 'webhook']);
Route::get('/whatsapp/webhook', [WhatsappController::class, 'webhook']);