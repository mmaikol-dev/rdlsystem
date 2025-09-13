<?php


namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MpesaTransaction extends Model
{
    use HasFactory;

    protected $fillable = [
        'transaction_id',
        'amount',
        'phone_number',
        'status',
        'mpesa_receipts',
        'order_no',
         'checkoutRequestID',
         
    ];
}
