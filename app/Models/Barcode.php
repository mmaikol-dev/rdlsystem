<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Barcode extends Model
{
    use HasFactory;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'barcodes';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'product_id',
        'product_code',
        'product_name',
        'barcode',
        'operation_type',
        'scanned_by',
        'user_id',
        'scanned_at',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'scanned_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var array<int, string>
     */
    protected $hidden = [];

    /**
     * Get the product that owns the barcode.
     *
     * @return BelongsTo
     */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class, 'product_id');
    }

    /**
     * Get the user who scanned the barcode.
     *
     * @return BelongsTo
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * Scope a query to only include inbound barcodes.
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeInbound($query)
    {
        return $query->where('operation_type', 'inbound');
    }

    /**
     * Scope a query to only include outbound barcodes.
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeOutbound($query)
    {
        return $query->where('operation_type', 'outbound');
    }

    /**
     * Scope a query to filter by product.
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @param int $productId
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeForProduct($query, $productId)
    {
        return $query->where('product_id', $productId);
    }

    /**
     * Scope a query to filter by product code.
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @param string $productCode
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeForProductCode($query, $productCode)
    {
        return $query->where('product_code', $productCode);
    }

        /**
     * Scope a query to filter by date range.
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @param string|\Carbon\Carbon $startDate
     * @param string|\Carbon\Carbon $endDate
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeBetweenDates($query, $startDate, $endDate)
    {
        return $query->whereBetween('created_at', [$startDate, $endDate]);
    }
}