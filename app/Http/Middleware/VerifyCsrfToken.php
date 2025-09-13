<?php

namespace App\Http\Middleware;

use Illuminate\Foundation\Http\Middleware\VerifyCsrfToken as Middleware;

class VerifyCsrfToken extends Middleware
{
    protected $except = [
        '/api/sheet-orders',
        
            'stk/stk-push',
        ]; // exempt Apps Script route
    
}
