<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class InventoryLog extends Model
{
    use HasFactory;

    protected $table = 'inventory_logs';

    protected $fillable = [
        'product_name',
        'product_code',
        'quantity_added',
        'remaining_qnty',
        'added_by',
        'product_unit_id',
        'date_added',
    ];

    // Optional: if you want to treat date_added as a Carbon date
    protected $dates = [
        'date_added',
        'created_at',
        'updated_at',
    ];
}
