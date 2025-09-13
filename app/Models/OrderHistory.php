<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class OrderHistory extends Model
{
    use HasFactory;

    protected $fillable = [
        'order_id', 
        'user_id', 
        'attribute', 
        'old_value', 
        'new_value'
    ];

    // Define the relationship to the Order
    public function order()
    {
        return $this->belongsTo(SheetOrder::class, 'order_id');
    }

    

    // Define the relationship to the User
    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
