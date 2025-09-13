<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SheetOrder extends Model
{
    use HasFactory;
 

    protected $fillable = [
        'order_no',
        'order_date',
        'amount',
        'quantity',
        'item',
        'delivery_date',
        'client_name',
        'client_city',
        'date',
        'address',
        'product_name',
        'city',
        'country',
        'phone',
        'agent',
        'store_name',
        'status',
        'code',
        'order_type',
        'alt_no',
        'merchant',
        'delivery_date',
        'cc_email',
        'instructions',
        'invoice_code',
        'sheet_id',
        'sheet_name',
        'sheet_id',
        'updated_at',
            

        
        
        
        // Add more fields as needed
    ];

 
   protected $casts = [
        'order_date' => 'datetime', // Cast to datetime to preserve time
        'delivery_date' => 'datetime', // Cast to datetime to preserve time
    ];

    // In SheetOrder.php
    public function histories()
    {
        return $this->hasMany(OrderHistory::class, 'order_id');
    }
    

  

}
