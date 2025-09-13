<?php

namespace App\Models;

use App\Enums\TaxType;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Product extends Model
{
    use HasFactory;

    protected $guarded = ['id'];

    public $fillable = [
        'id',
        'name',
        'slug',
        'code',
        'quantity',
        'quantity_alert',
        'buying_price',
        'selling_price',
        'tax',
        'tax_type',
        'notes',
        'product_image',
        'category_id',
        'store_name',
        'unit_id',
        'movement_score',
        'created_at',
        'updated_at',
        'user_id',
        'uuid'
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        
    ];

    public function getRouteKeyName(): string
    {
        return 'slug';
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function unit(): BelongsTo
    {
        return $this->belongsTo(Unit::class, 'unit_id');
    }
    

   

    public function scopeSearch($query, $value): void
    {
        $query->where('name', 'like', "%{$value}%")
            ->orWhere('code', 'like', "%{$value}%");
    }
    
    public function scopeMerchantProducts($query, $userName): void
    {
        $query->whereHas('unit', function ($q) use ($userName) {
            $q->where('name', $userName);
        });
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

}