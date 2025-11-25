<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Transfer extends Model
{
    use HasFactory;

    protected $fillable = [
        'product_id',
        'merchant',
        'quantity',
        'agent_id',
        'date',
        'region',
        'transfer_by',
        'store_name',
        'from',
    ];

    // 🔗 Relationship to Product
    public function product()
    {
        return $this->belongsTo(Product::class, 'product_id');
    }

    public function unit()
{
    return $this->belongsTo(Unit::class, 'merchant', 'id');
}

    // 🔗 Relationship to Agent (User)
    public function agent()
    {
        return $this->belongsTo(User::class, 'agent_id');
    }
}
